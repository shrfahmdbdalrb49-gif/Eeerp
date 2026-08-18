<template>
  <div class="suppliers-screen">
    <div class="page-screen">
      <div class="page-header">
        <div class="page-title">
          <h1>الموردون</h1>
          <p class="page-subtitle">الذمم الدائنة — العدد: {{ suppliers.length }} · الرصيد الإجمالي المستحق: {{ fmt(totalBalance) }} ري</p>
        </div>
        <button class="btn btn-primary btn-lg" @click="openForm()">
          <span>جديد</span><span class="btn-icon">+</span>
        </button>
      </div>

      <div class="filter-row">
        <div class="search-box">
          <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input type="text" class="search-input" placeholder="ابحث بالاسم أو الهاتف..." v-model="search" />
          <button class="search-go" @click="applySearch">انتقال</button>
        </div>
      </div>

      <div class="table-card">
        <table class="bolt-table">
          <thead>
            <tr>
              <th style="width:80px">الكود</th>
              <th>الاسم</th>
              <th style="width:110px">الهاتف</th>
              <th style="width:85px">عدد الفواتير</th>
              <th style="width:100px">إجمالي المشتريات</th>
              <th style="width:95px">المسدَّد</th>
              <th style="width:105px; text-align:left">الرصيد المستحق</th>
              <th style="width:80px">الحالة</th>
              <th style="width:50px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in filtered" :key="s.id">
              <td><span class="link-cell">{{ s.code }}</span></td>
              <td style="font-weight:600">{{ s.name }}</td>
              <td>{{ s.phone || '—' }}</td>
              <td class="num-cell">{{ s.invoiceCount }}</td>
              <td class="num-cell">{{ fmt(s.totalPurchases) }}</td>
              <td class="num-cell">{{ fmt(s.totalPaid) }}</td>
              <td class="num-cell"><b :class="s.balance > 0 ? 'balance-due' : 'credit-zero'">{{ fmt(s.balance) }}</b></td>
              <td><span class="status-dot" :class="s.status === 'active' ? 'ok' : 'off'"></span><span class="status-name" :class="s.status === 'active' ? 'ok' : 'off'">{{ s.status === 'active' ? 'نشط' : 'معطّل' }}</span></td>
              <td><button class="act danger" @click="handleDelete(s)" :title="s.hasPurchases ? 'لديه مشتريات — سيتم تعطيله بدلًا من الحذف' : 'حذف'">{{ s.hasPurchases ? '◈' : '✕' }}</button></td>
            </tr>
            <tr v-if="filtered.length === 0">
              <td colspan="9" class="empty-row">
                <div class="empty-box">
                  <span class="empty-icon">🚚</span>
                  <p class="empty-title">لا يوجد موردون بعد</p>
                  <p class="empty-hint">اضغط زر «جديد» لإضافة أول مورد — الرصيد المشتق من البيانات الفعلية لا بيانات وهمية</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- نموذج إضافة/تعديل مورد -->
    <div v-if="showForm" class="form-modal-overlay" @click.self="showForm = false">
      <div class="form-card-wide">
        <div class="form-card-title">
          <span>{{ editing ? 'تعديل مورد' : 'مورد جديد' }}</span>
          <button class="close-btn" @click="showForm = false">✕</button>
        </div>
        <div class="field-list">
          <div class="field-row-wide">
            <label>الكود</label>
            <input type="text" class="fi" v-model="form.code" placeholder="يُولَّد تلقائيًا إن ترك فارغًا" />
          </div>
          <div class="field-row-wide">
            <label>الاسم *</label>
            <input type="text" class="fi" v-model="form.name" />
          </div>
          <div class="field-row-wide">
            <label>الهاتف</label>
            <input type="text" class="fi" v-model="form.phone" placeholder="05xxxxxxxx" />
          </div>
          <div class="field-row-wide">
            <label>ملاحظات</label>
            <input type="text" class="fi" v-model="form.notes" placeholder="أي ملاحظات عن المورد..." />
          </div>
        </div>
        <div v-if="formError" class="form-msg form-msg-error">{{ formError }}</div>
        <div class="form-actions-row">
          <button class="btn btn-outline" @click="showForm = false">إلغاء</button>
          <button class="btn btn-primary" @click="saveSupplier" :disabled="saving">
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
import { db } from '../../db/database.js'
import { fmt, isServer } from '../../db/engine.js'
import { requirePermission } from '../../db/session.js'

const suppliers = ref([])
const search = ref('')
const showForm = ref(false)
const editing = ref(null)
const saving = ref(false)
const formError = ref('')
const form = ref({ code: '', name: '', phone: '', notes: '' })

async function enrichSupplier(s) {
  if (isServer()) {
    try {
      const { apiFetch } = await import('../../db/api.js')
      const purchases = await apiFetch(`/purchases?supplier_id=${s.id}`, { fallback: [] })
      const invs = (Array.isArray(purchases) ? purchases : []).filter(i => String(i.supplier_id) === String(s.id))
      const invoiceCount = invs.length
      const creditPurchases = invs.filter(i => i.payment_type === 'credit').reduce((sum, i) => sum + Number(i.total || 0), 0)
      const totalPurchases = invs.reduce((sum, i) => sum + Number(i.total || 0), 0)
      const payments = await apiFetch(`/supplier-payments?supplier_id=${s.id}`, { fallback: [] })
      const totalPaid = (Array.isArray(payments) ? payments : []).reduce((sum, p) => sum + Number(p.amount || 0), 0)
      return { ...s, invoiceCount, totalPurchases, totalPaid, balance: creditPurchases - totalPaid, hasPurchases: invoiceCount > 0 || totalPaid > 0 }
    } catch { /* تابع بدون بيانات مالية */ }
  }
  const invoices = await db.purchaseInvoices.where('supplierId').equals(s.id).toArray()
  const invoiceCount = invoices.length
  const creditPurchases = invoices.filter(i => i.paymentType === 'credit').reduce((sum, i) => sum + (i.total || 0), 0)
  const totalPurchases = invoices.reduce((sum, i) => sum + (i.total || 0), 0)
  const payments = await db.supplierPayments.where('supplierId').equals(s.id).toArray()
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const hasPurchases = invoiceCount > 0 || payments.length > 0
  return { ...s, invoiceCount, totalPurchases, totalPaid, balance: creditPurchases - totalPaid, hasPurchases }
}

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return suppliers.value
  return suppliers.value.filter(s => s.name.toLowerCase().includes(q) || (s.phone || '').includes(q))
})

const totalBalance = computed(() => suppliers.value.reduce((s, x) => s + Math.max(0, x.balance || 0), 0))

function applySearch() { /* مفعّل عبر v-model */ }

async function loadData() {
  if (isServer()) {
    try {
      const { apiFetch } = await import('../../db/api.js')
      const rows = await apiFetch('/suppliers')
      suppliers.value = await Promise.all((Array.isArray(rows) ? rows : []).filter(s => s.active === true || s.active === 1 || s.active === 't').map(enrichSupplier))
      return
    } catch (e) { formError.value = 'فشل تحميل الموردين من الخادم: ' + (e.message || e); return }
  }
  const raw = await db.suppliers.toArray()
  suppliers.value = await Promise.all(raw.map(enrichSupplier))
}

function openForm(s) {
  editing.value = s ? s.id : null
  formError.value = ''
  form.value = s
    ? { code: s.code, name: s.name, phone: s.phone || '', notes: s.notes || '' }
    : { code: '', name: '', phone: '', notes: '' }
  showForm.value = true
}

async function saveSupplier() {
  saving.value = true
  formError.value = ''
  try {
    await requirePermission('suppliers', editing.value ? 'تعديل مورد' : 'إضافة مورد')
    const f = { ...form.value }
    if (!f.name.trim()) throw new Error('أدخل اسم المورد')
    if (isServer()) {
      const { apiFetch } = await import('../../db/api.js')
      const payload = { name: f.name, phone: f.phone || null, address: f.notes || null, active: true }
      if (f.code) payload.code = f.code
      if (editing.value) await apiFetch(`/suppliers/${editing.value}`, { method: 'PATCH', body: JSON.stringify(payload) })
      else await apiFetch('/suppliers', { method: 'POST', body: JSON.stringify(payload) })
    } else {
      if (!f.code) {
        const count = await db.suppliers.count()
        f.code = 'SUP-' + String(count + 1).padStart(3, '0')
      }
      if (editing.value) await db.suppliers.update(editing.value, { ...f, updatedAt: Date.now() })
      else await db.suppliers.add({ ...f, status: 'active', createdAt: Date.now() })
    }
    showForm.value = false
    await loadData()
  } catch (e) {
    formError.value = e.message || e
  } finally {
    saving.value = false
  }
}

async function handleDelete(s) {
  try {
    await requirePermission('suppliers', 'حذف مورد')
    if (isServer()) {
      const { apiFetch } = await import('../../db/api.js')
      await apiFetch(`/suppliers/${s.id}`, { method: 'PATCH', body: JSON.stringify({ active: false }) })
    } else {
      const hasPurchases = await db.purchaseInvoices.where('supplierId').equals(s.id).count()
      if (hasPurchases) {
        await db.suppliers.update(s.id, { status: 'inactive', updatedAt: Date.now() })
      } else {
        await db.suppliers.delete(s.id)
        await db.supplierPayments.where('supplierId').equals(s.id).delete()
      }
    }
    await loadData()
  } catch (e) {
    formError.value = e.message || e
  }
}

onMounted(loadData)
</script>

<style scoped>
/* ============================================
   شاشة الموردون — نمط bolt.host
   ============================================ */
.suppliers-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.page-screen { padding: 24px; display: flex; flex-direction: column; gap: 16px; overflow: auto; flex: 1; }
.page-header { display: flex; align-items: center; justify-content: space-between; }
.page-title h1 { font-size: 26px; font-weight: 800; color: #0f172a; line-height: 1.2; }
.page-subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
.link-cell { color: #2563eb; font-weight: 600; cursor: pointer; text-decoration: none; }
.num-cell { text-align: left; direction: ltr; font-variant-numeric: tabular-nums; }

.filter-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.search-box { margin-right: auto; display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; }
.search-icon { font-size: 12px; }
.search-input { border: none; outline: none; background: transparent; font-size: 13px; width: 220px; font-family: inherit; }
.search-go { height: 24px; padding: 0 10px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-size: 12px; cursor: pointer; font-family: inherit; }

.table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05); overflow: auto; flex: 1; min-height: 0; }
.bolt-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.bolt-table thead th { background: #f8fafc; color: #64748b; font-weight: 600; font-size: 12px; padding: 10px 12px; text-align: right; border-bottom: 1px solid #e2e8f0; white-space: nowrap; position: sticky; top: 0; }
.bolt-table tbody td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
.bolt-table tbody tr:hover td { background: #f8fafc; }
.empty-row td { padding: 48px 24px !important; border-bottom: none; }
.empty-box { display: flex; flex-direction: column; align-items: center; gap: 6px; color: #94a3b8; }
.empty-icon { font-size: 40px; }
.empty-title { font-size: 15px; font-weight: 700; color: #475569; }
.empty-hint { font-size: 12px; }

.balance-due { color: #ea580c; }
.credit-zero { color: #15803d; }

.act { height: 28px; width: 30px; border: 1px solid #e2e8f0; background: #fff; border-radius: 6px; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; justify-content: center; }
.act:hover { background: #eff6ff; border-color: #2563eb; }
.act.danger { color: #dc2626; }
.act.danger:hover { background: #fef2f2; border-color: #fca5a5; }
.status-dot { display: inline-block; width: 7px; height: 7px; border-radius: 999px; margin-left: 6px; }
.status-dot.ok { background: #16a34a; }
.status-dot.off { background: #d1d5db; }
.status-name { font-size: 12px; font-weight: 600; }
.status-name.ok { color: #15803d; }
.status-name.off { color: #9ca3af; }

/* ---------- نموذج المورد ---------- */
.form-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
.form-card-wide { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 20px 40px rgba(0,0,0,0.25); width: 560px; max-width: 96vw; max-height: 92vh; overflow: auto; padding: 20px; }
.form-card-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; font-size: 16px; font-weight: 800; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
.close-btn { background: transparent; border: none; font-size: 14px; color: #64748b; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
.close-btn:hover { background: #f1f5f9; color: #0f172a; }
.field-list { display: flex; flex-direction: column; gap: 10px; }
.field-row-wide { display: flex; align-items: center; gap: 10px; }
.field-row-wide label { width: 110px; font-size: 12px; font-weight: 600; color: #64748b; flex-shrink: 0; }
.fi { flex: 1; height: 36px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 12px; font-size: 13px; font-family: inherit; color: #0f172a; background: #fff; outline: none; }
.fi:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15); }

.form-msg { padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; margin-top: 12px; }
.form-msg-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

.form-actions-row { display: flex; gap: 10px; justify-content: flex-end; padding-top: 16px; }
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
  .field-row-wide { flex-wrap: wrap; }
  .field-row-wide label { width: 100%; }
  .page-screen { padding: 16px; }
  .bolt-table { min-width: 980px; }
}
</style>
