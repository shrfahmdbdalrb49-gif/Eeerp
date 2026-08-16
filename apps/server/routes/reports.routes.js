/* ============================================
   التقارير المالية
   GET /reports/trial-balance?to=YYYY-MM-DD
   GET /reports/general-ledger/:accountId?from=&to=
   GET /reports/income-statement?from=&to=
   GET /reports/balance-sheet?to=
   GET /reports/account-summary
   ============================================ */
import express from 'express'
import { getPool } from '../config/db.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = express.Router()

const SUM = `(COALESCE(SUM(CASE WHEN jel.debit > 0 THEN jel.debit ELSE 0 END),0) - COALESCE(SUM(CASE WHEN jel.credit > 0 THEN jel.credit ELSE 0 END),0))`

router.get('/trial-balance', requireAuth, requirePermission('reports.read'), async (req, res, next) => {
  try {
    const conn = await getPool().connect()
    try {
      const toDate = req.query.to || new Date().toISOString().slice(0, 10)
      const rows = await conn.query(
        `SELECT a.id, a.account_no, a.name, a.type, a.parent_id,
                ${SUM} AS balance
         FROM accounts a
         LEFT JOIN journal_entries je ON je.account_id = a.id AND je.posted = true AND je.entry_date <= $1
         LEFT JOIN journal_entry_lines jel ON jel.entry_id = je.id AND jel.account_id = a.id
         GROUP BY a.id
         ORDER BY a.account_no`,
        [toDate],
      )
      let totalDebit = 0, totalCredit = 0
      const mapped = rows.rows.map(r => {
        const b = Number(r.balance || 0)
        /* أصول ومصاريف: debit موجب = رصيد مدين */
        if (['asset', 'expense'].includes(r.type)) {
          if (b > 0) totalDebit += b; else totalCredit += -b
        } else {
          if (b < 0) totalDebit += -b; else totalCredit += b
        }
        return r
      })
      res.json({ to_date: toDate, accounts: mapped, total_debit: totalDebit, total_credit: totalCredit })
    } finally { conn.release() }
  } catch (err) { next(err) }
})

router.get('/general-ledger/:accountId', requireAuth, requirePermission('reports.read'), async (req, res, next) => {
  try {
    const conn = await getPool().connect()
    try {
      const id = Number(req.params.accountId)
      const from = req.query.from || '1900-01-01'
      const to = req.query.to || new Date().toISOString().slice(0, 10)
      const acc = await conn.query('SELECT * FROM accounts WHERE id = $1', [id])
      if (!acc.rows[0]) return res.status(404).json({ error: 'الحساب غير موجود' })
      const opening = await conn.query(
        `SELECT COALESCE(SUM(CASE WHEN jel.debit > 0 THEN jel.debit ELSE 0 END),0) -
                COALESCE(SUM(CASE WHEN jel.credit > 0 THEN jel.credit ELSE 0 END),0) AS bal
         FROM journal_entries je
         JOIN journal_entry_lines jel ON jel.entry_id = je.id
         WHERE jel.account_id = $1 AND je.posted = true AND je.entry_date < $2`,
        [id, from],
      )
      const moves = await conn.query(
        `SELECT je.entry_no, je.entry_date, je.description, je.ref_kind,
                jel.debit, jel.credit
         FROM journal_entries je
         JOIN journal_entry_lines jel ON jel.entry_id = je.id
         WHERE jel.account_id = $1 AND je.posted = true AND je.entry_date BETWEEN $2 AND $3
         ORDER BY je.entry_date, je.id`,
        [id, from, to],
      )
      res.json({ account: acc.rows[0], opening_balance: Number(opening.rows[0].bal), movements: moves.rows, from, to })
    } finally { conn.release() }
  } catch (err) { next(err) }
})

router.get('/income-statement', requireAuth, requirePermission('reports.read'), async (req, res, next) => {
  try {
    const conn = await getPool().connect()
    try {
      const from = req.query.from || '1900-01-01'
      const to = req.query.to || new Date().toISOString().slice(0, 10)
      const rows = await conn.query(
        `SELECT a.id, a.name, a.type,
                ${SUM} AS balance
         FROM accounts a
         JOIN journal_entries je ON je.account_id = a.id AND je.posted = true
             AND je.entry_date BETWEEN $1 AND $2
         JOIN journal_entry_lines jel ON jel.entry_id = je.id AND jel.account_id = a.id
         WHERE a.type IN ('revenue','expense')
         GROUP BY a.id ORDER BY a.account_no`,
        [from, to],
      )
      const revenue = rows.rows.filter(r => r.type === 'revenue').reduce((a, r) => a + Number(r.balance || 0), 0)
      const expense = rows.rows.filter(r => r.type === 'expense').reduce((a, r) => a + Number(r.balance || 0), 0)
      res.json({ from, to, revenue, expense, net_income: revenue + expense })
    } finally { conn.release() }
  } catch (err) { next(err) }
})

router.get('/balance-sheet', requireAuth, requirePermission('reports.read'), async (req, res, next) => {
  try {
    const conn = await getPool().connect()
    try {
      const to = req.query.to || new Date().toISOString().slice(0, 10)
      const rows = await conn.query(
        `SELECT a.id, a.name, a.type,
                ${SUM} AS balance
         FROM accounts a
         JOIN journal_entries je ON je.account_id = a.id AND je.posted = true AND je.entry_date <= $1
         JOIN journal_entry_lines jel ON jel.entry_id = je.id AND jel.account_id = a.id
         WHERE a.type IN ('asset','liability','equity')
         GROUP BY a.id ORDER BY a.account_no`,
        [to],
      )
      const asset = rows.rows.filter(r => r.type === 'asset').reduce((a, r) => a + Number(r.balance || 0), 0)
      const liability = rows.rows.filter(r => r.type === 'liability').reduce((a, r) => a + Number(r.balance || 0), 0)
      const equity = rows.rows.filter(r => r.type === 'equity').reduce((a, r) => a + Number(r.balance || 0), 0)
      res.json({ to_date: to, total_assets: asset, total_liabilities: liability, total_equity: equity })
    } finally { conn.release() }
  } catch (err) { next(err) }
})

router.get('/account-summary', requireAuth, requirePermission('reports.read'), async (req, res, next) => {
  try {
    const conn = await getPool().connect()
    try {
      const rows = await conn.query(
        `SELECT cu.id, cu.name, cu.phone,
                COALESCE(SUM(CASE WHEN jel.credit > 0 THEN jel.credit ELSE 0 END),0) -
                COALESCE(SUM(CASE WHEN jel.debit > 0 THEN jel.debit ELSE 0 END),0) AS balance
         FROM customers cu
         LEFT JOIN journal_entries je ON je.customer_id = cu.id AND je.posted = true
         LEFT JOIN journal_entry_lines jel ON jel.entry_id = je.id AND jel.account_id = 6
         GROUP BY cu.id ORDER BY cu.id DESC LIMIT 500`,
      )
      res.json(rows.rows)
    } finally { conn.release() }
  } catch (err) { next(err) }
})

export default router
