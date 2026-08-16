/* ============================================
   JWT + التحقق من الصلاحيات (RBAC)
   ============================================ */
import jwt from 'jsonwebtoken'
import { queryOne } from '../config/db.js'

const SECRET = process.env.JWT_SECRET || 'sharaf-erp-secret-change-me'
const EXPIRY = process.env.JWT_EXPIRY || '30d'

export function jwtSecret() { return SECRET }

export function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, fullName: user.full_name },
    SECRET,
    { expiresIn: EXPIRY },
  )
}

export async function requireAuth(req, res, next) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : null
  if (!token) return res.status(401).json({ error: 'يرجى تسجيل الدخول' })
  try {
    const payload = jwt.verify(token, SECRET)
    const user = await queryOne('SELECT id, username, full_name, role, active FROM users WHERE id = $1', [payload.id])
    if (!user || !user.active) return res.status(401).json({ error: 'حساب غير صالح أو معطّل' })
    req.user = user
    req.token = token
    next()
  } catch (err) {
    return res.status(401).json({ error: 'جلسة منتهية - يرجى تسجيل الدخول مجددًا' })
  }
}

/* تحقق من صلاحية واحدة (مثال: sales.create) أو wildcard (*) للدور */
export function requirePermission(...perms) {
  return async (req, res, next) => {
    const role = req.user.role
    /* المدير لديه كل الصلاحيات */
    if (role === 'admin') return next()
    const rows = await query(`SELECT permission FROM role_permissions WHERE role_name = $1`, [role])
    const set = new Set(rows.map(r => r.permission))
    if (set.has('*')) return next()
    const ok = perms.some(p => set.has(p))
    if (!ok) return res.status(403).json({ error: 'ليس لديك صلاحية لهذه العملية' })
    next()
  }
}

export default { requireAuth, requirePermission, signToken }
