<template>
  <div class="expiry-screen">
    <div class="page-screen">
      <div class="page-header">
        <div class="page-title">
          <h1>انتهاء الصلاحية (FEFO)</h1>
          <p class="page-subtitle">من تشغيلات المخزون الفعلية في قاعدة البيانات — التشغيلة المنتهية تُعزل تلقائيًا عن البيع</p>
        </div>
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" placeholder="بحث بالصنف أو التشغيلة..." v-model="search" />
        </div>
      </div>

      <!-- شريط الفلترة + تنبيه -->
      <div class="controls-row">
        <div class="segmented">
          <button :class="['seg', filter === 'all' ? 'active' : '']" @click="filter = 'all'">الكل ({{ rows.length }})</button>
          <button :class="['seg', filter === 'expired' ? 'active' : '']" @click="filter = 'expired'">منتهية ({{ expiredCount }})</button>
          <button :class="['seg', filter === 'near' ? 'active' : '']" @click="filter = 'near'">قريبة الانتهاء ({{ nearCount }})</button>
        </div>
      </div>

      <div class="alert-banner" v-if="expiredCount > 0">
        <span class="alert-icon">⚠️</span>
        <span>تنبيه: يوجد <strong>{{ expiredCount }}</strong> تشغيلة منتهية الصلاحية — أُعيدت تلقائيًا عن البيع</span>
      </div>

      <div class="table-card">
        <table class="bolt-table">
          <thead>
            <tr>
              <th style="width:40px">#</th>
              <th style="width:95px">كود الصنف</th>
              <th>اسم الصنف</th>
              <th style="width:100px">التشغيلة</th>
              <th style="width:110px">تاريخ الانتهاء</th>
              <th style="width:90px">الأيام المتبقية</th>
              <th style="width:85px; text-align:left">الكمية</th>
              <th style="width:120px; text-align:left">القيمة (تكلفة)</th>
              <th style="width:90px">الحالة</th>
              <th style="width:75px">إجراء</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in visible" :key="r.batchId">
              <td>{{ i + 1 }}</td>
              <td class="code-cell">{{ r.itemCode }}</td>
              <td style="font-weight:600">{{ r.itemName }}</td>
              <td class="mono">{{ r.batchNo }}</td>
              <td class="mono">{{ r.expDate }}</td>
              <td :class="r.days < 0 ? 'text-danger' : r.days <= 90 ? 'text-warning' : ''"><b>{{ r.days }}</b></td>
              <td class="num-cell">{{ r.qty }}</td>
              <td class="num-cell">{{ fmt(r.qty * r.cost) }}</td>
              <td><span class="status-pill" :class="r.quarantined ? 'quar' : r.days < 0 ? 'expired' : r.days <= 90 ? 'near' : 'ok'">{{ r.quarantined ? 'معزول' : r.days < 0 ? 'منتهية' : r.days <= 90 ? 'قريبة' : 'سليمة' }}</span></td>
              <td>
                <button class="act" :title="r.quarantined ? 'إعادة عن البيع' : 'إبعاد عن البيع'" @click="quarantine(r)">{{ r.quarantined ? '🔓' : '🚫' }}</button>
              </td>
            </tr>
            <tr v-if="visible.length === 0">
              <td colspan="10" class="empty-row">
                <div class="empty-box">
                  <span class="empty-icon">🗓️</span>
                  <p class="empty-title">لا توجد تشغيلات صالحة بعد</p>
                  <p class="empty-hint">استلم شحنات شراء فعلية لتظهر هنا</p>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot v-if="visible.length">
            <tr class="totals-row">
              <td colspan="6"><strong>إجمالي الكميات</strong></td>
              <td class="num-cell"><strong>{{ totalQty }}</strong></td>
              <td class="num-cell"><strong>{{ fmt(totalValue) }}</strong></td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { db } from '../../db/database.js'
import { fmt } from '../../db/engine.js'

const rows = ref([])
const filter = ref('all')
const search = ref('')

const today = new Date()
function parseDate(s) { return new Date(s + 'T00:00:00') }

function enrich(r) {
  const days = Math.floor((parseDate(r.expDate) - today) / 86400000)
  return { ...r, days }
}

const expiredCount = computed(() => rows.value.filter(r => r.days < 0 && !r.quarantined).length)
const nearCount = computed(() => rows.value.filter(r => r.days >= 0 && r.days <= 90 && !r.quarantined).length)

const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  return rows.value.filter(r => {
    if (filter.value === 'expired' && (r.days >= 0 || r.quarantined)) return false
    if (filter.value === 'near' && (r.days < 0 || r.days > 90 || r.quarantined)) return false
    if (filter.value === 'all' && r.quarantined) return false
    if (q) return r.itemName.toLowerCase().includes(q) || r.batchNo.toLowerCase().includes(q) || r.itemCode.toLowerCase().includes(q)
    return true
  }).sort((a, b) => parseDate(a.expDate) - parseDate(b.expDate))
})

const totalQty = computed(() => visible.value.reduce((s, r) => s + r.qty, 0))
const totalValue = computed(() => visible.value.reduce((s, r) => s + r.qty * r.cost, 0))

async function loadData() {
  const batches = await db.batches.toArray()
  const items = await db.items.toArray()
  const nameBy = Object.fromEntries(items.map(i => [i.id, { name: i.name, code: i.code }]))
  const todayStr = new Date().toISOString().slice(0, 10)
  rows.value = batches
    .filter(b => !b.quarantined && b.qty > 0 && b.expDate)
    .map(b => {
      const item = nameBy[b.itemId] || { name: `صنف #${b.itemId}`, code: '?' }
      // التشغيلة المنتهية تُعاد تلقائيًا عن البيع
      let quarantined = false
      if (b.expDate <= todayStr) {
        quarantined = true
        db.batches.update(b.id, { quarantined: true, updatedAt: Date.now() }).catch(() => {})
      }
      return {
        batchId: b.id, itemId: b.itemId, batchNo: b.batchNo || `LOT-${b.id}`,
        expDate: b.expDate, qty: b.qty, cost: b.cost ?? b.costPrice ?? 0, quarantined,
        itemName: item.name, itemCode: item.code,
      }
    })
    .map(enrich)
}

async function quarantine(r) {
  await db.batches.update(r.batchId, { quarantined: !r.quarantined, updatedAt: Date.now() })
  await loadData()
}

onMounted(loadData)
</script>

<style scoped>
/* ============================================
   انتهاء الصلاحية — نمط bolt.host
   ============================================ */
.expiry-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.page-screen { padding: 24px; display: flex; flex-direction: column; gap: 14px; overflow: auto; flex: 1; }
.page-header { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.page-title h1 { font-size: 26px; font-weight: 800; color: #0f172a; line-height: 1.2; }
.page-subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }

.search-box { margin-right: auto; display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; }
.search-icon { font-size: 12px; }
.search-input { border: none; outline: none; background: transparent; font-size: 13px; width: 220px; font-family: inherit; }

.controls-row { display: flex; align-items: center; gap: 10px; }
.segmented { display: flex; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #f1f5f9; height: 36px; }
.seg { padding: 0 16px; border: none; background: transparent; font-size: 13px; font-weight: 600; color: #64748b; cursor: pointer; font-family: inherit; transition: all 0.15s; }
.seg.active { background: #2563eb; color: #fff; }
.seg:hover:not(.active) { background: #e2e8f0; }

.alert-banner { display: flex; align-items: center; gap: 8px; background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; padding: 10px 14px; border-radius: 10px; font-size: 13px; font-weight: 600; }
.alert-icon { font-size: 15px; }

.num-cell { text-align: left; direction: ltr; font-variant-numeric: tabular-nums; }
.code-cell { direction: ltr; font-family: monospace; font-size: 12px; }
.mono { font-family: monospace; font-size: 12px; direction: ltr; }
.text-danger { color: #b91c1c; font-weight: 700; }
.text-warning { color: #ea580c; font-weight: 700; }

.table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05); overflow: auto; flex: 1; min-height: 0; }
.bolt-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.bolt-table thead th { background: #f8fafc; color: #64748b; font-weight: 600; font-size: 12px; padding: 10px 12px; text-align: right; border-bottom: 1px solid #e2e8f0; white-space: nowrap; position: sticky; top: 0; }
.bolt-table tbody td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
.bolt-table tbody tr:hover td { background: #f8fafc; }
.totals-row td { background: #f8fafc !important; font-weight: 700; border-top: 2px solid #e2e8f0; color: #0f172a; }
.empty-row td { padding: 48px 24px !important; border-bottom: none; }
.empty-box { display: flex; flex-direction: column; align-items: center; gap: 6px; color: #94a3b8; }
.empty-icon { font-size: 40px; }
.empty-title { font-size: 15px; font-weight: 700; color: #475569; }
.empty-hint { font-size: 12px; }

.act { height: 30px; width: 32px; border: 1px solid #e2e8f0; background: #fff; border-radius: 6px; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; justify-content: center; }
.act:hover { background: #eff6ff; border-color: #2563eb; }
.status-pill { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.status-pill.ok { background: #f0fdf4; color: #15803d; }
.status-pill.near { background: #fff7ed; color: #ea580c; }
.status-pill.expired { background: #fef2f2; color: #b91c1c; }
.status-pill.quar { background: #f1f5f9; color: #64748b; }

@media (max-width: 768px) {
  .page-screen { padding: 16px; }
  .search-box { width: 100%; }
  .search-input { flex: 1; width: auto; }
  .seg { padding: 0 10px; font-size: 12px; }
  .bolt-table { min-width: 980px; }
}
</style>
