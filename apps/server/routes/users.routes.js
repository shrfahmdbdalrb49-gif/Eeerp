/* ============================================
   إدارة المستخدمين والأدوار
   GET  /users
   POST /users
   PATCH /users/:id
   DELETE /users/:id
   ============================================ */
import express from 'express'
import bcrypt from 'bcryptjs'
import { query, queryOne } from '../config/db.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { auditLog } from '../middleware/audit.js'

const router = express.Router()

router.get('/', requireAuth, requirePermission('users.read'), async (req, res, next) => {
  try {
    const rows = await query(`SELECT id, username, full_name, role, active, created_at FROM users ORDER BY id`)
    res.json(rows)
  } catch (err) { next(err) }
})

router.post('/', requireAuth, requirePermission('users.write'), async (req, res, next) => {
  try {
    const { username, full_name, password, role, active = true } = req.body
    if (!username || !password) return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' })
    const exists = await queryOne('SELECT id FROM users WHERE username = $1', [String(username).trim().toLowerCase()])
    if (exists) return res.status(409).json({ error: 'اسم المستخدم موجود مسبقًا' })
    const hash = await bcrypt.hash(String(password), 10)
    const { rows } = await query(
      `INSERT INTO users (username, full_name, password_hash, role, active)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, username, full_name, role, active`,
      [String(username).trim().toLowerCase(), full_name || username, hash, role || 'sales', !!active],
    )
    await auditLog(req, 'user.create', 'user', rows[0].id, { username })
    res.status(201).json(rows[0])
  } catch (err) { next(err) }
})

router.patch('/:id', requireAuth, requirePermission('users.write'), async (req, res, next) => {
  try {
    const { full_name, password, role, active } = req.body
    const id = Number(req.params.id)
    const parts = []
    const values = []
    let i = 1
    if (full_name != null) { parts.push(`full_name = $${i++}`); values.push(full_name) }
    if (password != null) { parts.push(`password_hash = $${i++}`); values.push(await bcrypt.hash(String(password), 10)) }
    if (role != null) { parts.push(`role = $${i++}`); values.push(role) }
    if (active != null) { parts.push(`active = $${i++}`); values.push(!!active) }
    if (!parts.length) return res.status(400).json({ error: 'لا توجد بيانات للتعديل' })
    values.push(id)
    const { rows } = await query(`UPDATE users SET ${parts.join(', ')} WHERE id = $${i} RETURNING id, username, full_name, role, active`, values)
    if (!rows[0]) return res.status(404).json({ error: 'المستخدم غير موجود' })
    await auditLog(req, 'user.update', 'user', id, req.body)
    res.json(rows[0])
  } catch (err) { next(err) }
})

router.delete('/:id', requireAuth, requirePermission('users.write'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (id === req.user.id) return res.status(400).json({ error: 'لا يمكن حذف حسابك الحالي' })
    const { rows } = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id])
    if (!rows.length) return res.status(404).json({ error: 'المستخدم غير موجود' })
    await auditLog(req, 'user.delete', 'user', id)
    res.json({ ok: true })
  } catch (err) { next(err) }
})

export default router
