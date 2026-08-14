<template>
  <div class="reports-screen">
    <div class="page-screen">
      <div class="page-header">
        <div class="page-title">
          <h1>التقارير المالية</h1>
          <p class="page-subtitle">
            <span v-if="tab === 'trialBalance'" :class="tb.balanced ? 'badge-ok' : 'badge-bad'">
              {{ tb.balanced ? '✓ الميزان متوازن (مدين = دائن)' : '✗ الميزان غير متوازن!' }}
            </span>
            <span v-else>تقارير فعّالة من قيود قاعدة البيانات — ميزان مراجعة · أستاذ عام · قائمة دخل · سجل عمليات</span>
          </p>
        </div>
        <button class="btn btn-outline" @click="loadAll">↻ تحديث</button>
      </div>

      <!-- تبويبات pill -->
      <div class="tab-row">
        <button v-for="t in tabs" :key="t.key" class="tab-btn" :class="{ active: tab === t.key }" @click="switchTab(t.key)">
          <span class="tab-icon">{{ t.icon }}</span> {{ t.label }}
        </button>
      </div>

      <div v-if="loadError" class="form-msg form-msg-error">{{ loadError }}</div>

      <!-- ميزان المراجعة -->
      <div v-if="tab === 'trialBalance'" class="table-card">
        <table class="bolt-table">
          <thead>
            <tr>
              <th style="width:90px">الكود</th>
              <th>الحساب</th>
              <th style="width:110px">النوع</th>
              <th style="width:120px; text-align:left">مدين</th>
              <th style="width:120px; text-align:left">دائن</th>
              <th style="width:120px; text-align:left">الرصيد</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in tb.rows" :key="r.id">
              <td class="code-cell"><span class="code-badge">{{ r.code }}</span></td>
              <td style="font-weight:600">{{ r.name }}</td>
              <td>{{ typeLabel(r.type) }}</td>
              <td class="num-cell">{{ fmt(r.debit) }}</td>
              <td class="num-cell">{{ fmt(r.credit) }}</td>
              <td class="num-cell"><b>{{ fmt(r.balance) }}</b></td>
            </tr>
            <tr class="totals-row">
              <td colspan="3">الإجمالي</td>
              <td class="num-cell"><b>{{ fmt(tb.totalDebit) }}</b></td>
              <td class="num-cell"><b>{{ fmt(tb.totalCredit) }}</b></td>
              <td class="num-cell"></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- الأستاذ العام -->
      <div v-if="tab === 'ledger'" class="table-card">
        <div class="card-filter-row">
          <label style="font-size:12px; font-weight:600; color:#64748b">الحساب</label>
          <select class="fi chip-select-wide" v-model.number="ledgerAccount" @change="onLedgerChange">
            <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.code }} — {{ a.name }}</option>
          </select>
        </div>
        <table class="bolt-table" v-if="ledgerRows.length">
          <thead>
            <tr>
              <th style="width:80px">القيد</th>
              <th style="width:105px">التاريخ</th>
              <th>البيان</th>
              <th style="width:100px; text-align:left">مدين</th>
              <th style="width:100px; text-align:left">دائن</th>
              <th style="width:115px; text-align:left">الرصيد الجاري</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in ledgerRows" :key="l.id">
              <td class="code-cell"><span class="link-cell">#{{ l.entryId }}</span></td>
              <td>{{ l.entry?.date }}</td>
              <td>{{ l.entry?.description }}</td>
              <td class="num-cell">{{ fmt(l.debit) }}</td>
              <td class="num-cell">{{ fmt(l.credit) }}</td>
              <td class="num-cell"><b>{{ fmt(l.running) }}</b></td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-box-wrap">
          <div class="empty-box">
            <span class="empty-icon">📭</span>
            <p class="empty-title">لا توجد حركات على هذا الحساب بعد</p>
          </div>
        </div>
      </div>

      <!-- قائمة الدخل -->
      <div v-if="tab === 'income'" class="income-card">
        <div class="income-section">
          <h4 class="income-heading"><span class="h-dot" style="background:#16a34a"></span> الإيرادات</h4>
          <div v-for="r in is.revenues" :key="r.id" class="income-line">
            <span>{{ r.code }} — {{ r.name }}</span>
            <span class="num-cell">{{ fmt(r.net) }}</span>
          </div>
          <div class="income-line subtotal">
            <span>إجمالي الإيرادات</span>
            <span class="num-cell"><b>{{ fmt(is.totalRevenue) }}</b></span>
          </div>
        </div>
        <div class="income-section">
          <h4 class="income-heading"><span class="h-dot" style="background:#ea580c"></span> المصروفات وتكلفة المبيعات</h4>
          <div v-for="r in is.expenses" :key="r.id" class="income-line">
            <span>{{ r.code }} — {{ r.name }}</span>
            <span class="num-cell">{{ fmt(r.net) }}</span>
          </div>
          <div class="income-line subtotal">
            <span>إجمالي المصروفات</span>
            <span class="num-cell"><b>{{ fmt(is.totalExpense) }}</b></span>
          </div>
        </div>
        <div class="income-net">
          <span>صافي الربح (الخسارة)</span>
          <span class="num-cell"><b>{{ fmt(is.netIncome) }}</b></span>
        </div>
      </div>

      <!-- سجل التدقيق -->
      <div v-if="tab === 'audit'" class="table-card">
        <table class="bolt-table">
          <thead>
            <tr>
              <th style="width:75px">#</th>
              <th style="width:155px">الوقت</th>
              <th style="width:120px">المستخدم</th>
              <th>العملية</th>
              <th style="width:130px">المرجع</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in auditRows" :key="l.id">
              <td class="code-cell"><span class="link-cell">{{ l.id }}</span></td>
              <td class="mono">{{ new Date(l.createdAt).toLocaleString('en-GB', { hour12: false }) }}</td>
              <td>{{ l.userName || '—' }}</td>
              <td>{{ l.action }}<span v-if="l.detail && typeof l.detail !== 'string'" class="detail-note"> {{ l.detail }}</span></td>
              <td>{{ l.refKind || '—' }}{{ l.refId ? ' #' + l.refId : '' }}</td>
            </tr>
            <tr v-if="auditRows.length === 0">
              <td colspan="5" class="empty-row">
                <div class="empty-box">
                  <span class="empty-icon">🔍</span>
                  <p class="empty-title">لا توجد عمليات مسجلة</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { db, activeAccounts, ACCOUNT_TYPE_LABEL } from '../../db/database.js'
import { getStorageMode } from '../../db/storage.js'
import { apiFetch } from '../../db/api.js'
import { fmt, trialBalance, generalLedger, incomeStatement } from '../../db/engine.js'

const tabs = [
  { key: 'trialBalance', label: 'ميزان المراجعة', icon: '⚖️' },
  { key: 'ledger', label: 'الأستاذ العام', icon: '📒' },
  { key: 'income', label: 'قائمة الدخل', icon: '📈' },
  { key: 'audit', label: 'سجل العمليات', icon: '🔍' },
]
const tab = ref('trialBalance')
const tb = ref({ rows: [], totalDebit: 0, totalCredit: 0, balanced: false })
const is = ref({ revenues: [], expenses: [], totalRevenue: 0, totalExpense: 0, netIncome: 0 })
const accounts = ref([])
const ledgerAccount = ref(null)
const ledgerRows = ref([])
const auditRows = ref([])
const loadError = ref('')

function typeLabel(t) { return ACCOUNT_TYPE_LABEL[t] || t }
function switchTab(t) { tab.value = t; loadAll() }

async function onLedgerChange() {
  if (ledgerAccount.value) ledgerRows.value = await generalLedger(ledgerAccount.value)
}

async function loadAll() {
  try {
    tb.value = await trialBalance()
    is.value = await incomeStatement()
    accounts.value = (await activeAccounts()).sort((a, b) => a.code.localeCompare(b.code, 'ar'))
    if (ledgerAccount.value) ledgerRows.value = await generalLedger(ledgerAccount.value)
    let raw = getStorageMode() === 'server'
      ? (await apiFetch('/audit?limit=200')).map(a => ({ ...a, userName: a.username, createdAt: a.created_at, refKind: a.ref_kind, refId: a.ref_id, detail: a.details }))
      : (await db.auditLogs.orderBy('id').reverse().limit(200).toArray())
    auditRows.value = Array.isArray(raw) ? raw : []
  } catch (e) {
    console.error('فشل تحميل التقارير:', e)
    loadError.value = String(e.message || e)
  }
}

onMounted(async () => {
  accounts.value = (await activeAccounts()).sort((a, b) => a.code.localeCompare(b.code, 'ar'))
  if (accounts.value.length) ledgerAccount.value = accounts.value[0].id
  await loadAll()
})
</script>

<style scoped>
/* ============================================
   التقارير المالية — نمط bolt.host
   ============================================ */
.reports-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.page-screen { padding: 24px; display: flex; flex-direction: column; gap: 16px; overflow: auto; flex: 1; }
.page-header { display: flex; align-items: center; justify-content: space-between; }
.page-title h1 { font-size: 26px; font-weight: 800; color: #0f172a; line-height: 1.2; }
.page-subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
.num-cell { text-align: left; direction: ltr; font-variant-numeric: tabular-nums; }
.code-cell { direction: ltr; }
.code-badge { background: #eff6ff; color: #1d4ed8; font-family: monospace; font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 6px; }
.link-cell { color: #2563eb; font-weight: 600; cursor: pointer; text-decoration: none; }
.mono { font-family: monospace; font-size: 12px; direction: ltr; }
.badge-ok { color: #15803d; font-weight: 700; }
.badge-bad { color: #b91c1c; font-weight: 700; }
.detail-note { color: #94a3b8; font-size: 12px; }

.tab-row { display: flex; gap: 6px; border-bottom: 1px solid #e2e8f0; }
.tab-btn { display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 16px; border: none; border-bottom: 2px solid transparent; background: transparent; color: #64748b; cursor: pointer; font-size: 13px; font-weight: 600; font-family: inherit; transition: all 0.15s; margin-bottom: -1px; }
.tab-btn:hover { color: #2563eb; background: #f1f5f9; border-radius: 8px 8px 0 0; }
.tab-btn.active { color: #2563eb; border-bottom-color: #2563eb; background: #eff6ff; border-radius: 8px 8px 0 0; }
.tab-icon { font-size: 14px; }

.table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05); overflow: auto; flex: 1; min-height: 0; }
.bolt-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.bolt-table thead th { background: #f8fafc; color: #64748b; font-weight: 600; font-size: 12px; padding: 10px 12px; text-align: right; border-bottom: 1px solid #e2e8f0; white-space: nowrap; position: sticky; top: 0; }
.bolt-table tbody td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
.bolt-table tbody tr:hover td { background: #f8fafc; }
.totals-row td { background: #f8fafc !important; font-weight: 700; border-top: 2px solid #e2e8f0; color: #0f172a; }
.empty-row td { padding: 48px 24px !important; border-bottom: none; }
.empty-box-wrap { display: flex; align-items: center; justify-content: center; padding: 48px 0; }
.empty-box { display: flex; flex-direction: column; align-items: center; gap: 6px; color: #94a3b8; }
.empty-icon { font-size: 40px; }
.empty-title { font-size: 15px; font-weight: 700; color: #475569; }

.card-filter-row { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1px solid #f1f5f9; background: #f8fafc; }
.chip-select-wide { flex: 1; max-width: 420px; height: 34px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 12px; font-size: 13px; font-family: inherit; background: #fff; outline: none; color: #334155; }
.chip-select-wide:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15); }

/* ---------- قائمة الدخل ---------- */
.income-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05); padding: 20px; overflow: auto; flex: 1; max-width: 640px; }
.income-section { margin-bottom: 18px; }
.income-heading { display: flex; align-items: center; gap: 8px; margin: 0 0 8px; font-size: 14px; font-weight: 700; color: #334155; }
.h-dot { display: inline-block; width: 8px; height: 8px; border-radius: 999px; }
.income-line { display: flex; justify-content: space-between; padding: 7px 12px; font-size: 13px; color: #475569; border-bottom: 1px dashed #e2e8f0; }
.income-line.subtotal { background: #f8fafc; font-weight: 700; color: #0f172a; border-radius: 8px; border-bottom: none; margin-top: 6px; }
.income-net { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: #2563eb; color: #fff; font-weight: 800; font-size: 16px; border-radius: 10px; margin-top: 8px; }
.income-net .num-cell { font-size: 17px; }

.form-msg { padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; }
.form-msg-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

.btn { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 16px; border-radius: 8px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; border: 1px solid #d1d5db; background: #fff; color: #374151; transition: all 0.15s; white-space: nowrap; }
.btn:hover { background: #f9fafb; border-color: #9ca3af; }

@media (max-width: 768px) {
  .page-screen { padding: 16px; }
  .tab-btn { flex: 1; justify-content: center; font-size: 12px; padding: 0 8px; }
  .tab-icon { display: none; }
  .bolt-table { min-width: 760px; }
}
</style>
