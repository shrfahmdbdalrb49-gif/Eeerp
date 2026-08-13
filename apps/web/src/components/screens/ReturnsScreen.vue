<template>
  <div class="returns-screen">
    <div class="screen-toolbar">
      <button class="btn btn-primary" @click="showForm = true">+ مرتجع بيع</button>
      <span class="toolbar-spacer"></span>
      <span class="toolbar-info">المرتجع يعيد الصنف للمخزون فعليًا ويرحّل قيدًا: مرتدات ← رد للذمم/الصندوق</span>
    </div>
    <div class="table-container table-scroll">
      <table class="dense-table">
        <thead>
          <tr><th style="width:45px">#</th><th style="width:100px">التاريخ</th><th>فاتورة البيع</th><th>الصنف</th><th style="width:70px">الكمية</th><th style="width:105px">القيمة</th><th style="width:85px">رد المبلغ</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in sorted" :key="r.id">
            <td>{{ r.id }}</td><td>{{ r.date }}</td>
            <td>فاتورة #{{ r.saleInvoiceId }}</td>
            <td style="font-weight:bold">{{ r.itemName }}</td>
            <td class="num">{{ r.qty }}</td>
            <td class="num">{{ fmt(r.value) }}</td>
            <td><span :class="'pay-chip ' + r.refundMethod">{{ refundLabel(r.refundMethod) }}</span></td>
          </tr>
          <tr v-if="returns.length === 0">
            <td colspan="7" class="empty-state">لا توجد مرتجعات بعد</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showForm" class="form-modal-overlay" @click.self="showForm = false">
      <div class="form-modal">
        <div class="modal-title"><span>مرتجع بيع</span><button class="close-btn" @click="showForm = false">✕</button></div>
        <div class="modal-body">
          <div class="field-row"><label>فاتورة البيع</label>
            <select class="input-field" v-model.number="form.saleInvoiceId">
              <option :value="null" disabled>اختر فاتورة مبيعات</option>
              <option v-for="inv in salesInvoices" :key="inv.id" :value="inv.id">#{{ inv.id }} — {{ inv.date }} — {{ fmt(inv.total) }}</option>
            </select>
          </div>
          <div class="field-row"><label>الصنف</label>
            <select class="input-field" v-model.number="form.itemId">
              <option :value="null" disabled>اختر صنفًا من الفاتورة</option>
              <option v-for="it in invoiceItems" :key="it.id" :value="it.id">{{ it.name }}</option>
            </select>
          </div>
          <div class="field-row"><label>الكمية المرتجعة</label><input type="number" class="input-field" v-model.number="form.qty" min="1" /></div>
          <div class="field-row"><label>رد المبلغ إلى</label>
            <select class="input-field" v-model="form.refundMethod">
              <option value="cash">نقدي</option><option value="bank">تحويل بنكي</option><option value="credit">خصم من الذمم (رصيد دائن)</option>
            </select>
          </div>
        </div>
        <div class="form-actions">
          <span v-if="formError" class="form-error">{{ formError }}</span>
          <button class="btn btn-primary" @click="save" :disabled="saving">{{ saving ? 'جارٍ...' : 'ترحيل المرتجع' }}</button>
          <button class="btn btn-secondary" @click="showForm = false">إلغاء</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { db, getStorageMode } from '../../db/database.js'
import { fmt, addBatch, postReturnJournal } from '../../db/engine.js'
import { requirePermission, currentSession } from '../../db/session.js'
import { serverPostReturn } from '../../db/serverOps.js'
import { apiFetch } from '../../db/api.js'

function isServer() { return getStorageMode() === 'server' }

const returns = ref([])
const salesInvoices = ref([])
const showForm = ref(false)
const saving = ref(false)
const formError = ref('')
const form = ref({ saleInvoiceId: null, itemId: null, qty: 1, refundMethod: 'cash' })

const sorted = computed(() => [...returns.value].sort((a, b) => b.id - a.id))
function refundLabel(m) { return { cash: 'نقدي', bank: 'بنكي', credit: 'خصم ذمم' }[m] || m }

const invoiceItems = computed(() => {
  const inv = salesInvoices.value.find(i => i.id === form.value.saleInvoiceId)
  if (!inv) return []
  return inv.lines || []
})

async function loadData() {
  if (isServer()) {
    try {
      const raw = await apiFetch('/sales-returns', { fallback: [] })
      returns.value = (Array.isArray(raw) ? raw : []).map(r => ({ ...r, itemName: itemNames.value[r.item_id] || '—' }))
      const invs = await apiFetch('/sales', { fallback: [] })
      const linesByInv = {}
      const lines = await apiFetch('/sales-lines', { fallback: [] })
      for (const l of (Array.isArray(lines) ? lines : [])) {
        (linesByInv[l.invoice_id] = linesByInv[l.invoice_id] || []).push(l)
      }
      salesInvoices.value = (Array.isArray(invs) ? invs : []).map(inv => ({
        ...inv, id: inv.id,
        lines: (linesByInv[inv.id] || []).map(l => ({
          id: l.item_id,
          name: itemNames.value[l.item_id] || `صنف #${l.item_id}`,
          qty: l.qty,
          soldQty: l.qty,
        })),
      }))
      return
    } catch (e) { formError.value = 'فشل تحميل البيانات: ' + (e.message || e); return }
  }
  const raw = await db.salesReturns.toArray()
  returns.value = raw.map(r => ({ ...r, itemName: itemNames.value[r.itemId] || '—' }))
  const linesByInv = {}
  for (const l of await db.salesLines.toArray()) {
    (linesByInv[l.invoiceId] = linesByInv[l.invoiceId] || []).push(l)
  }
  salesInvoices.value = (await db.salesInvoices.toArray()).map(inv => ({
    ...inv,
    lines: (linesByInv[inv.id] || []).map(l => ({
      id: l.itemId,
      name: itemNames.value[l.itemId] || `صنف #${l.itemId}`,
      qty: l.qty,
      soldQty: l.qty,
    })),
  }))
}

const itemNames = computed(() => Object.fromEntries(items.value.map(i => [i.id, i.name])))
const items = ref([])

async function loadItems() { items.value = await db.items.toArray() }

async function save() {
  saving.value = true
  formError.value = ''
  try {
    const session = await requirePermission('pos.return', 'ترحيل مرتجع بيع')
    if (isServer()) {
      const f = form.value
      if (!f.saleInvoiceId) throw new Error('اختر فاتورة البيع')
      const inv = salesInvoices.value.find(i => i.id === f.saleInvoiceId)
      if (!inv) throw new Error('الفاتورة غير موجودة')
      const line = (inv.lines || []).find(l => l.id === f.itemId)
      if (!line) throw new Error('الصنف ليس ضمن بنود الفاتورة')
      if (!f.qty || f.qty <= 0) throw new Error('الكمية غير صحيحة')
      if (!items.value.find(i => i.id === f.itemId)) throw new Error('الصنف غير موجود')
      const item = items.value.find(i => i.id === f.itemId)
      await serverPostReturn({ saleInvoiceId: f.saleInvoiceId, customerId: inv.customerId || null, refundMethod: f.refundMethod, lines: [{ itemId: f.itemId, qty: f.qty, price: Number(item?.sellPrice) || 0 }] })
      showForm.value = false
      await loadData()
      return
    }
    const f = form.value
    if (!f.saleInvoiceId) throw new Error('اختر فاتورة البيع')
    const inv = salesInvoices.value.find(i => i.id === f.saleInvoiceId)
    if (!inv) throw new Error('الفاتورة غير موجودة')
    const line = (inv.lines || []).find(l => l.id === f.itemId)
    if (!line) throw new Error('الصنف ليس ضمن بنود الفاتورة')
    if (!f.qty || f.qty <= 0) throw new Error('الكمية غير صحيحة')
    const item = items.value.find(i => i.id === f.itemId)
    if (!item) throw new Error('الصنف غير موجود')
    const value = f.qty * (Number(item.sellPrice) || 0)

    // 1. إعادة المخزون (تشغيلة جديدة بنفس التكلفة التاريخية للفاتورة)
    const soldLine = await db.salesLines.where('invoiceId').equals(f.saleInvoiceId).and(l => l.itemId === f.itemId).first()
    const cost = item.costPrice || 0
    await addBatch({ itemId: f.itemId, storeId: 1, batchNo: `RET-${f.saleInvoiceId}`, expDate: null, qty: f.qty, cost, sourceKind: 'saleReturn', sourceId: null })
    const returnId = await db.salesReturns.add({
      saleInvoiceId: f.saleInvoiceId, date: new Date().toISOString().slice(0, 10), storeId: 1,
      itemId: f.itemId, qty: f.qty, value, refundMethod: f.refundMethod,
      status: 'posted', createdAt: Date.now(),
    })
    await db.salesReturnLines.add({ returnId, itemId: f.itemId, qty: f.qty, value })

    // 2. القيد المزدوج: مرتدات ← رد للذمم/الصندوق (إذا آجل يخفض الذمم لأنه رد على رصيد دائن)
    await postReturnJournal({ returnId, total: value, refundMethod: f.refundMethod })

    const s = await currentSession()
    await db.auditLogs.add({ userId: s?.userId ?? 0, userName: s?.userName ?? 'مجهول', action: 'return_posted', refKind: 'saleReturn', refId: returnId, detail: null, createdAt: Date.now() })
    showForm.value = false
    await loadData()
  } catch (e) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

onMounted(() => { loadItems(); loadData() })
</script>

<style scoped>
.returns-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.screen-toolbar { display: flex; gap: 6px; padding: 6px; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: 2px; margin-bottom: 6px; align-items: center; flex-wrap: wrap; flex-shrink: 0; }
.toolbar-spacer { flex: 1; }
.toolbar-info { font-size: 12px; color: var(--color-text-secondary); }
.table-scroll { flex: 1; overflow: auto; background: var(--color-bg-primary); min-height: 0; }
.empty-state { text-align: center; color: var(--color-text-secondary); padding: 18px; }
.num { text-align: left; direction: ltr; }
.pay-chip { padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: bold; }
.pay-chip.cash { background: #e6f4ea; color: #1b5e20; }
.pay-chip.bank { background: #e3f0ff; color: #0d5aa7; }
.pay-chip.credit { background: #fff4e0; color: #e65100; }
.btn { padding: 6px 14px; border: none; border-radius: 3px; cursor: pointer; font-weight: bold; font-size: 13px; }
.btn-primary { background: var(--color-primary); color: #fff; }
.btn-secondary { background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border); }
.form-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 12px; }
.form-modal { background: var(--color-bg-primary); border: 2px solid var(--color-primary); border-radius: 4px; width: 480px; max-width: 94vw; box-shadow: 4px 4px 16px rgba(0,0,0,0.3); }
.modal-title { display: flex; justify-content: space-between; align-items: center; background: var(--color-primary); color: #fff; font-weight: bold; padding: 6px 12px; }
.close-btn { background: transparent; border: none; color: #fff; cursor: pointer; }
.modal-body { padding: 12px; }
.field-row { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.field-row label { width: 105px; font-size: 13px; flex-shrink: 0; color: var(--color-text-secondary); }
.input-field { padding: 6px 8px; border: 1px solid var(--color-border); border-radius: 3px; font-size: 13px; background: #fff; flex: 1; }
.form-actions { display: flex; gap: 8px; justify-content: flex-end; align-items: center; padding: 8px 12px; background: var(--color-bg-secondary); border-top: 1px solid var(--color-border); }
.form-error { color: #b71c1c; font-size: 12px; flex: 1; }
@media (max-width: 768px) { .field-row { flex-wrap: wrap; } .field-row label { width: 100%; } .screen-toolbar { flex-direction: column; align-items: stretch; } }
</style>
