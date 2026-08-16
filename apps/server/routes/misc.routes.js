/* ============================================
   الفروع / المخازن / الصناديق / العملاء / الموردون / الأدوار
   (CRUD بسيط)
   ============================================ */
import express from 'express'
import { getPool } from '../config/db.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { auditLog } from '../middleware/audit.js'

const simpleCrud = (table, prefix, label) => {
  const router = express.Router()
  router.get('/', requireAuth, requirePermission(`${prefix}.read`), async (req, res, next) => {
    try {
      const rows = await (await getPool().connect()).query(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 500`)
      res.json(rows.rows)
    } catch (err) { next(err) }
  })
  router.post('/', requireAuth, requirePermission(`${prefix}.write`), async (req, res, next) => {
    const conn = await getPool().connect()
    try {
      const keys = Object.keys(req.body).filter(k => typeof req.body[k] !== 'undefined' && req.body[k] !== '')
      if (!keys.length) return res.status(400).json({ error: 'لا توجد بيانات' })
      const cols = keys.join(', ')
      const vals = keys.map((k, i) => `$${i + 1}`).join(', ')
      const { rows } = await conn.query(`INSERT INTO ${table} (${cols}) VALUES (${vals}) RETURNING *`, keys.map(k => req.body[k]))
      await auditLog(req, `${prefix}.create`, table.replace(/\s/g, '_'), rows[0].id, req.body)
      res.status(201).json(rows[0])
    } catch (err) { next(err) }
  })
  router.patch('/:id', requireAuth, requirePermission(`${prefix}.write`), async (req, res, next) => {
    const conn = await getPool().connect()
    try {
      const keys = Object.keys(req.body).filter(k => typeof req.body[k] !== 'undefined' && req.body[k] !== '')
      if (!keys.length) return res.status(400).json({ error: 'لا توجد بيانات' })
      const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ')
      const id = Number(req.params.id)
      const { rows } = await conn.query(`UPDATE ${table} SET ${sets} WHERE id = $${keys.length + 1} RETURNING *`, [...keys.map(k => req.body[k]), id])
      if (!rows[0]) return res.status(404).json({ error: 'غير موجود' })
      await auditLog(req, `${prefix}.update`, table.replace(/\s/g, '_'), id, req.body)
      res.json(rows[0])
    } catch (err) { next(err) }
  })
  router.delete('/:id', requireAuth, requirePermission(`${prefix}.write`), async (req, res, next) => {
    try {
      const conn = await getPool().connect()
      try {
        await conn.query(`DELETE FROM ${table} WHERE id = $1`, [Number(req.params.id)])
        await auditLog(req, `${prefix}.delete`, table.replace(/\s/g, '_'), Number(req.params.id))
        res.json({ ok: true })
      } finally { conn.release() }
    } catch (err) { next(err) }
  })
  return router
}

const branchesRouter = simpleCrud('branches', 'branches', 'branches')
const storesRouter = simpleCrud('stores', 'stores', 'stores')
const cashBoxesRouter = simpleCrud('cash_boxes', 'cash_boxes', 'cash_boxes')
const customersRouter = simpleCrud('customers', 'customers', 'customers')
const suppliersRouter = simpleCrud('suppliers', 'suppliers', 'suppliers')

/* الأدوار: قراءة الأدوار + قائمة الصلاحيات لكل دور */
const rolesRouter = express.Router()
rolesRouter.get('/', requireAuth, requirePermission('roles.read'), async (req, res, next) => {
  try {
    const conn = await getPool().connect()
    try {
      const roles = await conn.query(`SELECT * FROM roles ORDER BY id`)
      const perms = await conn.query(`SELECT * FROM role_permissions`)
      res.json(roles.rows.map(r => ({
        ...r,
        permissions: perms.rows.filter(p => p.role_id === r.id).map(p => p.permission),
      })))
    } finally { conn.release() }
  } catch (err) { next(err) }
})

export { branchesRouter, storesRouter, cashBoxesRouter, customersRouter, suppliersRouter, rolesRouter }
