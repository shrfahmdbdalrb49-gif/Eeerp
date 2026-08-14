<template>
  <div class="doctors-screen">
    <div class="screen-toolbar">
      <button class="btn btn-primary" @click="openForm()">+ طبيب جديد</button>
      <input type="text" class="input-field search" placeholder="🔍 بحث بالاسم، التخصص، الهاتف..." v-model="search" />
      <select class="input-field" v-model="specialtyFilter" style="width:150px">
        <option value="">كل التخصصات</option>
        <option v-for="sp in specialties" :key="sp" :value="sp">{{ sp }}</option>
      </select>
      <span class="toolbar-spacer"></span>
      <span class="toolbar-info">الأطباء يُخزنون في قاعدة البيانات الفعلية</span>
    </div>
    <div class="table-container table-scroll">
      <table class="dense-table">
        <thead>
          <tr>
            <th style="width:45px">#</th><th style="width:90px">الكود</th><th>الاسم</th><th style="width:115px">التخصص</th>
            <th style="width:115px">الهاتف</th><th style="width:115px">رقم الترخيص</th><th style="width:65px">الحالة</th><th style="width:52px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(d, idx) in filtered" :key="d.id">
            <td>{{ idx + 1 }}</td><td>{{ d.code }}</td>
            <td style="font-weight:bold">{{ d.name }}</td><td>{{ d.specialty || '—' }}</td>
            <td>{{ d.phone || '—' }}</td><td>{{ d.license || '—' }}</td>
            <td><span class="status-chip" :class="d.active ? 'ok' : 'off'">{{ d.active ? 'نشط' : 'معطَّل' }}</span></td>
            <td><button class="icon-btn" @click="openForm(d)">✎</button> <button class="icon-btn danger" @click="deleteDoctor(d)">✕</button></td>
          </tr>
          <tr v-if="filtered.length === 0">
            <td colspan="8" class="empty-state">لا يوجد أطباء بعد — أنشئ أول طبيب. لا توجد بيانات وهمية.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showForm" class="form-modal-overlay" @click.self="showForm = false">
      <div class="form-modal">
        <div class="modal-title"><span>{{ editing ? 'تعديل طبيب' : 'طبيب جديد' }}</span><button class="close-btn" @click="showForm = false">✕</button></div>
        <div class="modal-body">
          <div class="field-row"><label>الكود</label><input type="text" class="input-field" v-model="form.code" placeholder="يُولَّد تلقائيًا" /></div>
          <div class="field-row"><label>الاسم *</label><input type="text" class="input-field" v-model="form.name" /></div>
          <div class="field-row"><label>التخصص</label><input type="text" class="input-field" v-model="form.specialty" placeholder="باطنية، أطفال، قلب..." /></div>
          <div class="field-row"><label>الهاتف</label><input type="text" class="input-field" v-model="form.phone" /></div>
          <div class="field-row"><label>رقم الترخيص</label><input type="text" class="input-field" v-model="form.license" /></div>
        </div>
        <div class="form-actions">
          <span v-if="formError" class="form-error">{{ formError }}</span>
          <button class="btn btn-primary" @click="saveDoctor" :disabled="saving">{{ saving ? 'جارٍ...' : 'حفظ' }}</button>
          <button class="btn btn-secondary" @click="showForm = false">إلغاء</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { db } from '../../db/database.js'

const doctors = ref([])
const search = ref('')
const specialtyFilter = ref('')
const showForm = ref(false)
const editing = ref(null)
const saving = ref(false)
const formError = ref('')
const form = ref({ code: '', name: '', specialty: '', phone: '', license: '' })

const specialties = computed(() => [...new Set(doctors.value.map(d => d.specialty).filter(Boolean))])

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const sp = specialtyFilter.value
  return doctors.value.filter(d => {
    const matchQ = !q || d.name.toLowerCase().includes(q) || (d.specialty || '').toLowerCase().includes(q) || (d.phone || '').includes(q) || (d.code || '').toLowerCase().includes(q)
    return matchQ && (!sp || d.specialty === sp)
  })
})

async function loadData() {
  doctors.value = await db.doctors.toArray()
}

function openForm(d) {
  editing.value = d ? d.id : null
  formError.value = ''
  form.value = d
    ? { code: d.code, name: d.name, specialty: d.specialty || '', phone: d.phone || '', license: d.license || '' }
    : { code: '', name: '', specialty: '', phone: '', license: '' }
  showForm.value = true
}

async function saveDoctor() {
  saving.value = true
  formError.value = ''
  try {
    const f = { ...form.value }
    if (!f.name.trim()) throw new Error('أدخل اسم الطبيب')
    if (!f.code) {
      const count = await db.doctors.count()
      f.code = 'DOC-' + String(count + 1).padStart(3, '0')
    }
    if (editing.value) await db.doctors.update(editing.value, { ...f, updatedAt: Date.now() })
    else await db.doctors.add({ ...f, active: true, createdAt: Date.now() })
    showForm.value = false
    await loadData()
  } catch (e) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

async function deleteDoctor(d) {
  try {
    await db.doctors.delete(d.id)
    await loadData()
  } catch (e) {
    formError.value = e.message
  }
}

onMounted(loadData)
</script>

<style scoped>
.doctors-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.screen-toolbar { display: flex; gap: 6px; padding: 6px; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: 2px; margin-bottom: 6px; align-items: center; flex-wrap: wrap; flex-shrink: 0; }
.toolbar-spacer { flex: 1; }
.toolbar-info { font-size: 12px; color: var(--color-text-secondary); }
.table-scroll { flex: 1; overflow: auto; background: var(--color-bg-primary); min-height: 0; }
.empty-state { text-align: center; color: var(--color-text-secondary); padding: 18px; }
.icon-btn { background: none; border: 1px solid transparent; cursor: pointer; font-size: 13px; padding: 1px 5px; border-radius: 3px; }
.icon-btn:hover { background: #eef4fb; }
.icon-btn.danger { color: #b71c1c; }
.status-chip { padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: bold; }
.status-chip.ok { background: #e6f4ea; color: #1b5e20; }
.status-chip.off { background: #f0f0f0; color: #777; }
.btn { padding: 6px 14px; border: none; border-radius: 3px; cursor: pointer; font-weight: bold; font-size: 13px; }
.btn-primary { background: var(--color-primary); color: #fff; }
.btn-secondary { background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border); }
.input-field { padding: 6px 8px; border: 1px solid var(--color-border); border-radius: 3px; font-size: 13px; background: #fff; }
.input-field.search { width: 220px; }
.input-field:focus { outline: none; border-color: var(--color-primary); }
.form-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 12px; }
.form-modal { background: var(--color-bg-primary); border: 2px solid var(--color-primary); border-radius: 4px; width: 460px; max-width: 94vw; box-shadow: 4px 4px 16px rgba(0,0,0,0.3); }
.modal-title { display: flex; justify-content: space-between; align-items: center; background: var(--color-primary); color: #fff; font-weight: bold; padding: 6px 12px; }
.close-btn { background: transparent; border: none; color: #fff; cursor: pointer; }
.modal-body { padding: 12px; }
.field-row { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.field-row label { width: 105px; font-size: 13px; flex-shrink: 0; color: var(--color-text-secondary); }
.form-actions { display: flex; gap: 8px; justify-content: flex-end; align-items: center; padding: 8px 12px; background: var(--color-bg-secondary); border-top: 1px solid var(--color-border); }
.form-error { color: #b71c1c; font-size: 12px; flex: 1; }
@media (max-width: 768px) { .field-row { flex-wrap: wrap; } .field-row label { width: 100%; } .screen-toolbar { flex-direction: column; align-items: stretch; } .input-field.search { width: 100%; } }
</style>
