import pg from 'pg'
const pool = new pg.Pool({ host:'localhost', port:5432, database:'sharaf_test', user:'postgres', password:'postgres' })
const c = await pool.connect()
await c.query('BEGIN')
const r = await c.query(`INSERT INTO journal_entries (entry_no, entry_date, description, ref_kind, ref_id, posted, locked, created_by) VALUES ($1,$2,$3,$4,$5,$6,false,$7) RETURNING id`, ['JE-T2','2026-08-17','t','purchase',2,true,1])
let rows = r
console.log('DBG-INS id=', rows[0].id)
for (const l of [{account_id:16, debit:3000, credit:0}, {account_id:20, debit:0, credit:3000}]) {
  if (l.debit == null && l.credit == null) continue
  await c.query(`INSERT INTO journal_lines (entry_id, account_id, description, debit, credit) VALUES ($1,$2,$3,$4,$5)`, [rows[0].id, Number(l.account_id), l.description||null, Number(l.debit||0), Number(l.credit||0)])
}
await c.query('UPDATE purchases SET status=$1, posted=true WHERE id=$2', ['received', 2])
await c.query('INSERT INTO stock_movements (item_id, batch_id, store_id, movement_type, quantity, unit_cost, ref_kind, ref_id, created_by) VALUES ($1,NULL,$2,$3,$4,$5,$6,$7,$8)', [1,1,'in',100,300,'purchase',2,1])
await c.query('COMMIT')
console.log('OK')
await pool.end()
