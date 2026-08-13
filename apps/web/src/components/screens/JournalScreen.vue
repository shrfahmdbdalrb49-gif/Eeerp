<template>
  <div class="journal-screen">
    <div class="screen-toolbar">
      <button class="btn btn-primary" @click="openNewEntry">+ قيد جديد</button>
      <span class="toolbar-spacer"></span>
      <span class="toolbar-info">{{ entries.length }} قيدًا | رصيد النظام: {{ balanced ? 'متوازن ✓' : 'غير متوازن!' }}</span>
    </div>
    <div class="table-container table-scroll">
      <table class="dense-table">
        <thead>
          <tr>
            <th style="width:45px">#</th>
            <th style="width:110px">التاريخ</th>
            <th>البيان</th>
            <th>المرجع</th>
            <th style="width:105px">مدين</th>
            <th style="width:105px">دائن</th>
            <th style="width:60px">الحالة</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in sortedEntries" :key="e.id">
            <td>{{ e.id }}</td>
            <td>{{ e.date }}</td>
            <td style="font-weight:bold">{{ e.description }}</td>
            <td>{{ refLabel(e.refKind) }}</td>
            <td>{{ fmt(entryDebit(e.id)) }}</td>
            <td>{{ fmt(entryCredit(e.id)) }}</td>
            <td><span class="status-chip posted">مرحَّل</span></td>
          </tr>
          <tr v-if="entries.length === 0">
            <td colspan="7" class="empty-state">لا توجد قيود محاسبية بعد — أول قيد يُنشأ تلقائيًا عند أول عملية (شراء/بيع/تحصيل)</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- نموذج القيد -->
    <div v-if="showForm" class="form-modal-overlay" @click.self="showForm = false">
      <div class="form-modal">
        <div class="modal-title">
          <span>قيد محاسبي جديد (مزدوج القيد)</span>
          <button class="close-btn" @click="showForm = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="field-row">
              <label>التاريخ</label>
              <input type="date" class="input-field" v-model="entry.date" />
            </div>
            <div class="field-row" style="grid-column: 1 / -1">
              <label>البيان</label>
              <input type="text" class="input-field" v-model="entry.description" placeholder="مثال: سداد مصروف إيجار" />
            </div>
          </div>
          <div class="entry-lines">
            <div v-for="(l, i) in entry.lines" :key="i" class="line-row">
              <select class="input-field" v-model="l.accountId">
                <option :value="null" disabled>اختر الحساب</option>
                <optgroup v-for="group in accountGroups" :key="group.type" :label="group.label">
                  <option v-for="a in group.accounts" :key="a.id" :value="a.id">{{ a.code }} — {{ a.name }}</option>
                </optgroup>
              </select>
              <input type="number" class="input-field num" v-model.number="l.debit" placeholder="مدين" min="0" step="0.01" />
              <input type="number" class="input-field num" v-model.number="l.credit" placeholder="دائن" min="0" step="0.01" />
              <button class="delete-btn" @click="removeLine(i)" :disabled="entry.lines.length <= 2">✕</button>
            </div>
            <button class="btn btn-secondary small" @click="addLine">+ سطر</button>
            <div class="line-totals">
              <span>مدين: <b>{{ fmt(lineDebit) }}</b> — دائن: <b>{{ fmt(lineCredit) }}</b>
                <span :class="balancedForm ? 'ok' : 'bad'">{{ balancedForm ? '✓ متوازن' : '✗ غير متوازن' }}</span>
              </span>
            </div>
          </div>
        </div>
        <div class="form-actions">
          <span v-if="formError" class="form-error">{{ formError }}</span>
          <button class="btn btn-primary" @click="saveEntry" :disabled="!balancedForm || saving">{{ saving ? 'جارٍ...' : 'ترحيل القيد' }}</button>
          <button class="btn btn-secondary" @click="showForm = false">إلغاء</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { db, activeAccounts } from '../../db/database.js'
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
.journal-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.screen-toolbar { display: flex; gap: 6px; padding: 6px; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: 2px; margin-bottom: 6px; align-items: center; flex-wrap: wrap; flex-shrink: 0; }
.toolbar-spacer { flex: 1; }
.toolbar-info { font-size: 13px; color: var(--color-text-secondary); }
.table-scroll { flex: 1; overflow: auto; background: var(--color-bg-primary); min-height: 0; }
.empty-state { text-align: center; color: var(--color-text-secondary); padding: 18px; }
.status-chip.posted { background: #e6f4ea; color: #1b5e20; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: bold; }
.btn { padding: 6px 14px; border: none; border-radius: 3px; cursor: pointer; font-weight: bold; font-size: 13px; }
.btn-primary { background: var(--color-primary); color: #fff; }
.btn-secondary { background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border); }
.btn-secondary.small { padding: 3px 10px; font-size: 12px; margin-top: 4px; }
.form-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 12px; }
.form-modal { background: var(--color-bg-primary); border: 2px solid var(--color-primary); border-radius: 4px; width: 640px; max-width: 96vw; box-shadow: 4px 4px 16px rgba(0,0,0,0.3); max-height: 92vh; overflow: auto; }
.modal-title { display: flex; justify-content: space-between; align-items: center; background: var(--color-primary); color: #fff; font-weight: bold; padding: 6px 12px; }
.close-btn { background: transparent; border: none; color: #fff; cursor: pointer; }
.modal-body { padding: 12px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.field-row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.field-row label { width: 80px; font-size: 13px; flex-shrink: 0; color: var(--color-text-secondary); }
.input-field { padding: 6px 8px; border: 1px solid var(--color-border); border-radius: 3px; font-size: 13px; background: #fff; }
.input-field:focus { outline: none; border-color: var(--color-primary); }
.input-field.num { width: 110px; }
.entry-lines { border-top: 1px solid var(--color-border); padding-top: 8px; margin-top: 4px; }
.line-row { display: flex; gap: 6px; margin-bottom: 5px; align-items: center; }
.line-row select { flex: 1; }
.line-totals { font-size: 13px; margin-top: 6px; color: var(--color-text-secondary); }
.line-totals .ok { color: #1b5e20; font-weight: bold; }
.line-totals .bad { color: #b71c1c; font-weight: bold; }
.form-actions { display: flex; gap: 8px; justify-content: flex-end; align-items: center; padding: 8px 12px; background: var(--color-bg-secondary); border-top: 1px solid var(--color-border); }
.form-error { color: #b71c1c; font-size: 12px; flex: 1; }
.delete-btn { background: #fdeaea; color: #b71c1c; border: 1px solid #f0bcbc; border-radius: 3px; width: 24px; height: 26px; cursor: pointer; }
.delete-btn:disabled { opacity: 0.4; cursor: default; }
@media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } .line-row { flex-wrap: wrap; } .line-row select { min-width: 100%; } }
</style>
