/* ============================================
   التقارير المالية (الإصدار 2)
   GET /reports/trial-balance?to=YYYY-MM-DD
   GET /reports/general-ledger/:accountId?from=&to=
   GET /reports/income-statement?from=&to=
   GET /reports/balance-sheet?to=
   GET /reports/item-movements?from=&to=&storeId=
   GET /reports/period-closes
   POST /reports/period-closes/close   {period: YYYY-MM}
   POST /reports/period-closes/open    {period: YYYY-MM}
   ============================================ */
import express from 'express'
import { getPool } from '../config/db.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import {
  trialBalance, generalLedger, incomeStatement, balanceSheet,
  itemMovements, closePeriod, openPeriod, accountByCode,
} from '../engine/accounting.js'
import { auditLog } from '../middleware/audit.js'

const router = express.Router()

router.get('/trial-balance', requireAuth, requirePermission('reports.read'), async (req, res, next) => {
  try {
    const conn = await getPool().connect()
    try {
      const to = req.query.to || null
      const rows = await trialBalance(conn, to)
      let totalDebit = 0, totalCredit = 0
      const mapped = rows.map(r => {
        const debit = Number(r.debit || 0)
        const credit = Number(r.credit || 0)
        totalDebit += debit; totalCredit += credit
        const bal = r.balance_direction === 'credit' ? credit - debit : debit - credit
        return { ...r, balance: Number(bal.toFixed(2)) }
      })
      res.json({ to_date: to, accounts: mapped, total_debit: Number(totalDebit.toFixed(2)), total_credit: Number(totalCredit.toFixed(2)) })
    } finally { conn.release() }
  } catch (err) { next(err) }
})

router.get('/general-ledger/:accountId', requireAuth, requirePermission('reports.read'), async (req, res, next) => {
  try {
    const conn = await getPool().connect()
    try {
      const id = Number(req.params.accountId)
      const from = req.query.from || null
      const to = req.query.to || null
      const acc = await conn.query('SELECT * FROM chart_of_accounts WHERE id = $1', [id])
      if (!acc.rows[0]) return res.status(404).json({ error: 'الحساب غير موجود' })
      const moves = await generalLedger(conn, id, from, to)
      const bal = await (async () => {
        const cond = []
        const params = [id]
        if (from) { params.push(from); cond.push(`je.entry_date < $${params.length}`) }
        const where = cond.length ? `WHERE ${cond.join(' AND ')}` : ''
        const r = await conn.query(`
          SELECT COALESCE(SUM(jl.debit),0)::numeric(18,2) AS debit, COALESCE(SUM(jl.credit),0)::numeric(18,2) AS credit
          FROM journal_lines jl
          JOIN journal_entries je ON je.id = jl.entry_id AND je.posted
          WHERE jl.account_id = $1 ${where}`, params)
        return Number((Number(r.rows[0].debit) - Number(r.rows[0].credit)).toFixed(2))
      })()
      res.json({ account: acc.rows[0], opening_balance: bal, movements: moves, from, to })
    } finally { conn.release() }
  } catch (err) { next(err) }
})

router.get('/income-statement', requireAuth, requirePermission('reports.read'), async (req, res, next) => {
  try {
    const conn = await getPool().connect()
    try {
      const from = req.query.from || null
      const to = req.query.to || null
      const rows = await incomeStatement(conn, from, to)
      const revenue = rows.filter(r => r.type === 'revenue').reduce((a, r) => a + Number(r.credit) - Number(r.debit), 0)
      const expense = rows.filter(r => r.type === 'expense').reduce((a, r) => a + Number(r.debit) - Number(r.credit), 0)
      res.json({ from, to, rows, revenue: Number(revenue.toFixed(2)), expense: Number(expense.toFixed(2)), net_income: Number((revenue - expense).toFixed(2)) })
    } finally { conn.release() }
  } catch (err) { next(err) }
})

router.get('/balance-sheet', requireAuth, requirePermission('reports.read'), async (req, res, next) => {
  try {
    const conn = await getPool().connect()
    try {
      const to = req.query.to || null
      const { rows, netProfit } = await balanceSheet(conn, to)
      const asset = rows.filter(r => r.type === 'asset').reduce((a, r) => a + Number(r.debit) - Number(r.credit), 0)
      const liability = rows.filter(r => r.type === 'liability').reduce((a, r) => a + Number(r.credit) - Number(r.debit), 0)
      const equity = rows.filter(r => r.type === 'equity').reduce((a, r) => a + Number(r.credit) - Number(r.debit), 0)
      res.json({
        to_date: to, rows,
        total_assets: Number(asset.toFixed(2)),
        total_liabilities: Number(liability.toFixed(2)),
        total_equity: Number(equity.toFixed(2)),
        net_profit: Number(netProfit.toFixed(2)),
        check: Number((asset - liability - equity - netProfit).toFixed(2)) === 0,
      })
    } finally { conn.release() }
  } catch (err) { next(err) }
})

router.get('/item-movements', requireAuth, requirePermission('reports.read'), async (req, res, next) => {
  try {
    const conn = await getPool().connect()
    try {
      const from = req.query.from || null
      const to = req.query.to || null
      const storeId = req.query.storeId ? Number(req.query.storeId) : null
      const rows = await itemMovements(conn, from, to, storeId)
      res.json({ from, to, store_id: storeId, rows })
    } finally { conn.release() }
  } catch (err) { next(err) }
})

router.get('/period-closes', requireAuth, requirePermission('reports.read'), async (req, res, next) => {
  try {
    const conn = await getPool().connect()
    try {
      const rows = await conn.query(`
        SELECT pc.*, u.username AS closed_by_name
        FROM period_closes pc LEFT JOIN users u ON u.id = pc.closed_by
        ORDER BY pc.period DESC`,
      )
      res.json(rows.rows)
    } finally { conn.release() }
  } catch (err) { next(err) }
})

router.post('/period-closes/close', requireAuth, requirePermission('reports.close'), async (req, res, next) => {
  try {
    const conn = await getPool().connect()
    try {
      const { period } = req.body
      if (!/^\d{4}-\d{2}$/.test(period || '')) return res.status(400).json({ error: 'صيغة الفترة يجب أن تكون YYYY-MM' })
      const r = await closePeriod(conn, period, req.user.id)
      await auditLog(req, 'period.close', 'period_close', null, { period })
      res.json(r)
    } finally { conn.release() }
  } catch (err) { next(err) }
})

router.post('/period-closes/open', requireAuth, requirePermission('reports.close'), async (req, res, next) => {
  try {
    const conn = await getPool().connect()
    try {
      const { period } = req.body
      if (!/^\d{4}-\d{2}$/.test(period || '')) return res.status(400).json({ error: 'صيغة الفترة يجب أن تكون YYYY-MM' })
      const r = await openPeriod(conn, period, req.user.id)
      await auditLog(req, 'period.open', 'period_close', null, { period })
      res.json(r)
    } finally { conn.release() }
  } catch (err) { next(err) }
})

export default router
