<template>
  <div class="journal-screen">
    <div class="page-screen">
      <div class="page-header">
        <div class="page-title">
          <h1>الصندوق والبنوك (الخزائن)</h1>
          <p class="page-subtitle">أرصدة النقدية في الصناديق والحسابات البنكية — مرتبطة بحسابات دليل الحسابات (1-1-1 الصندوق / 1-1-2 البنك)</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-outline" @click="openBoxDialog('cash')">+ صندوق</button>
          <button class="btn btn-primary" @click="openBoxDialog('bank')">+ حساب بنكي</button>
        </div>
      </div>

      <div class="treasury-grid">
        <div class="treasury-card main-card" :class="sum.mainCash.balance < 0 ? 'negative' : ''">
          <div class="tc-head"><span class="tc-icon">💵</span><span class="tc-name">{{ sum.mainCash.name }} <small>({{ sum.mainCash.code }})</small></span></div>
          <div class="tc-balance">{{ fmt(sum.mainCash.balance) }}</div>
          <div class="tc-sub">الرصيد المحاسبي الحالي</div>
        </div>
        <div class="treasury-card main-card" :class="sum.mainBank.balance < 0 ? 'negative' : ''">
          <div class="tc-head"><span class="tc-icon">🏦</span><span class="tc-name">{{ sum.mainBank.name }} <small>({{ sum.mainBank.code }})</small></span></div>
          <div class="tc-balance">{{ fmt(sum.mainBank.balance) }}</div>
          <div class="tc-sub">الرصيد المحاسبي الحالي</div>
        </div>
      </div>

      <div class="two-cols">
        <div class="col-card">
          <div class="col-title"><span>الصناديق الفرعية</span></div>
          <table class="bolt-table">
            <thead><tr><th>الكود</th><th>الاسم</th><th style="width:100px; text-align:left">الرصيد</th><th style="width:44px"></th></tr></thead>
            <tbody>
              <tr v-for="b in sum.cashBoxes" :key="b.id">
                <td><b>{{ b.code }}</b></td>
                <td>{{ b.name }}</td>
                <td class="num-cell">{{ fmt(cashBalance(b.id)) }}</td>
                <td><button class="icon-del" @click="removeBox('cash', b)" title="حذف">✕</button></td>
              </tr>
              <tr v-if="sum.cashBoxes.length === 0">
                <td colspan="4" class="empty-row"><div class="empty-box"><p class="empty-hint">لا توجد صناديق فرعية بعد</p></div></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="col-card">
          <div class="col-title"><span>الحسابات البنكية</span></div>
          <table class="bolt-table">
            <thead><tr><th>الكود</th><th>اسم الحساب</th><th>البنك</th><th style="width:100px; text-align:left">الرصيد</th><th style="width:44px"></th></tr></thead>
            <tbody>
              <tr v-for="b in sum.banks" :key="b.id">
                <td><b>{{ b.code }}</b></td>
                <td>{{ b.name }}</td>
                <td>{{ b.bankName || '—' }}</td>
                <td class="num-cell">{{ fmt(bankBalance(b.id)) }}</td>
                <td><button class="icon-del" @click="removeBox('bank', b)" title="حذف">✕</button></td>
              </tr>
              <tr v-if="sum.banks.length === 0">
                <td colspan="5" class="empty-row"><div class="empty-box"><p class="empty-hint">لا توجد حسابات بنكية مسجلة بعد</p></div></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- حوار إضافة صندوق/حساب بنكي -->
    <div v-if="showDialog" class="form-modal-overlay" @click.self="showDialog = false">
      <div class="form-card-wide">
        <div class="form-card-title">
          <span>{{ dialogType === 'cash' ? 'إضافة صندوق جديد' : 'إضافة حساب بنكي' }}</span>
          <button class="close-btn" @click="showDialog = false">✕</button>
        </div>
        <div class="field-list">
          <div class="field-row-wide">
            <label>الاسم</label>
            <input class="fi" v-model="boxForm.name" :placeholder="dialogType === 'cash' ? 'مثل: صندوق الفرع الرئيسي' : 'مثل: حساب جاري - البنك الأهلي'" />
          </div>
          <div class="field-row-wide">
            <label>الكود (اختياري)</label>
            <input class="fi" v-model="boxForm.code" placeholder="يُولَّد تلقائيًا إذا أُترك فارغًا" />
          </div>
          <div v-if="dialogType === 'bank'" class="field-row-wide">
            <label>اسم البنك</label>
            <input class="fi" v-model="boxForm.bankName" placeholder="مثل: البنك الأهلي" />
          </div>
        </div>
        <div v-if="formError" class="form-msg form-msg-error">{{ formError }}</div>
        <div class="form-actions-row">
          <button class="btn btn-outline" @click="showDialog = false">إلغاء</button>
          <button class="btn btn-primary" @click="saveBox" :disabled="saving || !boxForm.name.trim()">
            <span v-if="saving" class="spin">⏳</span>
            <span>حفظ</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { db, addCashBox, addBankAccount } from '../../db/database.js'
import { fmt, treasurySummary, treasuryBalance } from '../../db/engine.js'
import { requirePermission } from '../../db/session.js'

const sum = ref({ mainCash: { name: 'الصندوق الرئيسي', code: '1-1-1', balance: 0 }, mainBank: { name: 'البنك (حساب جاري)', code: '1-1-2', balance: 0 }, cashBoxes: [], banks: [] })
const balances = ref({})
const showDialog = ref(false)
const dialogType = ref('cash')
const boxForm = ref({ name: '', code: '', bankName: '' })
const saving = ref(false)
const formError = ref('')

function cashBalance(id) { return balances.value['c' + id] ?? 0 }
function bankBalance(id) { return balances.value['b' + id] ?? 0 }

async function loadData() {
  sum.value = await treasurySummary()
  const bal = {}
  for (const b of sum.value.cashBoxes) bal['c' + b.id] = await treasuryBalance(b.id)
  for (const b of sum.value.banks) bal['b' + b.id] = await treasuryBalance(b.id)
  balances.value = bal
}

function openBoxDialog(type) {
  formError.value = ''
  dialogType.value = type
  boxForm.value = { name: '', code: '', bankName: '' }
  showDialog.value = true
}

async function saveBox() {
  saving.value = true
  formError.value = ''
  try {
    await requirePermission('treasury', dialogType.value === 'cash' ? 'إضافة صندوق' : 'إضافة حساب بنكي')
    if (dialogType.value === 'cash') {
      await addCashBox({ name: boxForm.value.name.trim(), code: boxForm.value.code.trim() })
    } else {
      await addBankAccount({ name: boxForm.value.name.trim(), code: boxForm.value.code.trim(), bankName: boxForm.value.bankName.trim() })
    }
    showDialog.value = false
    await loadData()
  } catch (e) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

async function removeBox(type, box) {
  try {
    await requirePermission('treasury', 'حذف صندوق/حساب بنكي')
    const bal = await treasuryBalance(box.id)
    if (Math.abs(bal) > 0.005) {
      formError.value = 'لا يمكن حذف ' + (type === 'cash' ? 'الصندوق' : 'الحساب البنكي') + ' «' + box.name + '» — رصيده غير صفر (' + fmt(bal) + '). صفّر الرصيد بتحويل محاسبي أولًا (قيد يدوي من/إلى حساب 1-1-1 أو 1-1-2).'
      return
    }
    await db[type === 'cash' ? 'cashBoxes' : 'bankAccounts'].update(box.id, { active: false })
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
.btn-outline { background: #fff; border: 1px solid var(--ox-border, #d1d5db); color: #374151; }
.treasury-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 12px 18px 0; }
.treasury-card { background: #fff; border: 1px solid var(--ox-border, #e5e7eb); border-radius: 10px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
.treasury-card.negative .tc-balance { color: #dc2626; }
.tc-head { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: #374151; }
.tc-head small { font-weight: 400; color: var(--ox-muted, #6b7280); }
.tc-icon { font-size: 20px; }
.tc-balance { font-size: 26px; font-weight: 800; color: #166534; margin-top: 6px; font-variant-numeric: tabular-nums; direction: ltr; text-align: right; }
.tc-sub { font-size: 11px; color: var(--ox-muted, #6b7280); margin-top: 2px; }
.two-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 12px 18px 14px; min-height: 0; flex: 1; }
.col-card { background: #fff; border: 1px solid var(--ox-border, #e5e7eb); border-radius: 10px; display: flex; flex-direction: column; min-height: 0; }
.col-title { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--ox-border, #e5e7eb); font-weight: 700; font-size: 13.5px; }
.bolt-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.bolt-table th { background: var(--ox-head, #f3f4f6); padding: 7px 10px; text-align: right; font-weight: 600; border-bottom: 2px solid var(--ox-border, #e5e7eb); }
.bolt-table td { padding: 6px 10px; border-bottom: 1px solid var(--ox-border, #f0f0f0); }
.num-cell { text-align: left; font-variant-numeric: tabular-nums; }
.icon-del { background: none; border: none; color: #dc2626; cursor: pointer; font-size: 13px; }
.empty-row td { padding: 24px !important; border-bottom: none; }
.empty-box { text-align: center; color: var(--ox-muted, #6b7280); }
.empty-hint { font-size: 12px; margin: 0; }
.form-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 9000; display: flex; align-items: center; justify-content: center; }
.form-card-wide { background: #fff; border-radius: 12px; width: min(520px, 94vw); max-height: 90vh; overflow: auto; box-shadow: 0 20px 60px rgba(0,0,0,.35); }
.form-card-title { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--ox-border, #e5e7eb); font-weight: 700; font-size: 14px; }
.close-btn { background: none; border: none; font-size: 18px; cursor: pointer; color: #6b7280; }
.field-list { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
.field-row-wide { display: flex; flex-direction: column; gap: 3px; }
.field-row-wide label { font-size: 11.5px; font-weight: 600; color: var(--ox-muted, #6b7280); }
.fi { padding: 7px 9px; border: 1px solid var(--ox-border, #d1d5db); border-radius: 6px; font-size: 13px; background: #fff; }
.form-actions-row { display: flex; gap: 8px; justify-content: flex-end; padding: 12px 16px; border-top: 1px solid var(--ox-border, #e5e7eb); }
.form-msg { margin: 0 16px 4px; padding: 7px 10px; border-radius: 6px; font-size: 12.5px; }
.form-msg-error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.spin { display: inline-block; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
