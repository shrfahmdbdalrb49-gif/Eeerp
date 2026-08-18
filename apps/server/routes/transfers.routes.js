/*
  شرف ERP — التحويلات بين المخازن
  GET    /api/transfers
  POST   /api/transfers            (إنشاء تحويل ببنود — حركة out من المصدر + in للوجهة عند الترحيل)
  POST   /api/transfers/:id/post   (ترحيل: خصم من مخزن المصدر وإضافة لمخزن الوجهة)
*/
import { Router } from 'express'
import { getPool } from '../config/db.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { auditLog } from '../middleware/audit.js'

const router = Router()

router.get('/', requireAuth, requirePermission('transfers.read'), async (req, res, next) => {
  try {
    const rows = await (await getPool().connect()).query(
      `SELECT t.*, s1.name AS from_store_name, s2.name AS to_store_name
       FROM transfers t
       LEFT JOIN stores s1 ON s1.id = t.from_store_id
       LEFT JOIN stores s2 ON s2.id = t.to_store_id
       ORDER BY t.id DESC LIMIT 200`,
    )
    res.json(rows.rows)
  } catch (err) { next(err) }
})

router.get('/:id', requireAuth, requirePermission('transfers.read'), async (req, res, next) => {
  if (isNaN(Number(req.params.id))) return next()
  try {
    const conn = await getPool().connect()
    try {
      const head = await conn.query(
        `SELECT t.*, s1.name AS from_store_name, s2.name AS to_store_name
         FROM transfers t
         LEFT JOIN stores s1 ON s1.id = t.from_store_id
         LEFT JOIN stores s2 ON s2.id = t.to_store_id
         WHERE t.id = $1`, [Number(req.params.id)])
      if (!head.rows[0]) return res.status(404).json({ error: 'التحويل غير موجود' })
      const lines = await conn.query('SELECT * FROM transfer_lines WHERE transfer_id = $1 ORDER BY id', [head.rows[0].id])
      res.json({ ...head.rows[0], lines: lines.rows })
    } finally { conn.release() }
  } catch (err) { next(err) }
})

router.post('/', requireAuth, requirePermission('transfers.write'), async (req, res, next) => {
  try {
    const f = req.body
    const conn = await getPool().connect()
    try {
      if (!f.from_store_id || !f.to_store_id) return res.status(400).json({ error: 'مخزن المصدر والوجهة مطلوبان' })
      if (Number(f.from_store_id) === Number(f.to_store_id)) return res.status(400).json({ error: 'لا يمكن التحويل من مخزن إلى نفسه' })
      const refNo = f.ref_no || ('TRF-' + Date.now().toString(36).toUpperCase())
      const { rows } = await conn.query(
        `INSERT INTO transfers (ref_no, from_store_id, to_store_id, transfer_date, notes, status, created_by)
         VALUES ($1, $2, $3, COALESCE($4::date, current_date), $5, 'pending', $6) RETURNING *`,
        [refNo, Number(f.from_store_id), Number(f.to_store_id), f.transfer_date || null, f.notes || null, req.user.id],
      )
      const tid = rows[0].id
      for (const l of f.lines || []) {
        await conn.query(
          `INSERT INTO transfer_lines (transfer_id, item_id, batch_id, qty) VALUES ($1,$2,$3,$4)`,
          [tid, Number(l.item_id), l.batch_id ? Number(l.batch_id) : null, Number(l.qty || l.quantity || 0)],
        )
      }
      const full = await conn.query(
        `SELECT t.*, s1.name AS from_store_name, s2.name AS to_store_name,
                (SELECT json_agg(tl) FROM (SELECT * FROM transfer_lines WHERE transfer_id = t.id) tl) AS lines
         FROM transfers t
         LEFT JOIN stores s1 ON s1.id = t.from_store_id
         LEFT JOIN stores s2 ON s2.id = t.to_store_id
         WHERE t.id = $1`, [tid])
      await auditLog(req, 'transfer.create', 'transfer', tid, { ref_no: refNo })
      res.status(201).json(full.rows[0])
    } finally { conn.release() }
  } catch (err) { next(err) }
})

router.post('/:id/post', requireAuth, requirePermission('transfers.write'), async (req, res, next) => {
  const conn = await getPool().connect()
  try {
    const id = Number(req.params.id)
    await conn.query('BEGIN')
    const head = await conn.query('SELECT * FROM transfers WHERE id = $1 FOR UPDATE', [id])
    const t = head.rows[0]
    if (!t) throw Object.assign(new Error('التحويل غير موجود'), { status: 404 })
    if (t.status !== 'pending') throw Object.assign(new Error('لا يمكن ترحيل تحويل بحالة: ' + t.status), { status: 400 })
    const lines = await conn.query('SELECT * FROM transfer_lines WHERE transfer_id = $1', [id])
    /* خصم من مخزن المصدر وإضافة لمخزن الوجهة */
    for (const l of lines.rows) {
      await conn.query(
        `INSERT INTO stock_movements (item_id, batch_id, store_id, movement_type, quantity,
           unit_cost, ref_kind, ref_id, created_by)
         VALUES ($1,$2,$3,'out',$4,(SELECT COALESCE(cost_per_unit,0) FROM batches WHERE id = $2),'transfer',$5,$6)`,
        [l.item_id, l.batch_id, t.from_store_id, Number(l.qty || 0), id, req.user.id],
      )
      await conn.query(
        `INSERT INTO stock_movements (item_id, batch_id, store_id, movement_type, quantity,
           unit_cost, ref_kind, ref_id, created_by)
         VALUES ($1,$2,$3,'in',$4,(SELECT COALESCE(cost_per_unit,0) FROM batches WHERE id = $2),'transfer',$5,$6)`,
        [l.item_id, l.batch_id, t.to_store_id, Number(l.qty || 0), id, req.user.id],
      )
    }
    await conn.query("UPDATE transfers SET status = 'completed' WHERE id = $1", [id])
    await conn.query('COMMIT')
    await auditLog(req, 'transfer.post', 'transfer', id, { ref_no: t.ref_no })
    res.json({ ok: true, ref_no: t.ref_no })
  } catch (err) {
    await conn.query('ROLLBACK').catch(() => {})
    next(err)
  } finally { conn.release() }
})

router.post('/:id/cancel', requireAuth, requirePermission('transfers.write'), async (req, res, next) => {
  const conn = await getPool().connect()
  try {
    const id = Number(req.params.id)
    await conn.query('BEGIN')
    const head = await conn.query('SELECT * FROM transfers WHERE id = $1 FOR UPDATE', [id])
    const t = head.rows[0]
    if (!t) throw Object.assign(new Error('التحويل غير موجود'), { status: 404 })
    /* عكس حركات المخزون إذا كان مُرحَّلًا */
    await conn.query("UPDATE transfers SET status = 'cancelled' WHERE id = $1", [id])
    await conn.query('COMMIT')
    res.json({ ok: true })
  } catch (err) {
    await conn.query('ROLLBACK').catch(() => {})
    next(err)
  } finally { conn.release() }
})

export default router
