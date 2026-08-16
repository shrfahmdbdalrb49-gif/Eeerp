/* ============================================
   إعادة التهيئة الآمنة — تكشف الخطأ الفعلي وتعيد إنشاء الجداول والمستخدمين
   POST /api/setup/retry?key=<secret>
   ============================================ */
import express from 'express'
import bcrypt from 'bcryptjs'
import { query, getPool } from '../config/db.js'
const SECRET = process.env.SETUP_SECRET || 'sharaf-erp-prod-2026-8f4a7b2c9d1e6a0b'
const router = express.Router()
router.post('/retry', async (req, res, next) => {
  try {
    const key = (req.body && req.body.key) || (req.query && req.query.key)
    if (key !== SECRET) return res.status(401).json({ error: 'مفتاح غير صالح' })
    const pool = getPool()
    const errors = []
    // 1) إعادة إنشاء الجداول بالكامل (IF NOT EXISTS)
    const { readFile } = await import('fs/promises')
    const { fileURLToPath } = await import('url')
    const { dirname, join } = await import('path')
    const dir = dirname(fileURLToPath(import.meta.url))
    try {
      const schema = await readFile(join(dir, '..', 'sql', 'schema.sql'), 'utf8')
      const stmts = schema.split(/;\s*\n/).map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'))
      let ok = 0, fail = 0
      for (const stmt of stmts) {
        try { await pool.query(stmt); ok++ }
        catch (e) { fail++; errors.push(`schema #${ok + fail}: ${e.message}`) }
      }
      await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto')
      const seed = await readFile(join(dir, '..', 'sql', 'seed.sql'), 'utf8')
      const seedStmts = seed.split(/;\s*\n/).map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'))
      for (const stmt of seedStmts) {
        try { await pool.query(stmt) }
        catch (e) { errors.push(`seed: ${e.message}`) }
      }
      // 2) ضمان حتمي لإنشاء admin
      const exists = await query(`SELECT 1 FROM users WHERE username = 'admin'`)
      if (exists.rowCount === 0) {
        const hash = await bcrypt.hash('Admin@1234', 10)
        await query(
          `INSERT INTO users (username, full_name, password_hash, role, active)
           VALUES ('admin', 'مدير النظام', $1, 'admin', true)
           ON CONFLICT (username) DO UPDATE SET password_hash = $1, full_name = EXCLUDED.full_name, role = EXCLUDED.role, active = true`,
          [hash]
        )
      } else {
        const hash = await bcrypt.hash('Admin@1234', 10)
        await query(`UPDATE users SET password_hash = $1, active = true WHERE username = 'admin'`, [hash])
      }
      const users = await query(`SELECT username, role, active FROM users`)
      const stats = await query(`SELECT COUNT(*) AS tables FROM pg_tables WHERE schemaname='public'`)
      res.json({ ok: true, schema_ok: ok, schema_fail: fail, errors, users: users.rows, tables: stats.rows[0].tables })
    } catch (ioErr) {
      res.status(500).json({ ok: false, error: 'فشل قراءة ملفات SQL: ' + ioErr.message })
    }
  } catch (err) {
    console.error('setup/retry failed:', err.message)
    res.status(500).json({ error: err.message })
  }
})
export default router
