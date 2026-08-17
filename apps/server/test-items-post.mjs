/* اختبار مباشرة: محاكاة items.routes POST مع DB sharaf_test */
process.env.DB_NAME = 'sharaf_test'
process.env.DB_SSL = '0'
process.env.DB_USER = 'postgres'
process.env.DB_PASSWORD = 'postgres'
process.env.DB_HOST = 'localhost'

import { query, queryOne } from './config/db.js'

const barcode = 'QA-8173'
console.log('1. check barcode exists')
const exists = await queryOne('SELECT id FROM items WHERE barcode = $1', [barcode])
console.log('exists:', exists)

console.log('2. insert item')
const { rows } = await query(
  `INSERT INTO items (code, barcode, name, name_en, unit, category, purchase_unit_cost,
   sale_price, min_stock, taxable, tax_rate, profit_account_id, purchase_account_id, inventory_account_id, cogs_account_id, active)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,true) RETURNING *`,
  [null, barcode, 'باراستيامول 500مجم', null, 'شريط', null, 300, 500, 0, false, 0, null, null, null, null],
)
console.log('inserted:', rows[0].id, rows[0].name)
console.log('DONE')
process.exit(0)
