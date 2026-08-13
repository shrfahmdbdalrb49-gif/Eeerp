<template>
  <!-- ========== شاشة المستخدمين والأدوار ========== -->
  <div class="window-body flex-col users-screen">
    <div class="screen-toolbar">
      <button class="btn btn-primary" @click="openForm()">+ مستخدم جديد</button>
      <span class="toolbar-info">المستخدمون والصلاحيات تُخزن في قاعدة البيانات ويُفرض التحقق فعليًا على كل عملية</span>
    </div>
    <div class="table-container table-scroll">
      <table class="dense-table">
        <thead>
          <tr>
            <th style="width:30px">#</th>
            <th>اسم المستخدم</th>
            <th>الاسم الكامل</th>
            <th>الدور</th>
            <th style="width:110px">الحالة</th>
            <th style="width:95px">إجراء</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(u, i) in users" :key="u.id">
            <td>{{ i + 1 }}</td>
            <td><strong>{{ u.username }}</strong></td>
            <td>{{ u.fullName || '—' }}</td>
            <td>
              <span class="role-badge" :class="u.roleKey === 'admin' ? 'admin' : 'cashier'">
                {{ u.roleName || '—' }}
              </span>
            </td>
            <td><span class="status-chip" :class="u.active ? 'ok' : 'off'">{{ u.active ? 'نشط' : 'معطَّل' }}</span></td>
            <td>
              <button class="icon-btn" @click="openForm(u)" :disabled="u.id === 1">✎</button>
              <button class="icon-btn danger" @click="toggleActive(u)">
                {{ u.active ? '⊘' : '✓' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showForm" class="form-modal-overlay" @click.self="showForm = false">
      <div class="form-modal">
        <div class="modal-title"><span>{{ editing ? 'تعديل مستخدم' : 'مستخدم جديد' }}</span><button class="close-btn" @click="showForm = false">✕</button></div>
        <div class="modal-body">
          <div class="field-row"><label>اسم المستخدم *</label><input type="text" class="input-field" v-model="form.userName" :readonly="!!editing" /></div>
          <div class="field-row"><label>الاسم الكامل</label><input type="text" class="input-field" v-model="form.fullName" /></div>
          <div class="field-row"><label>كلمة المرور {{ editing ? '(اتركها فارغة للإبقاء)' : '*' }}</label><input type="password" class="input-field" v-model="form.password" /></div>
          <div class="field-row"><label>الدور</label>
            <select class="input-field" v-model="form.role">
              <option v-for="r in ROLES" :key="r.id" :value="r.value">{{ r.name }}</option>
            </select>
          </div>
        </div>
        <div class="form-actions">
          <span v-if="formError" class="form-error">{{ formError }}</span>
          <button class="btn btn-primary" @click="saveUser" :disabled="saving">{{ saving ? 'جارٍ...' : 'حفظ' }}</button>
          <button class="btn btn-secondary" @click="showForm = false">إلغاء</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { db, hashPassword, audit } from '../../db/database.js'
import { requirePermission, currentSession } from '../../db/session.js'

const ROLES = [{ id: 1, name: 'مدير النظام', value: 'admin' }, { id: 2, name: 'محاسب/كاشير', value: 'cashier' }]
const randSalt = () => 'salt-' + Math.random().toString(36).slice(2) + Date.now().toString(36)

const users = ref([])
const showForm = ref(false)
const editing = ref(null)
const saving = ref(false)
const formError = ref('')
const form = ref({ userName: '', fullName: '', password: '', role: 'cashier' })

async function loadData() {
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
    const f = { ...form.value }
    if (!f.userName.trim()) throw new Error('أدخل اسم المستخدم')
    if (editing.value) {
      const upd = { fullName: f.fullName, role: f.role }
      if (f.password) {
        upd.salt = randSalt()
        upd.passwordHash = hashPassword(f.password, upd.salt)
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
  await db.users.update(u.id, { active: !u.active })
  await audit('user_toggled', 'user', u.id, `${u.username} ${u.active ? 'تعطيل' : 'تفعيل'}`)
  await loadData()
}

onMounted(loadData)
</script>

<style scoped>
.users-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.screen-toolbar { display: flex; gap: 6px; padding: 6px; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: 2px; margin-bottom: 6px; align-items: center; flex-wrap: wrap; flex-shrink: 0; }
.toolbar-info { font-size: 12px; color: var(--color-text-secondary); margin-right: auto; }
.table-scroll { flex: 1; overflow: auto; background: var(--color-bg-primary); min-height: 0; }
.icon-btn { background: none; border: 1px solid transparent; cursor: pointer; font-size: 14px; padding: 1px 5px; border-radius: 3px; }
.icon-btn:hover { background: #eef4fb; }
.icon-btn.danger { color: #b71c1c; }
.icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.role-badge { padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: bold; }
.role-badge.admin { background: #f3e5f5; color: #6a1b9a; }
.role-badge.cashier { background: #e3f2fd; color: #1565c0; }
.status-chip { padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: bold; }
.status-chip.ok { background: #e6f4ea; color: #1b5e20; }
.status-chip.off { background: #f0f0f0; color: #777; }
.btn { padding: 6px 14px; border: none; border-radius: 3px; cursor: pointer; font-weight: bold; font-size: 13px; }
.btn-primary { background: var(--color-primary); color: #fff; }
.btn-secondary { background: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border); }
.input-field { padding: 6px 8px; border: 1px solid var(--color-border); border-radius: 3px; font-size: 13px; background: #fff; }
.input-field:focus { outline: none; border-color: var(--color-primary); }
.form-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 12px; }
.form-modal { background: var(--color-bg-primary); border: 2px solid var(--color-primary); border-radius: 4px; width: 460px; max-width: 94vw; box-shadow: 4px 4px 16px rgba(0,0,0,0.3); }
.modal-title { display: flex; justify-content: space-between; align-items: center; background: var(--color-primary); color: #fff; font-weight: bold; padding: 6px 12px; }
.close-btn { background: transparent; border: none; color: #fff; cursor: pointer; }
.modal-body { padding: 12px; }
.field-row { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.field-row label { width: 130px; font-size: 13px; flex-shrink: 0; color: var(--color-text-secondary); }
.form-actions { display: flex; gap: 8px; justify-content: flex-end; align-items: center; padding: 8px 12px; background: var(--color-bg-secondary); border-top: 1px solid var(--color-border); }
.form-error { color: #b71c1c; font-size: 12px; flex: 1; }
@media (max-width: 768px) { .field-row { flex-wrap: wrap; } .field-row label { width: 100%; } }
</style>
