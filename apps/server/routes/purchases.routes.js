/* ============================================
   المشتريات: فاتورة → قيد مزدوج → مخزون → ذمم موردين
   POST   /purchases            (draft/pending)
   GET    /purchases
   GET    /purchases/:id
   POST   /purchases/:id/post   (ترحيل: قيد + مخزون + ذمم)
   POST   /purchases/:id/receive
   POST   /purchases/:id/unreceive
   POST   /purchases/:id/cancel
   ============================================ */
import express from 'express'
import { getPool } from '../config/db.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { nextEntryNo, nextPurchaseNo, insertJournalEntry, acctIds } from '../engine/accounting.js'
import { auditLog } from '../middleware/audit.js'

const router = express.Router()

router.get('/', requireAuth, requirePermission('purchases.read'), async (req, res, next) => {
  try {
    const rows = await (await getPool()).query(
      `SELECT p.*, s.name AS supplier_name
       FROM purchases p LEFT JOIN suppliers s ON s.id = p.supplier_id
       ORDER BY p.id DESC LIMIT 200`,
    )
    res.json(rows.rows)
  } catch (err) { next(err) }
})

router.get('/:id', requireAuth, requirePermission('purchases.read'), async (req, res, next) => {
  if (isNaN(Number(req.params.id))) return next()
  try {
    const conn = await getPool().connect()
    try {
      const head = await conn.query('SELECT * FROM purchases WHERE id = $1', [Number(req.params.id)])
      if (!head.rows[0]) return res.status(404).json({ error: 'الفاتورة غير موجودة' })
      const lines = await conn.query(`SELECT * FROM purchase_lines WHERE purchase_id = $1 ORDER BY id`, [head.rows[0].id])
      res.json({ ...head.rows[0], lines: lines.rows })
    } finally { conn.release() }
  } catch (err) { next(err) }
})

router.post('/', requireAuth, requirePermission('purchases.create'), async (req, res, next) => {
  try {
    const f = req.body
    const conn = await getPool().connect()
    try {
      const pick = (o, ...k) => Object.fromEntries(k.map(key => [key, o[key]]))
      const { rows } = await conn.query(
        `INSERT INTO purchases (purchase_no, purchase_date, supplier_id, branch_id, store_id,
         total_before_discount, total_discount, total_tax, total_amount, paid_amount,
         payment_method, currency, notes, status, created_by)
         VALUES ($1, COALESCE($2, current_date), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'draft', $14)
         RETURNING *`,
        [f.purchase_no || (await nextPurchaseNo(conn)), f.purchase_date,
         f.supplier_id ? Number(f.supplier_id) : null, f.branch_id ? Number(f.branch_id) : null,
         f.store_id ? Number(f.store_id) : null,
         Number(f.total_before_discount || 0), Number(f.total_discount || 0),
         Number(f.total_tax || 0), Number(f.total_amount || 0), Number(f.paid_amount || 0),
         f.payment_method || null, f.currency || 'YER', f.notes || null, req.user.id],
      )
      const pid = rows[0].id
      const lines = f.lines || []
      for (const l of lines) {
        const qty = Number(l.quantity || 0)
        const unitCost = Number(l.unit_cost || 0)
        const discount = Number(l.total_discount || 0)
        const lineTotal = Math.round((qty * unitCost - discount) * 100) / 100
        const taxRate = Number(l.tax_rate || 0)
        const taxAmount = Number(l.tax_amount || (l.taxable ? Math.round(lineTotal * taxRate * 100) / 100 : 0))
        const finalTotal = Math.round((lineTotal + taxAmount) * 100) / 100
        await conn.query(
          `INSERT INTO purchase_lines (purchase_id, item_id, batch_id, quantity, bonus_quantity,
           unit_cost, total_discount, tax_amount, line_total)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [pid, Number(l.item_id), l.batch_id ? Number(l.batch_id) : null, qty,
           Number(l.bonus_quantity || 0), unitCost, discount,
           taxAmount, finalTotal],
        )
      }
      /* إعادة حساب رؤوس الفاتورة من الأسطر */
      await conn.query(
        `UPDATE purchases SET
           total_before_discount = (SELECT COALESCE(SUM(quantity*unit_cost),0) FROM purchase_lines WHERE purchase_id = $1),
           total_discount = (SELECT COALESCE(SUM(total_discount),0) FROM purchase_lines WHERE purchase_id = $1),
           total_tax = (SELECT COALESCE(SUM(tax_amount),0) FROM purchase_lines WHERE purchase_id = $1),
           total_amount = (SELECT COALESCE(SUM(line_total),0) FROM purchase_lines WHERE purchase_id = $1)
         WHERE id = $1`,
        [pid],
      )
      const full = await conn.query(
        `SELECT p.*, s.name AS supplier_name,
                (SELECT json_agg(pl) FROM (SELECT * FROM purchase_lines WHERE purchase_id = p.id) pl) AS lines
         FROM purchases p LEFT JOIN suppliers s ON s.id = p.supplier_id WHERE p.id = $1`,
        [pid],
      )
      await auditLog(req, 'purchase.create', 'purchase', pid, pick(f, 'purchase_no', 'supplier_id', 'total_amount'))
      res.status(201).json(full.rows[0])
    } finally { conn.release() }
  } catch (err) { next(err) }
})

router.post('/:id/post', requireAuth, requirePermission('purchases.post'), async (req, res, next) => {
  
  const conn = await getPool().connect()
  try {
    const id = Number(req.params.id)
    await conn.query('BEGIN')
    const head = await conn.query('SELECT * FROM purchases WHERE id = $1 FOR UPDATE', [id])
    const p = head.rows[0]
    if (!p) throw Object.assign(new Error('الفاتورة غير موجودة'), { status: 404 })
    if (p.status !== 'pending' && p.status !== 'draft') throw Object.assign(new Error('لا يمكن ترحيل فاتورة بحالة: ' + p.status), { status: 400 })
    const lines = await conn.query('SELECT * FROM purchase_lines WHERE purchase_id = $1', [id])
    const items = await conn.query('SELECT id, name, purchase_account_id, inventory_account_id FROM items WHERE id = ANY($1::int[])',
      [lines.rows.map(l => l.item_id)])
    const itemMap = new Map(items.rows.map(i => [i.id, i]))
    const entryNo = await nextEntryNo(conn)
    const jeLines = []
    let totalDebitInventory = 0
    for (const l of lines.rows) {
      /* المخزون (مدين) */
      const ids = await acctIds(conn)
      const invAcct = Number(itemMap.get(l.item_id)?.inventory_account_id) || ids.inventory
      totalDebitInventory += Number(l.line_total || 0)
      /* المورد (دائن) */
      const supAcct = Number(p.supplier_account_id) || ids.supplier_ap
      jeLines.push({ account_id: invAcct, description: `مشتريات: ${p.purchase_no} - ${itemMap.get(l.item_id)?.name}`, debit: Number(l.line_total || 0), credit: 0 })
      jeLines.push({ account_id: supAcct, description: `فاتورة مورد: ${p.purchase_no}`, debit: 0, credit: Number(l.line_total || 0) })
    }
    /* لو كان هناك دفع فوري من الصندوق */
    if (Number(p.paid_amount) > 0) {
      const ids2 = await acctIds(conn)
      jeLines.push({ account_id: supAcct, description: `دفعة مقدمة - ${p.purchase_no}`, debit: Number(p.paid_amount), credit: 0 })
      jeLines.push({ account_id: Number(p.cash_account_id) || ids2.cash, description: `دفعة من الصندوق - ${p.purchase_no}`, debit: 0, credit: Number(p.paid_amount) })
    }
    await insertJournalEntry(conn, {
      entryNo, entryDate: p.purchase_date,
      description: `فاتورة شراء ${p.purchase_no} - ${p.supplier_name || ''}`,
      refKind: 'purchase', refId: id, userId: req.user.id,
      lines: jeLines, posted: true,
    })
    /* حركة المخزون */
    for (const l of lines.rows) {
      const batchId = l.batch_id || (await conn.query(
        `INSERT INTO batches (item_id, batch_no, expiry_date, store_id, cost_per_unit)
         VALUES ($1, COALESCE($2,'LOT-'||nextval('seq_purchases')), $3, $4, $5) RETURNING id`,
        [l.item_id, l.batch_no || null, l.expiry_date || null, p.store_id, l.unit_cost],
      )).rows[0].id
      await conn.query(
        `INSERT INTO stock_movements (item_id, batch_id, store_id, movement_type, quantity,
           unit_cost, ref_kind, ref_id, created_by)
         VALUES ($1,$2,$3,'in',$4,$5,'purchase',$6,$7)`,
        [l.item_id, batchId, p.store_id, Number(l.quantity || 0), Number(l.unit_cost || 0), id, req.user.id],
      )
      if (l.batch_id == null) await conn.query('UPDATE purchase_lines SET batch_id = $1 WHERE id = $2', [batchId, l.id])
    }
    await conn.query("UPDATE purchases SET status = 'received', posted = true WHERE id = $1", [id])
    await conn.query('COMMIT')
    await auditLog(req, 'purchase.post', 'purchase', id)
    res.json({ ok: true, entry_no: entryNo })
  } catch (err) {
    await conn.query('ROLLBACK').catch(() => {})
    console.error('[POST-ERR]', err?.message, err?.detail || '', err?.stack?.split('\n').slice(1, 3).join(' | '))
    next(err)
  } finally { conn.release() }
})
router.post('/:id/cancel', requireAuth, requirePermission('purchases.create'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const conn = await getPool().connect()
    try {
      await conn.query('BEGIN')
      const head = await conn.query('SELECT * FROM purchases WHERE id = $1 FOR UPDATE', [id])
      const p = head.rows[0]
      if (!p) throw Object.assign(new Error('الفاتورة غير موجودة'), { status: 404 })
      if (p.status === 'received') throw Object.assign(new Error('لا يمكن إلغاء فاتورة مرحّلة - استرجعها أولًا'), { status: 400 })
      /* حذف حركات المخزون للفاكتور غير المرحّلة */
      await conn.query(`DELETE FROM stock_movements WHERE ref_kind = 'purchase' AND ref_id = $1`, [id])
      await conn.query(`DELETE FROM purchase_lines WHERE purchase_id = $1`, [id])
      await conn.query("UPDATE purchases SET status = 'cancelled' WHERE id = $1", [id])
      await conn.query('COMMIT')
      await auditLog(req, 'purchase.cancel', 'purchase', id)
      res.json({ ok: true })
    } finally { conn.release() }
  } catch (err) {
    await conn?.query?.('ROLLBACK').catch(() => {})
    next(err)
  }
})
export default router
