<template>
  <!-- ========== شاشة فواتير المبيعات (السجل) ========== -->
  <div class="screen-container">
    <!-- شريط الأدوات العلوي -->
    <div class="screen-toolbar">
      <div class="toolbar-right">
        <input
          type="text"
          class="input-field search-input"
          placeholder="🔍 ابحث برقم الفاتورة، المريض، الطبيب..."
          v-model="search"
        />
        <select class="input-field filter-select" v-model="statusFilter">
          <option value="all">كل الحالات</option>
          <option value="posted">مُرحَّلة</option>
          <option value="draft">مسودات</option>
          <option value="cancelled">ملغاة</option>
        </select>
        <select class="input-field filter-select" v-model="payFilter">
          <option value="all">كل طرق الدفع</option>
          <option value="cash">نقدي</option>
          <option value="credit">آجل</option>
          <option value="insurance">تأمين</option>
          <option value="card">بطاقة</option>
        </select>
        <input type="date" class="input-field date-input" v-model="dateFrom" title="من تاريخ" />
        <input type="date" class="input-field date-input" v-model="dateTo" title="إلى تاريخ" />
      </div>
      <div class="toolbar-left">
        <button class="btn btn-primary" @click="createNew">📄 فاتورة جديدة</button>
      </div>
    </div>

    <!-- جدول الفواتير -->
    <div class="table-container flex-1">
      <table class="dense-table">
        <thead>
          <tr>
            <th style="width:30px">#</th>
            <th style="width:120px">رقم الفاتورة</th>
            <th style="width:100px">التاريخ</th>
            <th>المريض / العميل</th>
            <th style="width:140px">الطبيب</th>
            <th style="width:75px">الدفع</th>
            <th style="width:80px">الحالة</th>
            <th style="width:45px">أصناف</th>
            <th style="width:90px">الإجمالي</th>
            <th style="width:90px">الصافي</th>
            <th style="width:90px">المدفوع</th>
            <th style="width:90px">المتبقي</th>
            <th style="width:150px">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(inv, i) in filteredInvoices" :key="inv.number" @dblclick="openInvoice(inv)">
            <td>{{ i + 1 }}</td>
            <td><span class="invoice-no">{{ inv.number }}</span></td>
            <td>{{ inv.date }}</td>
            <td>
              <span class="patient-name">{{ inv.patient }}</span>
              <span v-if="inv.insurance !== 'بدون تأمين'" class="insurance-tag">{{ inv.insurance }}</span>
            </td>
            <td>{{ inv.doctor || '—' }}</td>
            <td>{{ payLabel(inv.payMethod) }}</td>
            <td>
              <span class="status-badge" :class="'status-' + inv.status">
                {{ inv.status === 'posted' ? 'مُرحَّلة' : inv.status === 'draft' ? 'مسودة' : 'ملغاة' }}
              </span>
            </td>
            <td>{{ inv.itemsCount }}</td>
            <td>{{ fmt(inv.gross) }}</td>
            <td><strong>{{ fmt(inv.net) }}</strong></td>
            <td>{{ fmt(inv.paid) }}</td>
            <td :class="{ 'text-danger': inv.remaining > 0 }">{{ fmt(inv.remaining) }}</td>
            <td>
              <button class="action-btn open" @click.stop="openInvoice(inv)" title="فتح الفاتورة">📄 فتح</button>
              <button class="action-btn print" @click.stop="printInvoice(inv)" title="طباعة">🖨️</button>
              <button v-if="inv.status !== 'cancelled'" class="action-btn cancel" @click.stop="cancelInvoice(inv)" title="إلغاء">✕</button>
            </td>
          </tr>
          <tr v-if="filteredInvoices.length === 0">
            <td colspan="13" class="empty-state">
              لا توجد فواتير مطابقة للفلترة.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- شريط الإجماليات السفلي -->
    <div class="totals-bar">
      <div class="total-item">
        <span class="total-label">عدد الفواتير:</span>
        <span class="total-value">{{ filteredInvoices.length }}</span>
      </div>
      <div class="total-item">
        <span class="total-label">إجمالي المبيعات:</span>
        <span class="total-value">{{ fmt(sumNet) }}</span>
      </div>
      <div class="total-item">
        <span class="total-label">المدفوع:</span>
        <span class="total-value">{{ fmt(sumPaid) }}</span>
      </div>
      <div class="total-item">
        <span class="total-label">المتبقي:</span>
        <span class="total-value text-danger">{{ fmt(sumRemaining) }}</span>
      </div>
      <div class="total-item">
        <span class="total-label">ملغاة:</span>
        <span class="total-value">{{ filteredInvoices.filter(i => i.status === 'cancelled').length }}</span>
      </div>
    </div>

    <!-- معاينة الفاتورة المطبوعة -->
    <div v-if="printPreview" class="lookup-overlay" @mousedown.self="printPreview = null">
      <div class="print-modal">
        <div class="print-header">
          <span>معاينة الطباعة — {{ printPreview.number }}</span>
          <button class="lookup-close" @click="printPreview = null">✕</button>
        </div>
        <div class="print-body">
          <div class="print-title">شرف للصيدليات — الفرع الرئيسي (صنعاء)</div>
          <div class="print-row">
            <span><strong>رقم الفاتورة:</strong> {{ printPreview.number }}</span>
            <span><strong>التاريخ:</strong> {{ printPreview.date }}</span>
          </div>
          <div class="print-row">
            <span><strong>المريض:</strong> {{ printPreview.patient }}</span>
            <span><strong>الطبيب:</strong> {{ printPreview.doctor || '—' }}</span>
          </div>
          <div class="print-row">
            <span><strong>طريقة الدفع:</strong> {{ payLabel(printPreview.payMethod) }}</span>
            <span><strong>الحالة:</strong> {{ printPreview.status === 'posted' ? 'مُرحَّلة' : 'مسودة' }}</span>
          </div>
          <table class="dense-table print-table">
            <thead>
              <tr><th>#</th><th>الصنف</th><th>الوحدة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>
            </thead>
            <tbody>
              <tr v-for="(it, i) in printPreview.lineItems" :key="i">
                <td>{{ i + 1 }}</td><td>{{ it.name }}</td><td>{{ it.unit }}</td><td>{{ it.qty }}</td><td>{{ fmt(it.price) }}</td><td>{{ fmt(it.qty * it.price) }}</td>
              </tr>
            </tbody>
          </table>
          <div class="print-totals">
            <div class="print-row">
              <span><strong>الإجمالي:</strong> {{ fmt(printPreview.gross) }}</span>
              <span><strong>الخصم:</strong> {{ fmt(printPreview.gross - printPreview.net - (printPreview.tax || 0)) }}</span>
            </div>
            <div class="print-row">
              <span><strong>الصافي:</strong> {{ fmt(printPreview.net) }}</span>
              <span><strong>المدفوع:</strong> {{ fmt(printPreview.paid) }}</span>
              <span><strong>المتبقي:</strong> {{ fmt(printPreview.remaining) }}</span>
            </div>
          </div>
        </div>
        <div class="print-footer">
          <button class="btn btn-primary" @click="printPreview = null">✓ فهمت</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { sampleDrugs, patientsDatabase, doctorsDatabase } from '../../data/sampleData.js'

// ---- بيانات تجريبية للفواتير السابقة ----
const invoices = ref([
  {
    number: 'INV-2026-014', date: '2026-08-12', patient: 'أحمد محمد علي', patientPhone: '777123456',
    doctor: 'د. عبدالكريم الشميري', rxNo: 'RX-44201', payMethod: 'cash', branch: 'الفرع الرئيسي - صنعاء',
    insurance: 'بدون تأمين', status: 'posted', itemsCount: 3, gross: 21000, net: 18500, tax: 0, paid: 18500,
    lineItems: [
      { name: 'بنادول 500mg', unit: 'علبة', qty: 3, price: 1500 },
      { name: 'زيرتك 10mg', unit: 'علبة', qty: 1, price: 3000 },
      { name: 'أوميبرازول 20mg', unit: 'علبة', qty: 2, price: 2200 },
    ],
  },
  {
    number: 'INV-2026-013', date: '2026-08-12', patient: 'فاطمة عبدالله حسن', patientPhone: '777234567',
    doctor: 'د. سمية المقطري', rxNo: 'RX-44198', payMethod: 'insurance', branch: 'الفرع الرئيسي - صنعاء',
    insurance: 'شركة التأمين الوطنية', status: 'posted', itemsCount: 5, gross: 45000, net: 42300, tax: 0, paid: 42300,
    lineItems: [
      { name: 'أوجمنتين 625mg', unit: 'علبة', qty: 2, price: 5500 },
      { name: 'نكسيوم 40mg', unit: 'علبة', qty: 1, price: 8000 },
      { name: 'شراب برونكikum', unit: 'علبة', qty: 3, price: 4000 },
      { name: 'فيتامين D3 1000IU', unit: 'علبة', qty: 1, price: 5000 },
      { name: 'ملتي فيتامين', unit: 'علبة', qty: 2, price: 7500 },
    ],
  },
  {
    number: 'INV-2026-012', date: '2026-08-11', patient: 'علي حسين محمد', patientPhone: '777567890',
    doctor: '', rxNo: '', payMethod: 'cash', branch: 'الفرع الرئيسي - صنعاء',
    insurance: 'بدون تأمين', status: 'posted', itemsCount: 2, gross: 7800, net: 7800, tax: 0, paid: 7800,
    lineItems: [
      { name: 'بروفين 400mg', unit: 'علبة', qty: 2, price: 2000 },
      { name: 'أسبرين 100mg', unit: 'علبة', qty: 1, price: 1000 },
      { name: 'زنك 50mg', unit: 'علبة', qty: 1, price: 1500 },
      { name: 'فيتامين D3 1000IU', unit: 'علبة', qty: 1, price: 5000 },
    ],
  },
  {
    number: 'INV-2026-011', date: '2026-08-11', patient: 'خالد عمر سعيد', patientPhone: '777789012',
    doctor: 'د. فيصل الحيمي', rxNo: 'RX-44175', payMethod: 'credit', branch: 'فرع عدن',
    insurance: 'بدون تأمين', status: 'draft', itemsCount: 6, gross: 60500, net: 55900, tax: 0, paid: 40000, remaining: 15900,
    lineItems: [
      { name: 'كونكور 5mg', unit: 'علبة', qty: 3, price: 4500 },
      { name: 'جلوكوفاج 850mg', unit: 'علبة', qty: 3, price: 3500 },
      { name: 'ليبيتر 20mg', unit: 'علبة', qty: 2, price: 6500 },
      { name: 'أسبرين 100mg', unit: 'علبة', qty: 4, price: 1000 },
      { name: 'أوميبرازول 20mg', unit: 'علبة', qty: 1, price: 2200 },
    ],
  },
  {
    number: 'INV-2026-010', date: '2026-08-10', patient: 'مريم عبدالرحمن', patientPhone: '777678901',
    doctor: 'د. منى السعيدي', rxNo: 'RX-44150', payMethod: 'insurance', branch: 'الفرع الرئيسي - صنعاء',
    insurance: 'شركة التأمين الوطنية', status: 'posted', itemsCount: 3, gross: 31500, net: 28000, tax: 0, paid: 28000,
    lineItems: [
      { name: 'جلوكوفاج 850mg', unit: 'علبة', qty: 3, price: 3500 },
      { name: 'ليبيتر 20mg', unit: 'علبة', qty: 2, price: 6500 },
      { name: 'أوميبرازول 20mg', unit: 'علبة', qty: 3, price: 2200 },
      { name: 'زنك 50mg', unit: 'علبة', qty: 2, price: 1500 },
    ],
  },
  {
    number: 'INV-2026-009', date: '2026-08-09', patient: 'نورة أحمد صالح', patientPhone: '777890123',
    doctor: 'د. ريم الجنيد', rxNo: 'RX-44132', payMethod: 'card', branch: 'فرع تعز',
    insurance: 'شركة سبأ للتأمين', status: 'posted', itemsCount: 2, gross: 16000, net: 14800, tax: 0, paid: 14800,
    lineItems: [
      { name: 'إندرال 40mg', unit: 'علبة', qty: 5, price: 1200 },
      { name: 'أوميبرازول 20mg', unit: 'علبة', qty: 4, price: 2200 },
    ],
  },
  {
    number: 'INV-2026-008', date: '2026-08-08', patient: 'محمد سالم أحمد', patientPhone: '777345678',
    doctor: '', rxNo: '', payMethod: 'cash', branch: 'الفرع الرئيسي - صنعاء',
    insurance: 'بدون تأمين', status: 'cancelled', itemsCount: 2, gross: 11000, net: 10000, tax: 0, paid: 0,
    lineItems: [
      { name: 'فلاجيل 500mg', unit: 'علبة', qty: 2, price: 1800 },
      { name: 'سبراكس 200mg', unit: 'علبة', qty: 1, price: 4500 },
      { name: 'فيتامين D3 1000IU', unit: 'علبة', qty: 1, price: 5000 },
    ],
  },
  {
    number: 'INV-2026-007', date: '2026-08-07', patient: 'عائشة يوسف إبراهيم', patientPhone: '777456789',
    doctor: 'د. ياسر النعماني', rxNo: 'RX-44090', payMethod: 'cash', branch: 'الفرع الرئيسي - صنعاء',
    insurance: 'شركة سبأ للتأمين', status: 'posted', itemsCount: 4, gross: 37000, net: 33500, tax: 0, paid: 33500,
    lineItems: [
      { name: 'نكسيوم 40mg', unit: 'علبة', qty: 2, price: 8000 },
      { name: 'أوميبرازول 20mg', unit: 'علبة', qty: 3, price: 2200 },
      { name: 'زيرتك 10mg', unit: 'علبة', qty: 2, price: 3000 },
      { name: 'بنادول 500mg', unit: 'علبة', qty: 1, price: 1500 },
      { name: 'أوجمنتين 625mg', unit: 'علبة', qty: 1, price: 5500 },
    ],
  },
])

// ---- حالة الفلترة ----
const search = ref('')
const statusFilter = ref('all')
const payFilter = ref('all')
const dateFrom = ref('')
const dateTo = ref('')
const printPreview = ref(null)

const payLabels = { cash: 'نقدي', credit: 'آجل', insurance: 'تأمين', card: 'بطاقة' }
function payLabel(m) { return payLabels[m] ?? m }

const filteredInvoices = computed(() => {
  const q = search.value.toLowerCase().trim()
  return invoices.value.filter((inv) => {
    if (q && !(
      inv.number.toLowerCase().includes(q) ||
      inv.patient.toLowerCase().includes(q) ||
      (inv.doctor || '').toLowerCase().includes(q) ||
      (inv.rxNo || '').toLowerCase().includes(q)
    )) return false
    if (statusFilter.value !== 'all' && inv.status !== statusFilter.value) return false
    if (payFilter.value !== 'all' && inv.payMethod !== payFilter.value) return false
    if (dateFrom.value && inv.date < dateFrom.value) return false
    if (dateTo.value && inv.date > dateTo.value) return false
    return true
  })
})

const sumNet = computed(() => filteredInvoices.value.filter(i => i.status !== 'cancelled').reduce((s, i) => s + i.net, 0))
const sumPaid = computed(() => filteredInvoices.value.reduce((s, i) => s + i.paid, 0))
const sumRemaining = computed(() => filteredInvoices.value.reduce((s, i) => s + Math.max(0, i.net - i.paid), 0))

// ---- الإجراءات ----
function fmt(n) {
  return String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function openInvoice(inv) {
  // إعادة فتح الفاتورة في شاشة فاتورة المبيعات عبر localStorage (الاتصال بين الشاشات)
  const data = {
    invoiceNumber: inv.number,
    invoiceDate: inv.date,
    branch: inv.branch,
    patientName: inv.patient,
    patientPhone: inv.patientPhone,
    doctorName: inv.doctor,
    prescriptionNo: inv.rxNo,
    paymentMethod: inv.payMethod,
    netTotal: inv.net,
    paidAmount: inv.paid,
    lineItems: inv.lineItems,
    status: inv.status,
  }
  try {
    localStorage.setItem('erp-open-invoice', JSON.stringify(data))
  } catch (e) {}
  window.dispatchEvent(new CustomEvent('erp-open-invoice', { detail: data }))
  // إغلاق شاشة السجل وفتح شاشة الفاتورة
  window.dispatchEvent(new CustomEvent('erp-navigate', { detail: { page: 'invoices-open' } }))
}

function cancelInvoice(inv) {
  if (inv.status === 'cancelled') return
  if (confirm(`هل أنت متأكد من إلغاء الفاتورة ${inv.number}؟\nسيتم إلغاء أثرها على المخزون والأرصدة.`)) {
    inv.status = 'cancelled'
    inv.paid = 0
    inv.remaining = inv.net
  }
}

function printInvoice(inv) {
  printPreview.value = inv
}

function createNew() {
  window.dispatchEvent(new CustomEvent('erp-navigate', { detail: { page: 'pos' } }))
}

// ---- اختصار Esc لإغلاق المعاينة ----
function handleKeydown(e) {
  if (e.key === 'Escape' && printPreview.value) printPreview.value = null
}
onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<style scoped>
.screen-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.flex-1 {
  flex: 1;
  min-height: 0;
}

.screen-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.toolbar-right {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  flex: 1;
}

.search-input {
  min-width: 220px;
  max-width: 360px;
}

.filter-select, .date-input {
  min-width: 110px;
}

.table-container {
  overflow: auto;
  flex: 1;
  min-height: 0;
}

.table-container table {
  min-width: 1000px;
  width: 100%;
}

.empty-state {
  text-align: center;
  color: var(--color-text-secondary);
  padding: var(--space-4);
  font-size: var(--font-size-lg);
}

.invoice-no {
  color: var(--color-primary);
  font-weight: bold;
  white-space: nowrap;
}

.patient-name {
  font-weight: bold;
}

.insurance-tag {
  display: inline-block;
  font-size: var(--font-size-xs);
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-radius: var(--border-radius);
  padding: 0 var(--space-1);
  margin-right: var(--space-1);
  white-space: nowrap;
}

.status-badge {
  display: inline-block;
  font-size: var(--font-size-xs);
  padding: 2px var(--space-2);
  border-radius: var(--border-radius);
  white-space: nowrap;
}

.status-posted {
  background: var(--color-success-light, #e8f5e9);
  color: var(--color-success);
}

.status-draft {
  background: #fff8e1;
  color: #f57f17;
}

.status-cancelled {
  background: #ffebee;
  color: var(--color-error);
  text-decoration: line-through;
}

.action-btn {
  border: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  cursor: pointer;
  border-radius: var(--border-radius);
  font-size: var(--font-size-xs);
  padding: 3px var(--space-2);
  margin-left: 2px;
  white-space: nowrap;
}

.action-btn.open {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.action-btn.print {
  color: var(--color-success);
}

.action-btn.cancel {
  color: var(--color-error);
}

.action-btn:hover {
  background: var(--color-primary-light);
}

.text-danger {
  color: var(--color-error);
  font-weight: bold;
}

/* معاينة الطباعة */
.lookup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.print-modal {
  width: 88%;
  max-width: 640px;
  max-height: 82vh;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-dark);
  border-radius: var(--border-radius);
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.print-header {
  height: 36px;
  background: linear-gradient(180deg, #1565c0 0%, var(--color-primary) 100%);
  color: white;
  display: flex;
  align-items: center;
  padding: 0 var(--space-3);
  font-weight: bold;
  font-size: var(--font-size-lg);
  justify-content: space-between;
  flex-shrink: 0;
}

.lookup-close {
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  cursor: pointer;
  border-radius: var(--border-radius);
  font-size: 14px;
}

.print-body {
  padding: var(--space-3);
  overflow-y: auto;
  flex: 1;
}

.print-title {
  text-align: center;
  font-weight: bold;
  font-size: var(--font-size-lg);
  color: var(--color-primary);
  margin-bottom: var(--space-3);
  border-bottom: 2px solid var(--color-primary);
  padding-bottom: var(--space-2);
}

.print-row {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-2);
  font-size: var(--font-size-sm);
}

.print-table {
  width: 100%;
  margin: var(--space-2) 0;
}

.print-totals {
  border-top: 1px dashed var(--color-border);
  padding-top: var(--space-2);
}

.print-footer {
  height: 44px;
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 var(--space-3);
  flex-shrink: 0;
}

.btn {
  padding: 6px var(--space-3);
  border: 1px solid transparent;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-family: var(--font-family);
  font-size: var(--font-size-base);
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: #1565c0;
}
</style>
