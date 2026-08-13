<template>
  <div class="accounts-screen">
    <div class="screen-toolbar">
      <button class="btn btn-primary" @click="openForm()">+ حساب جديد</button>
      <span class="toolbar-spacer"></span>
      <span class="toolbar-info">الدليل المحاسبي الفعلي — الرصيد الحالي يُحسب من القيود في قاعدة البيانات (بدون NaN)</span>
    </div>
    <div class="table-container table-scroll">
      <table class="dense-table">
        <thead>
          <tr><th style="width:70px">الكود</th><th>اسم الحساب</th><th style="width:95px">النوع</th><th style="width:125px">الرصيد الحالي</th><th style="width:60px">النشاط</th><th style="width:70px">إجراء</th></tr>
        </thead>
        <tbody>
          <tr v-for="acc in accounts" :key="acc.id" :class="'level-' + (acc.level || 1)">
            <td class="code-cell">{{ acc.code }}</td>
            <td class="name-cell" :style="{ paddingRight: (16 + (acc.level || 1) * 12) + 'px' }">{{ acc.name }}</td>
            <td>{{ typeLabel(acc.type) }}</td>
            <td class="num"><b>{{ fmt(balances[acc.id] ?? '...') }}</b></td>
            <td>{{ acc.active ? '✓' : '✕' }}</td>
            <td>
              <button class="icon-btn" @click="openForm(acc)" title="تعديل">✎</button>
              <button class="icon-btn danger" @click="deleteAccount(acc)" title="حذف" :disabled="accHasMovements(acc.id)">🗑</button>
            </td>
          </tr>
          <tr v-if="accounts.length === 0">
            <td colspan="6" class="empty-state">دليل الحسابات فارغ — أنشئ حسابًا جديدًا</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showForm" class="form-modal-overlay" @click.self="showForm = false">
      <div class="form-modal">
        <div class="modal-title"><span>{{ formEditing ? 'تعديل حساب' : 'حساب جديد' }}</span><button class="close-btn" @click="showForm = false">✕</button></div>
        <div class="modal-body">
          <div class="field-row"><label>اسم الحساب *</label><input type="text" class="input-field" v-model.trim="form.name" /></div>
          <div class="field-row"><label>نوع الحساب *</label>
            <select class="input-field" v-model="form.type">
              <option value="Assets">أصول</option><option value="Liabilities">خصوم</option>
              <option value="Equity">حقوق الملكية</option><option value="Revenue">إيرادات</option>
              <option value="Expense">مصروفات</option>
            </select>
          </div>
          <div class="field-row"><label>الحساب الأب</label>
            <select class="input-field" v-model.number="form.parentId">
              <option :value="null">لا يوجد (حساب رئيسي)</option>
              <option v-for="a in parentOptions" :key="a.id" :value="a.id">{{ a.code }} — {{ a.name }}</option>
            </select>
          </div>
          <div class="field-row"><label>الرصيد الافتتاحي مدين</label><input type="number" class="input-field" v-model.number="form.openingDebit" min="0" step="0.01" :disabled="formEditing" /></div>
          <div class="field-row"><label>الرصيد الافتتاحي دائن</label><input type="number" class="input-field" v-model.number="form.openingCredit" min="0" step="0.01" :disabled="formEditing" /></div>
        </div>
        <div class="form-actions">
          <span v-if="formError" class="form-error">{{ formError }}</span>
          <button class="btn btn-primary" @click="saveAccount" :disabled="saving">{{ saving ? 'جارٍ...' : 'حفظ' }}</button>
          <button class="btn btn-secondary" @click="showForm = false">إلغاء</button>
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
  // غير متزامن — يُستدعى زر الحذف مباشرة بعد فحص بسيط
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
.accounts-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.screen-toolbar { display: flex; gap: 6px; padding: 6px; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: 2px; margin-bottom: 6px; align-items: center; flex-wrap: wrap; flex-shrink: 0; }
.toolbar-spacer { flex: 1; }
.toolbar-info { font-size: 12px; color: var(--color-text-secondary); }
.table-scroll { flex: 1; overflow: auto; background: var(--color-bg-primary); min-height: 0; }
tr.level-1 td { font-weight: bold; background: #f2f6fb; }
tr.level-2 td { padding-right: 18px; }
.code-cell { direction: ltr; text-align: right; font-family: monospace; }
.name-cell { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.num { text-align: left; direction: ltr; }
.empty-state { text-align: center; color: var(--color-text-secondary); padding: 18px; }
.icon-btn { background: none; border: 1px solid transparent; cursor: pointer; font-size: 13px; padding: 1px 5px; border-radius: 3px; }
.icon-btn:hover { background: #eef4fb; }
.icon-btn.danger { color: #b71c1c; }
.btn { padding: 6px 14px; border: none; border-radius: 3px; cursor: pointer; font-weight: bold; font-size: 13px; }
.btn-primary { background: var(--color-primary); color: #fff; }
.btn-secondary { background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border); }
.form-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 12px; }
.form-modal { background: var(--color-bg-primary); border: 2px solid var(--color-primary); border-radius: 4px; width: 480px; max-width: 94vw; box-shadow: 4px 4px 16px rgba(0,0,0,0.3); }
.modal-title { display: flex; justify-content: space-between; align-items: center; background: var(--color-primary); color: #fff; font-weight: bold; padding: 6px 12px; }
.close-btn { background: transparent; border: none; color: #fff; cursor: pointer; }
.modal-body { padding: 12px; }
.field-row { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.field-row label { width: 115px; font-size: 13px; flex-shrink: 0; color: var(--color-text-secondary); }
.input-field { padding: 6px 8px; border: 1px solid var(--color-border); border-radius: 3px; font-size: 13px; background: #fff; flex: 1; }
.form-actions { display: flex; gap: 8px; justify-content: flex-end; align-items: center; padding: 8px 12px; background: var(--color-bg-secondary); border-top: 1px solid var(--color-border); }
.form-error { color: #b71c1c; font-size: 12px; flex: 1; }
@media (max-width: 768px) { .field-row { flex-wrap: wrap; } .field-row label { width: 100%; } .screen-toolbar { flex-direction: column; align-items: stretch; } }
</style>
