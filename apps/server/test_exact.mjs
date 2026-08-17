import pg from 'pg'
const pool = new pg.Pool({ host:'localhost', port:5432, database:'sharaf_test', user:'postgres', password:'postgres' })
const conn = await pool.connect()
let rows
try {
  const r = await conn.query(`INSERT INTO journal_entries (entry_no, entry_date, description, ref_kind, ref_id, posted, locked, created_by) VALUES ($1,$2,$3,$4,$5,$6,false,$7) RETURNING id`, ['JE-EX1','2026-08-17','t','purchase',1,true,1])
  rows = r; console.log('[DBG-INS] inserted id=', r.rows?.[0]?.id, 'rowCount=', r.rowCount)
} catch (e) { console.error('[ERR]', e.message); throw e }
console.log('[DBG2] rows type=', typeof rows, 'rows?', rows ? 'rows.len='+rows.length+' r0='+JSON.stringify(rows[0]) : 'undefined')
const entryId = rows[0].id
console.log('entryId=', entryId)
await conn.query('ROLLBACK')
await pool.end()
