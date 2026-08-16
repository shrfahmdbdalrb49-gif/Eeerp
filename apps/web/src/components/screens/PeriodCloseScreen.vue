<template>
  <div class="journal-screen">
    <div class="page-screen">
      <div class="page-header">
        <div class="page-title">
          <h1>إقفال الفترات المحاسبية</h1>
          <p class="page-subtitle">إقفال شهر مالي يمنع أي تعديل أو إلغاء في الفترة المقفلة ويُسجَّل في سجل التدقيق</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary btn-lg" @click="openCloseDialog" :disabled="!canClose">
            <span>إقفال فترة</span><span class="btn-icon">🔒</span>
          </button>
        </div>
      </div>

      <div class="info-card" v-if="tbSummary">
        <p>حالة التوازن حتى {{ lastDayLabel }}: الأصول {{ fmt(tbSummary.assets) }} = الخصوم + الحقوق {{ fmt(tbSummary.claims) }}
          <b :class="tbSummary.balanced ? 'text-ok' : 'text-bad'">{{ tbSummary.balanced ? '— متوازن ✓' : '— غير متوازن!' }}</b>
          (قبل الإقفال يجب أن يكون النظام متوازنًا)</p>
      </div>

      <div class="table-card">
        <table class="bolt-table">
          <thead>
            <tr>
              <th style="width:130px">الفترة</th>
              <th style="width:115px">تاريخ الإقفال</th>
              <th>بواسطة</th>
              <th style="width:90px">الحالة</th>
              <th style="width:110px">إجراء</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in closedPeriods" :key="c.id">
              <td style="font-weight:600">{{ c.period }}</td>
              <td>{{ c.closedAtStr }}</td>
              <td>{{ c.closedBy }}</td>
              <td><span class="status-pill posted">🔒 مقفل</span></td>
              <td>
                <button class="btn btn-outline btn-sm" @click="reopenPeriod(c.period)" :disabled="!c.mayReopen">
                  فتح الفترة
                </button>
              </td>
            </tr>
            <tr v-if="closedPeriods.length === 0">
              <td colspan="5" class="empty-row">
                <div class="empty-box">
                  <span class="empty-icon">🗓️</span>
                  <p class="empty-title">لا توجد فترات مقفلة بعد</p>
                  <p class="empty-hint">عند إقفال فترة لا يمكن تعديل أي سند أو فاتورة أو قيد في شهرها — استخدم «إقفال فترة» في الأعلى</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- حوار إقفال فترة -->
    <div v-if="showCloseDialog" class="form-modal-overlay" @click.self="showCloseDialog = false">
      <div class="form-card-wide">
        <div class="form-card-title">
          <span>إقفال فترة محاسبية</span>
          <button class="close-btn" @click="showCloseDialog = false">✕</button>
        </div>
        <div class="field-list">
          <div class="field-row-wide">
            <label>الفترة (شهر الإقفال)</label>
            <div style="display:flex; gap:6px">
              <select class="fi" style="flex:1" v-model="closeForm.year">
                <option v-for="yy in years" :key="yy" :value="yy">{{ yy }}</option>
              </select>
              <select class="fi" style="flex:1" v-model="closeForm.month">
                <option v-for="mm in months" :key="mm.v" :value="mm.v">{{ mm.label }}</option>
              </select>
            </div>
          </div>
          <div class="field-row-wide">
            <label>ملاحظات (اختياري)</label>
            <input type="text" class="fi" v-model="closeForm.note" placeholder="مثال: تم مراجعة الميزان واعتماده" />
          </div>
        </div>
        <div class="close-summary" v-if="closeSummary">
          <div class="cs-row"><span>قيود مقفلة (مرحّلة)</span><span>{{ closeSummary.entries }}</span></div>
          <div class="cs-row"><span>فواتير مقفلة</span><span>{{ closeSummary.invoices }}</span></div>
          <div class="cs-row"><span>سندات مقفلة</span><span>{{ closeSummary.vouchers }}</span></div>
          <div class="cs-row cs-total" :class="closeSummary.balanced ? 'text-ok' : 'text-bad'">
            <span>ميزان النظام</span><span>{{ closeSummary.balanced ? 'متوازن ✓ — جاهز للإقفال' : 'غير متوازن — راجع الميزان قبل الإقفال' }}</span>
          </div>
        </div>
        <div v-if="formError" class="form-msg form-msg-error">{{ formError }}</div>
        <div class="form-actions-row">
          <button class="btn btn-outline" @click="showCloseDialog = false">إلغاء</button>
          <button class="btn btn-primary" @click="confirmClose" :disabled="saving || !closeForm.period || !closeSummary?.balanced">
            <span v-if="saving" class="spin">⏳</span>
            <span>إقفال الفترة</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { db, closePeriod, openPeriod } from '../../db/database.js'
import { fmt, trialBalance, trialBalanceAsOf, listPeriodCloses } from '../../db/engine.js'
import { requirePermission, currentSession } from '../../db/session.js'

const closedPeriods = ref([])
const tbSummary = ref(null)
const showCloseDialog = ref(false)
const saving = ref(false)
const formError = ref('')
const closeForm = ref({ year: new Date().getFullYear(), month: String(new Date().getMonth() + 1).padStart(2, '0'), period: new Date().toISOString().slice(0, 7), note: '' })
const closeSummary = ref(null)
const years = computed(() => {
  const y = new Date().getFullYear()
  return [y - 2, y - 1, y, y + 1]
})
const months = computed(() => [
  { v: '01', label: 'يناير' }, { v: '02', label: 'فبراير' }, { v: '03', label: 'مارس' },
  { v: '04', label: 'أبريل' }, { v: '05', label: 'مايو' }, { v: '06', label: 'يونيو' },
  { v: '07', label: 'يوليو' }, { v: '08', label: 'أغسطس' }, { v: '09', label: 'سبتمبر' },
  { v: '10', label: 'أكتوبر' }, { v: '11', label: 'نوفمبر' }, { v: '12', label: 'ديسمبر' },
])

watch([() => closeForm.value.year, () => closeForm.value.month], () => {
  const p = `${String(closeForm.value.year)}-${String(closeForm.value.month).padStart(2, '0')}`
  closeForm.value.period = p
}, { immediate: true })
const lastDayLabel = computed(() => {
  const d = new Date()
  return String(d.getFullYear()) + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-31'
})

function fmtDate(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

async function loadData() {
  const closes = await listPeriodCloses()
  closedPeriods.value = closes.map(c => ({
    ...c,
    closedAtStr: fmtDate(c.closedAt),
    closedBy: c.closedBy || 'النظام',
    mayReopen: true,
  }))
  const today = new Date().toISOString().slice(0, 10)
  tbSummary.value = await trialBalanceAsOf(today)
}

const canClose = computed(() => tbSummary.value?.balanced)

async function computeCloseSummary(period) {
  if (!period) { formError.value = ''; return null }
  const [y, m] = period.split('-').map(Number)
  const from = `${y}-${String(m).padStart(2, '0')}-01`
  const days = new Date(y, m, 0).getDate()
  const to = `${y}-${String(m).padStart(2, '0')}-${String(days).padStart(2, '0')}`
  const [entries, sales, purchases, returns, payments, receipts] = await Promise.all([
    db.journalEntries.where('date').between(from, to, false, true).count(),
    db.salesInvoices.where('date').between(from, to, false, true).count(),
    db.purchaseInvoices.where('date').between(from, to, false, true).count(),
    db.salesReturns.where('date').between(from, to, false, true).count().catch(() => 0),
    db.supplierPayments.where('date').between(from, to, false, true).count(),
    db.receipts.where('date').between(from, to, false, true).count(),
  ])
  const tb = await trialBalanceAsOf(to)
  return { entries, invoices: sales + purchases + returns, vouchers: payments + receipts, balanced: tb.balanced }
}

function openCloseDialog() {
  formError.value = ''
  showCloseDialog.value = true
  const p = `${String(closeForm.value.year)}-${String(closeForm.value.month).padStart(2, '0')}`
  closeForm.value.period = p
  computeCloseSummary(p).then(s => { closeSummary.value = s }).catch(e => {
    formError.value = 'تعذر حساب ملخص الفترة: ' + (e && e.message ? e.message : String(e))
  })
}
watch(() => closeForm.value.period, p => {
  if (showCloseDialog.value && p) computeCloseSummary(p).then(s => { closeSummary.value = s }).catch(e => {
    formError.value = 'تعذر حساب ملخص الفترة: ' + (e && e.message ? e.message : String(e))
  })
})

async function confirmClose() {
  saving.value = true
  formError.value = ''
  try {
    await requirePermission('journal.post', 'إقفال فترة محاسبية')
    await closePeriod({ period: closeForm.value.period })
    showCloseDialog.value = false
    await loadData()
  } catch (e) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

async function reopenPeriod(period) {
  try {
    await requirePermission('journal.post', 'فتح فترة مقفلة')
    await openPeriod(period)
    await loadData()
  } catch (e) {
    formError.value = e.message
  }
}
onMounted(loadData)
</script>

<style scoped>
.journal-screen { height: 100%; display: flex; flex-direction: column; }
.page-screen { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 14px 18px 10px; border-bottom: 1px solid var(--ox-border, #e5e7eb); }
.page-title h1 { font-size: 17px; font-weight: 700; margin: 0; }
.page-subtitle { font-size: 12px; color: var(--ox-muted, #6b7280); margin: 3px 0 0; }
.header-actions { display: flex; gap: 8px; }
.btn { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; padding: 7px 14px; border-radius: 6px; border: none; cursor: pointer; }
.btn-primary { background: var(--ox-primary, #2563eb); color: #fff; }
.btn-lg { padding: 9px 18px; font-size: 14px; }
.btn-outline { background: #fff; border: 1px solid var(--ox-border, #d1d5db); color: #374151; }
.btn-sm { font-size: 12px; padding: 4px 10px; }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn-icon { font-size: 16px; font-weight: 600; }
.info-card { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px 14px; margin: 10px 18px; font-size: 12.5px; color: #1e40af; }
.info-card p { margin: 0; }
.text-ok { color: #166534; }
.text-bad { color: #dc2626; }
.table-card { flex: 1; margin: 10px 18px 14px; border: 1px solid var(--ox-border, #e5e7eb); border-radius: 8px; overflow: auto; min-height: 0; }
.bolt-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.bolt-table th { background: var(--ox-head, #f3f4f6); padding: 8px 10px; text-align: right; font-weight: 600; border-bottom: 2px solid var(--ox-border, #e5e7eb); position: sticky; top: 0; }
.bolt-table td { padding: 7px 10px; border-bottom: 1px solid var(--ox-border, #f0f0f0); }
.status-pill { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; background: #fef3c7; color: #92400e; }
.empty-row td { padding: 48px 24px !important; border-bottom: none; }
.empty-box { text-align: center; color: var(--ox-muted, #6b7280); }
.empty-icon { font-size: 30px; display: block; margin-bottom: 8px; }
.empty-title { font-weight: 600; color: #374151; margin: 0 0 4px; }
.empty-hint { font-size: 12px; margin: 0; }
.form-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 9000; display: flex; align-items: center; justify-content: center; }
.form-card-wide { background: #fff; border-radius: 12px; width: min(560px, 94vw); max-height: 90vh; overflow: auto; box-shadow: 0 20px 60px rgba(0,0,0,.35); }
.form-card-title { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--ox-border, #e5e7eb); font-weight: 700; font-size: 14px; }
.close-btn { background: none; border: none; font-size: 18px; cursor: pointer; color: #6b7280; }
.field-list { padding: 12px 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.field-row-wide { display: flex; flex-direction: column; gap: 3px; }
.field-row-wide label { font-size: 11.5px; font-weight: 600; color: var(--ox-muted, #6b7280); }
.fi { padding: 7px 9px; border: 1px solid var(--ox-border, #d1d5db); border-radius: 6px; font-size: 13px; background: #fff; }
.close-summary { padding: 0 16px 12px; }
.cs-row { display: flex; justify-content: space-between; font-size: 12.5px; padding: 4px 0; border-bottom: 1px solid #f0f0f0; color: #374151; }
.cs-total { font-weight: 700; margin-top: 4px; }
.form-actions-row { display: flex; gap: 8px; justify-content: flex-end; padding: 12px 16px; border-top: 1px solid var(--ox-border, #e5e7eb); }
.form-msg { margin: 8px 16px 0; padding: 7px 10px; border-radius: 6px; font-size: 12.5px; }
.form-msg-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.spin { display: inline-block; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
