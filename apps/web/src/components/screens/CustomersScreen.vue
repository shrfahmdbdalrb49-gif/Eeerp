<template>
  <div class="customers-screen">
    <div class="screen-toolbar">
      <button class="btn btn-primary" @click="openForm()">+ عميل جديد</button>
      <input type="text" class="input-field search" placeholder="🔍 بحث بالاسم أو الهاتف..." v-model="search" />
      <span class="toolbar-spacer"></span>
      <span class="toolbar-info">الرصيد الآجل = فواتير البيع الآجلة − التحصيلات (مشتق من البيانات الفعلية)</span>
    </div>
    <div class="table-container table-scroll">
      <table class="dense-table">
        <thead>
          <tr>
            <th style="width:45px">#</th><th style="width:75px">الكود</th><th>الاسم</th><th style="width:120px">الهاتف</th>
            <th style="width:100px">عدد الفواتير</th><th style="width:105px">إجمالي مبيعات</th><th style="width:105px">المحصَّل</th>
            <th style="width:110px">الرصيد الآجل</th><th style="width:65px">الحالة</th><th style="width:52px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in filtered" :key="c.id">
            <td>{{ c.id }}</td>
            <td>{{ c.code }}</td>
            <td style="font-weight:bold">{{ c.name }}</td>
            <td>{{ c.phone || '—' }}</td>
            <td class="num">{{ c.invoiceCount }}</td>
            <td class="num">{{ fmt(c.totalSales) }}</td>
            <td class="num">{{ fmt(c.totalCollected) }}</td>
            <td class="num"><b :class="c.balance > 0 ? 'balance-due' : ''">{{ fmt(c.balance) }}</b></td>
            <td><span class="status-chip" :class="c.status === 'active' ? 'ok' : 'off'">{{ c.status === 'active' ? 'نشط' : 'معطَّل' }}</span></td>
            <td><button class="delete-btn" @click="handleDelete(c)">{{ c.hasSales ? '🔒' : '✕' }}</button></td>
          </tr>
          <tr v-if="filtered.length === 0">
            <td colspan="10" class="empty-state">لا يوجد عملاء بعد — أنشئ أول عميل. لا توجد بيانات وهمية.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showForm" class="form-modal-overlay" @click.self="showForm = false">
      <div class="form-modal">
        <div class="modal-title"><span>{{ editing ? 'تعديل عميل' : 'عميل جديد' }}</span><button class="close-btn" @click="showForm = false">✕</button></div>
        <div class="modal-body">
          <div class="field-row"><label>الكود</label><input type="text" class="input-field" v-model="form.code" placeholder="يُولَّد تلقائيًا" /></div>
          <div class="field-row"><label>الاسم *</label><input type="text" class="input-field" v-model="form.name" /></div>
          <div class="field-row"><label>الهاتف</label><input type="text" class="input-field" v-model="form.phone" /></div>
          <div class="field-row"><label>ملاحظات</label><input type="text" class="input-field" v-model="form.notes" /></div>
        </div>
        <div class="form-actions">
          <span v-if="formError" class="form-error">{{ formError }}</span>
          <button class="btn btn-primary" @click="saveCustomer" :disabled="saving">{{ saving ? 'جارٍ...' : 'حفظ' }}</button>
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

const customers = ref([])
const search = ref('')
const showForm = ref(false)
const editing = ref(null)
const saving = ref(false)
const formError = ref('')
const form = ref({ code: '', name: '', phone: '', notes: '' })

async function enrichCustomer(c) {
  const invoices = await db.salesInvoices.where('customerId').equals(c.id).toArray()
  const invoiceCount = invoices.length
  const creditSales = invoices.filter(i => i.paymentType === 'credit').reduce((s, i) => s + (i.total || 0), 0)
  const totalSales = invoices.reduce((s, i) => s + (i.total || 0), 0)
  const cols = await db.collections.where('customerId').equals(c.id).toArray()
  const totalCollected = cols.reduce((s, x) => s + (x.amount || 0), 0)
  return { ...c, invoiceCount, totalSales, totalCollected, balance: creditSales - totalCollected }
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return customers.value
  return customers.value.filter(c => c.name.toLowerCase().includes(q) || (c.phone || '').includes(q))
})

async function loadData() {
  const raw = await db.customers.toArray()
  customers.value = await Promise.all(raw.map(enrichCustomer))
}

function openForm(c) {
  editing.value = c ? c.id : null
  formError.value = ''
  form.value = c
    ? { code: c.code, name: c.name, phone: c.phone || '', notes: c.notes || '' }
    : { code: '', name: '', phone: '', notes: '' }
  showForm.value = true
}

async function saveCustomer() {
  saving.value = true
  formError.value = ''
  try {
    await requirePermission('customers.write', editing.value ? 'تعديل عميل' : 'إضافة عميل')
    const f = { ...form.value }
    if (!f.name.trim()) throw new Error('أدخل اسم العميل')
    if (!f.code) {
      const count = await db.customers.count()
      f.code = 'CUST-' + String(count + 1).padStart(3, '0')
    }
    if (editing.value) await db.customers.update(editing.value, { ...f, updatedAt: Date.now() })
    else await db.customers.add({ ...f, status: 'active', createdAt: Date.now() })
    showForm.value = false
    await loadData()
  } catch (e) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

async function handleDelete(c) {
  try {
    await requirePermission('customers.write', 'حذف عميل')
    const hasSales = await db.salesInvoices.where('customerId').equals(c.id).count()
    if (hasSales) {
      await db.customers.update(c.id, { status: 'inactive', updatedAt: Date.now() })
    } else {
      await db.customers.delete(c.id)
      await db.collections.where('customerId').equals(c.id).delete()
    }
    await loadData()
  } catch (e) {
    formError.value = e.message
  }
}

onMounted(loadData)
</script>

<style scoped>
.customers-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.screen-toolbar { display: flex; gap: 6px; padding: 6px; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: 2px; margin-bottom: 6px; align-items: center; flex-wrap: wrap; flex-shrink: 0; }
.toolbar-spacer { flex: 1; }
.toolbar-info { font-size: 12px; color: var(--color-text-secondary); }
.table-scroll { flex: 1; overflow: auto; background: var(--color-bg-primary); min-height: 0; }
.empty-state { text-align: center; color: var(--color-text-secondary); padding: 18px; }
.num { text-align: left; direction: ltr; }
.balance-due { color: #e65100; font-weight: bold; }
.status-chip { padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: bold; }
.status-chip.ok { background: #e6f4ea; color: #1b5e20; }
.status-chip.off { background: #f0f0f0; color: #777; }
.btn { padding: 6px 14px; border: none; border-radius: 3px; cursor: pointer; font-weight: bold; font-size: 13px; }
.btn-primary { background: var(--color-primary); color: #fff; }
.btn-secondary { background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border); }
.input-field { padding: 6px 8px; border: 1px solid var(--color-border); border-radius: 3px; font-size: 13px; background: #fff; }
.input-field.search { width: 220px; }
.input-field:focus { outline: none; border-color: var(--color-primary); }
.delete-btn { background: #fdeaea; color: #b71c1c; border: 1px solid #f0bcbc; border-radius: 3px; width: 24px; height: 26px; cursor: pointer; }
.form-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 12px; }
.form-modal { background: var(--color-bg-primary); border: 2px solid var(--color-primary); border-radius: 4px; width: 460px; max-width: 94vw; box-shadow: 4px 4px 16px rgba(0,0,0,0.3); }
.modal-title { display: flex; justify-content: space-between; align-items: center; background: var(--color-primary); color: #fff; font-weight: bold; padding: 6px 12px; }
.close-btn { background: transparent; border: none; color: #fff; cursor: pointer; }
.modal-body { padding: 12px; }
.field-row { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.field-row label { width: 85px; font-size: 13px; flex-shrink: 0; color: var(--color-text-secondary); }
.form-actions { display: flex; gap: 8px; justify-content: flex-end; align-items: center; padding: 8px 12px; background: var(--color-bg-secondary); border-top: 1px solid var(--color-border); }
.form-error { color: #b71c1c; font-size: 12px; flex: 1; }
@media (max-width: 768px) { .field-row { flex-wrap: wrap; } .field-row label { width: 100%; } .screen-toolbar { flex-direction: column; align-items: stretch; } .input-field.search { width: 100%; } }
</style>
