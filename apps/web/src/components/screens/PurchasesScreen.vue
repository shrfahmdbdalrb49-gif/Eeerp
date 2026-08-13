<template>
  <div class="purchases-screen">
    <!-- ===== الشريط العلوي: إجراءات + فلاتر ===== -->
    <div class="screen-toolbar">
      <button class="btn btn-primary" @click="openNewInvoice">+ فاتورة شراء جديدة</button>
      <div class="toolbar-filters">
        <select class="input-field input-sm" v-model.number="filters.supplierId">
          <option :value="null">كل الموردين</option>
          <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <select class="input-field input-sm" v-model="filters.status">
          <option value="">كل الحالات</option>
          <option value="draft">مسودة</option>
          <option value="received">مستلمة</option>
          <option value="posted">مرحّلة</option>
          <option value="cancelled">ملغاة</option>
        </select>
        <input type="date" class="input-field input-sm" v-model="filters.dateFrom" />
        <input type="date" class="input-field input-sm" v-model="filters.dateTo" />
        <button class="btn btn-secondary btn-sm" @click="filters = { supplierId: null, status: '', dateFrom: '', dateTo: '', search: '' }">مسح</button>
      </div>
    </div>

    <!-- ===== بطاقات KPI ===== -->
    <div class="kpi-row">
      <div class="kpi-card kpi-total"><span class="kpi-num">{{ fmt(kpi.total) }}</span><span class="kpi-label">إجمالي المشتريات</span></div>
      <div class="kpi-card kpi-count"><span class="kpi-num">{{ kpi.count }}</span><span class="kpi-label">عدد الفواتير</span></div>
      <div class="kpi-card kpi-posted"><span class="kpi-num">{{ fmt(kpi.postedTotal) }}</span><span class="kpi-label">المُرحَّل (دائنون)</span></div>
      <div class="kpi-card kpi-draft"><span class="kpi-num">{{ kpi.draftCount }}</span><span class="kpi-label">قيد الاستلام</span></div>
    </div>

    <!-- ===== الجدول ===== -->
    <div class="table-container table-scroll">
      <table class="dense-table">
        <thead>
          <tr>
            <th style="width:60px">رقم الفاتورة</th><th style="width:90px">التاريخ</th><th>المورد</th><th style="width:60px">البنود</th>
            <th style="width:65px">الكمية</th><th style="width:100px">الإجمالي</th><th style="width:80px">الدفع</th>
            <th style="width:85px">الحالة</th><th style="width:130px">الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="inv in visibleInvoices" :key="inv.id">
            <td class="mono">{{ inv.invoice_no }}</td>
            <td>{{ inv.date }}</td>
            <td style="font-weight:bold">{{ supplierName(inv.supplierId) }}</td>
            <td class="num">{{ inv.linesCount }}</td>
            <td class="num">{{ fmt(inv.totalQty) }}</td>
            <td class="num"><b>{{ fmt(inv.total) }}</b></td>
            <td><span :class="'pay-chip ' + inv.paymentType">{{ payLabel(inv.paymentType) }}</span></td>
            <td><span :class="'status-badge ' + inv.status">{{ statusLabel(inv.status) }}</span></td>
            <td class="row-actions">
              <button class="act-btn act-view" title="عرض الفاتورة" @click="viewInvoice(inv)">👁</button>
              <button v-if="inv.status === 'draft'" class="act-btn act-receive" title="استلام المخزون" @click="receiveInvoice(inv)">📥</button>
              <button v-if="inv.status === 'received'" class="act-btn act-post" title="ترحيل محاسبي" @click="postInvoice(inv)">📒</button>
              <button v-if="inv.status === 'received'" class="act-btn act-unreceive" title="إلغاء الاستلام" @click="unreceiveInvoice(inv)">↩️</button>
              <button v-if="inv.status === 'posted'" class="act-btn act-print" title="طباعة" @click="viewInvoice(inv, true)">🖨</button>
              <button v-if="!['cancelled', 'posted'].includes(inv.status) && canCancel(inv)" class="act-btn act-cancel" title="إلغاء الفاتورة" @click="deleteInvoice(inv)">✕</button>
            </td>
          </tr>
          <tr v-if="visibleInvoices.length === 0">
            <td colspan="9" class="empty-state">لا توجد فواتير شراء{{ filters.status || filters.supplierId != null || filters.dateFrom ? ' مطابقة للفلاتر' : '' }} — أنشئ فاتورة لتزيد المخزون فعليًا</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ===== نافذة الفاتورة متعددة البنود ===== -->
    <div v-if="showForm" class="form-modal-overlay" @click.self="closeForm">
      <div class="form-modal wide">
        <div class="modal-title">
          <span>فاتورة شراء جديدة — بنود متعددة</span>
          <button class="close-btn" @click="closeForm">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="field-row">
              <label>المورد</label>
              <select class="input-field" v-model.number="form.supplierId">
                <option :value="null" disabled>اختر موردًا</option>
                <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>
            <div class="field-row">
              <label>التاريخ</label>
              <input type="date" class="input-field" v-model="form.date" />
            </div>
            <div class="field-row">
              <label>طريقة الدفع</label>
              <select class="input-field" v-model="form.paymentType">
                <option value="credit">آجل (ذمم دائنة)</option>
                <option value="cash">نقدي (الصندوق)</option>
                <option value="bank">تحويل بنكي</option>
              </select>
            </div>
            <div class="field-row">
              <label>ملاحظات</label>
              <input type="text" class="input-field" v-model="form.notes" placeholder="اختياري" />
            </div>
          </div>

          <div class="lines-header">
            <span>البنود</span>
            <button class="btn btn-secondary btn-sm" type="button" @click="addLine">+ إضافة صنف</button>
          </div>
          <div class="lines-scroll">
            <table class="lines-table">
              <thead><tr>
                <th style="width:40px">#</th><th>الصنف</th><th style="width:85px">الكمية</th>
                <th style="width:115px">التكلفة للوحدة</th><th style="width:115px">انتهاء الصلاحية</th>
                <th style="width:105px">الإجمالي</th><th style="width:40px"></th>
              </tr></thead>
              <tbody>
                <tr v-for="(l, i) in form.lines" :key="i">
                  <td class="num">{{ i + 1 }}</td>
                  <td>
                    <select class="input-field" v-model.number="l.itemId">
                      <option :value="null" disabled>اختر صنفًا</option>
                      <option v-for="it in items" :key="it.id" :value="it.id">{{ it.code }} — {{ it.name }}</option>
                    </select>
                  </td>
                  <td><input type="number" class="input-field" v-model.number="l.qty" min="1" /></td>
                  <td><input type="number" class="input-field" v-model.number="l.cost" min="0" step="0.01" /></td>
                  <td><input type="date" class="input-field" v-model="l.expDate" /></td>
                  <td class="num">{{ fmt((l.qty || 0) * (l.cost || 0)) }}</td>
                  <td><button class="delete-btn" type="button" @click="removeLine(i)" :disabled="form.lines.length <= 1">✕</button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="form-total">إجمالي الفاتورة: <b>{{ fmt(formTotal) }}</b> ({{ form.lines.reduce((s, l) => s + (l.qty || 0), 0) }} وحدة)</div>
        </div>
        <div class="form-actions">
          <span v-if="formError" class="form-error">{{ formError }}</span>
          <button class="btn btn-primary" @click="saveInvoice" :disabled="saving">{{ saving ? 'جارٍ...' : 'حفظ كمسودة (استلام لاحقًا)' }}</button>
          <button class="btn btn-success" @click="saveInvoiceAndReceive" :disabled="saving">{{ saving ? 'جارٍ...' : 'استلام وترحيل' }}</button>
          <button class="btn btn-secondary" @click="closeForm">إلغاء</button>
        </div>
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
            <thead><tr><th>#</th><th>الصنف</th><th style="width:70px">الكمية</th><th style="width:100px">التكلفة</th><th style="width:100px">الإجمالي</th><th style="width:110px">انتهاء الصلاحية</th></tr></thead>
            <tbody>
              <tr v-for="(l, i) in viewedLines" :key="l.id || i">
                <td class="num">{{ i + 1 }}</td><td>{{ viewedItems[l.itemId]?.name || l.item_name || '—' }}</td>
                <td class="num">{{ l.qty }}</td><td class="num">{{ fmt(l.unit_cost) }}</td>
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
import { ref, computed, onMounted } from 'vue'
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
const stockMap = ref({})
const filters = ref({ supplierId: null, status: '', dateFrom: '', dateTo: '' })
const showForm = ref(false)
const saving = ref(false)
const formError = ref('')
const showView = ref(false)
const printOnly = ref(false)
const viewed = ref(null)
const viewedLines = ref([])

const form = ref({ supplierId: null, date: new Date().toISOString().slice(0, 10), paymentType: 'credit', notes: '', lines: [{ itemId: null, qty: 1, cost: 0, expDate: '' }] })

function isServer() { return getStorageMode() === 'server' }
function supplierName(id) { return suppliers.value.find(s => s.id === id)?.name || '—' }
function payLabel(t) { return { cash: 'نقدي', bank: 'بنكي', credit: 'آجل' }[t] || t }
function statusLabel(s) { return { draft: 'مسودة', received: 'مستلمة', posted: 'مرحّلة', cancelled: 'ملغاة' }[s] || s }

const formTotal = computed(() => form.value.lines.reduce((s, l) => s + (l.qty || 0) * (l.cost || 0), 0))
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
  return [...invoices.value].filter(inv => {
    if (f.status && inv.status !== f.status) return false
    if (f.supplierId != null && inv.supplierId !== f.supplierId) return false
    if (f.dateFrom && inv.date < f.dateFrom) return false
    if (f.dateTo && inv.date > f.dateTo) return false
    return true
  }).sort((a, b) => b.id - a.id)
})

async function loadData() {
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
          totalQty: ils.reduce((s, l) => s + (l.qty || 0), 0),
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
      paymentType: inv.paymentType, invoice_no: `P-${inv.id}`,
      linesCount: ils.length,
      totalQty: ils.reduce((s, l) => s + (l.qty || 0), 0),
      total: ils.reduce((s, l) => s + (l.qty || 0) * (l.cost || 0), 0),
    }
  })
}

function addLine() { form.value.lines.push({ itemId: null, qty: 1, cost: 0, expDate: '' }) }
function removeLine(i) { if (form.value.lines.length > 1) form.value.lines.splice(i, 1) }

function openNewInvoice() {
  formError.value = ''
  form.value = { supplierId: null, date: new Date().toISOString().slice(0, 10), paymentType: 'credit', notes: '', lines: [{ itemId: null, qty: 1, cost: 0, expDate: '' }] }
  showForm.value = true
  showView.value = false
}
function closeForm() { if (!saving.value) { showForm.value = false; showView.value = false } }

function buildPayload(withReceive) {
  const f = form.value
  if (!f.supplierId) throw new Error('اختر موردًا')
  const lines = f.lines.filter(l => l.itemId && l.qty && l.qty > 0)
  if (lines.length === 0) throw new Error('أضف صنفًا واحدًا على الأقل بكمية صحيحة')
  for (const l of lines) { if (!l.cost || l.cost <= 0) throw new Error('التكلفة غير صحيحة في أحد البنود: ' + supplierName(f.supplierId)) }
  return { supplierId: f.supplierId, date: f.date, paymentType: f.paymentType, notes: f.notes, lines: lines.map(l => ({ itemId: l.itemId, qty: l.qty, cost: l.cost, expDate: l.expDate || null })) }
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
      showForm.value = false
      await loadData()
      return
    }
    // وضع محلي: حفظ مسودة (الترحيل المباشر غير مدعوم محليًا لتبسيطه)
    const total = payload.lines.reduce((s, l) => s + l.qty * l.cost, 0)
    const invId = await db.purchaseInvoices.add({
      supplierId: payload.supplierId, date: payload.date, storeId: 1, paymentType: payload.paymentType,
      notes: payload.notes, status: 'posted', total, createdAt: Date.now(),
    })
    for (const l of payload.lines) {
      const batchId = await addBatch({
        itemId: l.itemId, storeId: 1, batchNo: `LOT-${invId}-${l.itemId}`,
        mfgDate: null, expDate: l.expDate || null, qty: l.qty, cost: l.cost,
        sourceKind: 'purchase', sourceId: invId,
      })
      await db.purchaseLines.add({ invoiceId: invId, itemId: l.itemId, batchId, qty: l.qty, cost: l.cost, expDate: l.expDate || null })
    }
    await postPurchaseJournal({ purchaseId: invId, total, paymentType: payload.paymentType })
    showForm.value = false
    await loadData()
  } catch (e) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}
async function saveInvoiceAndReceive() { await saveInvoice(true) }

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
    await serverCancelPurchase(inv.id)
    await loadData()
  } catch (e) {
    formError.value = e.message
  }
}

async function receiveInvoice(inv) {
  if (!confirm(`استلام فاتورة الشراء ${inv.invoice_no}؟ سيزيد المخزون فعليًا.`)) return
  try {
    await requirePermission('purchases', 'استلام فاتورة شراء')
    if (isServer()) {
      await serverReceivePurchase(inv.id)
      await loadData()
      return
    }
    // محلي: الاستلام الفوري
    const lines = await db.purchaseLines.where('invoiceId').equals(inv.id).toArray()
    for (const l of lines) {
      await addBatch({ itemId: l.itemId, storeId: 1, batchNo: `LOT-${inv.id}-${l.itemId}`, mfgDate: null, expDate: l.expDate || null, qty: l.qty, cost: l.cost, sourceKind: 'purchase', sourceId: inv.id })
    }
    await db.purchaseInvoices.update(inv.id, { status: 'received' })
    await loadData()
  } catch (e) {
    formError.value = e.message
  }
}

async function postInvoice(inv) {
  if (!confirm(`ترحيل فاتورة الشراء ${inv.invoice_no} محاسبيًا؟ ستنشأ قيد مزدوج (مخزون مدين / ذمم دائنة دائن).`)) return
  try {
    await requirePermission('purchases', 'ترحيل فاتورة شراء')
    if (isServer()) {
      await serverPostPurchaseInvoice(inv.id)
      await loadData()
      return
    }
    const lines = await db.purchaseLines.where('invoiceId').equals(inv.id).toArray()
    const total = lines.reduce((s, l) => s + l.qty * l.cost, 0)
    await postPurchaseJournal({ purchaseId: inv.id, total, paymentType: inv.paymentType })
    await db.purchaseInvoices.update(inv.id, { status: 'posted' })
    await loadData()
  } catch (e) {
    formError.value = e.message
  }
}

async function unreceiveInvoice(inv) {
  if (!confirm(`إلغاء استلام فاتورة ${inv.invoice_no}؟ سيُخصم المخزون المستلم.`)) return
  try {
    await requirePermission('purchases', 'إلغاء استلام فاتورة')
    if (isServer()) {
      await serverUnreceivePurchase(inv.id)
      await loadData()
      return
    }
    await db.stockMovements.where('refKind').equals('purchase').and(m => m.refId === inv.id).delete()
    await db.purchaseInvoices.update(inv.id, { status: 'draft' })
    await loadData()
  } catch (e) {
    formError.value = e.message
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
      formError.value = 'فشل تحميل الفاتورة: ' + (e.message || e)
      return
    }
  } else {
    viewed.value = inv
    viewedLines.value = await db.purchaseLines.where('invoiceId').equals(inv.id).toArray()
  }
  showView.value = true
  showForm.value = false
}

function doPrint() { window.print() }

onMounted(loadData)
</script>

<style scoped>
.purchases-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.screen-toolbar { display: flex; gap: 6px; padding: 6px; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: 2px; margin-bottom: 6px; align-items: center; flex-wrap: wrap; flex-shrink: 0; }
.toolbar-filters { display: flex; gap: 5px; align-items: center; flex-wrap: wrap; flex: 1; justify-content: flex-end; }
.toolbar-info { font-size: 12px; color: var(--color-text-secondary); }
.table-scroll { flex: 1; overflow: auto; background: var(--color-bg-primary); min-height: 0; }
.empty-state { text-align: center; color: var(--color-text-secondary); padding: 18px; }
.num { text-align: left; direction: ltr; }
.mono { font-family: monospace; font-size: 12px; }
.pay-chip { padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: bold; }
.pay-chip.credit { background: #fff4e0; color: #e65100; }
.pay-chip.cash { background: #e6f4ea; color: #1b5e20; }
.pay-chip.bank { background: #e3f0ff; color: #0d5aa7; }
.status-badge { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold; white-space: nowrap; }
.status-badge.draft { background: #f3f4f6; color: #4b5563; border: 1px solid #d1d5db; }
.status-badge.received { background: #e3f0ff; color: #0d5aa7; border: 1px solid #9ec2ef; }
.status-badge.posted { background: #e6f4ea; color: #1b5e20; border: 1px solid #a5d6b0; }
.status-badge.cancelled { background: #fdeaea; color: #b71c1c; border: 1px solid #f0bcbc; }
.kpi-row { display: flex; gap: 6px; margin-bottom: 6px; flex-shrink: 0; flex-wrap: wrap; }
.kpi-card { flex: 1; min-width: 110px; background: var(--color-bg-primary); border: 1px solid var(--color-border); border-radius: 3px; padding: 8px 10px; text-align: center; }
.kpi-num { display: block; font-size: 17px; font-weight: bold; }
.kpi-label { display: block; font-size: 11px; color: var(--color-text-secondary); margin-top: 2px; }
.row-actions { display: flex; gap: 3px; }
.act-btn { width: 26px; height: 26px; border: 1px solid var(--color-border); border-radius: 3px; background: #fff; cursor: pointer; font-size: 13px; }
.act-btn:hover { background: var(--color-bg-secondary); }
.act-receive { border-color: #9ec2ef; color: #0d5aa7; }
.act-post { border-color: #a5d6b0; color: #1b5e20; }
.act-unreceive { border-color: #d1d5db; color: #4b5563; }
.act-print { border-color: #b39ddb; color: #5e35b1; }
.act-cancel { border-color: #f0bcbc; color: #b71c1c; background: #fdf2f2; }
.btn { padding: 6px 14px; border: none; border-radius: 3px; cursor: pointer; font-weight: bold; font-size: 13px; }
.btn-sm { padding: 4px 10px; font-size: 12px; }
.btn-primary { background: var(--color-primary); color: #fff; }
.btn-secondary { background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border); }
.btn-success { background: #1b5e20; color: #fff; }
.delete-btn { background: #fdeaea; color: #b71c1c; border: 1px solid #f0bcbc; border-radius: 3px; width: 24px; height: 26px; cursor: pointer; }
.delete-btn:disabled { opacity: 0.4; cursor: default; }
.form-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 12px; }
.form-modal { background: var(--color-bg-primary); border: 2px solid var(--color-primary); border-radius: 4px; width: 560px; max-width: 96vw; box-shadow: 4px 4px 16px rgba(0,0,0,0.3); max-height: 92vh; overflow: auto; }
.form-modal.wide { width: 760px; }
.modal-title { display: flex; justify-content: space-between; align-items: center; background: var(--color-primary); color: #fff; font-weight: bold; padding: 6px 12px; }
.close-btn { background: transparent; border: none; color: #fff; cursor: pointer; }
.modal-body { padding: 12px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.field-row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.field-row label { width: 100px; font-size: 13px; flex-shrink: 0; color: var(--color-text-secondary); }
.input-field { padding: 6px 8px; border: 1px solid var(--color-border); border-radius: 3px; font-size: 13px; background: #fff; flex: 1; }
.input-field.input-sm { padding: 4px 8px; font-size: 12px; width: auto; }
.input-field:focus { outline: none; border-color: var(--color-primary); }
.lines-header { display: flex; justify-content: space-between; align-items: center; margin: 10px 0 4px; font-weight: bold; }
.lines-scroll { max-height: 260px; overflow: auto; }
.lines-table { width: 100%; border-collapse: collapse; }
.lines-table th, .lines-table td { border: 1px solid var(--color-border); padding: 4px 6px; font-size: 13px; text-align: right; }
.lines-table th { background: var(--color-bg-secondary); position: sticky; top: 0; }
.form-total { background: #f2f6fb; border: 1px dashed var(--color-primary); border-radius: 4px; padding: 8px 10px; margin-top: 6px; font-size: 14px; }
.form-actions { display: flex; gap: 8px; justify-content: flex-end; align-items: center; padding: 8px 12px; background: var(--color-bg-secondary); border-top: 1px solid var(--color-border); }
.form-error { color: #b71c1c; font-size: 12px; flex: 1; }
.invoice-head { display: flex; justify-content: space-between; gap: 12px; border-bottom: 2px solid var(--color-primary); padding-bottom: 8px; margin-bottom: 8px; }
.inv-co-sub { font-size: 11px; color: var(--color-text-secondary); }
.inv-meta div { font-size: 13px; margin: 2px 0; }
.view-lines { margin-top: 4px; }
.invoice-total { text-align: left; direction: ltr; margin-top: 8px; font-size: 15px; }
.invoice-view b { font-weight: bold; }
@media print {
  .screen-toolbar, .kpi-row, .table-container, .form-modal-overlay { display: none !important; }
  .print-area { display: block !important; border: none !important; box-shadow: none !important; width: 100% !important; max-width: 100% !important; max-height: none !important; position: static !important; }
  .print-hide { display: none !important; }
}
@media (max-width: 768px) {
  .form-grid { grid-template-columns: 1fr; }
  .screen-toolbar { flex-direction: column; align-items: stretch; }
  .toolbar-filters { justify-content: flex-start; }
  .table-container { overflow-x: auto; }
  .kpi-row { flex-wrap: wrap; }
}
</style>
