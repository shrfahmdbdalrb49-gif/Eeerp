<template>
  <div class="items-screen">
    <div class="screen-toolbar">
      <button class="btn btn-primary" @click="openForm()">+ صنف جديد</button>
      <input type="text" class="input-field search" placeholder="🔍 بحث بالاسم أو الكود أو الباركود..." v-model="search" />
      <select class="input-field" v-model="stockFilter" style="width:140px">
        <option value="">كل الأصناف</option>
        <option value="low">رصيد منخفض</option>
        <option value="out">نفذ من المخزون</option>
      </select>
      <span class="toolbar-spacer"></span>
      <span class="toolbar-info">المخزون الحقيقي (FEFO): مجموع التشغيلات الصالحة — لا بيانات وهمية</span>
    </div>
    <div class="table-container table-scroll">
      <table class="dense-table">
        <thead>
          <tr>
            <th style="width:45px">#</th><th style="width:70px">الكود</th><th>الاسم</th><th style="width:150px">الاسم العلمي</th>
            <th style="width:100px">الفئة</th><th style="width:60px">الوحدة</th><th style="width:90px">سعر البيع</th>
            <th style="width:100px">متوسط التكلفة</th><th style="width:70px">الرصيد</th><th style="width:75px">الحد الأدنى</th>
            <th style="width:110px">أقرب انتهاء</th><th style="width:75px">الحالة</th><th style="width:52px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="it in filtered" :key="it.id">
            <td>{{ it.id }}</td>
            <td>{{ it.code }}</td>
            <td style="font-weight:bold">{{ it.name }}</td>
            <td>{{ it.scientific || '—' }}</td>
            <td>{{ it.category || '—' }}</td>
            <td>{{ it.unit || '—' }}</td>
            <td class="num">{{ fmt(it.sellPrice) }}</td>
            <td class="num">{{ fmt(it.avgCost) }}</td>
            <td class="num" :class="{ 'stock-low': it.stock <= (it.minStock || 0) && it.stock > 0, 'stock-out': it.stock === 0 }"><b>{{ it.stock === 0 ? 'نفذ' : it.stock }}</b></td>
            <td class="num">{{ it.minStock || 0 }}</td>
            <td :class="expiryClass(it.nextExpiry)">{{ fmtDate(it.nextExpiry) || '—' }}</td>
            <td><span class="status-chip" :class="isActive(it) ? 'ok' : 'off'">{{ isActive(it) ? 'نشط' : 'معطَّل' }}</span></td>
            <td><button class="delete-btn" @click="handleDelete(it)" :title="it.hasMovement ? 'لا يمكن الحذف — له حركات' : 'حذف'">{{ it.hasMovement ? '🔒' : '✕' }}</button></td>
          </tr>
          <tr v-if="filtered.length === 0">
            <td colspan="13" class="empty-state">لا توجد أصناف بعد — أنشئ أول صنف. لا توجد بيانات وهمية في هذا النظام.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="totals-bar">
      <div class="totals-right">
        <span class="total-item">أصناف: <b>{{ filtered.length }}</b></span>
        <span class="total-item" style="color:var(--color-warning)">منخفضة: <b>{{ lowCount }}</b></span>
        <span class="total-item" style="color:var(--color-error)">نفدت: <b>{{ outCount }}</b></span>
      </div>
      <div class="totals-left"><span class="total-item">قيمة المخزون: <b class="total-net">{{ fmt(inventoryValue) }}</b></span></div>
    </div>

    <div v-if="showForm" class="form-modal-overlay" @click.self="showForm = false">
      <div class="form-modal">
        <div class="modal-title"><span>{{ editing ? 'تعديل صنف' : 'صنف جديد' }}</span><button class="close-btn" @click="showForm = false">✕</button></div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="field-row"><label>الكود</label><input type="text" class="input-field" v-model="form.code" placeholder="يُولَّد تلقائيًا إن ترك فارغًا" /></div>
            <div class="field-row"><label>الباركود</label><input type="text" class="input-field" v-model="form.barcode" /></div>
            <div class="field-row" style="grid-column:1/-1"><label>الاسم التجاري *</label><input type="text" class="input-field" v-model="form.name" /></div>
            <div class="field-row" style="grid-column:1/-1"><label>الاسم العلمي</label><input type="text" class="input-field" v-model="form.scientific" /></div>
            <div class="field-row"><label>الفئة</label><input type="text" class="input-field" v-model="form.category" placeholder="مضادات حيوية / مسكنات / ..." list="cat-list" />
              <datalist id="cat-list"><option>مسكنات</option><option>مضادات حيوية</option><option>أمراض مزمنة</option><option>فيتامينات</option><option>مستلزمات</option><option>أخرى</option></datalist>
            </div>
            <div class="field-row"><label>الوحدة</label>
              <select class="input-field" v-model="form.unit">
                <option v-for="u in units" :key="u" :value="u">{{ u }}</option>
              </select>
            </div>
            <div class="field-row"><label>سعر البيع</label><input type="number" class="input-field" v-model.number="form.sellPrice" min="0" step="0.01" /></div>
            <div class="field-row"><label>تكلفة الشراء</label><input type="number" class="input-field" v-model.number="form.costPrice" min="0" step="0.01" /></div>
            <div class="field-row"><label>الحد الأدنى</label><input type="number" class="input-field" v-model.number="form.minStock" min="0" /></div>
            <div class="field-row"><label>يحتاج وصفة؟</label>
              <select class="input-field" v-model="form.prescription"><option :value="false">لا</option><option :value="true">نعم</option></select>
            </div>
          </div>
        </div>
        <div class="form-actions">
          <span v-if="formError" class="form-error">{{ formError }}</span>
          <button class="btn btn-primary" @click="saveItem" :disabled="saving">{{ saving ? 'جارٍ...' : 'حفظ' }}</button>
          <button class="btn btn-secondary" @click="showForm = false">إلغاء</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { db } from '../../db/database.js'
import { fmt } from '../../db/engine.js'
import { requirePermission } from '../../db/session.js'
import { isActive } from '../../db/database.js'

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

function fmtDate(ts) { if (!ts) return ''; try { return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch { return ''; } }
function expiryClass(exp) {
  if (!exp) return ''
  const days = (new Date(exp) - new Date()) / 86400000
  if (days <= 0) return 'expiry-red'
  if (days <= 60) return 'expiry-orange'
  if (days <= 120) return 'expiry-yellow'
  return 'expiry-green'
}

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
.items-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.screen-toolbar { display: flex; gap: 6px; padding: 6px; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: 2px; margin-bottom: 6px; align-items: center; flex-wrap: wrap; flex-shrink: 0; }
.toolbar-spacer { flex: 1; }
.toolbar-info { font-size: 12px; color: var(--color-text-secondary); }
.table-scroll { flex: 1; overflow: auto; background: var(--color-bg-primary); min-height: 0; }
.empty-state { text-align: center; color: var(--color-text-secondary); padding: 18px; }
.num { text-align: left; direction: ltr; }
.stock-low { color: var(--color-warning); font-weight: bold; }
.stock-out { color: var(--color-error); font-weight: bold; }
.status-chip { padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: bold; }
.status-chip.ok { background: #e6f4ea; color: #1b5e20; }
.status-chip.off { background: #f0f0f0; color: #777; }
.expiry-green { color: var(--color-success); font-weight: bold }
.expiry-yellow { color: #f9a825; font-weight: bold }
.expiry-orange { color: var(--color-warning); font-weight: bold }
.expiry-red { color: var(--color-error); font-weight: bold }
.totals-bar { display: flex; justify-content: space-between; padding: 5px 8px; background: var(--color-bg-secondary); border-top: 1px solid var(--color-border); font-size: 13px; flex-shrink: 0; }
.total-item { margin-left: 14px; }
.total-net { color: var(--color-primary); }
.btn { padding: 6px 14px; border: none; border-radius: 3px; cursor: pointer; font-weight: bold; font-size: 13px; }
.btn-primary { background: var(--color-primary); color: #fff; }
.btn-secondary { background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border); }
.input-field { padding: 6px 8px; border: 1px solid var(--color-border); border-radius: 3px; font-size: 13px; background: #fff; }
.input-field.search { width: 240px; }
.input-field:focus { outline: none; border-color: var(--color-primary); }
.delete-btn { background: #fdeaea; color: #b71c1c; border: 1px solid #f0bcbc; border-radius: 3px; width: 24px; height: 26px; cursor: pointer; }
.form-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 12px; }
.form-modal { background: var(--color-bg-primary); border: 2px solid var(--color-primary); border-radius: 4px; width: 600px; max-width: 95vw; box-shadow: 4px 4px 16px rgba(0,0,0,0.3); max-height: 92vh; overflow: auto; }
.modal-title { display: flex; justify-content: space-between; align-items: center; background: var(--color-primary); color: #fff; font-weight: bold; padding: 6px 12px; }
.close-btn { background: transparent; border: none; color: #fff; cursor: pointer; }
.modal-body { padding: 12px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.field-row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.field-row label { width: 100px; font-size: 13px; flex-shrink: 0; color: var(--color-text-secondary); }
.form-actions { display: flex; gap: 8px; justify-content: flex-end; align-items: center; padding: 8px 12px; background: var(--color-bg-secondary); border-top: 1px solid var(--color-border); }
.form-error { color: #b71c1c; font-size: 12px; flex: 1; }
@media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } .screen-toolbar { flex-direction: column; align-items: stretch; } .input-field.search { width: 100%; } .table-container { overflow-x: auto; } .table-container table { min-width: 980px; } }
</style>
