<template>
  <div class="dashboard-screen">
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">مبيعات اليوم</div><div class="kpi-value num">{{ fmt(kpi.todaySales) }}</div></div>
      <div class="kpi-card"><div class="kpi-label">مبيعات هذا الشهر</div><div class="kpi-value num">{{ fmt(kpi.monthSales) }}</div></div>
      <div class="kpi-card"><div class="kpi-label">رصيد الصندوق</div><div class="kpi-value num">{{ fmt(kpi.cashBalance) }}</div></div>
      <div class="kpi-card"><div class="kpi-label">قيمة المخزون</div><div class="kpi-value num">{{ fmt(kpi.inventoryValue) }}</div></div>
      <div class="kpi-card"><div class="kpi-label">ذمم عملاء مستحقة</div><div class="kpi-value num">{{ fmt(kpi.receivables) }}</div></div>
      <div class="kpi-card"><div class="kpi-label">ذمم موردون مستحقة</div><div class="kpi-value num">{{ fmt(kpi.payables) }}</div></div>
      <div class="kpi-card"><div class="kpi-label">عدد الأصناف</div><div class="kpi-value">{{ kpi.itemsCount }}</div></div>
      <div class="kpi-card"><div class="kpi-label">أصناف نافذة/قريبة الانتهاء</div><div class="kpi-value num" :class="{ warn: kpi.expiryAlert > 0 }">{{ kpi.expiryAlert }}</div></div>
    </div>

    <div class="dash-grid">
      <div class="dash-panel">
        <div class="panel-title">آخر 10 قيود محاسبية</div>
        <table class="dense-table">
          <thead><tr><th style="width:40px">#</th><th style="width:90px">التاريخ</th><th>الوصف</th><th style="width:65px">المرجع</th></tr></thead>
          <tbody>
            <tr v-for="e in recentEntries" :key="e.id">
              <td>{{ e.id }}</td><td>{{ e.date }}</td>
              <td style="font-weight:bold">{{ e.description || 'بدون وصف' }}</td>
              <td class="ref-cell">{{ refKindLabel(e.refKind) }}</td>
            </tr>
            <tr v-if="recentEntries.length === 0"><td colspan="4" class="empty-state">لا توجد قيود بعد — ابدأ بعملية بيع أو شراء</td></tr>
          </tbody>
        </table>
      </div>

      <div class="dash-panel">
        <div class="panel-title">أكثر الأصناف مبيعًا</div>
        <table class="dense-table">
          <thead><tr><th>الصنف</th><th style="width:75px">الكمية المباعة</th></tr></thead>
          <tbody>
            <tr v-for="it in topItems" :key="it.id">
              <td>{{ it.name }}</td><td class="num">{{ it.sold }}</td>
            </tr>
            <tr v-if="topItems.length === 0"><td colspan="2" class="empty-state">لا توجد مبيعات بعد</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { db, activeItems } from '../../db/database.js'
import { fmt, accountBalance } from '../../db/engine.js'

const kpi = ref({ todaySales: 0, monthSales: 0, cashBalance: 0, inventoryValue: 0, receivables: 0, payables: 0, itemsCount: 0, expiryAlert: 0 })
const recentEntries = ref([])
const topItems = ref([])

function refKindLabel(k) { return { sale: 'بيع', purchase: 'شراء', collection: 'تحصيل', supplierPayment: 'سداد مورد', saleReturn: 'مرتجع', manual: 'قيد يدوي', opening: 'افتتاحي' }[k] || k || '—' }

function todayStr() { return new Date().toISOString().slice(0, 10) }
function monthStart() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01` }

async function loadKpi() {
  const today = todayStr()
  const month = monthStart()
  const sales = await db.salesInvoices.toArray()
  const todaySales = sales.filter(s => s.date === today && s.status === 'posted').reduce((sum, s) => sum + (s.total || 0), 0)
  const monthSales = sales.filter(s => s.date >= month && s.status === 'posted').reduce((sum, s) => sum + (s.total || 0), 0)

  // حسابات النظام
  const accounts = await db.chartOfAccounts.toArray()
  const get = code => accounts.find(a => a.code === code)
  const cashId = get('1-1-1')?.id
  const recvId = get('1-2')?.id
  const payId = get('2-1')?.id

  const cashBalance = cashId ? await accountBalance(cashId) : 0
  const receivables = recvId ? await accountBalance(recvId) : 0
  const payables = payId ? await accountBalance(payId) : 0

  // قيمة المخزون = مجموع qty×cost لكل التشغيلات
  const batches = await db.batches.toArray()
  const inventoryValue = batches.filter(b => !b.quarantined && b.qty > 0).reduce((s, b) => s + b.qty * (b.cost || 0), 0)

  // أصناف قريبة الانتهاء (خلال 90 يومًا)
  const soon = new Date(); soon.setDate(soon.getDate() + 90)
  const soonStr = soon.toISOString().slice(0, 10)
  const expiryAlert = batches.filter(b => !b.quarantined && b.qty > 0 && b.expDate && b.expDate <= soonStr).length

  const itemsCount = (await activeItems()).length

  kpi.value = { todaySales, monthSales, cashBalance, inventoryValue, receivables, payables, itemsCount, expiryAlert }
}

async function loadRecentEntries() {
  const entries = await db.journalEntries.orderBy('id').reverse().limit(10).toArray()
  recentEntries.value = entries.sort((a, b) => b.id - a.id)
}

async function loadTopItems() {
  const lines = await db.salesLines.toArray()
  const items = await db.items.toArray()
  const map = {}
  for (const l of lines) map[l.itemId] = (map[l.itemId] || 0) + l.qty
  const names = Object.fromEntries(items.map(i => [i.id, i.name]))
  topItems.value = Object.entries(map)
    .map(([id, sold]) => ({ id: Number(id), name: names[id] || `صنف #${id}`, sold }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5)
}

onMounted(() => { loadKpi(); loadRecentEntries(); loadTopItems() })
</script>

<style scoped>
.dashboard-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; overflow-y: auto; padding: 4px; background: var(--color-bg-primary); }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(165px, 1fr)); gap: 8px; margin-bottom: 10px; }
.kpi-card { background: #fff; border: 1px solid var(--color-border); border-radius: 4px; padding: 10px 12px; box-shadow: 1px 1px 3px rgba(0,0,0,0.05); }
.kpi-label { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 4px; }
.kpi-value { font-size: 19px; font-weight: bold; color: var(--color-primary); }
.kpi-value.num { direction: ltr; text-align: left; }
.kpi-value.warn { color: #e65100; }
.dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; flex: 1; min-height: 0; }
.dash-panel { display: flex; flex-direction: column; border: 1px solid var(--color-border); background: #fff; border-radius: 4px; min-height: 0; }
.panel-title { background: var(--color-bg-secondary); border-bottom: 1px solid var(--color-border); padding: 6px 10px; font-size: 13px; font-weight: bold; }
.panel-title ~ table { flex: 1; overflow: auto; }
.empty-state { text-align: center; color: var(--color-text-secondary); padding: 14px; }
.num { text-align: left; direction: ltr; }
.ref-cell { font-size: 12px; color: var(--color-text-secondary); }
@media (max-width: 900px) { .dash-grid { grid-template-columns: 1fr; } }
@media (max-width: 768px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
