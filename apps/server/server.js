/* ============================================
   شرف ERP - الخادم المركزي
   API كامل + PostgreSQL + JWT + RBAC + محاسبة مزدوجة
   ============================================ */
import express from 'express'
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
import reportsRoutes from './routes/reports.routes.js'
import auditRoutes from './routes/audit.routes.js'
import { branchesRouter, storesRouter, cashBoxesRouter, customersRouter, suppliersRouter, rolesRouter } from './routes/misc.routes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '2mb' }))

app.get('/health', (req, res) => res.json({ ok: true, name: 'Sharaf ERP API', ts: new Date().toISOString() }))

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
app.use('/api/reports', reportsRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/branches', branchesRouter)
app.use('/api/stores', storesRouter)
app.use('/api/cash-boxes', cashBoxesRouter)
app.use('/api/customers', customersRouter)
app.use('/api/suppliers', suppliersRouter)

/* ملفات ثابتة: البناء الأمامي نفسه (اختياري) */
app.use(express.static(join(__dirname, '..', 'dist')))

/* خطأ 404 */
app.use((req, res) => res.status(404).json({ error: 'endpoint not found: ' + req.originalUrl }))

/* معالج الأخطاء العام */
app.use((err, req, res, next) => {
  console.error('[ERR]', err?.message || err)
  res.status(err?.status || 500).json({ error: err?.message || 'خطأ داخلي في الخادم' })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Sharaf ERP API listening on port ${PORT}`)
})

export default app
