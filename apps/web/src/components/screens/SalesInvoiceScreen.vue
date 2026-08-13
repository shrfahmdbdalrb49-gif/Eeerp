<template>
  <div class="invoice-screen">
    <div class="screen-toolbar">
      <button class="btn btn-primary" @click="showForm = true">+ فاتورة بيع جديدة</button>
      <span class="toolbar-spacer"></span>
      <span class="toolbar-info">نفس منطق نقطة البيع — خصم FEFO فعلي + قيد مزدوج</span>
    </div>
    <div class="table-container table-scroll">
      <table class="dense-table">
        <thead>
          <tr>
            <th style="width:45px">#</th><th style="width:100px">التاريخ</th><th>العميل</th><th style="width:120px">البنود</th>
            <th style="width:100px">الإجمالي</th><th style="width:85px">الدفع</th><th style="width:60px">بواسطة</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="inv in sorted" :key="inv.id">
            <td>{{ inv.id }}</td><td>{{ inv.date }}</td>
            <td style="font-weight:bold">{{ inv.customerName || 'نقدي' }}</td>
            <td>{{ inv.linesCount }} بند</td>
            <td class="num"><b>{{ fmt(inv.total) }}</b></td>
            <td><span :class="'pay-chip ' + inv.paymentType">{{ payLabel(inv.paymentType) }}</span></td>
            <td>{{ inv.createdByName || '—' }}</td>
          </tr>
          <tr v-if="invoices.length === 0">
            <td colspan="7" class="empty-state">لا توجد فواتير بيع بعد — أنشئ فاتورة من نقطة البيع أو من هنا</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showForm" class="form-modal-overlay" @click.self="showForm = false">
      <div class="form-modal">
        <div class="modal-title"><span>فاتورة بيع جديدة</span><button class="close-btn" @click="showForm = false">✕</button></div>
        <div class="modal-body">
          <div class="field-row"><label>العميل</label>
            <select class="input-field" v-model.number="form.customerId">
              <option :value="null">عميل نقدي (بدون ذمم)</option>
              <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="field-row"><label>الصنف</label>
            <select class="input-field" v-model.number="form.itemId">
              <option :value="null" disabled>اختر صنفًا متوفرًا</option>
              <option v-for="it in items" :key="it.id" :value="it.id">{{ it.name }} — متاح: {{ it._stock }}</option>
            </select>
          </div>
          <div class="field-row"><label>الكمية</label><input type="number" class="input-field" v-model.number="form.qty" min="1" /></div>
          <div class="field-row"><label>سعر البيع</label><input type="number" class="input-field" v-model.number="form.price" min="0" step="0.01" /></div>
          <div class="field-row"><label>طريقة الدفع</label>
            <select class="input-field" v-model="form.paymentType">
              <option value="cash">نقدي</option><option value="bank">تحويل بنكي</option><option value="credit">آجل</option>
            </select>
          </div>
        </div>
        <div class="form-actions">
          <span v-if="formError" class="form-error">{{ formError }}</span>
          <button class="btn btn-primary" @click="save" :disabled="saving">{{ saving ? 'جارٍ...' : 'ترحيل الفاتورة' }}</button>
          <button class="btn btn-secondary" @click="showForm = false">إلغاء</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { db, activeItems, activeCustomers } from '../../db/database.js'
import { fmt, consumeStock, computeCOGS, postSaleJournal } from '../../db/engine.js'
import { requirePermission, currentSession } from '../../db/session.js'

const invoices = ref([])
const customers = ref([])
const items = ref([])
const showForm = ref(false)
const saving = ref(false)
const formError = ref('')
const form = ref({ customerId: null, itemId: null, qty: 1, price: 0, paymentType: 'cash' })

const sorted = computed(() => [...invoices.value].sort((a, b) => b.id - a.id))
function payLabel(t) { return { cash: 'نقدي', bank: 'بنكي', credit: 'آجل' }[t] || t }

async function loadData() {
  const raw = await db.salesInvoices.toArray()
  const users = await db.users.toArray()
  const usersMap = Object.fromEntries(users.map(u => [u.id, u.fullName]))
  invoices.value = raw.map(inv => ({
    ...inv,
    customerName: inv.customerId ? (customers.value.find(c => c.id === inv.customerId)?.name) : null,
    linesCount: 0,
    createdByName: usersMap[inv.createdBy] || '—',
  }))
  const lines = await db.salesLines.toArray()
  for (const inv of invoices.value) inv.linesCount = lines.filter(l => l.invoiceId === inv.id).length
  customers.value = await activeCustomers()
  const b = await db.batches.toArray()
  const stockMap = {}
  for (const x of b) if (!x.quarantined && x.qty > 0) stockMap[x.itemId] = (stockMap[x.itemId] || 0) + x.qty
  items.value = (await activeItems())
    .map(it => ({ ...it, _stock: stockMap[it.id] || 0 }))
    .filter(it => it._stock > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  form.value.price = items.value[0]?.sellPrice || 0
}

async function save() {
  saving.value = true
  formError.value = ''
  try {
    const session = await requirePermission('sales.write', 'إنشاء فاتورة بيع')
    const f = form.value
    if (!f.itemId) throw new Error('اختر صنفًا')
    if (!f.qty || f.qty <= 0) throw new Error('الكمية غير صحيحة')
    const item = items.value.find(i => i.id === f.itemId)
    if (f.qty > (item?._stock || 0)) throw new Error(`المخزون المتاح أقل من المطلوب (${item?._stock || 0})`)
    const total = f.qty * (f.price || 0)
    if (total <= 0) throw new Error('الإجمالي صفر')
    const paid = f.paymentType === 'credit' ? 0 : total
    const saleId = await db.salesInvoices.add({
      customerId: f.customerId, date: new Date().toISOString().slice(0, 10), storeId: 1,
      paymentType: f.paymentType, total, status: 'posted', createdBy: session.userId, createdAt: Date.now(),
    })
    const { cogs } = await computeCOGS(f.itemId, f.qty)
    const consumed = await consumeStock(f.itemId, f.qty)
    await db.salesLines.add({ invoiceId: saleId, itemId: f.itemId, batchIds: consumed.map(c => c.batchId), qty: f.qty, price: f.price, subtotal: total })
    await postSaleJournal({ saleId, total, paid, customerPaid: f.paymentType, cogsAmount: cogs })
    const s = await currentSession()
    await db.auditLogs.add({ userId: s?.userId ?? 0, userName: s?.userName ?? 'مجهول', action: 'sale_created', refKind: 'sale', refId: saleId, detail: null, createdAt: Date.now() })
    showForm.value = false
    await loadData()
  } catch (e) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.invoice-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.screen-toolbar { display: flex; gap: 6px; padding: 6px; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: 2px; margin-bottom: 6px; align-items: center; flex-wrap: wrap; flex-shrink: 0; }
.toolbar-spacer { flex: 1; }
.toolbar-info { font-size: 12px; color: var(--color-text-secondary); }
.table-scroll { flex: 1; overflow: auto; background: var(--color-bg-primary); min-height: 0; }
.empty-state { text-align: center; color: var(--color-text-secondary); padding: 18px; }
.num { text-align: left; direction: ltr; }
.pay-chip { padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: bold; }
.pay-chip.cash { background: #e6f4ea; color: #1b5e20; }
.pay-chip.bank { background: #e3f0ff; color: #0d5aa7; }
.pay-chip.credit { background: #fff4e0; color: #e65100; }
.btn { padding: 6px 14px; border: none; border-radius: 3px; cursor: pointer; font-weight: bold; font-size: 13px; }
.btn-primary { background: var(--color-primary); color: #fff; }
.btn-secondary { background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border); }
.form-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 12px; }
.form-modal { background: var(--color-bg-primary); border: 2px solid var(--color-primary); border-radius: 4px; width: 480px; max-width: 94vw; box-shadow: 4px 4px 16px rgba(0,0,0,0.3); }
.modal-title { display: flex; justify-content: space-between; align-items: center; background: var(--color-primary); color: #fff; font-weight: bold; padding: 6px 12px; }
.close-btn { background: transparent; border: none; color: #fff; cursor: pointer; }
.modal-body { padding: 12px; }
.field-row { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.field-row label { width: 90px; font-size: 13px; flex-shrink: 0; color: var(--color-text-secondary); }
.input-field { padding: 6px 8px; border: 1px solid var(--color-border); border-radius: 3px; font-size: 13px; background: #fff; flex: 1; }
.form-actions { display: flex; gap: 8px; justify-content: flex-end; align-items: center; padding: 8px 12px; background: var(--color-bg-secondary); border-top: 1px solid var(--color-border); }
.form-error { color: #b71c1c; font-size: 12px; flex: 1; }
</style>
