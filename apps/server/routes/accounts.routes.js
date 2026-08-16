/* ============================================
   دليل الحسابات المحاسبي
   GET  /accounts
   POST /accounts
   PATCH /accounts/:id
   GET  /accounts/:id/balance?to=YYYY-MM-DD
   ============================================ */
import express from 'express'
import { query, queryOne } from '../config/db.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { accountBalance } from '../engine/accounting.js'
import { auditLog } from '../middleware/audit.js'

const router = express.Router()

router.get('/', requireAuth, requirePermission('accounts.read'), async (req, res, next) => {
  try {
    const rows = await query(`SELECT * FROM chart_of_accounts ORDER BY code`)
    res.json(rows)
  } catch (err) { next(err) }
})

router.post('/', requireAuth, requirePermission('accounts.write'), async (req, res, next) => {
  try {
    const { code, number, name, type, parent_id, balance_direction = 'debit', sort_order } = req.body
    if (!code || !name || !type) return res.status(400).json({ error: 'الكود والاسم والنوع مطلوبة' })
    const exists = await queryOne('SELECT id FROM chart_of_accounts WHERE code = $1', [String(code).trim()])
    if (exists) return res.status(409).json({ error: 'كود الحساب موجود مسبقًا' })
    const { rows } = await query(
      `INSERT INTO chart_of_accounts (code, number, name, type, parent_id, balance_direction, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [String(code).trim(), number || String(code), name, type, parent_id != null ? Number(parent_id) : null,
       balance_direction || 'debit', sort_order != null ? Number(sort_order) : null],
    )
    await auditLog(req, 'account.create', 'account', rows[0].id, { code })
    res.status(201).json(rows[0])
  } catch (err) { next(err) }
})

router.patch('/:id', requireAuth, requirePermission('accounts.write'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const { name, type, parent_id, balance_direction, sort_order } = req.body
    const parts = []
    const values = []
    let i = 1
    if (name != null) { parts.push(`name = $${i++}`); values.push(name) }
    if (type != null) { parts.push(`type = $${i++}`); values.push(type) }
    if (parent_id != null) { parts.push(`parent_id = $${i++}`); values.push(Number(parent_id)) }
    if (balance_direction != null) { parts.push(`balance_direction = $${i++}`); values.push(balance_direction) }
    if (sort_order != null) { parts.push(`sort_order = $${i++}`); values.push(Number(sort_order)) }
    if (!parts.length) return res.status(400).json({ error: 'لا توجد بيانات للتعديل' })
    values.push(id)
    const { rows } = await query(`UPDATE chart_of_accounts SET ${parts.join(', ')} WHERE id = $${i} RETURNING *`, values)
    if (!rows[0]) return res.status(404).json({ error: 'الحساب غير موجود' })
    await auditLog(req, 'account.update', 'account', id, req.body)
    res.json(rows[0])
  } catch (err) { next(err) }
})

router.get('/:id/balance', requireAuth, requirePermission('accounts.read'), async (req, res, next) => {
  try {
    const conn = (await import('../config/db.js')).getPool()
    const client = await conn.connect()
    try {
      const bal = await accountBalance(client, Number(req.params.id), req.query.to || null)
      res.json(bal)
    } finally { client.release() }
  } catch (err) { next(err) }
})

export default router
