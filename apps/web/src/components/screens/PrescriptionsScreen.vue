<template>
  <!-- ========== شاشة الوصفات الطبية ========== -->
  <div class="screen-container">
    <!-- شريط الأدوات العلوي -->
    <div class="screen-toolbar">
      <div class="toolbar-right">
        <input
          type="text"
          class="input-field search-input"
          placeholder="🔍 ابحث برقم الوصفة، المريض، الطبيب..."
          v-model="search"
        />
        <select class="input-field filter-select" v-model="statusFilter">
          <option value="all">كل الحالات</option>
          <option value="pending">بانتظار الصرف</option>
          <option value="dispensed">تم الصرف</option>
          <option value="expired">منتهية</option>
        </select>
        <input type="date" class="input-field date-input" v-model="dateFrom" title="من تاريخ" />
        <input type="date" class="input-field date-input" v-model="dateTo" title="إلى تاريخ" />
      </div>
      <div class="toolbar-left">
        <button class="btn btn-primary" @click="openForm(null)">✚ وصفة جديدة</button>
      </div>
    </div>

    <!-- جدول الوصفات -->
    <div class="table-container flex-1">
      <table class="dense-table">
        <thead>
          <tr>
            <th style="width:30px">#</th>
            <th style="width:115px">رقم الوصفة</th>
            <th style="width:100px">التاريخ</th>
            <th>المريض</th>
            <th style="width:140px">الطبيب</th>
            <th style="width:60px">عدد الأدوية</th>
            <th style="width:90px">إجمالي الوصفة</th>
            <th style="width:85px">الحالة</th>
            <th style="width:170px">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(rx, i) in filteredRx" :key="rx.number" @dblclick="openForm(rx)">
            <td>{{ i + 1 }}</td>
            <td><span class="rx-no">{{ rx.number }}</span></td>
            <td>{{ rx.date }}</td>
            <td>
              <span class="patient-name">{{ rx.patient }}</span>
              <span v-if="rx.insurance !== 'بدون تأمين'" class="insurance-tag">{{ rx.insurance }}</span>
            </td>
            <td>{{ rx.doctor }}</td>
            <td>{{ rx.itemsCount }}</td>
            <td><strong>{{ fmt(rx.total) }}</strong></td>
            <td>
              <span class="status-badge" :class="'status-' + rx.status">
                {{ rx.status === 'pending' ? 'بانتظار الصرف' : rx.status === 'dispensed' ? 'تم الصرف' : 'منتهية' }}
              </span>
            </td>
            <td>
              <button class="action-btn view" @click.stop="openForm(rx)">📋 عرض/تعديل</button>
              <button v-if="rx.status === 'pending'" class="action-btn dispense" @click.stop="dispense(rx)">💊 صرف</button>
            </td>
          </tr>
          <tr v-if="filteredRx.length === 0">
            <td colspan="9" class="empty-state">لا توجد وصفات مطابقة للفلترة.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- شريط الإجماليات السفلي -->
    <div class="totals-bar">
      <div class="total-item">
        <span class="total-label">عدد الوصفات:</span>
        <span class="total-value">{{ filteredRx.length }}</span>
      </div>
      <div class="total-item">
        <span class="total-label">بانتظار الصرف:</span>
        <span class="total-value text-warning">{{ filteredRx.filter(r => r.status === 'pending').length }}</span>
      </div>
      <div class="total-item">
        <span class="total-label">تم الصرف:</span>
        <span class="total-value text-success">{{ filteredRx.filter(r => r.status === 'dispensed').length }}</span>
      </div>
      <div class="total-item">
        <span class="total-label">إجمالي الوصفات:</span>
        <span class="total-value">{{ fmt(sumTotal) }}</span>
      </div>
    </div>

    <!-- نموذج الوصفة (Modal) -->
    <div v-if="showForm" class="lookup-overlay" @mousedown.self="showForm = false">
      <div class="rx-modal">
        <div class="rx-modal-header">
          <span>{{ editingRx ? 'عرض / تعديل الوصفة ' + editingRx.number : 'وصفة طبية جديدة' }}</span>
          <button class="lookup-close" @click="showForm = false">✕</button>
        </div>
        <div class="rx-modal-body">
          <!-- بيانات الوصفة -->
          <div class="rx-header-row">
            <div class="field-group">
              <label>رقم الوصفة</label>
              <input type="text" class="input-field" v-model="form.number" :readonly="editingRx !== null" />
            </div>
            <div class="field-group">
              <label>التاريخ</label>
              <input type="date" class="input-field" v-model="form.date" />
            </div>
            <div class="field-group">
              <label>المريض</label>
              <div class="input-with-search">
                <input
                  type="text"
                  class="input-field"
                  placeholder="ابحث عن مريض..."
                  v-model="form.patient"
                  @input="filterPatient()"
                  @blur="setTimeout(() => (showPatientDropdown = false), 200)"
                />
                <div v-if="showPatientDropdown && filteredPatients.length" class="search-dropdown">
                  <div
                    v-for="p in filteredPatients.slice(0, 6)"
                    :key="p.code"
                    class="dropdown-item"
                    @mousedown.prevent="selectPatient(p)"
                  >
                    <span class="name">{{ p.name }}</span>
                    <span class="sub">{{ p.phone }} | {{ p.insurance }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="field-group">
              <label>الطبيب</label>
              <div class="input-with-search">
                <input
                  type="text"
                  class="input-field"
                  placeholder="ابحث عن طبيب..."
                  v-model="form.doctor"
                  @input="filterDoctor()"
                  @blur="setTimeout(() => (showDoctorDropdown = false), 200)"
                />
                <div v-if="showDoctorDropdown && filteredDoctors.length" class="search-dropdown">
                  <div
                    v-for="d in filteredDoctors.slice(0, 6)"
                    :key="d.code"
                    class="dropdown-item"
                    @mousedown.prevent="selectDoctor(d)"
                  >
                    <span class="name">{{ d.name }}</span>
                    <span class="sub">{{ d.specialty }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- جدول أدوية الوصفة -->
          <div class="rx-items-title">أدوية الوصفة</div>
          <div class="rx-items-table">
            <table class="dense-table">
              <thead>
                <tr>
                  <th style="width:25px">#</th>
                  <th>الدواء</th>
                  <th style="width:130px">الجرعة / التعليمات</th>
                  <th style="width:70px">الكمية</th>
                  <th style="width:60px">الوحدة</th>
                  <th style="width:25px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, i) in form.items" :key="item.id">
                  <td>{{ i + 1 }}</td>
                  <td>
                    <div class="input-with-search">
                      <input
                        type="text"
                        class="table-input"
                        placeholder="ابحث عن دواء..."
                        v-model="item.search"
                        @input="filterDrug(item)"
                        @blur="setTimeout(() => (item.showDropdown = false), 200)"
                      />
                      <div v-if="item.showDropdown && item.filtered.length" class="search-dropdown dropdown-over-table">
                        <div
                          v-for="d in item.filtered.slice(0, 6)"
                          :key="d.code"
                          class="dropdown-item"
                          @mousedown.prevent="fillDrug(item, d)"
                        >
                          <span class="name">{{ d.name }}</span>
                          <span class="sub">{{ d.code }} | {{ d.sellPrice }} | رصيد: {{ d.stock }}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td><input type="text" class="table-input" placeholder="1×3 يومياً بعد الأكل" v-model="item.dose" /></td>
                  <td><input type="number" class="table-input qty" v-model.number="item.qty" min="1" /></td>
                  <td>{{ item.unit || '—' }}</td>
                  <td><button class="delete-btn" @click="removeItem(item)">✕</button></td>
                </tr>
              </tbody>
            </table>
            <button class="add-item-btn" @click="addItem">+ إضافة دواء</button>
          </div>

          <div class="rx-notes">
            <label>ملاحظات الطبيب</label>
            <textarea class="input-field notes" v-model="form.notes" placeholder="ملاحظات إضافية..."></textarea>
          </div>
        </div>
        <div class="rx-modal-footer">
          <span class="rx-total">
            عدد الأدوية: <strong>{{ form.items.filter(i => i.drug).length }}</strong>
          </span>
          <div class="footer-actions">
            <button class="btn btn-secondary" @click="showForm = false">إلغاء</button>
            <button class="btn btn-primary" @click="saveRx">💾 حفظ الوصفة</button>
            <button v-if="editingRx && editingRx.status === 'pending'" class="btn btn-success" @click="saveAndDispense">💊 حفظ وصرف</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { sampleDrugs, patientsDatabase, doctorsDatabase } from '../../data/sampleData.js'

// ---- بيانات تجريبية للوصفات ----
const rxList = ref([
  {
    number: 'RX-44201', date: '2026-08-12', patient: 'أحمد محمد علي', doctor: 'د. عبدالكريم الشميري',
    insurance: 'بدون تأمين', status: 'dispensed', itemsCount: 3, total: 18500,
    items: [
      { drug: 'بنادول 500mg', dose: '1×3 يومياً', qty: 3, unit: 'علبة' },
      { drug: 'زيرتك 10mg', dose: 'حبة عند الحاجة', qty: 1, unit: 'علبة' },
      { drug: 'أوميبرازول 20mg', dose: '1×1 صباحاً قبل الأكل', qty: 2, unit: 'علبة' },
    ],
    notes: 'متابعة خلال أسبوع',
  },
  {
    number: 'RX-44198', date: '2026-08-12', patient: 'فاطمة عبدالله حسن', doctor: 'د. سمية المقطري',
    insurance: 'شركة التأمين الوطنية', status: 'dispensed', itemsCount: 3, total: 24000,
    items: [
      { drug: 'أوجمنتين 625mg', dose: '1×3 يومياً لمدة 7 أيام', qty: 2, unit: 'علبة' },
      { drug: 'شراب برونكikum', dose: 'ملعقة 3 مرات يومياً', qty: 1, unit: 'علبة' },
      { drug: 'زيرتك 10mg', dose: 'حبة مساءً', qty: 1, unit: 'علبة' },
    ],
    notes: '',
  },
  {
    number: 'RX-44175', date: '2026-08-11', patient: 'خالد عمر سعيد', doctor: 'د. فيصل الحيمي',
    insurance: 'بدون تأمين', status: 'pending', itemsCount: 3, total: 35500,
    items: [
      { drug: 'كونكور 5mg', dose: '1×1 صباحاً', qty: 3, unit: 'علبة' },
      { drug: 'أسبرين 100mg', dose: '1×1 يومياً', qty: 4, unit: 'علبة' },
      { drug: 'ليبيتر 20mg', dose: '1×1 مساءً', qty: 2, unit: 'علبة' },
    ],
    notes: 'مريض قلب — قياس ضغط أسبوعي',
  },
  {
    number: 'RX-44150', date: '2026-08-10', patient: 'مريم عبدالرحمن', doctor: 'د. منى السعيدي',
    insurance: 'شركة التأمين الوطنية', status: 'pending', itemsCount: 2, total: 23500,
    items: [
      { drug: 'جلوكوفاج 850mg', dose: '1×2 مع الأكل', qty: 3, unit: 'علبة' },
      { drug: 'فيتامين D3 1000IU', dose: '1×1 يومياً', qty: 1, unit: 'علبة' },
    ],
    notes: 'فحص HbA1c بعد شهر',
  },
  {
    number: 'RX-44132', date: '2026-08-09', patient: 'نورة أحمد صالح', doctor: 'د. ريم الجنيد',
    insurance: 'شركة سبأ للتأمين', status: 'dispensed', itemsCount: 2, total: 14800,
    items: [
      { drug: 'إندرال 40mg', dose: '1×2 يومياً', qty: 5, unit: 'علبة' },
      { drug: 'زنك 50mg', dose: '1×1 يومياً', qty: 2, unit: 'علبة' },
    ],
    notes: '',
  },
  {
    number: 'RX-44090', date: '2026-08-07', patient: 'عائشة يوسف إبراهيم', doctor: 'د. ياسر النعماني',
    insurance: 'شركة سبأ للتأمين', status: 'pending', itemsCount: 3, total: 24500,
    items: [
      { drug: 'نكسيوم 40mg', dose: '1×1 صباحاً', qty: 2, unit: 'علبة' },
      { drug: 'فلاجيل 500mg', dose: '1×3 يومياً 5 أيام', qty: 2, unit: 'علبة' },
      { drug: 'أوميبرازول 20mg', dose: '1×1 مساءً', qty: 1, unit: 'علبة' },
    ],
    notes: 'حساسية من البنسلين',
  },
])

// ---- حالة الفلترة ----
const search = ref('')
const statusFilter = ref('all')
const dateFrom = ref('')
const dateTo = ref('')

const filteredRx = computed(() => {
  const q = search.value.toLowerCase().trim()
  return rxList.value.filter((rx) => {
    if (q && !(
      rx.number.toLowerCase().includes(q) ||
      rx.patient.toLowerCase().includes(q) ||
      rx.doctor.toLowerCase().includes(q)
    )) return false
    if (statusFilter.value !== 'all' && rx.status !== statusFilter.value) return false
    if (dateFrom.value && rx.date < dateFrom.value) return false
    if (dateTo.value && rx.date > dateTo.value) return false
    return true
  })
})

const sumTotal = computed(() => filteredRx.value.reduce((s, r) => s + r.total, 0))

// ---- النموذج ----
const showForm = ref(false)
const editingRx = ref(null)
const showPatientDropdown = ref(false)
const showDoctorDropdown = ref(false)

let itemSeq = 0
function blankItem() {
  return { id: itemSeq++, drug: '', search: '', dose: '', qty: 1, unit: '', filtered: [], showDropdown: false }
}

const form = ref(blankForm())

function blankForm() {
  return {
    number: 'RX-' + (44202 + Math.floor(Math.random() * 900)),
    date: new Date().toISOString().slice(0, 10),
    patient: '',
    doctor: '',
    notes: '',
    items: [blankItem()],
  }
}

function addItem() {
  form.value.items.push(blankItem())
}

function removeItem(item) {
  const idx = form.value.items.indexOf(item)
  if (form.value.items.length > 1) form.value.items.splice(idx, 1)
  else form.value.items = [blankItem()]
}

function filterDrug(item) {
  const q = item.search.toLowerCase().trim()
  if (q.length < 1) { item.showDropdown = false; item.filtered = []; return }
  item.filtered = sampleDrugs.filter((d) =>
    d.name.toLowerCase().includes(q) || d.scientific.toLowerCase().includes(q) || d.code.toLowerCase().includes(q)
  )
  item.showDropdown = item.filtered.length > 0
}

function fillDrug(item, drug) {
  item.drug = drug.name
  item.search = drug.name
  item.unit = drug.unit
  item.showDropdown = false
}

const patientQuery = ref('')
const doctorQuery = ref('')

function filterPatient() {
  patientQuery.value = form.value.patient
  showPatientDropdown.value = patientQuery.value.length > 0
}
const filteredPatients = computed(() => {
  const q = patientQuery.value.toLowerCase().trim()
  if (!q) return []
  return patientsDatabase.filter((p) =>
    p.name.toLowerCase().includes(q) || p.phone.includes(q)
  )
})
function selectPatient(p) {
  form.value.patient = p.name
  showPatientDropdown.value = false
}

function filterDoctor() {
  doctorQuery.value = form.value.doctor
  showDoctorDropdown.value = doctorQuery.value.length > 0
}
const filteredDoctors = computed(() => {
  const q = doctorQuery.value.toLowerCase().trim()
  if (!q) return []
  return doctorsDatabase.filter((d) =>
    d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q)
  )
})
function selectDoctor(d) {
  form.value.doctor = d.name
  showDoctorDropdown.value = false
}

// ---- الإجراءات ----
function fmt(n) {
  return String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function openForm(rx) {
  if (rx) {
    editingRx.value = rx
    form.value = {
      number: rx.number,
      date: rx.date,
      patient: rx.patient,
      doctor: rx.doctor,
      notes: rx.notes || '',
      items: rx.items.map((it) => ({
        id: itemSeq++,
        drug: it.drug,
        search: it.drug,
        dose: it.dose,
        qty: it.qty,
        unit: it.unit,
        filtered: [],
        showDropdown: false,
      })),
    }
  } else {
    editingRx.value = null
    form.value = blankForm()
  }
  showForm.value = true
}

function collectRx() {
  const items = form.value.items.filter((i) => i.drug)
  const itemsCount = items.length
  const total = items.reduce((s, i) => {
    const drug = sampleDrugs.find((d) => d.name === i.drug)
    return s + (drug ? drug.sellPrice * (i.qty || 1) : 0)
  }, 0)
  return {
    number: form.value.number,
    date: form.value.date,
    patient: form.value.patient,
    doctor: form.value.doctor,
    notes: form.value.notes,
    items: items.map((i) => ({ drug: i.drug, dose: i.dose, qty: i.qty, unit: i.unit || 'علبة' })),
    itemsCount,
    total,
    insurance: 'بدون تأمين',
  }
}

function saveRx() {
  if (!form.value.patient.trim()) { alert('يرجى اختيار المريض'); return }
  if (!form.value.doctor.trim()) { alert('يرجى اختيار الطبيب'); return }
  if (form.value.items.filter((i) => i.drug).length === 0) { alert('يرجى إضافة دواء واحد على الأقل'); return }
  if (editingRx.value) {
    Object.assign(editingRx.value, collectRx())
  } else {
    rxList.value.unshift({ ...collectRx(), status: 'pending', insurance: 'بدون تأمين' })
  }
  showForm.value = false
}

function saveAndDispense() {
  saveRx()
  if (editingRx.value) {
    editingRx.value.status = 'dispensed'
  }
}

function dispense(rx) {
  if (confirm(`هل تريد صرف الوصفة ${rx.number} للمريض ${rx.patient}؟\nسيتم خصم الأدوية من المخزون.`)) {
    rx.status = 'dispensed'
  }
}

// ---- اختصار Esc ----
function handleKeydown(e) {
  if (e.key === 'Escape' && showForm.value) showForm.value = false
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

.flex-1 { flex: 1; min-height: 0; }

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

.search-input { min-width: 220px; max-width: 360px; }
.filter-select, .date-input { min-width: 110px; }

.table-container { overflow: auto; flex: 1; min-height: 0; }
.table-container table { min-width: 900px; width: 100%; }

.empty-state {
  text-align: center;
  color: var(--color-text-secondary);
  padding: var(--space-4);
  font-size: var(--font-size-lg);
}

.rx-no { color: var(--color-primary); font-weight: bold; white-space: nowrap; }
.patient-name { font-weight: bold; }

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

.status-pending { background: #fff8e1; color: #f57f17; }
.status-dispensed { background: var(--color-success-light, #e8f5e9); color: var(--color-success); }
.status-expired { background: #ffebee; color: var(--color-error); }

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

.action-btn.view { color: var(--color-primary); border-color: var(--color-primary); }
.action-btn.dispense { color: var(--color-success); border-color: var(--color-success); }
.action-btn:hover { background: var(--color-primary-light); }

.text-warning { color: #f57f17; font-weight: bold; }
.text-success { color: var(--color-success); font-weight: bold; }

/* النموذج (Modal) */
.lookup-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rx-modal {
  width: 92%;
  max-width: 860px;
  max-height: 88vh;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-dark);
  border-radius: var(--border-radius);
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.rx-modal-header {
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
  width: 24px; height: 24px;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  cursor: pointer;
  border-radius: var(--border-radius);
  font-size: 14px;
}

.rx-modal-body {
  padding: var(--space-3);
  overflow-y: auto;
  flex: 1;
}

.rx-header-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--space-2);
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.field-group label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-weight: bold;
}

.input-with-search { position: relative; }

.search-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid var(--color-primary);
  border-radius: var(--border-radius);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 100;
  min-width: 280px;
  max-height: 220px;
  overflow-y: auto;
}

.dropdown-item {
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-bottom: 1px solid var(--color-bg-secondary);
}

.dropdown-item:hover { background: var(--color-primary-light); }
.dropdown-item .name { font-weight: bold; }
.dropdown-item .sub { font-size: var(--font-size-xs); color: var(--color-text-secondary); }

.rx-items-title {
  font-weight: bold;
  color: var(--color-primary);
  margin: var(--space-2) 0 var(--space-1);
  font-size: var(--font-size-sm);
}

.rx-items-table .table-input {
  width: 100%;
  height: 26px;
  border: 1px solid transparent;
  padding: 0 var(--space-1);
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  background: transparent;
  text-align: right;
}

.rx-items-table .table-input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: white;
}

.rx-items-table .table-input.qty { text-align: center; }

.dropdown-over-table { max-width: 340px; }

.add-item-btn {
  margin-top: var(--space-1);
  border: 1px dashed var(--color-primary);
  background: var(--color-primary-light);
  color: var(--color-primary);
  cursor: pointer;
  border-radius: var(--border-radius);
  padding: var(--space-1) var(--space-3);
  font-size: var(--font-size-sm);
  font-weight: bold;
}

.rx-notes {
  margin-top: var(--space-2);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rx-notes label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-weight: bold;
}

.notes {
  min-height: 60px;
  resize: vertical;
}

.rx-modal-footer {
  height: 44px;
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-3);
  flex-shrink: 0;
}

.rx-total { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.rx-total strong { color: var(--color-primary); }

.footer-actions { display: flex; gap: var(--space-2); }

.btn {
  padding: 6px var(--space-3);
  border: 1px solid transparent;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-family: var(--font-family);
  font-size: var(--font-size-base);
}

.btn-secondary { background: var(--color-bg-primary); border-color: var(--color-border); }
.btn-primary { background: var(--color-primary); color: white; }
.btn-primary:hover { background: #1565c0; }
.btn-success { background: var(--color-success); color: white; }
.btn-success:hover { opacity: 0.9; }

.delete-btn {
  width: 22px; height: 22px;
  border: none;
  background: var(--color-error);
  color: white;
  cursor: pointer;
  border-radius: var(--border-radius);
  font-size: 12px;
}
</style>
