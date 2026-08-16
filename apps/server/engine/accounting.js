/* ============================================
   شرف ERP - محرك المحاسبة المزدوجة المركزي
   كل عملية (بيع/شراء/تحصيل/سداد/قيد يدوي/إقفال)
   تُنتج قيدًا متوازنًا (مدين = دائن) داخل Transaction.
   ============================================ */
import { getPool } from '../config/db.js'

export function nextEntryNo(conn) {
  return conn.query('SELECT nextval($1) AS n', ['seq_journal_entries']).then(r => 'JE-' + String(r.rows[0].n).padStart(6, '0'))
}

/* إدخال قيد مزدوج متوازن - يرمي خطأً إن لم يتوازن */
export async function insertJournalEntry(conn, { entryNo, entryDate, description, refKind, refId, userId, lines, posted = true }) {
  const debit = lines.reduce((s, l) => s + Number(l.debit || 0), 0)
  const credit = lines.reduce((s, l) => s + Number(l.credit || 0), 0)
  if (Math.abs(debit - credit) > 0.01) {
    throw Object.assign(new Error(`القيد غير متوازن: مدين ${debit} مقابل دائن ${credit}`), { status: 400 })
  }
  const { rows } = await conn.query(
    `INSERT INTO journal_entries (entry_no, entry_date, description, ref_kind, ref_id, posted, locked, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, false, $7) RETURNING id`,
    [entryNo, entryDate, description, refKind, refId != null ? Number(refId) : null, posted, userId],
  )
  const entryId = rows[0].id
  for (const l of lines) {
    await conn.query(
      `INSERT INTO journal_lines (entry_id, account_id, description, debit, credit)
       VALUES ($1, $2, $3, $4, $5)`,
      [entryId, Number(l.account_id), l.description || null, Number(l.debit || 0), Number(l.credit || 0)],
    )
  }
  return entryId
}

/* ---------- تقارير ---------- */
/* رصيد كل حساب حتى تاريخ معين */
export async function accountBalance(conn, accountId, to) {
  const toQ = to ? `AND je.entry_date <= $2` : ''
  const params = to ? [accountId, to] : [accountId]
  const sql = `
    SELECT COALESCE(SUM(jl.debit),0)::numeric(18,2) AS debit,
           COALESCE(SUM(jl.credit),0)::numeric(18,2) AS credit
    FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.entry_id
    WHERE jl.account_id = $1 AND je.posted AND NOT je.locked ${toQ}
  `
  const r = await conn.query(sql, params)
  return r.rows[0]
}

/* ميزان المراجعة */
export async function trialBalance(conn, to) {
  const toQ = to ? `AND je.entry_date <= $1` : ''
  const params = to ? [to] : []
  const rows = await conn.query(`
    SELECT jl.account_id,
           COALESCE(SUM(jl.debit),0)::numeric(18,2) AS debit,
           COALESCE(SUM(jl.credit),0)::numeric(18,2) AS credit
    FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.entry_id
    WHERE je.posted AND NOT je.locked ${toQ}
    GROUP BY jl.account_id
  `, params)
  return rows.rows
}

/* الأستاذ العام لحساب واحد */
export async function generalLedger(conn, accountId, from, to) {
  const cond = []
  const params = [accountId]
  if (from) { params.push(from); cond.push(`je.entry_date >= $${params.length}`) }
  if (to) { params.push(to); cond.push(`je.entry_date <= $${params.length}`) }
  const where = cond.length ? `AND ${cond.join(' AND ')}` : ''
  const rows = await conn.query(`
    SELECT je.id AS entry_id, je.entry_no, je.entry_date, je.description, je.ref_kind, je.ref_id,
           jl.id AS line_id, jl.description AS line_desc, jl.debit, jl.credit
    FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.entry_id
    WHERE jl.account_id = $1 AND je.posted AND NOT je.locked ${where}
    ORDER BY je.entry_date, je.id, jl.id
  `, params)
  return rows.rows
}

/* قائمة الدخل (إيرادات ومصروفات) لفترة معينة */
export async function incomeStatement(conn, from, to) {
  const cond = []
  const params = []
  if (from) { params.push(from); cond.push(`je.entry_date >= $${params.length}`) }
  if (to) { params.push(to); cond.push(`je.entry_date <= $${params.length}`) }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : ''
  const rows = await conn.query(`
    SELECT ca.type, ca.id AS account_id, ca.code, ca.name,
           COALESCE(SUM(jl.debit),0)::numeric(18,2) AS debit,
           COALESCE(SUM(jl.credit),0)::numeric(18,2) AS credit
    FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.entry_id
    JOIN chart_of_accounts ca ON ca.id = jl.account_id
    WHERE ca.type IN ('revenue','expense') AND je.posted AND NOT je.locked ${where ? ' AND ' + where.replace('WHERE ','') : ''}
    GROUP BY ca.id
    ORDER BY ca.code
  `, params)
  return rows.rows
}

/* ---------- إغلاق الفترات ---------- */
export async function closePeriod(conn, period, userId) {
  const existing = await conn.query('SELECT id FROM period_closes WHERE period = $1', [period])
  if (existing.rows.length) throw Object.assign(new Error(`الفترة ${period} مقفلة مسبقًا`), { status: 409 })
  await conn.query(`UPDATE journal_entries SET locked = true WHERE entry_date < (to_date($1,'YYYY-MM') + interval '1 month')`, [period])
  await conn.query('INSERT INTO period_closes (period, closed_by) VALUES ($1, $2)', [period, userId])
  return { ok: true, period }
}

export default { nextEntryNo, insertJournalEntry, accountBalance, trialBalance, generalLedger, incomeStatement, closePeriod }
