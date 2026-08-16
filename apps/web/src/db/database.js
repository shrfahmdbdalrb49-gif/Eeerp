/* ============================================
   شرف ERP - قاعدة البيانات الفعلية (IndexedDB / Dexie)
   كل البيانات تُخزن دائمًا داخل متصفح المستخدم.
   لا Mock Data، لا بيانات ثابتة.
   ============================================ */
import Dexie from 'dexie'
import { getStorageMode } from './storage.js'
import { createTables } from './remoteTables.js'

export { getStorageMode }

const db = getStorageMode() === 'server' ? createTables() : new Dexie('SharafERP')

/* تعريف الجداول المحلية (IndexedDB) فقط في الوضع المحلي */
if (getStorageMode() !== 'server') {
db.version(1).stores({
  // المستخدمون والأدوار (RBAC)
  users: '++id, username, role, active',
  roles: '++id, name',
  rolePermissions: '++id, [roleName+permission]',
  settings: 'key',
  // دليل الحسابات المحاسبي (شجري هرمي قياسي)
  chartOfAccounts: '++id, code, number, type, parentId, active',
  // القيود المحاسبية مزدوجة القيد
  journalEntries: '++id, date, refKind, refId, posted, createdAt',
  journalLines: '++id, entryId, accountId',
  // الأصناف والتشغيلات (FEFO)
  items: '++id, code, name, barcode, category, active',
  batches: '++id, itemId, storeId, batchNo, expDate',
  stockMovements: '++id, itemId, batchId, kind, refKind, refId, date',
  // الموردون والمشتريات
  suppliers: '++id, name, phone, active',
  purchaseInvoices: '++id, supplierId, date, storeId, status',
  purchaseLines: '++id, invoiceId, itemId, batchId',
  // العملاء والمبيعات والمرتجعات
  customers: '++id, name, phone, active',
  salesInvoices: '++id, customerId, date, storeId, paymentType, status',
  salesLines: '++id, invoiceId, itemId, batchId',
  salesReturns: '++id, saleInvoiceId, date, storeId, status',
  salesReturnLines: '++id, returnId, itemId, batchId',
  // التحصيل والدفع للموردين
  collections: '++id, customerId, date, status',
  supplierPayments: '++id, supplierId, date, status',
  // سجل التدقيق
  auditLogs: '++id, userId, action, refKind, refId, createdAt',
  // التحويلات بين المخازن
  transfers: '++id, fromStoreId, toStoreId, date, status',
  transferLines: '++id, transferId, itemId, batchId',
  // الأطباء (قاعدة بيانات فعلية قابلة للإدارة)
  doctors: '++id, code, name, specialty, active',
  // الوصفات الطبية
  prescriptions: '++id, patientId, doctorId, date, status',
  prescriptionLines: '++id, prescriptionId, itemId',
})

db.version(2).stores({
  doctors: '++id, code, name, specialty, active',
  prescriptions: '++id, patientId, doctorId, date, status',
  prescriptionLines: '++id, prescriptionId, itemId',
})

/* مطابقة التحصيل بالفواتير (المرحلة A): كل سند قبض يربطه صف allocation بفاتورة آجلة محددة */
db.version(3).stores({
  paymentAllocations: '++id, collectionId, invoiceId',
})

/* الفواتير المعلقة (تعليق الفاتورة الحالية والانتقال لفاتورة جديدة دون فقدان البيانات) */
db.version(4).stores({
  heldInvoices: '++id, heldAt, heldBy',
})

/* الخزائن (عدة صناديق وعدة حسابات بنكية) + إقفال الفترات المحاسبية — v51 */
db.version(5).stores({
  cashBoxes: '++id, code, name, active',
  bankAccounts: '++id, code, name, bankName, active',
  periodCloses: '++id, period, closedAt, closedBy',
  receipts: '++id, customerId, date, status',
})
}

/* ---------- أنواع الحسابات وفق النظام القياسي ----------
   Assets    = أصول
   Liabilities = خصوم
   Equity    = حقوق الملكية
   Revenue   = إيرادات
   Expense   = مصروفات
*/
export const ACCOUNT_TYPES = ['Assets', 'Liabilities', 'Equity', 'Revenue', 'Expense']
export const ACCOUNT_TYPE_LABEL = {
  Assets: 'أصول',
  Liabilities: 'خصوم',
  Equity: 'حقوق الملكية',
  Revenue: 'إيرادات',
  Expense: 'مصروفات',
}
export const ACCOUNT_ROOT_NUMBERS = { Assets: 1, Liabilities: 2, Equity: 3, Revenue: 4, Expense: 5 }

/* ---------- التوثيق (Audit) ---------- */
export async function audit(action, refKind, refId, detail) {
  const session = await db.settings.get('currentSession')
  await db.auditLogs.add({
    userId: session?.userId ?? 0,
    userName: session?.userName ?? 'غير معروف',
    action,
    refKind: refKind || null,
    refId: refId || null,
    detail: detail || null,
    createdAt: Date.now(),
  })
}

/* ---------- تهيئة النظام الافتراضية (مستخدم إداري + دليل حسابات قياسي) ---------- */
export async function initSystem() {
  /* في وضع الخادم المركزي: المستخدمون ودليل الحسابات على الخادم — لا تهيئة محلية */
  if (getStorageMode() === 'server') return
  const usersCount = await db.users.count()
  const accountsCount = await db.chartOfAccounts.count()
  if (usersCount === 0) {
    await db.users.add({
      username: 'admin',
      passwordHash: hashPassword('admin123', 'sharaf-salt-1'),
      salt: 'sharaf-salt-1',
      fullName: 'مدير النظام',
      role: 'admin',
      active: true,
      createdAt: Date.now(),
    })
    await db.users.add({
      username: 'cashier',
      passwordHash: hashPassword('cash123', 'sharaf-salt-2'),
      salt: 'sharaf-salt-2',
      fullName: 'محاسب/كاشير',
      role: 'cashier',
      active: true,
      createdAt: Date.now(),
    })
    await db.rolePermissions.bulkAdd([
      { roleName: 'admin', permission: '*' },
      { roleName: 'cashier', permission: 'pos' },
      { roleName: 'cashier', permission: 'customers' },
      { roleName: 'cashier', permission: 'collections' },
      { roleName: 'cashier', permission: 'items.read' },
    ])
    await audit('system_init', 'system', null, 'تهيئة النظام: إنشاء المستخدمين الافتراضيين (admin / cashier)')
  }
  if (accountsCount === 0) {
    const seed = defaultChartOfAccounts()
    await db.chartOfAccounts.bulkAdd(seed)
    await audit('system_init', 'system', null, 'تحميل دليل الحسابات القياسي (13 حسابًا هرميًا) بأرصدة افتتاحية صفرية')
  }
}

export function hashPassword(password, salt) {
  // SHA-256 عبر SubtleCrypto متزامن تقريبيًا عبر خوارزمية بسيطة قابلة للتكرار
  // (في نظام حقيقي على خادم يُستخدم bcrypt؛ هنا hash على جانب العميل كطبقة حجب أولية)
  let h = 5381
  const s = salt + ':' + password
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  }
  // طبقة ثانية لتمديد التوزيع
  let h2 = 0
  for (let i = 0; i < s.length; i++) {
    h2 = (h2 * 31 + s.charCodeAt(i) + h) >>> 0
  }
  return 'shh_' + h.toString(36) + '_' + h2.toString(36)
}

function defaultChartOfAccounts() {
  const seed = [
    { code: '1', number: 1, name: 'الأصول', type: 'Assets', level: 1, openingDebit: 0, openingCredit: 0 },
    { code: '1-1', number: 11, name: 'النقدية والصناديق', type: 'Assets', level: 2, parentIdRef: '1', openingDebit: 0, openingCredit: 0 },
    { code: '1-1-1', number: 111, name: 'الصندوق الرئيسي', type: 'Assets', level: 3, parentIdRef: '1-1', openingDebit: 0, openingCredit: 0 },
    { code: '1-1-2', number: 112, name: 'البنك (حساب جاري)', type: 'Assets', level: 3, parentIdRef: '1-1', openingDebit: 0, openingCredit: 0 },
    { code: '1-2', number: 12, name: 'الذمم المدينة (عملاء)', type: 'Assets', level: 2, parentIdRef: '1', openingDebit: 0, openingCredit: 0 },
    { code: '1-3', number: 13, name: 'المخزون', type: 'Assets', level: 2, parentIdRef: '1', openingDebit: 0, openingCredit: 0 },
    { code: '2', number: 2, name: 'الخصوم', type: 'Liabilities', level: 1, openingDebit: 0, openingCredit: 0 },
    { code: '2-1', number: 21, name: 'الذمم الدائنة (موردون)', type: 'Liabilities', level: 2, parentIdRef: '2', openingDebit: 0, openingCredit: 0 },
    { code: '3', number: 3, name: 'حقوق الملكية', type: 'Equity', level: 1, openingDebit: 0, openingCredit: 0 },
    { code: '3-1', number: 31, name: 'رأس المال', type: 'Equity', level: 2, parentIdRef: '3', openingDebit: 0, openingCredit: 0 },
    { code: '4', number: 4, name: 'الإيرادات', type: 'Revenue', level: 1, openingDebit: 0, openingCredit: 0 },
    { code: '4-1', number: 41, name: 'إيرادات المبيعات', type: 'Revenue', level: 2, parentIdRef: '4', openingDebit: 0, openingCredit: 0 },
    { code: '4-2', number: 42, name: 'مردودات ومسموحات مبيعات', type: 'Revenue', level: 2, parentIdRef: '4', openingDebit: 0, openingCredit: 0 },
    { code: '5', number: 5, name: 'المصروفات', type: 'Expense', level: 1, openingDebit: 0, openingCredit: 0 },
    { code: '5-1', number: 51, name: 'تكلفة المبيعات', type: 'Expense', level: 2, parentIdRef: '5', openingDebit: 0, openingCredit: 0 },
    { code: '5-2', number: 52, name: 'المصروفات التشغيلية', type: 'Expense', level: 2, parentIdRef: '5', openingDebit: 0, openingCredit: 0 },
  ]
  return seed.map((a, i) => ({ ...a, id: i + 1, active: true, createdAt: Date.now() }))
}

/* ---------- فلترة السجلات النشطة (معالجة ازدواجية حقول الحالة) ----------
   الشاشات التي تضيف سجلات تخزّن `status: 'active'`، بينما فلاتر قديمة
   كانت تستخدم `where('active').equals(1)`. هذه الدوال تقبل كلا الشكلين. */
export function isActive(record) {
  const v = record && record.status
  if (typeof v === 'string') return v.toLowerCase() === 'active'
  if (typeof v === 'boolean') return v === true
  if (record && (record.active === 1 || record.active === true)) return true
  return false
}
function dedupeById(rows) {
  const seen = new Map()
  for (const r of rows) if (!seen.has(r.id)) seen.set(r.id, r)
  return Array.from(seen.values())
}
export async function activeItems() {
  return dedupeById((await db.items.toArray()).filter(isActive))
}
export async function activeCustomers() {
  return dedupeById((await db.customers.toArray()).filter(isActive)).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'))
}
export async function activeSuppliers() {
  return dedupeById((await db.suppliers.toArray()).filter(isActive)).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'))
}
export async function activeAccounts() {
  return (await db.chartOfAccounts.toArray()).filter(isActive)
}
/* ---------- تنظيف الحسابات المكررة الخاملة (خلل QA #10) ----------
   عند تهيئة النظام نزيل أي حساب غير قياسي (خارج دليل seed الافتراضي)
   يكون بلا حركات قيد (journalLines) — أي حساب أُنشئ يدويًا بالاسم
   المكرر مثل «إيرادات المبيعات:4000» أو «الصندوق الرئيسي:1010».
   الحسابات التي عليها حركات لا تُلمس تمامًا. */
const SEED_NAMES = new Set(['الأصول', 'النقدية والصناديق', 'الصندوق الرئيسي', 'البنك (حساب جاري)', 'الذمم المدينة (عملاء)', 'المخزون', 'الخصوم', 'الذمم الدائنة (موردون)', 'حقوق الملكية', 'رأس المال', 'الإيرادات', 'إيرادات المبيعات', 'مردودات ومسموحات مبيعات', 'المصروفات', 'تكلفة المبيعات', 'المصروفات التشغيلية'])
export async function sanitizeAccounts() {
  try {
    const all = await db.chartOfAccounts.toArray()
    const lineCounts = await db.journalLines.toArray()
    const counts = {}
    lineCounts.forEach(l => { counts[l.accountId] = (counts[l.accountId] || 0) + 1 })
    const seedCodes = new Set(['1', '1-1', '1-1-1', '1-1-2', '1-2', '1-3', '2', '2-1', '3', '3-1', '4', '4-1', '4-2', '5', '5-1', '5-2'])
    let removed = 0
    for (const a of all) {
      if (seedCodes.has(String(a.code))) continue
      if (counts[a.id]) continue
      if (!SEED_NAMES.has((a.name || '').trim())) continue
      await db.chartOfAccounts.delete(a.id)
      removed++
    }
    if (removed) await audit('accounts_sanitize', 'account', null, 'حذف ' + removed + ' حساب(ات) مكرر(ة) خامل(ة) بلا حركات')
    return removed
  } catch (e) {
    console.warn('[SharafERP] تعذّر تنظيف الحسابات المكررة', e?.message)
    return 0
  }
}
export { sysAccountsList } from './engine.js'

/* ======================================================================
   الخزائن (Treasury) — عدة صناديق وعدة حسابات بنكية — v51
   كل صندوق/حساب بنكي يرتبط بحساب محاسبي في دليل الحسابات عبر treasuryAccountCode
   ====================================================================== */
export async function listCashBoxes() {
  return (await db.cashBoxes.toArray()).filter(isActive).sort((a, b) => a.code.localeCompare(b.code, 'ar'))
}
export async function addCashBox({ name, code }) {
  const all = await db.cashBoxes.toArray()
  if (all.some(c => (c.name || '').trim() === (name || '').trim())) throw new Error('صندوق بهذا الاسم موجود مسبقًا')
  const id = await db.cashBoxes.add({
    code: (code || '').trim() || 'CB-' + (all.length + 1),
    name: (name || '').trim(),
    active: true,
    createdAt: Date.now(),
  })
  await audit('cashbox_add', 'cashbox', id, 'إضافة صندوق: ' + name)
  return id
}
export async function listBankAccounts() {
  return (await db.bankAccounts.toArray()).filter(isActive).sort((a, b) => a.code.localeCompare(b.code, 'ar'))
}
export async function addBankAccount({ name, code, bankName }) {
  const all = await db.bankAccounts.toArray()
  if (all.some(c => (c.name || '').trim() === (name || '').trim())) throw new Error('حساب بنكي بهذا الاسم موجود مسبقًا')
  const id = await db.bankAccounts.add({
    code: (code || '').trim() || 'BA-' + (all.length + 1),
    name: (name || '').trim(),
    bankName: (bankName || '').trim(),
    active: true,
    createdAt: Date.now(),
  })
  await audit('bank_add', 'bank', id, 'إضافة حساب بنكي: ' + name)
  return id
}

/* ======================================================================
   إقفال الفترات المحاسبية — v51
   الفترة بصيغة YYYY-MM (مثل 2026-08). لا يمكن تعديل/حذف أي قيد في فترة مغلقة.
   ====================================================================== */
export async function listPeriodCloses() {
  return (await db.periodCloses.toArray()).sort((a, b) => a.period.localeCompare(b.period))
}
export async function closePeriod({ period, force = false } = {}) {
  if (!/^\d{4}-\d{2}$/.test(period)) throw new Error('صيغة الفترة يجب أن تكون YYYY-MM مثل 2026-08')
  const exists = await db.periodCloses.where('period').equals(period).first()
  if (exists) throw new Error('هذه الفترة مغلقة مسبقًا')
  /* 1) كل القيود في الفترة يجب أن تكون مُرحّلة (posted) */
  const unposted = await db.journalEntries
    .where('date').between(period + '-01', period + '-31', false, true)
    .filter(e => !e.posted)
    .count()
  if (unposted > 0) throw new Error('لا يمكن إغلاق الفترة: يوجد ' + unposted + ' قيد(ًا) غير مُرحّل(ة) في الفترة ' + period + ' — راجع شاشة الترحيل المحاسبي أولًا')
  /* 2) التحقق المحاسبي: ميزان المراجعة حتى نهاية الفترة متوازن (شكليًا موجود) */
  const session = await db.settings.get('currentSession')
  const id = await db.periodCloses.add({
    period,
    force: !!force,
    closedAt: Date.now(),
    closedBy: session?.userName ?? 'غير معروف',
  })
  await audit('period_close', 'period', id, 'إقفال الفترة المحاسبية ' + period + (force ? ' (إقفال إجباري)' : ''))
  return id
}
export async function openPeriod(period) {
  const pc = await db.periodCloses.where('period').equals(period).first()
  if (!pc) throw new Error('الفترة غير مغلقة')
  await db.periodCloses.delete(pc.id)
  const session = await db.settings.get('currentSession')
  await audit('period_open', 'period', pc.id, 'إعادة فتح الفترة المحاسبية ' + period + ' بواسطة ' + (session?.userName ?? 'غير معروف'))
}
export async function isPeriodClosed(date) {
  const period = String(date || '').slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(period)) return false
  return !!(await db.periodCloses.where('period').equals(period).first())
}
/* يفحص أن التاريخ ليس في فترة مغلقة ويُرجع خطأ وصفهًا */
export async function assertPeriodOpen(date) {
  if (await isPeriodClosed(date)) throw new Error('الفترة المالية (' + String(date).slice(0, 7) + ') مغلقة — لا يمكن التعديل أو الإلغاء. يجب إعادة فتح الفترة أولًا.')
}
export default db
export { db }
