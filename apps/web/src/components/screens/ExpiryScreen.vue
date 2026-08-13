<template>
  <div class="expiry-screen">
    <div class="screen-toolbar">
      <button :class="['btn', filter === 'all' ? 'btn-primary' : 'btn-secondary']" @click="filter = 'all'">الكل ({{ rows.length }})</button>
      <button :class="['btn', filter === 'expired' ? 'btn-danger' : 'btn-secondary']" @click="filter = 'expired'">منتهية ({{ expiredCount }})</button>
      <button :class="['btn', filter === 'near' ? 'btn-primary' : 'btn-secondary']" @click="filter = 'near'">قريبة الانتهاء ({{ nearCount }})</button>
      <input type="text" class="input-field search" placeholder="🔍 بحث بالصنف أو التشغيلة..." v-model="search" />
      <span class="toolbar-spacer"></span>
      <span class="toolbar-info">من تشغيلات المخزون الفعلية في قاعدة البيانات</span>
    </div>

    <div class="alert-banner" v-if="expiredCount > 0">
      ⚠️ تنبيه: يوجد <strong>{{ expiredCount }}</strong> تشغيلة منتهية الصلاحية — أُعيدت تلقائيًا عن البيع
    </div>

    <div class="table-container table-scroll">
      <table class="dense-table">
        <thead>
          <tr>
            <th style="width:30px">#</th>
            <th>كود الصنف</th>
            <th>اسم الصنف</th>
            <th>التشغيلة</th>
            <th>تاريخ الانتهاء</th>
            <th>الأيام المتبقية</th>
            <th style="width:85px">الكمية</th>
            <th style="width:100px">القيمة (تكلفة)</th>
            <th style="width:85px">الحالة</th>
            <th style="width:75px">إجراء</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in visible" :key="r.batchId">
            <td>{{ i + 1 }}</td>
            <td>{{ r.itemCode }}</td>
            <td style="font-weight:bold">{{ r.itemName }}</td>
            <td>{{ r.batchNo }}</td>
            <td dir="ltr">{{ r.expDate }}</td>
            <td :class="r.days < 0 ? 'text-danger' : r.days <= 90 ? 'text-warning' : ''">{{ r.days }}</td>
            <td class="num">{{ r.qty }}</td>
            <td class="num">{{ fmt(r.qty * r.cost) }}</td>
            <td><span class="status-chip" :class="r.quarantined ? 'quar' : r.days < 0 ? 'expired' : r.days <= 90 ? 'near' : 'ok'">{{ r.quarantined ? 'معزول' : r.days < 0 ? 'منتهية' : r.days <= 90 ? 'قريبة' : 'سليمة' }}</span></td>
            <td>
              <button class="btn btn-secondary icon-btn" :title="r.quarantined ? 'إعادة عن البيع' : 'إبعاد عن البيع'" @click="quarantine(r)">{{ r.quarantined ? '🔓' : '🚫' }}</button>
            </td>
          </tr>
          <tr v-if="visible.length === 0">
            <td colspan="10" class="empty-state">لا توجد تشغيلات صالحة بعد — استلم شحنات شراء فعلية لتظهر هنا</td>
          </tr>
        </tbody>
        <tfoot v-if="visible.length">
          <tr class="totals-row">
            <td colspan="6"><strong>إجمالي الكميات</strong></td>
            <td class="num"><strong>{{ totalQty }}</strong></td>
            <td class="num"><strong>{{ fmt(totalValue) }}</strong></td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
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
        expDate: b.expDate, qty: b.qty, cost: b.cost || 0, quarantined,
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
.expiry-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.screen-toolbar { display: flex; gap: 6px; padding: 6px; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: 2px; margin-bottom: 6px; align-items: center; flex-wrap: wrap; flex-shrink: 0; }
.toolbar-spacer { flex: 1; }
.toolbar-info { font-size: 12px; color: var(--color-text-secondary); }
.table-scroll { flex: 1; overflow: auto; background: var(--color-bg-primary); min-height: 0; }
.alert-banner { background: #FDECEA; border: 1px solid var(--color-error); color: var(--color-error); padding: 6px 10px; border-radius: 2px; margin-bottom: 6px; font-size: 13px; flex-shrink: 0; }
.empty-state { text-align: center; color: var(--color-text-secondary); padding: 16px; }
.num { text-align: left; direction: ltr; }
.text-danger { color: var(--color-error); font-weight: bold; }
.text-warning { color: var(--color-warning); font-weight: bold; }
.totals-row td { background: var(--color-primary-light, #eef4fb) !important; border-top: 2px solid var(--color-primary); font-weight: bold; }
.icon-btn { padding: 0 6px; }
.btn { padding: 6px 14px; border: none; border-radius: 3px; cursor: pointer; font-weight: bold; font-size: 13px; }
.btn-primary { background: var(--color-primary); color: #fff; }
.btn-secondary { background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border); }
.btn-danger { background: var(--color-error); color: #fff; }
.input-field { padding: 6px 8px; border: 1px solid var(--color-border); border-radius: 3px; font-size: 13px; background: #fff; }
.input-field.search { width: 220px; }
.status-chip { padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: bold; }
.status-chip.ok { background: #e6f4ea; color: #1b5e20; }
.status-chip.near { background: #fff4e0; color: #e65100; }
.status-chip.expired { background: #fdeaea; color: #b71c1c; }
.status-chip.quar { background: #eee; color: #555; }
@media (max-width: 768px) { .screen-toolbar { flex-direction: column; align-items: stretch; } .input-field.search { width: 100%; } }
</style>
