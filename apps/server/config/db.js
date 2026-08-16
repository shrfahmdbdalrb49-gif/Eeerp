/* ============================================
   اتصال PostgreSQL المركزي (pool)
   DATABASE_URL أو مفردات منفصلة
   ============================================ */
import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'sharaf_erp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === '1' || process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 10,
})

pool.on('error', (err) => {
  console.error('[DB pool error]', err.message)
})

export function getPool() {
  return pool
}

export async function query(sql, params = []) {
  const res = await pool.query(sql, params)
  return res.rows
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params)
  return rows[0] || null
}

export default { getPool, query, queryOne }
