/* ============================================
   القيود المحاسبية (اليدوية)
   POST /journals  — إنشاء قيد يدوي {entryDate, description, lines:[{accountId,debit,credit,description}]}
   GET  /journals
   GET  /journals/:id
   DELETE /journals/:id (غير المرحّلة فقط)
   ============================================ */
import express from 'express'
import { getPool } from '../config/db.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { nextEntryNo, insertJournalEntry } from '../engine/accounting.js'
import { auditLog } from '../middleware/audit.js'

const router = express.Router()

router.get('/', requireAuth, requirePermission('journals.read'), async (req, res, next) => {
  try {
    const conn = await getPool().connect()
    try {
      const rows = await conn.query(
        `SELECT * FROM journal_entries ORDER BY id DESC LIMIT 200`,
      )
      res.json(rows.rows)
    } finally { conn.release() }
  } catch (err) { next(err) }
})

router.get('/:id', requireAuth, requirePermission('journals.read'), async (req, res, next) => {
  try {
    const conn = await getPool().connect()
    try {
      const head = await conn.query('SELECT * FROM journal_entries WHERE id = $1', [Number(req.params.id)])
      if (!head.rows[0]) return res.status(404).json({ error: 'القيد غير موجود' })
      const lines = await conn.query('SELECT * FROM journal_lines WHERE entry_id = $1 ORDER BY id', [head.rows[0].id])
      res.json({ ...head.rows[0], lines: lines.rows })
    } finally { conn.release() }
  } catch (err) { next(err) }
})

router.post('/', requireAuth, requirePermission('journals.create'), async (req, res, next) => {
  const conn = await getPool().connect()
  try {
    const f = req.body
    const lines = f.lines || []
    if (!lines.length) return res.status(400).json({ error: 'يجب أن يحتوي القيد على سطر واحد على الأقل' })
    const totalDebit = lines.reduce((a, l) => a + Number(l.debit || 0), 0)
    const totalCredit = lines.reduce((a, l) => a + Number(l.credit || 0), 0)
    if (Math.abs(totalDebit - totalCredit) > 0.005) {
      return res.status(400).json({ error: `القيد غير متوازن: المدين ${totalDebit} والدائن ${totalCredit}` })
    }
    if (totalDebit <= 0) return res.status(400).json({ error: 'إجمالي القيد يجب أن يكون أكبر من صفر' })
    await conn.query('BEGIN')
    const entryNo = await nextEntryNo(conn)
    const entry = await insertJournalEntry(conn, {
      entryNo, entryDate: f.entryDate,
      description: f.description || 'قيد محاسبي يدوي',
      refKind: f.refKind || 'manual', refId: f.refId || null,
      userId: req.user.id, lines, posted: f.posted !== false,
    })
    await conn.query('COMMIT')
    await auditLog(req, 'journal.create', 'journal_entry', entry, { entry_no: entryNo })
    res.status(201).json({ id: entry, entry_no: entryNo })
  } catch (err) {
    await conn.query('ROLLBACK').catch(() => {})
    next(err)
  } finally { conn.release() }
})

router.delete('/:id', requireAuth, requirePermission('journals.create'), async (req, res, next) => {
  try {
    const conn = await getPool().connect()
    try {
      const head = await conn.query('SELECT * FROM journal_entries WHERE id = $1', [Number(req.params.id)])
      if (!head.rows[0]) return res.status(404).json({ error: 'القيد غير موجود' })
      if (head.rows[0].posted) return res.status(400).json({ error: 'لا يمكن حذف قيد مرحّل' })
      if (head.rows[0].locked) return res.status(403).json({ error: 'القيد داخل فترة محاسبية مقفلة' })
      await conn.query('DELETE FROM journal_lines WHERE entry_id = $1', [head.rows[0].id])
      await conn.query('DELETE FROM journal_entries WHERE id = $1', [head.rows[0].id])
      await auditLog(req, 'journal.delete', 'journal_entry', head.rows[0].id)
      res.json({ ok: true })
    } finally { conn.release() }
  } catch (err) { next(err) }
})

export default router
