<template>
  <div class="collections-screen">
    <div class="page-screen">
      <div class="page-header">
        <div class="page-title">
          <h1>التحصيل</h1>
          <p class="page-subtitle">{{ tab === 'aging' ? 'الأرصدة الآجلة — الرصيد = فواتير آجلة − التحصيلات (فعلي من قاعدة البيانات)' : 'سجل التحصيلات — كل تحصيل يُرحّل قيدًا: الصندوق ← ذمم مدينة' }}</p>
        </div>
        <button class="btn btn-primary btn-lg" @click="openNew">
          <span>تحصيل جديد</span><span class="btn-icon">+</span>
        </button>
      </div>

      <!-- تبويبات pill -->
      <div class="tab-row">
        <button class="tab-btn" :class="{ active: tab === 'log' }" @click="tab = 'log'">
          <span class="tab-icon">📋</span> سجل التحصيلات
        </button>
        <button class="tab-btn" :class="{ active: tab === 'aging' }" @click="tab = 'aging'">
          <span class="tab-icon">📊</span> الأرصدة الآجلة
        </button>
      </div>

      <!-- سجل التحصيلات -->
      <div v-if="tab === 'log'" class="table-card">
        <table class="bolt-table">
          <thead>
            <tr>
              <th style="width:90px">رقم السند</th>
              <th style="width:105px">التاريخ</th>
              <th>العميل</th>
              <th style="width:120px; text-align:left">المبلغ</th>
              <th style="width:100px">الطريقة</th>
              <th>ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in sorted" :key="c.id">
              <td><span class="link-cell">{{ c.voucher_no || '#' + c.id }}</span></td>
              <td>{{ c.date }}</td>
              <td style="font-weight:600">{{ c.customerName || '—' }}</td>
              <td class="num-cell"><b>{{ fmt(c.amount) }}</b></td>
              <td><span class="method-badge" :class="c.method === 'bank' ? 'bank' : 'cash'">{{ c.method === 'bank' ? 'تحويل بنكي' : 'نقدي' }}</span></td>
              <td class="notes-cell">{{ c.notes || '—' }}</td>
            </tr>
            <tr v-if="collections.length === 0">
              <td colspan="6" class="empty-row">
                <div class="empty-box">
                  <span class="empty-icon">💰</span>
                  <p class="empty-title">لا توجد تحصيلات بعد</p>
                  <p class="empty-hint">سند قبض يُرحّل فعليًا قيدًا محاسبيًا ويخفض ذمم العميل</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- الأرصدة الآجلة -->
      <div v-if="tab === 'aging'" class="table-card">
        <table class="bolt-table">
          <thead>
            <tr>
              <th>العميل</th>
              <th style="width:130px; text-align:left">فواتير آجلة</th>
              <th style="width:120px; text-align:left">المحصَّل</th>
              <th style="width:135px; text-align:left">الرصيد المتبقي</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in aging" :key="c.id">
              <td style="font-weight:600">{{ c.name }}</td>
              <td class="num-cell">{{ fmt(c.creditSales) }}</td>
              <td class="num-cell">{{ fmt(c.collected) }}</td>
              <td class="num-cell"><b :class="c.balance > 0 ? 'balance-due' : 'credit-zero'">{{ fmt(c.balance) }}</b></td>
            </tr>
            <tr v-if="aging.length === 0">
              <td colspan="4" class="empty-row">
                <div class="empty-box">
                  <span class="empty-icon">📭</span>
                  <p class="empty-title">لا يوجد عملاء بعد</p>
                </div>
              </td>
            </tr>
            <tr class="totals-row" v-if="aging.length > 0">
              <td>الإجمالي</td>
              <td class="num-cell">{{ fmt(agingTotal.creditSales) }}</td>
              <td class="num-cell">{{ fmt(agingTotal.collected) }}</td>
              <td class="num-cell"><b>{{ fmt(agingTotal.balance) }}</b></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- نموذج تحصيل -->
    <div v-if="showForm" class="form-modal-overlay" @click.self="showForm = false">
      <div class="form-card-wide">
        <div class="form-card-title">
          <span>تحصيل من عميل — سند قبض</span>
          <button class="close-btn" @click="showForm = false">✕</button>
        </div>
        <div class="field-list">
          <div class="field-row-wide">
            <label>العميل *</label>
            <select class="fi" v-model.number="form.customerId">
              <option :value="null" disabled>اختر عميلًا (يجب أن يكون له ذمم)</option>
              <option v-for="c in debtors" :key="c.id" :value="c.id">{{ c.name }} — عليه {{ fmt(c.balance) }}</option>
            </select>
          </div>
          <div class="field-row-wide">
            <label>المبلغ *</label>
            <input type="number" class="fi" :value="form.amount" min="0.01" step="0.01" @input="setAmount($event.target.value)" placeholder="0.00" />
          </div>
          <div class="field-row-wide">
            <label>الطريقة</label>
            <div class="toggle-group">
              <button type="button" class="toggle" :class="{ on: form.method === 'cash' }" @click="form.method = 'cash'">نقدي (صندوق)</button>
              <button type="button" class="toggle" :class="{ on: form.method === 'bank' }" @click="form.method = 'bank'">تحويل بنكي</button>
            </div>
          </div>
          <div class="field-row-wide">
            <label>الفواتير الآجلة *</label>
            <div class="alloc-box">
              <div class="alloc-list">
                <div v-for="inv in openInvoices" :key="inv.id" class="alloc-item">
                  <span class="alloc-ref">{{ inv.doc_no || '#' + inv.id }} — {{ inv.date }}</span>
                  <span class="alloc-remain">متبقي عليه {{ fmt(inv.remaining) }}</span>
                  <input type="number" class="alloc-inp fi" min="0" step="0.01" :max="inv.remaining" :value="allocFor(inv.id)" @input="setAlloc(inv.id, $event.target.value)" placeholder="0.00" />
                </div>
                <div v-if="!form.customerId" class="alloc-hint">اختر عميلًا أولًا لعرض فواتيره الآجلة المفتوحة</div>
                <div v-else-if="openInvoices.length === 0" class="alloc-hint">لا توجد فواتير آجلة مفتوحة لهذا العميل</div>
              </div>
              <div class="alloc-summary">
                <span>المخصص للفواتير: <b>{{ fmt(totalAllocated) }}</b> من {{ fmt(form.amount) }}</span>
                <span class="unalloc-hint" v-if="form.amount && unallocated > 0.005">سيُوزَّع المتبقي ({{ fmt(unallocated) }}) على أقدم الفواتير تلقائيًا</span>
              </div>
            </div>
          </div>
          <div class="field-row-wide">
            <label>التاريخ</label>
            <input type="date" class="fi" v-model="form.date" />
          </div>
          <div class="field-row-wide">
            <label>ملاحظات</label>
            <input type="text" class="fi" v-model="form.notes" placeholder="سند قبض رقم..." />
          </div>
        </div>
        <div v-if="formError" class="form-msg form-msg-error">{{ formError }}</div>
        <div class="form-actions-row">
          <button class="btn btn-outline" @click="showForm = false">إلغاء</button>
          <button class="btn btn-primary" @click="save" :disabled="saving">
            <span v-if="saving" class="spin">⏳</span>
            <span>ترحيل القبض</span>
          </button>
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

const winProps = defineProps({
  windowId: { type: [String, Number], default: null },
  active: { type: Boolean, default: true },
  opts: { type: Object, default: () => ({}) },
})

function isServer() { return getStorageMode() === 'server' }

const collections = ref([])
const customers = ref([])
const tab = ref('log')

/** التبويب الافتراضي يُمرَّر من خريطة النوافذ في App.vue عبر opts.tab */
onMounted(() => {
  if (winProps.opts && winProps.opts.tab) tab.value = winProps.opts.tab
})
const showForm = ref(false)
const saving = ref(false)
const formError = ref('')
const form = ref({ customerId: null, amount: 0, method: 'cash', date: new Date().toISOString().slice(0, 10), notes: '' })

function setAmount(raw) {
  const v = parseFloat(raw)
  form.value = { ...form.value, amount: isNaN(v) ? 0 : v }
}

const sorted = computed(() => [...collections.value].sort((a, b) => b.id - a.id))

const serverBalances = ref({})

async function customerDebt(c) {
  /* في وضع الخادم المركزي: الرصيد من /customers/:id/balance */
  if (isServer()) {
    const bal = serverBalances.value[c.id]
    return { ...c, creditSales: bal?.creditSales || 0, collected: bal?.collected || 0, balance: bal?.balance || 0 }
  }
  const creditSales = (await db.salesInvoices.where('customerId').equals(c.id).and(i => i.paymentType === 'credit').toArray()).reduce((s, i) => s + (i.total || 0), 0)
  const collected = collections.value.filter(x => x.customerId === c.id).reduce((s, x) => s + (x.amount || 0), 0)
  return { ...c, creditSales, collected, balance: creditSales - collected }
}

/** الفواتير الآجلة الخام لعملاء النظام (تُحمّل مرة واحدة) */
const collectionsFromInvoices = ref([])
async function loadCreditInvoices() {
    collectionsFromInvoices.value = await db.salesInvoices.where('paymentType').equals('credit').toArray()
}

/* ---------- مطابقة سند القبض بالفواتير (paymentAllocations) ---------- */
const openInvoices = computed(() => {
  if (!form.value.customerId) return []
  const cid = form.value.customerId
  const c = customers.value.find(x => x.id === cid)
  if (!c || (c.balance || 0) <= 0.005) return []
  /* جلب الفواتير الآجلة المفتوحة لهذا العميل فعلًا: كل فاتورة صف مستقل للمطابقة */
  const creditInvoices = collectionsFromInvoices.value.filter(i => i.customerId === cid)
  const collectedByInvoice = collections.value.filter(x => x.customerId === cid)
  /* الرصيد المخصص على كل فاتورة (paymentAllocations + التوزيع السابق الافتراضي) */
  const allocMap = {}
  for (const x of collections.value.filter(x => x.customerId === cid)) {
    if (!x.allocations) continue
    for (const a of x.allocations) { allocMap[a.invoiceId] = (allocMap[a.invoiceId] || 0) + (a.amount || 0) }
  }
  const out = creditInvoices
    .map(inv => {
      const already = allocMap[inv.id] || 0
      const remaining = Math.max(0, (inv.total || 0) - already)
      return { id: inv.id, doc_no: inv.doc_no || ('#' + inv.id), date: inv.date || '', remaining }
    })
    .filter(i => i.remaining > 0.005)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  /* إذا تعذر جلب الفواتير الفردية، سقط إلى صف واحد برصيد العميل المتبقي */
  if (out.length === 0 && (c.balance || 0) > 0.005) return [{ id: cid, doc_no: null, date: null, remaining: c.balance }]
  return out
})
const allocs = ref({})
const totalAllocated = computed(() => Object.values(allocs.value).reduce((s, v) => s + (parseFloat(v) || 0), 0))
const unallocated = computed(() => Math.max(0, (form.value.amount || 0) - totalAllocated.value))
function allocFor(invId) {
  if (allocs.value[invId] !== undefined && allocs.value[invId] !== null) return allocs.value[invId]
  return null
}
function setAlloc(invId, raw) {
  const v = parseFloat(raw)
  if (isNaN(v) || v <= 0) { const a = { ...allocs.value }; delete a[invId]; allocs.value = a; return }
  allocs.value = { ...allocs.value, [invId]: v }
}
function buildAllocations(total) {
  const list = openInvoices.value.slice()
  if (list.length === 0) return []
  const out = []
  let remaining = total
  for (const inv of list) {
    const explicit = parseFloat(allocs.value[inv.id]) || 0
    const max = Math.min(inv.remaining, remaining)
    const amt = explicit > 0 ? Math.min(explicit, max) : 0
    if (amt > 0.005) {
      out.push({ invoiceId: inv.id, amount: Math.round(amt * 100) / 100 })
      remaining -= amt
    }
  }
  /* توزيع المتبقي غير المخصص على أقدم الفواتير */
  if (remaining > 0.005 && openInvoices.value.length) {
    const sorted = [...openInvoices.value].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    for (const inv of sorted) {
      const already = out.find(o => o.invoiceId === inv.id)?.amount || 0
      const room = inv.remaining - already
      const amt = Math.min(room, remaining)
      if (amt > 0.005) {
        const ex = out.find(o => o.invoiceId === inv.id)
        if (ex) ex.amount = Math.round((ex.amount + amt) * 100) / 100
        else out.push({ invoiceId: inv.id, amount: Math.round(amt * 100) / 100 })
        remaining -= amt
        if (remaining <= 0.005) break
      }
    }
  }
  return out
}

const debtors = computed(() => customers.value.filter(c => (c.balance || 0) > 0).sort((a, b) => b.balance - a.balance))
const aging = computed(() => customers.value.filter(c => (c.creditSales || 0) > 0).sort((a, b) => b.balance - a.balance))
const agingTotal = computed(() => ({
  creditSales: aging.value.reduce((s, c) => s + (c.creditSales || 0), 0),
  collected: aging.value.reduce((s, c) => s + (c.collected || 0), 0),
  balance: aging.value.reduce((s, c) => s + (c.balance || 0), 0),
}))

async function loadData() {
  if (!isServer()) await loadCreditInvoices()
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
  allocs.value = {}
  form.value = { customerId: null, amount: 0, method: 'cash', date: new Date().toISOString().slice(0, 10), notes: '' }
  showForm.value = true
}

async function save() {
  saving.value = true
  formError.value = ''
  try {
    await requirePermission('collections', 'ترحيل تحصيل')
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
    const totalAlloc = Object.values(allocs.value).reduce((s, v) => s + (parseFloat(v) || 0), 0)
    const maxPossible = openInvoices.value.reduce((s, inv) => s + inv.remaining, 0)
    if (totalAlloc > maxPossible + 0.005) throw new Error('المبلغ المخصص لفاتورة يتجاوز المتبقي عليها')
    const { nextDocNo } = await import('../../db/sequences.js')
    const voucherNo = await nextDocNo('receipt', new Date(f.date).getFullYear())
    const id = await db.collections.add({
      customerId: f.customerId, date: f.date, method: f.method, amount: f.amount,
      notes: f.notes, status: 'posted', createdAt: Date.now(),
      voucher_no: voucherNo,
    })
    const allocations = buildAllocations(f.amount)
    if (allocations.length > 0) {
      await db.paymentAllocations.bulkAdd(allocations.map(a => ({
        collectionId: id, invoiceId: a.invoiceId, amount: a.amount, createdAt: Date.now(),
      })))
    }
    await postCollectionJournal({ collectionId: id, amount: f.amount, method: f.method })
    const s = await currentSession()
    await db.auditLogs.add({ userId: s?.userId ?? 0, userName: s?.userName ?? 'مجهول', action: 'collection_posted', refKind: 'collection', refId: id, detail: null, createdAt: Date.now() })
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
/* ============================================
   التحصيل — نمط bolt.host
   ============================================ */
.collections-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.page-screen { padding: 24px; display: flex; flex-direction: column; gap: 16px; overflow: auto; flex: 1; }
.page-header { display: flex; align-items: center; justify-content: space-between; }
.page-title h1 { font-size: 26px; font-weight: 800; color: #0f172a; line-height: 1.2; }
.page-subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
.num-cell { text-align: left; direction: ltr; font-variant-numeric: tabular-nums; }
.notes-cell { color: #94a3b8; font-size: 12px; }
.link-cell { color: #2563eb; font-weight: 600; cursor: pointer; text-decoration: none; }

.tab-row { display: flex; gap: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 0; }
.tab-btn { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 16px; border: none; border-bottom: 2px solid transparent; background: transparent; color: #64748b; cursor: pointer; font-size: 13px; font-weight: 600; font-family: inherit; transition: all 0.15s; margin-bottom: -1px; }
.tab-btn:hover { color: #2563eb; background: #f1f5f9; border-radius: 8px 8px 0 0; }
.tab-btn.active { color: #2563eb; border-bottom-color: #2563eb; background: #eff6ff; border-radius: 8px 8px 0 0; }
.tab-icon { font-size: 14px; }

.table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05); overflow: auto; flex: 1; min-height: 0; }
.bolt-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.bolt-table thead th { background: #f8fafc; color: #64748b; font-weight: 600; font-size: 12px; padding: 10px 12px; text-align: right; border-bottom: 1px solid #e2e8f0; white-space: nowrap; position: sticky; top: 0; }
.bolt-table tbody td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
.bolt-table tbody tr:hover td { background: #f8fafc; }
.totals-row td { background: #f8fafc !important; font-weight: 700; border-top: 2px solid #e2e8f0; color: #0f172a; }
.empty-row td { padding: 48px 24px !important; border-bottom: none; }
.empty-box { display: flex; flex-direction: column; align-items: center; gap: 6px; color: #94a3b8; }
.empty-icon { font-size: 40px; }
.empty-title { font-size: 15px; font-weight: 700; color: #475569; }
.empty-hint { font-size: 12px; }

.method-badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
.method-badge.cash { background: #f0fdf4; color: #15803d; }
.method-badge.bank { background: #eff6ff; color: #1d4ed8; }
.balance-due { color: #ea580c; }
.credit-zero { color: #15803d; }

/* ---------- النموذج ---------- */
.form-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
.form-card-wide { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 20px 40px rgba(0,0,0,0.25); width: 540px; max-width: 96vw; max-height: 92vh; overflow: auto; padding: 20px; }
.form-card-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; font-size: 16px; font-weight: 800; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
.close-btn { background: transparent; border: none; font-size: 14px; color: #64748b; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
.close-btn:hover { background: #f1f5f9; color: #0f172a; }
.field-list { display: flex; flex-direction: column; gap: 10px; }
.field-row-wide { display: flex; align-items: center; gap: 10px; }
.field-row-wide label { width: 90px; font-size: 12px; font-weight: 600; color: #64748b; flex-shrink: 0; }
.fi { flex: 1; height: 36px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 12px; font-size: 13px; font-family: inherit; color: #0f172a; background: #fff; outline: none; }
.fi:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15); }

.toggle-group { display: flex; flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #f1f5f9; height: 36px; }
.toggle { flex: 1; border: none; background: transparent; font-size: 12px; font-weight: 600; color: #64748b; cursor: pointer; font-family: inherit; padding: 0 10px; transition: all 0.15s; white-space: nowrap; }
.toggle.on { background: #2563eb; color: #fff; }
.toggle:hover:not(.on) { background: #e2e8f0; }

.form-msg { padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; margin-top: 12px; }
.form-msg-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

.form-actions-row { display: flex; gap: 10px; justify-content: flex-end; padding-top: 16px; }
.btn { display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 18px; border-radius: 8px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; border: 1px solid transparent; transition: all 0.15s; white-space: nowrap; }
.btn-lg { height: 40px; padding: 0 20px; font-size: 14px; }
.btn-icon { font-size: 16px; line-height: 1; }
.btn-primary { background: #2563eb; color: #fff; }
.btn-primary:hover { background: #1d4ed8; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-outline { background: #fff; color: #374151; border-color: #d1d5db; }
.btn-outline:hover { background: #f9fafb; border-color: #9ca3af; }
.spin { animation: spin 1s linear infinite; display: inline-block; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .field-row-wide { flex-wrap: wrap; }
  .field-row-wide label { width: 100%; }
  .page-screen { padding: 16px; }
  .tab-btn { flex: 1; justify-content: center; }
  .bolt-table { min-width: 720px; }
}
</style>
