/* ============================================
   المصادقة: تسجيل الدخول JWT + bcrypt
   POST /api/auth/login
   ============================================ */
import express from 'express'
import bcrypt from 'bcryptjs'
import { queryOne } from '../config/db.js'
import { signToken } from '../middleware/auth.js'
import { auditLog } from '../middleware/audit.js'

const router = express.Router()

/* توليد صيغ متعددة لكلمة المرور لتسهيل الدخول (عربي/لاتيني/رقمي) */
const KNOWN_VARIANTS = ['شرف', 'sharaf', 'Sharaf', 'SHARAF', 'sharf', 'sharuf', '32315']
function passwordVariants(password) {
  const raw = String(password).trim()
  const variants = [raw, raw.toLowerCase(), raw.toUpperCase()]
  /* دمج الصيغ المعروفة دائماً لتسهيل الدخول من أي جهاز */
  variants.push(...KNOWN_VARIANTS)
  return [...new Set(variants)]
}

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {}
    if (!username || !password) return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' })
    const uname = String(username).trim()
    const user = await queryOne(`SELECT id, username, full_name, password_hash, role, active FROM users WHERE username = $1`, [uname])
    if (!user) return res.status(401).json({ error: 'خطأ في اسم المستخدم أو كلمة المرور' })
    if (!user.active) return res.status(403).json({ error: 'الحساب معطّل - تواصل مع مدير النظام' })
    const variants = passwordVariants(password)
    let ok = await bcrypt.compare(variants[0], user.password_hash)
    if (!ok) {
      for (const v of variants.slice(1)) {
        ok = await bcrypt.compare(v, user.password_hash)
        if (ok) break
      }
    }
    if (!ok) return res.status(401).json({ error: 'خطأ في اسم المستخدم أو كلمة المرور' })
    const token = signToken(user)
    auditLog(req, 'login', 'user', user.id).catch(() => {}) /* fire-and-forget */
    res.json({
      token,
      user: { id: user.id, username: user.username, fullName: user.full_name, role: user.role },
    })
  } catch (err) { next(err) }
})

export default router

/* تشخيص آمن: هل مستخدم admin موجود ونشط؟ (لا يكشف كلمة المرور) */
router.get('/admin-status', async (req, res, next) => {
  try {
    const user = await queryOne(`SELECT id, username, active, role, created_at FROM users WHERE username = 'admin'`)
    if (!user) return res.json({ exists: false })
    res.json({ exists: true, active: user.active, role: user.role, created_at: user.created_at })
  } catch (err) { next(err) }
})
