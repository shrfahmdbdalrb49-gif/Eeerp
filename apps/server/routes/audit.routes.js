/* ============================================
   سجل التدقيق (Audit Log)
   GET /audit?limit=200
   ============================================ */
import express from 'express'
import { getPool } from '../config/db.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = express.Router()

router.get('/', requireAuth, requirePermission('audit.read'), async (req, res, next) => {
  try {
    const conn = await getPool().connect()
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 1000)
      const rows = await conn.query(
        `SELECT al.id, al.action, al.ref_kind AS entity_type, al.ref_id AS entity_id, al.details, al.created_at,
                u.username, u.full_name
         FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id
         ORDER BY al.id DESC LIMIT $1`,
        [limit],
      )
      res.json(rows.rows)
    } finally { conn.release() }
  } catch (err) { next(err) }
})

export default router
