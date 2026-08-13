<template>
  <!-- ========== شاشة التحويل بين المخازن ========== -->
  <div class="window-body flex-col transfers-screen">
    <div class="screen-layout">
      <div class="screen-sidebar">
        <button :class="['screen-tab', { active: tab === 'new' }]" @click="tab = 'new'">📤 تحويل جديد</button>
        <button :class="['screen-tab', { active: tab === 'list' }]" @click="tab = 'list'">📋 سجل التحويلات</button>
      </div>

      <div class="screen-content">
        <div v-if="tab === 'new'" class="flex-col full-height">
          <div class="invoice-header">
            <div class="header-block">
              <div class="block-title">بيانات التحويل</div>
              <div class="field-row"><label>رقم التحويل</label><input type="text" class="input-field" :value="nextNo" readonly /></div>
              <div class="field-row"><label>التاريخ</label><input type="date" class="input-field" v-model="transferDate" /></div>
              <div class="field-row"><label>المخزن المصدر</label>
                <select class="input-field" v-model="fromStore">
                  <option :value="1">المخزن الرئيسي</option>
                  <option :value="2">مخزن الفرع</option>
                </select>
              </div>
              <div class="field-row"><label>المخزن المستلم</label>
                <select class="input-field" v-model="toStore">
                  <option :value="2">مخزن الفرع</option>
                  <option :value="1">المخزن الرئيسي</option>
                </select>
              </div>
            </div>
          </div>

          <div class="items-section">
            <div class="items-toolbar">
              <div class="search-box">
                <input type="text" class="input-field" placeholder="🔍 ابحث عن صنف للتحويل..." v-model="itemQuery"
                  @focus="showDropdown = true" @blur="setTimeout(() => showDropdown = false, 200)" />
                <div v-if="showDropdown && filteredItems.length" class="search-dropdown">
                  <div v-for="it in filteredItems.slice(0, 8)" :key="it.id" class="dropdown-item" @mousedown.prevent="addItem(it)">
                    <span class="drug-name">{{ it.name }}</span>
                    <span class="drug-barcode">{{ it.code }}</span>
                    <span class="drug-price">متاح: {{ stockByItem[it.id] ?? 0 }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="table-scroll">
              <table class="dense-table">
                <thead>
                  <tr>
                    <th style="width:30px">#</th>
                    <th>الصنف</th>
                    <th>الوحدة</th>
                    <th>الكمية المحوَّلة</th>
                    <th>متاح بالمصدر</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, i) in lines" :key="item.itemId">
                    <td>{{ i + 1 }}</td>
                    <td>{{ item.name }}</td>
                    <td>{{ item.unit || 'حبة' }}</td>
                    <td><input type="number" class="input-field qty-input" v-model.number="item.qty" min="1" /></td>
                    <td>{{ stockByItem[item.itemId] ?? 0 }}</td>
                    <td><button class="row-delete" @click="lines.splice(i, 1)">✕</button></td>
                  </tr>
                  <tr v-if="lines.length === 0">
                    <td colspan="6" class="empty-state">أضف أصنافًا للتحويل من البحث أعلاه</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="totals-bar">
            <div class="total-item"><span class="total-label">عدد الأصناف:</span><span class="total-value">{{ lines.length }}</span></div>
            <div class="total-item"><span class="total-label">إجمالي الكميات:</span><span class="total-value">{{ totalQty }}</span></div>
            <span v-if="transferError" class="form-error">{{ transferError }}</span>
          </div>

          <div class="form-actions">
            <button class="btn btn-primary" @click="postTransfer" :disabled="posting">{{ posting ? 'جارٍ الترحيل...' : '✅ ترحيل التحويل' }}</button>
            <button class="btn btn-secondary" @click="lines = []; itemQuery = ''">🗑️ تفريغ</button>
          </div>
        </div>

        <div v-if="tab === 'list'" class="flex-col full-height">
          <div class="table-scroll">
            <table class="dense-table">
              <thead>
                <tr>
                  <th style="width:30px">#</th>
                  <th>رقم التحويل</th>
                  <th>التاريخ</th>
                  <th>المصدر</th>
                  <th>المستلم</th>
                  <th>الأصناف</th>
                  <th>الكمية</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(t, i) in transfers" :key="t.id">
                  <td>{{ i + 1 }}</td>
                  <td><span class="invoice-no">TRF-{{ t.id }}</span></td>
                  <td>{{ t.date }}</td>
                  <td>{{ t.fromLabel }}</td>
                  <td>{{ t.toLabel }}</td>
                  <td>{{ t.itemsCount }}</td>
                  <td>{{ t.totalQty }}</td>
                </tr>
                <tr v-if="transfers.length === 0">
                  <td colspan="7" class="empty-state">لا توجد تحويلات بعد</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { db, activeItems } from '../../db/database.js'
import { itemStock, consumeStock, addBatch } from '../../db/engine.js'
import { requirePermission, currentSession } from '../../db/session.js'

const STORE_LABEL = { 1: 'المخزن الرئيسي', 2: 'مخزن الفرع' }

const tab = ref('new')
const transferDate = ref(new Date().toISOString().slice(0, 10))
const fromStore = ref(1)
const toStore = ref(2)
const itemQuery = ref('')
const showDropdown = ref(false)
const lines = ref([])
const transfers = ref([])
const posting = ref(false)
const transferError = ref('')
const allItems = ref([])
const stockByItem = ref({})

const nextNo = computed(() => 'TRF-' + String(transfers.value.length + 1).padStart(4, '0'))
const totalQty = computed(() => lines.value.reduce((s, l) => s + (l.qty || 0), 0))

const filteredItems = computed(() => {
  const q = itemQuery.value.trim().toLowerCase()
  if (!q) return allItems.value.filter(it => (stockByItem.value[it.id] || 0) > 0)
  return allItems.value.filter(it =>
    it.name.toLowerCase().includes(q) || it.code.toLowerCase().includes(q) || (it.barcode || '').includes(q)
  )
})

async function loadStocks() {
  const map = {}
  for (const it of allItems.value) {
    const s = await itemStock(it.id)
    map[it.id] = s.total
  }
  stockByItem.value = map
}

function addItem(it) {
  const exists = lines.value.find(l => l.itemId === it.id)
  if (exists) { exists.qty += 1 }
  else lines.value.push({ itemId: it.id, name: it.name, unit: it.unit, qty: 1 })
  itemQuery.value = ''
  showDropdown.value = false
}

async function postTransfer() {
  posting.value = true
  transferError.value = ''
  try {
    await requirePermission('transfers', 'ترحيل تحويل')
    if (lines.value.length === 0) throw new Error('أضف صنفًا واحدًا على الأقل')
    if (fromStore.value === toStore.value) throw new Error('يجب أن يختلف المخزن المستلم عن المصدر')
    for (const l of lines.value) {
      if (!l.qty || l.qty <= 0) throw new Error('كمية غير صحيحة للصنف: ' + l.name)
      if (l.qty > (stockByItem.value[l.itemId] || 0)) throw new Error('الكمية المحوَّلة من "' + l.name + '" أكبر من المخزون المتاح بالمصدر')
    }
    const transferId = await db.transfers.add({
      fromStoreId: fromStore.value, toStoreId: toStore.value,
      date: transferDate.value, status: 'posted',
      itemsCount: lines.value.length, totalQty: totalQty.value,
      createdAt: Date.now(),
    })
    for (const l of lines.value) {
      // خصم من المخزن المصدر
      await consumeStock(l.itemId, l.qty)
      // إضافة للمخزن المستلم
      const s = await itemStock(l.itemId)
      const avgCost = s.avgCost || 0
      await addBatch({
        itemId: l.itemId, storeId: toStore.value, batchNo: `TRF-${transferId}-${l.itemId}`,
        qty: l.qty, cost: avgCost, sourceKind: 'transfer-in', sourceId: transferId,
      })
      await db.stockMovements.add({
        itemId: l.itemId, batchId: null, kind: 'transfer', qty: l.qty,
        refKind: 'transfer', refId: transferId, date: transferDate.value, createdAt: Date.now(),
      })
      await db.transferLines.add({ transferId, itemId: l.itemId, qty: l.qty })
    }
    const session = await currentSession()
    await db.auditLogs.add({
      userId: session?.userId ?? 0, userName: session?.userName ?? 'مجهول',
      action: 'transfer_posted', refKind: 'transfer', refId: transferId,
      detail: `${STORE_LABEL[fromStore.value]} ← ${STORE_LABEL[toStore.value]} | ${lines.value.length} صنف | ${totalQty.value} وحدة`,
      createdAt: Date.now(),
    })
    lines.value = []
    itemQuery.value = ''
    await refreshAll()
    tab.value = 'list'
  } catch (e) {
    transferError.value = e.message
  } finally {
    posting.value = false
  }
}

async function refreshAll() {
  transfers.value = (await db.transfers.toArray()).map(t => ({
    ...t, fromLabel: STORE_LABEL[t.fromStoreId] || t.fromStoreId,
    toLabel: STORE_LABEL[t.toStoreId] || t.toStoreId,
  }))
  allItems.value = await activeItems()
  await loadStocks()
}

onMounted(refreshAll)
</script>

<style scoped>
.transfers-screen { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.screen-layout { display: flex; flex: 1; gap: 8px; min-height: 0; }
.screen-sidebar { width: 140px; background: var(--color-bg-secondary); border: 1px solid var(--color-border); display: flex; flex-direction: column; gap: 2px; padding: 4px; flex-shrink: 0; }
.screen-tab { height: 40px; border: 1px solid transparent; background: transparent; cursor: pointer; font-family: var(--font-family); font-size: var(--font-size-base); text-align: right; padding: 0 8px; border-radius: 2px; white-space: nowrap; }
.screen-tab:hover { background: var(--color-bg-primary); }
.screen-tab.active { background: var(--color-primary-light); color: var(--color-primary); font-weight: bold; border-color: var(--color-primary); }
.screen-content { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.full-height { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.invoice-header { display: flex; gap: 8px; margin-bottom: 6px; flex-shrink: 0; }
.header-block { flex: 1; border: 1px solid var(--color-border); border-radius: 2px; padding: 6px 8px; background: var(--color-bg-secondary); }
.block-title { font-size: var(--font-size-sm); font-weight: bold; color: var(--color-primary); border-bottom: 1px solid var(--color-border); padding-bottom: 3px; margin-bottom: 5px; }
.field-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.field-row label { width: 95px; font-size: var(--font-size-sm); flex-shrink: 0; color: var(--color-text-secondary); }
.items-section { flex: 1; display: flex; flex-direction: column; min-height: 0; border: 1px solid var(--color-border); border-radius: 2px; background: var(--color-bg-secondary); }
.items-toolbar { display: flex; gap: 6px; padding: 6px; flex-shrink: 0; }
.search-box { flex: 1; position: relative; }
.search-dropdown { position: absolute; top: 100%; right: 0; left: 0; background: var(--color-bg-primary); border: 1px solid var(--color-primary); border-radius: 2px; z-index: 100; max-height: 200px; overflow-y: auto; box-shadow: 2px 2px 6px rgba(0,0,0,0.15); }
.dropdown-item { display: flex; justify-content: space-between; padding: 5px 8px; cursor: pointer; font-size: var(--font-size-sm); border-bottom: 1px solid var(--color-bg-secondary); }
.dropdown-item:hover { background: var(--color-row-hover); }
.drug-name { font-weight: bold; }
.drug-barcode { color: var(--color-text-secondary); font-size: 11px; }
.drug-price { color: var(--color-primary); font-weight: bold; }
.table-scroll { flex: 1; overflow: auto; background: var(--color-bg-primary); min-height: 0; }
.qty-input { width: 60px; text-align: center; }
.empty-state { text-align: center; color: var(--color-text-secondary); padding: 16px; }
.invoice-no { color: var(--color-primary); font-weight: bold; }
.row-delete { border: none; background: transparent; color: var(--color-error); cursor: pointer; font-weight: bold; }
.totals-bar { display: flex; gap: 14px; padding: 5px 8px; background: var(--color-bg-secondary); border-top: 1px solid var(--color-border); flex-shrink: 0; align-items: center; }
.total-item { font-size: 13px; }
.total-label { color: var(--color-text-secondary); }
.total-value { font-weight: bold; margin-right: 4px; }
.form-error { color: #b71c1c; font-size: 13px; font-weight: bold; }
.form-actions { display: flex; gap: 8px; justify-content: flex-end; padding: 6px; background: var(--color-bg-secondary); border-top: 1px solid var(--color-border); flex-shrink: 0; }
.btn { padding: 6px 14px; border: none; border-radius: 3px; cursor: pointer; font-weight: bold; font-size: 13px; }
.btn-primary { background: var(--color-primary); color: #fff; }
.btn-secondary { background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border); }
.flex-col { flex-direction: column; }
@media (max-width: 768px) { .screen-layout { flex-direction: column; } .screen-sidebar { width: 100%; flex-direction: row; overflow-x: auto; } .screen-tab { width: auto; min-width: 110px; } .invoice-header { flex-direction: column; } }
</style>
