<template>
  <!-- ===== نافذة البحث الموحدة (Lookup Modal) ===== -->
  <div class="lookup-overlay" @mousedown.self="$emit('close')">
    <div class="lookup-modal">
      <div class="lookup-header">
        <span>{{ config.title }}</span>
        <span class="lookup-count">{{ filteredData.length }} نتيجة</span>
        <button class="lookup-close" @click="$emit('close')" title="إغلاق">✕</button>
      </div>
      <div class="lookup-search">
        <input
          type="text"
          class="input-field"
          :placeholder="config.placeholder"
          v-model="query"
          ref="searchInput"
        />
      </div>
      <div class="lookup-body">
        <table class="dense-table">
          <thead>
            <tr>
              <th v-for="(h, i) in config.headers" :key="i">{{ h }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, idx) in filteredData"
              :key="item.code ?? idx"
              tabindex="0"
              @click="select(item)"
              @keydown.enter="select(item)"
            >
              <td v-for="(cell, i) in config.map(item)" :key="i" v-html="cell"></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="lookup-footer">
        <button class="btn btn-secondary" @click="$emit('close')">إلغاء (Esc)</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { sampleDrugs, patientsDatabase, doctorsDatabase } from '../../data/sampleData.js'

const props = defineProps({
  type: { type: String, default: 'item' } // item | patient | doctor
})
const emit = defineEmits(['select', 'close'])

const query = ref('')
const searchInput = ref(null)

const configs = {
  item: {
    title: 'اختيار الصنف / الدواء',
    placeholder: 'ابحث بالاسم، الكود، الباركود، الاسم العلمي...',
    headers: ['الكود', 'الاسم التجاري', 'الاسم العلمي', 'الباركود', 'المجموعة', 'سعر البيع', 'الرصيد', 'الصلاحية'],
    data: sampleDrugs,
    match: (d, q) =>
      d.name.toLowerCase().includes(q) ||
      d.scientific.toLowerCase().includes(q) ||
      d.barcode.includes(q) ||
      d.code.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q),
    map: (d) => [
      d.code,
      `<strong>${d.name}</strong>`,
      d.scientific,
      d.barcode,
      d.category,
      fmt(d.sellPrice),
      d.stock === 0
        ? `<span class="status-out">${d.stock}</span>`
        : d.stock <= d.minStock
          ? `<span class="status-low">${d.stock}</span>`
          : d.stock,
      `<span class="${expiryClass(d.expiry)}">${d.expiry}</span>`,
    ],
  },
  patient: {
    title: 'اختيار المريض',
    placeholder: 'ابحث بالاسم، الهاتف، الكود...',
    headers: ['الكود', 'الاسم', 'الهاتف', 'التأمين', 'الرصيد', 'عدد الزيارات'],
    data: patientsDatabase,
    match: (d, q) =>
      d.name.toLowerCase().includes(q) || d.phone.includes(q) || d.code.toLowerCase().includes(q),
    map: (d) => [d.code, `<strong>${d.name}</strong>`, d.phone, d.insurance, fmt(d.balance), d.visits],
  },
  doctor: {
    title: 'اختيار الطبيب',
    placeholder: 'ابحث بالاسم، التخصص، الهاتف...',
    headers: ['الكود', 'الاسم', 'التخصص', 'الهاتف', 'رقم الترخيص'],
    data: doctorsDatabase,
    match: (d, q) =>
      d.name.toLowerCase().includes(q) ||
      d.specialty.toLowerCase().includes(q) ||
      d.phone.includes(q),
    map: (d) => [d.code, `<strong>${d.name}</strong>`, d.specialty, d.phone, d.license],
  },
}

const config = computed(() => configs[props.type] ?? configs.item)

const filteredData = computed(() => {
  const q = query.value.toLowerCase().trim()
  const c = config.value
  if (!q) return c.data
  return c.data.filter((d) => c.match(d, q))
})

function select(item) {
  emit('select', item)
}

function fmt(n) {
  return String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function expiryClass(exp) {
  const today = new Date()
  const d = new Date(exp)
  const days = (d - today) / 86400000
  if (days <= 0) return 'expiry-red'
  if (days <= 60) return 'expiry-orange'
  if (days <= 120) return 'expiry-yellow'
  return 'expiry-green'
}

onMounted(() => {
  if (searchInput.value) searchInput.value.focus()
})
</script>

<style scoped>
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

.lookup-modal {
  width: 88%;
  height: 82%;
  max-height: 620px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-dark);
  border-radius: var(--border-radius);
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.lookup-header {
  height: 36px;
  background: linear-gradient(180deg, #1565c0 0%, var(--color-primary) 100%);
  color: white;
  display: flex;
  align-items: center;
  padding: 0 var(--space-3);
  font-weight: bold;
  font-size: var(--font-size-lg);
  gap: var(--space-3);
  flex-shrink: 0;
}

.lookup-count {
  font-size: var(--font-size-sm);
  font-weight: normal;
  opacity: 0.8;
  margin-right: auto;
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

.lookup-close:hover {
  background: rgba(255, 255, 255, 0.35);
}

.lookup-search {
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.lookup-search .input-field {
  height: 32px;
  font-size: var(--font-size-lg);
}

.lookup-body {
  flex: 1;
  overflow: auto;
  padding: 0;
}

.lookup-body :deep(tbody tr) {
  cursor: pointer;
}

.lookup-body :deep(tbody td strong) {
  color: var(--color-text-primary);
}

.status-low {
  color: var(--color-warning);
  font-weight: bold;
}

.status-out {
  color: var(--color-error);
  font-weight: bold;
}

.expiry-green {
  color: var(--color-success);
  font-weight: bold;
}

.expiry-yellow {
  color: #f9a825;
  font-weight: bold;
}

.expiry-orange {
  color: var(--color-warning);
  font-weight: bold;
}

.expiry-red {
  color: var(--color-error);
  font-weight: bold;
}

.lookup-footer {
  height: 40px;
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-3);
  flex-shrink: 0;
}
</style>
