<template>
  <!-- ========== شاشة الأطباء ========== -->
  <div class="generic-screen">
    <div class="items-toolbar">
      <input
        type="text"
        class="input-field"
        placeholder="🔍 بحث بالاسم، التخصص، الهاتف..."
        v-model="search"
        style="flex: 1; max-width: 360px"
      />
      <select class="input-field" v-model="specialtyFilter" style="width: 150px">
        <option value="">كل التخصصات</option>
        <option>باطنية</option>
        <option>أطفال</option>
        <option>قلب</option>
        <option>نساء وولادة</option>
        <option>عظام</option>
        <option>جلدية</option>
      </select>
      <button class="btn btn-primary" @click="showForm = !showForm">+ طبيب جديد</button>
    </div>

    <div v-if="showForm" class="new-item-form">
      <div class="form-title">إضافة طبيب جديد</div>
      <div class="form-grid">
        <div class="field-row"><label>الاسم</label><input class="input-field" v-model="form.name" /></div>
        <div class="field-row"><label>التخصص</label><input class="input-field" v-model="form.specialty" /></div>
        <div class="field-row"><label>الهاتف</label><input class="input-field" v-model="form.phone" /></div>
        <div class="field-row"><label>رقم الترخيص</label><input class="input-field" v-model="form.license" /></div>
      </div>
      <div class="form-actions">
        <button class="btn btn-success" @click="addDoctor">حفظ</button>
        <button class="btn btn-secondary" @click="showForm = false">إلغاء</button>
      </div>
    </div>

    <div class="table-container flex-1">
      <table class="dense-table">
        <thead>
          <tr>
            <th style="width:30px">#</th>
            <th style="width:80px">الكود</th>
            <th style="width:180px">الاسم</th>
            <th style="width:120px">التخصص</th>
            <th style="width:100px">الهاتف</th>
            <th style="width:120px">رقم الترخيص</th>
            <th style="width:90px">الحالة</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(d, idx) in filteredDoctors" :key="d.code">
            <td>{{ idx + 1 }}</td>
            <td>{{ d.code }}</td>
            <td style="font-weight: bold">{{ d.name }}</td>
            <td>{{ d.specialty }}</td>
            <td>{{ d.phone }}</td>
            <td>{{ d.license }}</td>
            <td class="status-active">نشط</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="totals-bar">
      <div class="totals-right">
        <div class="total-item">
          <span class="total-label">إجمالي الأطباء:</span>
          <span class="total-value">{{ filteredDoctors.length }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { doctorsDatabase } from '../../data/sampleData.js'

const doctors = ref(doctorsDatabase.map((d) => ({ ...d })))
const search = ref('')
const specialtyFilter = ref('')
const showForm = ref(false)

const form = reactive({
  name: '',
  specialty: '',
  phone: '',
  license: '',
})

let codeSeq = doctors.value.length + 1

function addDoctor() {
  if (!form.name.trim()) return
  const code = 'DOC-' + String(codeSeq++).padStart(3, '0')
  doctors.value.push({
    code,
    name: form.name,
    specialty: form.specialty,
    phone: form.phone || '—',
    license: form.license || '—',
  })
  Object.assign(form, { name: '', specialty: '', phone: '', license: '' })
  showForm.value = false
}

const filteredDoctors = computed(() => {
  const q = search.value.toLowerCase().trim()
  const sp = specialtyFilter.value
  return doctors.value.filter((d) => {
    const matchSearch =
      !q ||
      d.name.toLowerCase().includes(q) ||
      d.specialty.toLowerCase().includes(q) ||
      d.phone.includes(q)
    return matchSearch && (!sp || d.specialty === sp)
  })
})
</script>

<style scoped>
.generic-screen {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.flex-1 {
  flex: 1;
  min-height: 0;
}

.items-toolbar {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  align-items: center;
  flex-wrap: wrap;
}

.new-item-form {
  background: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
  padding: var(--space-3);
  flex-shrink: 0;
}

.form-title {
  font-size: var(--font-size-base);
  font-weight: bold;
  color: var(--color-primary);
  margin-bottom: var(--space-2);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: var(--space-2);
}

.form-grid .field-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.form-grid .field-row label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-weight: bold;
}

.form-actions {
  margin-top: var(--space-2);
  display: flex;
  gap: var(--space-2);
}

.table-container {
  overflow: auto;
}

.table-container table {
  min-width: 620px;
}

.status-active { color: var(--color-success) }
</style>
