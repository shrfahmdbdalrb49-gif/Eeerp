<template>
  <div class="purchases-screen">
    <div class="screen-toolbar">
      <button class="btn btn-primary" @click="openNewInvoice">+ فاتورة شراء جديدة</button>
      <span class="toolbar-spacer"></span>
      <span class="toolbar-info">كل فاتورة شراء تُرحّل قيدًا محاسبيًا (مخزون ← ذمم/صندوق) وتزيد المخزون فعليًا</span>
    </div>
    <div class="table-container table-scroll">
      <table class="dense-table">
        <thead>
          <tr>
            <th style="width:45px">#</th><th style="width:100px">التاريخ</th><th>المورد</th><th style="width:110px">رقم التشغيلة</th><th style="width:150px">انتهاء الصلاحية</th>
            <th style="width:75px">الكمية</th><th style="width:100px">التكلفة</th><th style="width:110px">الإجمالي</th><th style="width:85px">الدفع</th><th style="width:60px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="inv in sortedInvoices" :key="inv.id">
            <td>{{ inv.id }}</td>
            <td>{{ inv.date }}</td>
            <td style="font-weight:bold">{{ supplierName(inv.supplierId) }}</td>
            <td>{{ inv.linesCount }}</td>
            <td>{{ inv.expDate || '—' }}</td>
            <td class="num">{{ fmt(inv.totalQty) }}</td>
            <td class="num">{{ fmt(inv.avgCost) }}</td>
            <td class="num"><b>{{ fmt(inv.total) }}</b></td>
            <td><span :class="'pay-chip ' + inv.paymentType">{{ payLabel(inv.paymentType) }}</span></td>
            <td><button class="delete-btn" @click="deleteInvoice(inv.id)">✕</button></td>
          </tr>
          <tr v-if="invoices.length === 0">
            <td colspan="10" class="empty-state">لا توجد فواتير شراء بعد — أنشئ فاتورة لتزيد المخزون فعليًا مع قيد محاسبي مزدوج</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showForm" class="form-modal-overlay" @click.self="showForm = false">
      <div class="form-modal wide">
        <div class="modal-title">
          <span>فاتورة شراء — إدخال مخزون + قيد محاسبي</span>
          <button class="close-btn" @click="showForm = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="field-row">
              <label>المورد</label>
              <select class="input-field" v-model.number="form.supplierId">
                <option :value="null" disabled>اختر موردًا</option>
                <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>
            <div class="field-row">
              <label>التاريخ</label>
              <input type="date" class="input-field" v-model="form.date" />
            </div>
            <div class="field-row">
              <label>رقم التشغيلة</label>
              <input type="text" class="input-field" v-model="form.batchNo" placeholder="LOT-2026-001" />
            </div>
            <div class="field-row">
              <label>انتهاء الصلاحية</label>
              <input type="date" class="input-field" v-model="form.expDate" />
            </div>
            <div class="field-row">
              <label>طريقة الدفع</label>
              <select class="input-field" v-model="form.paymentType">
                <option value="credit">آجل (ذمم دائنة)</option>
                <option value="cash">نقدي (الصندوق)</option>
                <option value="bank">تحويل بنكي</option>
              </select>
            </div>
            <div class="field-row">
              <label>الصنف</label>
              <select class="input-field" v-model.number="form.itemId">
                <option :value="null" disabled>اختر صنفًا</option>
                <option v-for="it in items" :key="it.id" :value="it.id">{{ it.code }} — {{ it.name }}</option>
              </select>
            </div>
            <div class="field-row">
              <label>الكمية</label>
              <input type="number" class="input-field" v-model.number="form.qty" min="1" />
            </div>
            <div class="field-row">
              <label>التكلفة للوحدة</label>
              <input type="number" class="input-field" v-model.number="form.cost" min="0" step="0.01" />
            </div>
          </div>
          <div class="form-total">إجمالي الفاتورة: <b>{{ fmt(form.qty * form.cost) }}</b> (كمية × تكلفة)</div>
        </div>
        <div class="form-actions">
          <span v-if="formError" class="form-error">{{ formError }}</span>
          <button class="btn btn-primary" @click="saveInvoice" :disabled="saving">{{ saving ? 'جارٍ...' : 'استلام وترحيل' }}</button>
          <button class="btn btn-secondary" @click="showForm = false">إلغاء</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { db, activeItems, activeSuppliers } from '../../db/database.js'
import { fmt, addBatch, postPurchaseJournal } from '../../db/engine.js'
import { requirePermission } from '../../db/session.js'

const invoices = ref([])
const suppliers = ref([])
const items = ref([])
const showForm = ref(false)
const saving = ref(false)
const formError = ref('')

const form = ref({ supplierId: null, date: new Date().toISOString().slice(0, 10), batchNo: '', expDate: '', paymentType: 'credit', itemId: null, qty: 1, cost: 0 })

const sortedInvoices = computed(() => [...invoices.value].sort((a, b) => b.id - a.id))
function supplierName(id) { return suppliers.value.find(s => s.id === id)?.name || '—' }
function payLabel(t) { return { cash: 'نقدي', bank: 'بنكي', credit: 'آجل' }[t] || t }

async function loadData() {
  suppliers.value = await activeSuppliers()
  items.value = (await activeItems()).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'))
  const raw = await db.purchaseInvoices.toArray()
  const lines = await db.purchaseLines.toArray()
  invoices.value = raw.map(inv => {
    const ils = lines.filter(l => l.invoiceId === inv.id)
    return {
      ...inv,
      linesCount: ils.length,
      totalQty: ils.reduce((s, l) => s + (l.qty || 0), 0),
      avgCost: ils.length ? ils.reduce((s, l) => s + (l.cost || 0), 0) / ils.length : 0,
      total: ils.reduce((s, l) => s + (l.qty || 0) * (l.cost || 0), 0),
      expDate: ils[0]?.expDate || null,
    }
  })
}

function openNewInvoice() {
  formError.value = ''
  form.value = { supplierId: null, date: new Date().toISOString().slice(0, 10), batchNo: '', expDate: '', paymentType: 'credit', itemId: null, qty: 1, cost: 0 }
  showForm.value = true
}

async function saveInvoice() {
  saving.value = true
  formError.value = ''
  try {
    await requirePermission('purchases', 'إنشاء فاتورة شراء')
    const f = form.value
    if (!f.supplierId) throw new Error('اختر موردًا')
    if (!f.itemId) throw new Error('اختر صنفًا')
    if (!f.qty || f.qty <= 0) throw new Error('الكمية غير صحيحة')
    if (!f.cost || f.cost <= 0) throw new Error('التكلفة غير صحيحة')
    const total = f.qty * f.cost
    const invId = await db.purchaseInvoices.add({
      supplierId: f.supplierId, date: f.date, storeId: 1, paymentType: f.paymentType,
      notes: '', status: 'posted', total, createdAt: Date.now(),
    })
    const batchId = await addBatch({
      itemId: f.itemId, storeId: 1, batchNo: f.batchNo || `LOT-${invId}`,
      mfgDate: null, expDate: f.expDate || null, qty: f.qty, cost: f.cost,
      sourceKind: 'purchase', sourceId: invId,
    })
    await db.purchaseLines.add({ invoiceId: invId, itemId: f.itemId, batchId, qty: f.qty, cost: f.cost, expDate: f.expDate || null })
    await postPurchaseJournal({ purchaseId: invId, total, paymentType: f.paymentType })
    showForm.value = false
    await loadData()
  } catch (e) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

async function deleteInvoice(id) {
  try {
    await requirePermission('purchases', 'حذف فاتورة شراء')
    const ils = await db.purchaseLines.where('invoiceId').equals(id).toArray()
    for (const l of ils) {
      await db.batches.delete(l.batchId)
      await db.stockMovements.where('refKind').equals('purchase').and(m => m.refId === id).delete()
    }
    await db.purchaseLines.where('invoiceId').equals(id).delete()
    await db.purchaseInvoices.delete(id)
    await db.journalLines.where('entryId').equals(id).delete()
    await db.journalEntries.where('refKind').equals('purchase').and(e => e.refId === id).delete()
    await db.auditLogs.add({ userId: 0, userName: 'حذف', action: 'purchase_delete', refKind: 'purchase', refId: id, detail: null, createdAt: Date.now() })
    await loadData()
  } catch (e) {
    formError.value = e.message
  }
}

onMounted(loadData)
</script>

<style scoped>
.purchases-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.screen-toolbar { display: flex; gap: 6px; padding: 6px; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: 2px; margin-bottom: 6px; align-items: center; flex-wrap: wrap; flex-shrink: 0; }
.toolbar-spacer { flex: 1; }
.toolbar-info { font-size: 12px; color: var(--color-text-secondary); }
.table-scroll { flex: 1; overflow: auto; background: var(--color-bg-primary); min-height: 0; }
.empty-state { text-align: center; color: var(--color-text-secondary); padding: 18px; }
.num { text-align: left; direction: ltr; }
.pay-chip { padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: bold; }
.pay-chip.credit { background: #fff4e0; color: #e65100; }
.pay-chip.cash { background: #e6f4ea; color: #1b5e20; }
.pay-chip.bank { background: #e3f0ff; color: #0d5aa7; }
.btn { padding: 6px 14px; border: none; border-radius: 3px; cursor: pointer; font-weight: bold; font-size: 13px; }
.btn-primary { background: var(--color-primary); color: #fff; }
.btn-secondary { background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border); }
.delete-btn { background: #fdeaea; color: #b71c1c; border: 1px solid #f0bcbc; border-radius: 3px; width: 24px; height: 26px; cursor: pointer; }
.form-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 12px; }
.form-modal.wide { background: var(--color-bg-primary); border: 2px solid var(--color-primary); border-radius: 4px; width: 720px; max-width: 96vw; box-shadow: 4px 4px 16px rgba(0,0,0,0.3); max-height: 92vh; overflow: auto; }
.modal-title { display: flex; justify-content: space-between; align-items: center; background: var(--color-primary); color: #fff; font-weight: bold; padding: 6px 12px; }
.close-btn { background: transparent; border: none; color: #fff; cursor: pointer; }
.modal-body { padding: 12px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.field-row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.field-row label { width: 100px; font-size: 13px; flex-shrink: 0; color: var(--color-text-secondary); }
.input-field { padding: 6px 8px; border: 1px solid var(--color-border); border-radius: 3px; font-size: 13px; background: #fff; flex: 1; }
.input-field:focus { outline: none; border-color: var(--color-primary); }
.form-total { background: #f2f6fb; border: 1px dashed var(--color-primary); border-radius: 4px; padding: 8px 10px; margin-top: 6px; font-size: 14px; }
.form-actions { display: flex; gap: 8px; justify-content: flex-end; align-items: center; padding: 8px 12px; background: var(--color-bg-secondary); border-top: 1px solid var(--color-border); }
.form-error { color: #b71c1c; font-size: 12px; flex: 1; }
@media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } .screen-toolbar { flex-direction: column; align-items: stretch; } .table-container { overflow-x: auto; } }
</style>
