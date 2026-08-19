/* ============================================
   شرف ERP - الخادم المركزي
   API كامل + PostgreSQL + JWT + RBAC + محاسبة مزدوجة
   ============================================ */
import express from 'express'
import { getPool } from './config/db.js'
import { requireAuth, requirePermission } from './middleware/auth.js'
import { autoSetup } from './auto-setup.js'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import './config/db.js'
import authRoutes from './routes/auth.routes.js'
import usersRoutes from './routes/users.routes.js'
import accountsRoutes from './routes/accounts.routes.js'
import itemsRoutes from './routes/items.routes.js'
import purchasesRoutes from './routes/purchases.routes.js'
import salesRoutes from './routes/sales.routes.js'
import collectionsRoutes from './routes/collections.routes.js'
import supplierPaymentsRoutes from './routes/supplierPayments.routes.js'
import journalsRoutes from './routes/journals.routes.js'
import transfersRoutes from './routes/transfers.routes.js'
import reportsRoutes from './routes/reports.routes.js'
import auditRoutes from './routes/audit.routes.js'
import setupRoutes from './routes/setup.routes.js'
import { branchesRouter, storesRouter, cashBoxesRouter, customersRouter, suppliersRouter, rolesRouter } from './routes/misc.routes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '2mb' }))

app.get('/health', (req, res) => res.json({ ok: true, name: 'Sharaf ERP API', build: 'v98c-local', ts: new Date().toISOString() }))
app.get('/api/health', (req, res) => res.json({ ok: true, name: 'Sharaf ERP API', build: 'v98c-local', ts: new Date().toISOString() }))

/* جميع نقاط API تحت /api */
app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/roles', rolesRouter)
app.use('/api/accounts', accountsRoutes)
app.use('/api/items', itemsRoutes)
app.use('/api/purchases', purchasesRoutes)
app.use('/api/sales', salesRoutes)
app.use('/api/collections', collectionsRoutes)
app.use('/api/supplier-payments', supplierPaymentsRoutes)
app.use('/api/journals', journalsRoutes)
app.use('/api/transfers', transfersRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/setup', setupRoutes)
app.use('/api/branches', branchesRouter)
app.use('/api/stores', storesRouter)
app.use('/api/cash-boxes', cashBoxesRouter)
app.use('/api/customers', customersRouter)
app.use('/api/suppliers', suppliersRouter)

/* الدفعات: GET يرجع قائمة الدفعات مع المتاح حاليًا من حركات المخزون */
app.get('/api/batches', requireAuth, requirePermission('items.read'), async (req, res, next) => {
  try {
    const conn = await getPool().connect()
    try {
      const { rows } = await conn.query(`
        SELECT b.*, i.name AS item_name,
          COALESCE((SELECT SUM(m.quantity) FROM stock_movements m WHERE m.batch_id = b.id AND m.movement_type = 'in'), 0)
            - COALESCE((SELECT SUM(m.quantity) FROM stock_movements m WHERE m.batch_id = b.id AND m.movement_type = 'out'), 0)
            AS qty,
          COALESCE((SELECT json_agg(m) FROM stock_movements m WHERE m.batch_id = b.id), '[]'::json) AS movements
        FROM batches b JOIN items i ON i.id = b.item_id ORDER BY b.id DESC LIMIT 500`)
      res.json(rows)
    } finally { conn.release() }
  } catch (err) { next(err) }
})

/* نقاط إضافية تطلبها الواجهة (بنود الجداول + مرجعات المبيعات + التحويلات + الوصفات) */
const readTable = (path, table, perm, sortCol) => {
  app.get('/api/' + path, requireAuth, requirePermission(perm + '.read'), async (req, res, next) => {
    try {
      const rows = await (await getPool().connect()).query(`SELECT * FROM ${table} ORDER BY ${sortCol} DESC LIMIT 5000`)
      res.json(rows.rows)
    } catch (err) { next(err) }
  })
}
readTable('sales/return-lines', 'sales_return_lines', 'sales', 'id')
readTable('purchases/lines', 'purchase_lines', 'purchases', 'id')
readTable('journals/lines', 'journal_lines', 'journals', 'id')
readTable('transfers', 'transfers', 'transfers', 'id')
readTable('transfer-lines', 'transfer_lines', 'transfers', 'id')
readTable('doctors', 'doctors', 'prescriptions', 'id')
readTable('prescriptions', 'prescriptions', 'prescriptions', 'id')
readTable('prescription-lines', 'prescription_lines', 'prescriptions', 'id')
readTable('held-invoices', 'held_invoices', 'sales', 'id')
app.get('/api/sales-returns', requireAuth, requirePermission('sales.read'), async (req, res, next) => {
  try {
    const conn = await getPool().connect()
    try {
      const rows = await conn.query(`SELECT r.*, c.name AS customer_name, s.invoice_no AS original_invoice_no
        FROM sales_returns r
        LEFT JOIN customers c ON c.id = r.customer_id
        LEFT JOIN sales_invoices s ON s.id = r.original_invoice_id
        ORDER BY r.id DESC LIMIT 500`)
      res.json(rows.rows)
    } finally { conn.release() }
  } catch (err) { next(err) }
})
app.post('/api/sales-returns', (req, res, next) => { req.url = '/returns'; req.baseUrl = ''; salesRoutes(req, res, next) })
app.post('/api/sales-returns/:id/post', (req, res, next) => { req.url = '/returns/' + Number(req.params.id) + '/post'; salesRoutes(req, res, next) })

/* ملفات ثابتة: البناء الأمامي نفسه (مجلد serve بمسارات جذرية) */
const serveDir = join(__dirname, 'serve')
app.use(express.static(serveDir))
/* أي مسار آخر (SPA) يعيد الصفحة الرئيسية */
app.use((req, res, next) => {
  if (!req.accepts('html')) return next()
  res.sendFile(join(serveDir, 'index.html'))
})

/* خطأ 404 */
app.use((req, res) => res.status(404).json({ error: 'endpoint not found: ' + req.originalUrl }))

/* معالج الأخطاء العام */
app.use((err, req, res, next) => {
  console.error('[ERR]', err?.message || err); if (err?.stack) console.error('   ', err.stack.split('\n').slice(1, 4).join(' '))
  res.status(err?.status || 500).json({ error: err?.message || 'خطأ داخلي في الخادم' })
})

/* التهيئة التلقائية: إنشاء الجداول والبيانات الأولية عند أول تشغيل */
autoSetup(getPool()).catch(() => {})
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Sharaf ERP API listening on port ${PORT}`)
  // إعادة محاولة التهيئة إذا فشلت في أول محاولة
  autoSetup(getPool()).catch(() => {})
})

export default app
