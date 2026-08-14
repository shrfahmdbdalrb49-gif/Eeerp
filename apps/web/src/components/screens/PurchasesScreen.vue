<template>
  <!--
    شاشة فواتير المشتريات — تصميم ERP مكتبي كلاسيكي
    التركيب: شريط أدوات (F) → رأس المستند (حقل مجمّعة) → جدول البنود → الإجماليات → شريط أوامر
  -->
  <div class="purchases-screen" tabindex="0">
    <div v-if="!editing" class="doc-shell">
      <!-- ===== شريط الأدوات ===== -->
      <div class="doc-toolbar">
        <button class="tool-f primary" title="فاتورة جديدة (F2)" @click="openNewInvoice">
          <span class="fkey">F2</span> جديد
        </button>
        <div class="toolbar-sep"></div>
        <button class="tool-f" title="بحث (F3)" @click="focusSearch">
          <span class="fkey">F3</span> بحث
        </button>
        <button class="tool-f" title="طباعة (F7)" @click="printList">
          <span class="fkey">F7</span> طباعة
        </button>
        <div class="toolbar-sep"></div>
        <button class="tool-f" title="مسح الفلاتر" @click="filters = { supplierId: null, status: '', dateFrom: '', dateTo: '' }">
          <span class="fkey">F4</span> مسح
        </button>
        <span class="toolbar-spacer"></span>
        <span class="toolbar-subtitle">إجمالي الفواتير: <b>{{ fmt(kpi.total) }}</b> — عدد: <b>{{ kpi.count }}</b> — المُرحَّل: <b>{{ fmt(kpi.postedTotal) }}</b> — قيد الاستلام: <b>{{ kpi.draftCount }}</b></span>
      </div>

      <!-- ===== رأس المستند (فلاتر مركّزة في إطار واحد) ===== -->
      <div class="doc-header">
        <div class="field-group">
          <span class="field-group-title">بيانات الفاتورة</span>
          <div class="field">
            <label>الفرع</label>
            <input type="text" class="input-field" value="الفرع الرئيسي" readonly />
          </div>
          <div class="field">
            <label>المخزن</label>
            <input type="text" class="input-field" value="المخزن الرئيسي" readonly />
          </div>
          <div class="field">
            <label>العملة</label>
            <input type="text" class="input-field" value="YER" readonly />
          </div>
        </div>
        <div class="field-group">
          <span class="field-group-title">الفلترة</span>
          <div class="field">
            <label>المورد</label>
            <select class="input-field" v-model.number="filters.supplierId">
              <option :value="null">كل الموردين</option>
              <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
          <div class="field">
            <label>الحالة</label>
            <select class="input-field" v-model="filters.status">
              <option value="">كل الحالات</option>
              <option value="draft">مسودة</option>
              <option value="received">مستلمة</option>
              <option value="posted">مرحّلة</option>
              <option value="cancelled">ملغاة</option>
            </select>
          </div>
        </div>
        <div class="field-group">
          <span class="field-group-title">الفترة</span>
          <div class="field">
            <label>من</label>
            <input type="date" class="input-field" v-model="filters.dateFrom" />
            <button class="field-btn" title="من اليوم">⊿</button>
          </div>
          <div class="field">
            <label>إلى</label>
            <input type="date" class="input-field" v-model="filters.dateTo" />
            <button class="field-btn" title="حتى اليوم">⊿</button>
          </div>
          <div class="field">
            <label>بحث</label>
            <input type="text" class="input-field" v-model="searchText" placeholder="رقم أو مورد..." @input="applySearch" />
            <button class="field-btn" @click="applySearch">…</button>
          </div>
        </div>
      </div>

      <!-- ===== الجدول ===== -->
      <div class="doc-details">
        <table class="classic-grid">
          <thead>
            <tr>
              <th class="row-num">#</th>
              <th style="width:90px">رقم الفاتورة</th><th style="width:84px">التاريخ</th><th>المورد</th>
              <th style="width:56px">البنود</th><th style="width:64px">الكمية</th><th style="width:96px">الإجمالي</th>
              <th style="width:76px">الدفع</th><th style="width:76px">الحالة</th><th style="width:150px">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(inv, idx) in visibleInvoices" :key="inv.id" @click="selectedRow = inv.id">
              <td class="row-num">{{ idx + 1 }}</td>
              <td class="mono">{{ inv.invoice_no }}</td>
              <td>{{ inv.date }}</td>
              <td style="font-weight:bold">{{ supplierName(inv.supplierId) }}</td>
              <td class="num-cell">{{ inv.linesCount }}</td>
              <td class="num-cell">{{ fmt(inv.totalQty) }}</td>
              <td class="num-cell"><b>{{ fmt(inv.total) }}</b></td>
              <td>{{ payLabel(inv.paymentType) }}</td>
              <td><span :class="'status-badge ' + inv.status">{{ statusLabel(inv.status) }}</span></td>
              <td class="row-actions">
                <button class="act-btn" title="عرض (F4)" @click="viewInvoice(inv)">عرض</button>
                <button v-if="inv.status === 'draft'" class="act-btn act-receive" title="استلام (F8)" @click="receiveInvoice(inv)">استلام</button>
                <button v-if="inv.status === 'received'" class="act-btn act-post" title="ترحيل" @click="postInvoice(inv)">ترحيل</button>
                <button v-if="inv.status === 'received'" class="act-btn" title="إلغاء الاستلام" @click="unreceiveInvoice(inv)">↺استلام</button>
                <button v-if="inv.status === 'posted'" class="act-btn" title="طباعة" @click="viewInvoice(inv, true)">طباعة</button>
                <button v-if="!['cancelled', 'posted'].includes(inv.status)" class="act-btn act-cancel" title="إلغاء" @click="deleteInvoice(inv)">إلغاء</button>
              </td>
            </tr>
            <tr v-if="visibleInvoices.length === 0">
              <td colspan="10" class="empty-row">لا توجد فواتير شراء{{ filters.status || filters.supplierId != null || searchText ? ' مطابقة للفلترة' : '' }} — اضغط F2 لإنشاء فاتورة جديدة</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ===== شريط الأوامر السفلي ===== -->
      <div class="doc-commandbar">
        <span class="cmd-hint">F2 جديد · F3 بحث · F4 عرض/تعديل · F7 طباعة · Esc إغلاق</span>
      </div>
    </div>

    <!-- =============================================================
         نافذة إنشاء/تحرير فاتورة الشراء — بنفس التركيب الكلاسيكي
         ============================================================= -->
    <div v-if="editing" class="doc-shell edit-shell">
      <div class="doc-toolbar">
        <button class="tool-f primary" title="حفظ كمسودة (F8)" @click="saveInvoice(false)">
          <span class="fkey">F8</span> حفظ مسودة
        </button>
        <button class="tool-f primary" title="استلام وترحيل (F10)" @click="saveInvoice(true)">
          <span class="fkey">F10</span> استلام وترحيل
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
          <span class="field-group-title">بيانات الفاتورة</span>
          <div class="field">
            <label>رقم</label>
            <input type="text" class="input-field" value="جديدة" readonly />
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
          <span class="field-group-title">المورد والدفع</span>
          <div class="field">
            <label>المورد</label>
            <select class="input-field" v-model.number="form.supplierId">
              <option :value="null" disabled>اختر موردًا</option>
              <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
            <button class="field-btn" title="بحث عن مورد (F5)" @click="focusSupplier">…</button>
          </div>
          <div class="field">
            <label>المخزن</label>
            <input type="text" class="input-field" value="المخزن الرئيسي" readonly />
          </div>
          <div class="field">
            <label>طريقة الدفع</label>
            <select class="input-field" v-model="form.paymentType">
              <option value="credit">آجل (ذمم دائنة)</option>
              <option value="cash">نقدي (الصندوق)</option>
              <option value="bank">تحويل بنكي</option>
            </select>
          </div>
        </div>
        <div class="field-group">
          <span class="field-group-title">أخرى</span>
          <div class="field">
            <label>العملة</label>
            <input type="text" class="input-field" value="YER" readonly />
          </div>
          <div class="field">
            <label>سعر الصرف</label>
            <input type="number" class="input-field" value="1" readonly />
          </div>
          <div class="field">
            <label>مرجع</label>
            <input type="text" class="input-field" v-model="form.notes" placeholder="رقم فاتورة المورد / ملاحظات" />
          </div>
        </div>
      </div>

      <!-- ===== جدول البنود (الإدخال داخل الجدول مباشرة) ===== -->
      <div class="doc-details">
        <table class="classic-grid lines-grid">
          <thead>
            <tr>
              <th class="row-num">#</th>
              <th style="width:72px">كود</th><th style="width:76px">الباركود</th><th style="width:210px">اسم الصنف</th>
              <th style="width:46px">الوحدة</th><th style="width:66px">التشغيلة</th>
              <th style="width:76px">ت.الإنتاج</th><th style="width:76px">ت.الانتهاء</th>
              <th style="width:52px">الكمية</th><th style="width:52px">البونص</th>
              <th style="width:76px">سعر الشراء</th><th style="width:56px">الخصم</th><th style="width:56px">الضريبة</th>
              <th style="width:84px">الإجمالي</th><th style="width:30px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(l, i) in form.lines" :key="i">
              <td class="row-num">{{ i + 1 }}</td>
              <td class="num-cell">{{ itemOf(l.itemId)?.code || '' }}</td>
              <td class="num-cell">{{ itemOf(l.itemId)?.barcode || '' }}</td>
              <td>
                <select class="input-field" v-model.number="l.itemId" @change="onItemSelect(i)" ref="itemSelects">
                  <option :value="null" disabled>اختر صنفًا</option>
                  <option v-for="it in items" :key="it.id" :value="it.id">{{ it.name }}</option>
                </select>
              </td>
              <td>{{ unitLabel(itemOf(l.itemId)?.unit) }}</td>
              <td class="num-cell">{{ l.batchNo || '' }}</td>
              <td><input type="date" class="input-field" v-model="l.mfgDate" /></td>
              <td><input type="date" class="input-field" v-model="l.expDate" /></td>
              <td class="num-cell"><input type="number" class="input-field" v-model.number="l.qty" min="1" /></td>
              <td class="num-cell"><input type="number" class="input-field" v-model.number="l.bonus" min="0" /></td>
              <td class="num-cell"><input type="number" class="input-field" v-model.number="l.cost" min="0" step="0.01" /></td>
              <td class="num-cell"><input type="number" class="input-field" v-model.number="l.discount" min="0" step="0.01" /></td>
              <td class="num-cell"><input type="number" class="input-field" v-model.number="l.tax" min="0" step="0.01" /></td>
              <td class="num-cell row-total">{{ fmt(lineTotal(l)) }}</td>
              <td><button class="delete-btn" type="button" @click="removeLine(i)" :disabled="form.lines.length <= 1">✕</button></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ===== الإجماليات السفلية ===== -->
      <div class="doc-totals">
        <div class="total-cell"><span class="t-label">قبل الخصم:</span><span class="t-value">{{ fmt(preDiscountTotal) }}</span></div>
        <div class="total-cell"><span class="t-label">الخصم:</span><span class="t-value">{{ fmt(totalDiscount) }}</span></div>
        <div class="total-cell"><span class="t-label">الضريبة:</span><span class="t-value">{{ fmt(totalTax) }}</span></div>
        <div class="total-cell"><span class="t-label">المصاريف:</span><span class="t-value">{{ fmt(expenses) }}</span></div>
        <div class="total-cell net"><span class="t-label">الصافي:</span><span class="t-value">{{ fmt(netTotal) }}</span></div>
        <div class="total-cell"><span class="t-label">المدفوع:</span><span class="t-value">{{ fmt(paidAmount) }}</span></div>
        <div class="total-cell"><span class="t-label">المتبقي:</span><span class="t-value">{{ fmt(remaining) }}</span></div>
      </div>

      <!-- ===== شريط الأوامر السفلي ===== -->
      <div class="doc-commandbar">
        <span v-if="formError" class="cmd-error">{{ formError }}</span>
        <span v-else class="cmd-hint">F8 حفظ مسودة · F10 استلام وترحيل · Esc رجوع — الإجماليات تُحتسب تلقائيًا</span>
      </div>
    </div>

    <!-- ===== نافذة عرض الفاتورة / الطباعة ===== -->
    <div v-if="showView" class="form-modal-overlay" @click.self="showView = false">
      <div class="form-modal" :class="{ 'print-area': printOnly }">
        <div class="modal-title print-hide">
          <span>فاتورة الشراء {{ viewed?.invoice_no }}</span>
          <button class="close-btn" @click="showView = false">✕</button>
        </div>
        <div class="modal-body invoice-view" v-if="viewed">
          <div class="invoice-head">
            <div class="inv-co"><b>صيدلية شرف</b><div class="inv-co-sub">Sharaf Pharmacy ERP</div></div>
            <div class="inv-meta">
              <div>رقم الفاتورة: <b>{{ viewed.invoice_no }}</b></div>
              <div>التاريخ: {{ viewed.date }}</div>
              <div>المورد: {{ supplierName(viewed.supplierId) }}</div>
              <div>الحالة: <span :class="'status-badge ' + viewed.status">{{ statusLabel(viewed.status) }}</span></div>
            </div>
          </div>
          <table class="lines-table view-lines">
            <thead><tr><th>#</th><th>الصنف</th><th style="width:70px">الكمية</th><th style="width:46px">البونص</th><th style="width:100px">التكلفة</th><th style="width:100px">الإجمالي</th><th style="width:110px">انتهاء الصلاحية</th></tr></thead>
            <tbody>
              <tr v-for="(l, i) in viewedLines" :key="l.id || i">
                <td class="num">{{ i + 1 }}</td><td>{{ viewedItems[l.itemId]?.name || l.item_name || '—' }}</td>
                <td class="num">{{ l.qty }}{{ l.bonus ? '+' + l.bonus : '' }}</td><td class="num">{{ l.bonus || 0 }}</td><td class="num">{{ fmt(l.unit_cost) }}</td>
                <td class="num">{{ fmt(l.subtotal) }}</td><td>{{ l.expiry_date ? String(l.expiry_date).slice(0, 10) : '—' }}</td>
              </tr>
            </tbody>
          </table>
          <div class="invoice-total">الإجمالي: <b>{{ fmt(viewedTotal) }}</b></div>
        </div>
        <div class="form-actions print-hide">
          <button class="btn btn-primary" @click="doPrint">🖨 طباعة</button>
          <button class="btn btn-secondary" @click="showView = false">إغلاق</button>
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

function openNewInvoice() {
  formError.value = ''
  flash('')
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
.purchases-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; outline: none; }
.mono { font-family: monospace; font-size: 12px; }
.num { text-align: left; direction: ltr; }
.status-badge { padding: 1px 6px; border-radius: 1px; font-size: 11px; font-weight: bold; white-space: nowrap; border: 1px solid transparent; }
.status-badge.draft { background: #f3f4f6; color: #4b5563; border-color: #d1d5db; }
.status-badge.received { background: #e3f0ff; color: #0d5aa7; border-color: #9ec2ef; }
.status-badge.posted { background: #e6f4ea; color: #1b5e20; border-color: #a5d6b0; }
.status-badge.cancelled { background: #fdeaea; color: #b71c1c; border-color: #f0bcbc; }
.row-actions { display: flex; gap: 2px; }
.act-btn { height: 20px; padding: 0 6px; border: 1px solid #b9c2cc; border-radius: 1px; background: #fff; cursor: pointer; font-size: 11px; white-space: nowrap; }
.act-btn:hover { background: #e3ecf7; border-color: #0d5aa7; }
.act-receive { border-color: #9ec2ef; color: #0d5aa7; }
.act-post { border-color: #a5d6b0; color: #1b5e20; }
.act-cancel { border-color: #f0bcbc; color: #b71c1c; background: #fdf2f2; }
.delete-btn { background: #fdeaea; color: #b71c1c; border: 1px solid #f0bcbc; border-radius: 1px; width: 22px; height: 20px; cursor: pointer; font-size: 10px; }
.delete-btn:disabled { opacity: 0.4; cursor: default; }
.form-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 12px; }
.form-modal { background: #fff; border: 1px solid #98a2b3; border-radius: 1px; width: 560px; max-width: 96vw; box-shadow: 2px 2px 8px rgba(0,0,0,0.25); max-height: 92vh; overflow: auto; }
.modal-title { display: flex; justify-content: space-between; align-items: center; background: #0d5aa7; color: #fff; font-weight: bold; padding: 5px 12px; font-size: 13px; }
.close-btn { background: transparent; border: none; color: #fff; cursor: pointer; }
.modal-body { padding: 12px; }
.lines-table { width: 100%; border-collapse: collapse; }
.lines-table th, .lines-table td { border: 1px solid #c4ccd4; padding: 4px 6px; font-size: 12px; text-align: right; }
.lines-table th { background: #e4e8ee; position: sticky; top: 0; }
.num { text-align: left; direction: ltr; }
.invoice-head { display: flex; justify-content: space-between; gap: 12px; border-bottom: 2px solid #0d5aa7; padding-bottom: 8px; margin-bottom: 8px; }
.inv-co-sub { font-size: 11px; color: #667085; }
.inv-meta div { font-size: 12px; margin: 2px 0; }
.invoice-total { text-align: left; direction: ltr; margin-top: 8px; font-size: 14px; }
.form-actions { display: flex; gap: 8px; justify-content: flex-end; align-items: center; padding: 8px 12px; background: #f0f2f5; border-top: 1px solid #c4ccd4; }
.btn { padding: 5px 12px; border: 1px solid #b9c2cc; border-radius: 2px; cursor: pointer; font-size: 12px; }
.btn-primary { background: #0d5aa7; color: #fff; border-color: #0d5aa7; }
.btn-secondary { background: #fff; }
@media print {
  .doc-shell, .form-modal-overlay { display: none !important; }
  .print-area { display: block !important; border: none !important; box-shadow: none !important; width: 100% !important; max-width: 100% !important; max-height: none !important; position: static !important; }
  .print-hide { display: none !important; }
}
</style>
