<template>
  <!--
    شاشة فواتير المبيعات — تصميم ERP مكتبي كلاسيكي
    التركيب: شريط أدوات (F) → رأس المستند → جدول البنود (إدخال مباشر داخل الجدول)
    → الإجماليات → شريط أوامر
  -->
  <div class="sales-screen" tabindex="0">
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
        <span class="toolbar-spacer"></span>
        <span class="toolbar-subtitle">عدد الفواتير: <b>{{ invoices.length }}</b> — إجمالي المبيعات: <b>{{ fmt(totalSales) }}</b></span>
      </div>

      <!-- ===== رأس المستند (بيانات + فلترة) ===== -->
      <div class="doc-header">
        <div class="field-group">
          <span class="field-group-title">بيانات المستند</span>
          <div class="field">
            <label>رقم</label>
            <input type="text" class="input-field" value="جديدة" readonly />
          </div>
          <div class="field">
            <label>الفرع</label>
            <input type="text" class="input-field" value="الفرع الرئيسي" readonly />
          </div>
          <div class="field">
            <label>المخزن</label>
            <input type="text" class="input-field" value="المخزن الرئيسي" readonly />
          </div>
        </div>
        <div class="field-group">
          <span class="field-group-title">البحث</span>
          <div class="field">
            <label>العميل</label>
            <select class="input-field" v-model.number="filters.customerId">
              <option :value="null">كل العملاء</option>
              <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="field">
            <label>الدفع</label>
            <select class="input-field" v-model="filters.paymentType">
              <option value="">الكل</option>
              <option value="cash">نقدي</option>
              <option value="bank">بنكي</option>
              <option value="credit">آجل</option>
            </select>
          </div>
          <div class="field">
            <label>بحث</label>
            <input type="text" class="input-field" v-model="searchText" placeholder="رقم أو اسم..." />
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
              <th style="width:56px">البنود</th><th style="width:88px">الإجمالي</th>
              <th style="width:64px">الدفع</th><th style="width:60px">بواسطة</th><th style="width:60px">إجراء</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(inv, idx) in visibleInvoices" :key="inv.id" @click="selectedRow = inv.id">
              <td class="row-num">{{ idx + 1 }}</td>
              <td class="mono">{{ inv.invoice_no }}</td>
              <td>{{ inv.date }}</td>
              <td style="font-weight:bold">{{ inv.customerName || 'نقدي' }}</td>
              <td class="num-cell">{{ inv.linesCount }} بند</td>
              <td class="num-cell"><b>{{ fmt(inv.total) }}</b></td>
              <td>{{ payLabel(inv.paymentType) }}</td>
              <td>{{ inv.createdByName || '—' }}</td>
              <td class="row-actions">
                <button class="act-btn" title="عرض" @click="viewInvoice(inv)">عرض</button>
                <button class="act-btn" title="طباعة (F7)" @click="printInvoice(inv)">طباعة</button>
                <button v-if="inv.status === 'posted'" class="act-btn act-cancel" title="إلغاء" @click="cancelInvoice(inv)">إلغاء</button>
              </td>
            </tr>
            <tr v-if="visibleInvoices.length === 0">
              <td colspan="9" class="empty-row">لا توجد فواتير بيع بعد — اضغط F2 لإنشاء فاتورة جديدة (خصم FEFO فعلي + قيد مزدوج)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ===== شريط الأوامر ===== -->
      <div class="doc-commandbar">
        <span v-if="formError" class="cmd-error">{{ formError }}</span>
        <span v-else class="cmd-hint">F2 جديد · F3 بحث · F7 طباعة · Esc إغلاق</span>
      </div>
    </div>

    <!-- =============================================================
         نافذة فاتورة المبيعات — إدخال البنود مباشرة داخل الجدول
         ============================================================= -->
    <div v-if="editing" class="doc-shell edit-shell">
      <div class="doc-toolbar">
        <button class="tool-f primary" title="ترحيل الفاتورة (F8)" @click="save">
          <span class="fkey">F8</span> ترحيل
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
          <span class="field-group-title">العميل والدفع</span>
          <div class="field">
            <label>العميل</label>
            <select class="input-field" v-model.number="form.customerId">
              <option :value="null">عميل نقدي (بدون ذمم)</option>
              <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
            <button class="field-btn" title="بحث عن عميل" @click="focusCustomer">…</button>
          </div>
          <div class="field">
            <label>المخزن</label>
            <input type="text" class="input-field" value="المخزن الرئيسي" readonly />
          </div>
          <div class="field">
            <label>طريقة الدفع</label>
            <select class="input-field" v-model="form.paymentType">
              <option value="cash">نقدي</option>
              <option value="bank">تحويل بنكي</option>
              <option value="credit">آجل</option>
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
            <input type="text" class="input-field" v-model="form.notes" placeholder="ملاحظات / رقم مرجعي" />
          </div>
        </div>
      </div>

      <!-- ===== جدول البنود — إدخال مباشر داخل الجدول ===== -->
      <div class="doc-details">
        <table class="classic-grid lines-grid">
          <thead>
            <tr>
              <th class="row-num">#</th>
              <th style="width:60px">كود</th><th style="width:72px">الباركود</th><th style="width:200px">اسم الصنف</th>
              <th style="width:42px">الوحدة</th><th style="width:52px">الكمية</th>
              <th style="width:68px">السعر</th><th style="width:52px">الخصم</th><th style="width:52px">الضريبة</th>
              <th style="width:72px">الإجمالي</th><th style="width:70px">التشغيلة</th><th style="width:70px">الصلاحية</th>
              <th style="width:70px">المخزن</th><th style="width:28px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(l, i) in form.lines" :key="i">
              <td class="row-num">{{ i + 1 }}</td>
              <td class="num-cell">{{ itemOf(l.itemId)?.code || '' }}</td>
              <td class="num-cell">{{ itemOf(l.itemId)?.barcode || '' }}</td>
              <td>
                <select class="input-field" v-model.number="l.itemId" @change="onItemSelect(i)">
                  <option :value="null" disabled>— اختر الصنف —</option>
                  <option v-for="it in stockItems" :key="it.id" :value="it.id">{{ it.name }} (متاح: {{ it._stock }})</option>
                </select>
              </td>
              <td>{{ unitLabel(itemOf(l.itemId)?.unit) }}</td>
              <td class="num-cell"><input type="number" class="input-field" v-model.number="l.qty" min="1" /></td>
              <td class="num-cell"><input type="number" class="input-field" v-model.number="l.price" min="0" step="0.01" /></td>
              <td class="num-cell"><input type="number" class="input-field" v-model.number="l.discount" min="0" step="0.01" /></td>
              <td class="num-cell"><input type="number" class="input-field" v-model.number="l.tax" min="0" step="0.01" /></td>
              <td class="num-cell row-total">{{ fmt(lineTotal(l)) }}</td>
              <td class="num-cell">{{ l.batchNo || '—' }}</td>
              <td>{{ l.expDate ? l.expDate.slice(0, 10) : '—' }}</td>
              <td>{{ l.storeName || 'الرئيسي' }}</td>
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
        <div class="total-cell"><span class="t-label">المصاريف:</span><span class="t-value">{{ fmt(0) }}</span></div>
        <div class="total-cell net"><span class="t-label">الصافي:</span><span class="t-value">{{ fmt(netTotal) }}</span></div>
        <div class="total-cell"><span class="t-label">المدفوع:</span><span class="t-value">{{ fmt(paidAmount) }}</span></div>
        <div class="total-cell"><span class="t-label">المتبقي:</span><span class="t-value">{{ fmt(remaining) }}</span></div>
      </div>

      <!-- ===== شريط الأوامر السفلي ===== -->
      <div class="doc-commandbar">
        <span v-if="formError" class="cmd-error">{{ formError }}</span>
        <span v-else class="cmd-hint">F8 ترحيل الفاتورة · Esc رجوع — الإجماليات تُحتسب تلقائيًا</span>
      </div>
    </div>

    <!-- ===== نافذة عرض / طباعة فاتورة البيع ===== -->
    <div v-if="showView && viewed" class="form-modal-overlay" @click.self="showView = false">
      <div class="form-modal print-area">
        <div class="modal-title print-hide">
          <span>فاتورة المبيعات {{ viewed.invoice_no }}</span>
          <button class="close-btn" @click="showView = false">✕</button>
        </div>
        <div class="modal-body invoice-view">
          <div class="invoice-head">
            <div class="inv-co"><b>صيدلية شرف</b><div class="inv-co-sub">Sharaf Pharmacy ERP</div></div>
            <div class="inv-meta">
              <div>رقم الفاتورة: <b>{{ viewed.invoice_no }}</b></div>
              <div>التاريخ: {{ viewed.date }}</div>
              <div>العميل: {{ viewed.customerName || 'نقدي (بدون عميل)' }}</div>
              <div>الدفع: {{ payLabel(viewed.paymentType) }} — الحالة: <span :class="'status-badge ' + viewed.status">{{ { posted: 'مرحَّل', draft: 'مسودة', cancelled: 'ملغاة' }[viewed.status] || viewed.status }}</span></div>
            </div>
          </div>
          <table class="lines-table view-lines">
            <thead><tr><th>#</th><th>الصنف</th><th style="width:70px">الكمية</th><th style="width:100px">السعر</th><th style="width:100px">الإجمالي</th></tr></thead>
            <tbody>
              <tr v-for="(l, i) in (viewedLinesMap[viewed.id] || [])" :key="l.id || i">
                <td class="num">{{ i + 1 }}</td><td>{{ l.item_name || itemOf(l.item_id)?.name || '—' }}</td>
                <td class="num">{{ l.qty }}</td><td class="num">{{ fmt(l.price) }}</td>
                <td class="num">{{ fmt(l.subtotal || l.qty * l.price) }}</td>
              </tr>
            </tbody>
          </table>
          <div class="invoice-total">الإجمالي: <b>{{ fmt(viewed.total) }}</b></div>
        </div>
        <div class="form-actions print-hide">
          <button class="btn btn-primary" @click="window.print()">🖨 طباعة</button>
          <button class="btn btn-secondary" @click="showView = false">إغلاق</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, inject, provide } from 'vue'
import { db, activeItems, activeCustomers, getStorageMode } from '../../db/database.js'
import { fmt, consumeStock, computeCOGS, postSaleJournal } from '../../db/engine.js'
import { requirePermission, currentSession } from '../../db/session.js'
import { serverPostSale, serverCancelSale } from '../../db/serverOps.js'
import { apiFetch } from '../../db/api.js'

function isServer() { return getStorageMode() === 'server' }

const invoices = ref([])
const customers = ref([])
const items = ref([])
const editing = ref(false)
const saving = ref(false)
const formError = ref('')
const formStatusMsg = ref('')
const formStatusClass = ref('')
const searchText = ref('')
const filters = ref({ customerId: null, paymentType: '' })
const selectedRow = ref(null)
const currentUserName = ref('—')
const form = ref({ customerId: null, date: new Date().toISOString().slice(0, 10), paymentType: 'cash', notes: '', lines: [{ itemId: null, qty: 1, price: 0, discount: 0, tax: 0, batchNo: '', expDate: '', storeName: '' }] })
const viewed = ref(null)
const viewedLinesMap = ref({})
const showView = ref(false)

const stockItems = computed(() => items.value.filter(it => it._stock > 0).sort((a, b) => a.name.localeCompare(b.name, 'ar')))
function itemOf(id) { return items.value.find(i => i.id === id) }
function unitLabel(u) { return { box: 'علبة', strip: 'شريط', tab: 'قرص', vial: 'قارورة', box_of_vials: 'علبة قوارير' }[u] || u || 'وحدة' }
function payLabel(t) { return { cash: 'نقدي', bank: 'بنكي', credit: 'آجل' }[t] || t }

const totalSales = computed(() => invoices.value.reduce((s, i) => s + (i.total || 0), 0))

function lineTotal(l) {
  const qty = Number(l.qty || 0)
  const disc = Number(l.discount || 0)
  const tax = Number(l.tax || 0)
  return Math.max(0, qty * Number(l.price || 0) - disc + tax)
}
const preDiscountTotal = computed(() => form.value.lines.reduce((s, l) => Number(l.qty || 0) * Number(l.price || 0) + s, 0))
const totalDiscount = computed(() => form.value.lines.reduce((s, l) => s + Number(l.discount || 0), 0))
const totalTax = computed(() => form.value.lines.reduce((s, l) => s + Number(l.tax || 0), 0))
const netTotal = computed(() => preDiscountTotal.value - totalDiscount.value + totalTax.value)
const paidAmount = computed(() => form.value.paymentType === 'credit' ? 0 : netTotal.value)
const remaining = computed(() => Math.max(0, netTotal.value - paidAmount.value))

const visibleInvoices = computed(() => {
  const f = filters.value
  const term = searchText.value.trim().toLowerCase()
  return [...invoices.value].filter(inv => {
    if (f.customerId != null && inv.customerId !== f.customerId) return false
    if (f.paymentType && inv.paymentType !== f.paymentType) return false
    if (term && !(inv.customerName || '').toLowerCase().includes(term) && !(inv.invoice_no || '').toLowerCase().includes(term) && !String(inv.id).includes(term)) return false
    return true
  }).sort((a, b) => b.id - a.id)
})

async function loadData() {
  if (isServer()) {
    try {
      const raw = await apiFetch('/sales')
      const users = await apiFetch('/users')
      const usersMap = Object.fromEntries((Array.isArray(users) ? users : []).map(u => [u.id, u.full_name || u.fullName]))
      invoices.value = (Array.isArray(raw) ? raw : []).map(inv => ({
        ...inv,
        invoice_no: inv.invoice_no,
        date: String(inv.invoice_date || '').slice(0, 10),
        customerId: inv.customer_id, paymentType: inv.payment_type, total: inv.total, status: inv.status,
        customerName: inv.customer_id ? (customers.value.find(c => c.id === inv.customer_id)?.name) : null,
        linesCount: 0,
        createdByName: usersMap[inv.created_by || inv.createdBy] || '—',
      }))
      const lines = await apiFetch('/sales-lines', { fallback: [] })
      for (const inv of invoices.value) inv.linesCount = (Array.isArray(lines) ? lines : []).filter(l => l.invoice_id === inv.id).length
      viewedLinesMap.value = {}
      for (const inv of invoices.value) viewedLinesMap.value[inv.id] = (Array.isArray(lines) ? lines : []).filter(l => l.invoice_id === inv.id)
      customers.value = (await apiFetch('/customers')).filter(c => c.status !== 'inactive')
      for (const inv of invoices.value)
        inv.customerName = inv.customer_id ? (customers.value.find(c => c.id === inv.customer_id)?.name) : (inv.customer_name || null)
      const b = await apiFetch('/batches')
      const stockMap = {}
      for (const x of (Array.isArray(b) ? b : [])) if (x.qty > 0) stockMap[x.item_id] = (stockMap[x.item_id] || 0) + x.qty
      const serverItems = (await apiFetch('/items')).filter(it => it.status !== 'inactive')
      items.value = serverItems.map(it => ({ ...it, _stock: stockMap[it.id] || 0 }))
      const s = await currentSession()
      currentUserName.value = s?.userName || '—'
      return
    } catch (e) { formError.value = 'فشل تحميل البيانات: ' + (e.message || e); return }
  }
  const raw = await db.salesInvoices.toArray()
  const users = await db.users.toArray()
  const usersMap = Object.fromEntries(users.map(u => [u.id, u.fullName]))
  invoices.value = raw.map(inv => ({
    ...inv,
    customerName: inv.customerId ? (customers.value.find(c => c.id === inv.customerId)?.name) : null,
    linesCount: 0,
    createdByName: usersMap[inv.createdBy] || '—',
  }))
  const lines = await db.salesLines.toArray()
  for (const inv of invoices.value) inv.linesCount = lines.filter(l => l.invoiceId === inv.id).length
  customers.value = await activeCustomers()
  const b = await db.batches.toArray()
  const stockMap = {}
  for (const x of b) if (!x.quarantined && x.qty > 0) stockMap[x.itemId] = (stockMap[x.itemId] || 0) + x.qty
  items.value = (await activeItems()).map(it => ({ ...it, _stock: stockMap[it.id] || 0 }))
  const s = await currentSession()
  currentUserName.value = s?.userName || '—'
}

function flash(msg, cls) { formStatusMsg.value = msg; formStatusClass.value = cls; setTimeout(() => { if (formStatusMsg.value === msg) formStatusMsg.value = '' }, 4000) }

function onItemSelect(i) {
  const it = itemOf(form.value.lines[i].itemId)
  if (it) form.value.lines[i].price = it.sellPrice || 0
}
function focusCustomer() { }
function applySearch() { /* مفعّل عبر v-model */ }

function openNewInvoice() {
  formError.value = ''
  flash('')
  form.value = { customerId: null, date: new Date().toISOString().slice(0, 10), paymentType: 'cash', notes: '', lines: [{ itemId: null, qty: 1, price: 0, discount: 0, tax: 0, batchNo: '', expDate: '', storeName: '' }] }
  editing.value = true
}
function closeForm() { if (!saving.value) editing.value = false }
function removeLine(i) { if (form.value.lines.length > 1) form.value.lines.splice(i, 1) }

async function save() {
  saving.value = true
  formError.value = ''
  try {
    const session = await requirePermission('sales.write', 'إنشاء فاتورة بيع')
    const f = form.value
    const lines = f.lines.filter(l => l.itemId && l.qty && l.qty > 0)
    if (lines.length === 0) throw new Error('أضف صنفًا واحدًا على الأقل بكمية صحيحة')
    for (const l of lines) {
      const it = itemOf(l.itemId)
      if (l.qty > (it?._stock || 0)) throw new Error(`المخزون المتاح للصنف "${it?.name}" أقل من المطلوب (${it?._stock || 0})`)
    }
    if (isServer()) {
      await serverPostSale({
        customerId: f.customerId, paymentType: f.paymentType, notes: f.notes || null,
        lines: lines.map(l => ({ itemId: l.itemId, qty: l.qty, price: l.price })),
      })
      const s = await currentSession()
      await db.auditLogs.add({ userId: s?.userId ?? 0, userName: s?.userName ?? 'مجهول', action: 'sale_created', refKind: 'sale', refId: null, detail: null, createdAt: Date.now() })
      editing.value = false
      flash('تم ترحيل الفاتورة بنجاح — المخزون والقيود محدثان', 'cmd-success')
      await loadData()
      return
    }
    const total = netTotal.value
    const paid = f.paymentType === 'credit' ? 0 : total
    /* ترقيم آمن لا يتكرر حتى تحت الضغط المتزامن */
    const { nextDocNo } = await import('../../db/sequences.js')
    const invoiceNo = await nextDocNo('sale', new Date(f.date).getFullYear())
    /* حد ائتماني للعميل عند البيع الآجل */
    if (f.paymentType === 'credit') {
      const customer = await db.customers.get(f.customerId)
      if (customer && (customer.creditLimit || 0) > 0) {
        const pending = await db.salesInvoices.where('customerId').equals(f.customerId).and(i => i.status !== 'cancelled').toArray()
        const owed = pending.reduce((s, i) => s + ((i.total || 0) - (i.paid || 0)), 0)
        if (owed + total > customer.creditLimit) {
          throw new Error(`تجاوز الحد الائتماني للعميل "${customer.name}" — المتبقي عليه ${fmt(owed)} + الفاتورة الجديدة ${fmt(total)} > الحد ${fmt(customer.creditLimit)}`)
        }
      }
    }
    const saleId = await db.salesInvoices.add({
      customerId: f.customerId, date: f.date, storeId: 1,
      paymentType: f.paymentType, notes: f.notes || null, total, status: 'posted', createdBy: session.userId, createdAt: Date.now(),
      invoice_no: invoiceNo,
    })
    for (const l of lines) {
      const { cogs } = await computeCOGS(l.itemId, l.qty)
      const consumed = await consumeStock(l.itemId, l.qty)
      await db.salesLines.add({
        invoiceId: saleId, itemId: l.itemId, batchIds: consumed.map(c => c.batchId),
        qty: l.qty, price: l.price, discount: l.discount, tax: l.tax, subtotal: lineTotal(l), cogs,
      })
    }
    const totalQty = lines.reduce((s, l) => s + l.qty, 0)
    const { cogs: totalCogs } = lines.length > 0 ? await computeCOGS(lines[0].itemId, totalQty) : { cogs: 0 }
    await postSaleJournal({ saleId, total, paid, customerPaid: f.paymentType, cogsAmount: totalCogs })
    const s = await currentSession()
    await db.auditLogs.add({ userId: s?.userId ?? 0, userName: s?.userName ?? 'مجهول', action: 'sale_created', refKind: 'sale', refId: saleId, detail: null, createdAt: Date.now() })
    editing.value = false
    flash('تم ترحيل الفاتورة بنجاح — المخزون والقيود محدثان', 'cmd-success')
    await loadData()
  } catch (e) {
    formError.value = e.message
    flash(e.message, 'cmd-error')
  } finally {
    saving.value = false
  }
}

function printInvoice(inv) { viewed.value = inv; showView.value = true; setTimeout(() => window.print(), 100) }
function viewInvoice(inv) { viewed.value = inv; showView.value = true }
async function cancelInvoice(inv) {
  if (!confirm(`إلغاء فاتورة البيع ${inv.invoice_no}؟ ستُعكس كل حركات المخزون والقيود.`)) return
  try {
    await requirePermission('sales.write', 'إلغاء فاتورة بيع')
    if (isServer()) {
      await serverCancelSale(inv.id)
      await loadData()
      flash('تم إلغاء الفاتورة', 'cmd-success')
      return
    }
    /* إلغاء فعلي في الوضع المحلي: عكس القيود واسترجاع المخزون (soft delete) */
    const { cancelSaleLocal } = await import('../../db/engine.js')
    await cancelSaleLocal(inv.id)
    await loadData()
    flash('تم إلغاء الفاتورة وعكس كل حركات المخزون والقيود', 'cmd-success')
  } catch (e) {
    flash(e.message, 'cmd-error')
  }
}
function focusSearch() { }
function printList() { window.print() }

/* اختصارات F-key داخل الشاشة — تعمل فقط عندما تكون النافذة نشطة */
const propsDef = defineProps({ windowId: { type: [String, Number], default: null }, active: { type: Boolean, default: false } })
const getActive = inject('docActive', () => propsDef.active)
provide('docActive', () => propsDef.active)

function handleKeydown(e) {
  if (!getActive()) return
  if (e.key === 'F2') { e.preventDefault(); openNewInvoice() }
  if (e.key === 'F7') { e.preventDefault(); printList() }
  if (e.key === 'Escape') { e.preventDefault(); if (editing.value) closeForm() }
  if (!editing.value) return
  if (e.key === 'F8') { e.preventDefault(); save() }
}

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
.sales-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; outline: none; }
.mono { font-family: monospace; font-size: 12px; }
.num { text-align: left; direction: ltr; }
.row-actions { display: flex; gap: 2px; }
.act-btn { height: 20px; padding: 0 6px; border: 1px solid #b9c2cc; border-radius: 1px; background: #fff; cursor: pointer; font-size: 11px; white-space: nowrap; }
.act-btn:hover { background: #e3ecf7; border-color: #0d5aa7; }
.delete-btn { background: #fdeaea; color: #b71c1c; border: 1px solid #f0bcbc; border-radius: 1px; width: 22px; height: 20px; cursor: pointer; font-size: 10px; }
.delete-btn:disabled { opacity: 0.4; cursor: default; }
.form-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 12px; }
.form-modal { background: #fff; border: 1px solid #98a2b3; border-radius: 1px; width: 560px; max-width: 96vw; box-shadow: 2px 2px 8px rgba(0,0,0,0.25); max-height: 92vh; overflow: auto; }
.modal-title { display: flex; justify-content: space-between; align-items: center; background: #0d5aa7; color: #fff; font-weight: bold; padding: 5px 12px; font-size: 13px; }
.close-btn { background: transparent; border: none; color: #fff; cursor: pointer; }
.modal-body { padding: 12px; }
.lines-table { width: 100%; border-collapse: collapse; }
.lines-table th, .lines-table td { border: 1px solid #c4ccd4; padding: 4px 6px; font-size: 12px; text-align: right; }
.lines-table th { background: #e4e8ee; }
.invoice-head { display: flex; justify-content: space-between; gap: 12px; border-bottom: 2px solid #0d5aa7; padding-bottom: 8px; margin-bottom: 8px; }
.inv-co-sub { font-size: 11px; color: #667085; }
.inv-meta div { font-size: 12px; margin: 2px 0; }
.invoice-total { text-align: left; direction: ltr; margin-top: 8px; font-size: 14px; }
.form-actions { display: flex; gap: 8px; justify-content: flex-end; align-items: center; padding: 8px 12px; background: #f0f2f5; border-top: 1px solid #c4ccd4; }
.btn { padding: 5px 12px; border: 1px solid #b9c2cc; border-radius: 2px; cursor: pointer; font-size: 12px; }
.btn-primary { background: #0d5aa7; color: #fff; border-color: #0d5aa7; }
.btn-secondary { background: #fff; }
.status-badge { padding: 1px 6px; border-radius: 1px; font-size: 11px; font-weight: bold; border: 1px solid transparent; }
.status-badge.posted { background: #e6f4ea; color: #1b5e20; border-color: #a5d6b0; }
.status-badge.draft { background: #f3f4f6; color: #4b5563; border-color: #d1d5db; }
.status-badge.cancelled { background: #fdeaea; color: #b71c1c; border-color: #f0bcbc; }
@media print {
  .doc-shell, .form-modal-overlay { display: none !important; }
  .print-area { display: block !important; border: none !important; box-shadow: none !important; width: 100% !important; max-width: 100% !important; max-height: none !important; position: static !important; }
  .print-hide { display: none !important; }
}
</style>
