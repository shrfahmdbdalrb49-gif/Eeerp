<template>
  <div class="pos-screen">
    <div class="pos-toolbar">
      <input
        type="text"
        class="input-field"
        placeholder="🔍 ابحث عن صنف بالاسم أو الكود أو الباركود (بحث فعلي في قاعدة البيانات)..."
        v-model="query"
        style="flex: 1; max-width: 380px"
        @input="runSearch"
      />
      <span class="toolbar-spacer"></span>
      <span class="pos-info">نقطة البيع الحقيقية — المخزون يُخصم فعليًا وقيد محاسبي مزدوج يُرحّل</span>
    </div>

    <div class="pos-body">
      <!-- نتائج البحث / قائمة الأصناف المتوفرة -->
      <div class="pos-catalog">
        <div class="catalog-title">الأصناف المتوفرة في المخزون ({{ catalog.length }})</div>
        <div class="catalog-list">
          <button
            v-for="it in catalog"
            :key="it.id"
            class="catalog-item"
            :class="{ 'oos': it.stock === 0 }"
            :disabled="it.stock === 0"
            @click="addToCart(it)"
            :title="it.stock === 0 ? 'نفد من المخزون' : `متوفر: ${it.stock} ${it.unit || ''}`"
          >
            <span class="ci-name">{{ it.name }}</span>
            <span class="ci-meta">{{ it.code }}</span>
            <span class="ci-stock" :class="{ 'out': it.stock === 0, 'low': it.stock <= (it.minStock || 0) }">{{ it.stock === 0 ? 'نفد' : it.stock }}</span>
            <span class="ci-price">{{ fmt(it.sellPrice) }}</span>
          </button>
          <div v-if="catalog.length === 0" class="empty-state">
            {{ query ? 'لا توجد نتائج مطابقة' : 'لا توجد أصناف بعد — أنشئ أصنافًا من شاشة الأصناف' }}
          </div>
        </div>
      </div>

      <!-- السلة -->
      <div class="pos-cart">
        <div class="cart-title">
          <span>سلة البيع — {{ cart.length }} بنود</span>
          <button class="btn btn-secondary small" @click="clearCart" :disabled="cart.length === 0">🗑 إفراغ</button>
        </div>
        <div class="cart-list">
          <div v-for="(line, i) in cart" :key="i" class="cart-row">
            <span class="cr-name" :title="line.name">{{ line.name }}</span>
            <button class="qty-btn" @click="line.qty = Math.max(1, line.qty - 1)">−</button>
            <input type="number" class="qty-input" v-model.number="line.qty" min="1" />
            <button class="qty-btn" @click="line.qty = Math.min(line.maxQty, line.qty + 1)">+</button>
            <span class="cr-total">{{ fmt(line.qty * line.sellPrice) }}</span>
            <button class="remove-btn" @click="cart.splice(i, 1)">✕</button>
          </div>
          <div v-if="cart.length === 0" class="empty-state" style="padding:30px 10px">السلة فارغة</div>
        </div>

        <div class="cart-total">
          <div class="ct-row">
            <label>العميل (اختياري)</label>
            <select class="input-field" v-model.number="customerId">
              <option :value="null">عميل نقدي (بدون ذمم)</option>
              <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="ct-row">
            <label>طريقة الدفع</label>
            <select class="input-field" v-model="paymentType">
              <option value="cash">نقدي</option>
              <option value="bank">تحويل بنكي</option>
              <option value="credit">آجل (على الحساب)</option>
            </select>
          </div>
          <div class="ct-sum">
            <span>الإجمالي</span>
            <span class="total-value">{{ fmt(cartTotal) }}</span>
          </div>
        </div>

        <button class="btn btn-success checkout-btn" @click="checkout" :disabled="cart.length === 0 || checkingOut">
          {{ checkingOut ? 'جارٍ الترحيل...' : `✓ إتمام البيع — ${fmt(cartTotal)}` }}
        </button>
        <div v-if="checkoutError" class="checkout-error">{{ checkoutError }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { db, activeItems, activeCustomers } from '../../db/database.js'
import { fmt, consumeStock, computeCOGS, postSaleJournal } from '../../db/engine.js'
import { requirePermission, currentSession } from '../../db/session.js'

const query = ref('')
const items = ref([])
const customers = ref([])
const cart = ref([])
const customerId = ref(null)
const paymentType = ref('cash')
const checkingOut = ref(false)
const checkoutError = ref('')

const catalog = computed(() => {
  const q = query.value.trim().toLowerCase()
  const enriched = items.value.map(it => ({ ...it, stock: it._stock }))
  if (!q) return enriched.slice(0, 60)
  return enriched.filter(it =>
    it.name.toLowerCase().includes(q) ||
    (it.code || '').toLowerCase().includes(q) ||
    (it.barcode || '').toLowerCase().includes(q)
  ).slice(0, 60)
})

const cartTotal = computed(() => cart.value.reduce((s, l) => s + l.qty * l.sellPrice, 0))

function runSearch() { /* computed يعيد الحساب تلقائيًا */ }

function addToCart(it) {
  const existing = cart.value.find(l => l.itemId === it.id)
  if (existing) {
    if (existing.qty < it.stock) existing.qty++
    return
  }
  if (it.stock <= 0) return
  cart.value.push({ itemId: it.id, name: it.name, sellPrice: Number(it.sellPrice) || 0, qty: 1, maxQty: it.stock })
}

function clearCart() { cart.value = []; checkoutError.value = '' }

async function checkout() {
  checkingOut.value = true
  checkoutError.value = ''
  try {
    const session = await requirePermission('pos.sale', 'إتمام البيع')
    if (cart.value.length === 0) throw new Error('السلة فارغة')
    const total = cartTotal.value
    if (total <= 0) throw new Error('الإجمالي صفر')
    const paid = paymentType.value === 'credit' ? 0 : total

    // 1. إنشاء فاتورة البيع
    const saleId = await db.salesInvoices.add({
      customerId: customerId.value,
      date: new Date().toISOString().slice(0, 10),
      storeId: 1,
      paymentType: paymentType.value,
      total,
      status: 'posted',
      createdBy: session.userId,
      createdAt: Date.now(),
    })

    // 2. خصم المخزون FEFO فعليًا
    let totalCogs = 0
    for (const line of cart.value) {
      if (line.qty > line.maxQty) throw new Error(`الكمية المطلوبة من "${line.name}" أكبر من المتاح (${line.maxQty})`)
      const { cogs } = await computeCOGS(line.itemId, line.qty)
      const consumed = await consumeStock(line.itemId, line.qty)
      await db.salesLines.add({
        invoiceId: saleId, itemId: line.itemId, batchIds: consumed.map(c => c.batchId),
        qty: line.qty, price: line.sellPrice, subtotal: line.qty * line.sellPrice,
      })
      totalCogs += cogs
    }

    // 3. ترحيل القيد المحاسبي المزدوج: نقدية/بنك/ذمم ← إيرادات + تكلفة ← مخزون
    await postSaleJournal({ saleId, total, paid, customerPaid: paymentType.value, cogsAmount: totalCogs })

    cart.value = []
    checkoutError.value = ''
    await audit('sale_completed', 'sale', saleId, { total })
    await loadData()
  } catch (e) {
    checkoutError.value = e.message
  } finally {
    checkingOut.value = false
  }
}

async function audit(action, refKind, refId, detail) {
  const s = await currentSession()
  await db.auditLogs.add({ userId: s?.userId ?? 0, userName: s?.userName ?? 'مجهول', action, refKind, refId, detail: detail || null, createdAt: Date.now() })
}

async function loadData() {
  const raw = await activeItems()
  const batches = await db.batches.toArray()
  const stockMap = {}
  for (const b of batches) if (!b.quarantined && b.qty > 0) stockMap[b.itemId] = (stockMap[b.itemId] || 0) + b.qty
  items.value = raw.map(it => ({ ...it, sellPrice: Number(it.sellPrice ?? it.price) || 0, stock: stockMap[it.id] || 0, _stock: stockMap[it.id] || 0 })).sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  customers.value = await activeCustomers()
}

onMounted(loadData)
</script>

<style scoped>
.pos-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.pos-toolbar { display: flex; gap: 6px; padding: 6px; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: 2px; margin-bottom: 6px; align-items: center; flex-wrap: wrap; flex-shrink: 0; }
.toolbar-spacer { flex: 1; }
.pos-info { font-size: 12px; color: var(--color-text-secondary); }
.pos-body { display: grid; grid-template-columns: 1fr 340px; gap: 8px; flex: 1; min-height: 0; }
.pos-catalog { display: flex; flex-direction: column; min-height: 0; border: 1px solid var(--color-border); background: var(--color-bg-primary); }
.catalog-title { padding: 6px 10px; font-size: 13px; font-weight: bold; background: var(--color-bg-secondary); border-bottom: 1px solid var(--color-border); flex-shrink: 0; }
.catalog-list { flex: 1; overflow: auto; padding: 6px; display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 5px; align-content: start; }
.catalog-item { display: flex; flex-direction: column; gap: 2px; padding: 6px 8px; background: #fff; border: 1px solid var(--color-border); border-radius: 3px; cursor: pointer; text-align: right; }
.catalog-item:hover { border-color: var(--color-primary); background: #f4f9fe; }
.catalog-item.oos { opacity: 0.45; cursor: not-allowed; background: #f5f5f5; }
.ci-name { font-size: 13px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ci-meta { font-size: 11px; color: var(--color-text-secondary); }
.ci-stock { font-size: 12px; font-weight: bold; }
.ci-stock.low { color: var(--color-warning); }
.ci-stock.out { color: var(--color-error); }
.ci-price { font-size: 12px; color: var(--color-primary); font-weight: bold; direction: ltr; text-align: left; }
.empty-state { text-align: center; color: var(--color-text-secondary); padding: 24px; }
.pos-cart { display: flex; flex-direction: column; min-height: 0; border: 1px solid var(--color-border); background: var(--color-bg-primary); }
.cart-title { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; font-size: 13px; font-weight: bold; background: var(--color-bg-secondary); border-bottom: 1px solid var(--color-border); flex-shrink: 0; }
.cart-list { flex: 1; overflow: auto; min-height: 0; }
.cart-row { display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
.cr-name { flex: 1; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.qty-btn { width: 22px; height: 22px; border: 1px solid var(--color-border); background: #fff; border-radius: 3px; cursor: pointer; font-weight: bold; }
.qty-input { width: 42px; text-align: center; border: 1px solid var(--color-border); border-radius: 3px; font-size: 13px; }
.cr-total { width: 70px; text-align: left; direction: ltr; font-weight: bold; color: var(--color-primary); font-size: 13px; }
.remove-btn { background: none; border: none; color: #b71c1c; cursor: pointer; font-size: 13px; }
.cart-total { padding: 8px; background: var(--color-bg-secondary); border-top: 1px solid var(--color-border); flex-shrink: 0; }
.ct-row { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
.ct-row label { width: 100px; font-size: 12px; color: var(--color-text-secondary); flex-shrink: 0; }
.input-field { padding: 5px 8px; border: 1px solid var(--color-border); border-radius: 3px; font-size: 13px; background: #fff; flex: 1; }
.ct-sum { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; padding-top: 4px; }
.total-value { direction: ltr; color: var(--color-primary); }
.checkout-btn { width: 100%; padding: 12px; background: var(--color-success); color: #fff; border: none; border-radius: 4px; font-size: 16px; font-weight: bold; cursor: pointer; flex-shrink: 0; }
.checkout-btn:hover { background: #157d27; }
.checkout-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.checkout-error { color: #b71c1c; font-size: 12px; padding: 4px 8px; flex-shrink: 0; }
.btn { padding: 4px 10px; border: none; border-radius: 3px; cursor: pointer; font-weight: bold; font-size: 12px; }
.btn-secondary { background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border); }
.btn-secondary.small { padding: 2px 8px; font-size: 11px; }
@media (max-width: 768px) { .pos-body { grid-template-columns: 1fr; } .pos-catalog { max-height: 45vh; } }
</style>
