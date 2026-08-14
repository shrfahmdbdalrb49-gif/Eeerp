<template>
  <!--
    سند القبض — تصميم ERP مكتبي كلاسيكي
    التركيب: شريط أدوات (F) → رأس المستند (رقم/تاريخ/العميل/الحساب/الطريقة/المبلغ/المرجع)
    → جدول البنود (بيان السند) → الإجماليات → شريط أوامر
    قيد مزدوج حقيقي: مدين الصندوق/البنك / دائن ذمم العميل.
  -->
  <div class="receipt-screen" tabindex="0">
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
        <span class="toolbar-subtitle">عدد السندات: <b>{{ collections.length }}</b> — إجمالي المقبوض: <b>{{ fmt(totalAmount) }}</b></span>
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
            <label>الصندوق</label>
            <select class="input-field" v-model.number="filters.accountKey">
              <option :value="null">كل الحسابات</option>
              <option value="cash">الصندوق الرئيسي</option>
              <option value="bank">البنك</option>
            </select>
          </div>
        </div>
        <div class="field-group">
          <span class="field-group-title">البحث</span>
          <div class="field">
            <label>العميل</label>
            <select class="input-field" v-model.number="filters.customerId">
              <option :value="null">كل العملاء</option>
              <option v-for="c in debtors" :key="c.id" :value="c.id">{{ c.name }}</option>
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
            <input type="text" class="input-field" v-model="searchText" placeholder="رقم أو عميل..." />
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
              <th style="width:64px">رقم</th><th style="width:78px">التاريخ</th><th>العميل</th>
              <th style="width:64px">الطريقة</th><th style="width:100px">رقم المرجع</th>
              <th style="width:96px">المبلغ</th><th style="width:60px">إجراء</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(v, idx) in visibleVouchers" :key="v.id" @click="selectedRow = v.id">
              <td class="row-num">{{ idx + 1 }}</td>
              <td class="mono">{{ v.id }}</td>
              <td>{{ v.date }}</td>
              <td style="font-weight:bold">{{ customerName(v.customerId) }}</td>
              <td>{{ methodLabel(v.method) }}</td>
              <td class="mono">{{ v.referenceNo || '—' }}</td>
              <td class="num-cell"><b>{{ fmt(v.amount) }}</b></td>
              <td><button class="act-btn" title="طباعة" @click="printVoucher(v)">طباعة</button></td>
            </tr>
            <tr v-if="visibleVouchers.length === 0">
              <td colspan="7" class="empty-row">لا توجد سندات قبض بعد — اضغط F2 لإنشاء سند جديد (مدين الصندوق/البنك / دائن ذمم العميل)</td>
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
         نافذة سند القبض — رأس بحقول + جدول بيان + إجماليات
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
          <span class="field-group-title">التحصيل</span>
          <div class="field">
            <label>العميل</label>
            <select class="input-field" v-model.number="form.customerId">
              <option :value="null" disabled>— اختر العميل —</option>
              <option v-for="c in debtors" :key="c.id" :value="c.id">{{ c.name }} (عليه {{ fmt(c.balance) }})</option>
            </select>
            <button class="field-btn" title="بحث عن عميل" @click="focusCustomer">…</button>
          </div>
          <div class="field">
            <label>الحساب</label>
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
                سند قبض يحرَّك دفعة واحدة: مدين {{ form.accountKey === 'bank' ? 'البنك' : 'الصندوق' }} / دائن ذمم العميل — يُرحل القيّد تلقائيًا عند الحفظ (F8).
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ===== الإجماليات ===== -->
      <div class="doc-totals">
        <div class="total-cell"><span class="t-label">المبلغ:</span><span class="t-value">{{ fmt(form.amount || 0) }}</span></div>
        <div class="total-cell"><span class="t-label">رصيد العميل المدين:</span><span class="t-value">{{ fmt(selectedCustomerBalance) }}</span></div>
        <div class="total-cell net"><span class="t-label">الرصيد بعد السند:</span><span class="t-value">{{ fmt(remainingBalance) }}</span></div>
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
import { ref, computed, onMounted, onUnmounted, inject , provide} from 'vue'
import { db, activeCustomers, getStorageMode } from '../../db/database.js'
import { fmt, postCollectionJournal } from '../../db/engine.js'
import { requirePermission, currentSession } from '../../db/session.js'
import { serverPostCollection } from '../../db/serverOps.js'
import { apiFetch } from '../../db/api.js'

function isServer() { return getStorageMode() === 'server' }
const serverBalances = ref({})

const collections = ref([])
const customers = ref([])
const editing = ref(false)
const saving = ref(false)
const formError = ref('')
const formStatusMsg = ref('')
const formStatusClass = ref('')
const searchText = ref('')
const filters = ref({ customerId: null, method: '', accountKey: null })
const selectedRow = ref(null)
const currentUserName = ref('—')
const form = ref({ customerId: null, accountKey: 'cash', method: 'cash', amount: 0, referenceNo: '', date: new Date().toISOString().slice(0, 10), notes: '' })

function customerName(id) { return customers.value.find(c => c.id === id)?.name || '—' }
function methodLabel(m) { return { cash: 'نقدي', bank: 'تحويل', check: 'شيك' }[m] || m }

const totalAmount = computed(() => collections.value.reduce((s, v) => s + (v.amount || 0), 0))
const debtors = computed(() => customers.value.filter(c => (c.balance || 0) > 0).sort((a, b) => b.balance - a.balance))

const selectedCustomer = computed(() => customers.value.find(c => c.id === form.value.customerId))
const selectedCustomerBalance = computed(() => selectedCustomer.value?.balance || 0)
const remainingBalance = computed(() => Math.max(0, selectedCustomerBalance.value - (form.value.amount || 0)))
const distributionText = computed(() => {
  if (!form.value.customerId) return '—'
  return `تحصيل دفعة من العميل "${customerName(form.value.customerId)}" — إيداع في ${form.value.accountKey === 'bank' ? 'البنك' : 'الصندوق الرئيسي'}`
})

const visibleVouchers = computed(() => {
  const f = filters.value
  const term = searchText.value.trim().toLowerCase()
  return [...collections.value].filter(v => {
    if (f.customerId != null && v.customerId !== f.customerId) return false
    if (f.method && v.method !== f.method) return false
    if (f.accountKey != null && v.accountKey !== f.accountKey) return false
    if (term && !(customerName(v.customerId)).toLowerCase().includes(term) && !String(v.id).includes(term)) return false
    return true
  }).sort((a, b) => b.id - a.id)
})

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
  const raw = await activeCustomers()
  if (isServer()) {
    try {
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
      const s = await currentSession()
      currentUserName.value = s?.userName || '—'
      return
    } catch (e) { formError.value = 'فشل تحميل البيانات: ' + (e.message || e); return }
  }
  collections.value = await db.collections.toArray()
  customers.value = await Promise.all(raw.map(customerDebt))
  const s = await currentSession()
  currentUserName.value = s?.userName || '—'
}

function flash(msg, cls) { formStatusMsg.value = msg; formStatusClass.value = cls; setTimeout(() => { if (formStatusMsg.value === msg) formStatusMsg.value = '' }, 4000) }
function focusCustomer() { }
function applySearch() { /* v-model */ }

function openNew() {
  formError.value = ''
  flash('')
  form.value = { customerId: null, accountKey: 'cash', method: 'cash', amount: 0, referenceNo: '', date: new Date().toISOString().slice(0, 10), notes: '' }
  editing.value = true
}
function closeForm() { if (!saving.value) editing.value = false }

async function save() {
  saving.value = true
  formError.value = ''
  try {
    const session = await requirePermission('receipts', 'ترحيل سند قبض')
    const f = form.value
    if (!f.customerId) throw new Error('اختر العميل')
    if (!f.amount || f.amount <= 0) throw new Error('أدخل مبلغًا صحيحًا')
    const debtor = debtors.value.find(c => c.id === f.customerId)
    if (!debtor) throw new Error('العميل لا يملك ذمم مستحقة')
    if (f.amount > debtor.balance + 0.005) throw new Error(`المبلغ أكبر من ذمم العميل (${fmt(debtor.balance)})`)
    if (isServer()) {
      await serverPostCollection({ customerId: f.customerId, amount: f.amount, method: f.method, date: f.date, referenceNo: f.referenceNo || null, notes: f.notes || null })
      const s = await currentSession()
      await db.auditLogs.add({ userId: s?.userId ?? 0, userName: s?.userName ?? 'مجهول', action: 'receipt_voucher', refKind: 'collection', refId: null, detail: null, createdAt: Date.now() })
      editing.value = false
      flash('تم حفظ سند القبض بنجاح', 'cmd-success')
      await loadData()
      return
    }
    const { nextDocNo } = await import('../../db/sequences.js')
    const voucherNo = await nextDocNo('receipt', new Date(f.date).getFullYear())
    const id = await db.collections.add({
      customerId: f.customerId, date: f.date, method: f.method, amount: f.amount,
      referenceNo: f.referenceNo || null, notes: f.notes, status: 'posted', createdAt: Date.now(),
      voucher_no: voucherNo,
    })
    await postCollectionJournal({ collectionId: id, amount: f.amount, method: f.method })
    const s = await currentSession()
    await db.auditLogs.add({ userId: s?.userId ?? 0, userName: s?.userName ?? 'مجهول', action: 'receipt_voucher', refKind: 'collection', refId: id, detail: null, createdAt: Date.now() })
    editing.value = false
    flash('تم حفظ سند القبض بنجاح', 'cmd-success')
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

const propsDef = defineProps({ windowId: { type: [String, Number], default: null }, active: { type: Boolean, default: false } })
provide('docActive', () => propsDef.active)
const getActive = inject('docActive', () => propsDef.active)

function handleKeydown(e) {
  if (!getActive()) return
  if (e.key === 'F2') { e.preventDefault(); openNew() }
  if (e.key === 'F7') { e.preventDefault(); printList() }
  if (e.key === 'Escape') { e.preventDefault(); if (editing.value) closeForm() }
  if (!editing.value) return
  if (e.key === 'F8') { e.preventDefault(); save() }
}

const onNewDoc = () => { if (getActive()) openNew() }

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('sharaf-new-doc', onNewDoc)
  loadData()
})
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('sharaf-new-doc', onNewDoc)
})
</script>

<style scoped>
.receipt-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; outline: none; }
.mono { font-family: monospace; font-size: 12px; }
.num { text-align: left; direction: ltr; }
.row-actions { display: flex; gap: 2px; }
.act-btn { height: 20px; padding: 0 6px; border: 1px solid #b9c2cc; border-radius: 1px; background: #fff; cursor: pointer; font-size: 11px; white-space: nowrap; }
.act-btn:hover { background: #e3ecf7; border-color: #0d5aa7; }
</style>
