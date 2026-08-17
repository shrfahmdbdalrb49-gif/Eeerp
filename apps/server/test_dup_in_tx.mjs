import pg from 'pg'
const pool = new pg.Pool({ host:'localhost', port:5432, database:'sharaf_test', user:'postgres', password:'postgres' })
const conn = await pool.connect()
await conn.query('BEGIN')
let rows
try {
  const r = await conn.query(`INSERT INTO journal_entries (entry_no, entry_date, description, ref_kind, ref_id, posted, locked, created_by) VALUES ($1,$2,$3,$4,$5,$6,false,$7) RETURNING id`, ['JE-EX1','2026-08-17','t','purchase',1,true,1])
  rows = r
  console.log('[OK] id=', r.rows[0].id)
} catch (e) {
  console.log('[CAUGHT]', e.code, e.message)
  if (e.code === '23505') {
    const r2 = await conn.query(`INSERT INTO journal_entries (entry_no, entry_date, description, ref_kind, ref_id, posted, locked, created_by) VALUES ($1,$2,$3,$4,$5,$6,false,$7) RETURNING id`, ['JE-EX3','2026-08-17','t','purchase',1,true,1])
    rows = r2; console.log('[RETRY OK] id=', r2.rows[0].id)
  }
}
const entryId = rows[0].id
console.log('entryId=', entryId)
await conn.query('ROLLBACK')
await pool.end()
