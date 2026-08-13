<template>
  <!-- ========== شاشة التحصيل ========== -->
  <div class="window-body flex-col">
    <div class="screen-layout">
      <!-- الشريط الجانبي للشاشة -->
      <div class="screen-sidebar">
        <button :class="['screen-tab', { active: tab === 'new' }]" @click="tab = 'new'">📄 سند قبض جديد</button>
        <button :class="['screen-tab', { active: tab === 'list' }]" @click="tab = 'list'">📋 سجل التحصيلات</button>
        <button :class="['screen-tab', { active: tab === 'due' }]" @click="tab = 'due'">⏰ الأرصدة الآجلة</button>
      </div>

      <!-- المحتوى -->
      <div class="screen-content">
        <!-- تبويب سند القبض الجديد -->
        <div v-if="tab === 'new'" class="flex-col full-height">
          <div class="invoice-header">
            <div class="header-block">
              <div class="block-title">بيانات السند</div>
              <div class="field-row">
                <label>رقم السند</label>
                <input type="text" class="input-field" :value="voucherNo" readonly />
              </div>
              <div class="field-row">
                <label>التاريخ</label>
                <input type="date" class="input-field" v-model="voucherDate" />
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
                <label>الصندوق</label>
                <select class="input-field" v-model="cashBox">
                  <option>صندوق المبيعات الرئيسي</option>
                  <option>صندوق الوارد</option>
                  <option>بنك الكريمي</option>
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
                    placeholder="ابحث عن عميل آجل..."
                    v-model="customerName"
                    @input="customerQuery = $event.target.value"
                    @blur="setTimeout(() => (showCustomerDropdown = false), 200)"
                  />
                  <button class="search-btn" @click="showCustomerDropdown = !showCustomerDropdown">🔍</button>
                  <div v-if="showCustomerDropdown && filteredDebtors.length" class="search-dropdown">
                    <div
                      v-for="c in filteredDebtors.slice(0, 8)"
                      :key="c.code"
                      class="dropdown-item"
                      @mousedown.prevent="selectCustomer(c)"
                    >
                      <span class="drug-name">{{ c.name }}</span>
                      <span class="drug-barcode">{{ c.code }} | {{ c.phone }}</span>
                      <span class="drug-price" v-if="c.balance > 0">عليه: {{ fmt(c.balance) }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="field-row">
                <label>رصيد العميل</label>
                <input type="text" class="input-field" :value="customerBalance" readonly style="color:var(--color-error); font-weight:bold" />
              </div>
              <div class="field-row">
                <label>نوع العميل</label>
                <input type="text" class="input-field" :value="customerType" readonly />
              </div>
            </div>

            <div class="header-block">
              <div class="block-title">بيانات التحصيل</div>
              <div class="field-row">
                <label>المبلغ المحصَّل</label>
                <input type="number" class="input-field" v-model.number="amount" min="0" @input="updateRemaining" />
              </div>
              <div class="field-row">
                <label>طريقة الدفع</label>
                <select class="input-field" v-model="payMethod">
                  <option value="cash">نقدي</option>
                  <option value="card">بطاقة</option>
                  <option value="bank">تحويل بنكي</option>
                  <option value="cheque">شيك</option>
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
              <div class="field-row">
                <label>المستند المرجعي</label>
                <input type="text" class="input-field" placeholder="رقم الشيك / الحوالة (اختياري)" v-model="reference" />
              </div>
            </div>
          </div>

          <!-- ملاحظات -->
          <div class="field-row notes-row">
            <label style="width:100px">ملاحظات</label>
            <textarea class="input-field" v-model="notes" rows="2" style="flex:1; height:auto; resize:vertical"></textarea>
          </div>

          <!-- ملخص العملية -->
          <div class="totals-bar">
            <div class="total-item"><span class="total-label">رصيد العميل قبل التحصيل:</span><span class="total-value" style="color:var(--color-error)">{{ fmt(customerBalance) }}</span></div>
            <div class="total-item"><span class="total-label">المبلغ المحصَّل:</span><span class="total-value total-net">{{ fmt(amount) }}</span></div>
            <div class="total-item"><span class="total-label">الرصيد المتبقي:</span><span class="total-value">{{ fmt(customerBalance - amount) }}</span></div>
          </div>

          <div class="form-actions">
            <button class="btn btn-success" @click="postCollection">✅ ترحيل القبض</button>
            <button class="btn btn-secondary" @click="printVoucher">🖨️ طباعة السند</button>
          </div>
        </div>

        <!-- تبويب سجل التحصيلات -->
        <div v-if="tab === 'list'" class="flex-col full-height">
          <div class="filter-bar">
            <input type="text" class="input-field" placeholder="بحث برقم السند أو اسم العميل..." v-model="listSearch" />
            <select class="input-field filter-select" v-model="listMethod">
              <option value="">جميع الطرق</option>
              <option value="cash">نقدي</option>
              <option value="card">بطاقة</option>
              <option value="bank">تحويل بنكي</option>
              <option value="cheque">شيك</option>
            </select>
            <input type="date" class="input-field filter-select" v-model="listDateFrom" />
            <input type="date" class="input-field filter-select" v-model="listDateTo" />
            <button class="btn btn-secondary" @click="clearFilters">✕ مسح</button>
          </div>

          <div class="table-scroll">
            <table class="dense-table">
              <thead>
                <tr>
                  <th style="width:30px">#</th>
                  <th>رقم السند</th>
                  <th>التاريخ</th>
                  <th>العميل</th>
                  <th>المبلغ</th>
                  <th>العملة</th>
                  <th>طريقة الدفع</th>
                  <th>الصندوق</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(col, i) in filteredCollections" :key="col.no">
                  <td>{{ i + 1 }}</td>
                  <td><span class="invoice-no">{{ col.no }}</span></td>
                  <td>{{ col.date }}</td>
                  <td>{{ col.customer }}</td>
                  <td><strong>{{ fmt(col.amount) }}</strong></td>
                  <td>{{ col.currency }}</td>
                  <td>{{ methodLabel(col.method) }}</td>
                  <td>{{ col.cashBox }}</td>
                  <td><span :class="['badge', 'badge-' + col.status]">{{ statusLabel(col.status) }}</span></td>
                  <td>
                    <button class="btn btn-secondary icon-btn" title="طباعة" @click="printExisting(col)">🖨️</button>
                    <button class="btn btn-secondary icon-btn" title="إلغاء" @click="cancelCollection(col)" v-if="col.status === 'posted'">🚫</button>
                  </td>
                </tr>
                <tr v-if="filteredCollections.length === 0">
                  <td colspan="10" class="empty-state">لا توجد تحصيلات مطابقة للفلتر</td>
                </tr>
              </tbody>
              <tfoot v-if="filteredCollections.length">
                <tr class="totals-row">
                  <td colspan="4"><strong>الإجمالي</strong></td>
                  <td><strong>{{ fmt(filteredTotal) }}</strong></td>
                  <td colspan="5"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- تبويب الأرصدة الآجلة -->
        <div v-if="tab === 'due'" class="flex-col full-height">
          <div class="table-scroll">
            <table class="dense-table">
              <thead>
                <tr>
                  <th style="width:30px">#</th>
                  <th>العميل / المريض</th>
                  <th>رقم الهاتف</th>
                  <th>نوع التأمين</th>
                  <th>الرصيد الآجل</th>
                  <th>آخر فاتورة</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(c, i) in debtorsSorted" :key="c.code" @dblclick="collectFromDebtor(c)">
                  <td>{{ i + 1 }}</td>
                  <td>{{ c.name }}</td>
                  <td>{{ c.phone }}</td>
                  <td>{{ c.insurance }}</td>
                  <td :class="{ 'text-danger': c.balance > 0 }"><strong>{{ fmt(c.balance) }}</strong></td>
                  <td>{{ c.lastInvoice }}</td>
                  <td>
                    <button class="btn btn-success" @click="collectFromDebtor(c)">💰 تحصيل</button>
                  </td>
                </tr>
                <tr v-if="debtorsSorted.length === 0">
                  <td colspan="7" class="empty-state">لا توجد أرصدة آجلة حاليًا</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="totals-row">
                  <td colspan="4"><strong>إجمالي المستحق</strong></td>
                  <td><strong>{{ fmt(totalDue) }}</strong></td>
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { patientsDatabase } from '../../data/sampleData.js'

const tab = ref('new')
const voucherNo = ref('RCV-2026-001')
const voucherDate = ref(new Date().toISOString().slice(0, 10))
const branch = ref('الفرع الرئيسي - صنعاء')
const cashBox = ref('صندوق المبيعات الرئيسي')
const currency = ref('YER - ريال يمني')
const customerName = ref('')
const customerQuery = ref('')
const showCustomerDropdown = ref(false)
const amount = ref(0)
const payMethod = ref('cash')
const reference = ref('')
const notes = ref('')

// فلاتر السجل
const listSearch = ref('')
const listMethod = ref('')
const listDateFrom = ref('')
const listDateTo = ref('')

// العملاء الآجلون (مع أرصدة وهمية للتجربة)
const debtorsData = ref([
  ...patientsDatabase.filter(p => p.balance > 0).map(p => ({
    ...p,
    lastInvoice: 'INV-2026-011',
  })),
  { code: 'PAT-021', name: 'سالم عبدالقادر', phone: '777000111', insurance: 'شركة الوطنية للتأمين', balance: 22000, visits: 4, lastInvoice: 'INV-2026-008' },
  { code: 'PAT-022', name: 'هدى محمد صالح', phone: '777000222', insurance: 'بدون تأمين', balance: 6500, visits: 9, lastInvoice: 'INV-2026-005' },
])

// سجل التحصيلات
const collectionsData = ref([
  { no: 'RCV-2026-005', date: '2026-08-12', customer: 'خالد عمر سعيد', amount: 10000, currency: 'YER - ريال يمني', method: 'cash', cashBox: 'صندوق المبيعات الرئيسي', status: 'posted' },
  { no: 'RCV-2026-004', date: '2026-08-11', customer: 'عائشة يوسف إبراهيم', amount: 5000, currency: 'YER - ريال يمني', method: 'bank', cashBox: 'بنك الكريمي', status: 'posted' },
  { no: 'RCV-2026-003', date: '2026-08-10', customer: 'علي حسين محمد', amount: 2000, currency: 'YER - ريال يمني', method: 'cash', cashBox: 'صندوق المبيعات الرئيسي', status: 'cancelled' },
  { no: 'RCV-2026-002', date: '2026-08-09', customer: 'فاطمة عبدالله حسن', amount: 3000, currency: 'YER - ريال يمني', method: 'card', cashBox: 'صندوق المبيعات الرئيسي', status: 'posted' },
])

const customerType = computed(() => {
  if (!customerName.value) return '—'
  return customersDatabase.value.find(c => c.name === customerName.value)?.insurance || 'عميل نقدي'
})

const customerBalance = computed(() => {
  if (!customerName.value) return 0
  return customersDatabase.value.find(c => c.name === customerName.value)?.balance || 0
})

const customersDatabase = computed(() => debtorsData.value)

// الدائنون فقط للعملاء الآجلين
const filteredDebtors = computed(() =>
  debtorsData.value.filter(c => c.balance > 0 && c.name.includes(customerQuery.value))
)

const debtorsSorted = computed(() =>
  [...debtorsData.value].sort((a, b) => b.balance - a.balance)
)

const totalDue = computed(() => debtorsData.value.reduce((s, c) => s + c.balance, 0))

const filteredCollections = computed(() =>
  collectionsData.value.filter(col => {
    if (listMethod.value && col.method !== listMethod.value) return false
    if (listDateFrom.value && col.date < listDateFrom.value) return false
    if (listDateTo.value && col.date > listDateTo.value) return false
    if (listSearch.value) {
      const q = listSearch.value
      return col.no.includes(q) || col.customer.includes(q)
    }
    return true
  })
)

const filteredTotal = computed(() => filteredCollections.value.reduce((s, c) => s + c.amount, 0))

function fmt(n) {
  if (n == null || isNaN(n)) return '0'
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function methodLabel(m) {
  return { cash: 'نقدي', card: 'بطاقة', bank: 'تحويل بنكي', cheque: 'شيك' }[m] || m
}

function statusLabel(s) {
  return { draft: 'مسودة', posted: 'مرحّلة', cancelled: 'ملغية' }[s] || s
}

function selectCustomer(c) {
  customerName.value = c.name
  showCustomerDropdown.value = false
}

function updateRemaining() {
  /* تُحسب تلقائيًا عبر computed */
}

function postCollection() {
  if (!customerName.value) {
    alert('⚠️ يجب اختيار العميل أولاً')
    return
  }
  if (!amount.value || amount.value <= 0) {
    alert('⚠️ يجب إدخال مبلغ صحيح أكبر من صفر')
    return
  }
  if (amount.value > customerBalance.value) {
    if (!confirm('⚠️ المبلغ أكبر من رصيد العميل المستحق. هل تريد المتابعة؟')) return
  }
  // تخفيض رصيد العميل
  const debtor = debtorsData.value.find(c => c.name === customerName.value)
  if (debtor) debtor.balance = Math.max(0, debtor.balance - amount.value)

  collectionsData.value.unshift({
    no: voucherNo.value,
    date: voucherDate.value,
    customer: customerName.value,
    amount: amount.value,
    currency: currency.value,
    method: payMethod.value,
    cashBox: cashBox.value,
    status: 'posted',
  })
  alert('✅ تم ترحيل سند القبض: ' + voucherNo.value + '\nالمبلغ: ' + fmt(amount.value))
  nextVoucher()
  tab.value = 'list'
}

function nextVoucher() {
  const n = collectionsData.value.length + 1
  voucherNo.value = 'RCV-2026-' + String(n).padStart(3, '0')
  customerName.value = ''
  amount.value = 0
  reference.value = ''
  notes.value = ''
  customerQuery.value = ''
}

function printVoucher() {
  if (!customerName.value || !amount.value) {
    alert('⚠️ أكمل بيانات السند أولاً')
    return
  }
  alert('🖨️ طباعة سند القبض ' + voucherNo.value + '\nالعميل: ' + customerName.value + '\nالمبلغ: ' + fmt(amount.value) + ' ' + currency.value)
}

function printExisting(col) {
  alert('🖨️ طباعة السند ' + col.no + ' للعميل: ' + col.customer)
}

function cancelCollection(col) {
  if (confirm('هل تريد إلغاء السند ' + col.no + '؟')) {
    // إعادة الرصيد للعميل
    const debtor = debtorsData.value.find(c => c.name === col.customer)
    if (debtor) debtor.balance += col.amount
    col.status = 'cancelled'
    alert('تم إلغاء السند: ' + col.no)
  }
}

function collectFromDebtor(c) {
  customerName.value = c.name
  amount.value = c.balance
  tab.value = 'new'
}

function clearFilters() {
  listSearch.value = ''
  listMethod.value = ''
  listDateFrom.value = ''
  listDateTo.value = ''
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

.screen-tab:hover { background: var(--color-bg-primary); }
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
  width: 95px;
  font-size: var(--font-size-sm);
  flex-shrink: 0;
  color: var(--color-text-secondary);
}

.notes-row {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  padding: 4px 6px;
  margin-bottom: 6px;
}

.input-with-search {
  position: relative;
  flex: 1;
  display: flex;
}

.input-with-search .input-field { flex: 1; }

.search-btn {
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  cursor: pointer;
  border-radius: 2px;
}

.search-btn:hover { background: var(--color-primary-light); }

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

.dropdown-item:hover { background: var(--color-row-hover); }

.drug-name { font-weight: bold; }
.drug-barcode { color: var(--color-text-secondary); font-size: 11px; }
.drug-price { color: var(--color-error); font-weight: bold; }

.table-scroll {
  flex: 1;
  overflow: auto;
  background: var(--color-bg-primary);
  min-height: 0;
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

.filter-select { width: 130px; }

.invoice-no { color: var(--color-primary); font-weight: bold; }

.text-danger { color: var(--color-error); }

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 6px;
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

.totals-row td {
  background: var(--color-primary-light) !important;
  border-top: 2px solid var(--color-primary);
}

.icon-btn { padding: 0 6px; }

.flex-col { flex-direction: column; }

@media (max-width: 768px) {
  .screen-layout { flex-direction: column; }
  .screen-sidebar {
    width: 100%;
    flex-direction: row;
    overflow-x: auto;
  }
  .screen-tab { width: auto; min-width: 110px; }
  .invoice-header { flex-direction: column; }
  .field-row label { width: 80px; }
}
</style>
