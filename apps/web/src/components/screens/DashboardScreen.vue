<template>
  <!-- ========== لوحة التحكم ========== -->
  <div class="dashboard">
    <!-- بطاقات الإحصائيات -->
    <div class="stats-row">
      <div class="stat-card" v-for="s in stats" :key="s.label">
        <div class="stat-icon">{{ s.icon }}</div>
        <div class="stat-info">
          <div class="stat-value">{{ s.value }}</div>
          <div class="stat-label">{{ s.label }}</div>
        </div>
      </div>
    </div>

    <div class="dashboard-grid">
      <!-- تنبيهات المخزون -->
      <div class="dash-card">
        <div class="card-title">⚠️ تنبيهات المخزون</div>
        <div class="table-container">
          <table class="dense-table">
            <thead>
              <tr>
                <th>الكود</th>
                <th>الصنف</th>
                <th>الرصيد</th>
                <th>الحد الأدنى</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in stockAlerts" :key="d.code">
                <td>{{ d.code }}</td>
                <td style="font-weight: bold">{{ d.name }}</td>
                <td :class="{ 'status-out': d.stock === 0, 'status-low': d.stock > 0 }">{{ d.stock }}</td>
                <td>{{ d.minStock }}</td>
                <td :class="{ 'status-out': d.stock === 0, 'status-low': d.stock > 0 }">
                  {{ d.stock === 0 ? 'نفذ' : 'منخفض' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- تنبيهات الصلاحية -->
      <div class="dash-card">
        <div class="card-title">📅 تنبيهات الصلاحية (قريب الانتهاء)</div>
        <div class="table-container">
          <table class="dense-table">
            <thead>
              <tr>
                <th>الصنف</th>
                <th>الصلاحية</th>
                <th>الرصيد</th>
                <th>الأيام المتبقية</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in expiringSoon" :key="d.code">
                <td style="font-weight: bold">{{ d.name }}</td>
                <td :class="expiryClass(d.expiry)">{{ d.expiry }}</td>
                <td>{{ d.stock }}</td>
                <td>{{ daysLeft(d.expiry) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- آخر الفواتير -->
      <div class="dash-card">
        <div class="card-title">🧾 آخر فواتير المبيعات</div>
        <div class="table-container">
          <table class="dense-table">
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>المريض</th>
                <th>الطبيب</th>
                <th>الإجمالي</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="inv in recentInvoices" :key="inv.number">
                <td>{{ inv.number }}</td>
                <td>{{ inv.patient }}</td>
                <td>{{ inv.doctor }}</td>
                <td style="font-weight: bold">{{ fmt(inv.total) }}</td>
                <td>
                  <span class="badge" :class="inv.posted ? 'badge-posted' : 'badge-draft'">
                    {{ inv.posted ? 'مرحّلة' : 'مسودة' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- مبيعات اليوم -->
      <div class="dash-card">
        <div class="card-title">💰 مبيعات اليوم</div>
        <div class="chart-placeholder">
          <div class="big-number">{{ fmt(todaySales) }}</div>
          <div class="big-label">ريال يمني</div>
          <div class="chart-bars">
            <div
              v-for="h in hourlySales"
              :key="h.hour"
              class="bar-item"
            >
              <div class="bar" :style="{ height: Math.max(4, (h.value / maxHour) * 100) + '%' }"></div>
              <div class="bar-label">{{ h.hour }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { sampleDrugs } from '../../data/sampleData.js'

const stats = computed(() => [
  { icon: '💊', label: 'إجمالي الأصناف', value: sampleDrugs.length },
  { icon: '📦', label: 'قيمة المخزون', value: fmt(sampleDrugs.reduce((s, d) => s + d.stock * d.buyPrice, 0)) },
  { icon: '⚠️', label: 'رصيد منخفض', value: sampleDrugs.filter((d) => d.stock > 0 && d.stock <= d.minStock).length },
  { icon: '🚫', label: 'نفذ من المخزون', value: sampleDrugs.filter((d) => d.stock === 0).length },
  { icon: '📅', label: 'ينتهي قريباً', value: sampleDrugs.filter((d) => isExpiringSoon(d.expiry)).length },
  { icon: '👥', label: 'المرضى', value: 8 },
  { icon: '🩺', label: 'الأطباء', value: 6 },
  { icon: '💵', label: 'مبيعات اليوم', value: fmt(todaySalesValue) },
])

const todaySalesValue = 124500
const todaySales = todaySalesValue

const stockAlerts = computed(() =>
  sampleDrugs.filter((d) => d.stock <= d.minStock).slice(0, 6)
)

const expiringSoon = computed(() =>
  sampleDrugs
    .map((d) => ({ ...d, days: Math.floor((new Date(d.expiry) - new Date()) / 86400000) }))
    .filter((d) => d.days <= 120 && d.days > 0)
    .slice(0, 6)
)

function isExpiringSoon(exp) {
  return new Date(exp) - new Date() <= 120 * 86400000
}

function daysLeft(exp) {
  const days = Math.floor((new Date(exp) - new Date()) / 86400000)
  return days + ' يوم'
}

function expiryClass(exp) {
  const days = (new Date(exp) - new Date()) / 86400000
  if (days <= 60) return 'expiry-orange'
  if (days <= 120) return 'expiry-yellow'
  return 'expiry-green'
}

const recentInvoices = [
  { number: 'INV-2026-014', patient: 'أحمد محمد علي', doctor: 'د. عبدالكريم الشميري', total: 18500, posted: true },
  { number: 'INV-2026-013', patient: 'فاطمة عبدالله حسن', doctor: 'د. سمية المقطري', total: 42300, posted: true },
  { number: 'INV-2026-012', patient: 'علي حسين محمد', doctor: '—', total: 7800, posted: true },
  { number: 'INV-2026-011', patient: 'خالد عمر سعيد', doctor: 'د. فيصل الحيمي', total: 55900, posted: false },
]

const hourlySales = [
  { hour: '8ص', value: 42000 },
  { hour: '10ص', value: 68000 },
  { hour: '12م', value: 124000 },
  { hour: '2م', value: 91000 },
  { hour: '4م', value: 55000 },
  { hour: '6م', value: 78000 },
  { hour: '8م', value: 32000 },
]
const maxHour = Math.max(...hourlySales.map((h) => h.value))

function fmt(n) {
  return String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
</script>

<style scoped>
.dashboard {
  padding: var(--space-2);
  overflow-y: auto;
  height: 100%;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.stat-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: var(--space-2) var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.stat-icon {
  font-size: 22px;
}

.stat-value {
  font-size: var(--font-size-lg);
  font-weight: bold;
  color: var(--color-primary);
}

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--space-3);
}

.dash-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  display: flex;
  flex-direction: column;
  min-height: 240px;
}

.card-title {
  font-size: var(--font-size-base);
  font-weight: bold;
  color: var(--color-primary);
  padding: var(--space-2);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.table-container {
  overflow: auto;
  flex: 1;
}

.table-container table {
  min-width: 320px;
}

.status-low { color: var(--color-warning); font-weight: bold }
.status-out { color: var(--color-error); font-weight: bold }

.expiry-green { color: var(--color-success); font-weight: bold }
.expiry-yellow { color: #f9a825; font-weight: bold }
.expiry-orange { color: var(--color-warning); font-weight: bold }

.chart-placeholder {
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.big-number {
  font-size: 28px;
  font-weight: bold;
  color: var(--color-primary);
}

.big-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: -8px;
}

.chart-bars {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  height: 110px;
  padding-top: var(--space-2);
}

.bar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.bar {
  width: 26px;
  background: linear-gradient(180deg, #1565c0, var(--color-primary));
  border-radius: 2px 2px 0 0;
  min-height: 4px;
}

.bar-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
</style>
