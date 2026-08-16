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

router.post('/auth/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {}
    if (!username || !password) return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' })
    const user = await queryOne(`SELECT id, username, full_name, password_hash, role, active FROM users WHERE username = $1`, [String(username).trim().toLowerCase()])
    if (!user) return res.status(401).json({ error: 'خطأ في اسم المستخدم أو كلمة المرور' })
    if (!user.active) return res.status(403).json({ error: 'الحساب معطّل - تواصل مع مدير النظام' })
    const ok = await bcrypt.compare(String(password), user.password_hash)
    if (!ok) return res.status(401).json({ error: 'خطأ في اسم المستخدم أو كلمة المرور' })
    const token = signToken(user)
    await auditLog(req, 'login', 'user', user.id)
    res.json({
      token,
      user: { id: user.id, username: user.username, fullName: user.full_name, role: user.role },
    })
  } catch (err) { next(err) }
})

export default router
