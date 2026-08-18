/* ============================================
   شرف ERP - المصادقة والصلاحيات (RBAC)
   الصلاحيات تُفرض في منطق البيانات وليس الواجهة فقط.
   ============================================ */
import { db, audit, hashPassword } from './database.js'
import { serverLogin, serverLogout, serverSession, getToken } from './api.js'
import { getStorageMode, setStorageMode } from './storage.js'

const SESSION_KEY = 'sharaf-erp-session'

function isServer() { return getStorageMode() === 'server' }
const ALL_PERMISSIONS = [
  'pos', 'pos.sale', 'pos.return',
  'customers', 'customers.read', 'customers.write',
  'suppliers', 'items', 'items.read', 'items.write',
  'purchases', 'sales', 'sales.read', 'sales.write',
  'collections', 'supplier-payments', 'receipts', 'payments', 'treasury',
  'accounts', 'accounts.read', 'accounts.write',
  'journal', 'journal.read', 'journal.write', 'journal.post',
  'reports', 'reports.sales', 'reports.inventory', 'reports.financial',
  'inventory', 'inventory.read', 'inventory.write',
  'doctors', 'prescriptions', 'expiry', 'transfers',
  'users', 'roles', 'audit', 'settings', 'system',
]

/* تسجيل الدخول — يتحقق فعليًا من hash كلمة المرور */
export async function login(username, password) {
  /* في وضع الخادم المركزي: التحقق عبر JWT من الخادم */
  if (isServer()) {
    try {
      const r = await serverLogin(username, password)
      return { ok: true, user: r.user }
    } catch (e) {
      const netErr = !e.status && /fetch|network|mixed content/i.test(e.message || '')
      /* النظام سحابي بالكامل الآن — لا نتحول تلقائيًا إلى الوضع المحلي،
         لأن ذلك كان يعلق الأجهزة في قاعدة IndexedDB قديمة تعرض
         «مستخدم غير موجود أو معطل». عند فشل الاتصال نعرض رسالة واضحة.
         كملاذ أخير: إذا كان الجهاز قد عُلق سابقًا في وضع local،
         نمسح قاعدة IndexedDB القديمة ونعيد المحاولة مرة واحدة. */
      if (netErr && getStorageMode() === 'local') {
        console.warn('[SharafERP] الخادم غير متاح — مسح قاعدة IndexedDB القديمة')
        try { await db.delete() } catch {}
        try { localStorage.removeItem('sharaf-storage-mode') } catch {}
        const { initSystem } = await import('./database.js')
        await initSystem()
        const r = await serverLogin(username, password)
        return { ok: true, user: r.user }
      }
      return { ok: false, error: netErr ? 'تعذّر الاتصال بالخادم - تحقّق من الإنترنت وحاول مرة أخرى' : (e.message || 'خطأ في المصادقة') }
    }
  }

  /* ===== حماية ضد التعثر في الوضع المحلي القديم =====
     الرسالة «مستخدم غير موجود أو معطَّل» تظهر فقط في وضع IndexedDB المحلي.
     النظام سحابي بالكامل؛ إذا حاول المستخدم الدخول وهو في وضع محلي قديم
     ولم توجد قاعدة محلية بها حسابه، نعيد التوجيه تلقائيًا إلى الخادم
     المركزي ونحاول مرة واحدة بدلًا من إرباكه بالرسالة القديمة. */
  const savedApiBase = typeof localStorage !== 'undefined' ? localStorage.getItem('sharaf-api-base') : null
  const savedMode = typeof localStorage !== 'undefined' ? localStorage.getItem('sharaf-storage-mode') : null
  const looksLegacy = savedMode === 'local' || Boolean(savedApiBase)
  const netBase = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) || ''
  const hasCloudBase = /https?:\/\/[^\s]*\.(railway\.app|netlify\.app)/i.test(netBase)
  if (looksLegacy && hasCloudBase) {
    console.warn('[SharafERP] الجهاز معلق في الوضع المحلي القديم — إعادة التوجيه للخادم السحابي')
    try { localStorage.setItem('sharaf-storage-mode', 'server') } catch {}
    try { localStorage.setItem('sharaf-api-base', netBase.replace(/\/$/, '')) } catch {}
    try { await db.delete() } catch {}
    const { setStorageMode } = await import('./storage.js')
    setStorageMode('server')
    try {
      const r = await serverLogin(username, password)
      return { ok: true, user: r.user }
    } catch (e) {
      return { ok: false, error: (e.message || 'خطأ في المصادقة') + ' (الخادم السحابي)' }
    }
  }
  const user = await db.users
    .where('username')
    .equals((username || '').trim().toLowerCase())
    .first()
  if (!user || !user.active) {
    await audit('login_failed', 'auth', null, { username: (username || '').trim() })
    return { ok: false, error: 'مستخدم غير موجود أو معطَّل' }
  }
  if (user.passwordHash !== hashPassword(password, user.salt)) {
    await audit('login_failed', 'auth', user.id, { username: user.username })
    return { ok: false, error: 'كلمة المرور غير صحيحة' }
  }
  await db.settings.put({ key: 'currentSession', userId: user.id, userName: user.fullName, role: user.role, loginAt: Date.now() }, 'currentSession')
  await audit('login_ok', 'auth', user.id, { username: user.username })
  return { ok: true, user: { id: user.id, username: user.username, fullName: user.fullName, role: user.role } }
}

/* حالة الجلسة الحالية */
export async function currentSession() {
  if (isServer()) return serverSession()
  const s = await db.settings.get('currentSession')
  if (!s) return null
  const user = await db.users.get(s.userId)
  if (!user || !user.active) return null
  return { userId: user.id, userName: user.fullName, role: user.role, username: user.username }
}

/* تسجيل الخروج */
export async function logout() {
  if (isServer()) {
    serverLogout()
    return
  }
  const s = await currentSession()
  if (s) await audit('logout', 'auth', s.userId)
  await db.settings.delete('currentSession')
}

/*
  تحقق صلاحيات فعلي على مستوى منطق البيانات:
  - admin: كل شيء ('*')
  - غير ذلك: يجب أن يكون للصلاحية سطر في rolePermissions
  يرمي خطأ عند عدم الامتياز — يستدعيه أي دالة حفظ/ترحيل
*/
export async function requirePermission(permission, actionName) {
  const session = await currentSession()
  if (!session) throw new Error('غير مسجَّل الدخول')
  /* في وضع الخادم المركزي: فرض الصلاحيات يتم على الخادم نفسه (RBAC حقيقي) */
  if (isServer()) return session
  if (session.role === 'admin') return session
  if (permission === '*' || permission === 'system') throw new Error(`الصلاحية "${permission}" للمدير فقط`)
  const row = await db.rolePermissions
    .where('[roleName+permission]')
    .equals([session.role, permission])
    .first()
  if (!row) {
    await audit('permission_denied', 'auth', session.userId, { permission, action: actionName })
    throw new Error(`لا تملك صلاحية: ${actionName || permission} (دورك: ${session.role})`)
  }
  return session
}

/* قائمة الصلاحيات الممكنة لدور */
export async function rolePermissions(roleName) {
  const rows = await db.rolePermissions.where('roleName').equals(roleName).toArray()
  if (roleName === 'admin') return ['*']
  return rows.map(r => r.permission)
}

export { ALL_PERMISSIONS }
export default { login, logout, currentSession, requirePermission, rolePermissions, ALL_PERMISSIONS }
