/* ============================================
   سداد الموردين: قيد مزدوج (الموردون مدين / الصندوق دائن)
   POST /supplier-payments
   GET  /supplier-payments
   ============================================ */
import express from 'express'
import { getPool } from '../config/db.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { nextEntryNo, nextSupplierPayNo, insertJournalEntry, acctIds } from '../engine/accounting.js'
import { auditLog } from '../middleware/audit.js'

const router = express.Router()

router.get('/', requireAuth, requirePermission('payments.read'), async (req, res, next) => {
  try {
    const conn = await getPool().connect()
    try {
      const rows = await conn.query(
        `SELECT p.*, s.name AS supplier_name
         FROM supplier_payments p LEFT JOIN suppliers s ON s.id = p.supplier_id
         ORDER BY p.id DESC LIMIT 200`,
      )
      res.json(rows.rows)
    } finally { conn.release() }
  } catch (err) { next(err) }
})

router.post('/', requireAuth, requirePermission('payments.create'), async (req, res, next) => {
  const conn = await getPool().connect()
  try {
    const f = req.body
    if (!f.supplier_id || !f.amount || Number(f.amount) <= 0) {
      return res.status(400).json({ error: 'المورد والمبلغ أكبر من صفر مطلوبان' })
    }
    await conn.query('BEGIN')
    const { rows } = await conn.query(
      `INSERT INTO supplier_payments (payment_no, payment_date, supplier_id, amount,
         payment_method, cash_box_id, notes, created_by)
       VALUES ($1, COALESCE($2, current_date), $3, $4, $5, $6, $7, $8) RETURNING *`,
      [f.payment_no || (await nextSupplierPayNo(conn)), f.payment_date,
       Number(f.supplier_id), Number(f.amount), f.payment_method || 'cash',
       f.cash_box_id ? Number(f.cash_box_id) : null, f.notes || null, req.user.id],
    )
    const pid = rows[0].id
    const entryNo = await nextEntryNo(conn)
    const ids = await acctIds(conn)
    const supAcct = Number(f.supplier_account_id) || ids.supplier_ap
    const cashAcct = Number(f.cash_account_id) || ids.cash
    await insertJournalEntry(conn, {
      entryNo, entryDate: f.payment_date || new Date().toISOString().slice(0,10),
      description: `سداد مورد ${rows[0].payment_no}`,
      refKind: 'supplier_payment', refId: pid, userId: req.user.id,
      lines: [
        { account_id: supAcct, description: `سداد للمورد`, debit: Number(f.amount), credit: 0 },
        { account_id: cashAcct, description: `صرف نقدي`, debit: 0, credit: Number(f.amount) },
      ],
      posted: true,
    })
    await conn.query('COMMIT')
    await auditLog(req, 'supplier_payment.create', 'supplier_payment', pid, { amount: f.amount, supplier_id: f.supplier_id })
    res.status(201).json(rows[0])
  } catch (err) {
    await conn.query('ROLLBACK').catch(() => {})
    next(err)
  } finally { conn.release() }
})

export default router
