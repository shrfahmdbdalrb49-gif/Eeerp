<template>
  <div class="journal-screen">
    <div class="page-screen">
      <div class="page-header">
        <div class="page-title">
          <h1>القيود الافتتاحية</h1>
          <p class="page-subtitle">أرصدة أول المدة: العملاء والموردون والصناديق والبنوك والمخزون — تُرحَّل كقيد افتتاحي متوازن</p>
        </div>
        <button class="btn btn-primary btn-lg" @click="openNewEntry">
          <span>قيد افتتاحي جديد</span><span class="btn-icon">+</span>
        </button>
      </div>

      <div class="info-card">
        <p>تُستخدم هذه الشاشة لإدخال أرصدة افتتاح السنة المالية (رصيد الصندوق، أرصدة البنوك، أرصدة العملاء والموردين، قيمة المخزون، رأس المال).
          كل قيد يجب أن يتوازن (مدين = دائن) وإلا رفض النظام حفظه. القيود الافتتاحية تظهر في اليومية العامة برقم مرجع «افتتاحي».</p>
      </div>

      <div class="table-card">
        <table class="bolt-table">
          <thead>
            <tr>
              <th style="width:85px">رقم القيد</th>
              <th style="width:110px">التاريخ</th>
              <th>البيان</th>
              <th style="width:115px; text-align:left">مدين</th>
              <th style="width:115px; text-align:left">دائن</th>
              <th style="width:80px">الحالة</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in openingEntries" :key="e.id">
              <td><span class="link-cell">#{{ e.id }}</span></td>
              <td>{{ e.date }}</td>
              <td style="font-weight:600">{{ e.description }}</td>
              <td class="num-cell">{{ fmt(entryDebit(e.id)) }}</td>
              <td class="num-cell">{{ fmt(entryCredit(e.id)) }}</td>
              <td><span class="status-pill posted">✓ مرحَّل</span></td>
            </tr>
            <tr v-if="openingEntries.length === 0">
              <td colspan="6" class="empty-row">
                <div class="empty-box">
                  <span class="empty-icon">📘</span>
                  <p class="empty-title">لا توجد قيود افتتاحية بعد</p>
                  <p class="empty-hint">اضغط «قيد افتتاحي جديد» لإدخال أرصدة أول المدة (الصندوق، العملاء، الموردين، المخزون، رأس المال)</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- نموذج القيد الافتتاحي -->
    <div v-if="showForm" class="form-modal-overlay" @click.self="showForm = false">
      <div class="form-card-wide">
        <div class="form-card-title">
          <span>قيد افتتاحي جديد — مزدوج القيد</span>
          <button class="close-btn" @click="showForm = false">✕</button>
        </div>
        <div class="field-list">
          <div class="field-row-wide">
            <label>تاريخ الرصيد (أول المدة)</label>
            <input type="date" class="fi" v-model="entry.date" />
          </div>
          <div class="field-row-wide">
            <label>البيان</label>
            <input type="text" class="fi" v-model="entry.description" placeholder="مثال: رصيد افتتاحي 2026 — صندوق وعملاء ومخزون" />
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
            <span class="bal-badge" :class="balancedForm ? 'ok' : 'bad'">{{ balancedForm ? '✓ متوازن' : '✗ غير متوازن' }}</span>
          </div>
        </div>
        <div class="entry-hints">
          <p>💡 مثال: مدين «ذمم العملاء» رصيد عميل / مدين «الصندوق» نقدي في الصندوق / مدين «المخزون» قيمة المخزون — دائن «رأس المال» الفرق.</p>
          <p>💡 لسداد مورد: مدين «المصروفات/الذمم الدائنة» ودائن «الصندوق».</p>
        </div>
        <div v-if="formError" class="form-msg form-msg-error">{{ formError }}</div>
        <div class="form-actions-row">
          <button class="btn btn-outline" @click="showForm = false">إلغاء</button>
          <button class="btn btn-primary" @click="saveEntry" :disabled="!balancedForm || saving">
            <span v-if="saving" class="spin">⏳</span>
            <span>ترحيل القيد الافتتاحي</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { db, activeAccounts } from '../../db/database.js'
import { getStorageMode } from '../../db/storage.js'
import { fmt, trialBalance, postOpeningJournal } from '../../db/engine.js'
import { requirePermission } from '../../db/session.js'

const entries = ref([])
const accounts = ref([])
const showForm = ref(false)
const saving = ref(false)
const formError = ref('')
const entry = ref({ date: new Date().toISOString().slice(0, 10), description: '', lines: [] })
const accountGroups = computed(() => {
  const groups = { Assets: { type: 'Assets', label: 'الأصول', accounts: [] }, Liabilities: { type: 'Liabilities', label: 'الخصوم', accounts: [] }, Equity: { type: 'Equity', label: 'حقوق الملكية', accounts: [] }, Revenue: { type: 'Revenue', label: 'الإيرادات', accounts: [] }, Expense: { type: 'Expense', label: 'المصروفات', accounts: [] } }
  for (const a of accounts.value) if (groups[a.type]) groups[a.type].accounts.push(a)
  return Object.values(groups).filter(g => g.accounts.length)
})
const openingEntries = computed(() => entries.value.filter(e => (e.refKind || e.ref_kind) === 'opening').sort((a, b) => b.id - a.id))
const lineDebit = computed(() => entry.value.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0))
const lineCredit = computed(() => entry.value.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0))
const balancedForm = computed(() => lineDebit.value > 0 && Math.abs(lineDebit.value - lineCredit.value) < 0.005)
const entriesByLine = ref([])
function entryDebit(id) { return entriesByLine.value.filter(l => l.entryId === id).reduce((s, l) => s + (l.debit || 0), 0) }
function entryCredit(id) { return entriesByLine.value.filter(l => l.entryId === id).reduce((s, l) => s + (l.credit || 0), 0) }

async function loadData() {
  accounts.value = (await activeAccounts()).sort((a, b) => a.code.localeCompare(b.code, 'ar'))
  entries.value = await db.journalEntries.toArray()
  entriesByLine.value = await db.journalLines.toArray()
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
    await requirePermission('journal.write', 'إنشاء قيد افتتاحي')
    const validLines = entry.value.lines.filter(l => l.accountId && ((l.debit || 0) > 0 || (l.credit || 0) > 0))
    await postOpeningJournal({ date: entry.value.date, description: entry.value.description, lines: validLines })
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
.journal-screen { height: 100%; display: flex; flex-direction: column; }
.page-screen { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 14px 18px 10px; border-bottom: 1px solid var(--ox-border, #e5e7eb); }
.page-title h1 { font-size: 17px; font-weight: 700; margin: 0; }
.page-subtitle { font-size: 12px; color: var(--ox-muted, #6b7280); margin: 3px 0 0; }
.btn { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; padding: 7px 14px; border-radius: 6px; border: none; cursor: pointer; }
.btn-primary { background: var(--ox-primary, #2563eb); color: #fff; }
.btn-lg { padding: 9px 18px; font-size: 14px; }
.btn-outline { background: #fff; border: 1px solid var(--ox-border, #d1d5db); color: #374151; }
.btn-sm { font-size: 12px; padding: 4px 10px; }
.btn-icon { font-size: 16px; font-weight: 600; }
.info-card { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px 14px; margin: 10px 18px; font-size: 12.5px; color: #1e40af; }
.info-card p { margin: 0; }
.table-card { flex: 1; margin: 10px 18px 14px; border: 1px solid var(--ox-border, #e5e7eb); border-radius: 8px; overflow: auto; min-height: 0; }
.bolt-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.bolt-table th { background: var(--ox-head, #f3f4f6); padding: 8px 10px; text-align: right; font-weight: 600; border-bottom: 2px solid var(--ox-border, #e5e7eb); position: sticky; top: 0; }
.bolt-table td { padding: 7px 10px; border-bottom: 1px solid var(--ox-border, #f0f0f0); }
.link-cell { color: var(--ox-primary, #2563eb); font-weight: 600; }
.num-cell { text-align: left; font-variant-numeric: tabular-nums; }
.status-pill { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; background: #dcfce7; color: #166534; }
.empty-row td { padding: 48px 24px !important; border-bottom: none; }
.empty-box { text-align: center; color: var(--ox-muted, #6b7280); }
.empty-icon { font-size: 30px; display: block; margin-bottom: 8px; }
.empty-title { font-weight: 600; color: #374151; margin: 0 0 4px; }
.empty-hint { font-size: 12px; margin: 0; }
.form-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 9000; display: flex; align-items: center; justify-content: center; }
.form-card-wide { background: #fff; border-radius: 12px; width: min(640px, 94vw); max-height: 90vh; overflow: auto; box-shadow: 0 20px 60px rgba(0,0,0,.35); }
.form-card-title { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--ox-border, #e5e7eb); font-weight: 700; font-size: 14px; }
.close-btn { background: none; border: none; font-size: 18px; cursor: pointer; color: #6b7280; }
.field-list { padding: 12px 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.field-row-wide { display: flex; flex-direction: column; gap: 3px; }
.field-row-wide label { font-size: 11.5px; font-weight: 600; color: var(--ox-muted, #6b7280); }
.fi { padding: 7px 9px; border: 1px solid var(--ox-border, #d1d5db); border-radius: 6px; font-size: 13px; background: #fff; }
.fi:focus { outline: 2px solid var(--ox-primary, #2563eb); outline-offset: -1px; }
.entry-lines { padding: 0 16px 14px; }
.lines-head { display: flex; gap: 8px; font-size: 11.5px; font-weight: 600; color: var(--ox-muted, #6b7280); margin-bottom: 6px; }
.line-row { display: flex; gap: 8px; margin-bottom: 7px; }
.line-account { flex: 2; }
.line-row .fi.num { width: 110px; }
.line-del { background: none; border: 1px solid #fecaca; color: #dc2626; border-radius: 6px; width: 28px; cursor: pointer; font-size: 13px; }
.line-del:disabled { opacity: .4; cursor: not-allowed; }
.line-totals { display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; padding-top: 8px; border-top: 1px solid var(--ox-border, #f0f0f0); margin-top: 6px; }
.bal-badge { font-weight: 700; font-size: 12px; }
.bal-badge.ok { color: #166534; }
.bal-badge.bad { color: #dc2626; }
.entry-hints { padding: 0 16px 8px; font-size: 11.5px; color: var(--ox-muted, #6b7280); line-height: 1.5; }
.entry-hints p { margin: 3px 0 0; }
.form-actions-row { display: flex; gap: 8px; justify-content: flex-end; padding: 12px 16px; border-top: 1px solid var(--ox-border, #e5e7eb); }
.form-msg { margin: 8px 16px 0; padding: 7px 10px; border-radius: 6px; font-size: 12.5px; }
.form-msg-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.spin { display: inline-block; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
