import pg from 'pg'
const pool = new pg.Pool({ host:'localhost', port:5432, database:'sharaf_test', user:'postgres', password:'postgres' })
const conn = await pool.connect()
await conn.query('BEGIN')
await conn.query('SAVEPOINT je')
let rows
try {
  const r = await conn.query(`INSERT INTO journal_entries (entry_no, entry_date, description, ref_kind, ref_id, posted, locked, created_by) VALUES ($1,$2,$3,$4,$5,$6,false,$7) RETURNING id`, ['JE-EX1','2026-08-17','t','purchase',1,true,1])
  rows = r.rows
} catch (e) {
  if (e.code === '23505') {
    await conn.query('ROLLBACK TO SAVEPOINT je')
    const r = await conn.query(`INSERT INTO journal_entries (entry_no, entry_date, description, ref_kind, ref_id, posted, locked, created_by) VALUES ($1,$2,$3,$4,$5,$6,false,$7) RETURNING id`, ['JE-EX4','2026-08-17','t','purchase',1,true,1])
    rows = r.rows
    console.log('[RETRY OK] id=', rows[0].id)
  }
}
console.log('entryId=', rows[0].id)
await conn.query('COMMIT')
await pool.end()
