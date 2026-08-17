/* ============================================
   التحصيل: قيد مزدوج (صندوق مدين / ذمم عملاء دائن)
   POST /collections
   GET  /collections
   ============================================ */
import express from 'express'
import { getPool } from '../config/db.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { nextEntryNo, nextCollectionNo, nextSupplierPayNo, insertJournalEntry, acctIds } from '../engine/accounting.js'
import { auditLog } from '../middleware/audit.js'

const router = express.Router()

router.get('/', requireAuth, requirePermission('collections.read'), async (req, res, next) => {
  try {
    const conn = await getPool().connect()
    try {
      const rows = await conn.query(
        `SELECT c.*, cu.name AS customer_name, s.name AS supplier_name
         FROM collections c
         LEFT JOIN customers cu ON cu.id = c.customer_id
         LEFT JOIN suppliers s ON s.id = c.supplier_id
         ORDER BY c.id DESC LIMIT 200`,
      )
      res.json(rows.rows)
    } finally { conn.release() }
  } catch (err) { next(err) }
})

router.post('/', requireAuth, requirePermission('collections.create'), async (req, res, next) => {
  const conn = await getPool().connect()
  try {
    const f = req.body
    if (!f.amount || Number(f.amount) <= 0) return res.status(400).json({ error: 'المبلغ مطلوب وأكبر من صفر' })
    await conn.query('BEGIN')
    const { rows } = await conn.query(
      `INSERT INTO collections (collection_no, collection_date, customer_id, supplier_id, amount,
         payment_method, cash_box_id, receipt_no, notes, created_by)
       VALUES ($1, COALESCE($2, current_date), $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [f.collection_no || (await nextCollectionNo(conn)), f.collection_date,
       f.customer_id ? Number(f.customer_id) : null, f.supplier_id ? Number(f.supplier_id) : null,
       Number(f.amount), f.payment_method || 'cash', f.cash_box_id ? Number(f.cash_box_id) : null,
       f.receipt_no || null, f.notes || null, req.user.id],
    )
    const cid = rows[0].id
    /* قيد مزدوج: الصندوق مدين - ذمم العملاء دائن (أو مورد دائن عند تحصيل مورد؟ لا: تحصيل مورد = دفعة له) */
    const entryNo = await nextEntryNo(conn)
    const ids = await acctIds(conn)
    const cashAcct = Number(f.cash_account_id) || ids.cash
    const custAcct = Number(f.customer_account_id) || ids.customer_ar
    const supAcct = Number(f.supplier_account_id) || ids.supplier_ap
    const jeLines = f.supplier_id
      ? [
          { account_id: supAcct, description: `دفعة مورد ${rows[0].collection_no}`, debit: Number(f.amount), credit: 0 },
          { account_id: cashAcct, description: `صرف نقدي ${rows[0].collection_no}`, debit: 0, credit: Number(f.amount) },
        ]
      : [
          { account_id: cashAcct, description: `تحصيل من العميل ${rows[0].collection_no}`, debit: Number(f.amount), credit: 0 },
          { account_id: custAcct, description: `تحصيل ذمم ${rows[0].collection_no}`, debit: 0, credit: Number(f.amount) },
        ]
    await insertJournalEntry(conn, {
      entryNo, entryDate: f.collection_date || new Date().toISOString().slice(0,10),
      description: f.supplier_id ? `دفعة مورد ${rows[0].collection_no}` : `سند تحصيل ${rows[0].collection_no}`,
      refKind: 'collection', refId: cid, userId: req.user.id, lines: jeLines, posted: true,
    })
    await conn.query('COMMIT')
    await auditLog(req, 'collection.create', 'collection', cid, { amount: f.amount })
    res.status(201).json(rows[0])
  } catch (err) {
    await conn.query('ROLLBACK').catch(() => {})
    next(err)
  } finally { conn.release() }
})

export default router
