/* ============================================
   شرف ERP - عميل API المركزي (الخادم البعدي PostgreSQL)
   مصادقة JWT + إرسال جميع الطلبات للخادم المركزي
   بدل IndexedDB المحلي — يدعم المزامنة بين عدة فروع.
   ============================================ */
const STORAGE_KEY = 'sharaf-erp-auth'

/* عنوان الخادم: النافذة > localStorage > متغير البيئة > الافتراضي */
export function apiBase() {
  if (typeof window !== 'undefined' && window.API_BASE) return String(window.API_BASE).replace(/\/$/, '')
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('sharaf-api-base')
    if (saved) return String(saved).replace(/\/$/, '')
  }
  return (import.meta.env.VITE_API_BASE || 'http://localhost:4000/api').replace(/\/$/, '')
}

function readAuth() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export function getToken() {
  return readAuth().token || null
}

export function getUser() {
  return readAuth().user || null
}

function saveAuth(auth) {
  if (auth) localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
  else localStorage.removeItem(STORAGE_KEY)
}

/* طلب HTTP موحد مع توكن JWT */
export async function apiFetch(path, options = {}) {
  const fallback = options.fallback
  const token = getToken()
  const headers = { 'Content-Type': 'application/json; charset=utf-8', ...(options.headers || {}) }
  if (token) headers.Authorization = 'Bearer ' + token
  const res = await fetch(apiBase() + path, { ...options, headers })
  const text = await res.text()
  let data = null
  let rawText = false
  try { data = text ? JSON.parse(text) : null } catch { data = null; rawText = true }
  if (!res.ok || rawText) {
    if (fallback !== undefined) return typeof fallback === 'function' ? fallback() : fallback
    const msg = (data && (data.error || data.message)) || 'خطأ في الاتصال بالخادم'
    const err = new Error(msg)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

/* تسجيل الدخول عبر الخادم (bcrypt + JWT) */
export async function serverLogin(username, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: (username || '').trim().toLowerCase(), password }),
  })
  saveAuth({ user: data.user, token: data.token })
  return { ok: true, user: data.user }
}

export function serverLogout() {
  saveAuth(null)
}

/* حالة الجلسة الحالية */
export function serverSession() {
  const user = getUser()
  if (!user) return null
  return { userId: user.id, userName: user.fullName, role: user.role, username: user.username }
}

export default { apiBase, getToken, getUser, apiFetch, serverLogin, serverLogout, serverSession }
