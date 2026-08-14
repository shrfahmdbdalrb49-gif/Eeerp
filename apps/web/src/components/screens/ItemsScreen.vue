<template>
  <div class="items-screen">
    <div class="page-screen">
      <div class="page-header">
        <div class="page-title">
          <h1>الأصناف</h1>
          <p class="page-subtitle">إدارة أصناف المخزون — العدد: {{ filtered.length }} · قيمة المخزون: {{ fmt(inventoryValue) }} ري</p>
        </div>
        <button class="btn btn-primary btn-lg" @click="openForm()">
          <span>جديد</span><span class="btn-icon">+</span>
        </button>
      </div>

      <div class="filter-row">
        <div class="filter-chip active" :class="{ active: stockFilter === '' }" @click="stockFilter = ''">
          <span>الكل</span><span class="chip-count">{{ items.length }}</span>
        </div>
        <div class="filter-chip" :class="{ active: stockFilter === 'low' }" @click="stockFilter = stockFilter === 'low' ? '' : 'low'">
          <span>رصيد منخفض ⚠</span><span class="chip-count">{{ lowCount }}</span>
        </div>
        <div class="filter-chip" :class="{ active: stockFilter === 'out' }" @click="stockFilter = stockFilter === 'out' ? '' : 'out'">
          <span>نفذ من المخزون</span><span class="chip-count">{{ outCount }}</span>
        </div>
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" placeholder="ابحث بالاسم أو الكود أو الباركود..." v-model="search" />
          <button class="search-go" @click="applySearch">انتقال</button>
        </div>
      </div>

      <div class="table-card">
        <table class="bolt-table">
          <thead>
            <tr>
              <th style="width:70px">الكود</th>
              <th>الاسم</th>
              <th style="width:130px">الاسم العلمي</th>
              <th style="width:110px">الفئة</th>
              <th style="width:70px">الوحدة</th>
              <th style="width:85px">سعر البيع</th>
              <th style="width:95px">متوسط التكلفة</th>
              <th style="width:75px">الرصيد</th>
              <th style="width:75px">الحد الأدنى</th>
              <th style="width:95px">أقرب انتهاء</th>
              <th style="width:80px">الحالة</th>
              <th style="width:50px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="it in filtered" :key="it.id">
              <td><span class="link-cell">{{ it.code }}</span></td>
              <td style="font-weight:600">{{ it.name }}<span v-if="it.prescription" class="rx-chip">وصفة</span></td>
              <td>{{ it.scientific || '—' }}</td>
              <td>{{ it.category || '—' }}</td>
              <td>{{ unitLabel(it.unit) }}</td>
              <td class="num-cell">{{ fmt(it.sellPrice) }}</td>
              <td class="num-cell">{{ fmt(it.avgCost) }}</td>
              <td class="num-cell">
                <span v-if="it.stock === 0" class="stock-out">نفذ</span>
                <span v-else-if="it.stock <= (it.minStock || 0)" class="stock-low" :title="'الحد الأدنى: ' + (it.minStock || 0)">{{ it.stock }} ⚠</span>
                <span v-else class="stock-ok-num">{{ it.stock }}</span>
              </td>
              <td class="num-cell">{{ it.minStock || 0 }}</td>
              <td :class="expiryClass(it.nextExpiry)">{{ fmtDate(it.nextExpiry) || '—' }}</td>
              <td><span class="status-name" :class="isActive(it) ? 'ok' : 'off'">{{ isActive(it) ? 'نشط' : 'معطّل' }}</span></td>
              <td><button class="act danger" @click="handleDelete(it)" :title="it.hasMovement ? 'لا يمكن الحذف — له حركات (سيتم تعطيله)' : 'حذف'">{{ it.hasMovement ? '🔒' : '✕' }}</button></td>
            </tr>
            <tr v-if="filtered.length === 0">
              <td colspan="12" class="empty-row">
                <div class="empty-box">
                  <span class="empty-icon">💊</span>
                  <p class="empty-title">لا توجد أصناف بعد</p>
                  <p class="empty-hint">اضغط زر «جديد» لإضافة أول صنف — لا توجد بيانات وهمية في هذا النظام</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="totals-bar-mini">
      <span>أصناف: <b>{{ filtered.length }}</b></span>
      <span style="color:#d97706">منخفضة: <b>{{ lowCount }}</b></span>
      <span style="color:#dc2626">نفدت: <b>{{ outCount }}</b></span>
      <span class="net-value">قيمة المخزون (FEFO حقيقي): <b>{{ fmt(inventoryValue) }} ري</b></span>
    </div>

    <!-- نموذج إضافة/تعديل صنف -->
    <div v-if="showForm" class="form-modal-overlay" @click.self="showForm = false">
      <div class="form-card-wide">
        <div class="form-card-title">
          <span>{{ editing ? 'تعديل صنف' : 'صنف جديد' }}</span>
          <button class="close-btn" @click="showForm = false">✕</button>
        </div>
        <div class="item-form-fields">
          <div class="field-card" style="flex:0.8">
            <label>الكود</label>
            <input type="text" class="fi" v-model="form.code" placeholder="يُولَّد تلقائيًا إن ترك فارغًا" />
          </div>
          <div class="field-card" style="flex:0.9">
            <label>الباركود</label>
            <input type="text" class="fi" v-model="form.barcode" />
          </div>
          <div class="field-card" style="flex:1.4">
            <label>الاسم التجاري *</label>
            <input type="text" class="fi" v-model="form.name" />
          </div>
          <div class="field-card" style="flex:1.2">
            <label>الاسم العلمي</label>
            <input type="text" class="fi" v-model="form.scientific" />
          </div>
          <div class="field-card" style="flex:1.1">
            <label>الفئة</label>
            <input type="text" class="fi" v-model="form.category" placeholder="مضادات حيوية / مسكنات / ..." list="cat-list" />
            <datalist id="cat-list"><option>مسكنات</option><option>مضادات حيوية</option><option>أمراض مزمنة</option><option>فيتامينات</option><option>مستلزمات</option><option>أخرى</option></datalist>
          </div>
          <div class="field-card">
            <label>الوحدة</label>
            <select class="fi" v-model="form.unit">
              <option v-for="u in units" :key="u" :value="u">{{ u }}</option>
            </select>
          </div>
          <div class="field-card">
            <label>سعر البيع</label>
            <input type="number" class="fi" v-model.number="form.sellPrice" min="0" step="0.01" />
          </div>
          <div class="field-card">
            <label>تكلفة الشراء</label>
            <input type="number" class="fi" v-model.number="form.costPrice" min="0" step="0.01" />
          </div>
          <div class="field-card">
            <label>الحد الأدنى</label>
            <input type="number" class="fi" v-model.number="form.minStock" min="0" />
          </div>
          <div class="field-card">
            <label>يحتاج وصفة؟</label>
            <select class="fi" v-model="form.prescription"><option :value="false">لا</option><option :value="true">نعم</option></select>
          </div>
        </div>
        <div v-if="formError" class="form-msg form-msg-error">{{ formError }}</div>
        <div class="form-actions-row">
          <button class="btn btn-outline" @click="showForm = false">إلغاء</button>
          <button class="btn btn-primary" @click="saveItem" :disabled="saving">
            <span v-if="saving" class="spin">⏳</span>
            <span>{{ saving ? 'جارٍ الحفظ...' : 'حفظ' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { db, isActive } from '../../db/database.js'
import { fmt } from '../../db/engine.js'
import { requirePermission } from '../../db/session.js'

const items = ref([])
const stockInfo = ref({})
const movements = ref(new Set())
const search = ref('')
const stockFilter = ref('')
const showForm = ref(false)
const editing = ref(null)
const saving = ref(false)
const formError = ref('')
const units = ['علبة', 'شريط', 'حبة', 'زجاجة', 'أمبولة', 'قطارة', 'أنبوب', 'ربطة', 'كيس', 'قطعة']
const form = ref({ code: '', name: '', scientific: '', category: '', unit: 'علبة', barcode: '', sellPrice: 0, costPrice: 0, minStock: 0, prescription: false })

const enriched = computed(() => items.value.map(it => ({
  ...it,
  stock: stockInfo.value[it.id]?.total ?? 0,
  avgCost: stockInfo.value[it.id]?.avgCost ?? 0,
  nextExpiry: stockInfo.value[it.id]?.nextExpiry ?? null,
  hasMovement: movements.value.has(it.id),
})))

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  let list = enriched.value
  if (q) list = list.filter(it => it.name.toLowerCase().includes(q) || (it.code || '').toLowerCase().includes(q) || (it.barcode || '').toLowerCase().includes(q))
  if (stockFilter.value === 'low') list = list.filter(it => it.stock > 0 && it.stock <= (it.minStock || 0))
  if (stockFilter.value === 'out') list = list.filter(it => it.stock === 0)
  return list
})
const lowCount = computed(() => enriched.value.filter(it => it.stock > 0 && it.stock <= (it.minStock || 0)).length)
const outCount = computed(() => enriched.value.filter(it => it.stock === 0).length)
const inventoryValue = computed(() => enriched.value.reduce((s, it) => s + it.stock * (it.avgCost || 0), 0))

function unitLabel(u) { return { box: 'علبة', strip: 'شريط', tab: 'قرص', vial: 'قارورة', box_of_vials: 'علبة قوارير' }[u] || u || 'وحدة' }
function fmtDate(ts) { if (!ts) return ''; try { return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch { return ''; } }
function expiryClass(exp) {
  if (!exp) return ''
  const days = (new Date(exp) - new Date()) / 86400000
  if (days <= 0) return 'expiry-red'
  if (days <= 60) return 'expiry-orange'
  if (days <= 120) return 'expiry-yellow'
  return 'expiry-green'
}
function applySearch() { /* مفعّل عبر v-model */ }

async function loadData() {
  items.value = await db.items.toArray()
  const batches = await db.batches.toArray()
  const g = {}
  for (const b of batches) {
    if (!b.quarantined && b.qty > 0) {
      const x = g[b.itemId] || { total: 0, cost: 0 }
      x.total += b.qty
      x.cost += b.qty * (b.cost || 0)
      if (!x.nextExpiry || (b.expDate && b.expDate < x.nextExpiry)) x.nextExpiry = b.expDate
      g[b.itemId] = x
    }
  }
  stockInfo.value = Object.fromEntries(Object.entries(g).map(([k, v]) => [Number(k), { total: v.total, avgCost: v.cost / v.total, nextExpiry: v.nextExpiry }]))
  const movs = await db.stockMovements.toArray()
  movements.value = new Set(movs.map(m => m.itemId))
}

function openForm(it) {
  editing.value = it ? it.id : null
  formError.value = ''
  form.value = it
    ? { code: it.code, name: it.name, scientific: it.scientific || '', category: it.category || '', unit: it.unit || 'علبة', barcode: it.barcode || '', sellPrice: it.sellPrice || 0, costPrice: it.costPrice || 0, minStock: it.minStock || 0, prescription: !!it.prescription }
    : { code: '', name: '', scientific: '', category: '', unit: 'علبة', barcode: '', sellPrice: 0, costPrice: 0, minStock: 0, prescription: false }
  showForm.value = true
}

async function saveItem() {
  saving.value = true
  formError.value = ''
  try {
    await requirePermission('items.write', editing.value ? 'تعديل صنف' : 'إضافة صنف')
    const f = { ...form.value }
    if (!f.name.trim()) throw new Error('أدخل اسم الصنف')
    if (!f.code) {
      const count = await db.items.count()
      f.code = 'DRG-' + String(count + 1).padStart(3, '0')
    }
    if (editing.value) await db.items.update(editing.value, { ...f, active: 1, updatedAt: Date.now() })
    else await db.items.add({ ...f, active: 1, createdAt: Date.now(), updatedAt: Date.now() })
    showForm.value = false
    await loadData()
  } catch (e) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

async function handleDelete(it) {
  try {
    await requirePermission('items.write', 'حذف صنف')
    if (movements.value.has(it.id)) {
      await db.items.update(it.id, { active: 0, updatedAt: Date.now() })
      await loadData()
      return
    }
    await db.items.delete(it.id)
    await loadData()
  } catch (e) {
    formError.value = e.message
  }
}

onMounted(loadData)
</script>

<style scoped>
/* ============================================
   شاشة الأصناف — نمط bolt.host
   ============================================ */
.items-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.page-screen { padding: 24px; display: flex; flex-direction: column; gap: 16px; overflow: auto; flex: 1; }
.page-header { display: flex; align-items: center; justify-content: space-between; }
.page-title h1 { font-size: 26px; font-weight: 800; color: #0f172a; line-height: 1.2; }
.page-subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
.link-cell { color: #2563eb; font-weight: 600; cursor: pointer; text-decoration: none; }
.num-cell { text-align: left; direction: ltr; font-variant-numeric: tabular-nums; }

.filter-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.filter-chip { display: flex; align-items: center; gap: 6px; height: 34px; padding: 0 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 999px; font-size: 13px; color: #475569; cursor: pointer; transition: all 0.15s; }
.filter-chip:hover { border-color: #2563eb; color: #2563eb; }
.filter-chip.active { background: #2563eb; color: #fff; border-color: #2563eb; font-weight: 600; }
.chip-count { font-size: 11px; opacity: 0.75; background: rgba(0,0,0,0.08); border-radius: 999px; padding: 0 6px; min-width: 20px; text-align: center; }
.filter-chip.active .chip-count { background: rgba(255,255,255,0.25); }

.search-box { margin-right: auto; display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; }
.search-icon { font-size: 12px; }
.search-input { border: none; outline: none; background: transparent; font-size: 13px; width: 220px; font-family: inherit; }
.search-go { height: 24px; padding: 0 10px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; font-family: inherit; }

.table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05); overflow: auto; flex: 1; min-height: 0; }
.bolt-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.bolt-table thead th { background: #f8fafc; color: #64748b; font-weight: 600; font-size: 12px; padding: 10px 12px; text-align: right; border-bottom: 1px solid #e2e8f0; white-space: nowrap; position: sticky; top: 0; }
.bolt-table tbody td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
.bolt-table tbody tr:hover td { background: #f8fafc; }
.bolt-table .row-total { font-weight: 700; color: #0f172a; }
.empty-row td { padding: 48px 24px !important; border-bottom: none; }
.empty-box { display: flex; flex-direction: column; align-items: center; gap: 6px; color: #94a3b8; }
.empty-icon { font-size: 40px; }
.empty-title { font-size: 15px; font-weight: 700; color: #475569; }
.empty-hint { font-size: 12px; }

.rx-chip { font-size: 10px; color: #d97706; background: #fef3c7; border-radius: 999px; padding: 1px 6px; margin-right: 6px; font-weight: 700; }
.stock-low { color: #d97706; font-weight: 700; }
.stock-out { color: #dc2626; font-weight: 700; }
.stock-ok-num { color: #16a34a; font-weight: 600; }
.expiry-green { color: #16a34a; font-weight: 700; }
.expiry-yellow { color: #f59e0b; font-weight: 700; }
.expiry-orange { color: #d97706; font-weight: 700; }
.expiry-red { color: #dc2626; font-weight: 700; }

.action-cells { display: flex; gap: 4px; }
.act { height: 28px; width: 30px; border: 1px solid #e2e8f0; background: #fff; border-radius: 6px; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; justify-content: center; }
.act:hover { background: #eff6ff; border-color: #2563eb; }
.act.danger { color: #dc2626; }
.act.danger:hover { background: #fef2f2; border-color: #fca5a5; }
.status-name { font-size: 12px; font-weight: 600; }
.status-name.ok { color: #15803d; }
.status-name.off { color: #9ca3af; }

.totals-bar-mini { display: flex; gap: 18px; padding: 8px 24px; background: #fff; border-top: 1px solid #e2e8f0; font-size: 12px; color: #475569; flex-shrink: 0; }
.net-value { margin-right: auto; font-weight: 600; color: #0f172a; }

/* ---------- نموذج الصنف ---------- */
.form-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
.form-card-wide { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 20px 40px rgba(0,0,0,0.25); width: 760px; max-width: 96vw; max-height: 92vh; overflow: auto; padding: 20px; }
.form-card-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; font-size: 16px; font-weight: 800; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
.close-btn { background: transparent; border: none; font-size: 14px; color: #64748b; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
.close-btn:hover { background: #f1f5f9; color: #0f172a; }
.item-form-fields { display: flex; gap: 10px; flex-wrap: wrap; }
.field-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; min-width: 140px; flex: 1; display: flex; flex-direction: column; gap: 4px; }
.field-card label { font-size: 11px; font-weight: 600; color: #64748b; }
.fi { height: 34px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0 10px; font-size: 13px; font-family: inherit; color: #0f172a; background: #fff; outline: none; }
.fi:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15); }

.form-msg { padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; margin-top: 12px; }
.form-msg-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.form-msg-ok { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }

.form-actions-row { display: flex; gap: 10px; justify-content: flex-end; padding-top: 14px; }
.btn { display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 18px; border-radius: 8px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; border: 1px solid transparent; transition: all 0.15s; white-space: nowrap; }
.btn-lg { height: 40px; padding: 0 20px; font-size: 14px; }
.btn-icon { font-size: 16px; line-height: 1; }
.btn-primary { background: #2563eb; color: #fff; }
.btn-primary:hover { background: #1d4ed8; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-outline { background: #fff; color: #374151; border-color: #d1d5db; }
.btn-outline:hover { background: #f9fafb; border-color: #9ca3af; }
.spin { animation: spin 1s linear infinite; display: inline-block; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .item-form-fields { flex-direction: column; }
  .field-card { min-width: 100%; }
  .page-screen { padding: 16px; }
  .bolt-table { min-width: 980px; }
}
</style>
