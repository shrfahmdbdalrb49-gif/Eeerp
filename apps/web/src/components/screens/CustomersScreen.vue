<template>
  <!-- ========== شاشة العملاء (المرضى) ========== -->
  <div class="generic-screen">
    <div class="items-toolbar">
      <input
        type="text"
        class="input-field"
        placeholder="🔍 بحث بالاسم، الهاتف، الكود..."
        v-model="search"
        style="flex: 1; max-width: 360px"
      />
      <select class="input-field" v-model="insuranceFilter" style="width: 180px">
        <option value="">كل أنواع التأمين</option>
        <option>بدون تأمين</option>
        <option>شركة التأمين الوطنية</option>
        <option>شركة سبأ للتأمين</option>
      </select>
      <button class="btn btn-primary" @click="showForm = !showForm">+ مريض جديد</button>
    </div>

    <div v-if="showForm" class="new-item-form">
      <div class="form-title">إضافة مريض جديد</div>
      <div class="form-grid">
        <div class="field-row"><label>الاسم</label><input class="input-field" v-model="form.name" /></div>
        <div class="field-row"><label>الهاتف</label><input class="input-field" v-model="form.phone" /></div>
        <div class="field-row"><label>التأمين</label>
          <select class="input-field" v-model="form.insurance">
            <option>بدون تأمين</option>
            <option>شركة التأمين الوطنية</option>
            <option>شركة سبأ للتأمين</option>
          </select>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-success" @click="addPatient">حفظ</button>
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
            <th style="width:100px">الهاتف</th>
            <th style="width:150px">التأمين</th>
            <th style="width:90px">الرصيد عليه</th>
            <th style="width:70px">الزيارات</th>
            <th style="width:120px">الحالة</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(p, idx) in filteredPatients" :key="p.code">
            <td>{{ idx + 1 }}</td>
            <td>{{ p.code }}</td>
            <td style="font-weight: bold">{{ p.name }}</td>
            <td>{{ p.phone }}</td>
            <td>{{ p.insurance }}</td>
            <td :class="{ 'status-out': p.balance > 0 }">{{ fmt(p.balance) }}</td>
            <td>{{ p.visits }}</td>
            <td class="status-active">نشط</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="totals-bar">
      <div class="totals-right">
        <div class="total-item">
          <span class="total-label">إجمالي المرضى:</span>
          <span class="total-value">{{ filteredPatients.length }}</span>
        </div>
        <div class="total-item">
          <span class="total-label">إجمالي الآجل:</span>
          <span class="total-value" style="color: var(--color-warning)">{{ fmt(totalBalance) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { patientsDatabase } from '../../data/sampleData.js'

const patients = ref(patientsDatabase.map((p) => ({ ...p })))
const search = ref('')
const insuranceFilter = ref('')
const showForm = ref(false)

const form = reactive({
  name: '',
  phone: '',
  insurance: 'بدون تأمين',
})

let codeSeq = patients.value.length + 1

function addPatient() {
  if (!form.name.trim()) return
  const code = 'PAT-' + String(codeSeq++).padStart(3, '0')
  patients.value.push({
    code,
    name: form.name,
    phone: form.phone || '—',
    insurance: form.insurance,
    balance: 0,
    visits: 0,
  })
  Object.assign(form, { name: '', phone: '', insurance: 'بدون تأمين' })
  showForm.value = false
}

const filteredPatients = computed(() => {
  const q = search.value.toLowerCase().trim()
  const ins = insuranceFilter.value
  return patients.value.filter((p) => {
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.code.toLowerCase().includes(q)
    return matchSearch && (!ins || p.insurance === ins)
  })
})

const totalBalance = computed(() =>
  filteredPatients.value.reduce((s, p) => s + (p.balance || 0), 0)
)

function fmt(n) {
  return String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
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
  min-width: 700px;
}

.status-active { color: var(--color-success) }
.status-out { color: var(--color-error); font-weight: bold }
</style>
