<template>
  <div class="collections-screen">
    <div class="screen-toolbar">
      <button class="btn btn-primary" @click="openNew">+ تحصيل جديد (سند قبض)</button>
      <button class="tab-btn" :class="{ active: tab === 'log' }" @click="tab = 'log'">سجل التحصيلات</button>
      <button class="tab-btn" :class="{ active: tab === 'aging' }" @click="tab = 'aging'">الأرصدة الآجلة</button>
      <span class="toolbar-spacer"></span>
      <span class="toolbar-info">{{ tab === 'aging' ? 'الرصيد = فواتير آجلة − التحصيلات (فعلي من قاعدة البيانات)' : 'كل تحصيل يُرحّل قيدًا: الصندوق ← ذمم مدينة' }}</span>
    </div>

    <!-- سجل التحصيلات -->
    <div v-if="tab === 'log'" class="table-container table-scroll">
      <table class="dense-table">
        <thead>
          <tr><th style="width:45px">#</th><th style="width:100px">التاريخ</th><th>العميل</th><th style="width:115px">المبلغ</th><th style="width:90px">الطريقة</th><th>ملاحظات</th></tr>
        </thead>
        <tbody>
          <tr v-for="c in sorted" :key="c.id">
            <td>{{ c.id }}</td><td>{{ c.date }}</td>
            <td style="font-weight:bold">{{ c.customerName || '—' }}</td>
            <td class="num"><b>{{ fmt(c.amount) }}</b></td>
            <td>{{ c.method === 'bank' ? 'تحويل بنكي' : 'نقدي' }}</td>
            <td>{{ c.notes || '—' }}</td>
          </tr>
          <tr v-if="collections.length === 0">
            <td colspan="6" class="empty-state">لا توجد تحصيلات بعد — ساند قبض يُرحّل فعليًا قيدًا محاسبيًا ويخفض ذمم العميل</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- الأرصدة الآجلة -->
    <div v-if="tab === 'aging'" class="table-container table-scroll">
      <table class="dense-table">
        <thead>
          <tr><th>العميل</th><th style="width:115px">فواتير آجلة</th><th style="width:115px">المحصَّل</th><th style="width:125px">الرصيد المتبقي</th></tr>
        </thead>
        <tbody>
          <tr v-for="c in aging" :key="c.id">
            <td style="font-weight:bold">{{ c.name }}</td>
            <td class="num">{{ fmt(c.creditSales) }}</td>
            <td class="num">{{ fmt(c.collected) }}</td>
            <td class="num"><b :class="c.balance > 0 ? 'balance-due' : ''">{{ fmt(c.balance) }}</b></td>
          </tr>
          <tr v-if="aging.length === 0">
            <td colspan="4" class="empty-state">لا يوجد عملاء بعد</td>
          </tr>
          <tr class="totals-row">
            <td>الإجمالي</td>
            <td class="num">{{ fmt(agingTotal.creditSales) }}</td>
            <td class="num">{{ fmt(agingTotal.collected) }}</td>
            <td class="num"><b>{{ fmt(agingTotal.balance) }}</b></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showForm" class="form-modal-overlay" @click.self="showForm = false">
      <div class="form-modal">
        <div class="modal-title"><span>سند قبض — تحصيل من عميل</span><button class="close-btn" @click="showForm = false">✕</button></div>
        <div class="modal-body">
          <div class="field-row"><label>العميل</label>
            <select class="input-field" v-model.number="form.customerId">
              <option :value="null" disabled>اختر عميلًا (يجب أن يكون له ذمم)</option>
              <option v-for="c in debtors" :key="c.id" :value="c.id">{{ c.name }} — عليه {{ fmt(c.balance) }}</option>
            </select>
          </div>
          <div class="field-row"><label>المبلغ *</label><input type="number" class="input-field" v-model.number="form.amount" min="0.01" step="0.01" /></div>
          <div class="field-row"><label>الطريقة</label>
            <select class="input-field" v-model="form.method">
              <option value="cash">نقدي (صندوق)</option><option value="bank">تحويل بنكي</option>
            </select>
          </div>
          <div class="field-row"><label>التاريخ</label><input type="date" class="input-field" v-model="form.date" /></div>
          <div class="field-row"><label>ملاحظات</label><input type="text" class="input-field" v-model="form.notes" placeholder="سند قبض رقم..." /></div>
        </div>
        <div class="form-actions">
          <span v-if="formError" class="form-error">{{ formError }}</span>
          <button class="btn btn-primary" @click="save" :disabled="saving">{{ saving ? 'جارٍ...' : 'ترحيل القبض' }}</button>
          <button class="btn btn-secondary" @click="showForm = false">إلغاء</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { db, activeCustomers } from '../../db/database.js'
import { fmt } from '../../db/engine.js'
import { postCollectionJournal } from '../../db/engine.js'
import { requirePermission, currentSession } from '../../db/session.js'

const collections = ref([])
const customers = ref([])
const tab = ref('log')
const showForm = ref(false)
const saving = ref(false)
const formError = ref('')
const form = ref({ customerId: null, amount: 0, method: 'cash', date: new Date().toISOString().slice(0, 10), notes: '' })

const sorted = computed(() => [...collections.value].sort((a, b) => b.id - a.id))

async function customerDebt(c) {
  const creditSales = (await db.salesInvoices.where('customerId').equals(c.id).and(i => i.paymentType === 'credit').toArray()).reduce((s, i) => s + (i.total || 0), 0)
  const collected = collections.value.filter(x => x.customerId === c.id).reduce((s, x) => s + (x.amount || 0), 0)
  return { ...c, creditSales, collected, balance: creditSales - collected }
}

const debtors = computed(() => customers.value.filter(c => (c.balance || 0) > 0).sort((a, b) => b.balance - a.balance))
const aging = computed(() => customers.value.filter(c => (c.creditSales || 0) > 0).sort((a, b) => b.balance - a.balance))
const agingTotal = computed(() => ({
  creditSales: aging.value.reduce((s, c) => s + (c.creditSales || 0), 0),
  collected: aging.value.reduce((s, c) => s + (c.collected || 0), 0),
  balance: aging.value.reduce((s, c) => s + (c.balance || 0), 0),
}))

async function loadData() {
  collections.value = await db.collections.toArray()
  const raw = await activeCustomers()
  customers.value = await Promise.all(raw.map(customerDebt))
}

function openNew() {
  formError.value = ''
  form.value = { customerId: null, amount: 0, method: 'cash', date: new Date().toISOString().slice(0, 10), notes: '' }
  showForm.value = true
}

async function save() {
  saving.value = true
  formError.value = ''
  try {
    await requirePermission('collections', 'ترحيل تحصيل')
    const f = form.value
    if (!f.customerId) throw new Error('اختر عميلًا')
    if (!f.amount || f.amount <= 0) throw new Error('أدخل مبلغًا صحيحًا')
    const debtor = debtors.value.find(c => c.id === f.customerId)
    if (!debtor) throw new Error('العميل لا يملك ذمم مستحقة')
    if (f.amount > debtor.balance + 0.005) throw new Error(`المبلغ أكبر من ذمم العميل (${fmt(debtor.balance)})`)
    const id = await db.collections.add({
      customerId: f.customerId, date: f.date, method: f.method, amount: f.amount,
      notes: f.notes, status: 'posted', createdAt: Date.now(),
    })
    await postCollectionJournal({ collectionId: id, amount: f.amount, method: f.method })
    const s = await currentSession()
    await db.auditLogs.add({ userId: s?.userId ?? 0, userName: s?.userName ?? 'مجهول', action: 'collection_posted', refKind: 'collection', refId: id, detail: null, createdAt: Date.now() })
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
.collections-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.screen-toolbar { display: flex; gap: 6px; padding: 6px; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: 2px; margin-bottom: 6px; align-items: center; flex-wrap: wrap; flex-shrink: 0; }
.toolbar-spacer { flex: 1; }
.toolbar-info { font-size: 12px; color: var(--color-text-secondary); }
.tab-btn { padding: 5px 12px; border: 1px solid var(--color-border); border-radius: 3px; background: #fff; cursor: pointer; font-size: 13px; font-weight: bold; }
.tab-btn.active { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.table-scroll { flex: 1; overflow: auto; background: var(--color-bg-primary); min-height: 0; }
.empty-state { text-align: center; color: var(--color-text-secondary); padding: 18px; }
.num { text-align: left; direction: ltr; }
.balance-due { color: #e65100; font-weight: bold; }
.totals-row td { background: #f2f6fb; font-weight: bold; border-top: 2px solid var(--color-border); }
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
@media (max-width: 768px) { .field-row { flex-wrap: wrap; } .field-row label { width: 100%; } .screen-toolbar { flex-direction: column; align-items: stretch; } .tab-btn { width: 100%; } }
</style>
