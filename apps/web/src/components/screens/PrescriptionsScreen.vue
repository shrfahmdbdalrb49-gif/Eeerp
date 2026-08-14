<template>
  <!-- ========== شاشة الوصفات الطبية ========== -->
  <div class="screen-container">
    <div class="screen-toolbar">
      <div class="toolbar-right">
        <input type="text" class="input-field search-input" placeholder="🔍 ابحث برقم الوصفة، المريض، الطبيب..." v-model="search" />
        <select class="input-field filter-select" v-model="statusFilter">
          <option value="all">كل الحالات</option>
          <option value="pending">بانتظار الصرف</option>
          <option value="dispensed">تم الصرف</option>
        </select>
        <input type="date" class="input-field date-input" v-model="dateFrom" title="من تاريخ" />
        <input type="date" class="input-field date-input" v-model="dateTo" title="إلى تاريخ" />
      </div>
      <div class="toolbar-left">
        <button class="btn btn-primary" @click="openForm(null)">✚ وصفة جديدة</button>
      </div>
    </div>

    <div class="table-container flex-1">
      <table class="dense-table">
        <thead>
          <tr>
            <th style="width:30px">#</th>
            <th style="width:100px">رقم الوصفة</th>
            <th style="width:95px">التاريخ</th>
            <th>المريض</th>
            <th style="width:140px">الطبيب</th>
            <th style="width:60px">الأدوية</th>
            <th style="width:85px">الحالة</th>
            <th style="width:180px">إجراءات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(rx, i) in filteredRx" :key="rx.id" @dblclick="openForm(rx)">
            <td>{{ i + 1 }}</td>
            <td><span class="rx-no">RX-{{ rx.id }}</span></td>
            <td>{{ rx.date }}</td>
            <td>{{ rx.patientName }}</td>
            <td>{{ rx.doctorName }}</td>
            <td>{{ rx.itemsCount }}</td>
            <td>
              <span class="status-badge" :class="'status-' + rx.status">
                {{ rx.status === 'pending' ? 'بانتظار الصرف' : 'تم الصرف' }}
              </span>
            </td>
            <td>
              <button class="action-btn view" @click.stop="openForm(rx)">📋 عرض/تعديل</button>
              <button v-if="rx.status === 'pending'" class="action-btn dispense" @click.stop="dispense(rx)">💊 صرف</button>
            </td>
          </tr>
          <tr v-if="filteredRx.length === 0">
            <td colspan="8" class="empty-state">لا توجد وصفات بعد — أنشئ أول وصفة. لا توجد بيانات وهمية.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="totals-bar">
      <div class="total-item"><span class="total-label">عدد الوصفات:</span><span class="total-value">{{ filteredRx.length }}</span></div>
      <div class="total-item"><span class="total-label">بانتظار الصرف:</span><span class="total-value text-warning">{{ filteredRx.filter(r => r.status === 'pending').length }}</span></div>
      <div class="total-item"><span class="total-label">تم الصرف:</span><span class="total-value text-success">{{ filteredRx.filter(r => r.status === 'dispensed').length }}</span></div>
    </div>

    <!-- نموذج الوصفة -->
    <div v-if="showForm" class="lookup-overlay" @mousedown.self="showForm = false">
      <div class="rx-modal">
        <div class="rx-modal-header">
          <span>{{ editingRx ? 'عرض / تعديل الوصفة RX-' + editingRx.id : 'وصفة طبية جديدة' }}</span>
          <button class="lookup-close" @click="showForm = false">✕</button>
        </div>
        <div class="rx-modal-body">
          <div class="rx-header-row">
            <div class="field-group">
              <label>التاريخ</label>
              <input type="date" class="input-field" v-model="form.date" />
            </div>
            <div class="field-group">
              <label>المريض</label>
              <div class="input-with-search">
                <input type="text" class="input-field" placeholder="ابحث عن مريض..." v-model="form.patient"
                  @input="showPatientDropdown = form.patient.length > 0"
                  @blur="setTimeout(() => (showPatientDropdown = false), 200)" />
                <div v-if="showPatientDropdown && filteredPatients.length" class="search-dropdown">
                  <div v-for="p in filteredPatients.slice(0, 6)" :key="p.id" class="dropdown-item" @mousedown.prevent="selectPatient(p)">
                    <span class="name">{{ p.name }}</span>
                    <span class="sub">{{ p.phone || '—' }} | {{ p.code }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="field-group">
              <label>الطبيب</label>
              <div class="input-with-search">
                <input type="text" class="input-field" placeholder="ابحث عن طبيب..." v-model="form.doctor"
                  @input="showDoctorDropdown = form.doctor.length > 0"
                  @blur="setTimeout(() => (showDoctorDropdown = false), 200)" />
                <div v-if="showDoctorDropdown && filteredDoctors.length" class="search-dropdown">
                  <div v-for="d in filteredDoctors.slice(0, 6)" :key="d.id" class="dropdown-item" @mousedown.prevent="selectDoctor(d)">
                    <span class="name">{{ d.name }}</span>
                    <span class="sub">{{ d.specialty || '—' }} | {{ d.code }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="rx-items-title">أدوية الوصفة</div>
          <div class="rx-items-table">
            <table class="dense-table">
              <thead>
                <tr>
                  <th style="width:25px">#</th>
                  <th>الدواء</th>
                  <th style="width:160px">الجرعة / التعليمات</th>
                  <th style="width:70px">الكمية</th>
                  <th style="width:55px">الوحدة</th>
                  <th style="width:25px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, i) in form.items" :key="item.id">
                  <td>{{ i + 1 }}</td>
                  <td>
                    <div class="input-with-search">
                      <input type="text" class="table-input" placeholder="ابحث عن صنف..." v-model="item.search"
                        @input="filterDrug(item)" @blur="setTimeout(() => (item.showDropdown = false), 200)" />
                      <div v-if="item.showDropdown && item.filtered.length" class="search-dropdown dropdown-over-table">
                        <div v-for="d in item.filtered.slice(0, 6)" :key="d.id" class="dropdown-item" @mousedown.prevent="fillDrug(item, d)">
                          <span class="name">{{ d.name }}</span>
                          <span class="sub">{{ d.code }} | {{ fmt(d.sellPrice) }} | رصيد: {{ d.avail }}</span>
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
            <button class="add-item-btn" @click="addItem">+ إضافة صنف</button>
          </div>

          <div class="rx-notes">
            <label>ملاحظات الطبيب</label>
            <textarea class="input-field notes" v-model="form.notes" placeholder="ملاحظات إضافية..."></textarea>
          </div>
          <span v-if="formError" class="form-error">{{ formError }}</span>
        </div>
        <div class="rx-modal-footer">
          <span class="rx-total">عدد الأدوية: <strong>{{ form.items.filter(i => i.itemId).length }}</strong></span>
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
import { db, activeItems } from '../../db/database.js'
import { itemStock, consumeStock, fmt } from '../../db/engine.js'
import { currentSession } from '../../db/session.js'

const search = ref('')
const statusFilter = ref('all')
const dateFrom = ref('')
const dateTo = ref('')
const rxList = ref([])
const showForm = ref(false)
const editingRx = ref(null)
const showPatientDropdown = ref(false)
const showDoctorDropdown = ref(false)
const patients = ref([])
const doctors = ref([])
const formError = ref('')
const form = ref(blankForm())

const filteredRx = computed(() => {
  const q = search.value.toLowerCase().trim()
  return rxList.value.filter(rx => {
    if (q && !(rx.rxNo.includes(q) || rx.patientName.toLowerCase().includes(q) || rx.doctorName.toLowerCase().includes(q))) return false
    if (statusFilter.value !== 'all' && rx.status !== statusFilter.value) return false
    if (dateFrom.value && rx.date < dateFrom.value) return false
    if (dateTo.value && rx.date > dateTo.value) return false
    return true
  })
})

let itemSeq = 0
function blankItem() {
  return { id: itemSeq++, itemId: null, search: '', dose: '', qty: 1, unit: '', filtered: [], showDropdown: false }
}
function blankForm() {
  return { date: new Date().toISOString().slice(0, 10), patient: '', doctor: '', notes: '', items: [blankItem()] }
}

function addItem() { form.value.items.push(blankItem()) }
function removeItem(item) {
  const idx = form.value.items.indexOf(item)
  if (form.value.items.length > 1) form.value.items.splice(idx, 1)
  else form.value.items = [blankItem()]
}

async function filterDrug(item) {
  const q = item.search.toLowerCase().trim()
  if (q.length < 1) { item.showDropdown = false; item.filtered = []; return }
  const items = await activeItems()
  item.filtered = items.filter(d =>
    d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || (d.barcode || '').includes(q)
  ).map(d => ({ ...d, avail: 0 }))
  for (const d of item.filtered) {
    const s = await itemStock(d.id)
    d.avail = s.total
  }
  item.showDropdown = item.filtered.length > 0
}

function fillDrug(item, drug) {
  item.itemId = drug.id
  item.search = drug.name
  item.unit = drug.unit || 'حبة'
  item.showDropdown = false
}

const filteredPatients = computed(() => {
  const q = form.value.patient.toLowerCase().trim()
  if (!q) return []
  return patients.value.filter(p => p.name.toLowerCase().includes(q) || (p.phone || '').includes(q))
})
function selectPatient(p) { form.value.patient = p.name; form.value.patientId = p.id; showPatientDropdown.value = false }

const filteredDoctors = computed(() => {
  const q = form.value.doctor.toLowerCase().trim()
  if (!q) return []
  return doctors.value.filter(d =>
    d.name.toLowerCase().includes(q) || (d.specialty || '').toLowerCase().includes(q) || d.code.toLowerCase().includes(q)
  )
})
function selectDoctor(d) { form.value.doctor = d.name; form.value.doctorId = d.id; showDoctorDropdown.value = false }

function openForm(rx) {
  if (rx) {
    editingRx.value = rx
    form.value = {
      date: rx.date, patient: rx.patientName, doctor: rx.doctorName, notes: rx.notes || '',
      items: rx.lines.map(it => ({
        id: itemSeq++, itemId: it.itemId, search: it.drugName, dose: it.dose, qty: it.qty, unit: it.unit, filtered: [], showDropdown: false,
      })),
    }
  } else {
    editingRx.value = null
    form.value = blankForm()
  }
  formError.value = ''
  showForm.value = true
}

async function collectRx() {
  const items = form.value.items.filter(i => i.itemId)
  const lines = items.map(i => ({ itemId: i.itemId, qty: i.qty || 1, dose: i.dose || '', unit: i.unit || 'حبة' }))
  const total = lines.reduce((s, l) => {
    const it = form.value.items.find(i => i.itemId === l.itemId)
    return s + (it ? (it.price || 0) * l.qty : 0)
  }, 0)
  return {
    date: form.value.date, patientId: form.value.patientId || null,
    patientName: form.value.patient, doctorId: form.value.doctorId || null,
    doctorName: form.value.doctor, notes: form.value.notes,
    lines, itemsCount: items.length, total,
  }
}

async function saveRx() {
  formError.value = ''
  try {
    if (!form.value.patient.trim()) throw new Error('يرجى اختيار المريض')
    if (!form.value.doctor.trim()) throw new Error('يرجى اختيار الطبيب')
    if (form.value.items.filter(i => i.itemId).length === 0) throw new Error('يرجى إضافة صنف واحد على الأقل')
    const data = await collectRx()
    if (editingRx.value) {
      // تعديل: احذف البنود القديمة وأضف الجديدة
      await db.prescriptionLines.where('prescriptionId').equals(editingRx.value.id).delete()
      await db.prescriptions.update(editingRx.value.id, {
        date: data.date, patientId: data.patientId, patientName: data.patientName,
        doctorId: data.doctorId, doctorName: data.doctorName, notes: data.notes,
        itemsCount: data.itemsCount, total: data.total, updatedAt: Date.now(),
      })
      for (const l of data.lines) await db.prescriptionLines.add({ prescriptionId: editingRx.value.id, ...l })
    } else {
      const id = await db.prescriptions.add({
        ...data, status: 'pending', createdAt: Date.now(),
      })
      for (const l of data.lines) await db.prescriptionLines.add({ prescriptionId: id, ...l })
      editingRx.value = { id, ...data, status: 'pending' }
    }
    showForm.value = false
    await loadData()
  } catch (e) {
    formError.value = e.message
  }
}

async function saveAndDispense() {
  await saveRx()
  if (editingRx.value && editingRx.value.status === 'pending') await dispense(editingRx.value, false)
}

async function dispense(rx, ask = true) {
  try {
    if (ask && !confirm(`هل تريد صرف الوصفة RX-${rx.id} للمريض ${rx.patientName}؟\nسيتم خصم الأدوية من المخزون فعليًا.`)) return
    const lines = await db.prescriptionLines.where('prescriptionId').equals(rx.id).toArray()
    for (const l of lines) {
      await consumeStock(l.itemId, l.qty)
      await db.stockMovements.add({
        itemId: l.itemId, batchId: null, kind: 'out', qty: l.qty,
        refKind: 'prescription', refId: rx.id, date: new Date().toISOString().slice(0, 10), createdAt: Date.now(),
      })
    }
    await db.prescriptions.update(rx.id, { status: 'dispensed', dispensedAt: Date.now() })
    const session = await currentSession()
    await db.auditLogs.add({
      userId: session?.userId ?? 0, userName: session?.userName ?? 'مجهول',
      action: 'prescription_dispensed', refKind: 'prescription', refId: rx.id,
      detail: `RX-${rx.id} للمريض ${rx.patientName} | ${lines.length} صنف`,
      createdAt: Date.now(),
    })
    await loadData()
  } catch (e) {
    alert('خطأ في الصرف: ' + e.message)
  }
}

async function loadData() {
  const rx = await db.prescriptions.toArray()
  const byId = Object.fromEntries(rx.map(r => [r.id, r]))
  const allLines = await db.prescriptionLines.toArray()
  rxList.value = rx.map(r => ({
    ...r, rxNo: 'RX-' + String(r.id).padStart(5, '0'),
    lines: allLines.filter(l => l.prescriptionId === r.id),
  }))
  patients.value = await db.customers.toArray()
  doctors.value = await db.doctors.toArray()
}

function handleKeydown(e) {
  if (e.key === 'Escape' && showForm.value) showForm.value = false
}
onMounted(() => { window.addEventListener('keydown', handleKeydown); loadData() })
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<style scoped>
.screen-container { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
.flex-1 { flex: 1; min-height: 0; }
.screen-toolbar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); padding: var(--space-2); background: var(--color-bg-secondary); border-bottom: 1px solid var(--color-border); flex-shrink: 0; flex-wrap: wrap; }
.toolbar-right { display: flex; flex-wrap: wrap; gap: var(--space-2); flex: 1; }
.search-input { min-width: 220px; max-width: 360px; }
.filter-select, .date-input { min-width: 110px; }
.table-container { overflow: auto; flex: 1; min-height: 0; }
.table-container table { min-width: 820px; width: 100%; }
.empty-state { text-align: center; color: var(--color-text-secondary); padding: var(--space-4); font-size: var(--font-size-lg); }
.rx-no { color: var(--color-primary); font-weight: bold; white-space: nowrap; }
.patient-name { font-weight: bold; }
.status-badge { display: inline-block; font-size: var(--font-size-xs); padding: 2px var(--space-2); border-radius: var(--border-radius); white-space: nowrap; }
.status-pending { background: #fff8e1; color: #f57f17; }
.status-dispensed { background: var(--color-success-light, #e8f5e9); color: var(--color-success); }
.status-expired { background: #ffebee; color: var(--color-error); }
.action-btn { border: 1px solid var(--color-border); background: var(--color-bg-primary); cursor: pointer; border-radius: var(--border-radius); font-size: var(--font-size-xs); padding: 3px var(--space-2); margin-left: 2px; white-space: nowrap; }
.action-btn.view { color: var(--color-primary); border-color: var(--color-primary); }
.action-btn.dispense { color: var(--color-success); border-color: var(--color-success); }
.action-btn:hover { background: var(--color-primary-light); }
.text-warning { color: #f57f17; font-weight: bold; }
.text-success { color: var(--color-success); font-weight: bold; }
.totals-bar { display: flex; gap: 14px; padding: 5px 8px; background: var(--color-bg-secondary); border-top: 1px solid var(--color-border); flex-shrink: 0; }
.total-item { font-size: 13px; }
.total-label { color: var(--color-text-secondary); }
.total-value { font-weight: bold; margin-right: 4px; }
.btn { padding: 6px var(--space-3); border: 1px solid transparent; border-radius: var(--border-radius); cursor: pointer; font-family: var(--font-family); font-size: var(--font-size-base); }
.btn-secondary { background: var(--color-bg-primary); border-color: var(--color-border); }
.btn-primary { background: var(--color-primary); color: white; }
.btn-success { background: var(--color-success); color: white; }
.input-field { padding: 6px 8px; border: 1px solid var(--color-border); border-radius: 3px; font-size: 13px; background: #fff; }
/* النموذج */
.lookup-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; }
.rx-modal { width: 92%; max-width: 860px; max-height: 88vh; background: var(--color-bg-primary); border: 1px solid var(--color-border-dark); border-radius: var(--border-radius); display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
.rx-modal-header { height: 36px; background: linear-gradient(180deg, #1565c0 0%, var(--color-primary) 100%); color: white; display: flex; align-items: center; padding: 0 var(--space-3); font-weight: bold; font-size: var(--font-size-lg); justify-content: space-between; flex-shrink: 0; }
.lookup-close { width: 24px; height: 24px; border: none; background: rgba(255,255,255,0.15); color: white; cursor: pointer; border-radius: var(--border-radius); font-size: 14px; }
.rx-modal-body { padding: var(--space-3); overflow-y: auto; flex: 1; }
.rx-header-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--space-2); }
.field-group { display: flex; flex-direction: column; gap: 2px; }
.field-group label { font-size: var(--font-size-xs); color: var(--color-text-secondary); font-weight: bold; }
.input-with-search { position: relative; }
.search-dropdown { position: absolute; top: 100%; right: 0; background: white; border: 1px solid var(--color-primary); border-radius: var(--border-radius); box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 100; min-width: 280px; max-height: 220px; overflow-y: auto; }
.dropdown-item { padding: var(--space-2) var(--space-3); cursor: pointer; display: flex; flex-direction: column; gap: 2px; border-bottom: 1px solid var(--color-bg-secondary); }
.dropdown-item:hover { background: var(--color-primary-light); }
.dropdown-item .name { font-weight: bold; }
.dropdown-item .sub { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.rx-items-title { font-weight: bold; color: var(--color-primary); margin: var(--space-2) 0 var(--space-1); font-size: var(--font-size-sm); }
.rx-items-table .table-input { width: 100%; height: 26px; border: 1px solid transparent; padding: 0 var(--space-1); font-family: var(--font-family); font-size: var(--font-size-base); background: transparent; text-align: right; }
.rx-items-table .table-input:focus { outline: none; border-color: var(--color-primary); background: white; }
.rx-items-table .table-input.qty { text-align: center; }
.dropdown-over-table { max-width: 340px; }
.add-item-btn { margin-top: var(--space-1); border: 1px dashed var(--color-primary); background: var(--color-primary-light); color: var(--color-primary); cursor: pointer; border-radius: var(--border-radius); padding: var(--space-1) var(--space-3); font-size: var(--font-size-sm); font-weight: bold; }
.rx-notes { margin-top: var(--space-2); display: flex; flex-direction: column; gap: 2px; }
.rx-notes label { font-size: var(--font-size-xs); color: var(--color-text-secondary); font-weight: bold; }
.notes { min-height: 60px; resize: vertical; }
.form-error { color: #b71c1c; font-size: 13px; font-weight: bold; }
.rx-modal-footer { height: 44px; background: var(--color-bg-secondary); border-top: 1px solid var(--color-border); display: flex; align-items: center; justify-content: space-between; padding: 0 var(--space-3); flex-shrink: 0; }
.rx-total { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.rx-total strong { color: var(--color-primary); }
.footer-actions { display: flex; gap: var(--space-2); }
.delete-btn { width: 22px; height: 22px; border: none; background: var(--color-error); color: white; cursor: pointer; border-radius: var(--border-radius); font-size: 12px; }
@media (max-width: 768px) { .toolbar-right { flex-direction: column; } .search-input { max-width: none; } .rx-modal { width: 98%; } }
</style>
