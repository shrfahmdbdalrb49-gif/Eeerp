/* ============================================
   المبيعات: فاتورة → قيد مزدوج → خصم مخزون → ذمم عملاء
   POST   /sales
   GET    /sales
   GET    /sales/:id
   POST   /sales/:id/post
   POST   /sales/:id/cancel
   مرتجعات المبيعات:
   POST   /sales-returns
   POST   /sales-returns/:id/post
   ============================================ */
import express from 'express'
import { getPool } from '../config/db.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { nextEntryNo, nextInvoiceNo, insertJournalEntry, acctIds } from '../engine/accounting.js'
import { auditLog } from '../middleware/audit.js'

const router = express.Router()

router.get('/lines', requireAuth, requirePermission('sales.read'), async (req, res, next) => {
  try {
    const rows = await (await getPool().connect()).query('SELECT * FROM sales_lines ORDER BY invoice_id DESC, id')
    res.json(rows.rows)
  } catch (err) { next(err) }
})

router.get('/', requireAuth, requirePermission('sales.read'), async (req, res, next) => {
  try {
    const rows = await (await getPool().connect()).query(
      `SELECT s.*, c.name AS customer_name
       FROM sales_invoices s LEFT JOIN customers c ON c.id = s.customer_id
       ORDER BY s.id DESC LIMIT 200`,
    )
    res.json(rows.rows)
  } catch (err) { next(err) }
})

router.get('/:id', requireAuth, requirePermission('sales.read'), async (req, res, next) => {
  if (isNaN(Number(req.params.id))) return next()
  try {
    const conn = await getPool().connect()
    try {
      const head = await conn.query('SELECT * FROM sales_invoices WHERE id = $1', [Number(req.params.id)])
      if (!head.rows[0]) return res.status(404).json({ error: 'الفاتورة غير موجودة' })
      const lines = await conn.query('SELECT * FROM sales_lines WHERE invoice_id = $1 ORDER BY id', [head.rows[0].id])
      res.json({ ...head.rows[0], lines: lines.rows })
    } finally { conn.release() }
  } catch (err) { next(err) }
})

router.post('/', requireAuth, requirePermission('sales.create'), async (req, res, next) => {
  try {
    const f = req.body
    const conn = await getPool().connect()
    try {
      const { rows } = await conn.query(
        `INSERT INTO sales_invoices (invoice_no, invoice_date, invoice_time, customer_id, branch_id, store_id,
         sale_type, payment_method, currency, total_before_discount, total_discount, total_tax,
         total_amount, paid_amount, remaining_amount, notes, status, created_by)
         VALUES ($1, COALESCE($2, current_date), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'draft', $17)
         RETURNING *`,
        [f.invoice_no || (await nextInvoiceNo(conn)), f.invoice_date, f.invoice_time || new Date().toTimeString().slice(0, 5),
         f.customer_id ? Number(f.customer_id) : null, f.branch_id ? Number(f.branch_id) : null,
         f.store_id ? Number(f.store_id) : null, f.sale_type || 'retail', f.payment_method || null, f.currency || 'YER',
         Number(f.total_before_discount || 0), Number(f.total_discount || 0), Number(f.total_tax || 0),
         Number(f.total_amount || 0), Number(f.paid_amount || 0), Number(f.remaining_amount || 0),
         f.notes || null, req.user.id],
      )
      const sid = rows[0].id
      for (const l of f.lines || []) {
        const qty = Number(l.quantity || 0)
        const unitPrice = Number(l.unit_price || 0)
        const discount = Number(l.discount_amount || 0)
        const lineTotal = Math.round((qty * unitPrice - discount) * 100) / 100
        const taxRate = Number(l.tax_rate || 0)
        const taxAmount = Number(l.tax_amount || (l.taxable ? Math.round(lineTotal * taxRate * 100) / 100 : 0))
        const finalTotal = Math.round((lineTotal + taxAmount) * 100) / 100
        await conn.query(
          `INSERT INTO sales_lines (invoice_id, item_id, batch_id, quantity, unit, unit_price,
           discount_amount, tax_amount, line_total, cost_at_sale)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [sid, Number(l.item_id), l.batch_id ? Number(l.batch_id) : null, qty,
           l.unit || 'حبة', unitPrice, discount,
           taxAmount, finalTotal, Number(l.cost_at_sale || 0)],
        )
      }
      /* إعادة حساب رؤوس الفاتورة من الأسطر */
      await conn.query(
        `UPDATE sales_invoices SET
           total_before_discount = (SELECT COALESCE(SUM(quantity*unit_price),0) FROM sales_lines WHERE invoice_id = $1),
           total_discount = (SELECT COALESCE(SUM(discount_amount),0) FROM sales_lines WHERE invoice_id = $1),
           total_tax = (SELECT COALESCE(SUM(tax_amount),0) FROM sales_lines WHERE invoice_id = $1),
           total_amount = (SELECT COALESCE(SUM(line_total),0) FROM sales_lines WHERE invoice_id = $1)
         WHERE id = $1`,
        [sid],
      )
      const full = await conn.query(
        `SELECT s.*, c.name AS customer_name,
                (SELECT json_agg(sl) FROM (SELECT * FROM sales_lines WHERE invoice_id = s.id) sl) AS lines
         FROM sales_invoices s LEFT JOIN customers c ON c.id = s.customer_id WHERE s.id = $1`,
        [sid],
      )
      await auditLog(req, 'sale.create', 'sale', sid, { invoice_no: rows[0].invoice_no, total: rows[0].total_amount })
      res.status(201).json(full.rows[0])
    } finally { conn.release() }
  } catch (err) { next(err) }
})

router.post('/:id/post', requireAuth, requirePermission('sales.create'), async (req, res, next) => {
  const conn = await getPool().connect()
  try {
    const id = Number(req.params.id)
    await conn.query('BEGIN')
    const head = await conn.query('SELECT * FROM sales_invoices WHERE id = $1 FOR UPDATE', [id])
    const s = head.rows[0]
    if (!s) throw Object.assign(new Error('الفاتورة غير موجودة'), { status: 404 })
    if (s.status !== 'draft') throw Object.assign(new Error('لا يمكن ترحيل فاتورة بحالة: ' + s.status), { status: 400 })
    /* إصلاح وقائي: أي سطر بلا إجمالي يُحسب الآن تلقائيًا */
    await conn.query(
      `UPDATE sales_lines SET line_total = ROUND(quantity * unit_price - discount_amount, 2),
                             tax_amount = ROUND((quantity * unit_price - discount_amount) * COALESCE(tax_rate,0), 2)
       WHERE invoice_id = $1 AND COALESCE(line_total,0) <= 0 AND quantity > 0`,
      [id],
    )
    await conn.query(
      `UPDATE sales_invoices SET
           total_before_discount = (SELECT COALESCE(SUM(quantity*unit_price),0) FROM sales_lines WHERE invoice_id = $1),
           total_discount = (SELECT COALESCE(SUM(discount_amount),0) FROM sales_lines WHERE invoice_id = $1),
           total_tax = (SELECT COALESCE(SUM(tax_amount),0) FROM sales_lines WHERE invoice_id = $1),
           total_amount = (SELECT COALESCE(SUM(line_total),0) FROM sales_lines WHERE invoice_id = $1)
       WHERE id = $1`,
      [id],
    )
    const lines = await conn.query('SELECT * FROM sales_lines WHERE invoice_id = $1', [id])
    const items = await conn.query(`SELECT id, name, sale_price, inventory_account_id, cogs_account_id
      FROM items WHERE id = ANY($1::int[])`, [lines.rows.map(l => l.item_id)])
    const itemMap = new Map(items.rows.map(i => [i.id, i]))

    /* التحقق من توفر المخزون (FIFO/LOT حسب السطر) */
    for (const l of lines.rows) {
      const qty = Number(l.quantity || 0)
      if (l.batch_id) {
        const avail = await conn.query(
          `SELECT COALESCE(SUM(quantity),0) - COALESCE(SUM(reserved_quantity),0) AS q
           FROM stock_movements WHERE item_id = $1 AND batch_id = $2 AND (store_id IS NOT DISTINCT FROM $3)`,
          [l.item_id, l.batch_id, s.store_id],
        )
        if (Number(avail.rows[0].q) < qty) throw Object.assign(new Error(`مخزون غير كافٍ للصنف ${itemMap.get(l.item_id)?.name} (الدفعة المحددة)`), { status: 400 })
      } else {
        const avail = await conn.query(
          `SELECT COALESCE(SUM(quantity),0) - COALESCE(SUM(reserved_quantity),0) AS q
           FROM stock_movements WHERE item_id = $1 AND (store_id IS NOT DISTINCT FROM $2)`,
          [l.item_id, s.store_id],
        )
        if (Number(avail.rows[0].q) < qty) throw Object.assign(new Error(`مخزون غير كافٍ للصنف ${itemMap.get(l.item_id)?.name}`), { status: 400 })
      }
    }

    /* قيد مزدوج */
    const entryNo = await nextEntryNo(conn)
    const jeLines = []
    const ids = await acctIds(conn)
    const cashAcct = Number(s.cash_account_id) || ids.cash
    const revAcct = Number(s.revenue_account_id) || ids.revenue
    const cogsAcct = ids.cogs
    const invAcct = ids.inventory
    const custAcct = Number(s.customer_account_id) || ids.customer_ar
    if (!cashAcct || !revAcct || !cogsAcct || !invAcct || !custAcct) throw Object.assign(new Error('حسابات محاسبية غير مهيأة في النظام'), { status: 500 })
    for (const l of lines.rows) {
      const item = itemMap.get(l.item_id)
      /* تُحدَّث التكلفة في السطر إذا كانت صفراً (يُحسب متوسط تكلفة الدفعة FEFO) */
      if (Number(l.cost_at_sale || 0) <= 0 && Number(l.quantity || 0) > 0) {
        const batchSel2 = l.batch_id
        const avgRow = await conn.query(
          `SELECT COALESCE(SUM(m.quantity * m.unit_cost),0) / NULLIF(SUM(m.quantity),0) AS avg_cost
           FROM stock_movements m
           WHERE m.item_id = $1 AND (m.store_id IS NOT DISTINCT FROM $2) AND m.movement_type = 'in' AND m.quantity > 0
             ${batchSel2 ? 'AND m.batch_id = $3' : ''}`.replace('$3', '$3'),
          batchSel2 ? [l.item_id, s.store_id, batchSel2] : [l.item_id, s.store_id],
        )
        const avgCost = Number(avgRow.rows[0].avg_cost || 0)
        if (avgCost > 0) {
          l.cost_at_sale = Number(l.quantity) * avgCost
          await conn.query(`UPDATE sales_lines SET cost_at_sale = $1 WHERE id = $2`, [l.cost_at_sale, l.id])
        }
      }
      /* الإيراد + تكلفة البضاعة المباعة */
      jeLines.push({ account_id: custAcct, description: `مبيعات: ${s.invoice_no}`, debit: Number(l.line_total || 0), credit: 0 })
      jeLines.push({ account_id: revAcct, description: `إيراد مبيعات ${s.invoice_no}`, debit: 0, credit: Number(l.line_total || 0) })
      if (l.cost_at_sale > 0) {
        jeLines.push({ account_id: cogsAcct, description: `تكلفة مبيعات ${s.invoice_no}`, debit: Number(l.cost_at_sale), credit: 0 })
        jeLines.push({ account_id: invAcct, description: `خصم مخزون ${s.invoice_no}`, debit: 0, credit: Number(l.cost_at_sale) })
      }
    }
    /* تحصيل فوري: نقدي → الصندوق */
    if (Number(s.paid_amount) > 0) {
      jeLines.push({ account_id: cashAcct, description: `تحصيل نقدي ${s.invoice_no}`, debit: Number(s.paid_amount), credit: 0 })
      jeLines.push({ account_id: custAcct, description: `سداد جزء من الذمم ${s.invoice_no}`, debit: 0, credit: Number(s.paid_amount) })
    }
    await insertJournalEntry(conn, {
      entryNo, entryDate: s.invoice_date,
      description: `فاتورة مبيعات ${s.invoice_no}${s.customer_name ? ' - ' + s.customer_name : ''}`,
      refKind: 'sale', refId: id, userId: req.user.id, lines: jeLines, posted: true,
    })

    /* خصم المخزون (FIFO/LOT) */
    for (const l of lines.rows) {
      let remaining = Number(l.quantity || 0)
      let batchSel = l.batch_id
      if (batchSel) {
        await conn.query(
          `UPDATE stock_movements SET reserved_quantity = reserved_quantity + $1::numeric
           WHERE item_id = $2 AND batch_id = $3 AND (store_id IS NOT DISTINCT FROM $4)`,
          [remaining, l.item_id, batchSel, s.store_id],
        )
      }
      while (remaining > 0) {
        /* لا نعدّل quantity في حركات in نهائيًا — ندخل حركة out سالبة لكل كمية مباعة (خصم واحد فقط) */
        const target = await conn.query(
          `SELECT id FROM stock_movements
           WHERE item_id = $1 AND (store_id IS NOT DISTINCT FROM $2)
             AND movement_type = 'in' AND quantity - reserved_quantity > 0
             ${batchSel ? 'AND batch_id = ' + Number(batchSel) : ''}
           ORDER BY created_at ASC LIMIT 1`,
          [l.item_id, s.store_id],
        )
        if (!target.rows.length) break
        const available = await conn.query(
          `SELECT quantity - reserved_quantity AS avail FROM stock_movements WHERE id = $1 FOR UPDATE`, [target.rows[0].id])
        if (!available.rows.length) break
        const take = Math.min(remaining, Number(available.rows[0].avail))
        remaining -= take
        await conn.query(
          `INSERT INTO stock_movements (item_id, batch_id, store_id, movement_type, quantity, unit_cost,
             ref_kind, ref_id, created_by)
           VALUES ($1,$2,$3,'out',-($4::numeric),$5,'sale',$6,$7)`,
          [l.item_id, batchSel || target.rows[0].batch_id, s.store_id, take, Number(l.cost_at_sale || 0), id, req.user.id],
        )
      }
    }
    await conn.query("UPDATE sales_invoices SET status = 'final' WHERE id = $1", [id])
    await conn.query('COMMIT')
    await auditLog(req, 'sale.post', 'sale', id)
    res.json({ ok: true, entry_no: entryNo })
  } catch (err) {
    await conn.query('ROLLBACK').catch(() => {})
    next(err)
  } finally { conn.release() }
})

router.post('/:id/cancel', requireAuth, requirePermission('sales.cancel'), async (req, res, next) => {
  const conn = await getPool().connect()
  try {
    const id = Number(req.params.id)
    await conn.query('BEGIN')
    const head = await conn.query('SELECT * FROM sales_invoices WHERE id = $1 FOR UPDATE', [id])
    const s = head.rows[0]
    if (!s) throw Object.assign(new Error('الفاتورة غير موجودة'), { status: 404 })
    if (s.status !== 'draft') throw Object.assign(new Error('لا يمكن إلغاء فاتورة مرحّلة - استخدم مرتجع مبيعات'), { status: 400 })
    await conn.query(`DELETE FROM stock_movements WHERE ref_kind = 'sale' AND ref_id = $1`, [id])
    await conn.query(`DELETE FROM sales_lines WHERE invoice_id = $1`, [id])
    await conn.query("UPDATE sales_invoices SET status = 'cancelled' WHERE id = $1", [id])
    await conn.query('COMMIT')
    await auditLog(req, 'sale.cancel', 'sale', id)
    res.json({ ok: true })
  } catch (err) {
    await conn.query('ROLLBACK').catch(() => {})
    next(err)
  } finally { conn.release() }
})

/* ---------- مرتجعات المبيعات ---------- */
router.post('/returns', requireAuth, requirePermission('sales.create'), async (req, res, next) => {
  try {
    const f = req.body
    const conn = await getPool().connect()
    try {
      const { rows } = await conn.query(
        `INSERT INTO sales_returns (return_no, return_date, original_invoice_id, customer_id, branch_id, store_id,
         reason, total_amount, notes, status, created_by)
         VALUES ($1, COALESCE($2, current_date), $3, $4, $5, $6, $7, $8, $9, 'draft', $10) RETURNING *`,
        [f.return_no || ('RET-' + Date.now().toString(36).toUpperCase()), f.return_date,
         f.original_invoice_id ? Number(f.original_invoice_id) : null, f.customer_id ? Number(f.customer_id) : null,
         f.branch_id ? Number(f.branch_id) : null, f.store_id ? Number(f.store_id) : null,
         f.reason || null, Number(f.total_amount || 0), f.notes || null, req.user.id],
      )
      const rid = rows[0].id
      let calc = 0
      for (const l of f.lines || []) {
        await conn.query(
          `INSERT INTO sales_return_lines (return_id, item_id, quantity, unit_price, line_total)
           VALUES ($1,$2,$3,$4,$5)`,
          [rid, Number(l.item_id), Number(l.quantity || 0), Number(l.unit_price || 0), Number(l.line_total || 0)],
        )
        calc += Math.round((Number(l.quantity || 0) * Number(l.unit_price || 0) - Number(l.discount_amount || 0)) * 100) / 100
      }
      if (calc > 0) await conn.query('UPDATE sales_returns SET total_amount = $1 WHERE id = $2', [calc, rid])
      const full = await conn.query('SELECT * FROM sales_returns WHERE id = $1', [rid])
      res.status(201).json(full.rows[0])
    } finally { conn.release() }
  } catch (err) { next(err) }
})

router.post('/returns/:id/post', requireAuth, requirePermission('sales.create'), async (req, res, next) => {
  const conn = await getPool().connect()
  try {
    const id = Number(req.params.id)
    await conn.query('BEGIN')
    const head = await conn.query('SELECT * FROM sales_returns WHERE id = $1 FOR UPDATE', [id])
    const r = head.rows[0]
    if (!r) throw Object.assign(new Error('المرتجع غير موجود'), { status: 404 })
    const lines = await conn.query('SELECT * FROM sales_return_lines WHERE return_id = $1', [id])
    if (!lines.rows.length) throw Object.assign(new Error('لا يمكن ترحيل مرتجع بلا أصناف'), { status: 400 })
    /* إصلاح محاسبي: حساب الإجمالي من الأسطر (الواجهة قد لا ترسله) */
    const calcTotal = lines.rows.reduce((acc, l) => acc + Math.round((Number(l.quantity || 0) * Number(l.unit_price || 0) - Number(l.discount_amount || 0)) * 100) / 100, 0)
    if (calcTotal <= 0) throw Object.assign(new Error('لا يمكن ترحيل مرتجع بإجمالي صفري — تحقق من الكميات والأسعار'), { status: 400 })
    await conn.query(`UPDATE sales_returns SET total_amount = $1 WHERE id = $2`, [calcTotal, id])
    r.total_amount = String(calcTotal)
    const entryNo = await nextEntryNo(conn)
    const ids = await acctIds(conn)
    const revAcct = ids.sales_ret || ids.revenue
    const custAcct = ids.customer_ar
    if (!revAcct || !custAcct) throw Object.assign(new Error('حسابات محاسبية غير مهيأة في النظام'), { status: 500 })
    const jeLines = [
      { account_id: revAcct, description: `مرتجع مبيعات ${r.return_no}`, debit: Number(r.total_amount || 0), credit: 0 },
      { account_id: custAcct, description: `إلغاء ذمم مرتجع ${r.return_no}`, debit: 0, credit: Number(r.total_amount || 0) },
    ]
    await insertJournalEntry(conn, {
      entryNo, entryDate: r.return_date,
      description: `مرتجع مبيعات ${r.return_no}`,
      refKind: 'sale_return', refId: id, userId: req.user.id, lines: jeLines, posted: true,
    })
    for (const l of lines.rows) {
      const item = await conn.query('SELECT * FROM items WHERE id = $1', [l.item_id])
      if (!item.rows[0]) continue
      await conn.query(
        `INSERT INTO stock_movements (item_id, batch_id, store_id, movement_type, quantity, unit_cost,
           ref_kind, ref_id, created_by)
         VALUES ($1,NULL,$2,'in',$3,$4,'sale_return',$5,$6)`,
        [l.item_id, r.store_id, Number(l.quantity || 0), Number(l.unit_price || 0), id, req.user.id],
      )
    }
    await conn.query("UPDATE sales_returns SET status = 'final' WHERE id = $1", [id])
    await conn.query('COMMIT')
    await auditLog(req, 'sale_return.post', 'sale_return', id)
    res.json({ ok: true, entry_no: entryNo })
  } catch (err) {
    await conn.query('ROLLBACK').catch(() => {})
    next(err)
  } finally { conn.release() }
})

export default router
