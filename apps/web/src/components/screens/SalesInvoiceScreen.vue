<template>
  <!-- ========== شاشة فاتورة المبيعات ========== -->
  <div class="window-body flex-col">
    <!-- رأس الفاتورة -->
    <div class="invoice-header">
      <div class="header-block">
        <div class="block-title">بيانات الوثيقة</div>
        <div class="field-row">
          <label>رقم الفاتورة</label>
          <input type="text" class="input-field" :value="invoiceNumber" readonly />
        </div>
        <div class="field-row">
          <label>التاريخ</label>
          <input type="date" class="input-field" v-model="invoiceDate" />
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
        <div class="block-title">بيانات المريض</div>
        <div class="field-row">
          <label>المريض</label>
          <div class="input-with-search">
            <input
              type="text"
              class="input-field"
              placeholder="ابحث عن مريض..."
              v-model="patientName"
              @focus="$event.target.select()"
              @input="patientQuery = $event.target.value"
              @blur="setTimeout(() => (showPatientDropdown = false), 200)"
            />
            <button class="search-btn" @click="openLookup('patient')">🔍</button>
            <div v-if="showPatientDropdown && filteredPatients.length" class="search-dropdown">
              <div
                v-for="p in filteredPatients.slice(0, 8)"
                :key="p.code"
                class="dropdown-item"
                @mousedown.prevent="selectPatient(p)"
              >
                <span class="drug-name">{{ p.name }}</span>
                <span class="drug-barcode">{{ p.code }} | {{ p.phone }}</span>
                <span class="drug-price">{{ fmt(p.balance) }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="field-row">
          <label>رقم الهاتف</label>
          <input type="text" class="input-field" placeholder="777XXXXXX" v-model="patientPhone" />
        </div>
        <div class="field-row">
          <label>الطبيب</label>
          <div class="input-with-search">
            <input
              type="text"
              class="input-field"
              placeholder="اسم الطبيب..."
              v-model="doctorName"
              @focus="$event.target.select()"
              @input="doctorQuery = $event.target.value"
              @blur="setTimeout(() => (showDoctorDropdown = false), 200)"
            />
            <button class="search-btn" @click="openLookup('doctor')">🔍</button>
            <div v-if="showDoctorDropdown && filteredDoctors.length" class="search-dropdown">
              <div
                v-for="d in filteredDoctors.slice(0, 8)"
                :key="d.code"
                class="dropdown-item"
                @mousedown.prevent="selectDoctor(d)"
              >
                <span class="drug-name">{{ d.name }}</span>
                <span class="drug-barcode">{{ d.specialty }} | {{ d.license }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="field-row">
          <label>رقم الوصفة</label>
          <input type="text" class="input-field" placeholder="RX-XXXXX" v-model="prescriptionNo" />
        </div>
      </div>

      <div class="header-block">
        <div class="block-title">بيانات البيع</div>
        <div class="field-row">
          <label>طريقة الدفع</label>
          <select class="input-field" v-model="paymentMethod">
            <option value="cash">نقدي</option>
            <option value="credit">آجل</option>
            <option value="insurance">تأمين</option>
            <option value="card">بطاقة</option>
          </select>
        </div>
        <div class="field-row">
          <label>نوع السعر</label>
          <select class="input-field" v-model="priceType">
            <option>سعر بيع عادي</option>
            <option>سعر جملة</option>
            <option>سعر تأمين</option>
          </select>
        </div>
        <div class="field-row">
          <label>الخصم العام %</label>
          <input type="number" class="input-field" v-model.number="generalDiscount" min="0" max="100" />
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

    <!-- جدول الأصناف -->
    <div class="table-container flex-1">
      <table class="dense-table">
        <thead>
          <tr>
            <th style="width:30px">#</th>
            <th style="width:170px">الصنف</th>
            <th style="width:95px">الباركود</th>
            <th style="width:50px">الوحدة</th>
            <th style="width:70px">التشغيلة</th>
            <th style="width:75px">الصلاحية</th>
            <th style="width:50px">الكمية</th>
            <th style="width:70px">السعر</th>
            <th style="width:40px">خصم%</th>
            <th style="width:40px">ضريبة%</th>
            <th style="width:80px">الإجمالي</th>
            <th style="width:28px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in invoiceRows" :key="row.id">
            <td>{{ i + 1 }}</td>
            <td>
              <div class="input-with-search">
                <input
                  type="text"
                  class="table-input drug-search"
                  placeholder="ابحث عن دواء..."
                  v-model="row.search"
                  @focus="$event.target.select()"
                  @input="filterDrug(row)"
                  @blur="setTimeout(() => (row.showDropdown = false), 200)"
                />
                <div v-if="row.showDropdown && row.filtered.length" class="search-dropdown dropdown-over-table">
                  <div
                    v-for="d in row.filtered.slice(0, 8)"
                    :key="d.code"
                    class="dropdown-item"
                    @mousedown.prevent="fillDrug(row, d)"
                  >
                    <span class="drug-name">{{ d.name }}</span>
                    <span class="drug-barcode">{{ d.code }} | {{ d.barcode }}</span>
                    <span class="drug-price">{{ fmt(d.sellPrice) }}</span>
                    <span class="drug-stock" :class="{ 'status-low': d.stock <= d.minStock && d.stock > 0, 'status-out': d.stock === 0 }">الرصيد: {{ d.stock }}</span>
                  </div>
                  <div v-if="row.filtered.length > 8" class="dropdown-item dropdown-create">
                    ... و {{ row.filtered.length - 8 }} نتائج أخرى
                  </div>
                  <div class="dropdown-item dropdown-create" @mousedown.prevent="openLookup('item', row)">
                    + إنشاء صنف جديد
                  </div>
                </div>
              </div>
            </td>
            <td>
              <input
                type="text"
                class="table-input barcode-input"
                placeholder="باركود"
                v-model="row.barcode"
                @input="searchByBarcode(row)"
              />
            </td>
            <td><input type="text" class="table-input" value="علبة" readonly /></td>
            <td><input type="text" class="table-input" placeholder="LOT-001" v-model="row.lot" /></td>
            <td><input type="date" class="table-input" v-model="row.expiry" /></td>
            <td><input type="number" class="table-input qty-input" v-model.number="row.qty" min="1" /></td>
            <td><input type="number" class="table-input price-input" v-model.number="row.price" min="0" /></td>
            <td><input type="number" class="table-input disc-input" v-model.number="row.disc" min="0" max="100" /></td>
            <td><input type="number" class="table-input tax-input" v-model.number="row.tax" min="0" max="100" /></td>
            <td class="row-total">{{ fmt(rowTotal(row)) }}</td>
            <td><button class="delete-btn" @click="deleteRow(row)">✕</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- شريط الإجماليات -->
    <div class="totals-bar">
      <div class="totals-right">
        <div class="total-item">
          <span class="total-label">الأصناف:</span>
          <span class="total-value">{{ invoiceRows.length }}</span>
        </div>
        <div class="total-item">
          <span class="total-label">الكميات:</span>
          <span class="total-value">{{ totalQty }}</span>
        </div>
      </div>
      <div class="totals-center">
        <div class="total-item">
          <span class="total-label">الإجمالي:</span>
          <span class="total-value">{{ fmt(Math.round(subtotal)) }}</span>
        </div>
        <div class="total-item">
          <span class="total-label">الخصم:</span>
          <span class="total-value">{{ fmt(Math.round(totalDiscount)) }}</span>
        </div>
        <div class="total-item">
          <span class="total-label">الضريبة:</span>
          <span class="total-value">{{ fmt(Math.round(totalTax)) }}</span>
        </div>
      </div>
      <div class="totals-left">
        <div class="total-item">
          <span class="total-label">الصافي:</span>
          <span class="total-net">{{ fmt(Math.round(netTotal)) }}</span>
        </div>
        <div class="total-item">
          <span class="total-label">المدفوع:</span>
          <input type="number" class="input-field paid-input" v-model.number="paidAmount" min="0" />
        </div>
        <div class="total-item">
          <span class="total-label">المتبقي:</span>
          <span class="total-value remaining" :style="{ color: remaining > 0 ? 'var(--color-error)' : 'var(--color-success)' }">{{ fmt(Math.round(remaining)) }}</span>
        </div>
      </div>
    </div>

    <!-- التبويبات السفلية -->
    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'details' }" @click="activeTab = 'details'">التفاصيل</button>
      <button class="tab" :class="{ active: activeTab === 'payments' }" @click="activeTab = 'payments'">الدفعات</button>
      <button class="tab" :class="{ active: activeTab === 'journal' }" @click="activeTab = 'journal'">القيود المحاسبية</button>
      <button class="tab" :class="{ active: activeTab === 'history' }" @click="activeTab = 'history'">سجل التعديلات</button>
    </div>
    <div class="tab-content">
      <div v-show="activeTab === 'details'" class="tab-panel">
        <p class="panel-hint">تفاصيل إضافية للفاتورة...</p>
      </div>
      <div v-show="activeTab === 'payments'" class="tab-panel">
        <table class="dense-table">
          <thead>
            <tr>
              <th>رقم الدفعة</th>
              <th>طريقة الدفع</th>
              <th>المبلغ</th>
              <th>التاريخ</th>
              <th>المستلم</th>
              <th>المرجع</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>نقدي</td>
              <td>{{ fmt(paidAmount) }}</td>
              <td>{{ invoiceDate }}</td>
              <td>مدير النظام</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-show="activeTab === 'journal'" class="tab-panel">
        <table class="dense-table">
          <thead>
            <tr>
              <th>الحساب</th>
              <th>البيان</th>
              <th>مدين</th>
              <th>دائن</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>الصندوق</td>
              <td>مبيعات نقدية</td>
              <td>{{ fmt(Math.round(netTotal)) }}</td>
              <td>0</td>
            </tr>
            <tr>
              <td>المبيعات</td>
              <td>إيراد مبيعات</td>
              <td>0</td>
              <td>{{ fmt(Math.round(netTotal - totalTax)) }}</td>
            </tr>
            <tr>
              <td>ضريبة المبيعات</td>
              <td>ضريبة مستحقة</td>
              <td>0</td>
              <td>{{ fmt(Math.round(totalTax)) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-show="activeTab === 'history'" class="tab-panel">
        <p class="panel-hint">سجل التعديلات...</p>
      </div>
    </div>

    <!-- نافذة البحث الموحدة (Lookup Modal) -->
    <LookupModal
      v-if="lookupOpen"
      :type="lookupType"
      @select="lookupSelect"
      @close="lookupOpen = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { sampleDrugs, patientsDatabase, doctorsDatabase } from '../../data/sampleData.js'
import LookupModal from './LookupModal.vue'

// ---- حالة الفاتورة ----
const invoiceNumber = ref('INV-2024-001')
const invoiceDate = ref('2026-08-13')
const branch = ref('الفرع الرئيسي - صنعاء')
const warehouse = ref('المخزن الرئيسي')
const patientName = ref('')
const patientPhone = ref('')
const doctorName = ref('')
const prescriptionNo = ref('')
const paymentMethod = ref('cash')
const priceType = ref('سعر بيع عادي')
const generalDiscount = ref(0)
const currency = ref('YER - ريال يمني')
const paidAmount = ref(0)
const activeTab = ref('details')

// ---- البحث المنسدل (المريض/الطبيب) ----
const patientQuery = ref('')
const showPatientDropdown = ref(false)
const doctorQuery = ref('')
const showDoctorDropdown = ref(false)

const filteredPatients = computed(() => {
  const q = patientQuery.value.toLowerCase().trim()
  if (!q) return []
  return patientsDatabase.filter(
    (p) => p.name.toLowerCase().includes(q) || p.phone.includes(q) || p.code.toLowerCase().includes(q)
  )
})

const filteredDoctors = computed(() => {
  const q = doctorQuery.value.toLowerCase().trim()
  if (!q) return []
  return doctorsDatabase.filter(
    (d) => d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q) || d.phone.includes(q)
  )
})

function selectPatient(p) {
  patientName.value = p.name
  patientPhone.value = p.phone
  showPatientDropdown.value = false
}

function selectDoctor(d) {
  doctorName.value = d.name
  showDoctorDropdown.value = false
}

// ---- صفوف جدول الأصناف ----
let rowIdSeq = 0
const invoiceRows = ref([newEmptyRow()])

function newEmptyRow() {
  return {
    id: rowIdSeq++,
    search: '',
    barcode: '',
    unit: 'علبة',
    lot: 'LOT-' + Math.floor(1000 + Math.random() * 9000),
    expiry: '',
    qty: 1,
    price: 0,
    disc: 0,
    tax: 0,
    drug: null,
    showDropdown: false,
    filtered: [],
  }
}

function deleteRow(row) {
  const idx = invoiceRows.value.indexOf(row)
  if (invoiceRows.value.length > 1) {
    invoiceRows.value.splice(idx, 1)
  } else {
    row.search = ''
    row.barcode = ''
    row.lot = 'LOT-' + Math.floor(1000 + Math.random() * 9000)
    row.expiry = ''
    row.qty = 1
    row.price = 0
    row.disc = 0
    row.tax = 0
    row.drug = null
  }
}

function filterDrug(row) {
  const q = row.search.toLowerCase().trim()
  if (q.length < 1) {
    row.showDropdown = false
    row.filtered = []
    return
  }
  row.filtered = sampleDrugs.filter(
    (d) =>
      d.name.toLowerCase().includes(q) ||
      d.scientific.toLowerCase().includes(q) ||
      d.barcode.includes(q) ||
      d.code.toLowerCase().includes(q)
  )
  row.showDropdown = row.filtered.length > 0
}

function searchByBarcode(row) {
  const bc = row.barcode.trim()
  if (bc.length < 3) return
  const drug = sampleDrugs.find((d) => d.barcode === bc)
  if (drug) fillDrug(row, drug)
}

function fillDrug(row, drug) {
  row.drug = drug
  row.search = drug.name
  row.barcode = drug.barcode
  row.unit = drug.unit
  row.lot = 'LOT-' + Math.floor(1000 + Math.random() * 9000)
  row.expiry = drug.expiry
  row.price = drug.sellPrice
  row.showDropdown = false
}

// ---- الحسابات ----
function rowTotal(row) {
  const qty = Number(row.qty) || 0
  const price = Number(row.price) || 0
  const disc = Number(row.disc) || 0
  const tax = Number(row.tax) || 0
  const sub = qty * price
  const after = sub - sub * (disc / 100)
  return after + after * (tax / 100)
}

const subtotal = computed(() =>
  invoiceRows.value.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.price) || 0), 0)
)

const totalDiscount = computed(() => {
  let lineDisc = invoiceRows.value.reduce((s, r) => {
    const sub = (Number(r.qty) || 0) * (Number(r.price) || 0)
    return s + sub * ((Number(r.disc) || 0) / 100)
  }, 0)
  const genDisc = (subtotal.value - lineDisc) * ((generalDiscount.value || 0) / 100)
  return lineDisc + genDisc
})

const totalTax = computed(() =>
  invoiceRows.value.reduce((s, r) => {
    const sub = (Number(r.qty) || 0) * (Number(r.price) || 0)
    const after = sub - sub * ((Number(r.disc) || 0) / 100)
    return s + after * ((Number(r.tax) || 0) / 100)
  }, 0)
)

const totalQty = computed(() =>
  invoiceRows.value.reduce((s, r) => s + (Number(r.qty) || 0), 0)
)

const netTotal = computed(() => subtotal.value - totalDiscount.value + totalTax.value)
const remaining = computed(() => Math.max(0, netTotal.value - (Number(paidAmount.value) || 0)))

// ---- Lookup Modal ----
const lookupType = ref('patient')
const lookupTargetRow = ref(null)
const lookupOpen = ref(false)

function openLookup(type, row = null) {
  lookupType.value = type
  lookupTargetRow.value = row
  lookupOpen.value = true
}

function lookupSelect(item) {
  if (lookupType.value === 'patient') selectPatient(item)
  else if (lookupType.value === 'doctor') selectDoctor(item)
  else if (lookupType.value === 'item' && lookupTargetRow.value) fillDrug(lookupTargetRow.value, item)
  lookupOpen.value = false
}

// ---- التنسيق ----
function fmt(n) {
  return String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// ---- اختصار Esc لإغلاق المودال ----
function handleKeydown(e) {
  if (e.key === 'Escape' && lookupOpen.value) lookupOpen.value = false
}
onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<style scoped>
.window-body.flex-col {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.flex-1 {
  flex: 1;
  min-height: 0;
}

.panel-hint {
  color: var(--color-text-secondary);
  padding: var(--space-2);
  font-size: var(--font-size-sm);
}

.table-input {
  width: 100%;
  height: 24px;
  border: 1px solid transparent;
  padding: 0 var(--space-1);
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  background: transparent;
  text-align: right;
}

.table-input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: white;
  box-shadow: 0 0 0 1px var(--color-primary);
}

.row-total {
  font-weight: bold;
  text-align: center;
  color: var(--color-primary);
}

.delete-btn {
  width: 22px;
  height: 22px;
  border: none;
  background: var(--color-error);
  color: white;
  cursor: pointer;
  border-radius: var(--border-radius);
  font-size: 12px;
}

.delete-btn:hover {
  background: #d32f2f;
}

/* قائمة منسدلة داخل جدول */
.dropdown-over-table {
  max-width: 360px;
}

.drug-stock {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.status-low {
  color: var(--color-warning);
}

.status-out {
  color: var(--color-error);
}

.invoice-header {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.header-block {
  flex: 1;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: var(--space-2);
}

.block-title {
  font-size: var(--font-size-sm);
  font-weight: bold;
  color: var(--color-primary);
  margin-bottom: var(--space-2);
  padding-bottom: var(--space-1);
  border-bottom: 1px solid var(--color-border);
}

.field-row {
  display: flex;
  align-items: center;
  margin-bottom: var(--space-1);
  gap: var(--space-2);
}

.field-row label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  min-width: 70px;
  white-space: nowrap;
}

.field-row .input-field {
  flex: 1;
}

.input-with-search {
  display: flex;
  flex: 1;
  gap: 2px;
  position: relative;
}

.search-btn {
  width: 28px;
  height: var(--input-height);
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  cursor: pointer;
  border-radius: var(--border-radius);
  font-size: 14px;
  flex-shrink: 0;
}

.search-btn:hover {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
}

.search-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid var(--color-primary);
  border-radius: var(--border-radius);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 100;
  min-width: 300px;
  max-width: 360px;
  max-height: 240px;
  overflow-y: auto;
}

.dropdown-item {
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
  border-bottom: 1px solid var(--color-bg-secondary);
  font-size: var(--font-size-base);
}

.dropdown-item:hover {
  background: var(--color-primary-light);
}

.drug-name {
  font-weight: bold;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drug-barcode {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.drug-price {
  color: var(--color-primary);
  font-weight: bold;
}

.dropdown-create {
  color: var(--color-primary);
  font-weight: bold;
  justify-content: center;
}

.table-container {
  overflow: auto;
}

.table-container table {
  min-width: 720px;
}

.totals-bar {
  flex-shrink: 0;
}

.remaining {
  color: var(--color-error);
}

.paid-input {
  width: 100px !important;
  text-align: center;
  font-weight: bold;
}

.tabs {
  flex-shrink: 0;
}

.tab-content {
  flex-shrink: 0;
  max-height: 130px;
  overflow: auto;
}

.tab-panel {
  padding: var(--space-2);
}

.tab-panel table {
  width: 100%;
}
</style>
