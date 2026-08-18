<template>
  <div class="journal-screen">
    <div class="page-screen">
      <div class="page-header">
        <div class="page-title">
          <h1>اليومية العامة</h1>
          <p class="page-subtitle">{{ entries.length }} قيدًا — رصيد النظام:
            <span class="balance-ok" v-if="balanced">متوازن ✔</span>
            <span class="balance-bad" v-else>غير متوازن!</span>
          </p>
        </div>
        <button class="btn btn-primary btn-lg" @click="openNewEntry">
          <span>قيد جديد</span><span class="btn-icon">+</span>
        </button>
      </div>

      <div class="table-card">
        <table class="bolt-table">
          <thead>
            <tr>
              <th style="width:85px">رقم القيد</th>
              <th style="width:110px">التاريخ</th>
              <th>البيان</th>
              <th style="width:100px">المرجع</th>
              <th style="width:115px; text-align:left">مدين</th>
              <th style="width:115px; text-align:left">دائن</th>
              <th style="width:80px">الحالة</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in sortedEntries" :key="e.id">
              <td><span class="link-cell">#{{ e.id }}</span></td>
              <td>{{ e.date }}</td>
              <td style="font-weight:600">{{ e.description }}</td>
              <td><span class="ref-badge">{{ refLabel(e.refKind) }}</span></td>
              <td class="num-cell">{{ fmt(entryDebit(e.id)) }}</td>
              <td class="num-cell">{{ fmt(entryCredit(e.id)) }}</td>
              <td><span class="status-pill posted">✔ مرحَّل</span></td>
            </tr>
            <tr v-if="entries.length === 0">
              <td colspan="7" class="empty-row">
                <div class="empty-box">
                  <span class="empty-icon">◈</span>
                  <p class="empty-title">لا توجد قيود محاسبية بعد</p>
                  <p class="empty-hint">أول قيد يُنشأ تلقائيًا عند أول عملية (شراء/بيع/تحصيل)</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- نموذج القيد -->
    <div v-if="showForm" class="form-modal-overlay" @click.self="showForm = false">
      <div class="form-card-wide">
        <div class="form-card-title">
          <span>قيد محاسبي جديد — مزدوج القيد</span>
          <button class="close-btn" @click="showForm = false">✕</button>
        </div>
        <div class="field-list">
          <div class="field-row-wide">
            <label>التاريخ</label>
            <input type="date" class="fi" v-model="entry.date" />
          </div>
          <div class="field-row-wide">
            <label>البيان</label>
            <input type="text" class="fi" v-model="entry.description" placeholder="مثال: سداد مصروف إيجار" />
          </div>
        </div>

        <div class="form-card-title" style="margin-top:14px"><span>سطور القيد</span></div>
        <div class="entry-lines">
          <div class="lines-head">
            <span style="flex:2">الحساب</span>
            <span class="num-cell">مدين</span>
            <span class="num-cell">دائن</span>
            <span style="width:28px"></span>
          </div>
          <div v-for="(l, i) in entry.lines" :key="i" class="line-row">
            <select class="fi line-account" v-model="l.accountId">
              <option :value="null" disabled>اختر الحساب</option>
              <optgroup v-for="group in accountGroups" :key="group.type" :label="group.label">
                <option v-for="a in group.accounts" :key="a.id" :value="a.id">{{ a.code }} — {{ a.name }}</option>
              </optgroup>
            </select>
            <input type="number" class="fi num" v-model.number="l.debit" placeholder="مدين" min="0" step="0.01" />
            <input type="number" class="fi num" v-model.number="l.credit" placeholder="دائن" min="0" step="0.01" />
            <button class="line-del" @click="removeLine(i)" :disabled="entry.lines.length <= 2" title="حذف السطر">✕</button>
          </div>
          <button class="btn btn-outline btn-sm" @click="addLine">+ سطر</button>
          <div class="line-totals">
            <span>مدين: <b>{{ fmt(lineDebit) }}</b> — دائن: <b>{{ fmt(lineCredit) }}</b></span>
            <span class="bal-badge" :class="balancedForm ? 'ok' : 'bad'">{{ balancedForm ? '✔ متوازن' : '✗ غير متوازن' }}</span>
          </div>
        </div>

        <div v-if="formError" class="form-msg form-msg-error">{{ formError }}</div>
        <div class="form-actions-row">
          <button class="btn btn-outline" @click="showForm = false">إلغاء</button>
          <button class="btn btn-primary" @click="saveEntry" :disabled="!balancedForm || saving">
            <span v-if="saving" class="spin">⏳</span>
            <span>ترحيل القيد</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { db, activeAccounts } from '../../db/database.js'
import { apiFetch } from '../../db/api.js'
import { getStorageMode } from '../../db/storage.js'
import { fmt, trialBalance, postManualJournal } from '../../db/engine.js'
import { requirePermission } from '../../db/session.js'

const entries = ref([])
const accounts = ref([])
const showForm = ref(false)
const saving = ref(false)
const formError = ref('')
const balanced = ref(true)

const entry = ref({ date: new Date().toISOString().slice(0, 10), description: '', lines: [] })

const accountGroups = computed(() => {
  const groups = { Assets: { type: 'Assets', label: 'الأصول', accounts: [] }, Liabilities: { type: 'Liabilities', label: 'الخصوم', accounts: [] }, Equity: { type: 'Equity', label: 'حقوق الملكية', accounts: [] }, Revenue: { type: 'Revenue', label: 'الإيرادات', accounts: [] }, Expense: { type: 'Expense', label: 'المصروفات', accounts: [] } }
  for (const a of accounts.value) if (groups[a.type]) groups[a.type].accounts.push(a)
  return Object.values(groups).filter(g => g.accounts.length)
})

const lineDebit = computed(() => entry.value.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0))
const lineCredit = computed(() => entry.value.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0))
const balancedForm = computed(() => lineDebit.value > 0 && Math.abs(lineDebit.value - lineCredit.value) < 0.005)
const sortedEntries = computed(() => [...entries.value].sort((a, b) => b.id - a.id))

function entryDebit(id) { return entriesByLine.value.filter(l => l.entryId === id).reduce((s, l) => s + (l.debit || 0), 0) }
function entryCredit(id) { return entriesByLine.value.filter(l => l.entryId === id).reduce((s, l) => s + (l.credit || 0), 0) }
const entriesByLine = ref([])

function refLabel(kind) {
  const map = { sale: 'مبيعات', purchase: 'مشتريات', collection: 'تحصيل', saleReturn: 'مرتجع', supplierPayment: 'سداد مورد', opening: 'افتتاحي', manual: 'يدوي' }
  return map[kind] || kind || '—'
}

async function loadData() {
  accounts.value = (await activeAccounts()).sort((a, b) => a.code.localeCompare(b.code, 'ar'))
  if (getStorageMode() === 'server') {
    try {
      const j = await apiFetch('/journals', { fallback: null })
      if (j && Array.isArray(j)) {
        entries.value = j.map(e => ({ ...e, refKind: e.ref_kind, createdBy: e.created_by }))
        try {
          const jl = await apiFetch('/journals-lines', { fallback: null })
          if (jl && Array.isArray(jl)) {
            entriesByLine.value = jl.map(l => ({ ...l, entryId: l.entry_id, debit: Number(l.debit), credit: Number(l.credit) }))
          } else if (j.length) {
            const detail = await apiFetch('/journals/' + j[0].id, { fallback: null })
            entriesByLine.value = (detail?.lines || []).map(l => ({ ...l, entryId: detail.id, debit: Number(l.debit), credit: Number(l.credit) }))
          } else {
            entriesByLine.value = []
          }
        } catch { entriesByLine.value = [] }
        const tb = await trialBalance()
        balanced.value = tb.balanced !== undefined ? tb.balanced : Math.abs((tb.totalDebit || 0) - (tb.totalCredit || 0)) < 0.01
        return
      }
    } catch {}
  }
  entries.value = await db.journalEntries.toArray()
  entriesByLine.value = await db.journalLines.toArray()
  const tb = await trialBalance()
  balanced.value = tb.balanced
}

function openNewEntry() {
  formError.value = ''
  entry.value = { date: new Date().toISOString().slice(0, 10), description: '', lines: [{ accountId: null, debit: 0, credit: 0 }, { accountId: null, debit: 0, credit: 0 }] }
  showForm.value = true
}
function addLine() { entry.value.lines.push({ accountId: null, debit: 0, credit: 0 }) }
function removeLine(i) { entry.value.lines.splice(i, 1) }

async function saveEntry() {
  saving.value = true
  formError.value = ''
  try {
    await requirePermission('journal.write', 'إنشاء قيد يدوي')
    const validLines = entry.value.lines.filter(l => l.accountId && ((l.debit || 0) > 0 || (l.credit || 0) > 0))
    await postManualJournal({ date: entry.value.date, description: entry.value.description, lines: validLines })
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
/* ============================================
   اليومية العامة — نمط bolt.host
   ============================================ */
.journal-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.page-screen { padding: 24px; display: flex; flex-direction: column; gap: 16px; overflow: auto; flex: 1; }
.page-header { display: flex; align-items: center; justify-content: space-between; }
.page-title h1 { font-size: 26px; font-weight: 800; color: #0f172a; line-height: 1.2; }
.page-subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
.num-cell { text-align: left; direction: ltr; font-variant-numeric: tabular-nums; }
.link-cell { color: #2563eb; font-weight: 600; cursor: pointer; text-decoration: none; }
.balance-ok { color: #15803d; font-weight: 700; }
.balance-bad { color: #b91c1c; font-weight: 700; }
.ref-badge { background: #f1f5f9; color: #475569; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px; }

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

.status-pill { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 999px; }
.status-pill.posted { background: #f0fdf4; color: #15803d; }

/* ---------- النموذج ---------- */
.form-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
.form-card-wide { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 20px 40px rgba(0,0,0,0.25); width: 680px; max-width: 97vw; max-height: 92vh; overflow: auto; padding: 20px; }
.form-card-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-size: 16px; font-weight: 800; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
.close-btn { background: transparent; border: none; font-size: 14px; color: #64748b; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
.close-btn:hover { background: #f1f5f9; color: #0f172a; }
.field-list { display: flex; flex-direction: column; gap: 10px; }
.field-row-wide { display: flex; align-items: center; gap: 10px; }
.field-row-wide label { width: 90px; font-size: 12px; font-weight: 600; color: #64748b; flex-shrink: 0; }
.fi { height: 36px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 12px; font-size: 13px; font-family: inherit; color: #0f172a; background: #fff; outline: none; }
.fi:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15); }
.fi.num { width: 130px; text-align: left; direction: ltr; }

.entry-lines { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; background: #fafbfd; }
.lines-head { display: flex; gap: 10px; font-size: 11px; font-weight: 700; color: #94a3b8; margin-bottom: 6px; }
.line-row { display: flex; gap: 10px; margin-bottom: 8px; align-items: center; }
.line-account { flex: 2; }
.line-del { width: 28px; height: 32px; border: 1px solid #fecaca; background: #fef2f2; color: #b91c1c; border-radius: 8px; cursor: pointer; font-size: 12px; }
.line-del:hover { background: #fee2e2; }
.line-del:disabled { opacity: 0.35; cursor: not-allowed; }
.line-totals { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #475569; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #e2e8f0; }
.bal-badge { font-size: 12px; font-weight: 700; }
.bal-badge.ok { color: #15803d; }
.bal-badge.bad { color: #b91c1c; }

.form-msg { padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; margin-top: 12px; }
.form-msg-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

.form-actions-row { display: flex; gap: 10px; justify-content: flex-end; padding-top: 16px; }
.btn { display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 18px; border-radius: 8px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; border: 1px solid transparent; transition: all 0.15s; white-space: nowrap; }
.btn-lg { height: 40px; padding: 0 20px; font-size: 14px; }
.btn-sm { height: 32px; padding: 0 14px; font-size: 12px; }
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
  .line-row { flex-wrap: wrap; }
  .line-account { min-width: 100%; }
  .bolt-table { min-width: 780px; }
}
</style>
