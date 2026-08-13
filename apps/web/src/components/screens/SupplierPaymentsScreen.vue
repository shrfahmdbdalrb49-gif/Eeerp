<template>
  <div class="payments-screen">
    <div class="screen-toolbar">
      <button class="btn btn-primary" @click="openNew">+ سداد لمورد</button>
      <span class="toolbar-spacer"></span>
      <span class="toolbar-info">كل سداد يُرحّل قيدًا: ذمم دائنة ← الصندوق/البنك</span>
    </div>
    <div class="table-container table-scroll">
      <table class="dense-table">
        <thead>
          <tr><th style="width:45px">#</th><th style="width:100px">التاريخ</th><th>المورد</th><th style="width:120px">المبلغ</th><th style="width:100px">الطريقة</th><th>ملاحظات</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in sorted" :key="p.id">
            <td>{{ p.id }}</td><td>{{ p.date }}</td><td style="font-weight:bold">{{ supplierName(p.supplierId) }}</td>
            <td class="num"><b>{{ fmt(p.amount) }}</b></td><td>{{ methodLabel(p.method) }}</td><td>{{ p.notes || '—' }}</td>
          </tr>
          <tr v-if="payments.length === 0">
            <td colspan="6" class="empty-state">لا توجد مدفوعات للموردين بعد</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showForm" class="form-modal-overlay" @click.self="showForm = false">
      <div class="form-modal">
        <div class="modal-title"><span>سداد لمورد</span><button class="close-btn" @click="showForm = false">✕</button></div>
        <div class="modal-body">
          <div class="field-row"><label>المورد</label>
            <select class="input-field" v-model.number="form.supplierId">
              <option :value="null" disabled>اختر موردًا</option>
              <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }} — رصيده {{ fmt(supplierBalance(s.id)) }}</option>
            </select>
          </div>
          <div class="field-row"><label>المبلغ</label><input type="number" class="input-field" v-model.number="form.amount" min="0.01" step="0.01" /></div>
          <div class="field-row"><label>الطريقة</label>
            <select class="input-field" v-model="form.method">
              <option value="cash">نقدي</option><option value="bank">تحويل بنكي</option>
            </select>
          </div>
          <div class="field-row"><label>التاريخ</label><input type="date" class="input-field" v-model="form.date" /></div>
          <div class="field-row"><label>ملاحظات</label><input type="text" class="input-field" v-model="form.notes" /></div>
        </div>
        <div class="form-actions">
          <span v-if="formError" class="form-error">{{ formError }}</span>
          <button class="btn btn-primary" @click="save" :disabled="saving">{{ saving ? 'جارٍ...' : 'ترحيل' }}</button>
          <button class="btn btn-secondary" @click="showForm = false">إلغاء</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { db, activeSuppliers, getStorageMode } from '../../db/database.js'
import { fmt, accountBalance, postSupplierPaymentJournal } from '../../db/engine.js'
import { requirePermission } from '../../db/session.js'
import { serverPostSupplierPayment } from '../../db/serverOps.js'
import { apiFetch } from '../../db/api.js'

function isServer() { return getStorageMode() === 'server' }
const serverSupplierBals = ref({})

const payments = ref([])
const suppliers = ref([])
const payablesId = ref(null)
const showForm = ref(false)
const saving = ref(false)
const formError = ref('')
const form = ref({ supplierId: null, amount: 0, method: 'cash', date: new Date().toISOString().slice(0, 10), notes: '' })

const sorted = computed(() => [...payments.value].sort((a, b) => b.id - a.id))
function supplierName(id) { return suppliers.value.find(s => s.id === id)?.name || '—' }
function methodLabel(m) { return m === 'bank' ? 'تحويل بنكي' : 'نقدي' }
async function supplierBalance(id) {
  if (isServer()) return serverSupplierBals.value[id] || 0
  const invoices = await db.purchaseInvoices.where('supplierId').equals(id).and(i => i.paymentType === 'credit').toArray()
  const paid = payments.value.filter(p => p.supplierId === id).reduce((s, p) => s + (p.amount || 0), 0)
  const total = invoices.reduce((s, i) => s + (i.total || 0), 0)
  return total - paid
}

async function loadData() {
  suppliers.value = await activeSuppliers()
  if (isServer()) {
    try {
      const p = await apiFetch('/supplier-payments', { fallback: [] })
      payments.value = Array.isArray(p) ? p : []
      serverSupplierBals.value = {}
      for (const s of suppliers.value) {
        try {
          const bal = await apiFetch('/suppliers/' + s.id + '/balance')
          serverSupplierBals.value[s.id] = bal?.balance || 0
        } catch { serverSupplierBals.value[s.id] = 0 }
      }
      payablesId.value = suppliers.value[0]?.id || null
      return
    } catch (e) { formError.value = 'فشل تحميل البيانات: ' + (e.message || e); return }
  }
  payments.value = await db.supplierPayments.toArray()
  const acc = await db.chartOfAccounts.where('code').equals('2-1').first()
  payablesId.value = acc?.id || null
}

function openNew() {
  formError.value = ''
  form.value = { supplierId: null, amount: 0, method: 'cash', date: new Date().toISOString().slice(0, 10), notes: '' }
  showForm.value = true
}

async function save() {
  saving.value = true
  formError.value = ''
  try {
    await requirePermission('supplier-payments', 'سداد لمورد')
    if (isServer()) {
      const f = form.value
      if (!f.supplierId) throw new Error('اختر موردًا')
      if (!f.amount || f.amount <= 0) throw new Error('أدخل مبلغًا صحيحًا')
      await serverPostSupplierPayment({ supplierId: f.supplierId, amount: f.amount, method: f.method, date: f.date, notes: f.notes })
      showForm.value = false
      await loadData()
      return
    }
    const f = form.value
    if (!f.supplierId) throw new Error('اختر موردًا')
    if (!f.amount || f.amount <= 0) throw new Error('أدخل مبلغًا صحيحًا')
    const id = await db.supplierPayments.add({ supplierId: f.supplierId, date: f.date, method: f.method, amount: f.amount, notes: f.notes, status: 'posted', createdAt: Date.now() })
    await postSupplierPaymentJournal({ paymentId: id, amount: f.amount, method: f.method })
    showForm.value = false
    await loadData()
  } catch (e) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.payments-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.screen-toolbar { display: flex; gap: 6px; padding: 6px; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: 2px; margin-bottom: 6px; align-items: center; flex-wrap: wrap; flex-shrink: 0; }
.toolbar-spacer { flex: 1; }
.toolbar-info { font-size: 12px; color: var(--color-text-secondary); }
.table-scroll { flex: 1; overflow: auto; background: var(--color-bg-primary); min-height: 0; }
.empty-state { text-align: center; color: var(--color-text-secondary); padding: 18px; }
.num { text-align: left; direction: ltr; }
.btn { padding: 6px 14px; border: none; border-radius: 3px; cursor: pointer; font-weight: bold; font-size: 13px; }
.btn-primary { background: var(--color-primary); color: #fff; }
.btn-secondary { background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border); }
.form-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 12px; }
.form-modal { background: var(--color-bg-primary); border: 2px solid var(--color-primary); border-radius: 4px; width: 460px; max-width: 94vw; box-shadow: 4px 4px 16px rgba(0,0,0,0.3); }
.modal-title { display: flex; justify-content: space-between; align-items: center; background: var(--color-primary); color: #fff; font-weight: bold; padding: 6px 12px; }
.close-btn { background: transparent; border: none; color: #fff; cursor: pointer; }
.modal-body { padding: 12px; }
.field-row { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.field-row label { width: 85px; font-size: 13px; flex-shrink: 0; color: var(--color-text-secondary); }
.input-field { padding: 6px 8px; border: 1px solid var(--color-border); border-radius: 3px; font-size: 13px; background: #fff; flex: 1; }
.input-field:focus { outline: none; border-color: var(--color-primary); }
.form-actions { display: flex; gap: 8px; justify-content: flex-end; align-items: center; padding: 8px 12px; background: var(--color-bg-secondary); border-top: 1px solid var(--color-border); }
.form-error { color: #b71c1c; font-size: 12px; flex: 1; }
@media (max-width: 768px) { .field-row { flex-wrap: wrap; } .field-row label { width: 100%; } .screen-toolbar { flex-direction: column; align-items: stretch; } }
</style>
