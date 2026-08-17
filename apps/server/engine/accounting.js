/* ============================================
   شرف ERP - محرك المحاسبة المزدوجة المركزي (الإصدار 2)
   كل عملية (بيع/شراء/تحصيل/سداد/قيد يدوي/إقفال)
   تنتج قيدًا متوازنًا (مدين = دائن) داخل Transaction.
   الحسابات تُحدد بالكود المحاسبي (code) وليس بأرقام تسلسلية ثابتة.
   ============================================ */
import { getPool } from '../config/db.js'

/* ---------- البحث عن حساب بالكود ---------- */
export async function accountByCode(conn, code) {
  const r = await conn.query('SELECT id, code, name, type FROM chart_of_accounts WHERE code = $1 AND active = true', [String(code)])
  if (!r.rows.length) throw Object.assign(new Error(`الحساب المحاسبي غير موجود: ${code}`), { status: 500 })
  return r.rows[0]
}

/* خريطة الحسابات الافتراضية (أكواد محاسبية) — قابلة للتخصيص عبر جدول settings */
export async function acctMap(conn) {
  const map = {
    cash: '1101',        // الصندوق الرئيسي
    petty: '1102',       // الصندوق الفرعي
    bank: '1103',        // البنك
    customer_ar: '1104', // ذمم العملاء المدينة
    inventory: '1105',   // المخزون
    supplier_ap: '2101', // ذمم الموردين الدائنة
    capital: '3101',     // رأس المال
    retained: '3102',    // الأرباح المحتجزة
    revenue: '4101',     // إيرادات المبيعات
    sales_ret: '4102',   // مردودات ومقاصة المبيعات (revenue معكوسة)
    other_revenue: '4103',
    cogs: '5101',        // تكلفة الأصناف المباعة
    sales_refunds: '5102',
    expenses: '5205',    // مصروفات عامة (افتراضي)
  }
  // قراءة التخصيص من settings
  const s = await conn.query("SELECT value FROM settings WHERE key = 'accounting_accounts'")
  if (s.rows[0]) {
    try { const ov = JSON.parse(s.rows[0].value); Object.assign(map, ov) } catch (e) {}
  }
  return map
}

/* تحويل خريطة الأكواد إلى خريطة ids */
export async function acctIds(conn) {
  const codes = await acctMap(conn)
  const ids = {}
  for (const [k, c] of Object.entries(codes)) {
    try { ids[k] = (await accountByCode(conn, c)).id } catch (e) { ids[k] = null }
  }
  return ids
}

/* ---------- أرقام متسلسلة ---------- */
export function nextEntryNo(conn) {
  return conn.query("SELECT nextval('seq_journal_entries') AS n").then(r => 'JE-' + String(r.rows[0].n).padStart(6, '0'))
}
export function nextInvoiceNo(conn) {
  return conn.query("SELECT nextval('seq_sales') AS n").then(r => 'INV-' + String(r.rows[0].n).padStart(5, '0'))
}
export function nextPurchaseNo(conn) {
  return conn.query("SELECT nextval('seq_purchases') AS n").then(r => 'PUR-' + String(r.rows[0].n).padStart(5, '0'))
}
export function nextCollectionNo(conn) {
  return conn.query("SELECT nextval('seq_collections') AS n").then(r => 'COL-' + String(r.rows[0].n).padStart(5, '0'))
}
export function nextSupplierPayNo(conn) {
  return conn.query("SELECT nextval('seq_supplier_payments') AS n").then(r => 'SPL-' + String(r.rows[0].n).padStart(5, '0'))
}
export function nextReturnNo(conn) {
  return conn.query("SELECT nextval('seq_sales_returns') AS n").then(r => 'RET-' + String(r.rows[0].n).padStart(5, '0'))
}

/* ---------- إدخال قيد مزدوج متوازن ---------- */
export async function insertJournalEntry(conn, { entryNo, entryDate, description, refKind, refId, userId, lines, posted = true }) {
  const debit = lines.reduce((s, l) => s + Number(l.debit || 0), 0)
  const credit = lines.reduce((s, l) => s + Number(l.credit || 0), 0)
  if (Math.round((debit - credit) * 100) !== 0) {
    throw Object.assign(new Error(`القيد غير متوازن: مدين ${debit} مقابل دائن ${credit}`), { status: 400 })
  }
  /* 1. لا يُسمح بالترحيل في فترة مقفلة (إذا كانت entry_date تمر) */
  const ed = entryDate || null
  const closed2 = await conn.query("SELECT period FROM period_closes WHERE period <= to_char(to_date(COALESCE($1, current_date::text), 'YYYY-MM-DD'), 'YYYY-MM')", [ed]).catch(() => ({ rows: [] }))
  if (closed2.rows.length) {
    throw Object.assign(new Error(`الفترة المحاسبية مقفلة: ${closed2.rows[0].period} - لا يمكن إنشاء قيد في هذه الفترة`), { status: 423 })
  }
  let rows
  let entryId
  // ملاحظة: داخل معاملة Postgres، أي خطأ يجعلها "aborted"، لذا retry يجب أن يتم عبر SAVEPOINT
  try {
    const r = await conn.query(
      `INSERT INTO journal_entries (entry_no, entry_date, description, ref_kind, ref_id, posted, locked, created_by)
       VALUES ($1, COALESCE($2, current_date), $3, $4, $5, $6, false, $7) RETURNING id`,
      [entryNo, ed, description, refKind, refId != null ? Number(refId) : null, posted, userId],
    )
    rows = r.rows
  } catch (e) {
    if (e.code === '23505') {
      // رقم القيد مكرر (التسلسل استُهلك في محاولة فاشلة سابقة) — توليد رقم جديد عبر SAVEPOINT
      await conn.query('SAVEPOINT je_dup')
      try {
        const r = await conn.query(
          `INSERT INTO journal_entries (entry_no, entry_date, description, ref_kind, ref_id, posted, locked, created_by)
           VALUES ($1, COALESCE($2, current_date), $3, $4, $5, $6, false, $7) RETURNING id`,
          ['JE-' + String(100000 + Math.floor(Math.random() * 900000)), entryDate, description, refKind, refId != null ? Number(refId) : null, posted, userId],
        )
        rows = r.rows
      } catch (e2) {
        await conn.query('ROLLBACK TO SAVEPOINT je_dup').catch(() => {})
        console.error('[JE-ERR]', e2?.message, e2?.detail || '')
        throw e2
      }
    } else {
      console.error('[JE-ERR]', e?.message, e?.detail || '', e?.stack?.split('\n').slice(1, 3).join(' | '))
      throw e
    }
  }
  entryId = rows[0].id
  for (const l of lines) {
    if (l.debit == null && l.credit == null) continue
    await conn.query(
      `INSERT INTO journal_lines (entry_id, account_id, description, debit, credit)
       VALUES ($1, $2, $3, $4, $5)`,
      [entryId, Number(l.account_id), l.description || null, Number(l.debit || 0), Number(l.credit || 0)],
    )
  }
  return entryId
}

/* ---------- إقفال الفترات ---------- */
export async function closePeriod(conn, period, userId) {
  const existing = await conn.query('SELECT id FROM period_closes WHERE period = $1', [period])
  if (existing.rows.length) throw Object.assign(new Error(`الفترة ${period} مقفلة مسبقًا`), { status: 409 })
  await conn.query(`UPDATE journal_entries SET locked = true WHERE entry_date < (to_date($1, 'YYYY-MM') + interval '1 month')`, [period])
  await conn.query('INSERT INTO period_closes (period, closed_by) VALUES ($1, $2)', [period, userId])
  return { ok: true, period }
}

export async function openPeriod(conn, period, userId) {
  const r = await conn.query('DELETE FROM period_closes WHERE period = $1 RETURNING id', [period])
  if (!r.rows.length) throw Object.assign(new Error(`الفترة ${period} غير مقفلة أصلًا`), { status: 404 })
  await conn.query("UPDATE journal_entries SET locked = false WHERE entry_date < (to_date($1, 'YYYY-MM') + interval '1 month')", [period])
  return { ok: true, period }
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
    WHERE jl.account_id = $1 AND je.posted ${toQ}
  `
  const r = await conn.query(sql, params)
  return r.rows[0]
}

/* ميزان المراجعة (كل الحسابات بأرصدة مراكمة) */
export async function trialBalance(conn, to) {
  const toQ = to ? `AND je.entry_date <= $1` : ''
  const params = to ? [to] : []
  const sql = `
    SELECT ca.id AS account_id, ca.code, ca.number, ca.name, ca.type, ca.balance_direction,
           COALESCE(SUM(jl.debit),0)::numeric(18,2) AS debit,
           COALESCE(SUM(jl.credit),0)::numeric(18,2) AS credit
    FROM chart_of_accounts ca
    LEFT JOIN journal_lines jl ON jl.account_id = ca.id
    LEFT JOIN journal_entries je ON je.id = jl.entry_id AND je.posted ${toQ ? ' AND ' + toQ.replace('AND je.', 'je.') : ''}
    GROUP BY ca.id
    ORDER BY ca.code
  `
  const rows = await conn.query(sql, params)
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
    WHERE jl.account_id = $1 AND je.posted ${where}
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
    SELECT ca.type, ca.id AS account_id, ca.code, ca.number, ca.name,
           COALESCE(SUM(jl.debit),0)::numeric(18,2) AS debit,
           COALESCE(SUM(jl.credit),0)::numeric(18,2) AS credit
    FROM chart_of_accounts ca
    JOIN journal_lines jl ON jl.account_id = ca.id
    JOIN journal_entries je ON je.id = jl.entry_id AND je.posted
    WHERE ca.type IN ('revenue','expense') ${where ? ' AND ' + where.replace('WHERE ','') : ''}
    GROUP BY ca.id
    ORDER BY ca.code
  `, params)
  return rows.rows
}

/* قائمة المركز المالي (ميزانية عمومية) حتى تاريخ معين */
export async function balanceSheet(conn, to) {
  const toQ = to ? `AND je.entry_date <= $1` : ''
  const params = to ? [to] : []
  const rows = await conn.query(`
    SELECT ca.type, ca.id AS account_id, ca.code, ca.number, ca.name,
           COALESCE(SUM(jl.debit),0)::numeric(18,2) AS debit,
           COALESCE(SUM(jl.credit),0)::numeric(18,2) AS credit
    FROM chart_of_accounts ca
    JOIN journal_lines jl ON jl.account_id = ca.id
    JOIN journal_entries je ON je.id = jl.entry_id AND je.posted ${toQ}
    WHERE ca.type IN ('asset','liability','equity')
    GROUP BY ca.id
    ORDER BY ca.code
  `, params)
  /* صافي الربح/الخسارة من قائمة الدخل يضاف للأرباح المحتجزة */
  const isRows = await incomeStatement(conn, null, to || null)
  const revenue = isRows.filter(r => r.type === 'revenue').reduce((s, r) => s + Number(r.credit) - Number(r.debit), 0)
  const expense = isRows.filter(r => r.type === 'expense').reduce((s, r) => s + Number(r.debit) - Number(r.credit), 0)
  const netProfit = revenue - expense
  return { rows: rows.rows, netProfit }
}

/* حركة الأصناف: كميات وقيمة (وارد/صادر/رصيد) لفترة */
export async function itemMovements(conn, from, to, storeId) {
  const cond = []
  const params = []
  if (from) { params.push(from); cond.push(`sm.created_at::date >= $${params.length}`) }
  if (to) { params.push(to); cond.push(`sm.created_at::date <= $${params.length}`) }
  if (storeId) { params.push(Number(storeId)); cond.push(`sm.store_id = $${params.length}`) }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : ''
  const rows = await conn.query(`
    SELECT sm.item_id, i.name AS item_name, i.barcode, i.unit,
           COALESCE(SUM(CASE WHEN sm.movement_type='in' THEN sm.quantity ELSE 0 END),0)::numeric(18,3) AS qty_in,
           COALESCE(SUM(CASE WHEN sm.movement_type='out' THEN ABS(sm.quantity) ELSE 0 END),0)::numeric(18,3) AS qty_out,
           COALESCE(SUM(sm.quantity),0)::numeric(18,3) AS qty_net,
           COALESCE(SUM(CASE WHEN sm.movement_type='in' THEN sm.quantity*sm.unit_cost ELSE -sm.quantity*sm.unit_cost END),0)::numeric(18,2) AS value_net
    FROM stock_movements sm
    JOIN items i ON i.id = sm.item_id
    ${where}
    GROUP BY sm.item_id, i.name, i.barcode, i.unit
    ORDER BY i.name
  `, params)
  return rows.rows
}

export default {
  accountByCode, acctMap, acctIds,
  nextEntryNo, nextInvoiceNo, nextPurchaseNo, nextCollectionNo, nextSupplierPayNo, nextReturnNo,
  insertJournalEntry, closePeriod, openPeriod,
  accountBalance, trialBalance, generalLedger, incomeStatement, balanceSheet, itemMovements,
}
