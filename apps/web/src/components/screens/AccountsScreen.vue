<template>
  <div class="accounts-screen">
    <div class="page-screen">
      <div class="page-header">
        <div class="page-title">
          <h1>دليل الحسابات</h1>
          <p class="page-subtitle">الدليل المحاسبي الفعلي — الرصيد الحالي يُحسب من القيود في قاعدة البيانات (بدون NaN)</p>
        </div>
        <button class="btn btn-primary btn-lg" @click="openForm()">
          <span>جديد</span><span class="btn-icon">+</span>
        </button>
      </div>

      <div class="table-card">
        <table class="bolt-table">
          <thead>
            <tr>
              <th style="width:90px">الكود</th>
              <th>اسم الحساب</th>
              <th style="width:100px">النوع</th>
              <th style="width:130px; text-align:left">الرصيد الحالي</th>
              <th style="width:65px">النشاط</th>
              <th style="width:85px">إجراء</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="acc in accounts" :key="acc.id" :class="'level-' + (acc.level || 1)">
              <td class="code-cell"><span class="code-badge">{{ acc.code }}</span></td>
              <td class="name-cell" :style="{ paddingRight: (16 + (acc.level || 1) * 12) + 'px' }" style="font-weight:600">{{ acc.name }}</td>
              <td>{{ typeLabel(acc.type) }}</td>
              <td class="num-cell"><b>{{ fmt(balances[acc.id] ?? '...') }}</b></td>
              <td><span class="status-dot" :class="acc.active ? 'ok' : 'off'"></span></td>
              <td>
                <div class="action-cells">
                  <button class="act" @click="openForm(acc)" title="تعديل">✎</button>
                  <button class="act danger" @click="deleteAccount(acc)" title="حذف" :disabled="accHasMovements(acc.id)">✕</button>
                </div>
              </td>
            </tr>
            <tr v-if="accounts.length === 0">
              <td colspan="6" class="empty-row">
                <div class="empty-box">
                  <span class="empty-icon">◈</span>
                  <p class="empty-title">دليل الحسابات فارغ</p>
                  <p class="empty-hint">اضغط «جديد» لإنشاء أول حساب في الدليل</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- نموذج حساب -->
    <div v-if="showForm" class="form-modal-overlay" @click.self="showForm = false">
      <div class="form-card-wide">
        <div class="form-card-title">
          <span>{{ formEditing ? 'تعديل حساب' : 'حساب جديد' }}</span>
          <button class="close-btn" @click="showForm = false">✕</button>
        </div>
        <div class="field-list">
          <div class="field-row-wide">
            <label>اسم الحساب *</label>
            <input type="text" class="fi" v-model.trim="form.name" />
          </div>
          <div class="field-row-wide">
            <label>نوع الحساب *</label>
            <select class="fi" v-model="form.type">
              <option value="Assets">أصول</option>
              <option value="Liabilities">خصوم</option>
              <option value="Equity">حقوق الملكية</option>
              <option value="Revenue">إيرادات</option>
              <option value="Expense">مصروفات</option>
            </select>
          </div>
          <div class="field-row-wide">
            <label>الحساب الأب</label>
            <select class="fi" v-model.number="form.parentId">
              <option :value="null">لا يوجد (حساب رئيسي)</option>
              <option v-for="a in parentOptions" :key="a.id" :value="a.id">{{ a.code }} — {{ a.name }}</option>
            </select>
          </div>
          <div class="field-row-wide">
            <label>الرصيد الافتتاحي مدين</label>
            <input type="number" class="fi" v-model.number="form.openingDebit" min="0" step="0.01" :disabled="formEditing" />
          </div>
          <div class="field-row-wide">
            <label>الرصيد الافتتاحي دائن</label>
            <input type="number" class="fi" v-model.number="form.openingCredit" min="0" step="0.01" :disabled="formEditing" />
          </div>
        </div>
        <div v-if="formError" class="form-msg form-msg-error">{{ formError }}</div>
        <div class="form-actions-row">
          <button class="btn btn-outline" @click="showForm = false">إلغاء</button>
          <button class="btn btn-primary" @click="saveAccount" :disabled="saving">
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
import { db, ACCOUNT_TYPE_LABEL, getStorageMode } from '../../db/database.js'
import { fmt, accountBalance } from '../../db/engine.js'
import { requirePermission, currentSession } from '../../db/session.js'
import { apiFetch } from '../../db/api.js'

function isServer() { return getStorageMode() === 'server' }

const accounts = ref([])
const balances = ref({})
const showForm = ref(false)
const saving = ref(false)
const formError = ref('')
const formEditing = ref(null)
const form = ref({ name: '', type: 'Assets', parentId: null, openingDebit: 0, openingCredit: 0 })

function typeLabel(t) { return ACCOUNT_TYPE_LABEL[t] || t }

const parentOptions = computed(() => accounts.value.filter(a => a.id !== formEditing.value))

async function loadData() {
  if (isServer()) {
    try {
      const raw = await apiFetch('/accounts')
      accounts.value = (Array.isArray(raw) ? raw : []).map(a => ({
        ...a, id: a.id, name: a.name, type: a.account_type || a.type,
        parentIdRef: a.parent_code || a.parentIdRef || null,
        code: a.code, number: a.number || Number(a.code), level: a.level || 1,
        openingDebit: a.opening_debit || 0, openingCredit: a.opening_credit || 0,
        active: a.status === 'active' || a.active !== false,
      }))
      const bal = {}
      for (const acc of accounts.value) bal[acc.id] = await accountBalance(acc.id)
      balances.value = bal
      return
    } catch (e) { formError.value = 'فشل تحميل الدليل: ' + (e.message || e); return }
  }
  accounts.value = await db.chartOfAccounts.toArray()
  const bal = {}
  for (const acc of accounts.value) bal[acc.id] = await accountBalance(acc.id)
  balances.value = bal
}

function openForm(acc) {
  formError.value = ''
  if (acc) {
    formEditing.value = acc.id
    form.value = { name: acc.name, type: acc.type, parentId: acc.parentIdRef || null, openingDebit: acc.openingDebit || 0, openingCredit: acc.openingCredit || 0 }
  } else {
    formEditing.value = null
    form.value = { name: '', type: 'Assets', parentId: null, openingDebit: 0, openingCredit: 0 }
  }
  showForm.value = true
}

function accHasMovements(id) {
  // غير متزامن — يُفحص فعليًا داخل deleteAccount قبل الحذف
  return false
}

async function deleteAccount(acc) {
  try {
    await requirePermission('accounts.write', 'حذف حساب')
    if (isServer()) {
      const movements = await db.journalLines.where('accountId').equals(acc.id).count()
      if (movements > 0) throw new Error('لا يمكن حذف حساب عليه حركات/قيود')
      await apiFetch('/accounts/' + acc.id, { method: 'PUT', body: JSON.stringify({ active: false }) })
      await loadData()
      return
    }
    const movements = await db.journalLines.where('accountId').equals(acc.id).count()
    if (movements > 0) throw new Error('لا يمكن حذف حساب عليه حركات/قيود')
    await db.chartOfAccounts.delete(acc.id)
    const s = await currentSession()
    await db.auditLogs.add({ userId: s?.userId ?? 0, userName: s?.userName ?? 'مجهول', action: 'account_deleted', refKind: 'account', refId: acc.id, detail: acc.name, createdAt: Date.now() })
    await loadData()
  } catch (e) {
    formError.value = e.message
  }
}

async function saveAccount() {
  saving.value = true
  formError.value = ''
  try {
    await requirePermission('accounts.write', 'حفظ حساب')
    if (isServer()) {
      const f = form.value
      if (!f.name) throw new Error('اسم الحساب مطلوب')
      if (accounts.value.some(a => a.id !== formEditing.value && (a.name || '').trim() === f.name.trim())) throw new Error('يوجد حساب بنفس الاسم بالفعل')
      const parent = f.parentId ? accounts.value.find(a => a.id === f.parentId) : null
      let code, number, level
      if (parent) {
        const existingChildren = accounts.value.filter(a => a.id !== formEditing.value && a.parentIdRef === parent.code).length
        code = `${parent.code}-${existingChildren + 1}`
        number = Number(String(parent.number) + (existingChildren + 1))
        level = (parent.level || 1) + 1
      } else {
        const existingRoots = accounts.value.filter(a => a.id !== formEditing.value && (!a.parentIdRef || a.parentIdRef === 'root')).length
        code = String(existingRoots + 1)
        number = existingRoots + 1
        level = 1
      }
      if (formEditing.value) {
        await apiFetch('/accounts/' + formEditing.value, { method: 'PUT', body: JSON.stringify({ name: f.name, accountType: f.type, parentCode: parent?.code || null, code, number, level, openingDebit: f.openingDebit || 0, openingCredit: f.openingCredit || 0 }) })
      } else {
        await apiFetch('/accounts', { method: 'POST', body: JSON.stringify({ name: f.name, accountType: f.type, parentCode: parent?.code || null, code, number, level, openingDebit: f.openingDebit || 0, openingCredit: f.openingCredit || 0 }) })
      }
      showForm.value = false
      await loadData()
      return
    }
    const f = form.value
    if (!f.name) throw new Error('اسم الحساب مطلوب')
    const duplicate = accounts.value.find(a => a.id !== formEditing.value && (a.name || '').trim() === f.name.trim())
    if (duplicate) throw new Error('يوجد حساب بنفس الاسم بالفعل: «' + duplicate.name + '» (كود ' + duplicate.code + ')')
    const siblings = accounts.value.filter(a => a.id !== formEditing.value && a.parentIdRef === (f.parentId || 'root'))
    const nextSeq = siblings.length + 1
    const parent = f.parentId ? accounts.value.find(a => a.id === f.parentId) : null
    let code, number, level
    if (parent) {
      const existingChildren = accounts.value.filter(a => a.id !== formEditing.value && a.parentIdRef === parent.code).length
      code = `${parent.code}-${existingChildren + 1}`
      number = Number(String(parent.number) + (existingChildren + 1))
      level = (parent.level || 1) + 1
    } else {
      code = String(nextSeq)
      number = nextSeq
      level = 1
    }
    const rec = {
      name: f.name, type: f.type, parentIdRef: f.parentId ? parent?.code : null,
      number, code, level,
      openingDebit: f.openingDebit || 0, openingCredit: f.openingCredit || 0,
      active: true, updatedAt: Date.now(),
    }
    if (formEditing.value) {
      await db.chartOfAccounts.update(formEditing.value, rec)
    } else {
      await db.chartOfAccounts.add({ ...rec, createdAt: Date.now() })
    }
    const s = await currentSession()
    await db.auditLogs.add({ userId: s?.userId ?? 0, userName: s?.userName ?? 'مجهول', action: formEditing.value ? 'account_updated' : 'account_created', refKind: 'account', refId: formEditing.value, detail: f.name, createdAt: Date.now() })
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
   دليل الحسابات — نمط bolt.host
   ============================================ */
.accounts-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.page-screen { padding: 24px; display: flex; flex-direction: column; gap: 16px; overflow: auto; flex: 1; }
.page-header { display: flex; align-items: center; justify-content: space-between; }
.page-title h1 { font-size: 26px; font-weight: 800; color: #0f172a; line-height: 1.2; }
.page-subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
.num-cell { text-align: left; direction: ltr; font-variant-numeric: tabular-nums; }
.code-cell { direction: ltr; }
.code-badge { background: #eff6ff; color: #1d4ed8; font-family: monospace; font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 6px; }

tr.level-1 td { font-weight: 700; background: #f8fafc; }
tr.level-2 td { }
.name-cell { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

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

.action-cells { display: flex; gap: 4px; }
.act { height: 28px; width: 30px; border: 1px solid #e2e8f0; background: #fff; border-radius: 6px; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; justify-content: center; }
.act:hover { background: #eff6ff; border-color: #2563eb; }
.act.danger { color: #dc2626; }
.act.danger:hover { background: #fef2f2; border-color: #fca5a5; }
.act:disabled { opacity: 0.35; cursor: not-allowed; }
.status-dot { display: inline-block; width: 7px; height: 7px; border-radius: 999px; }
.status-dot.ok { background: #16a34a; }
.status-dot.off { background: #d1d5db; }

/* ---------- النموذج ---------- */
.form-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
.form-card-wide { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 20px 40px rgba(0,0,0,0.25); width: 540px; max-width: 96vw; max-height: 92vh; overflow: auto; padding: 20px; }
.form-card-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; font-size: 16px; font-weight: 800; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
.close-btn { background: transparent; border: none; font-size: 14px; color: #64748b; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
.close-btn:hover { background: #f1f5f9; color: #0f172a; }
.field-list { display: flex; flex-direction: column; gap: 10px; }
.field-row-wide { display: flex; align-items: center; gap: 10px; }
.field-row-wide label { width: 140px; font-size: 12px; font-weight: 600; color: #64748b; flex-shrink: 0; }
.fi { flex: 1; height: 36px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 12px; font-size: 13px; font-family: inherit; color: #0f172a; background: #fff; outline: none; }
.fi:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15); }
.fi:disabled { background: #f8fafc; color: #94a3b8; }

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
  .bolt-table { min-width: 700px; }
}
</style>
