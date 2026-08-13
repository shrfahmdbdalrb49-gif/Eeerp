<template>
  <!-- ========== شاشة مراقبة الصلاحية ========== -->
  <div class="window-body flex-col">
    <div class="screen-toolbar">
      <button :class="['btn', filter === 'all' ? 'btn-primary' : 'btn-secondary']" @click="filter = 'all'">الكل ({{ sampleDrugs.length }})</button>
      <button :class="['btn', filter === 'expired' ? 'btn-danger' : 'btn-secondary']" @click="filter = 'expired'">منتهية ({{ expiredCount }})</button>
      <button :class="['btn', filter === 'near' ? 'btn-primary' : 'btn-secondary']" @click="filter = 'near'">قريبة الانتهاء ({{ nearCount }})</button>
      <input type="text" class="input-field" placeholder="بحث بالصنف أو الباركود..." v-model="search" style="width:220px" />
      <button class="btn btn-success" @click="alertExport">📊 تصدير التقرير</button>
    </div>

    <div class="alert-banner" v-if="expiredCount > 0">
      ⚠️ تنبيه: يوجد <strong>{{ expiredCount }}</strong> صنف منتهي الصلاحية ويجب إبعاده عن البيع فورًا
    </div>

    <div class="table-scroll">
      <table class="dense-table">
        <thead>
          <tr>
            <th style="width:30px">#</th>
            <th>كود الصنف</th>
            <th>اسم الصنف</th>
            <th>الباركود</th>
            <th>التشغيلة</th>
            <th>تاريخ الانتهاء</th>
            <th>الأيام المتبقية</th>
            <th>الكمية</th>
            <th>القيمة (تكلفة)</th>
            <th>الحالة</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(d, i) in filteredDrugs" :key="d.code">
            <td>{{ i + 1 }}</td>
            <td>{{ d.code }}</td>
            <td><strong>{{ d.name }}</strong></td>
            <td dir="ltr">{{ d.barcode }}</td>
            <td>LOT-{{ d.code.split('-')[1] }}</td>
            <td>{{ d.expiry }}</td>
            <td :class="daysClass(d)">{{ daysLeft(d) }}</td>
            <td>{{ d.stock }}</td>
            <td>{{ fmt(d.stock * d.buyPrice) }}</td>
            <td><span :class="['badge', statusBadge(d)]">{{ statusLabel(d) }}</span></td>
            <td>
              <button class="btn btn-secondary icon-btn" title="إبعاد عن البيع" @click="quarantine(d)">🚫</button>
            </td>
          </tr>
          <tr v-if="filteredDrugs.length === 0">
            <td colspan="11" class="empty-state">لا توجد أصناف مطابقة</td>
          </tr>
        </tbody>
        <tfoot v-if="filteredDrugs.length">
          <tr class="totals-row">
            <td colspan="7"><strong>إجمالي الكميات المعرضة</strong></td>
            <td><strong>{{ filteredTotalQty }}</strong></td>
            <td><strong>{{ fmt(filteredTotalValue) }}</strong></td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { sampleDrugs } from '../../data/sampleData.js'

const filter = ref('all')
const search = ref('')

const today = new Date()

function parseDate(s) { return new Date(s) }

function daysLeft(d) {
  const diff = Math.floor((parseDate(d.expiry) - today) / 86400000)
  return diff
}

function daysClass(d) {
  const days = daysLeft(d)
  if (days < 0) return 'text-danger'
  if (days <= 90) return 'text-warning'
  return ''
}

function statusBadge(d) {
  const days = daysLeft(d)
  if (days < 0) return 'badge-cancelled'
  if (days <= 90) return 'badge-draft'
  return 'badge-posted'
}

function statusLabel(d) {
  const days = daysLeft(d)
  if (days < 0) return 'منتهية'
  if (days <= 90) return 'قريبة الانتهاء'
  return 'سليمة'
}

const expiredCount = computed(() => sampleDrugs.filter(d => daysLeft(d) < 0).length)
const nearCount = computed(() => sampleDrugs.filter(d => { const x = daysLeft(d); return x >= 0 && x <= 90 }).length)

const filteredDrugs = computed(() =>
  sampleDrugs.filter(d => {
    const days = daysLeft(d)
    if (filter.value === 'expired' && days >= 0) return false
    if (filter.value === 'near' && (days < 0 || days > 90)) return false
    if (search.value) {
      const q = search.value
      return d.name.includes(q) || d.barcode.includes(q) || d.code.includes(q)
    }
    return true
  }).sort((a, b) => parseDate(a.expiry) - parseDate(b.expiry))
)

const filteredTotalQty = computed(() => filteredDrugs.value.reduce((s, d) => s + d.stock, 0))
const filteredTotalValue = computed(() => filteredDrugs.value.reduce((s, d) => s + d.stock * d.buyPrice, 0))

function fmt(n) {
  return Number(n).toLocaleString('en-US')
}

function alertExport() {
  alert('📊 تم تصدير تقرير مراقبة الصلاحية بصيغة Excel\n' + filteredDrugs.value.length + ' صنف | القيمة الإجمالية: ' + fmt(filteredTotalValue.value))
}

function quarantine(d) {
  if (confirm('إبعاد الصنف "' + d.name + '" (LOT-' + d.code.split('-')[1] + ') عن البيع؟')) {
    alert('✅ تم إبعاد التشغيلة عن البيع ونقلها لمنطقة العزل')
  }
}
</script>

<style scoped>
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
  flex-wrap: wrap;
}

.alert-banner {
  background: #FDECEA;
  border: 1px solid var(--color-error);
  color: var(--color-error);
  padding: 6px 10px;
  border-radius: 2px;
  margin-bottom: 6px;
  font-size: var(--font-size-base);
}

.table-scroll { flex: 1; overflow: auto; background: var(--color-bg-primary); min-height: 0; }

.empty-state { text-align: center; color: var(--color-text-secondary); padding: 16px; }
.text-danger { color: var(--color-error); font-weight: bold; }
.text-warning { color: var(--color-warning); font-weight: bold; }

.totals-row td {
  background: var(--color-primary-light) !important;
  border-top: 2px solid var(--color-primary);
}

.icon-btn { padding: 0 6px; }

@media (max-width: 768px) {
  .screen-toolbar { flex-direction: column; }
  .screen-toolbar .input-field { width: 100% !important; }
}
</style>
