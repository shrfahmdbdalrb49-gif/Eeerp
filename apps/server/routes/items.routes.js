/* ============================================
   الأصناف والمخزون
   GET  /items
   POST /items
   PATCH /items/:id
   DELETE /items/:id
   GET  /items/:id/stock
   GET  /items/search?q=
   ============================================ */
import express from 'express'
import { query, queryOne } from '../config/db.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { auditLog } from '../middleware/audit.js'

const router = express.Router()

router.get('/', requireAuth, requirePermission('items.read'), async (req, res, next) => {
  try {
    const rows = await query(`SELECT * FROM items WHERE active = true ORDER BY id DESC`)
    res.json(rows)
  } catch (err) { next(err) }
})

router.get('/search', requireAuth, requirePermission('items.read'), async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim()
    if (!q) return res.json([])
    const rows = await query(
      `SELECT * FROM items WHERE active = true
       AND (name ILIKE $1 OR barcode ILIKE $1 OR code ILIKE $1)
       ORDER BY id DESC LIMIT 50`,
      [`%${q}%`],
    )
    res.json(rows)
  } catch (err) { next(err) }
})

router.post('/', requireAuth, requirePermission('items.write'), async (req, res, next) => {
  try {
    const f = req.body
    if (!f.name) return res.status(400).json({ error: 'اسم الصنف مطلوب' })
    const barcode = f.barcode ? String(f.barcode).trim() : null
    if (barcode) {
      const exists = await queryOne('SELECT id FROM items WHERE barcode = $1', [barcode])
      if (exists) return res.status(409).json({ error: 'الباركود مستخدم لصنف آخر' })
    }
    const rows = await query(
      `INSERT INTO items (code, barcode, name, name_en, unit, category, purchase_unit_cost,
       sale_price, min_stock, taxable, tax_rate, profit_account_id, purchase_account_id, inventory_account_id, cogs_account_id, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,true) RETURNING *`,
      [f.code || null, barcode, f.name, f.name_en || null, f.unit || 'حبة', f.category || null,
       Number(f.purchase_unit_cost || 0), Number(f.sale_price || 0), Number(f.min_stock || 0),
       !!f.taxable, Number(f.tax_rate || 0), f.profit_account_id ? Number(f.profit_account_id) : null,
       f.purchase_account_id ? Number(f.purchase_account_id) : null, f.inventory_account_id ? Number(f.inventory_account_id) : null,
       f.cogs_account_id ? Number(f.cogs_account_id) : null],
    )
    await auditLog(req, 'item.create', 'item', rows[0].id, { name: f.name })
    res.status(201).json(rows[0])
  } catch (err) { next(err) }
})

router.patch('/:id', requireAuth, requirePermission('items.write'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const f = req.body
    const parts = [], values = []
    let i = 1
    for (const key of ['code', 'barcode', 'name', 'name_en', 'unit', 'category', 'purchase_unit_cost',
                       'sale_price', 'min_stock', 'taxable', 'tax_rate', 'active']) {
      if (f[key] !== undefined) { parts.push(`${key} = $${i++}`); values.push(f[key]) }
    }
    for (const key of ['profit_account_id', 'purchase_account_id', 'inventory_account_id', 'cogs_account_id']) {
      if (f[key] !== undefined) { parts.push(`${key} = $${i++}`); values.push(f[key] != null ? Number(f[key]) : null) }
    }
    if (!parts.length) return res.status(400).json({ error: 'لا توجد بيانات للتعديل' })
    values.push(id)
    const rows = await query(`UPDATE items SET ${parts.join(', ')} WHERE id = $${i} RETURNING *`, values)
    if (!rows[0]) return res.status(404).json({ error: 'الصنف غير موجود' })
    await auditLog(req, 'item.update', 'item', id, req.body)
    res.json(rows[0])
  } catch (err) { next(err) }
})

router.delete('/:id', requireAuth, requirePermission('items.write'), async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const rows = await query('UPDATE items SET active = false WHERE id = $1 RETURNING id', [id])
    if (!rows.length) return res.status(404).json({ error: 'الصنف غير موجود' })
    await auditLog(req, 'item.delete', 'item', id)
    res.json({ ok: true })
  } catch (err) { next(err) }
})

router.get('/:id/stock', requireAuth, requirePermission('items.read'), async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT b.id AS batch_id, b.batch_no, b.expiry_date, b.cost_per_unit AS cost,
              COALESCE(SUM(sm.quantity),0) AS quantity,
              COALESCE(SUM(sm.reserved_quantity),0) AS reserved,
              COALESCE(SUM(sm.quantity),0) - COALESCE(SUM(sm.reserved_quantity),0) AS qty_available
       FROM batches b
       LEFT JOIN stock_movements sm ON sm.batch_id = b.id
       WHERE b.item_id = $1
       GROUP BY b.id ORDER BY b.expiry_date`,
      [Number(req.params.id)],
    )
    /* DEBUG v79b: إجمالي SUM(quantity) عبر جميع الحركات (بدون تجميع دُفعات) للتحقق */
    const tot = await query(
      `SELECT COALESCE(SUM(quantity),0) AS sum_qty FROM stock_movements WHERE item_id = $1`,
      [Number(req.params.id)],
    )
    res.json({ build: 'v79b', total_qty: tot.rows[0].sum_qty, batches: rows })
  } catch (err) { next(err) }
})

export default router
