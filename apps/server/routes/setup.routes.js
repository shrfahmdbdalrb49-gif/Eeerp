/* ============================================
   إعادة التهيئة الآمنة (تعمل مرة واحدة بعد كل فشل)
   POST /api/setup/retry?key=<SETUP_SECRET>
   ============================================ */
import express from 'express'
import bcrypt from 'bcryptjs'
import { query, getPool } from '../config/db.js'
import { autoSetup } from '../auto-setup.js'
const router = express.Router()
router.post('/retry', async (req, res, next) => {
  try {
    const key = (req.body && req.body.key) || (req.query && req.query.key)
    if (key !== process.env.SETUP_SECRET) {
      return res.status(401).json({ error: 'مفتاح غير صالح' })
    }
    const pool = getPool()
    await autoSetup(pool)
    // ضمان حتمي: إنشاء admin إن لم يكن موجودًا
    const exists = await query(`SELECT 1 FROM users WHERE username = 'admin'`)
    if (exists.rowCount === 0) {
      const hash = await bcrypt.hash('Admin@1234', 10)
      await query(
        `INSERT INTO users (username, full_name, password_hash, role, active)
         VALUES ('admin', 'مدير النظام', $1, 'admin', true)
         ON CONFLICT (username) DO UPDATE SET password_hash = $1, active = true`,
        [hash]
      )
      console.log('🔐 تم إنشاء/تحديث مستخدم admin بنجاح')
    }
    const users = await query(`SELECT username, role, active FROM users`)
    res.json({ ok: true, users: users.rows })
  } catch (err) {
    console.error('⚠️ setup/retry failed:', err.message)
    res.status(500).json({ error: err.message })
  }
})
export default router
