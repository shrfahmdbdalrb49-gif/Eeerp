import pg from 'pg'
const pool = new pg.Pool({ host:'localhost', port:5432, database:'sharaf_test', user:'postgres', password:'postgres' })
const c = await pool.connect()
// 1) بدون BEGIN
const r1 = await c.query(`INSERT INTO journal_entries (entry_no, entry_date, description, ref_kind, ref_id, posted, locked, created_by) VALUES ($1,$2,$3,$4,$5,$6,false,$7) RETURNING id`, ['JE-T3','2026-08-17','t','purchase',2,true,1])
console.log('r1 type:', typeof r1, r1 ? (r1.rows ? 'has rows' : 'no rows prop, keys='+Object.keys(r1)) : 'null')
await c.query('DELETE FROM journal_entries WHERE entry_no=$1', ['JE-T3'])
// 2) مع BEGIN
await c.query('BEGIN')
const r2 = await c.query(`INSERT INTO journal_entries (entry_no, entry_date, description, ref_kind, ref_id, posted, locked, created_by) VALUES ($1,$2,$3,$4,$5,$6,false,$7) RETURNING id`, ['JE-T4','2026-08-17','t','purchase',2,true,1])
console.log('r2 type:', typeof r2, r2 ? (r2.rows ? 'has rows' : 'no rows prop, keys='+Object.keys(r2)) : 'null')
await c.query('ROLLBACK')
await pool.end()
