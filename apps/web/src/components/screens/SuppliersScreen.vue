<template>
  <!-- ========== شاشة الموردين ========== -->
  <div class="window-body flex-col">
    <div class="screen-layout">
      <div class="screen-sidebar">
        <button :class="['screen-tab', { active: tab === 'list' }]" @click="tab = 'list'">📋 الموردون</button>
        <button :class="['screen-tab', { active: tab === 'balances' }]" @click="tab = 'balances'">💳 الأرصدة المستحقة</button>
        <button :class="['screen-tab', { active: tab === 'payments' }]" @click="tab = 'payments'">💰 السداد للموردين</button>
      </div>

      <div class="screen-content">
        <!-- تبويب قائمة الموردين -->
        <div v-if="tab === 'list'" class="flex-col full-height">
          <div class="screen-toolbar">
            <button class="btn btn-primary" @click="showForm = true">➕ مورد جديد</button>
            <input type="text" class="input-field" placeholder="بحث باسم المورد أو الكود..." v-model="search" style="width:250px" />
          </div>

          <div class="table-scroll">
            <table class="dense-table">
              <thead>
                <tr>
                  <th style="width:30px">#</th>
                  <th>كود المورد</th>
                  <th>اسم المورد</th>
                  <th>البلد / المدينة</th>
                  <th>الهاتف</th>
                  <th>البريد الإلكتروني</th>
                  <th>تخصص التوريد</th>
                  <th>آجل (يوم)</th>
                  <th>الرصيد المستحق</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(s, i) in filteredSuppliers" :key="s.code">
                  <td>{{ i + 1 }}</td>
                  <td>{{ s.code }}</td>
                  <td><strong>{{ s.name }}</strong></td>
                  <td>{{ s.city }}</td>
                  <td dir="ltr">{{ s.phone }}</td>
                  <td dir="ltr">{{ s.email }}</td>
                  <td>{{ s.category }}</td>
                  <td>{{ s.creditDays }}</td>
                  <td :class="{ 'text-danger': s.balance > 0 }"><strong>{{ fmt(s.balance) }}</strong></td>
                  <td><span :class="['badge', s.active ? 'badge-posted' : 'badge-cancelled']">{{ s.active ? 'نشط' : 'متوقف' }}</span></td>
                  <td>
                    <button class="btn btn-secondary icon-btn" title="تعديل" @click="editSupplier(s)">✏️</button>
                    <button class="btn btn-secondary icon-btn" title="تجميد" @click="s.active = !s.active">{{ s.active ? '🚫' : '✅' }}</button>
                  </td>
                </tr>
                <tr v-if="filteredSuppliers.length === 0">
                  <td colspan="11" class="empty-state">لا توجد موردين مطابقة للبحث</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- نموذج مورد جديد/تعديل -->
          <div v-if="showForm" class="form-modal-overlay" @click.self="showForm = false">
            <div class="form-modal">
              <div class="modal-title">
                <span>{{ editingSupplier ? 'تعديل مورد: ' + editingSupplier.name : 'مورد جديد' }}</span>
                <button class="close-btn" @click="showForm = false">✕</button>
              </div>
              <div class="modal-body">
                <div class="form-grid">
                  <div class="field-row">
                    <label>كود المورد</label>
                    <input type="text" class="input-field" v-model="form.code" readonly />
                  </div>
                  <div class="field-row">
                    <label>اسم المورد *</label>
                    <input type="text" class="input-field" v-model="form.name" />
                  </div>
                  <div class="field-row">
                    <label>البلد / المدينة</label>
                    <input type="text" class="input-field" v-model="form.city" placeholder="صنعاء" />
                  </div>
                  <div class="field-row">
                    <label>الهاتف *</label>
                    <input type="text" class="input-field" v-model="form.phone" placeholder="771XXXXXX" />
                  </div>
                  <div class="field-row">
                    <label>البريد الإلكتروني</label>
                    <input type="email" class="input-field" v-model="form.email" placeholder="supplier@example.com" />
                  </div>
                  <div class="field-row">
                    <label>تخصص التوريد</label>
                    <select class="input-field" v-model="form.category">
                      <option>أدوية مستوردة</option>
                      <option>أدوية محلية</option>
                      <option>مستلزمات طبية</option>
                      <option>معدات صيدلية</option>
                    </select>
                  </div>
                  <div class="field-row">
                    <label>آجل السداد (يوم)</label>
                    <input type="number" class="input-field" v-model.number="form.creditDays" min="0" />
                  </div>
                  <div class="field-row">
                    <label>الرصيد الافتتاحي</label>
                    <input type="number" class="input-field" v-model.number="form.balance" min="0" />
                  </div>
                </div>
              </div>
              <div class="form-actions">
                <button class="btn btn-primary" @click="saveSupplier">💾 حفظ المورد</button>
                <button class="btn btn-secondary" @click="showForm = false">إلغاء</button>
              </div>
            </div>
          </div>
        </div>

        <!-- تبويب الأرصدة المستحقة -->
        <div v-if="tab === 'balances'" class="flex-col full-height">
          <div class="table-scroll">
            <table class="dense-table">
              <thead>
                <tr>
                  <th style="width:30px">#</th>
                  <th>المورد</th>
                  <th>آجل السداد</th>
                  <th>الرصيد المستحق</th>
                  <th>متأخر أكثر من 30 يوم</th>
                  <th>متأخر أكثر من 60 يوم</th>
                  <th>متأخر أكثر من 90 يوم</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(s, i) in suppliersWithAging" :key="s.code" @dblclick="tab = 'payments'">
                  <td>{{ i + 1 }}</td>
                  <td><strong>{{ s.name }}</strong></td>
                  <td>{{ s.creditDays }} يوم</td>
                  <td :class="{ 'text-danger': s.balance > 0 }"><strong>{{ fmt(s.balance) }}</strong></td>
                  <td>{{ fmt(s.balance * 0.4) }}</td>
                  <td>{{ fmt(s.balance * 0.3) }}</td>
                  <td>{{ fmt(s.balance * 0.3) }}</td>
                  <td>
                    <span :class="['badge', s.balance === 0 ? 'badge-posted' : 'badge-draft']">
                      {{ s.balance === 0 ? 'خالٍ' : 'عليه مستحقات' }}
                    </span>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="totals-row">
                  <td colspan="3"><strong>إجمالي المستحقات</strong></td>
                  <td><strong>{{ fmt(totalPayable) }}</strong></td>
                  <td colspan="4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- تبويب السداد للموردين -->
        <div v-if="tab === 'payments'" class="flex-col full-height">
          <div class="screen-toolbar">
            <button class="btn btn-primary" @click="showPayForm = true">➕ سند سداد جديد</button>
            <input type="text" class="input-field" placeholder="بحث في سجل السداد..." v-model="paySearch" style="width:250px" />
          </div>

          <div class="table-scroll">
            <table class="dense-table">
              <thead>
                <tr>
                  <th style="width:30px">#</th>
                  <th>رقم السند</th>
                  <th>التاريخ</th>
                  <th>المورد</th>
                  <th>المبلغ</th>
                  <th>طريقة السداد</th>
                  <th>الحساب</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, i) in filteredPayments" :key="p.no">
                  <td>{{ i + 1 }}</td>
                  <td><span class="invoice-no">{{ p.no }}</span></td>
                  <td>{{ p.date }}</td>
                  <td>{{ p.supplier }}</td>
                  <td><strong>{{ fmt(p.amount) }}</strong></td>
                  <td>{{ p.method }}</td>
                  <td>{{ p.account }}</td>
                  <td><span :class="['badge', 'badge-' + p.status]">{{ statusLabel(p.status) }}</span></td>
                  <td>
                    <button class="btn btn-secondary icon-btn" title="إلغاء" @click="cancelPayment(p)" v-if="p.status === 'posted'">🚫</button>
                  </td>
                </tr>
                <tr v-if="filteredPayments.length === 0">
                  <td colspan="9" class="empty-state">لا توجد سدادات مطابقة</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- نموذج سند السداد -->
          <div v-if="showPayForm" class="form-modal-overlay" @click.self="showPayForm = false">
            <div class="form-modal">
              <div class="modal-title">
                <span>سند سداد لمورد - {{ payForm.no }}</span>
                <button class="close-btn" @click="showPayForm = false">✕</button>
              </div>
              <div class="modal-body">
                <div class="form-grid">
                  <div class="field-row">
                    <label>المورد *</label>
                    <select class="input-field" v-model="payForm.supplier">
                      <option value="">— اختر المورد —</option>
                      <option v-for="s in suppliers" :key="s.code" :value="s.name">{{ s.name }} (عليه: {{ fmt(s.balance) }})</option>
                    </select>
                  </div>
                  <div class="field-row">
                    <label>المبلغ *</label>
                    <input type="number" class="input-field" v-model.number="payForm.amount" min="0" />
                  </div>
                  <div class="field-row">
                    <label>التاريخ</label>
                    <input type="date" class="input-field" v-model="payForm.date" />
                  </div>
                  <div class="field-row">
                    <label>طريقة السداد</label>
                    <select class="input-field" v-model="payForm.method">
                      <option>نقدي</option>
                      <option>تحويل بنكي</option>
                      <option>شيك</option>
                    </select>
                  </div>
                  <div class="field-row">
                    <label>الحساب / الصندوق</label>
                    <select class="input-field" v-model="payForm.account">
                      <option>صندوق المبيعات الرئيسي</option>
                      <option>بنك الكريمي</option>
                      <option>بنك اليمن والكويت</option>
                    </select>
                  </div>
                  <div class="field-row">
                    <label>ملاحظات</label>
                    <input type="text" class="input-field" v-model="payForm.notes" />
                  </div>
                </div>
              </div>
              <div class="form-actions">
                <button class="btn btn-primary" @click="savePayment">💾 ترحيل السداد</button>
                <button class="btn btn-secondary" @click="showPayForm = false">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const tab = ref('list')
const search = ref('')
const paySearch = ref('')
const showForm = ref(false)
const showPayForm = ref(false)
const editingSupplier = ref(null)

const suppliers = ref([
  { code: 'SUP-001', name: 'شركة الأدوية المتحدة', city: 'صنعاء', phone: '012233445', email: 'info@udc.ye', category: 'أدوية مستوردة', creditDays: 30, balance: 450000, active: true },
  { code: 'SUP-002', name: 'مؤسسة الشفاء للتوريدات', city: 'عدن', phone: '023344556', email: 'sales@shifa.ye', category: 'أدوية محلية', creditDays: 15, balance: 120000, active: true },
  { code: 'SUP-003', name: 'شركة الخليج للأدوية', city: 'دبي', phone: '97145556677', email: 'sales@gulfpharma.ae', category: 'أدوية مستوردة', creditDays: 45, balance: 0, active: true },
  { code: 'SUP-004', name: 'المستودع الدوائي اليمني', city: 'تعز', phone: '045566778', email: 'mds@ye', category: 'مستلزمات طبية', creditDays: 30, balance: 85000, active: true },
  { code: 'SUP-005', name: 'شركة الحكمة', city: 'عمّان', phone: '96264445566', email: 'export@hikma.jo', category: 'أدوية مستوردة', creditDays: 60, balance: 210000, active: true },
  { code: 'SUP-006', name: 'مؤسسة النور الطبية', city: 'صنعاء', phone: '017788990', email: '', category: 'معدات صيدلية', creditDays: 0, balance: 0, active: false },
])

const payments = ref([
  { no: 'PAY-2026-003', date: '2026-08-12', supplier: 'مؤسسة الشفاء للتوريدات', amount: 50000, method: 'تحويل بنكي', account: 'بنك الكريمي', status: 'posted' },
  { no: 'PAY-2026-002', date: '2026-08-10', supplier: 'شركة الأدوية المتحدة', amount: 100000, method: 'شيك', account: 'بنك اليمن والكويت', status: 'posted' },
  { no: 'PAY-2026-001', date: '2026-08-08', supplier: 'المستودع الدوائي اليمني', amount: 30000, method: 'نقدي', account: 'صندوق المبيعات الرئيسي', status: 'posted' },
])

const form = ref({ code: '', name: '', city: '', phone: '', email: '', category: 'أدوية مستوردة', creditDays: 30, balance: 0 })
const payForm = ref({ no: 'PAY-2026-004', supplier: '', amount: 0, date: new Date().toISOString().slice(0, 10), method: 'نقدي', account: 'صندوق المبيعات الرئيسي', notes: '' })

const filteredSuppliers = computed(() =>
  suppliers.value.filter(s => {
    if (!search.value) return true
    const q = search.value
    return s.name.includes(q) || s.code.includes(q) || s.city.includes(q)
  })
)

const suppliersWithAging = computed(() => suppliers.value)
const totalPayable = computed(() => suppliers.value.reduce((s, x) => s + x.balance, 0))

const filteredPayments = computed(() =>
  payments.value.filter(p => !paySearch.value || p.supplier.includes(paySearch.value) || p.no.includes(paySearch.value))
)

function fmt(n) {
  if (n == null || isNaN(n)) return '0'
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function statusLabel(s) {
  return { draft: 'مسودة', posted: 'مرحّلة', cancelled: 'ملغية' }[s] || s
}

function editSupplier(s) {
  editingSupplier.value = s
  form.value = { ...s }
  showForm.value = true
}

function saveSupplier() {
  if (!form.value.name || !form.value.phone) {
    alert('⚠️ يجب إدخال اسم المورد والهاتف')
    return
  }
  if (editingSupplier.value) {
    Object.assign(editingSupplier.value, { ...form.value })
    editingSupplier.value = null
  } else {
    const code = 'SUP-' + String(suppliers.value.length + 1).padStart(3, '0')
    suppliers.value.push({ ...form.value, code, active: true })
  }
  showForm.value = false
  resetForm()
  alert('✅ تم حفظ المورد بنجاح')
}

function resetForm() {
  form.value = { code: '', name: '', city: '', phone: '', email: '', category: 'أدوية مستوردة', creditDays: 30, balance: 0 }
  editingSupplier.value = null
}

function savePayment() {
  if (!payForm.value.supplier || !payForm.value.amount) {
    alert('⚠️ يجب اختيار المورد وإدخال المبلغ')
    return
  }
  const supplier = suppliers.value.find(s => s.name === payForm.value.supplier)
  if (supplier) {
    if (payForm.value.amount > supplier.balance) {
      if (!confirm('⚠️ المبلغ أكبر من الرصيد المستحق للمورد. هل تريد المتابعة؟')) return
    }
    supplier.balance = Math.max(0, supplier.balance - payForm.value.amount)
  }
  payments.value.unshift({ ...payForm.value, status: 'posted' })
  showPayForm.value = false
  payForm.value = { no: 'PAY-2026-' + String(payments.value.length + 1).padStart(3, '0'), supplier: '', amount: 0, date: new Date().toISOString().slice(0, 10), method: 'نقدي', account: 'صندوق المبيعات الرئيسي', notes: '' }
  alert('✅ تم ترحيل سند السداد')
}

function cancelPayment(p) {
  if (confirm('إلغاء سند السداد ' + p.no + '؟')) {
    const supplier = suppliers.value.find(s => s.name === p.supplier)
    if (supplier) supplier.balance += p.amount
    p.status = 'cancelled'
  }
}
</script>

<style scoped>
.screen-layout { display: flex; flex: 1; gap: 8px; min-height: 0; }

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

.screen-content { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.full-height { flex: 1; display: flex; flex-direction: column; min-height: 0; }

.screen-toolbar {
  display: flex;
  gap: 6px;
  padding: 6px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  margin-bottom: 6px;
  flex-shrink: 0;
  align-items: center;
}

.table-scroll { flex: 1; overflow: auto; background: var(--color-bg-primary); min-height: 0; }

.empty-state { text-align: center; color: var(--color-text-secondary); padding: 16px; }
.text-danger { color: var(--color-error); }
.invoice-no { color: var(--color-primary); font-weight: bold; }

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}

.field-row label {
  width: 100px;
  font-size: var(--font-size-sm);
  flex-shrink: 0;
  color: var(--color-text-secondary);
}

.form-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-modal {
  background: var(--color-bg-primary);
  border: 2px solid var(--color-primary);
  border-radius: 4px;
  width: 520px;
  max-width: 92vw;
  box-shadow: 4px 4px 16px rgba(0,0,0,0.3);
}

.modal-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--color-primary);
  color: white;
  font-weight: bold;
  padding: 4px 10px;
  font-size: var(--font-size-base);
}

.close-btn {
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 14px;
}

.modal-body { padding: 10px; }

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 6px 10px;
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
}

.totals-row td {
  background: var(--color-primary-light) !important;
  border-top: 2px solid var(--color-primary);
}

.icon-btn { padding: 0 6px; }

.flex-col { flex-direction: column; }

@media (max-width: 768px) {
  .screen-layout { flex-direction: column; }
  .screen-sidebar { width: 100%; flex-direction: row; overflow-x: auto; }
  .screen-tab { width: auto; min-width: 110px; }
  .form-grid { grid-template-columns: 1fr; }
}
</style>
