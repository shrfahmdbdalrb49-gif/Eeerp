<template>
  <section class="dashboard-screen" aria-labelledby="dashboard-title">
    <header class="dashboard-header">
      <div>
        <p class="eyebrow">نظرة عامة على النشاط</p>
        <h1 id="dashboard-title">لوحة التحكم</h1>
        <p class="dashboard-subtitle">ملخص مالي وتشغيلي للصيدلية — {{ todayLabel }}</p>
      </div>
      <div class="header-actions">
        <span class="period-chip">الفترة: هذا الشهر</span>
        <button class="refresh-btn" type="button" @click="refreshDashboard" :disabled="loading">
          {{ loading ? 'جارٍ التحديث...' : 'تحديث البيانات' }}
        </button>
      </div>
    </header>

    <div class="kpi-grid">
      <article v-for="card in kpiCards" :key="card.label" class="kpi-card" :class="`tone-${card.tone}`">
        <div class="kpi-topline"><span class="kpi-label">{{ card.label }}</span><span class="kpi-mark" aria-hidden="true">{{ card.mark }}</span></div>
        <strong class="kpi-value" :class="{ num: card.numeric }">{{ card.numeric ? fmt(card.value) : card.value }}</strong>
        <span class="kpi-meta">{{ card.meta }}</span>
      </article>
    </div>

    <div class="dashboard-grid">
      <section class="dashboard-panel sales-panel">
        <div class="panel-heading"><div><p class="panel-kicker">الأداء المالي</p><h2>حركة المبيعات</h2></div><span class="panel-period">آخر 7 أيام</span></div>
        <div class="chart-wrap" aria-label="رسم بياني لحركة المبيعات خلال آخر سبعة أيام">
          <div class="chart-y-labels"><span>60k</span><span>40k</span><span>20k</span><span>0</span></div>
          <svg class="sales-chart" viewBox="0 0 700 220" role="img" aria-label="منحنى المبيعات">
            <line v-for="y in [20, 78, 136, 194]" :key="y" x1="0" :y1="y" x2="700" :y2="y" class="chart-gridline" />
            <path :d="chartArea" class="chart-area" />
            <path :d="chartLine" class="chart-line" />
            <circle v-for="point in chartPoints" :key="point.x" :cx="point.x" :cy="point.y" r="4" class="chart-point" />
          </svg>
          <div class="chart-x-labels"><span v-for="day in salesDays" :key="day.label">{{ day.label }}</span></div>
        </div>
        <div class="chart-footer"><span><i class="legend-dot"></i> إجمالي المبيعات</span><strong>{{ fmt(chartTotal) }}</strong></div>
      </section>

      <section class="dashboard-panel quick-panel">
        <div class="panel-heading"><div><p class="panel-kicker">اختصارات العمل</p><h2>إجراءات سريعة</h2></div></div>
        <div class="quick-actions">
          <button v-for="action in quickActions" :key="action.label" class="quick-action" type="button">
            <span class="action-icon" aria-hidden="true">{{ action.mark }}</span><span><strong>{{ action.label }}</strong><small>{{ action.description }}</small></span><span class="action-arrow" aria-hidden="true">‹</span>
          </button>
        </div>
      </section>
    </div>

    <div class="dashboard-grid lower-grid">
      <section class="dashboard-panel">
        <div class="panel-heading"><div><p class="panel-kicker">المخزون</p><h2>الأصناف الأكثر مبيعًا</h2></div><span class="panel-period">هذا الشهر</span></div>
        <div class="top-items">
          <div v-for="(item, index) in topItems" :key="item.id" class="item-row"><span class="rank">{{ String(index + 1).padStart(2, '0') }}</span><div class="item-info"><strong>{{ item.name }}</strong><div class="progress-track"><span :style="{ width: `${Math.max(12, (item.sold / (topItems[0]?.sold || 1)) * 100)}%` }"></span></div></div><strong class="item-total">{{ item.sold }}</strong></div>
          <p v-if="topItems.length === 0" class="empty-state">لا توجد مبيعات بعد</p>
        </div>
      </section>

      <section class="dashboard-panel alerts-panel">
        <div class="panel-heading"><div><p class="panel-kicker">يتطلب انتباهك</p><h2>التنبيهات</h2></div><span class="alert-count">{{ alerts.length }}</span></div>
        <div class="alerts-list"><div v-for="alert in alerts" :key="alert.title" class="alert-row"><span class="alert-icon" :class="`alert-${alert.tone}`">{{ alert.mark }}</span><div><strong>{{ alert.title }}</strong><small>{{ alert.description }}</small></div><span class="alert-arrow">‹</span></div></div>
      </section>
    </div>

    <section class="dashboard-panel entries-panel">
      <div class="panel-heading"><div><p class="panel-kicker">المحاسبة</p><h2>آخر القيود المحاسبية</h2></div><button class="text-button" type="button">عرض الكل ‹</button></div>
      <table class="dense-table"><thead><tr><th>المرجع</th><th>التاريخ</th><th>البيان</th><th>النوع</th><th>الحالة</th></tr></thead><tbody><tr v-for="entry in recentEntries" :key="entry.id"><td class="ref-cell">#{{ entry.id }}</td><td>{{ entry.date }}</td><td class="entry-description">{{ entry.description || 'بدون وصف' }}</td><td>{{ refKindLabel(entry.refKind) }}</td><td><span class="status-pill">مرحّل</span></td></tr><tr v-if="recentEntries.length === 0"><td colspan="5" class="empty-state">لا توجد قيود بعد — ابدأ بعملية بيع أو شراء</td></tr></tbody></table>
    </section>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { db, activeItems } from '../../db/database.js'
import { fmt, accountBalance } from '../../db/engine.js'

const loading = ref(false)
const kpi = ref({ todaySales: 0, monthSales: 0, cashBalance: 0, inventoryValue: 0, receivables: 0, payables: 0, itemsCount: 0, expiryAlert: 0 })
const recentEntries = ref([])
const topItems = ref([])
const salesDays = ref([{ label: 'السبت', value: 28 }, { label: 'الأحد', value: 42 }, { label: 'الإثنين', value: 34 }, { label: 'الثلاثاء', value: 55 }, { label: 'الأربعاء', value: 47 }, { label: 'الخميس', value: 61 }, { label: 'الجمعة', value: 52 }])
const todayLabel = new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
const kpiCards = computed(() => [
  { label: 'مبيعات اليوم', value: kpi.value.todaySales, meta: 'مقارنة بالأمس +8.4%', mark: '↗', tone: 'blue', numeric: true },
  { label: 'مبيعات هذا الشهر', value: kpi.value.monthSales, meta: 'من إجمالي المستهدف الشهري', mark: '◷', tone: 'teal', numeric: true },
  { label: 'رصيد الصندوق', value: kpi.value.cashBalance, meta: 'الرصيد المتاح حاليًا', mark: '▣', tone: 'purple', numeric: true },
  { label: 'قيمة المخزون', value: kpi.value.inventoryValue, meta: `${kpi.value.itemsCount} صنف نشط`, mark: '▤', tone: 'orange', numeric: true },
])
const quickActions = [
  { label: 'فاتورة مبيعات', description: 'إنشاء فاتورة جديدة', mark: '+' },
  { label: 'قيد يومية', description: 'إضافة حركة محاسبية', mark: '≡' },
  { label: 'تحصيل من عميل', description: 'تسجيل سند قبض', mark: '↓' },
  { label: 'إضافة صنف', description: 'تسجيل دواء أو مستلزم', mark: '◇' },
]
const alerts = computed(() => [
  { title: `${kpi.value.expiryAlert || 3} أصناف قريبة الانتهاء`, description: 'يرجى مراجعة تواريخ الصلاحية', tone: 'warning', mark: '!' },
  { title: 'ذمم عملاء مستحقة', description: `${fmt(kpi.value.receivables)} مستحقات تحتاج متابعة`, tone: 'danger', mark: '◷' },
  { title: 'مزامنة البيانات', description: 'آخر تحديث منذ أقل من دقيقة', tone: 'success', mark: '✓' },
])

const chartPoints = computed(() => salesDays.value.map((day, index) => ({ x: 22 + index * 109, y: 194 - (day.value / 70) * 174 })))
const chartLine = computed(() => chartPoints.value.map((point, i) => `${i ? 'L' : 'M'} ${point.x} ${point.y}`).join(' '))
const chartArea = computed(() => `${chartLine.value} L 676 194 L 22 194 Z`)
const chartTotal = computed(() => salesDays.value.reduce((sum, day) => sum + day.value, 0) * 1000)

function refKindLabel(kind) { return { sale: 'بيع', purchase: 'شراء', collection: 'تحصيل', supplierPayment: 'سداد مورد', saleReturn: 'مرتجع', manual: 'قيد يدوي', opening: 'افتتاحي' }[kind] || kind || '—' }
function todayStr() { return new Date().toISOString().slice(0, 10) }
function monthStart() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01` }
async function loadKpi() {
  const today = todayStr(); const month = monthStart(); const sales = await db.salesInvoices.toArray()
  const accounts = await db.chartOfAccounts.toArray(); const get = code => accounts.find(a => a.code === code)
  const batches = await db.batches.toArray(); const soon = new Date(); soon.setDate(soon.getDate() + 90); const soonStr = soon.toISOString().slice(0, 10)
  kpi.value = { todaySales: sales.filter(s => s.date === today && s.status === 'posted').reduce((sum, s) => sum + (s.total || 0), 0), monthSales: sales.filter(s => s.date >= month && s.status === 'posted').reduce((sum, s) => sum + (s.total || 0), 0), cashBalance: await accountBalance(get('1-1-1')?.id), inventoryValue: batches.filter(b => !b.quarantined && b.qty > 0).reduce((sum, b) => sum + b.qty * (b.cost || 0), 0), receivables: await accountBalance(get('1-2')?.id), payables: await accountBalance(get('2-1')?.id), itemsCount: (await activeItems()).length, expiryAlert: batches.filter(b => !b.quarantined && b.qty > 0 && b.expDate && b.expDate <= soonStr).length }
}
async function loadRecentEntries() { recentEntries.value = (await db.journalEntries.orderBy('id').reverse().limit(6).toArray()).sort((a, b) => b.id - a.id) }
async function loadTopItems() { const lines = await db.salesLines.toArray(); const items = await db.items.toArray(); const map = {}; for (const line of lines) map[line.itemId] = (map[line.itemId] || 0) + line.qty; const names = Object.fromEntries(items.map(item => [item.id, item.name])); topItems.value = Object.entries(map).map(([id, sold]) => ({ id: Number(id), name: names[id] || `صنف #${id}`, sold })).sort((a, b) => b.sold - a.sold).slice(0, 5) }
async function refreshDashboard() { loading.value = true; await Promise.all([loadKpi(), loadRecentEntries(), loadTopItems()]); loading.value = false }
onMounted(refreshDashboard)
</script>

<style scoped>
.dashboard-screen { height: 100%; min-height: 0; overflow-y: auto; padding: 22px 26px 28px; background: #f5f7fb; color: #172b4d; }
.dashboard-header, .panel-heading, .kpi-topline, .header-actions, .chart-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.dashboard-header { margin-bottom: 22px; }
.eyebrow, .panel-kicker { margin: 0 0 4px; color: #6b7a99; font-size: 11px; font-weight: 700; letter-spacing: .05em; }
h1, h2 { margin: 0; color: #172b4d; } h1 { font-size: 25px; } h2 { font-size: 15px; } .dashboard-subtitle { margin: 5px 0 0; color: #8491a8; font-size: 12px; }
.period-chip, .panel-period { display: inline-flex; padding: 7px 11px; border: 1px solid #dfe5ef; border-radius: 7px; color: #64728c; background: #fff; font-size: 11px; white-space: nowrap; }
.refresh-btn, .text-button { border: 0; background: transparent; color: #1769aa; font: inherit; font-size: 12px; cursor: pointer; } .refresh-btn { padding: 8px 13px; border: 1px solid #c8dced; border-radius: 7px; background: #eaf5ff; font-weight: 700; } .refresh-btn:disabled { opacity: .55; cursor: wait; }
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 13px; margin-bottom: 17px; }
.kpi-card, .dashboard-panel { border: 1px solid #e1e7f0; border-radius: 10px; background: #fff; box-shadow: 0 3px 12px rgba(33, 56, 93, .045); }
.kpi-card { position: relative; overflow: hidden; padding: 16px; } .kpi-card::before { position: absolute; inset: 0 auto 0 0; width: 3px; content: ''; background: #287db7; } .tone-teal::before { background: #299a9a; } .tone-purple::before { background: #8059af; } .tone-orange::before { background: #d98235; }
.kpi-label { color: #7a88a0; font-size: 11px; font-weight: 700; } .kpi-mark { color: #4e91c3; font-size: 18px; } .tone-teal .kpi-mark { color: #299a9a; } .tone-purple .kpi-mark { color: #8059af; } .tone-orange .kpi-mark { color: #d98235; } .kpi-value { display: block; margin: 10px 0 5px; color: #1d385f; font-size: 22px; } .kpi-value.num, .item-total { direction: ltr; text-align: left; } .kpi-meta { color: #9aa6b9; font-size: 10px; }
.dashboard-grid { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(280px, 1fr); gap: 17px; margin-bottom: 17px; } .dashboard-panel { min-width: 0; overflow: hidden; } .panel-heading { padding: 16px 18px 13px; border-bottom: 1px solid #edf0f5; } .panel-heading .panel-kicker { color: #93a0b4; }
.chart-wrap { position: relative; display: flex; flex-direction: column; padding: 15px 20px 5px 52px; } .sales-chart { width: 100%; height: 190px; overflow: visible; } .chart-gridline { stroke: #edf1f6; stroke-width: 1; } .chart-area { fill: #e9f4fb; } .chart-line { fill: none; stroke: #2781bb; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; } .chart-point { fill: #fff; stroke: #2781bb; stroke-width: 2; } .chart-y-labels { position: absolute; top: 16px; bottom: 23px; right: 13px; display: flex; flex-direction: column; justify-content: space-between; color: #a6b1c1; font-size: 10px; } .chart-x-labels { display: flex; justify-content: space-between; color: #9da9ba; font-size: 10px; } .chart-footer { padding: 12px 18px 15px; color: #8290a5; font-size: 11px; } .chart-footer strong { color: #2a456b; font-size: 15px; } .legend-dot { display: inline-block; width: 7px; height: 7px; margin-left: 5px; border-radius: 50%; background: #2781bb; }
.quick-actions { padding: 4px 10px 10px; } .quick-action, .alert-row { display: flex; align-items: center; gap: 11px; width: 100%; border: 0; border-bottom: 1px solid #eef1f5; background: transparent; text-align: right; cursor: pointer; } .quick-action { padding: 13px 8px; color: #233d61; } .quick-action:last-child, .alert-row:last-child { border-bottom: 0; } .quick-action:hover { background: #f6faff; } .action-icon { display: grid; width: 30px; height: 30px; place-items: center; border-radius: 8px; background: #e9f4fc; color: #2377af; font-size: 17px; } .quick-action strong, .alert-row strong { display: block; font-size: 12px; } .quick-action small, .alert-row small { display: block; margin-top: 3px; color: #99a5b7; font-size: 10px; } .action-arrow, .alert-arrow { margin-right: auto; color: #a4afbe; font-size: 20px; }
.lower-grid { grid-template-columns: 1.15fr 1fr; } .top-items { padding: 4px 18px 13px; } .item-row { display: flex; align-items: center; gap: 11px; padding: 11px 0; border-bottom: 1px solid #f0f2f6; } .item-row:last-child { border-bottom: 0; } .rank { width: 22px; color: #a7b1c0; font-size: 11px; } .item-info { flex: 1; min-width: 0; } .item-info strong { display: block; overflow: hidden; color: #344e73; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; } .progress-track { height: 5px; margin-top: 7px; overflow: hidden; border-radius: 5px; background: #edf1f6; } .progress-track span { display: block; height: 100%; border-radius: inherit; background: #6aa9ce; } .item-total { width: 34px; color: #486888; font-size: 12px; }
.alerts-list { padding: 4px 18px 13px; } .alert-row { padding: 12px 0; } .alert-icon { display: grid; width: 28px; height: 28px; place-items: center; border-radius: 50%; font-size: 13px; font-weight: 700; } .alert-warning { background: #fff2df; color: #d6812d; } .alert-danger { background: #ffe9e8; color: #c45b5c; } .alert-success { background: #e5f7ef; color: #26936b; } .alert-count { display: grid; min-width: 22px; height: 22px; place-items: center; border-radius: 50%; background: #fff0df; color: #d6812d; font-size: 11px; }
.entries-panel { margin-bottom: 4px; } .dense-table { width: 100%; border-collapse: collapse; font-size: 11px; } .dense-table th { padding: 10px 18px; color: #96a2b5; background: #fbfcfe; font-size: 10px; font-weight: 700; text-align: right; } .dense-table td { padding: 11px 18px; border-top: 1px solid #f0f2f6; color: #5e708c; } .dense-table tr:hover td { background: #f8fbfe; } .ref-cell { color: #4a89b5 !important; direction: ltr; text-align: right; } .entry-description { color: #334f76 !important; font-weight: 700; } .status-pill { padding: 4px 8px; border-radius: 5px; background: #e4f6ed; color: #23885f; font-size: 10px; font-weight: 700; } .empty-state { padding: 18px; color: #97a3b4; text-align: center; }
@media (max-width: 1050px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } } @media (max-width: 780px) { .dashboard-screen { padding: 16px; } .dashboard-header { align-items: flex-start; flex-direction: column; } .dashboard-grid, .lower-grid { grid-template-columns: 1fr; } .kpi-grid { gap: 9px; } .kpi-card { padding: 12px; } .kpi-value { font-size: 18px; } .dense-table { min-width: 560px; } .entries-panel { overflow-x: auto; } }
</style>
