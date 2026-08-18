<template>
  <div class="invoices-screen">
    <div class="screen-toolbar">
      <input type="text" class="input-field" v-model="query" placeholder=" بحث برقم الفاتورة أو اسم العميل..." style="max-width:260px" />
      <span class="toolbar-spacer"></span>
      <span class="toolbar-info">سجل فواتير المبيعات الفعلية من قاعدة البيانات</span>
    </div>
    <div class="table-container table-scroll">
      <table class="dense-table">
        <thead>
          <tr><th style="width:45px">#</th><th style="width:100px">التاريخ</th><th>العميل</th><th style="width:115px">الإجمالي</th><th style="width:85px">الدفع</th><th style="width:75px">الحالة</th></tr>
        </thead>
        <tbody>
          <tr v-for="inv in filtered" :key="inv.id">
            <td>{{ inv.id }}</td><td>{{ inv.date }}</td>
            <td style="font-weight:bold">{{ inv.customerName || 'نقدي (بدون عميل)' }}</td>
            <td class="num"><b>{{ fmt(inv.total) }}</b></td>
            <td><span :class="'pay-chip ' + inv.paymentType">{{ payLabel(inv.paymentType) }}</span></td>
            <td>{{ inv.status === 'posted' ? 'مرحَّل ✔' : inv.status }}</td>
          </tr>
          <tr v-if="filtered.length === 0">
            <td colspan="6" class="empty-state">{{ invoices.length === 0 ? 'لا توجد فواتير بيع بعد — أنشئ فاتورة من نقطة البيع' : 'لا توجد نتائج مطابقة للبحث' }}</td>
          </tr>
          <tr class="totals-row" v-if="invoices.length > 0">
            <td colspan="3">الإجمالي</td>
            <td class="num"><b>{{ fmt(totalSum) }}</b></td>
            <td colspan="2">{{ invoices.length }} فاتورة</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { db, getStorageMode } from '../../db/database.js'
import { fmt } from '../../db/engine.js'
import { apiFetch } from '../../db/api.js'

function isServer() { return getStorageMode() === 'server' }

const invoices = ref([])
const customers = ref([])
const query = ref('')

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return invoices.value
  return invoices.value.filter(inv =>
    String(inv.id).includes(q) || (inv.customerName || '').toLowerCase().includes(q)
  )
})

const totalSum = computed(() => filtered.value.reduce((s, i) => s + (i.total || 0), 0))

function payLabel(t) { return { cash: 'نقدي', bank: 'بنكي', credit: 'آجل' }[t] || t }

async function loadData() {
  if (isServer()) {
    try {
      invoices.value = (await apiFetch('/sales')).map(inv => ({
        ...inv, id: inv.id, customerId: inv.customer_id,
        paymentType: inv.payment_type || inv.paymentType,
        total: inv.total,
        invoiceNo: inv.invoice_no || inv.invoiceNo,
      }))
      customers.value = (await apiFetch('/customers', { fallback: [] }))
      for (const inv of invoices.value) {
        const c = inv.customerId ? customers.value.find(x => x.id === inv.customerId) : null
        inv.customerName = c ? c.name : null
      }
      return
    } catch {
      invoices.value = []
      customers.value = []
      return
    }
  }
  invoices.value = await db.salesInvoices.toArray()
  customers.value = await db.customers.toArray()
  for (const inv of invoices.value) {
    const c = inv.customerId ? customers.value.find(x => x.id === inv.customerId) : null
    inv.customerName = c ? c.name : null
  }
}

onMounted(loadData)
</script>

<style scoped>
.invoices-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.screen-toolbar { display: flex; gap: 6px; padding: 6px; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: 2px; margin-bottom: 6px; align-items: center; flex-wrap: wrap; flex-shrink: 0; }
.toolbar-spacer { flex: 1; }
.toolbar-info { font-size: 12px; color: var(--color-text-secondary); }
.table-scroll { flex: 1; overflow: auto; background: var(--color-bg-primary); min-height: 0; }
.input-field { padding: 5px 8px; border: 1px solid var(--color-border); border-radius: 3px; font-size: 13px; background: #fff; }
.empty-state { text-align: center; color: var(--color-text-secondary); padding: 18px; }
.num { text-align: left; direction: ltr; }
.pay-chip { padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: bold; }
.pay-chip.cash { background: #e6f4ea; color: #1b5e20; }
.pay-chip.bank { background: #e3f0ff; color: #0d5aa7; }
.pay-chip.credit { background: #fff4e0; color: #e65100; }
.totals-row td { background: #f2f6fb; font-weight: bold; border-top: 2px solid var(--color-border); }
</style>
