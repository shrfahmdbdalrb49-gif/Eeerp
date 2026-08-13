<template>
  <!-- ========== شاشة مرتجعات المبيعات ========== -->
  <div class="window-body flex-col">
    <div class="screen-layout">
      <!-- الشريط الجانبي للشاشة -->
      <div class="screen-sidebar">
        <button :class="['screen-tab', { active: tab === 'new' }]" @click="tab = 'new'">📄 مرتجع جديد</button>
        <button :class="['screen-tab', { active: tab === 'list' }]" @click="tab = 'list'">📋 سجل المرتجعات</button>
        <button :class="['screen-tab', { active: tab === 'reasons' }]" @click="tab = 'reasons'">📝 أسباب الارتجاع</button>
      </div>

      <!-- المحتوى -->
      <div class="screen-content">
        <!-- تبويب المرتجع الجديد -->
        <div v-if="tab === 'new'" class="flex-col full-height">
          <div class="invoice-header">
            <div class="header-block">
              <div class="block-title">بيانات الوثيقة</div>
              <div class="field-row">
                <label>رقم المرتجع</label>
                <input type="text" class="input-field" :value="returnNo" readonly />
              </div>
              <div class="field-row">
                <label>التاريخ</label>
                <input type="date" class="input-field" v-model="returnDate" />
              </div>
              <div class="field-row">
                <label>الفرع</label>
                <select class="input-field" v-model="branch">
                  <option>الفرع الرئيسي - صنعاء</option>
                  <option>فرع عدن</option>
                  <option>فرع تعز</option>
                </select>
              </div>
              <div class="field-row">
                <label>المخزن</label>
                <select class="input-field" v-model="warehouse">
                  <option>المخزن الرئيسي</option>
                  <option>مخزن الطوارئ</option>
                </select>
              </div>
            </div>

            <div class="header-block">
              <div class="block-title">بيانات العميل</div>
              <div class="field-row">
                <label>العميل / المريض</label>
                <div class="input-with-search">
                  <input
                    type="text"
                    class="input-field"
                    placeholder="ابحث عن عميل..."
                    v-model="customerName"
                    @input="customerQuery = $event.target.value"
                    @blur="setTimeout(() => (showCustomerDropdown = false), 200)"
                  />
                  <button class="search-btn" @click="showCustomerDropdown = !showCustomerDropdown">🔍</button>
                  <div v-if="showCustomerDropdown && filteredCustomers.length" class="search-dropdown">
                    <div
                      v-for="c in filteredCustomers.slice(0, 8)"
                      :key="c.code"
                      class="dropdown-item"
                      @mousedown.prevent="selectCustomer(c)"
                    >
                      <span class="drug-name">{{ c.name }}</span>
                      <span class="drug-barcode">{{ c.code }} | {{ c.phone }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="field-row">
                <label>رقم فاتورة البيع الأصلية</label>
                <div class="input-with-search">
                  <input
                    type="text"
                    class="input-field"
                    placeholder="INV-XXXXX"
                    v-model="sourceInvoiceNo"
                    @input="invoiceQuery = $event.target.value"
                    @blur="setTimeout(() => (showInvoiceDropdown = false), 200)"
                  />
                  <button class="search-btn" @click="showInvoiceDropdown = !showInvoiceDropdown">🔍</button>
                  <div v-if="showInvoiceDropdown && filteredInvoices.length" class="search-dropdown">
                    <div
                      v-for="inv in filteredInvoices.slice(0, 8)"
                      :key="inv.number"
                      class="dropdown-item"
                      @mousedown.prevent="selectSourceInvoice(inv)"
                    >
                      <span class="drug-name">{{ inv.number }}</span>
                      <span class="drug-barcode">{{ inv.date }} | {{ inv.patient }}</span>
                      <span class="drug-price">{{ fmt(inv.net) }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="field-row">
                <label>سبب الارتجاع</label>
                <select class="input-field" v-model="returnReason">
                  <option value="">— اختر السبب —</option>
                  <option v-for="r in returnReasons" :key="r" :value="r">{{ r }}</option>
                </select>
              </div>
              <div class="field-row">
                <label>العملة</label>
                <select class="input-field" v-model="currency">
                  <option>YER - ريال يمني</option>
                  <option>USD - دولار أمريكي</option>
                  <option>SAR - ريال سعودي</option>
                </select>
              </div>
            </div>
          </div>

          <!-- جدول الأصناف المرتجعة -->
          <div class="items-section">
            <div class="items-toolbar">
              <div class="search-box">
                <input
                  type="text"
                  class="input-field"
                  placeholder="ابحث عن دواء... (الاسم أو الباركود)"
                  v-model="drugQuery"
                  @focus="showDrugDropdown = true"
                  @blur="setTimeout(() => (showDrugDropdown = false), 200)"
                />
                <div v-if="showDrugDropdown && filteredDrugs.length" class="search-dropdown" style="top:100%">
                  <div
                    v-for="d in filteredDrugs.slice(0, 10)"
                    :key="d.code"
                    class="dropdown-item"
                    @mousedown.prevent="addDrugReturn(d)"
                  >
                    <span class="drug-name">{{ d.name }}</span>
                    <span class="drug-barcode">{{ d.barcode }} | {{ d.unit }}</span>
                    <span class="drug-price">{{ fmt(d.sellPrice) }}</span>
                  </div>
                </div>
              </div>
              <button class="btn btn-secondary" @click="generateBarCode">📷 بحث بالباركود</button>
            </div>

            <div class="table-scroll">
              <table class="dense-table">
                <thead>
                  <tr>
                    <th style="width:30px">#</th>
                    <th>الصنف</th>
                    <th>الباركود</th>
                    <th>الوحدة</th>
                    <th>التشغيلة</th>
                    <th>الصلاحية</th>
                    <th>الكمية المرتجعة</th>
                    <th>سعر الفاتورة</th>
                    <th>الإجمالي</th>
                    <th style="width:40px"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, i) in returnItems" :key="i" :class="{ selected: selectedRow === i }" @click="selectedRow = i">
                    <td>{{ i + 1 }}</td>
                    <td>{{ item.name }}</td>
                    <td>{{ item.barcode }}</td>
                    <td>{{ item.unit }}</td>
                    <td>{{ item.lot }}</td>
                    <td>{{ item.expiry }}</td>
                    <td>
                      <input type="number" class="input-field qty-input" v-model.number="item.qty" min="1" @input="recalc" />
                    </td>
                    <td>{{ fmt(item.price) }}</td>
                    <td>{{ fmt(item.qty * item.price) }}</td>
                    <td><button class="row-delete" @click.stop="removeItem(i)">✕</button></td>
                  </tr>
                  <tr v-if="returnItems.length === 0">
                    <td colspan="10" class="empty-state">لا توجد أصناف مرتجعة — ابحث عن الدواء وأضفه للجدول</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- شريط الإجماليات -->
          <div class="totals-bar">
            <div class="total-item"><span class="total-label">الأصناف:</span><span class="total-value">{{ returnItems.length }}</span></div>
            <div class="total-item"><span class="total-label">الكميات:</span><span class="total-value">{{ totalQty }}</span></div>
            <div class="total-item"><span class="total-label">الإجمالي:</span><span class="total-value total-net">{{ fmt(totalAmount) }}</span></div>
          </div>

          <!-- أزرار الإجراءات -->
          <div class="form-actions">
            <button class="btn btn-primary" @click="postReturn">✅ ترحيل المرتجع</button>
            <button class="btn btn-secondary" @click="saveReturn">💾 حفظ كمسودة</button>
            <button class="btn btn-secondary" @click="clearReturn">🗑️ تفريغ النموذج</button>
          </div>
        </div>

        <!-- تبويب سجل المرتجعات -->
        <div v-if="tab === 'list'" class="flex-col full-height">
          <div class="filter-bar">
            <input type="text" class="input-field" placeholder="بحث برقم المرتجع أو اسم العميل..." v-model="listSearch" />
            <select class="input-field filter-select" v-model="listStatus">
              <option value="">جميع الحالات</option>
              <option value="draft">مسودة</option>
              <option value="posted">مرحّلة</option>
              <option value="cancelled">ملغية</option>
            </select>
            <input type="date" class="input-field filter-select" v-model="listDateFrom" />
            <input type="date" class="input-field filter-select" v-model="listDateTo" />
            <button class="btn btn-primary" @click="listSearch = ''">✕ مسح</button>
          </div>

          <div class="table-scroll">
            <table class="dense-table">
              <thead>
                <tr>
                  <th style="width:30px">#</th>
                  <th>رقم المرتجع</th>
                  <th>التاريخ</th>
                  <th>العميل</th>
                  <th>الفاتورة الأصلية</th>
                  <th>سبب الارتجاع</th>
                  <th>الحالة</th>
                  <th>الكمية</th>
                  <th>المبلغ</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(ret, i) in filteredReturns" :key="ret.no" @dblclick="openReturn(ret)">
                  <td>{{ i + 1 }}</td>
                  <td><span class="invoice-no">{{ ret.no }}</span></td>
                  <td>{{ ret.date }}</td>
                  <td>{{ ret.customer }}</td>
                  <td>{{ ret.sourceInvoice }}</td>
                  <td>{{ ret.reason }}</td>
                  <td><span :class="['badge', 'badge-' + ret.status]">{{ statusLabel(ret.status) }}</span></td>
                  <td>{{ ret.qty }}</td>
                  <td><strong>{{ fmt(ret.amount) }}</strong></td>
                  <td>
                    <button class="btn btn-secondary icon-btn" title="فتح" @click="openReturn(ret)">👁️</button>
                    <button class="btn btn-secondary icon-btn" title="إلغاء" @click="cancelReturn(ret)" v-if="ret.status === 'posted'">🚫</button>
                  </td>
                </tr>
                <tr v-if="filteredReturns.length === 0">
                  <td colspan="10" class="empty-state">لا توجد مرتجعات مطابقة للفلتر</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- تبويب أسباب الارتجاع -->
        <div v-if="tab === 'reasons'" class="flex-col full-height">
          <div class="form-actions" style="justify-content:flex-start; background:var(--color-bg-secondary); border-radius:2px">
            <input type="text" class="input-field" style="width:250px" placeholder="سبب ارتجاع جديد..." v-model="newReason" />
            <button class="btn btn-primary" @click="addReason">➕ إضافة سبب</button>
          </div>
          <div class="table-scroll">
            <table class="dense-table">
              <thead>
                <tr>
                  <th style="width:30px">#</th>
                  <th>سبب الارتجاع</th>
                  <th>عدد الاستخدامات</th>
                  <th style="width:60px">حذف</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in returnReasons" :key="i">
                  <td>{{ i + 1 }}</td>
                  <td>{{ r }}</td>
                  <td>{{ returnsData.filter(x => x.reason === r).length }}</td>
                  <td><button class="row-delete" @click="returnReasons.splice(i, 1)">✕</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { sampleDrugs, patientsDatabase } from '../../data/sampleData.js'

// فواتير البيع المرجعية (اختصار من سجل الفواتير)
const sampleInvoices = [
  { number: 'INV-2026-014', date: '2026-08-12', patient: 'أحمد محمد علي', net: 18500 },
  { number: 'INV-2026-013', date: '2026-08-12', patient: 'فاطمة عبدالله حسن', net: 42300 },
  { number: 'INV-2026-012', date: '2026-08-11', patient: 'علي حسين محمد', net: 7800 },
  { number: 'INV-2026-011', date: '2026-08-11', patient: 'خالد عمر سعيد', net: 55900 },
  { number: 'INV-2026-010', date: '2026-08-10', patient: 'مريم عبدالرحمن', net: 28000 },
  { number: 'INV-2026-009', date: '2026-08-09', patient: 'نورة أحمد صالح', net: 14800 },
]

// أسباب الارتجاع الافتراضية
const returnReasonDefaults = [
  'خطأ في الصرف من الصيدلي',
  'الدواء غير مطلوب',
  'انتهاء الصلاحية عند العميل',
  'عيب في المنتج أو التغليف',
  'تبديل حسب طلب الطبيب',
  'سعر خاطئ',
  'إرجاع من شركة التأمين',
]

// سجل المرتجعات التجريبي
const sampleReturns = [
  { no: 'RTN-2026-001', date: '2026-08-11', customer: 'أحمد محمد علي', sourceInvoice: 'INV-2026-014', reason: 'خطأ في الصرف من الصيدلي', status: 'posted', qty: 2, amount: 3000 },
  { no: 'RTN-2026-002', date: '2026-08-10', customer: 'علي حسين محمد', sourceInvoice: 'INV-2026-012', reason: 'الدواء غير مطلوب', status: 'posted', qty: 1, amount: 2000 },
  { no: 'RTN-2026-003', date: '2026-08-09', customer: 'خالد عمر سعيد', sourceInvoice: 'INV-2026-011', reason: 'تبديل حسب طلب الطبيب', status: 'draft', qty: 3, amount: 13500 },
]

const tab = ref('new')
const returnNo = ref('RTN-2026-004')
const returnDate = ref(new Date().toISOString().slice(0, 10))
const branch = ref('الفرع الرئيسي - صنعاء')
const warehouse = ref('المخزن الرئيسي')
const currency = ref('YER - ريال يمني')
const customerName = ref('')
const customerQuery = ref('')
const showCustomerDropdown = ref(false)
const sourceInvoiceNo = ref('')
const invoiceQuery = ref('')
const showInvoiceDropdown = ref(false)
const returnReason = ref('')
const returnReasons = ref([...returnReasonDefaults])
const newReason = ref('')
const drugQuery = ref('')
const showDrugDropdown = ref(false)
const returnItems = ref([])
const selectedRow = ref(-1)
const status = ref('draft')

// سجل المرتجعات
const returnsData = ref([...sampleReturns])

// فلاتر القائمة
const listSearch = ref('')
const listStatus = ref('')
const listDateFrom = ref('')
const listDateTo = ref('')

const filteredCustomers = computed(() =>
  patientsDatabase.filter(p => p.name.includes(customerQuery.value))
)

const filteredInvoices = computed(() =>
  sampleInvoices.filter(inv => inv.number.includes(invoiceQuery.value))
)

const filteredDrugs = computed(() => {
  if (!drugQuery.value) return sampleDrugs.filter(d => d.stock > 0)
  const q = drugQuery.value
  return sampleDrugs.filter(d =>
    d.name.includes(q) || d.barcode.includes(q) || d.scientific.toLowerCase().includes(q.toLowerCase())
  )
})

const totalQty = computed(() => returnItems.value.reduce((s, i) => s + (i.qty || 0), 0))
const totalAmount = computed(() => returnItems.value.reduce((s, i) => s + (i.qty || 0) * i.price, 0))

const filteredReturns = computed(() => {
  return returnsData.value.filter(ret => {
    if (listStatus.value && ret.status !== listStatus.value) return false
    if (listDateFrom.value && ret.date < listDateFrom.value) return false
    if (listDateTo.value && ret.date > listDateTo.value) return false
    if (listSearch.value) {
      const q = listSearch.value
      return ret.no.includes(q) || ret.customer.includes(q) || ret.sourceInvoice.includes(q)
    }
    return true
  })
})

function fmt(n) {
  if (n == null || isNaN(n)) return '0'
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function statusLabel(s) {
  return { draft: 'مسودة', posted: 'مرحّلة', cancelled: 'ملغية' }[s] || s
}

function selectCustomer(c) {
  customerName.value = c.name
  showCustomerDropdown.value = false
}

function selectSourceInvoice(inv) {
  sourceInvoiceNo.value = inv.number
  customerName.value = inv.patient
  showInvoiceDropdown.value = false
}

function addDrugReturn(drug) {
  const existing = returnItems.value.find(i => i.code === drug.code)
  if (existing) {
    existing.qty += 1
  } else {
    returnItems.value.push({
      code: drug.code,
      name: drug.name,
      barcode: drug.barcode,
      unit: drug.unit,
      lot: 'LOT-' + Math.floor(Math.random() * 9000 + 1000),
      expiry: drug.expiry,
      qty: 1,
      price: drug.sellPrice,
    })
  }
  drugQuery.value = ''
  showDrugDropdown.value = false
}

function removeItem(i) {
  returnItems.value.splice(i, 1)
  if (selectedRow.value === i) selectedRow.value = -1
}

function recalc() {
  /* الإجماليات محسوبة عبر computed */
}

function generateBarCode() {
  alert('قارئ الباركود جاهز — امسح الصنف مباشرة')
}

function postReturn() {
  if (returnItems.value.length === 0) {
    alert('⚠️ يجب إضافة صنف واحد على الأقل')
    return
  }
  if (!returnReason.value) {
    alert('⚠️ يجب اختيار سبب الارتجاع')
    return
  }
  returnsData.value.unshift({
    no: returnNo.value,
    date: returnDate.value,
    customer: customerName.value || 'عميل نقدي',
    sourceInvoice: sourceInvoiceNo.value || '—',
    reason: returnReason.value,
    status: 'posted',
    qty: totalQty.value,
    amount: totalAmount.value,
  })
  alert('✅ تم ترحيل المرتجع بنجاح: ' + returnNo.value)
  nextReturn()
  tab.value = 'list'
}

function saveReturn() {
  if (returnItems.value.length === 0) {
    alert('⚠️ يجب إضافة صنف واحد على الأقل')
    return
  }
  returnsData.value.unshift({
    no: returnNo.value,
    date: returnDate.value,
    customer: customerName.value || 'عميل نقدي',
    sourceInvoice: sourceInvoiceNo.value || '—',
    reason: returnReason.value || 'غير محدد',
    status: 'draft',
    qty: totalQty.value,
    amount: totalAmount.value,
  })
  alert('💾 تم الحفظ كمسودة: ' + returnNo.value)
  nextReturn()
  tab.value = 'list'
}

function clearReturn() {
  returnItems.value = []
  customerName.value = ''
  sourceInvoiceNo.value = ''
  returnReason.value = ''
  drugQuery.value = ''
}

function nextReturn() {
  const n = returnsData.value.filter(r => r.no.startsWith('RTN')).length + 1
  returnNo.value = 'RTN-2024-' + String(n).padStart(3, '0')
  clearReturn()
}

function openReturn(ret) {
  alert('فتح المرتجع ' + ret.no + '\nالعميل: ' + ret.customer + '\nالمبلغ: ' + fmt(ret.amount))
}

function cancelReturn(ret) {
  if (confirm('هل تريد إلغاء المرتجع ' + ret.no + '؟')) {
    ret.status = 'cancelled'
    alert('تم إلغاء المرتجع: ' + ret.no)
  }
}

function addReason() {
  if (newReason.value.trim() && !returnReasons.value.includes(newReason.value.trim())) {
    returnReasons.value.push(newReason.value.trim())
    newReason.value = ''
  }
}
</script>

<style scoped>
.screen-layout {
  display: flex;
  flex: 1;
  gap: 8px;
  min-height: 0;
}

.screen-sidebar {
  width: 140px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px;
  flex-shrink: 0;
}

.screen-tab {
  height: 40px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  text-align: right;
  padding: 0 8px;
  border-radius: 2px;
  white-space: nowrap;
}

.screen-tab:hover {
  background: var(--color-bg-primary);
}

.screen-tab.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: bold;
  border-color: var(--color-primary);
}

.screen-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.full-height {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.invoice-header {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
  flex-shrink: 0;
}

.header-block {
  flex: 1;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  padding: 6px 8px;
  background: var(--color-bg-secondary);
}

.block-title {
  font-size: var(--font-size-sm);
  font-weight: bold;
  color: var(--color-primary);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 3px;
  margin-bottom: 5px;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.field-row label {
  width: 90px;
  font-size: var(--font-size-sm);
  flex-shrink: 0;
  color: var(--color-text-secondary);
}

.input-with-search {
  position: relative;
  flex: 1;
  display: flex;
}

.input-with-search .input-field {
  flex: 1;
}

.search-btn {
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  cursor: pointer;
  border-radius: 2px;
}

.search-btn:hover {
  background: var(--color-primary-light);
}

.search-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  left: 0;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-primary);
  border-radius: 2px;
  z-index: 100;
  max-height: 200px;
  overflow-y: auto;
  box-shadow: 2px 2px 6px rgba(0,0,0,0.15);
}

.dropdown-item {
  display: flex;
  justify-content: space-between;
  padding: 5px 8px;
  cursor: pointer;
  font-size: var(--font-size-sm);
  border-bottom: 1px solid var(--color-bg-secondary);
}

.dropdown-item:hover {
  background: var(--color-row-hover);
}

.drug-name { font-weight: bold; }
.drug-barcode { color: var(--color-text-secondary); font-size: 11px; }
.drug-price { color: var(--color-primary); font-weight: bold; }

.items-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  background: var(--color-bg-secondary);
}

.items-toolbar {
  display: flex;
  gap: 6px;
  padding: 6px;
  background: var(--color-bg-secondary);
  flex-shrink: 0;
}

.search-box {
  flex: 1;
  position: relative;
}

.table-scroll {
  flex: 1;
  overflow: auto;
  background: var(--color-bg-primary);
  min-height: 0;
}

.qty-input {
  width: 60px;
  text-align: center;
}

.row-delete {
  border: none;
  background: transparent;
  color: var(--color-error);
  cursor: pointer;
  font-size: var(--font-size-base);
  font-weight: bold;
}

.row-delete:hover {
  background: rgba(183, 28, 28, 0.1);
  border-radius: 2px;
}

.empty-state {
  text-align: center;
  color: var(--color-text-secondary);
  padding: 16px;
  font-size: var(--font-size-base);
}

.filter-bar {
  display: flex;
  gap: 6px;
  padding: 6px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  margin-bottom: 6px;
  flex-shrink: 0;
}

.filter-select {
  width: 130px;
}

.invoice-no {
  color: var(--color-primary);
  font-weight: bold;
}

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 6px;
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

.icon-btn {
  padding: 0 6px;
}

.flex-col { flex-direction: column; }

/* موبايل */
@media (max-width: 768px) {
  .screen-layout { flex-direction: column; }
  .screen-sidebar {
    width: 100%;
    flex-direction: row;
    overflow-x: auto;
  }
  .screen-tab { width: auto; min-width: 110px; }
  .invoice-header { flex-direction: column; }
  .field-row label { width: 75px; }
}
</style>
