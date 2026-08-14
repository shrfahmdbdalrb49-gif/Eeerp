<template>
  <!--
    سند الصرف — تصميم ERP مكتبي كلاسيكي
    التركيب: شريط أدوات (F) → رأس المستند (رقم/تاريخ/الفرع/الصندوق-البنك/المستفيد/الحساب/البيان/الطريقة/المبلغ)
    → جدول البنود (بيان الصرف) → الإجماليات → شريط أوامر
    قيد مزدوج حقيقي: مدين ذمم/مصاريف ← دائن الصندوق/البنك.
  -->
  <div class="payment-screen" tabindex="0">
    <div v-if="!editing" class="doc-shell">
      <!-- ===== شريط الأدوات ===== -->
      <div class="doc-toolbar">
        <button class="tool-f primary" title="سند جديد (F2)" @click="openNew">
          <span class="fkey">F2</span> جديد
        </button>
        <div class="toolbar-sep"></div>
        <button class="tool-f" title="بحث (F3)" @click="focusSearch">
          <span class="fkey">F3</span> بحث
        </button>
        <button class="tool-f" title="طباعة (F7)" @click="printList">
          <span class="fkey">F7</span> طباعة
        </button>
        <span class="toolbar-spacer"></span>
        <span class="toolbar-subtitle">عدد السندات: <b>{{ payments.length }}</b> — إجمالي المصروف: <b>{{ fmt(totalAmount) }}</b></span>
      </div>

      <!-- ===== رأس المستند (بيانات + فلترة) ===== -->
      <div class="doc-header">
        <div class="field-group">
          <span class="field-group-title">بيانات المستند</span>
          <div class="field">
            <label>رقم</label>
            <input type="text" class="input-field" value="جديد" readonly />
          </div>
          <div class="field">
            <label>الفرع</label>
            <input type="text" class="input-field" value="الفرع الرئيسي" readonly />
          </div>
          <div class="field">
            <label>الخزانة</label>
            <select class="input-field" v-model.number="filters.accountKey">
              <option :value="null">كل الخزائن</option>
              <option value="cash">الصندوق الرئيسي</option>
              <option value="bank">البنك</option>
            </select>
          </div>
        </div>
        <div class="field-group">
          <span class="field-group-title">البحث</span>
          <div class="field">
            <label>المستفيد</label>
            <select class="input-field" v-model.number="filters.supplierId">
              <option :value="null">كل المستفيدين</option>
              <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
              <option :value="-1">مصاريف تشغيلية (بدون ذمم)</option>
            </select>
          </div>
          <div class="field">
            <label>الطريقة</label>
            <select class="input-field" v-model="filters.method">
              <option value="">الكل</option>
              <option value="cash">نقدي</option>
              <option value="bank">تحويل</option>
              <option value="check">شيك</option>
            </select>
          </div>
          <div class="field">
            <label>بحث</label>
            <input type="text" class="input-field" v-model="searchText" placeholder="رقم أو مستفيد..." />
            <button class="field-btn" @click="applySearch">…</button>
          </div>
        </div>
        <div class="field-group">
          <span class="field-group-title">بيانات عامة</span>
          <div class="field">
            <label>العملة</label>
            <input type="text" class="input-field" value="YER" readonly />
          </div>
          <div class="field">
            <label>سعر الصرف</label>
            <input type="text" class="input-field" value="1" readonly />
          </div>
          <div class="field">
            <label>المستخدم</label>
            <input type="text" class="input-field" :value="currentUserName" readonly />
          </div>
        </div>
      </div>

      <!-- ===== الجدول ===== -->
      <div class="doc-details">
        <table class="classic-grid">
          <thead>
            <tr>
              <th class="row-num">#</th>
              <th style="width:64px">رقم</th><th style="width:78px">التاريخ</th><th>المستفيد</th>
              <th style="width:64px">الطريقة</th><th style="width:100px">رقم المرجع</th>
              <th style="width:96px">المبلغ</th><th style="width:60px">إجراء</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(v, idx) in visiblePayments" :key="v.id" @click="selectedRow = v.id">
              <td class="row-num">{{ idx + 1 }}</td>
              <td class="mono">{{ v.id }}</td>
              <td>{{ v.date }}</td>
              <td style="font-weight:bold">{{ v.beneficiaryName }}</td>
              <td>{{ methodLabel(v.method) }}</td>
              <td class="mono">{{ v.referenceNo || '—' }}</td>
              <td class="num-cell"><b>{{ fmt(v.amount) }}</b></td>
              <td><button class="act-btn" title="طباعة" @click="printVoucher(v)">طباعة</button></td>
            </tr>
            <tr v-if="visiblePayments.length === 0">
              <td colspan="7" class="empty-row">لا توجد سندات صرف بعد — اضغط F2 لإنشاء سند جديد (دائن الصندوق/البنك / مدين ذمم المورد)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ===== شريط الأوامر ===== -->
      <div class="doc-commandbar">
        <span v-if="formError" class="cmd-error">{{ formError }}</span>
        <span v-else class="cmd-hint">F2 سند جديد · F3 بحث · F7 طباعة · Esc إغلاق</span>
      </div>
    </div>

    <!-- =============================================================
         نافذة سند الصرف — رأس بحقول + جدول بيان + إجماليات
         ============================================================= -->
    <div v-if="editing" class="doc-shell edit-shell">
      <div class="doc-toolbar">
        <button class="tool-f primary" title="حفظ السند (F8)" @click="save">
          <span class="fkey">F8</span> حفظ
        </button>
        <div class="toolbar-sep"></div>
        <button class="tool-f" title="رجوع (Esc)" @click="closeForm">
          <span class="fkey">Esc</span> رجوع
        </button>
        <span class="toolbar-spacer"></span>
        <span v-if="formStatusMsg" :class="'cmd-hint ' + formStatusClass">{{ formStatusMsg }}</span>
      </div>

      <!-- ===== رأس المستند ===== -->
      <div class="doc-header">
        <div class="field-group">
          <span class="field-group-title">بيانات السند</span>
          <div class="field">
            <label>رقم</label>
            <input type="text" class="input-field" value="جديد" readonly />
          </div>
          <div class="field">
            <label>التاريخ</label>
            <input type="date" class="input-field" v-model="form.date" />
          </div>
          <div class="field">
            <label>الفرع</label>
            <input type="text" class="input-field" value="الفرع الرئيسي" readonly />
          </div>
        </div>
        <div class="field-group">
          <span class="field-group-title">الصرف</span>
          <div class="field">
            <label>المستفيد</label>
            <select class="input-field" v-model.number="form.supplierId" @change="onBeneficiaryChange">
              <option :value="null" disabled>— اختر المستفيد —</option>
              <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }} (له {{ fmt(supplierCredit(s.id)) }})</option>
              <option :value="-1">مصاريف تشغيلية (حساب 5-2)</option>
            </select>
            <button class="field-btn" title="بحث" @click="focusBeneficiary">…</button>
          </div>
          <div class="field">
            <label>الخزانة</label>
            <select class="input-field" v-model="form.accountKey">
              <option value="cash">الصندوق الرئيسي (1-1-1)</option>
              <option value="bank">البنك (1-1-2)</option>
            </select>
          </div>
          <div class="field">
            <label>الطريقة</label>
            <select class="input-field" v-model="form.method">
              <option value="cash">نقدي</option>
              <option value="bank">تحويل بنكي</option>
              <option value="check">شيك</option>
            </select>
          </div>
        </div>
        <div class="field-group">
          <span class="field-group-title">البيان</span>
          <div class="field">
            <label>رقم المرجع</label>
            <input type="text" class="input-field" v-model="form.referenceNo" placeholder="رقم الشيك / الحوالة" />
          </div>
          <div class="field">
            <label>المبلغ</label>
            <input type="number" class="input-field" v-model.number="form.amount" min="0" step="0.01" />
          </div>
          <div class="field">
            <label>العملة</label>
            <input type="text" class="input-field" value="YER" readonly />
          </div>
        </div>
      </div>

      <!-- ===== جدول البنود (بيان السند) ===== -->
      <div class="doc-details">
        <table class="classic-grid">
          <thead>
            <tr>
              <th class="row-num">#</th>
              <th style="width:84px">رقم الفاتورة</th><th style="width:96px">التاريخ</th>
              <th style="width:220px">الوصف / البيان</th>
              <th style="width:96px">المبلغ</th><th style="width:64px">الطريقة</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="row-num">1</td>
              <td class="num-cell">—</td>
              <td>{{ form.date }}</td>
              <td>{{ distributionText }}</td>
              <td class="num-cell row-total">{{ fmt(form.amount || 0) }}</td>
              <td>{{ methodLabel(form.method) }}</td>
            </tr>
            <tr>
              <td colspan="6" style="color:#667085;font-size:11px">
                سند صرف يحرَّك دفعة واحدة: دائن {{ form.accountKey === 'bank' ? 'البنك' : 'الصندوق' }} / مدين {{ form.supplierId === -1 ? 'مصاريف تشغيلية (5-2)' : 'ذمم دائنة للمورد' }} — يُرحل القيّد تلقائيًا عند الحفظ (F8).
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ===== الإجماليات ===== -->
      <div class="doc-totals">
        <div class="total-cell"><span class="t-label">المبلغ:</span><span class="t-value">{{ fmt(form.amount || 0) }}</span></div>
        <div class="total-cell"><span class="t-label">رصيد المورد الدائن:</span><span class="t-value">{{ fmt(form.supplierId > 0 ? supplierCredit(form.supplierId) : 0) }}</span></div>
        <div class="total-cell net"><span class="t-label">الرصيد بعد السند:</span><span class="t-value">{{ fmt(remainingCredit) }}</span></div>
      </div>

      <!-- ===== شريط الأوامر ===== -->
      <div class="doc-commandbar">
        <span v-if="formError" class="cmd-error">{{ formError }}</span>
        <span v-else class="cmd-hint">F8 حفظ السند · Esc رجوع — الإجماليات تُحتسب تلقائيًا</span>
      </div>
    </div>
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
  if (isServer()) return serverSupplierCredits.value[id] || 0
  const invoices = await db.purchaseInvoices.where('supplierId').equals(id).and(i => i.paymentType === 'credit').toArray()
  const paid = payments.value.filter(p => p.supplierId === id).reduce((s, p) => s + (p.amount || 0), 0)
  return Math.max(0, invoices.reduce((s, i) => s + (i.total || 0), 0) - paid)
}

const selectedSupplierCredit = computed(() => form.value.supplierId > 0 ? supplierCredit(form.value.supplierId) : 0)
const remainingCredit = computed(() => Math.max(0, selectedSupplierCredit.value - (form.value.amount || 0)))
const distributionText = computed(() => {
  const who = supplierName(form.value.supplierId)
  return `صرف دفعة ${form.value.supplierId === -1 ? 'مصاريف تشغيلية' : 'للمورد "' + who + '"'} — من ${form.value.accountKey === 'bank' ? 'البنك' : 'الصندوق الرئيسي'}`
})

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

const accountsList = ref([])

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
.payment-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; outline: none; }
.mono { font-family: monospace; font-size: 12px; }
.num { text-align: left; direction: ltr; }
.row-actions { display: flex; gap: 2px; }
.act-btn { height: 20px; padding: 0 6px; border: 1px solid #b9c2cc; border-radius: 1px; background: #fff; cursor: pointer; font-size: 11px; white-space: nowrap; }
.act-btn:hover { background: #e3ecf7; border-color: #0d5aa7; }
</style>
