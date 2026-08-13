<template>
  <!-- ========== نقطة البيع (POS) ========== -->
  <div class="pos-screen">
    <div class="pos-header">
      <div class="pos-search">
        <input
          type="text"
          class="input-field"
          placeholder="🔍 ابحث عن دواء بالاسم أو الباركود..."
          v-model="query"
          ref="searchInput"
          style="flex: 1; max-width: 420px"
        />
        <div v-if="query && results.length" class="search-dropdown pos-dropdown">
          <div
            v-for="d in results.slice(0, 10)"
            :key="d.code"
            class="dropdown-item"
            @click="addToCart(d)"
          >
            <span class="drug-name">{{ d.name }}</span>
            <span class="drug-barcode">{{ d.scientific }} | {{ d.code }}</span>
            <span class="drug-price">{{ fmt(d.sellPrice) }}</span>
            <span
              class="drug-stock"
              :class="{ 'status-low': d.stock <= d.minStock && d.stock > 0, 'status-out': d.stock === 0 }"
            >
              الرصيد: {{ d.stock }}
            </span>
          </div>
        </div>
      </div>
      <div class="pos-patient">
        <input type="text" class="input-field" placeholder="المريض (اختياري)..." v-model="patientName" />
      </div>
    </div>

    <div class="pos-body">
      <!-- سلة المشتريات -->
      <div class="pos-cart">
        <div class="cart-title">سلة المشتريات</div>
        <div class="table-container flex-1">
          <table class="dense-table">
            <thead>
              <tr>
                <th style="width:28px">#</th>
                <th>الصنف</th>
                <th style="width:55px">الوحدة</th>
                <th style="width:55px">الكمية</th>
                <th style="width:75px">السعر</th>
                <th style="width:80px">الإجمالي</th>
                <th style="width:26px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in cart" :key="item.id">
                <td>{{ idx + 1 }}</td>
                <td style="font-weight: bold">{{ item.name }}</td>
                <td>{{ item.unit }}</td>
                <td>
                  <input
                    type="number"
                    class="table-input qty-input"
                    v-model.number="item.qty"
                    min="1"
                    max="item.stock"
                  />
                </td>
                <td>{{ fmt(item.price) }}</td>
                <td class="row-total">{{ fmt(item.qty * item.price) }}</td>
                <td><button class="delete-btn" @click="removeFromCart(idx)">✕</button></td>
              </tr>
              <tr v-if="cart.length === 0">
                <td colspan="7" class="cart-empty">السلة فارغة — ابحث عن دواء لإضافته</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="totals-bar">
          <div class="totals-right">
            <div class="total-item">
              <span class="total-label">الأصناف:</span>
              <span class="total-value">{{ cart.length }}</span>
            </div>
            <div class="total-item">
              <span class="total-label">الكميات:</span>
              <span class="total-value">{{ cartQty }}</span>
            </div>
          </div>
          <div class="totals-left">
            <div class="total-item">
              <span class="total-label">الإجمالي:</span>
              <span class="total-net">{{ fmt(cartTotal) }}</span>
            </div>
            <button class="btn btn-success" @click="checkout" :disabled="cart.length === 0">
              💵 إتمام البيع
            </button>
          </div>
        </div>
      </div>

      <!-- الأصناف المقترحة -->
      <div class="pos-suggestions">
        <div class="cart-title">الأكثر طلباً / تنبيهات</div>
        <div class="suggestions-list">
          <div
            v-for="d in lowStockItems"
            :key="d.code"
            class="suggestion-item"
            @click="addToCart(d)"
          >
            <div class="sugg-name">{{ d.name }}</div>
            <div class="sugg-meta">
              <span class="drug-price">{{ fmt(d.sellPrice) }}</span>
              <span class="status-out" v-if="d.stock === 0">نفذ</span>
              <span class="status-low" v-else-if="d.stock <= d.minStock">رصيد منخفض: {{ d.stock }}</span>
              <span v-else>{{ d.stock }}</span>
            </div>
          </div>
          <div v-if="lowStockItems.length === 0" class="cart-empty">
            لا توجد أصناف منخفضة الرصيد
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { sampleDrugs } from '../../data/sampleData.js'

const query = ref('')
const patientName = ref('')
const searchInput = ref(null)
let itemIdSeq = 0

const cart = ref([])

const results = computed(() => {
  const q = query.value.toLowerCase().trim()
  if (!q) return []
  return sampleDrugs.filter(
    (d) =>
      d.name.toLowerCase().includes(q) ||
      d.scientific.toLowerCase().includes(q) ||
      d.barcode.includes(q) ||
      d.code.toLowerCase().includes(q)
  )
})

const lowStockItems = computed(() =>
  sampleDrugs.filter((d) => d.stock <= d.minStock).slice(0, 8)
)

const cartQty = computed(() => cart.value.reduce((s, i) => s + (i.qty || 0), 0))
const cartTotal = computed(() => cart.value.reduce((s, i) => s + i.qty * i.price, 0))

function addToCart(drug) {
  if (drug.stock === 0) return
  const existing = cart.value.find((i) => i.code === drug.code)
  if (existing) {
    if (existing.qty < drug.stock) existing.qty++
    return
  }
  cart.value.push({
    id: itemIdSeq++,
    code: drug.code,
    name: drug.name,
    unit: drug.unit,
    price: drug.sellPrice,
    qty: 1,
    stock: drug.stock,
  })
  query.value = ''
}

function removeFromCart(idx) {
  cart.value.splice(idx, 1)
}

function checkout() {
  if (cart.value.length === 0) return
  const total = fmt(cartTotal.value)
  alert(
    `تمت عملية البيع بنجاح!\n\n` +
    `الإجمالي: ${total} ريال يمني\n` +
    `عدد الأصناف: ${cart.value.length}\n` +
    `الحركات: ${cartQty.value} وحدة\n` +
    (patientName.value ? `المريض: ${patientName.value}` : '') +
    `\n\nتم خصم الكميات من المخزون وإنشاء القيد المحاسبي.`
  )
  cart.value = []
}

function fmt(n) {
  return String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

onMounted(() => {
  if (searchInput.value) searchInput.value.focus()
})
</script>

<style scoped>
.pos-screen {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.pos-header {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  align-items: center;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.pos-search {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.pos-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  left: 0;
  min-width: 300px;
}

.pos-body {
  flex: 1;
  display: flex;
  gap: var(--space-2);
  padding: var(--space-2);
  overflow: hidden;
}

.pos-cart {
  flex: 2;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  min-width: 0;
}

.pos-suggestions {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  min-width: 180px;
}

.cart-title {
  font-size: var(--font-size-base);
  font-weight: bold;
  color: var(--color-primary);
  padding: var(--space-2);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.flex-1 {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.cart-empty {
  text-align: center;
  color: var(--color-text-secondary);
  padding: var(--space-4);
  font-size: var(--font-size-sm);
}

.table-input {
  width: 100%;
  height: 24px;
  border: 1px solid transparent;
  padding: 0 var(--space-1);
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  background: transparent;
  text-align: center;
}

.table-input:focus {
  outline: none;
  border-color: var(--color-primary);
  background: white;
}

.row-total {
  font-weight: bold;
  text-align: center;
  color: var(--color-primary);
}

.delete-btn {
  width: 22px;
  height: 22px;
  border: none;
  background: var(--color-error);
  color: white;
  cursor: pointer;
  border-radius: var(--border-radius);
  font-size: 12px;
}

.delete-btn:hover { background: #d32f2f }

.totals-bar {
  flex-shrink: 0;
}

.totals-right, .totals-left {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.suggestions-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-1);
}

.suggestion-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  margin-bottom: var(--space-1);
  cursor: pointer;
  background: var(--color-bg-primary);
}

.suggestion-item:hover {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
}

.sugg-name {
  font-weight: bold;
  font-size: var(--font-size-sm);
}

.sugg-meta {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.dropdown-item {
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
  border-bottom: 1px solid var(--color-bg-secondary);
  font-size: var(--font-size-base);
  flex-wrap: wrap;
}

.dropdown-item:hover { background: var(--color-primary-light) }

.drug-name { font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
.drug-barcode { color: var(--color-text-secondary); font-size: var(--font-size-xs) }
.drug-price { color: var(--color-primary); font-weight: bold }
.drug-stock { font-size: var(--font-size-xs); color: var(--color-text-secondary) }

.search-dropdown {
  position: absolute;
  background: white;
  border: 1px solid var(--color-primary);
  border-radius: var(--border-radius);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 100;
  max-height: 250px;
  overflow-y: auto;
}

.status-low { color: var(--color-warning); font-weight: bold }
.status-out { color: var(--color-error); font-weight: bold }
</style>
