<template>
  <div class="reports-screen">
    <div class="screen-toolbar">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="tab-btn"
        :class="{ active: tab === t.key }"
        @click="switchTab(t.key)"
      >
        {{ t.label }}
      </button>
      <span class="toolbar-spacer"></span>
      <span v-if="tab === 'trialBalance'" class="toolbar-info">
        {{ tb.balanced ? '✓ الميزان متوازن (مدين = دائن)' : '✗ الميزان غير متوازن!' }}
      </span>
      <button class="btn btn-secondary small" @click="loadAll">↻ تحديث</button>
      <span v-if="loadError" class="toolbar-info" style="color:#b71c1c">{{ loadError }}</span>
    </div>

    <div class="table-scroll">
      <!-- ميزان المراجعة -->
      <div v-if="tab === 'trialBalance'" class="report-block">
        <h3 class="report-title">ميزان المراجعة</h3>
        <table class="dense-table">
          <thead>
            <tr><th style="width:70px">الكود</th><th>الحساب</th><th>النوع</th><th style="width:110px">مدين</th><th style="width:110px">دائن</th><th style="width:110px">الرصيد</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in tb.rows" :key="r.id">
              <td>{{ r.code }}</td><td style="font-weight:bold">{{ r.name }}</td><td>{{ typeLabel(r.type) }}</td>
              <td class="num">{{ fmt(r.debit) }}</td><td class="num">{{ fmt(r.credit) }}</td><td class="num">{{ fmt(r.balance) }}</td>
            </tr>
            <tr class="totals-row">
              <td colspan="3">الإجمالي</td>
              <td class="num"><b>{{ fmt(tb.totalDebit) }}</b></td>
              <td class="num"><b>{{ fmt(tb.totalCredit) }}</b></td>
              <td class="num"></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- الأستاذ العام -->
      <div v-if="tab === 'ledger'" class="report-block">
        <h3 class="report-title">الأستاذ العام</h3>
        <div class="field-row">
          <label style="margin-left:8px">الحساب</label>
          <select class="input-field" v-model.number="ledgerAccount">
            <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.code }} — {{ a.name }}</option>
          </select>
        </div>
        <table class="dense-table" v-if="ledgerRows.length">
          <thead>
            <tr><th style="width:60px">القيد</th><th style="width:100px">التاريخ</th><th>البيان</th><th style="width:90px">مدين</th><th style="width:90px">دائن</th><th style="width:110px">الرصيد الجاري</th></tr>
          </thead>
          <tbody>
            <tr v-for="l in ledgerRows" :key="l.id">
              <td>{{ l.entryId }}</td><td>{{ l.entry?.date }}</td><td>{{ l.entry?.description }}</td>
              <td class="num">{{ fmt(l.debit) }}</td><td class="num">{{ fmt(l.credit) }}</td><td class="num">{{ fmt(l.running) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-state">لا توجد حركات على هذا الحساب بعد</div>
      </div>

      <!-- قائمة الدخل -->
      <div v-if="tab === 'income'" class="report-block">
        <h3 class="report-title">قائمة الدخل</h3>
        <div class="income-section">
          <h4>الإيرادات</h4>
          <div v-for="r in is.revenues" :key="r.id" class="income-line"><span>{{ r.code }} — {{ r.name }}</span><span class="num">{{ fmt(r.net) }}</span></div>
          <div class="income-line total"><span>إجمالي الإيرادات</span><span class="num"><b>{{ fmt(is.totalRevenue) }}</b></span></div>
        </div>
        <div class="income-section">
          <h4>المصروفات وتكلفة المبيعات</h4>
          <div v-for="r in is.expenses" :key="r.id" class="income-line"><span>{{ r.code }} — {{ r.name }}</span><span class="num">{{ fmt(r.net) }}</span></div>
          <div class="income-line total"><span>إجمالي المصروفات</span><span class="num"><b>{{ fmt(is.totalExpense) }}</b></span></div>
        </div>
        <div class="income-line net">
          <span>صافي الربح (الخسارة)</span>
          <span class="num"><b>{{ fmt(is.netIncome) }}</b></span>
        </div>
      </div>

      <!-- سجل التدقيق -->
      <div v-if="tab === 'audit'" class="report-block">
        <h3 class="report-title">سجل العمليات (Audit Log)</h3>
        <table class="dense-table">
          <thead>
            <tr><th style="width:50px">#</th><th style="width:120px">الوقت</th><th style="width:90px">المستخدم</th><th>العملية</th><th style="width:90px">المرجع</th></tr>
          </thead>
          <tbody>
            <tr v-for="l in auditRows" :key="l.id">
              <td>{{ l.id }}</td>
              <td>{{ new Date(l.createdAt).toLocaleString('en-GB', { hour12: false }) }}</td>
              <td>{{ l.userName || '—' }}</td>
              <td>{{ l.action }}<span v-if="l.detail && typeof l.detail !== 'string'" class="detail-note"> {{ l.detail }}</span></td>
              <td>{{ l.refKind || '—' }}{{ l.refId ? ' #' + l.refId : '' }}</td>
            </tr>
            <tr v-if="auditRows.length === 0">
              <td colspan="5" class="empty-state">لا توجد عمليات مسجلة</td>
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
import { fmt, trialBalance, generalLedger, incomeStatement } from '../../db/engine.js'

const tabs = [
  { key: 'trialBalance', label: 'ميزان المراجعة' },
  { key: 'ledger', label: 'الأستاذ العام' },
  { key: 'income', label: 'قائمة الدخل' },
  { key: 'audit', label: 'سجل العمليات' },
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

async function loadAll() {
  try {
    tb.value = await trialBalance()
    is.value = await incomeStatement()
    accounts.value = (await activeAccounts()).sort((a, b) => a.code.localeCompare(b.code, 'ar'))
    if (ledgerAccount.value) ledgerRows.value = await generalLedger(ledgerAccount.value)
    auditRows.value = (await db.auditLogs.orderBy('id').reverse().limit(200).toArray())
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
.reports-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.screen-toolbar { display: flex; gap: 4px; padding: 6px; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: 2px; margin-bottom: 6px; align-items: center; flex-wrap: wrap; flex-shrink: 0; }
.tab-btn { padding: 6px 14px; border: 1px solid var(--color-border); border-radius: 3px; background: #fff; cursor: pointer; font-size: 13px; font-weight: bold; }
.tab-btn.active { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.toolbar-spacer { flex: 1; }
.toolbar-info { font-size: 13px; font-weight: bold; color: #1b5e20; }
.table-scroll { flex: 1; overflow: auto; background: var(--color-bg-primary); min-height: 0; padding: 8px; }
.report-title { margin: 4px 0 8px; font-size: 16px; color: var(--color-primary); border-bottom: 2px solid var(--color-primary); padding-bottom: 4px; }
.num { text-align: left; direction: ltr; }
.totals-row td { background: #f2f6fb; font-weight: bold; border-top: 2px solid var(--color-border); }
.income-section { margin-bottom: 12px; }
.income-section h4 { margin: 0 0 4px; color: #444; font-size: 14px; }
.income-line { display: flex; justify-content: space-between; padding: 4px 8px; font-size: 13px; border-bottom: 1px dashed #e4e9f0; }
.income-line.total { background: #f2f6fb; font-weight: bold; }
.income-line.net { background: var(--color-primary); color: #fff; font-weight: bold; padding: 8px 10px; margin-top: 8px; border-radius: 4px; }
.field-row { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; }
.input-field { padding: 5px 8px; border: 1px solid var(--color-border); border-radius: 3px; font-size: 13px; background: #fff; }
.empty-state { text-align: center; color: var(--color-text-secondary); padding: 18px; }
.btn { padding: 5px 12px; border-radius: 3px; cursor: pointer; font-weight: bold; font-size: 13px; border: 1px solid var(--color-border); background: var(--color-bg-secondary); }
.detail-note { color: var(--color-text-secondary); font-size: 12px; }
@media (max-width: 768px) { .screen-toolbar { flex-direction: column; align-items: stretch; } .tab-btn { width: 100%; text-align: center; } }
</style>
