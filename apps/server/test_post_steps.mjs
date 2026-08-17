/* تشخيص خطوة بخطوة: post purchase عبر pg مباشرة */
import pg from 'pg'
const pool = new pg.Pool({
  host: 'localhost', port: 5432, database: 'sharaf_test',
  user: 'postgres', password: 'postgres',
})
const conn = await pool.connect()
const step = async (name, fn) => {
  try {
    const r = await fn()
    console.log(`✅ ${name}`, JSON.stringify(r).slice(0, 150))
    return r
  } catch (e) {
    console.log(`❌ ${name}: ${e.message} | ${e.detail || ''}`)
    throw e
  }
}

const pid = (await step('get purchase', () => conn.query('SELECT id FROM purchases ORDER BY id DESC LIMIT 1'))).rows[0]?.id
console.log('pid =', pid)
if (!pid) { console.log('لا توجد فواتير شراء'); process.exit(1) }

await step('BEGIN', () => conn.query('BEGIN'))
await step('SELECT FOR UPDATE', () => conn.query('SELECT * FROM purchases WHERE id = $1 FOR UPDATE', [pid]))
await step('SELECT lines', () => conn.query('SELECT * FROM purchase_lines WHERE purchase_id = $1', [pid]))
await step('SELECT items', () => conn.query('SELECT id, name FROM items WHERE id = ANY($1::int[])', [[1]]))
await step('nextEntryNo', () => conn.query("SELECT nextval('seq_journal_entries') AS n"))
await step('acctMap settings', () => conn.query("SELECT value FROM settings WHERE key = 'accounting_accounts'"))
await step('accountByCode 1105', () => conn.query('SELECT id FROM chart_of_accounts WHERE code = $1 AND active = true', ['1105']))
await step('accountByCode 2101', () => conn.query('SELECT id FROM chart_of_accounts WHERE code = $1 AND active = true', ['2101']))
await step('period_closes', () => conn.query("SELECT period FROM period_closes WHERE entry_date < (to_date($1, 'YYYY-MM') + interval '1 month')", ['2026-08-17']))
await step('INSERT journal_entries', () => conn.query(
  `INSERT INTO journal_entries (entry_no, entry_date, description, ref_kind, ref_id, posted, locked, created_by)
   VALUES ($1, $2, $3, $4, $5, $6, false, $7) RETURNING id`,
  ['JE-TEST', '2026-08-17', 'test', 'purchase', pid, true, 1]))
await step('INSERT stock_movement', () => conn.query(
  `INSERT INTO stock_movements (item_id, batch_id, store_id, movement_type, quantity, unit_cost, ref_kind, ref_id, created_by)
   VALUES (1, NULL, 1, 'in', 100, 300, 'purchase', $1, 1)`, [pid]))
await step('UPDATE purchases', () => conn.query("UPDATE purchases SET status = 'received', posted = true WHERE id = $1", [pid]))
await step('COMMIT', () => conn.query('COMMIT'))
console.log('🎉 الكل نجح')
await pool.end()
process.exit(0)
