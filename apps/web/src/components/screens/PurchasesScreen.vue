<template>
  <!--
    شاشة فواتير المشتريات — نمط bolt.host (بطاقات بيضاء على خلفية رمادية فاتحة)
    مع الحفاظ الكامل على المنطق: حالات draft/received/posted، addBatch، قيد مزدوج، إلغاء يعكس الحركات
  -->
  <div class="purchases-screen" tabindex="-1" @keydown="handleKeydown">
    <!-- ==========================================================
         قائمة فواتير المشتريات
         ========================================================== -->
    <template v-if="!editing">
      <div class="page-screen">
        <div class="page-header">
          <div class="page-title">
            <h1>فواتير المشتريات</h1>
            <p class="page-subtitle">إدارة فواتير الشراء والاستلام والترحيل المحاسبي — العدد: {{ kpi.count }} · الإجمالي: {{ fmt(kpi.total) }}</p>
          </div>
          <button class="btn btn-primary btn-lg" @click="openNewInvoice">
            <span>جديد</span><span class="btn-icon">+</span>
          </button>
        </div>

        <div class="filter-row">
          <div v-for="st in statusChips" :key="st.value"
               class="filter-chip" :class="{ active: filters.status === st.value }"
               @click="filters.status = filters.status === st.value ? '' : st.value">
            <span>{{ st.label }}</span>
            <span class="chip-count">{{ invoices.filter(i => i.status === st.value).length }}</span>
          </div>
          <div class="filter-chip" style="min-width:180px">
            <select class="chip-select" v-model.number="filters.supplierId">
              <option :value="null">كل الموردين</option>
              <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
          <div class="filter-chip" style="gap:6px">
            <input type="date" class="chip-date" v-model="filters.dateFrom" title="من" />
            <span style="color:#94a3b8">—</span>
            <input type="date" class="chip-date" v-model="filters.dateTo" title="إلى" />
          </div>
          <div class="search-box">
            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input v-model="searchText" class="search-input" placeholder="ابحث برقم الفاتورة أو المورد..." @keydown.enter="applySearch" />
            <button class="search-go" @click="applySearch">انتقال</button>
          </div>
          <button v-if="hasFilters" class="btn btn-ghost btn-sm" @click="filters = { supplierId: null, status: '', dateFrom: '', dateTo: '' }; searchText = ''">✕ مسح الفلاتر</button>
        </div>

        <div class="table-card">
          <table class="bolt-table">
            <thead>
              <tr>
                <th style="width:110px">رقم الفاتورة</th>
                <th style="width:100px">التاريخ</th>
                <th>المورد</th>
                <th style="width:90px">البنود</th>
                <th style="width:80px">الكمية</th>
                <th style="width:90px">نوع الدفع</th>
                <th style="width:80px; text-align:left">الإجمالي</th>
                <th style="width:90px">الحالة</th>
                <th style="width:220px">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="inv in visibleInvoices" :key="inv.id"
                  :class="{ selected: selectedRow === inv.id }"
                  @click="selectedRow = inv.id">
                <td><span class="link-cell">{{ inv.invoice_no }}</span></td>
                <td>{{ inv.date }}</td>
                <td>{{ supplierName(inv.supplierId) }}</td>
                <td>{{ inv.linesCount }}</td>
                <td class="num-cell">{{ fmt(inv.totalQty) }}</td>
                <td>{{ payLabel(inv.paymentType) }}</td>
                <td class="num-cell"><b>{{ fmt(inv.total) }}</b></td>
                <td>
                  <span class="status-dot" :class="inv.status"></span>
                  <span class="status-name" :class="inv.status">{{ statusLabel(inv.status) }}</span>
                </td>
                <td class="action-cells">
                  <button class="act" title="عرض" @click.stop="viewInvoice(inv)">◈</button>
                  <button v-if="inv.status === 'draft'" class="act" title="استلام — يزيد المخزون فعليًا" @click.stop="receiveInvoice(inv)">◈ استلام</button>
                  <button v-if="inv.status === 'received'" class="act ok" title="ترحيل محاسبي — ينشئ قيد مزدوج" @click.stop="postInvoice(inv)">✔ ترحيل</button>
                  <button v-if="inv.status === 'received'" class="act danger" title="إلغاء الاستلام — يخصم المخزون" @click.stop="unreceiveInvoice(inv)">↺</button>
                  <button v-if="inv.status === 'posted'" class="act" title="طباعة" @click.stop="viewInvoice(inv, true)">طباعة</button>
                  <button v-if="canCancel(inv)" class="act danger" title="إلغاء — يعكس المخزون والقيود" @click.stop="deleteInvoice(inv)">✕</button>
                </td>
              </tr>
              <tr v-if="visibleInvoices.length === 0">
                <td colspan="9" class="empty-row">
                  <div class="empty-box">
                    <span class="empty-icon">◈</span>
                    <p class="empty-title">{{ hasFilters ? 'لا توجد فواتير مطابقة للفلترة' : 'لا توجد فواتير شراء بعد' }}</p>
                    <p class="empty-hint">اضغط زر «جديد» لإنشاء فاتورة شراء — الاستلام يزيد المخزون والتسجيل بقيد مزدوج</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ==========================================================
         نموذج فاتورة الشراء
         ========================================================== -->
    <template v-else>
      <div class="form-screen">
        <!-- بطاقة الرأس -->
        <div class="form-header-card">
          <div class="form-card-title">
            <span>فاتورة مشتريات جديدة</span>
            <button class="close-btn" @click="closeForm">✕</button>
          </div>
          <div class="form-fields">
            <div class="field-card">
              <label>رقم الفاتورة</label>
              <input class="fi" :value="'P-' + new Date(form.date).getFullYear().toString().slice(-2) + '-****'" readonly />
            </div>
            <div class="field-card">
              <label>التاريخ</label>
              <input type="date" class="fi" v-model="form.date" />
            </div>
            <div class="field-card" style="flex:1.2">
              <label>المورد *</label>
              <select class="fi" v-model.number="form.supplierId" @change="focusSupplier">
                <option :value="null" disabled>— اختر مورد —</option>
                <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>
            <div class="field-card">
              <label>طريقة الدفع</label>
              <div class="toggle-group">
                <button type="button" class="toggle" :class="{ on: form.paymentType === 'credit' }" @click="form.paymentType = 'credit'">آجل</button>
                <button type="button" class="toggle" :class="{ on: form.paymentType === 'cash' }" @click="form.paymentType = 'cash'">نقدي</button>
                <button type="button" class="toggle" :class="{ on: form.paymentType === 'bank' }" @click="form.paymentType = 'bank'">بنكي</button>
              </div>
            </div>
          </div>
          <div class="barcode-strip">
            <div class="field-card" style="flex:1.4; margin:0">
              <label>البحث السريع عن صنف</label>
              <input class="fi" v-model="quickItem" placeholder="ابدأ بالكتابة لإضافة صنف..." list="quick-items" @keydown.enter="addQuickItem" />
              <datalist id="quick-items">
                <option v-for="it in items" :key="it.id" :value="it.name"></option>
              </datalist>
            </div>
            <button class="btn btn-primary" @click="addQuickItem" :disabled="!quickItem.trim()">➕ إضافة صنف</button>
          </div>
        </div>

        <!-- بطاقة البنود -->
        <div class="form-card">
          <div class="form-card-title" style="border-bottom:none; padding-bottom:0">
            <span>بنود الفاتورة</span>
            <button class="btn btn-ghost btn-sm" @click="addLine">+ إضافة بند</button>
          </div>
          <table class="lines-table" v-if="form.lines.length > 0">
            <thead>
              <tr>
                <th style="width:22%">الصنف</th>
                <th style="width:9%">الكمية</th>
                <th style="width:8%">البونص</th>
                <th style="width:11%">سعر الشراء</th>
                <th style="width:8%">خصم</th>
                <th style="width:8%">ضريبة</th>
                <th style="width:11%; text-align:left">الإجمالي</th>
                <th style="width:11%">ت.الانتهاء</th>
                <th style="width:42px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(l, i) in form.lines" :key="i">
                <td>
                  <select class="li" v-model.number="l.itemId" @change="onItemSelect(i)">
                    <option :value="null" disabled>— اختر صنف —</option>
                    <option v-for="it in items" :key="it.id" :value="it.id">{{ it.name }} ({{ unitLabel(it.unit) }})</option>
                  </select>
                </td>
                <td><input type="number" min="1" step="1" class="li" v-model.number="l.qty" /></td>
                <td><input type="number" min="0" step="1" class="li" v-model.number="l.bonus" /></td>
                <td><input type="number" min="0" step="0.01" class="li" v-model.number="l.cost" /></td>
                <td><input type="number" min="0" step="0.01" class="li" v-model.number="l.discount" /></td>
                <td><input type="number" min="0" step="0.01" class="li" v-model.number="l.tax" /></td>
                <td class="num-cell row-total">{{ fmt(lineTotal(l)) }}</td>
                <td><input type="date" class="li" v-model="l.expDate" /></td>
                <td><button class="delete-btn" @click="removeLine(i)" :disabled="form.lines.length <= 1" title="حذف البند">✕</button></td>
              </tr>
            </tbody>
          </table>
          <div v-else class="lines-empty">
            <span class="empty-icon">◈</span>
            <p class="empty-title">لا توجد بنود في الفاتورة</p>
            <p class="empty-hint">استخدم البحث السريع أو زر إضافة بند لإضافة الأصناف</p>
          </div>
        </div>

        <!-- الملخص + الملاحظات -->
        <div class="form-bottom">
          <div class="totals-card">
            <div class="total-row"><span>المجموع قبل الخصم</span><span class="t-num">{{ fmt(preDiscountTotal) }} <span class="cur">ري</span></span></div>
            <div class="total-row"><span>إجمالي الخصم</span><span class="t-num">−{{ fmt(totalDiscount) }} <span class="cur">ري</span></span></div>
            <div class="total-row"><span>إجمالي الضريبة</span><span class="t-num">+{{ fmt(totalTax) }} <span class="cur">ري</span></span></div>
            <div class="total-row net"><span>الإجمالي النهائي</span><span class="t-num">{{ fmt(netTotal) }} <span class="cur">ري</span></span></div>
            <div class="total-row" v-if="form.paymentType === 'credit'"><span>المتبقي (ذمم المورد)</span><span class="t-num remaining">{{ fmt(remaining) }} <span class="cur">ري</span></span></div>
          </div>
          <div class="notes-card">
            <label>ملاحظات إضافية</label>
            <textarea class="notes-area" v-model="form.notes" placeholder="رقم فاتورة المورد / ملاحظات..."></textarea>
          </div>
        </div>

        <div v-if="formError" class="form-msg form-msg-error">{{ formError }}</div>
        <div v-if="formStatusMsg" class="form-msg" :class="formStatusClass === 'cmd-error' ? 'form-msg-error' : 'form-msg-ok'">{{ formStatusMsg }}</div>

        <div class="form-actions-row">
          <button class="btn btn-outline" @click="closeForm">✕ إلغاء</button>
          <button class="btn btn-outline" @click="saveInvoice(false)" :disabled="saving">حفظ كمسودة</button>
          <button class="btn btn-primary" @click="saveInvoice(true)" :disabled="saving">
            <span v-if="saving" class="spin">⏳</span>
            <span>استلام وترحيل</span>
          </button>
        </div>
      </div>
    </template>

    <!-- ==========================================================
         عرض / طباعة الفاتورة
         ========================================================== -->
    <div v-if="showView" class="form-modal-overlay" @click.self="showView = false">
      <div class="print-area" :class="{ 'print-area-only': printOnly }">
        <div class="form-card-title print-hide">
          <span>فاتورة الشراء {{ viewed?.invoice_no }}</span>
          <button class="close-btn" @click="showView = false">✕</button>
        </div>
        <div class="invoice-head" v-if="viewed">
          <div class="inv-co">
            <div class="inv-co-name">نظام شرف — SHARAF ERP</div>
            <div class="inv-co-sub">محاسبة ومخازن ومشتريات</div>
          </div>
          <div class="inv-meta">
            <div><strong>رقم الفاتورة: {{ viewed.invoice_no }}</strong></div>
            <div>التاريخ: {{ viewed.date }}</div>
            <div>المورد: {{ supplierName(viewed.supplierId) }}</div>
            <div>الحالة: <span class="status-name" :class="viewed.status">{{ statusLabel(viewed.status) }}</span></div>
          </div>
        </div>
        <table class="lines-table" style="border:1px solid #e2e8f0">
          <thead><tr><th>#</th><th>الصنف</th><th style="text-align:left">الكمية</th><th style="text-align:left">البونص</th><th style="text-align:left">التكلفة</th><th style="text-align:left">الإجمالي</th><th>انتهاء الصلاحية</th></tr></thead>
          <tbody>
            <tr v-for="(l, i) in viewedLines" :key="l.id || i">
              <td style="width:40px" class="num-cell">{{ i + 1 }}</td>
              <td>{{ viewedItems[l.itemId]?.name || l.item_name || '—' }}</td>
              <td class="num-cell">{{ l.qty }}{{ l.bonus ? '+' + l.bonus : '' }}</td>
              <td class="num-cell">{{ l.bonus || 0 }}</td>
              <td class="num-cell">{{ fmt(l.unit_cost) }}</td>
              <td class="num-cell">{{ fmt(l.subtotal) }}</td>
              <td>{{ l.expiry_date ? String(l.expiry_date).slice(0, 10) : '—' }}</td>
            </tr>
          </tbody>
        </table>
        <div class="invoice-total">الإجمالي: <strong>{{ fmt(viewedTotal) }} ري</strong></div>
        <div class="print-actions print-hide">
          <button class="btn btn-primary" @click="doPrint">طباعة</button>
          <button class="btn btn-outline" @click="showView = false">إغلاق</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, inject , provide} from 'vue'
import { db, activeItems, activeSuppliers } from '../../db/database.js'
import { fmt, addBatch, postPurchaseJournal } from '../../db/engine.js'
import { requirePermission } from '../../db/session.js'
import { apiFetch } from '../../db/api.js'
import {
  serverPostPurchase, serverCancelPurchase, serverCreatePurchaseDraft,
  serverReceivePurchase, serverPostPurchaseInvoice, serverUnreceivePurchase,
} from '../../db/serverOps.js'
import { getStorageMode } from '../../db/database.js'

const invoices = ref([])
const suppliers = ref([])
const items = ref([])
const filters = ref({ supplierId: null, status: '', dateFrom: '', dateTo: '' })
const searchText = ref('')
const quickItem = ref('')
const selectedRow = ref(null)
const editing = ref(false)
const saving = ref(false)
const formError = ref('')
const formStatusMsg = ref('')
const formStatusClass = ref('')
const showView = ref(false)
const printOnly = ref(false)
const viewed = ref(null)
const viewedLines = ref([])

const form = ref({ supplierId: null, date: new Date().toISOString().slice(0, 10), paymentType: 'credit', notes: '', lines: [{ itemId: null, qty: 1, cost: 0, bonus: 0, discount: 0, tax: 0, mfgDate: '', expDate: '', batchNo: '' }] })

function isServer() { return getStorageMode() === 'server' }
function supplierName(id) { return suppliers.value.find(s => s.id === id)?.name || '—' }
function itemOf(id) { return items.value.find(i => i.id === id) }
function unitLabel(u) { return { box: 'علبة', strip: 'شريط', tab: 'قرص', vial: 'قارورة', box_of_vials: 'علبة قوارير' }[u] || u || 'وحدة' }
function payLabel(t) { return { cash: 'نقدي', bank: 'بنكي', credit: 'آجل' }[t] || t }
function statusLabel(s) { return { draft: 'مسودة', received: 'مستلمة', posted: 'مرحّلة', cancelled: 'ملغاة' }[s] || s }

const statusChips = [
  { value: '', label: 'الكل' },
  { value: 'draft', label: 'مسودة' },
  { value: 'received', label: 'مستلمة' },
  { value: 'posted', label: 'مرحّلة' },
  { value: 'cancelled', label: 'ملغاة' },
]

const hasFilters = computed(() => !!(filters.value.status || filters.value.supplierId != null || filters.value.dateFrom || filters.value.dateTo || searchText.value.trim()))

function lineTotal(l) {
  const qty = Number(l.qty || 0) + Number(l.bonus || 0)
  const disc = Number(l.discount || 0)
  const tax = Number(l.tax || 0)
  return Math.max(0, qty * Number(l.cost || 0) - disc + tax)
}
const preDiscountTotal = computed(() => form.value.lines.reduce((s, l) => (Number(l.qty || 0) + Number(l.bonus || 0)) * Number(l.cost || 0) + s, 0))
const totalDiscount = computed(() => form.value.lines.reduce((s, l) => s + Number(l.discount || 0), 0))
const totalTax = computed(() => form.value.lines.reduce((s, l) => s + Number(l.tax || 0), 0))
const expenses = computed(() => 0)
const netTotal = computed(() => preDiscountTotal.value - totalDiscount.value + totalTax.value + expenses.value)
const paidAmount = computed(() => form.value.paymentType === 'credit' ? 0 : netTotal.value)
const remaining = computed(() => Math.max(0, netTotal.value - paidAmount.value))

const viewedTotal = computed(() => viewedLines.value.reduce((s, l) => s + Number(l.subtotal || 0), 0))
const viewedItemsMap = computed(() => Object.fromEntries(items.value.map(i => [i.id, i])))
function viewedItems(id) { return viewedItemsMap.value[id] }

const kpi = computed(() => {
  const active = invoices.value.filter(i => i.status !== 'cancelled')
  return {
    total: active.reduce((s, i) => s + (i.total || 0), 0),
    count: active.length,
    postedTotal: invoices.value.filter(i => i.status === 'posted').reduce((s, i) => s + (i.total || 0), 0),
    draftCount: invoices.value.filter(i => i.status === 'draft').length,
  }
})

const visibleInvoices = computed(() => {
  const f = filters.value
  const term = searchText.value.trim().toLowerCase()
  return [...invoices.value].filter(inv => {
    if (f.status && inv.status !== f.status) return false
    if (f.supplierId != null && inv.supplierId !== f.supplierId) return false
    if (f.dateFrom && inv.date < f.dateFrom) return false
    if (f.dateTo && inv.date > f.dateTo) return false
    if (term && !(inv.invoice_no || '').toLowerCase().includes(term) && !supplierName(inv.supplierId).toLowerCase().includes(term)) return false
    return true
  }).sort((a, b) => b.id - a.id)
})

async function loadData() {
  try {
  suppliers.value = await activeSuppliers()
  items.value = (await activeItems()).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'))
  if (isServer()) {
    try {
      const qs = new URLSearchParams()
      if (filters.value.supplierId != null) qs.set('supplierId', filters.value.supplierId)
      if (filters.value.status) qs.set('status', filters.value.status)
      if (filters.value.dateFrom) qs.set('dateFrom', filters.value.dateFrom)
      if (filters.value.dateTo) qs.set('dateTo', filters.value.dateTo)
      const raw = await apiFetch('/purchases?' + qs.toString())
      const lines = await apiFetch('/purchases-lines', { fallback: [] })
      invoices.value = (Array.isArray(raw) ? raw : []).map(inv => {
        const ils = (Array.isArray(lines) ? lines : []).filter(l => l.invoice_id === inv.id)
        return {
          ...inv, id: inv.id, supplierId: inv.supplier_id, date: String(inv.invoice_date || '').slice(0, 10),
          status: inv.status, paymentType: inv.payment_type, invoice_no: inv.invoice_no,
          linesCount: ils.length,
          totalQty: ils.reduce((s, l) => s + (l.qty || 0) + (l.bonus || 0), 0),
          total: ils.reduce((s, l) => s + Number(l.subtotal || 0), 0),
        }
      })
    } catch (e) {
      formError.value = 'فشل تحميل الفواتير: ' + (e.message || e)
    }
    return
  }
  const raw = await db.purchaseInvoices.toArray()
  const lines = await db.purchaseLines.toArray()
  invoices.value = raw.map(inv => {
    const ils = lines.filter(l => l.invoiceId === inv.id)
    return {
      ...inv,
      supplierId: inv.supplierId, date: inv.date, status: inv.status || 'posted',
      paymentType: inv.paymentType, invoice_no: inv.invoice_no || `P-${inv.id}`,
      linesCount: ils.length,
      totalQty: ils.reduce((s, l) => s + (l.qty || 0), 0),
      total: ils.reduce((s, l) => s + (l.qty || 0) * (l.cost || 0), 0),
    }
  })
  } catch (e) {
    console.error('[PurchasesScreen] loadData failed:', e)
    formError.value = 'فشل تحميل البيانات: ' + (e.message || e)
  }
}

function flash(msg, cls) { formStatusMsg.value = msg; formStatusClass.value = cls; setTimeout(() => { if (formStatusMsg.value === msg) formStatusMsg.value = '' }, 4000) }

function addLine() { form.value.lines.push({ itemId: null, qty: 1, cost: 0, bonus: 0, discount: 0, tax: 0, mfgDate: '', expDate: '', batchNo: '' }) }
function removeLine(i) { if (form.value.lines.length > 1) form.value.lines.splice(i, 1) }
function onItemSelect(i) {
  const it = itemOf(form.value.lines[i].itemId)
  if (it) form.value.lines[i].cost = it.cost || it.purchasePrice || 0
}
function focusSupplier() { /* البحث عن مورد عبر فلاتر رأس المستند */ }
function addQuickItem() {
  const term = quickItem.value.trim()
  if (!term) return
  const found = items.value.find(it => it.name.toLowerCase().includes(term.toLowerCase()))
  if (found) {
    form.value.lines.push({ itemId: found.id, qty: 1, cost: found.cost || found.purchasePrice || 0, bonus: 0, discount: 0, tax: 0, mfgDate: '', expDate: '', batchNo: '' })
  }
  quickItem.value = ''
}

function openNewInvoice() {
  formError.value = ''
  flash('')
  quickItem.value = ''
  form.value = { supplierId: null, date: new Date().toISOString().slice(0, 10), paymentType: 'credit', notes: '', lines: [{ itemId: null, qty: 1, cost: 0, bonus: 0, discount: 0, tax: 0, mfgDate: '', expDate: '', batchNo: '' }] }
  editing.value = true
  showView.value = false
}
function closeForm() { if (!saving.value) { editing.value = false; showView.value = false } }

function buildPayload() {
  const f = form.value
  if (!f.supplierId) throw new Error('اختر موردًا')
  const lines = f.lines.filter(l => l.itemId && l.qty && l.qty > 0)
  if (lines.length === 0) throw new Error('أضف صنفًا واحدًا على الأقل بكمية صحيحة')
  for (const l of lines) { if (!l.cost || l.cost <= 0) throw new Error('التكلفة غير صحيحة في أحد البنود') }
  return { supplierId: f.supplierId, date: f.date, paymentType: f.paymentType, notes: f.notes, lines: lines.map(l => ({ itemId: l.itemId, qty: l.qty, cost: l.cost, expDate: l.expDate || null, bonus: l.bonus || 0, discount: l.discount || 0, tax: l.tax || 0 })) }
}

async function saveInvoice(receiveImmediately = false) {
  saving.value = true
  formError.value = ''
  try {
    await requirePermission('purchases', 'إنشاء فاتورة شراء')
    const payload = buildPayload()
    if (isServer()) {
      if (receiveImmediately) {
        await serverPostPurchase(payload)
      } else {
        await serverCreatePurchaseDraft(payload)
      }
      editing.value = false
      flash(receiveImmediately ? 'تم الاستلام والترحيل بنجاح' : 'تم الحفظ كمسودة', 'cmd-success')
      await loadData()
      return
    }
    const total = payload.lines.reduce((s, l) => s + l.qty * l.cost, 0)
    /* ترقيم آمن لا يتكرر حتى تحت الضغط المتزامن */
    const { nextDocNo } = await import('../../db/sequences.js')
    const invoiceNo = await nextDocNo('purchase', new Date(payload.date).getFullYear())
    const invId = await db.purchaseInvoices.add({
      supplierId: payload.supplierId, date: payload.date, storeId: 1, paymentType: payload.paymentType,
      notes: payload.notes, status: 'posted', total, createdAt: Date.now(),
      invoice_no: invoiceNo,
    })
    for (const l of payload.lines) {
      const batchId = await addBatch({
        itemId: l.itemId, storeId: 1, batchNo: `LOT-${invId}-${l.itemId}`,
        mfgDate: l.mfgDate || null, expDate: l.expDate || null, qty: l.qty, cost: l.cost,
        sourceKind: 'purchase', sourceId: invId,
      })
      await db.purchaseLines.add({ invoiceId: invId, itemId: l.itemId, batchId, qty: l.qty, cost: l.cost, expDate: l.expDate || null })
    }
    await postPurchaseJournal({ purchaseId: invId, total, paymentType: payload.paymentType })
    editing.value = false
    flash('تم الحفظ والترحيل بنجاح', 'cmd-success')
    await loadData()
  } catch (e) {
    formError.value = e.message
    flash(e.message, 'cmd-error')
  } finally {
    saving.value = false
  }
}

function canCancel(inv) { return inv.status !== 'cancelled' }

async function deleteInvoice(inv) {
  if (!confirm(`هل أنت متأكد من إلغاء فاتورة الشراء ${inv.invoice_no}؟ ستُعكس كل حركات المخزون والقيود.`)) return
  try {
    await requirePermission('purchases', 'إلغاء فاتورة شراء')
    if (isServer()) {
      await serverCancelPurchase(inv.id)
      await loadData()
      return
    }
    /* إلغاء فعلي في الوضع المحلي: عكس القيود واسترجاع المخزون (soft delete) */
    const { cancelPurchaseLocal } = await import('../../db/engine.js')
    await cancelPurchaseLocal(inv.id)
    await loadData()
  } catch (e) {
    flash(e.message, 'cmd-error')
  }
}

async function receiveInvoice(inv) {
  if (!confirm(`استلام فاتورة الشراء ${inv.invoice_no}؟ سيزيد المخزون فعليًا.`)) return
  try {
    await requirePermission('purchases', 'استلام فاتورة شراء')
    if (isServer()) {
      await serverReceivePurchase(inv.id)
      await loadData()
      flash('تم الاستلام بنجاح', 'cmd-success')
      return
    }
    const lines = await db.purchaseLines.where('invoiceId').equals(inv.id).toArray()
    for (const l of lines) {
      await addBatch({ itemId: l.itemId, storeId: 1, batchNo: `LOT-${inv.id}-${l.itemId}`, mfgDate: null, expDate: l.expDate || null, qty: l.qty, cost: l.cost, sourceKind: 'purchase', sourceId: inv.id })
    }
    await db.purchaseInvoices.update(inv.id, { status: 'received' })
    await loadData()
    flash('تم الاستلام بنجاح', 'cmd-success')
  } catch (e) {
    flash(e.message, 'cmd-error')
  }
}

async function postInvoice(inv) {
  if (!confirm(`ترحيل فاتورة الشراء ${inv.invoice_no} محاسبيًا؟ ستنشأ قيد مزدوج (مخزون مدين / ذمم دائنة دائن).`)) return
  try {
    await requirePermission('purchases', 'ترحيل فاتورة شراء')
    if (isServer()) {
      await serverPostPurchaseInvoice(inv.id)
      await loadData()
      flash('تم الترحيل بنجاح', 'cmd-success')
      return
    }
    const lines = await db.purchaseLines.where('invoiceId').equals(inv.id).toArray()
    const total = lines.reduce((s, l) => s + l.qty * l.cost, 0)
    await postPurchaseJournal({ purchaseId: inv.id, total, paymentType: inv.paymentType })
    await db.purchaseInvoices.update(inv.id, { status: 'posted' })
    await loadData()
    flash('تم الترحيل بنجاح', 'cmd-success')
  } catch (e) {
    flash(e.message, 'cmd-error')
  }
}

async function unreceiveInvoice(inv) {
  if (!confirm(`إلغاء استلام فاتورة ${inv.invoice_no}؟ سيُخصم المخزون المستلم.`)) return
  try {
    await requirePermission('purchases', 'إلغاء استلام فاتورة')
    if (isServer()) {
      await serverUnreceivePurchase(inv.id)
      await loadData()
      flash('تم إلغاء الاستلام', 'cmd-success')
      return
    }
    await db.stockMovements.where('refKind').equals('purchase').and(m => m.refId === inv.id).delete()
    await db.purchaseInvoices.update(inv.id, { status: 'draft' })
    await loadData()
    flash('تم إلغاء الاستلام', 'cmd-success')
  } catch (e) {
    flash(e.message, 'cmd-error')
  }
}

async function viewInvoice(inv, withPrint = false) {
  printOnly.value = withPrint
  if (isServer()) {
    try {
      const detail = await apiFetch('/purchases/' + inv.id)
      viewed.value = detail.invoice
      viewedLines.value = detail.lines
    } catch (e) {
      flash('فشل تحميل الفاتورة: ' + (e.message || e), 'cmd-error')
      return
    }
  } else {
    viewed.value = inv
    viewedLines.value = await db.purchaseLines.where('invoiceId').equals(inv.id).toArray()
  }
  showView.value = true
  editing.value = false
}

function doPrint() { window.print() }
function focusSearch() { }
function applySearch() { /* مفعّل عبر v-model */ }
function printList() { window.print() }

/* اختصارات F-key داخل الشاشة — تعمل فقط عندما تكون النافذة نشطة */
const propsDef = defineProps({ windowId: { type: [String, Number], default: null }, active: { type: Boolean, default: false } })
provide('docActive', () => propsDef.active)
const getActive = inject('docActive', () => propsDef.active)

function handleKeydown(e) {
  if (!getActive()) return
  if (!editing.value) {
    if (e.key === 'F2') { e.preventDefault(); openNewInvoice() }
    return
  }
  if (e.key === 'F8') { e.preventDefault(); saveInvoice(false) }
  if (e.key === 'F10') { e.preventDefault(); saveInvoice(true) }
  if (e.key === 'Escape') { e.preventDefault(); closeForm() }
}

// حدث «جديد» صادر من App.vue عند الضغط على F2/جديد أثناء النافذة نشطة
const onNewDoc = () => { if (getActive()) openNewInvoice() }

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
/* ============================================
   نمط bolt.host — بطاقات بيضاء على خلفية رمادية فاتحة
   ============================================ */
.purchases-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; outline: none; overflow: auto; }
.mono { font-family: monospace; font-size: 12px; }
.num-cell { text-align: left; direction: ltr; font-variant-numeric: tabular-nums; }
.link-cell { color: #2563eb; font-weight: 600; cursor: pointer; text-decoration: none; }

/* ---------- شاشة القائمة ---------- */
.page-screen { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.page-header { display: flex; align-items: center; justify-content: space-between; }
.page-title h1 { font-size: 26px; font-weight: 800; color: #0f172a; line-height: 1.2; }
.page-subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }

.filter-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.filter-chip { display: flex; align-items: center; gap: 6px; height: 34px; padding: 0 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 999px; font-size: 13px; color: #475569; cursor: pointer; transition: all 0.15s; }
.filter-chip:hover { border-color: #2563eb; color: #2563eb; }
.filter-chip.active { background: #2563eb; color: #fff; border-color: #2563eb; font-weight: 600; }
.chip-count { font-size: 11px; opacity: 0.75; background: rgba(0,0,0,0.08); border-radius: 999px; padding: 0 6px; min-width: 20px; text-align: center; }
.filter-chip.active .chip-count { background: rgba(255,255,255,0.25); }
.chip-select { border: none; outline: none; background: transparent; font-size: 13px; font-family: inherit; color: #475569; cursor: pointer; width: 100%; }
.chip-date { border: none; outline: none; background: transparent; font-size: 12px; font-family: inherit; color: #475569; width: 115px; }

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

.action-cells { display: flex; gap: 4px; }
.act { height: 28px; padding: 0 8px; border: 1px solid #e2e8f0; background: #fff; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; gap: 3px; white-space: nowrap; }
.act:hover { background: #eff6ff; border-color: #2563eb; }
.act.ok { color: #15803d; }
.act.ok:hover { background: #f0fdf4; border-color: #86efac; }
.act.danger { color: #dc2626; }
.act.danger:hover { background: #fef2f2; border-color: #fca5a5; }

/* ---------- نموذج الفاتورة ---------- */
.form-screen { padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 14px; max-width: 1100px; width: 100%; margin: 0 auto; }
.form-header-card, .form-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05); padding: 16px; }
.form-header-card { background: #f8fafc; }
.form-card-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-size: 16px; font-weight: 800; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
.close-btn { background: transparent; border: none; font-size: 14px; color: #64748b; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
.close-btn:hover { background: #f1f5f9; color: #0f172a; }

.form-fields { display: flex; gap: 10px; flex-wrap: wrap; }
.field-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; min-width: 140px; flex: 1; display: flex; flex-direction: column; gap: 4px; }
.field-card label { font-size: 11px; font-weight: 600; color: #64748b; }
.fi { height: 32px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0 10px; font-size: 13px; font-family: inherit; color: #0f172a; background: #fff; outline: none; }
.fi:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15); }
.fi[readonly] { background: #f8fafc; color: #64748b; }

.barcode-strip { display: flex; gap: 10px; margin-top: 12px; align-items: flex-end; }

.toggle-group { display: flex; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #f1f5f9; height: 32px; }
.toggle { flex: 1; border: none; background: transparent; font-size: 12px; font-weight: 600; color: #64748b; cursor: pointer; font-family: inherit; padding: 0 12px; transition: all 0.15s; }
.toggle.on { background: #2563eb; color: #fff; }
.toggle:hover:not(.on) { background: #e2e8f0; }

.lines-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.lines-table th { background: #f8fafc; color: #64748b; font-weight: 600; font-size: 12px; padding: 8px 10px; text-align: right; border-bottom: 1px solid #e2e8f0; }
.lines-table td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; }
.li { height: 34px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0 10px; font-size: 13px; font-family: inherit; color: #0f172a; background: #fff; width: 100%; outline: none; }
.li:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15); }
.lines-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 32px; color: #94a3b8; }

.form-bottom { display: flex; gap: 14px; align-items: stretch; }
.totals-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; display: flex; flex-direction: column; gap: 8px; min-width: 300px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05); }
.total-row { display: flex; justify-content: space-between; font-size: 13px; color: #475569; }
.total-row .t-num { direction: ltr; text-align: left; font-variant-numeric: tabular-nums; }
.total-row .cur { color: #94a3b8; font-size: 11px; margin-right: 2px; }
.total-row.net { font-size: 16px; font-weight: 800; color: #2563eb; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 2px; }
.total-row .remaining { color: #dc2626; }
.notes-card { background: #fff; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 12px 14px; flex: 1; display: flex; flex-direction: column; gap: 6px; }
.notes-card label { font-size: 11px; font-weight: 600; color: #64748b; }
.notes-area { border: none; outline: none; resize: none; font-size: 13px; font-family: inherit; color: #334155; min-height: 64px; }

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

.delete-btn { width: 28px; height: 28px; border: 1px solid #fecaca; background: #fff; border-radius: 6px; cursor: pointer; font-size: 12px; display: inline-flex; align-items: center; justify-content: center; }
.delete-btn:hover { background: #fef2f2; }
.delete-btn:disabled { opacity: 0.4; cursor: default; }

/* ---------- نافذة العرض/الطباعة ---------- */
.form-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
.print-area { background: #fff; border-radius: 10px; border: 1px solid #e2e8f0; width: 620px; max-width: 96vw; box-shadow: 0 20px 40px rgba(0,0,0,0.25); max-height: 92vh; overflow: auto; padding: 24px; }
.invoice-head { display: flex; justify-content: space-between; gap: 12px; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 12px; }
.inv-co-name { font-size: 15px; font-weight: 800; color: #0f172a; }
.inv-co-sub { font-size: 11px; color: #64748b; }
.inv-meta div { font-size: 12px; margin: 3px 0; color: #475569; }
.invoice-total { text-align: left; direction: ltr; margin-top: 12px; font-size: 15px; color: #0f172a; }
.print-actions { display: flex; gap: 8px; justify-content: flex-end; align-items: center; padding: 12px 0 0; border-top: 1px solid #e2e8f0; margin-top: 12px; }

/* ---------- شارات الحالة ---------- */
.status-dot { display: inline-block; width: 7px; height: 7px; border-radius: 999px; margin-left: 6px; }
.status-name { font-size: 12px; font-weight: 600; }
.status-name.draft { color: #6b7280; }
.status-dot.draft { background: #d1d5db; }
.status-name.received { color: #2563eb; }
.status-dot.received { background: #2563eb; }
.status-name.posted { color: #15803d; }
.status-dot.posted { background: #16a34a; }
.status-name.cancelled { color: #dc2626; }
.status-dot.cancelled { background: #ef4444; }

@media print {
  .form-modal-overlay { display: none !important; }
  .print-area { display: block !important; border: none !important; box-shadow: none !important; width: 100% !important; max-width: 100% !important; max-height: none !important; position: static !important; }
  .print-hide { display: none !important; }
}
</style>
