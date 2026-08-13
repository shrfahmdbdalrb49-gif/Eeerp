<template>
  <div class="receipt-screen">
    <div class="screen-toolbar">
      <button class="btn btn-primary" @click="openNew">+ سند قبض</button>
      <span class="toolbar-spacer"></span>
      <span class="toolbar-info">سند قبض حقيقي — قيد مزدوج + يخفض ذمم العميل فعليًا</span>
    </div>
    <div class="table-container table-scroll">
      <table class="dense-table">
        <thead>
          <tr><th style="width:45px">#</th><th style="width:100px">التاريخ</th><th>العميل</th><th style="width:115px">المبلغ</th><th style="width:90px">الطريقة</th><th>ملاحظات</th></tr>
        </thead>
        <tbody>
          <tr v-for="c in sorted" :key="c.id">
            <td>{{ c.id }}</td><td>{{ c.date }}</td>
            <td style="font-weight:bold">{{ c.customerName || '—' }}</td>
            <td class="num"><b>{{ fmt(c.amount) }}</b></td>
            <td>{{ c.method === 'bank' ? 'تحويل بنكي' : 'نقدي' }}</td>
            <td>{{ c.notes || '—' }}</td>
          </tr>
          <tr v-if="collections.length === 0">
            <td colspan="6" class="empty-state">لا توجد سندات قبض بعد</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showForm" class="form-modal-overlay" @click.self="showForm = false">
      <div class="form-modal">
        <div class="modal-title"><span>سند قبض</span><button class="close-btn" @click="showForm = false">✕</button></div>
        <div class="modal-body">
          <div class="field-row"><label>العميل</label>
            <select class="input-field" v-model.number="form.customerId">
              <option :value="null" disabled>اختر عميلًا عليه ذمم</option>
              <option v-for="c in debtors" :key="c.id" :value="c.id">{{ c.name }} — عليه {{ fmt(c.balance) }}</option>
            </select>
          </div>
          <div class="field-row"><label>المبلغ *</label><input type="number" class="input-field" v-model.number="form.amount" min="0.01" step="0.01" /></div>
          <div class="field-row"><label>الطريقة</label>
            <select class="input-field" v-model="form.method">
              <option value="cash">نقدي (صندوق)</option><option value="bank">تحويل بنكي</option>
            </select>
          </div>
          <div class="field-row"><label>التاريخ</label><input type="date" class="input-field" v-model="form.date" /></div>
          <div class="field-row"><label>ملاحظات</label><input type="text" class="input-field" v-model="form.notes" /></div>
        </div>
        <div class="form-actions">
          <span v-if="formError" class="form-error">{{ formError }}</span>
          <button class="btn btn-primary" @click="save" :disabled="saving">{{ saving ? 'جارٍ...' : 'ترحيل السند' }}</button>
          <button class="btn btn-secondary" @click="showForm = false">إلغاء</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { db, activeCustomers, getStorageMode } from '../../db/database.js'
import { fmt, postCollectionJournal } from '../../db/engine.js'
import { requirePermission, currentSession } from '../../db/session.js'
import { serverPostCollection } from '../../db/serverOps.js'
import { apiFetch } from '../../db/api.js'

function isServer() { return getStorageMode() === 'server' }
const serverBalances = ref({})

const collections = ref([])
const customers = ref([])
const showForm = ref(false)
const saving = ref(false)
const formError = ref('')
const form = ref({ customerId: null, amount: 0, method: 'cash', date: new Date().toISOString().slice(0, 10), notes: '' })

const sorted = computed(() => [...collections.value].sort((a, b) => b.id - a.id))
const debtors = computed(() => customers.value.filter(c => (c.balance || 0) > 0).sort((a, b) => b.balance - a.balance))

async function customerDebt(c) {
  if (isServer()) {
    const bal = serverBalances.value[c.id]
    return { ...c, creditSales: bal?.creditSales || 0, collected: bal?.collected || 0, balance: bal?.balance || 0 }
  }
  const creditSales = (await db.salesInvoices.where('customerId').equals(c.id).and(i => i.paymentType === 'credit').toArray()).reduce((s, i) => s + (i.total || 0), 0)
  const collected = collections.value.filter(x => x.customerId === c.id).reduce((s, x) => s + (x.amount || 0), 0)
  return { ...c, creditSales, collected, balance: creditSales - collected }
}

async function loadData() {
  if (isServer()) {
    try {
      const raw = await activeCustomers()
      const cols = await apiFetch('/collections', { fallback: [] })
      collections.value = Array.isArray(cols) ? cols : []
      serverBalances.value = {}
      for (const c of raw) {
        try {
          const bal = await apiFetch('/customers/' + c.id + '/balance')
          serverBalances.value[c.id] = { creditSales: bal?.balance || 0, collected: 0, balance: bal?.balance || 0 }
        } catch { serverBalances.value[c.id] = { creditSales: 0, collected: 0, balance: 0 } }
      }
      customers.value = await Promise.all(raw.map(customerDebt))
      return
    } catch (e) { formError.value = 'فشل تحميل البيانات: ' + (e.message || e); return }
  }
  collections.value = await db.collections.toArray()
  const raw = await activeCustomers()
  customers.value = await Promise.all(raw.map(customerDebt))
}

function openNew() {
  formError.value = ''
  form.value = { customerId: null, amount: 0, method: 'cash', date: new Date().toISOString().slice(0, 10), notes: '' }
  showForm.value = true
}

async function save() {
  saving.value = true
  formError.value = ''
  try {
    await requirePermission('receipts', 'ترحيل سند قبض')
    if (isServer()) {
      const f = form.value
      if (!f.customerId) throw new Error('اختر عميلًا')
      if (!f.amount || f.amount <= 0) throw new Error('أدخل مبلغًا صحيحًا')
      const debtor = debtors.value.find(c => c.id === f.customerId)
      if (!debtor) throw new Error('العميل لا يملك ذمم مستحقة')
      if (f.amount > debtor.balance + 0.005) throw new Error(`المبلغ أكبر من ذمم العميل (${fmt(debtor.balance)})`)
      await serverPostCollection({ customerId: f.customerId, amount: f.amount, method: f.method, date: f.date, notes: f.notes })
      showForm.value = false
      await loadData()
      return
    }
    const f = form.value
    if (!f.customerId) throw new Error('اختر عميلًا')
    if (!f.amount || f.amount <= 0) throw new Error('أدخل مبلغًا صحيحًا')
    const debtor = debtors.value.find(c => c.id === f.customerId)
    if (!debtor) throw new Error('العميل لا يملك ذمم مستحقة')
    if (f.amount > debtor.balance + 0.005) throw new Error(`المبلغ أكبر من ذمم العميل (${fmt(debtor.balance)})`)
    const id = await db.collections.add({
      customerId: f.customerId, date: f.date, method: f.method, amount: f.amount,
      notes: f.notes, status: 'posted', createdAt: Date.now(),
    })
    await postCollectionJournal({ collectionId: id, amount: f.amount, method: f.method })
    const s = await currentSession()
    await db.auditLogs.add({ userId: s?.userId ?? 0, userName: s?.userName ?? 'مجهول', action: 'receipt_voucher', refKind: 'collection', refId: id, detail: null, createdAt: Date.now() })
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
.receipt-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; }
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
.form-modal { background: var(--color-bg-primary); border: 2px solid var(--color-primary); border-radius: 4px; width: 480px; max-width: 94vw; box-shadow: 4px 4px 16px rgba(0,0,0,0.3); }
.modal-title { display: flex; justify-content: space-between; align-items: center; background: var(--color-primary); color: #fff; font-weight: bold; padding: 6px 12px; }
.close-btn { background: transparent; border: none; color: #fff; cursor: pointer; }
.modal-body { padding: 12px; }
.field-row { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.field-row label { width: 90px; font-size: 13px; flex-shrink: 0; color: var(--color-text-secondary); }
.input-field { padding: 6px 8px; border: 1px solid var(--color-border); border-radius: 3px; font-size: 13px; background: #fff; flex: 1; }
.form-actions { display: flex; gap: 8px; justify-content: flex-end; align-items: center; padding: 8px 12px; background: var(--color-bg-secondary); border-top: 1px solid var(--color-border); }
.form-error { color: #b71c1c; font-size: 12px; flex: 1; }
@media (max-width: 768px) { .field-row { flex-wrap: wrap; } .field-row label { width: 100%; } .screen-toolbar { flex-direction: column; align-items: stretch; } }
</style>
