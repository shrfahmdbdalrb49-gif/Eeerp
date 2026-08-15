<template>
  <!-- ========== شاشة المستخدمين والأدوار — نمط bolt.host ========== -->
  <div class="users-screen">
    <div class="page-screen">
      <div class="page-header">
        <div class="page-title">
          <h1>المستخدمون والصلاحيات</h1>
          <p class="page-subtitle">المستخدمون والصلاحيات تُخزن في قاعدة البيانات ويُفرض التحقق فعليًا على كل عملية</p>
        </div>
        <button class="btn btn-primary btn-lg" @click="openForm()">
          <span>مستخدم جديد</span><span class="btn-icon">+</span>
        </button>
      </div>

      <div class="table-card">
        <table class="bolt-table">
          <thead>
            <tr>
              <th style="width:45px">#</th>
              <th>اسم المستخدم</th>
              <th>الاسم الكامل</th>
              <th style="width:120px">الدور</th>
              <th style="width:90px">الحالة</th>
              <th style="width:95px">إجراء</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(u, i) in users" :key="u.id">
              <td>{{ i + 1 }}</td>
              <td style="display:flex; align-items:center; gap:10px">
                <span class="avatar">{{ u.username.slice(0, 1).toUpperCase() }}</span>
                <strong>{{ u.username }}</strong>
              </td>
              <td>{{ u.fullName || '—' }}</td>
              <td>
                <span class="role-pill" :class="u.roleKey === 'admin' ? 'admin' : 'cashier'">
                  {{ u.roleName || '—' }}
                </span>
              </td>
              <td><span class="status-pill" :class="u.active ? 'ok' : 'off'">{{ u.active ? 'نشط' : 'معطَّل' }}</span></td>
              <td>
                <div class="action-cells">
                  <button class="act" @click="openForm(u)" :disabled="u.id === 1" title="تعديل">✎</button>
                  <button class="act danger" @click="toggleActive(u)" title="تفعيل/تعطيل">
                    {{ u.active ? '⊘' : '✓' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- نموذج مستخدم -->
    <div v-if="showForm" class="form-modal-overlay" @click.self="showForm = false">
      <div class="form-card-wide">
        <div class="form-card-title">
          <span>{{ editing ? 'تعديل مستخدم' : 'مستخدم جديد' }}</span>
          <button class="close-btn" @click="showForm = false">✕</button>
        </div>
        <div class="field-list">
          <div class="field-row-wide">
            <label>اسم المستخدم *</label>
            <input type="text" class="fi" v-model="form.userName" :readonly="!!editing" />
          </div>
          <div class="field-row-wide">
            <label>الاسم الكامل</label>
            <input type="text" class="fi" v-model="form.fullName" />
          </div>
          <div class="field-row-wide">
            <label>كلمة المرور {{ editing ? '(اتركها فارغة للإبقاء)' : '*' }}</label>
            <input type="password" class="fi" v-model="form.password" autocomplete="new-password" />
            <span v-if="editing && !form.password" class="pw-note">اتركها فارغة للإبقاء على كلمة المرور الحالية</span>
          </div>
          <div class="field-row-wide">
            <label>الدور</label>
            <div class="role-toggles">
              <button type="button" v-for="r in ROLES" :key="r.value" class="role-toggle"
                      :class="{ on: form.role === r.value, admin: r.value === 'admin' }"
                      @click="form.role = r.value">
                {{ r.name }}
              </button>
            </div>
          </div>
        </div>
        <div v-if="formError" class="form-msg form-msg-error">{{ formError }}</div>
        <div class="form-actions-row">
          <button class="btn btn-outline" @click="showForm = false">إلغاء</button>
          <button class="btn btn-primary" @click="saveUser" :disabled="saving">
            <span v-if="saving" class="spin">⏳</span>
            <span>{{ saving ? 'جارٍ الحفظ...' : 'حفظ' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { db, hashPassword, audit, getStorageMode } from '../../db/database.js'
import { requirePermission, currentSession } from '../../db/session.js'
import { apiFetch } from '../../db/api.js'

function isServer() { return getStorageMode() === 'server' }

const ROLES = [{ id: 1, name: 'مدير النظام', value: 'admin' }, { id: 2, name: 'محاسب/كاشير', value: 'cashier' }]
const randSalt = () => 'salt-' + Math.random().toString(36).slice(2) + Date.now().toString(36)

const users = ref([])
const showForm = ref(false)
const editing = ref(null)
const saving = ref(false)
const formError = ref('')
const form = ref({ userName: '', fullName: '', password: '', role: 'cashier' })

async function loadData() {
  if (isServer()) {
    try {
      const raw = await apiFetch('/users')
      users.value = (Array.isArray(raw) ? raw : []).map(u => ({
        ...u, id: u.id, username: u.username, fullName: u.full_name || u.fullName,
        role: u.role, active: u.active !== false,
        roleName: ROLES.find(r => r.value === u.role)?.name || '—', roleKey: u.role,
      }))
      return
    } catch (e) { formError.value = 'فشل تحميل المستخدمين: ' + (e.message || e); return }
  }
  users.value = await db.users.toArray()
  for (const u of users.value) {
    const r = ROLES.find(r => r.value === u.role)
    u.roleName = r ? r.name : '—'
    u.roleKey = u.role
  }
}

function openForm(u) {
  editing.value = u ? u.id : null
  formError.value = ''
  form.value = u
    ? { userName: u.username, fullName: u.fullName || '', password: '', role: u.role || 'cashier' }
    : { userName: '', fullName: '', password: '', role: 'cashier' }
  showForm.value = true
}

async function saveUser() {
  saving.value = true
  formError.value = ''
  try {
    await requirePermission('users.write', 'إضافة/تعديل مستخدم')
    if (isServer()) {
      const f = { ...form.value }
      if (!f.userName.trim()) throw new Error('أدخل اسم المستخدم')
      const body = { username: f.userName.trim().toLowerCase(), fullName: f.fullName || f.userName.trim(), role: f.role }
      if (!editing.value) {
        if (!f.password) throw new Error('أدخل كلمة مرور')
        body.password = f.password
        await apiFetch('/users', { method: 'POST', body: JSON.stringify(body) })
      } else {
        if (f.password) body.password = f.password
        await apiFetch('/users/' + editing.value, { method: 'PUT', body: JSON.stringify(body) })
      }
      showForm.value = false
      await loadData()
      return
    }
    const f = { ...form.value }
    if (!f.userName.trim()) throw new Error('أدخل اسم المستخدم')
    if (!editing.value && (!f.password || f.password.trim().length < 4)) throw new Error('أدخل كلمة مرور لا تقل عن 4 أحرف')
    if (editing.value) {
      const upd = { fullName: f.fullName, role: f.role }
      if (f.password) {
        if (f.password.trim().length < 4) throw new Error('كلمة المرور الجديدة لا تقل عن 4 أحرف')
        upd.salt = randSalt()
        upd.passwordHash = hashPassword(f.password.trim(), upd.salt)
        await audit('user_password_changed', 'user', editing.value, `تغيير كلمة مرور المستخدم ${f.userName}`)
      }
      await db.users.update(editing.value, upd)
      await audit('user_updated', 'user', editing.value, `تعديل المستخدم ${f.userName}`)
    } else {
      if (!f.password) throw new Error('أدخل كلمة مرور')
      const existing = await db.users.where('username').equalsIgnoreCase(f.userName).count()
      if (existing > 0) throw new Error('اسم المستخدم موجود مسبقًا')
      const salt = randSalt()
      await db.users.add({
        username: f.userName, fullName: f.fullName || f.userName,
        passwordHash: hashPassword(f.password, salt), salt,
        role: f.role, active: true, createdAt: Date.now(),
      })
      await audit('user_created', 'user', null, `إنشاء المستخدم ${f.userName} بدور ${f.role}`)
    }
    showForm.value = false
    await loadData()
  } catch (e) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

async function toggleActive(u) {
  if (u.id === 1) return
  if (isServer()) {
    await apiFetch('/users/' + u.id, { method: 'PUT', body: JSON.stringify({ active: !u.active }) })
    await loadData()
    return
  }
  await db.users.update(u.id, { active: !u.active })
  await audit('user_toggled', 'user', u.id, `${u.username} ${u.active ? 'تعطيل' : 'تفعيل'}`)
  await loadData()
}

onMounted(loadData)
</script>

<style scoped>
/* ============================================
   المستخدمون — نمط bolt.host
   ============================================ */
.users-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.page-screen { padding: 24px; display: flex; flex-direction: column; gap: 16px; overflow: auto; flex: 1; }
.page-header { display: flex; align-items: center; justify-content: space-between; }
.page-title h1 { font-size: 26px; font-weight: 800; color: #0f172a; line-height: 1.2; }
.page-subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }

.avatar { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 999px; background: #eff6ff; color: #2563eb; font-weight: 800; font-size: 13px; flex-shrink: 0; }
.role-pill { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
.role-pill.admin { background: #faf5ff; color: #7e22ce; }
.role-pill.cashier { background: #eff6ff; color: #1d4ed8; }
.status-pill { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
.status-pill.ok { background: #f0fdf4; color: #15803d; }
.status-pill.off { background: #f1f5f9; color: #94a3b8; }

.table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05); overflow: auto; flex: 1; min-height: 0; }
.bolt-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.bolt-table thead th { background: #f8fafc; color: #64748b; font-weight: 600; font-size: 12px; padding: 10px 12px; text-align: right; border-bottom: 1px solid #e2e8f0; white-space: nowrap; position: sticky; top: 0; }
.bolt-table tbody td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
.bolt-table tbody tr:hover td { background: #f8fafc; }

.action-cells { display: flex; gap: 4px; }
.act { height: 28px; width: 30px; border: 1px solid #e2e8f0; background: #fff; border-radius: 6px; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; justify-content: center; }
.act:hover { background: #eff6ff; border-color: #2563eb; }
.act.danger { color: #dc2626; }
.act:disabled { opacity: 0.35; cursor: not-allowed; }

/* ---------- النموذج ---------- */
.form-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
.form-card-wide { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 20px 40px rgba(0,0,0,0.25); width: 520px; max-width: 96vw; max-height: 92vh; overflow: auto; padding: 20px; }
.form-card-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; font-size: 16px; font-weight: 800; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
.close-btn { background: transparent; border: none; font-size: 14px; color: #64748b; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
.close-btn:hover { background: #f1f5f9; color: #0f172a; }
.field-list { display: flex; flex-direction: column; gap: 12px; }
.field-row-wide { display: flex; align-items: center; gap: 10px; }
.field-row-wide label { width: 150px; font-size: 12px; font-weight: 600; color: #64748b; flex-shrink: 0; }
.fi { flex: 1; height: 38px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 12px; font-size: 13px; font-family: inherit; color: #0f172a; background: #fff; outline: none; }
.fi:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15); }
.fi[readonly] { background: #f8fafc; color: #94a3b8; }
.pw-note { font-size: 11px; color: #94a3b8; }

.role-toggles { display: flex; gap: 8px; flex: 1; }
.role-toggle { flex: 1; height: 38px; border: 1px solid #e2e8f0; background: #fff; color: #475569; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.15s; }
.role-toggle.on { background: #2563eb; color: #fff; border-color: #2563eb; }
.role-toggle.admin.on { background: #7e22ce; border-color: #7e22ce; }
.role-toggle:hover:not(.on) { background: #f1f5f9; }

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
  .bolt-table { min-width: 680px; }
}
</style>
