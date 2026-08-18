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
    // 0) ترقية الجداول القديمة — إضافة الأعمدة الناقصة (posted, reserved_quantity, status...)
    try {
      const mig = await readFile(join(dir, '..', 'sql', 'migrations.sql'), 'utf8')
      const migStmts = splitSQL(mig)
      for (const stmt of migStmts) {
        try { await pool.query(stmt) } catch (e) { /* الأعمدة الموجودة تُتجاهل بأمان */ }
      }
    } catch (e) { errors.push(`migrations: ${e.message}`) }
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
    // 3) ضمان admin (bcrypt عبر JS لا SQL) — يُتخطى نهائيًا إذا وُجد حساب إداري عربي (شرف) حفاظًا على سياسة المستخدم
    const sharafAdmin = await pool.query(`SELECT id FROM users WHERE username = 'شرف' AND role = 'admin' AND active = true`)
    if (sharafAdmin.rowCount === 0) {
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
    } else {
      // إزالة حساب admin الافتراضي نهائيًا لأن المستخدم لا يريده
      await pool.query(`DELETE FROM users WHERE username = 'admin'`).catch(() => {})
    }
    // 4) إصلاح رجعي: الأسطر الصفرية في القيود القديمة (idempotent)
    let retroCounts = []
    try {
      const retro = await readFile(join(dir, '..', 'sql', 'retro-je-fix.sql'), 'utf8')
      const retroStmts = splitSQL(retro)
      for (const stmt of retroStmts) {
        try {
          const r = await pool.query(stmt)
          retroCounts.push({ stmt: stmt.trim().slice(0, 55).replace(/\n/g, ' '), rows: r.rowCount })
        } catch (e) { errors.push(`retro-je: ${e.message}`) }
      }
    } catch (e) { errors.push(`retro-je: ${e.message}`) }
    const users = await pool.query(`SELECT username, role, active FROM users`)
    res.json({ ok: true, schema_stmts: stmts.length, schema_ok: ok, retro: retroCounts, errors, users: users.rows })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) })
  }
})
export default router

/* ---------- تطبيق migrations.sql فقط (آمن على الإنتاج: لا يعيد schema ولا seed)
   POST /api/setup/apply-migrations?key=<secret>
   ------------------------------ */
router.post('/apply-migrations', async (req, res) => {
  let pool = null
  try {
    const key = (req.body && req.body.key) || (req.query && req.query.key)
    if (key !== SECRET) return res.status(401).json({ error: 'مفتاح غير صالح' })
    const db = await import('../config/db.js')
    pool = db.getPool()
    const { readFile } = await import('fs/promises')
    const { fileURLToPath } = await import('url')
    const { dirname, join } = await import('path')
    const { splitSQL } = await import('../sql/split.js')
    const dir = dirname(fileURLToPath(import.meta.url))
    const mig = await readFile(join(dir, '..', 'sql', 'migrations.sql'), 'utf8')
    const stmts = splitSQL(mig)
    let ok = 0
    let skipped = 0
    const errors = []
    for (const stmt of stmts) {
      try {
        await pool.query(stmt)
        ok++
      } catch (e) {
        if (String(e.message).match(/already exists|لا exists|غير موجود/i)) skipped++
        else errors.push(`stmt[${ok + skipped}]: ${e.message}`)
      }
    }
    res.json({ ok: true, applied: ok, skipped: skipped, errors })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) })
  }
})
