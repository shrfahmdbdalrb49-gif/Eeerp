/* ============================================
   إعادة التهيئة الآمنة — تكشف الخطأ الفعلي وتعيد إنشاء كل شيء
   POST /api/setup/retry?key=<secret>
   ============================================ */
import express from 'express'
import bcrypt from 'bcryptjs'
const SECRET = process.env.SETUP_SECRET || 'sharaf-erp-prod-2026-8f4a7b2c9d1e6a0b'
const router = express.Router()
router.post('/retry', async (req, res) => {
  let pool = null
  try {
    const key = (req.body && req.body.key) || (req.query && req.query.key)
    if (key !== SECRET) return res.status(401).json({ error: 'مفتاح غير صالح' })
    // استيراد مرن لعزل أي فشل
    const db = await import('../config/db.js')
    pool = db.getPool()
    const { readFile } = await import('fs/promises')
    const { fileURLToPath } = await import('url')
    const { dirname, join } = await import('path')
    const { splitSQL } = await import('../sql/split.js')
    const dir = dirname(fileURLToPath(import.meta.url))
    const errors = []
    // 1) تهيئة الجداول
    const schema = await readFile(join(dir, '..', 'sql', 'schema.sql'), 'utf8')
    const stmts = splitSQL(schema)
    let ok = 0
    for (const stmt of stmts) {
      try { await pool.query(stmt); ok++ }
      catch (e) { errors.push(`schema[${ok + errors.length}]: ${e.message}`) }
    }
    try { await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto') } catch (e) { errors.push(`pgcrypto: ${e.message}`) }
    // 2) البيانات الأولية
    const seed = await readFile(join(dir, '..', 'sql', 'seed.sql'), 'utf8')
    const seedStmts = splitSQL(seed)
    for (const stmt of seedStmts) {
      try { await pool.query(stmt) }
      catch (e) { errors.push(`seed: ${e.message}`) }
    }
    // 3) ضمان admin (bcrypt عبر JS لا SQL)
    const existing = await pool.query(`SELECT id FROM users WHERE username = $1`, ['admin'])
    const hash = await bcrypt.hash('Admin@1234', 10)
    if (existing.rowCount === 0) {
      await pool.query(
        `INSERT INTO users (username, full_name, password_hash, role, active) VALUES ($1, $2, $3, 'admin', true)`,
        ['admin', 'مدير النظام', hash]
      )
    } else {
      await pool.query(`UPDATE users SET password_hash = $1, active = true WHERE username = 'admin'`, [hash])
    }
    const users = await pool.query(`SELECT username, role, active FROM users`)
    res.json({ ok: true, schema_stmts: stmts.length, schema_ok: ok, errors, users: users.rows })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) })
  }
})
export default router
