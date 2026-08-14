<template>
  <!--
    سند الصرف — نمط bolt.host
    قيد مزدوج حقيقي: مدين ذمم المورد / مصاريف تشغيلية ← دائن الصندوق/البنك.
  -->
  <div class="payment-screen" tabindex="-1" @keydown="handleKeydown">
    <!-- ==========================================================
         قائمة السندات
         ========================================================== -->
    <template v-if="!editing">
      <div class="page-screen">
        <div class="page-header">
          <div class="page-title">
            <h1>سندات الصرف</h1>
            <p class="page-subtitle">سداد الموردين والمصاريف — عدد السندات: {{ payments.length }} · إجمالي المصروف: {{ fmt(totalAmount) }} ري</p>
          </div>
          <button class="btn btn-primary btn-lg" @click="openNew">
            <span>جديد</span><span class="btn-icon">+</span>
          </button>
        </div>

        <div class="filter-row">
          <div class="filter-chip" style="min-width:180px">
            <select class="chip-select" v-model.number="filters.supplierId">
              <option :value="null">كل المستفيدين</option>
              <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
              <option :value="-1">مصاريف تشغيلية</option>
            </select>
          </div>
          <div class="filter-chip" style="min-width:140px">
            <select class="chip-select" v-model="filters.method">
              <option value="">كل الطرق</option>
              <option value="cash">نقدي</option>
              <option value="bank">تحويل</option>
              <option value="check">شيك</option>
            </select>
          </div>
          <div class="filter-chip" style="min-width:150px">
            <select class="chip-select" v-model.number="filters.accountKey">
              <option :value="null">كل الخزائن</option>
              <option value="cash">الصندوق الرئيسي</option>
              <option value="bank">البنك</option>
            </select>
          </div>
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input v-model="searchText" class="search-input" placeholder="ابحث برقم السند أو المستفيد..." @keydown.enter="applySearch" />
            <button class="search-go" @click="applySearch">انتقال</button>
          </div>
          <button v-if="hasFilters" class="btn btn-ghost btn-sm" @click="filters = { supplierId: null, method: '', accountKey: null }; searchText = ''">✕ مسح</button>
        </div>

        <div class="table-card">
          <table class="bolt-table">
            <thead>
              <tr>
                <th style="width:90px">رقم السند</th>
                <th style="width:100px">التاريخ</th>
                <th>المستفيد</th>
                <th style="width:90px">الطريقة</th>
                <th style="width:110px">رقم المرجع</th>
                <th style="width:100px; text-align:left">المبلغ</th>
                <th style="width:70px">إجراء</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in visiblePayments" :key="v.id"
                  :class="{ selected: selectedRow === v.id }"
                  @click="selectedRow = v.id">
                <td><span class="link-cell">#{{ v.id }}</span></td>
                <td>{{ v.date }}</td>
                <td style="font-weight:600">{{ v.beneficiaryName }}</td>
                <td>{{ methodLabel(v.method) }}</td>
                <td class="mono">{{ v.referenceNo || '—' }}</td>
                <td class="num-cell"><b>{{ fmt(v.amount) }}</b></td>
                <td><button class="act" title="طباعة" @click.stop="printVoucher(v)">🖨 طباعة</button></td>
              </tr>
              <tr v-if="visiblePayments.length === 0">
                <td colspan="7" class="empty-row">
                  <div class="empty-box">
                    <span class="empty-icon">💸</span>
                    <p class="empty-title">لا توجد سندات صرف بعد</p>
                    <p class="empty-hint">اضغط «جديد» لإنشاء سند — مدين ذمم المورد / مصاريف تشغيلية ← دائن الصندوق/البنك</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ==========================================================
         نموذج سند الصرف
         ========================================================== -->
    <template v-else>
      <div class="form-screen">
        <div class="form-header-card">
          <div class="form-card-title">
            <span>سند صرف جديد</span>
            <button class="close-btn" @click="closeForm">✕</button>
          </div>
          <div class="form-fields">
            <div class="field-card">
              <label>رقم السند</label>
              <input class="fi" value="جديد" readonly />
            </div>
            <div class="field-card">
              <label>التاريخ</label>
              <input type="date" class="fi" v-model="form.date" />
            </div>
            <div class="field-card" style="flex:1.4">
              <label>المستفيد *</label>
              <select class="fi" v-model.number="form.supplierId" @change="onBeneficiaryChange">
                <option :value="null" disabled>— اختر المستفيد —</option>
                <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }} (له {{ fmt(supplierCredit(s.id)) }})</option>
                <option :value="-1">مصاريف تشغيلية (بدون ذمم)</option>
              </select>
            </div>
            <div class="field-card">
              <label>الخزانة</label>
              <div class="toggle-group">
                <button type="button" class="toggle" :class="{ on: form.accountKey === 'cash' }" @click="form.accountKey = 'cash'">الصندوق</button>
                <button type="button" class="toggle" :class="{ on: form.accountKey === 'bank' }" @click="form.accountKey = 'bank'">البنك</button>
              </div>
            </div>
            <div class="field-card">
              <label>طريقة الصرف</label>
              <select class="fi" v-model="form.method">
                <option value="cash">نقدي</option>
                <option value="bank">تحويل بنكي</option>
                <option value="check">شيك</option>
              </select>
            </div>
          </div>
          <div class="form-fields" style="margin-top:12px">
            <div class="field-card" style="flex:0.8">
              <label>رقم المرجع</label>
              <input class="fi" v-model="form.referenceNo" placeholder="رقم الشيك / الحوالة" />
            </div>
            <div class="field-card" style="flex:0.6">
              <label>المبلغ *</label>
              <input type="number" class="fi" v-model.number="form.amount" min="0" step="0.01" />
            </div>
            <div class="field-card" style="flex:0.7">
              <label>العملة</label>
              <input class="fi" value="YER" readonly />
            </div>
            <div class="field-card" style="flex:1">
              <label>ملاحظات</label>
              <input class="fi" v-model="form.notes" placeholder="ملاحظات إضافية..." />
            </div>
          </div>
        </div>

        <!-- البيان / القيد -->
        <div class="form-card">
          <div class="form-card-title" style="border-bottom:none; padding-bottom:0">
            <span>البيان — القيد المحاسبي</span>
          </div>
          <div class="journal-strip">
            <div class="journal-row debit">
              <span class="j-badge">مدين</span>
              <span class="j-acct">{{ form.supplierId === -1 ? 'مصاريف تشغيلية (5-2)' : ('ذمم الموردين — ' + supplierName(form.supplierId) + ' (2-1-1)') }}</span>
              <span class="j-amt">{{ fmt(form.amount || 0) }}</span>
            </div>
            <div class="journal-row credit">
              <span class="j-badge">دائن</span>
              <span class="j-acct">{{ form.accountKey === 'bank' ? 'البنك (1-1-2)' : 'الصندوق الرئيسي (1-1-1)' }}</span>
              <span class="j-amt">{{ fmt(form.amount || 0) }}</span>
            </div>
            <p class="journal-hint">يُرحَّل القيّد تلقائيًا عند الحفظ، ويُسجَّل في سجل التدقيق.</p>
          </div>
        </div>

        <!-- الملخص -->
        <div class="totals-card">
          <div class="total-row"><span>مبلغ السند</span><span class="t-num">{{ fmt(form.amount || 0) }} <span class="cur">ري</span></span></div>
          <div v-if="form.supplierId > 0" class="total-row"><span>رصيد المورد الدائن</span><span class="t-num">{{ fmt(selectedSupplierCredit) }} <span class="cur">ري</span></span></div>
          <div v-if="form.supplierId > 0" class="total-row net"><span>الرصيد بعد السند</span><span class="t-num">{{ fmt(remainingCredit) }} <span class="cur">ري</span></span></div>
        </div>

        <div v-if="formError" class="form-msg form-msg-error">{{ formError }}</div>
        <div v-if="formStatusMsg" class="form-msg" :class="formStatusClass === 'cmd-error' ? 'form-msg-error' : 'form-msg-ok'">{{ formStatusMsg }}</div>

        <div class="form-actions-row">
          <button class="btn btn-outline" @click="closeForm">✕ إلغاء</button>
          <button class="btn btn-primary" @click="save" :disabled="saving">
            <span v-if="saving" class="spin">⏳</span>
            <span>حفظ السند</span>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, provide, inject } from 'vue'
import { db, activeSuppliers, getStorageMode, sysAccountsList } from '../../db/database.js'
import { fmt, postSupplierPaymentJournal } from '../../db/engine.js'
import { requirePermission, currentSession } from '../../db/session.js'
import { serverPostSupplierPayment } from '../../db/serverOps.js'
import { apiFetch } from '../../db/api.js'

function isServer() { return getStorageMode() === 'server' }
const serverSupplierCredits = ref({})

const payments = ref([])
const suppliers = ref([])
const editing = ref(false)
const saving = ref(false)
const formError = ref('')
const formStatusMsg = ref('')
const formStatusClass = ref('')
const searchText = ref('')
const filters = ref({ supplierId: null, method: '', accountKey: null })
const selectedRow = ref(null)
const currentUserName = ref('—')
const form = ref({ supplierId: null, accountKey: 'cash', method: 'cash', amount: 0, referenceNo: '', date: new Date().toISOString().slice(0, 10), notes: '' })

const propsDef = defineProps({ windowId: { type: [String, Number], default: null }, active: { type: Boolean, default: false } })
provide('docActive', () => propsDef.active)
const getActive = inject('docActive', () => propsDef.active)

function supplierName(id) {
  if (id === -1) return 'مصاريف تشغيلية'
  return suppliers.value.find(s => s.id === id)?.name || '—'
}
function methodLabel(m) { return { cash: 'نقدي', bank: 'تحويل', check: 'شيك' }[m] || m }

const totalAmount = computed(() => payments.value.reduce((s, v) => s + (v.amount || 0), 0))

async function supplierCredit(id) {
  if (id <= 0) return 0
  if (isServer()) return serverSupplierCredits.value[id] || 0
  const invoices = await db.purchaseInvoices.where('supplierId').equals(id).and(i => i.paymentType === 'credit').toArray()
  const paid = payments.value.filter(p => p.supplierId === id).reduce((s, p) => s + (p.amount || 0), 0)
  return Math.max(0, invoices.reduce((s, i) => s + (i.total || 0), 0) - paid)
}

const selectedSupplierCredit = computed(() => form.value.supplierId > 0 ? supplierCredit(form.value.supplierId) : 0)
const remainingCredit = computed(() => Math.max(0, selectedSupplierCredit.value - (form.value.amount || 0)))

const hasFilters = computed(() => !!(filters.value.supplierId != null || filters.value.method || filters.value.accountKey != null || searchText.value.trim()))

const visiblePayments = computed(() => {
  const f = filters.value
  const term = searchText.value.trim().toLowerCase()
  return [...payments.value].filter(v => {
    if (f.supplierId != null && v.supplierId !== f.supplierId) return false
    if (f.method && v.method !== f.method) return false
    if (f.accountKey != null && v.accountKey !== f.accountKey) return false
    if (term && !(v.beneficiaryName || '').toLowerCase().includes(term) && !String(v.id).includes(term)) return false
    return true
  }).sort((a, b) => b.id - a.id)
})

const accountsList = ref([])

async function loadData() {
  suppliers.value = await activeSuppliers()
  try { accountsList.value = await sysAccountsList() } catch { accountsList.value = [] }
  if (isServer()) {
    try {
      const p = await apiFetch('/supplier-payments', { fallback: [] })
      payments.value = (Array.isArray(p) ? p : []).map(v => ({
        ...v,
        supplierId: v.operation_type === 'expense' ? -1 : (v.supplier_id || null),
        expenseAccountKey: v.expense_account_id ? String(v.expense_account_id) : null,
        amount: v.amount, method: v.method,
        referenceNo: v.reference_no, date: String(v.payment_date || '').slice(0, 10),
        beneficiaryName: v.operation_type === 'expense' ? 'مصاريف تشغيلية' : supplierName(v.supplier_id),
        accountKey: v.method === 'bank' ? 'bank' : 'cash',
      }))
      serverSupplierCredits.value = {}
      for (const s of suppliers.value) {
        try {
          const bal = await apiFetch('/suppliers/' + s.id + '/balance')
          serverSupplierCredits.value[s.id] = bal?.balance || 0
        } catch { serverSupplierCredits.value[s.id] = 0 }
      }
      const s = await currentSession()
      currentUserName.value = s?.userName || '—'
      return
    } catch (e) { formError.value = 'فشل تحميل البيانات: ' + (e.message || e); return }
  }
  payments.value = (await db.supplierPayments.toArray()).map(v => ({
    ...v,
    beneficiaryName: supplierName(v.supplierId),
    accountKey: v.method === 'bank' ? 'bank' : 'cash',
  }))
  const s = await currentSession()
  currentUserName.value = s?.userName || '—'
}

function flash(msg, cls) { formStatusMsg.value = msg; formStatusClass.value = cls; setTimeout(() => { if (formStatusMsg.value === msg) formStatusMsg.value = '' }, 4000) }
function focusBeneficiary() { }
function applySearch() { /* v-model */ }

function openNew() {
  formError.value = ''
  flash('')
  form.value = { supplierId: null, accountKey: 'cash', method: 'cash', amount: 0, referenceNo: '', date: new Date().toISOString().slice(0, 10), notes: '', expenseKey: '' }
  editing.value = true
}
function setExpenseKey(code) {
  const a = accountsList.value.find(x => x.code === code)
  form.value.expenseKey = a ? a.code : ''
}
function onBeneficiaryChange() {
  if (form.value.supplierId === -1) {
    setExpenseKey('5-2')
    form.value.accountKey = form.value.accountKey || 'cash'
  } else {
    form.value.expenseKey = ''
  }
}
function findExpenseAccountKey() {
  const a = accountsList.value.find(x => x.code === '5-2')
  return a ? a.code : ''
}
function closeForm() { if (!saving.value) editing.value = false }

async function save() {
  saving.value = true
  formError.value = ''
  try {
    const session = await requirePermission('supplier-payments', 'إنشاء سند صرف')
    const f = form.value
    if (f.supplierId == null) throw new Error('اختر المستفيد')
    if (!f.amount || f.amount <= 0) throw new Error('أدخل مبلغًا صحيحًا')
    if (f.supplierId > 0) {
      const credit = await supplierCredit(f.supplierId)
      if (f.amount > credit + 0.005) throw new Error(`المبلغ أكبر من رصيد المورد الدائن (${fmt(credit)})`)
    }
    const isExpense = f.supplierId === -1
    if (isServer()) {
      await serverPostSupplierPayment({
        supplierId: isExpense ? null : f.supplierId,
        amount: f.amount, method: f.method, date: f.date, referenceNo: f.referenceNo || null, notes: f.notes || null,
        operationType: isExpense ? 'expense' : null, accountKey: isExpense ? (f.expenseKey || findExpenseAccountKey()) : null,
      })
      const s = await currentSession()
      await db.auditLogs.add({ userId: s?.userId ?? 0, userName: s?.userName ?? 'مجهول', action: 'payment_voucher', refKind: 'supplierPayment', refId: null, detail: null, createdAt: Date.now() })
      editing.value = false
      flash('تم حفظ سند الصرف بنجاح', 'cmd-success')
      await loadData()
      return
    }
    const id = await db.supplierPayments.add({
      supplierId: isExpense ? null : f.supplierId,
      operationType: isExpense ? 'expense' : 'supplier',
      expenseAccountKey: isExpense ? f.accountKey : null,
      date: f.date, method: f.method, amount: f.amount,
      referenceNo: f.referenceNo || null, notes: f.notes, status: 'posted', createdAt: Date.now(),
    })
    await postSupplierPaymentJournal({ paymentId: id, amount: f.amount, method: f.method, operationType: isExpense ? 'expense' : 'supplier', expenseAccountKey: isExpense ? f.accountKey : null })
    const s = await currentSession()
    await db.auditLogs.add({ userId: s?.userId ?? 0, userName: s?.userName ?? 'مجهول', action: 'payment_voucher', refKind: 'supplierPayment', refId: id, detail: null, createdAt: Date.now() })
    editing.value = false
    flash('تم حفظ سند الصرف بنجاح', 'cmd-success')
    await loadData()
  } catch (e) {
    formError.value = e.message
    flash(e.message, 'cmd-error')
  } finally {
    saving.value = false
  }
}

function printVoucher(v) { flash(`طباعة السند #${v.id}`, 'cmd-hint') }
function focusSearch() { }
function printList() { window.print() }

function handleKeydown(e) {
  if (!getActive()) return
  if (e.key === 'F2') { e.preventDefault(); openNew() }
  if (e.key === 'F7') { e.preventDefault(); printList() }
  if (e.key === 'Escape') { e.preventDefault(); if (editing.value) closeForm() }
  if (!editing.value) return
  if (e.key === 'F8') { e.preventDefault(); save() }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  loadData()
})
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<style scoped>
/* ============================================
   سند الصرف — نمط bolt.host
   ============================================ */
.payment-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; outline: none; overflow: auto; }
.mono { font-family: monospace; font-size: 12px; }
.link-cell { color: #2563eb; font-weight: 600; cursor: pointer; text-decoration: none; }
.num-cell { text-align: left; direction: ltr; font-variant-numeric: tabular-nums; }

/* ---------- القائمة ---------- */
.page-screen { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.page-header { display: flex; align-items: center; justify-content: space-between; }
.page-title h1 { font-size: 26px; font-weight: 800; color: #0f172a; line-height: 1.2; }
.page-subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }

.filter-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.filter-chip { display: flex; align-items: center; gap: 6px; height: 34px; padding: 0 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 999px; font-size: 13px; color: #475569; cursor: pointer; transition: all 0.15s; }
.filter-chip:hover { border-color: #2563eb; color: #2563eb; }
.chip-select { border: none; outline: none; background: transparent; font-size: 13px; font-family: inherit; color: #475569; cursor: pointer; width: 100%; }

.search-box { margin-right: auto; display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; }
.search-icon { font-size: 12px; }
.search-input { border: none; outline: none; background: transparent; font-size: 13px; width: 200px; font-family: inherit; }
.search-go { height: 24px; padding: 0 10px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; font-family: inherit; }

.table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05); overflow: hidden; }
.bolt-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.bolt-table thead th { background: #f8fafc; color: #64748b; font-weight: 600; font-size: 12px; padding: 10px 12px; text-align: right; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
.bolt-table tbody td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
.bolt-table tbody tr:hover td { background: #f8fafc; }
.bolt-table tbody tr.selected td { background: #eff6ff; }
.bolt-table .row-total { font-weight: 700; color: #0f172a; }
.empty-row td { padding: 48px 24px !important; border-bottom: none; }
.empty-box { display: flex; flex-direction: column; align-items: center; gap: 6px; color: #94a3b8; }
.empty-icon { font-size: 40px; }
.empty-title { font-size: 15px; font-weight: 700; color: #475569; }
.empty-hint { font-size: 12px; }

.act { height: 28px; padding: 0 10px; border: 1px solid #e2e8f0; background: #fff; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap; }
.act:hover { background: #eff6ff; border-color: #2563eb; }

/* ---------- النموذج ---------- */
.form-screen { padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 14px; max-width: 900px; width: 100%; margin: 0 auto; }
.form-header-card, .form-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05); padding: 16px; }
.form-header-card { background: #f8fafc; }
.form-card-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-size: 16px; font-weight: 800; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
.close-btn { background: transparent; border: none; font-size: 14px; color: #64748b; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
.close-btn:hover { background: #f1f5f9; color: #0f172a; }

.form-fields { display: flex; gap: 10px; flex-wrap: wrap; }
.field-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; min-width: 130px; flex: 1; display: flex; flex-direction: column; gap: 4px; }
.field-card label { font-size: 11px; font-weight: 600; color: #64748b; }
.fi { height: 32px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0 10px; font-size: 13px; font-family: inherit; color: #0f172a; background: #fff; outline: none; }
.fi:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15); }
.fi[readonly] { background: #f8fafc; color: #64748b; }

.toggle-group { display: flex; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #f1f5f9; height: 32px; }
.toggle { flex: 1; border: none; background: transparent; font-size: 12px; font-weight: 600; color: #64748b; cursor: pointer; font-family: inherit; padding: 0 12px; transition: all 0.15s; }
.toggle.on { background: #2563eb; color: #fff; }
.toggle:hover:not(.on) { background: #e2e8f0; }

/* ---------- شريط القيد ---------- */
.journal-strip { display: flex; flex-direction: column; gap: 8px; }
.journal-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 8px; font-size: 13px; }
.journal-row.debit { background: #eff6ff; border: 1px solid #bfdbfe; }
.journal-row.credit { background: #f0fdf4; border: 1px solid #bbf7d0; margin-right: 24px; }
.j-badge { font-size: 11px; font-weight: 700; border-radius: 999px; padding: 2px 8px; }
.debit .j-badge { background: #2563eb; color: #fff; }
.credit .j-badge { background: #16a34a; color: #fff; }
.j-acct { flex: 1; color: #334155; font-weight: 500; }
.j-amt { direction: ltr; font-variant-numeric: tabular-nums; font-weight: 700; color: #0f172a; }
.journal-hint { font-size: 12px; color: #94a3b8; }

.totals-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; display: flex; flex-direction: column; gap: 8px; max-width: 420px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05); }
.total-row { display: flex; justify-content: space-between; font-size: 13px; color: #475569; }
.total-row .t-num { direction: ltr; text-align: left; font-variant-numeric: tabular-nums; }
.total-row .cur { color: #94a3b8; font-size: 11px; margin-right: 2px; }
.total-row.net { font-size: 16px; font-weight: 800; color: #2563eb; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 2px; }

.form-msg { padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; }
.form-msg-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.form-msg-ok { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }

.form-actions-row { display: flex; gap: 10px; justify-content: center; padding-top: 4px; }
.btn { display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 18px; border-radius: 8px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; border: 1px solid transparent; transition: all 0.15s; white-space: nowrap; }
.btn-lg { height: 40px; padding: 0 20px; font-size: 14px; }
.btn-sm { height: 30px; padding: 0 12px; font-size: 12px; }
.btn-icon { font-size: 16px; line-height: 1; }
.btn-primary { background: #2563eb; color: #fff; }
.btn-primary:hover { background: #1d4ed8; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-outline { background: #fff; color: #374151; border-color: #d1d5db; }
.btn-outline:hover { background: #f9fafb; border-color: #9ca3af; }
.btn-ghost { background: transparent; color: #2563eb; border-color: transparent; }
.btn-ghost:hover { background: #eff6ff; }
.spin { animation: spin 1s linear infinite; display: inline-block; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
