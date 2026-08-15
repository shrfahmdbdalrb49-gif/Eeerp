<template>
  <!--
    شاشة فواتير المبيعات — نمط bolt.host (بطاقات بيضاء على خلفية رمادية فاتحة)
    مع الحفاظ الكامل على المنطق: ترقيم S-26-****، خصم FEFO، قيد مزدوج، حد ائتماني
  -->
  <div class="sales-screen" tabindex="-1" @keydown="handleKeydown">
    <!-- ==========================================================
         قائمة فواتير المبيعات
         ========================================================== -->
    <template v-if="!editing">
      <div class="page-screen">
        <div class="page-header">
          <div class="page-title">
            <h1>فواتير المبيعات</h1>
            <p class="page-subtitle">إدارة فواتير البيع وحركة المخزون والذمم — العدد: {{ invoices.length }} · الإجمالي: {{ fmt(totalSales) }}</p>
          </div>
          <button class="btn btn-primary btn-lg" @click="openNewInvoice">
            <span>جديد</span><span class="btn-icon">+</span>
          </button>
        </div>

        <div class="filter-row">
          <div class="filter-chip active" @click="filters.customerId = null">
            <span>الكل</span>
            <span class="chip-count">{{ invoices.length }}</span>
          </div>
          <div v-for="c in filtersCustomers" :key="c.id"
               class="filter-chip" :class="{ active: filters.customerId === c.id }"
               @click="filters.customerId = filters.customerId === c.id ? null : c.id">
            <span>{{ c.name }}</span>
            <span class="chip-count">{{ invoices.filter(i => i.customerId === c.id).length }}</span>
          </div>
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input v-model="searchText" class="search-input" placeholder="ابحث باسم العميل أو رقم الفاتورة..." @keydown.enter="applySearch" />
            <button class="search-go" @click="applySearch">انتقال</button>
          </div>
        </div>

        <div class="table-card">
          <table class="bolt-table">
            <thead>
              <tr>
                <th style="width:110px">رقم الفاتورة</th>
                <th style="width:100px">التاريخ</th>
                <th>العميل</th>
                <th style="width:110px">البنود</th>
                <th style="width:90px">نوع الدفع</th>
                <th style="width:80px; text-align:left">الإجمالي</th>
                <th style="width:90px">الحالة</th>
                <th style="width:100px">المستخدم</th>
                <th style="width:150px">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="inv in visibleInvoices" :key="inv.id"
                  :class="{ selected: selectedRow === inv.id }"
                  @click="selectedRow = inv.id">
                <td><span class="link-cell">{{ inv.invoice_no }}</span></td>
                <td>{{ inv.date }}</td>
                <td>{{ inv.customerName || 'نقدي' }}</td>
                <td>{{ inv.linesCount }} بند</td>
                <td>{{ payLabel(inv.paymentType) }}</td>
                <td class="num-cell"><b>{{ fmt(inv.total || 0) }}</b></td>
                <td>
                  <span class="status-dot" :class="inv.status || 'posted'"></span>
                  <span class="status-name" :class="inv.status || 'posted'">{{ statusName(inv.status) }}</span>
                </td>
                <td>{{ inv.createdByName || '—' }}</td>
                <td class="action-cells">
                  <button class="act" title="عرض" @click.stop="viewInvoice(inv)">👁</button>
                  <button class="act" title="طباعة" @click.stop="printInvoice(inv)">🖨</button>
                  <button v-if="(inv.status || 'posted') === 'posted'" class="act danger" title="إلغاء (عكس المخزون والقيود)" @click.stop="cancelInvoice(inv)">✕</button>
                </td>
              </tr>
              <tr v-if="visibleInvoices.length === 0">
                <td colspan="9" class="empty-row">
                  <div class="empty-box">
                    <span class="empty-icon">📦</span>
                    <p class="empty-title">لا توجد فواتير مبيعات بعد</p>
                    <p class="empty-hint">اضغط زر «جديد» لإنشاء أول فاتورة بيع — الترحيل يخصم المخزون FEFO ويقيّد القيد المزدوج</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ==========================================================
         نموذج الفاتورة الجديدة
         ========================================================== -->
    <template v-else>
      <div class="form-screen">
        <!-- بطاقة الرأس -->
        <div class="form-header-card">
          <div class="form-card-title">
            <span>فاتورة مبيعات جديدة</span>
            <button class="close-btn" @click="closeForm">✕</button>
          </div>
          <div class="form-fields">
            <div class="field-card">
              <label>رقم الفاتورة</label>
              <input class="fi" :value="'S-' + new Date(form.date).getFullYear().toString().slice(-2) + '-****'" readonly />
            </div>
            <div class="field-card">
              <label>التاريخ</label>
              <input type="date" class="fi" v-model="form.date" />
            </div>
            <div class="field-card" style="flex:1.2">
              <label>العميل *</label>
              <select class="fi" v-model.number="form.customerId" @change="focusCustomer">
                <option :value="null">عميل نقدي (بدون ذمم)</option>
                <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div class="field-card">
              <label>طريقة الدفع</label>
              <div class="toggle-group">
                <button type="button" class="toggle" :class="{ on: form.paymentType === 'cash' }" @click="form.paymentType = 'cash'">نقدي</button>
                <button type="button" class="toggle" :class="{ on: form.paymentType === 'bank' }" @click="form.paymentType = 'bank'">بنكي</button>
                <button type="button" class="toggle" :class="{ on: form.paymentType === 'credit' }" @click="form.paymentType = 'credit'">آجل</button>
              </div>
            </div>
          </div>
          <div class="barcode-strip">
            <div class="field-card" style="flex:1.4; margin:0">
              <label>البحث السريع عن صنف</label>
              <input class="fi" v-model="quickItem" placeholder="ابدأ بالكتابة لإضافة صنف..." list="quick-items" @keydown.enter="addQuickItem" />
              <datalist id="quick-items">
                <option v-for="it in stockItems" :key="it.id" :value="it.name"></option>
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
                <th style="width:26%">الصنف</th>
                <th style="width:12%">الكمية</th>
                <th style="width:13%">سعر البيع</th>
                <th style="width:10%">خصم</th>
                <th style="width:10%">ضريبة</th>
                <th style="width:11%; text-align:left">الإجمالي</th>
                <th style="width:10%">متاح</th>
                <th style="width:42px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(l, i) in form.lines" :key="i">
                <td>
                  <select class="li" v-model.number="l.itemId" @change="onItemSelect(i)">
                    <option :value="null" disabled>— اختر صنف —</option>
                    <option v-for="it in stockItems" :key="it.id" :value="it.id">{{ it.name }} (متاح: {{ it._stock }})</option>
                  </select>
                </td>
                <td><input type="number" min="1" step="1" class="li" v-model.number="l.qty" /></td>
                <td><input type="number" min="0" step="0.01" class="li" v-model.number="l.price" /></td>
                <td><input type="number" min="0" step="0.01" class="li" v-model.number="l.discount" /></td>
                <td><input type="number" min="0" step="0.01" class="li" v-model.number="l.tax" /></td>
                <td class="num-cell row-total">{{ fmt(lineTotal(l)) }}</td>
                <td>
                  <span v-if="itemOf(l.itemId) && l.qty > itemOf(l.itemId)._stock" class="stock-low" :title="'المتاح: ' + itemOf(l.itemId)._stock">
                    {{ itemOf(l.itemId)._stock }} ⚠
                  </span>
                  <span v-else class="stock-ok">{{ itemOf(l.itemId)?._stock ?? '—' }}</span>
                </td>
                <td><button class="delete-btn" @click="removeLine(i)" :disabled="form.lines.length <= 1" title="حذف البند">🗑</button></td>
              </tr>
            </tbody>
          </table>
          <div v-else class="lines-empty">
            <span class="empty-icon">📦</span>
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
            <div class="total-row" v-if="form.paymentType === 'credit'"><span>المتبقي (ذمم العميل)</span><span class="t-num remaining">{{ fmt(remaining) }} <span class="cur">ري</span></span></div>
          </div>
          <div class="notes-card">
            <label>ملاحظات إضافية</label>
            <textarea class="notes-area" v-model="form.notes" placeholder="ملاحظات على الفاتورة..."></textarea>
          </div>
        </div>

        <div v-if="formError" class="form-msg form-msg-error">{{ formError }}</div>
        <div v-if="formStatusMsg" class="form-msg" :class="formStatusClass === 'cmd-error' ? 'form-msg-error' : 'form-msg-ok'">{{ formStatusMsg }}</div>

        <div class="form-actions-row">
          <button class="btn btn-outline" @click="closeForm">✕ إلغاء</button>
          <button class="btn btn-outline" @click="saveDraft" :disabled="saving">💾 حفظ كمسودة</button>
          <button class="btn btn-primary" @click="save" :disabled="saving">
            <span v-if="saving" class="spin">⏳</span>
            <span>حفظ وترحيل</span>
          </button>
          <button class="btn btn-warning" @click="saveThenPrint" :disabled="saving">🖨 حفظ وترحيل وطباعة</button>
        </div>
      </div>
    </template>

    <!-- ==========================================================
         عرض / طباعة الفاتورة
         ========================================================== -->
    <div v-if="showView && viewed" class="form-modal-overlay" @click.self="showView = false">
      <div class="print-area">
        <div class="form-card-title print-hide">
          <span>فاتورة المبيعات {{ viewed.invoice_no }}</span>
          <button class="close-btn" @click="showView = false">✕</button>
        </div>
        <div class="invoice-head">
          <div class="inv-co">
            <div class="inv-co-name">نظام شرف — SHARAF ERP</div>
            <div class="inv-co-sub">محاسبة ومخازن ومبيعات</div>
          </div>
          <div class="inv-meta">
            <div><strong>رقم الفاتورة: {{ viewed.invoice_no }}</strong></div>
            <div>التاريخ: {{ viewed.date }}</div>
            <div>العميل: {{ viewed.customerName || 'نقدي (بدون عميل)' }}</div>
            <div>الدفع: {{ payLabel(viewed.paymentType) }} — الحالة: <span class="status-name" :class="viewed.status || 'posted'">{{ statusName(viewed.status) }}</span></div>
          </div>
        </div>
        <table class="lines-table" style="border:1px solid #e2e8f0">
          <thead><tr><th>#</th><th>الصنف</th><th style="text-align:left">الكمية</th><th style="text-align:left">السعر</th><th style="text-align:left">الإجمالي</th></tr></thead>
          <tbody>
            <tr v-for="(l, i) in (viewedLinesMap[viewed.id] || [])" :key="l.id || i">
              <td style="width:40px" class="num-cell">{{ i + 1 }}</td>
              <td>{{ l.item_name || itemOf(l.item_id)?.name || '—' }}</td>
              <td class="num-cell">{{ l.qty }}</td>
              <td class="num-cell">{{ fmt(l.price) }}</td>
              <td class="num-cell">{{ fmt(l.subtotal || l.qty * l.price) }}</td>
            </tr>
          </tbody>
        </table>
        <div class="invoice-total">
          الإجمالي: <strong>{{ fmt(viewed.total || 0) }} ري</strong>
        </div>
        <div class="print-actions print-hide">
          <button class="btn btn-primary" @click="window.print()">🖨 طباعة</button>
          <button class="btn btn-outline" @click="showView = false">إغلاق</button>
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
const quickItem = ref('')
const filters = ref({ customerId: null, paymentType: '' })
const selectedRow = ref(null)
const currentUserName = ref('—')
const form = ref({ customerId: null, date: new Date().toISOString().slice(0, 10), paymentType: 'cash', notes: '', lines: [{ itemId: null, qty: 1, price: 0, discount: 0, tax: 0 }] })
const viewed = ref(null)
const viewedLinesMap = ref({})
const showView = ref(false)

const stockItems = computed(() => items.value.filter(it => it._stock > 0).sort((a, b) => a.name.localeCompare(b.name, 'ar')))
function itemOf(id) { return items.value.find(i => i.id === id) }
function unitLabel(u) { return { box: 'علبة', strip: 'شريط', tab: 'قرص', vial: 'قارورة', box_of_vials: 'علبة قوارير' }[u] || u || 'وحدة' }
function payLabel(t) { return { cash: 'نقدي', bank: 'بنكي', credit: 'آجل' }[t] || t }
function statusName(s) { return { posted: 'مرحل', draft: 'مسودة', cancelled: 'ملغى' }[s] || 'مرحل' }

const filtersCustomers = computed(() => customers.value.slice(0, 8))
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
  quickItem.value = ''
  form.value = { customerId: null, date: new Date().toISOString().slice(0, 10), paymentType: 'cash', notes: '', lines: [{ itemId: null, qty: 1, price: 0, discount: 0, tax: 0 }] }
  editing.value = true
}
function closeForm() { if (!saving.value) editing.value = false }
function addLine() { form.value.lines.push({ itemId: null, qty: 1, price: 0, discount: 0, tax: 0 }) }
function removeLine(i) { if (form.value.lines.length > 1) form.value.lines.splice(i, 1) }

function addQuickItem() {
  const term = quickItem.value.trim()
  if (!term) return
  const found = stockItems.value.find(it => it.name.toLowerCase().includes(term.toLowerCase()))
  if (found) {
    form.value.lines.push({ itemId: found.id, qty: 1, price: found.sellPrice || 0, discount: 0, tax: 0 })
  }
  quickItem.value = ''
}

async function persist(inv, isDraft) {
  saving.value = true
  formError.value = ''
  try {
    const session = await requirePermission('sales.write', 'إنشاء فاتورة بيع')
    const f = form.value
    const lines = f.lines.filter(l => l.itemId && l.qty && l.qty > 0)
    if (lines.length === 0) throw new Error('أضف صنفًا واحدًا على الأقل بكمية صحيحة')
    if (!isDraft) {
      for (const l of lines) {
        const it = itemOf(l.itemId)
        if (l.qty > (it?._stock || 0)) throw new Error(`المخزون المتاح للصنف "${it?.name}" أقل من المطلوب (${it?._stock || 0})`)
      }
    }
    if (isServer()) {
      if (isDraft) throw new Error('وضع الخادم لا يدعم المسودات — استخدم الترحيل المباشر')
      await serverPostSale({
        customerId: f.customerId, paymentType: f.paymentType, notes: f.notes || null,
        lines: lines.map(l => ({ itemId: l.itemId, qty: l.qty, price: l.price })),
      })
      const s = await currentSession()
      await db.auditLogs.add({ userId: s?.userId ?? 0, userName: s?.userName ?? 'مجهول', action: 'sale_created', refKind: 'sale', refId: null, detail: null, createdAt: Date.now() })
      editing.value = false
      flash('تم ترحيل الفاتورة بنجاح — المخزون والقيود محدثان', 'cmd-success')
      await loadData()
      if (inv === 'print') printLast()
      return
    }
    const total = netTotal.value
    const paid = f.paymentType === 'credit' ? 0 : total
    /* ترقيم آمن لا يتكرر حتى تحت الضغط المتزامن */
    const { nextDocNo } = await import('../../db/sequences.js')
    const invoiceNo = await nextDocNo('sale', new Date(f.date).getFullYear())
    /* حد ائتماني للعميل عند البيع الآجل */
    if (!isDraft && f.paymentType === 'credit') {
      const customer = await db.customers.get(f.customerId)
      if (customer && (customer.creditLimit || 0) > 0) {
        const pending = await db.salesInvoices.where('customerId').equals(f.customerId).and(i => i.status !== 'cancelled').toArray()
        const owed = pending.reduce((s, i) => s + ((i.total || 0) - (i.paid || 0)), 0)
        if (owed + total > customer.creditLimit) {
          throw new Error(`تجاوز الحد الائتماني للعميل "${customer.name}" — المتبقي عليه ${fmt(owed)} + الفاتورة الجديدة ${fmt(total)} > الحد ${fmt(customer.creditLimit)}`)
        }
      }
    }
    const status = isDraft ? 'draft' : 'posted'
    const saleId = await db.salesInvoices.add({
      customerId: f.customerId, date: f.date, storeId: 1,
      paymentType: f.paymentType, notes: f.notes || null, total, status, createdBy: session.userId, createdAt: Date.now(),
      invoice_no: invoiceNo,
    })
    for (const l of lines) {
      let cogs = 0, consumed = []
      if (!isDraft) {
        ({ cogs } = await computeCOGS(l.itemId, l.qty))
        consumed = await consumeStock(l.itemId, l.qty, { refKind: "sale", refId: saleId })
      }
      await db.salesLines.add({
        invoiceId: saleId, itemId: l.itemId, batchIds: consumed.map(c => c.batchId),
        qty: l.qty, price: l.price, discount: l.discount, tax: l.tax, subtotal: lineTotal(l), cogs,
      })
    }
    if (!isDraft) {
      const totalQty = lines.reduce((s, l) => s + l.qty, 0)
      const { cogs: totalCogs } = lines.length > 0 ? await computeCOGS(lines[0].itemId, totalQty) : { cogs: 0 }
      await postSaleJournal({ saleId, total, paid, customerPaid: f.paymentType, cogsAmount: totalCogs })
    }
    const s = await currentSession()
    await db.auditLogs.add({ userId: s?.userId ?? 0, userName: s?.userName ?? 'مجهول', action: isDraft ? 'sale_draft_saved' : 'sale_created', refKind: 'sale', refId: saleId, detail: null, createdAt: Date.now() })
    editing.value = false
    flash(isDraft ? 'تم حفظ المسودة بنجاح' : 'تم ترحيل الفاتورة بنجاح — المخزون والقيود محدثان', 'cmd-success')
    await loadData()
    if (inv === 'print') printLast()
  } catch (e) {
    formError.value = e.message
    flash(e.message, 'cmd-error')
  } finally {
    saving.value = false
  }
}

function printLast() {
  const last = [...invoices.value].sort((a, b) => b.id - a.id)[0]
  if (last) printInvoice(last)
}

const save = () => persist(null, false)
const saveDraft = () => persist(null, true)
const saveThenPrint = () => persist('print', false)

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
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); save() }
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
/* ============================================
   نمط bolt.host — بطاقات بيضاء على خلفية رمادية فاتحة
   ============================================ */
.sales-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; outline: none; overflow: auto; }
.mono { font-family: monospace; font-size: 12px; }
.num { text-align: left; direction: ltr; }
.num-cell { text-align: left; direction: ltr; font-variant-numeric: tabular-nums; }

/* ---------- شاشة القائمة ---------- */
.page-screen { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.page-header { display: flex; align-items: center; justify-content: space-between; }
.page-title h1 { font-size: 26px; font-weight: 800; color: #0f172a; line-height: 1.2; }
.page-subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
.link-cell { color: #2563eb; font-weight: 600; cursor: pointer; text-decoration: none; }

.filter-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.filter-chip { display: flex; align-items: center; gap: 6px; height: 34px; padding: 0 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 999px; font-size: 13px; color: #475569; cursor: pointer; transition: all 0.15s; }
.filter-chip:hover { border-color: #2563eb; color: #2563eb; }
.filter-chip.active { background: #2563eb; color: #fff; border-color: #2563eb; font-weight: 600; }
.chip-count { font-size: 11px; opacity: 0.75; background: rgba(0,0,0,0.08); border-radius: 999px; padding: 0 6px; min-width: 20px; text-align: center; }
.filter-chip.active .chip-count { background: rgba(255,255,255,0.25); }

.search-box { margin-right: auto; display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; }
.search-icon { font-size: 12px; }
.search-input { border: none; outline: none; background: transparent; font-size: 13px; width: 220px; font-family: inherit; }
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
.act { height: 28px; width: 30px; border: 1px solid #e2e8f0; background: #fff; border-radius: 6px; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; justify-content: center; }
.act:hover { background: #eff6ff; border-color: #2563eb; }
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

.stock-low { color: #d97706; font-weight: 700; font-size: 12px; }
.stock-ok { color: #16a34a; font-weight: 600; font-size: 12px; }

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
.btn-warning { background: #d97706; color: #fff; }
.btn-warning:hover { background: #b45309; }
.btn-warning:disabled { opacity: 0.5; cursor: not-allowed; }
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
.status-name.posted { color: #15803d; }
.status-dot.posted { background: #16a34a; }
.status-name.draft { color: #6b7280; }
.status-dot.draft { background: #d1d5db; }
.status-name.cancelled { color: #dc2626; }
.status-dot.cancelled { background: #ef4444; }

@media print {
  .doc-shell, .form-modal-overlay { display: none !important; }
  .print-area { display: block !important; border: none !important; box-shadow: none !important; width: 100% !important; max-width: 100% !important; max-height: none !important; position: static !important; }
  .print-hide { display: none !important; }
}
</style>
