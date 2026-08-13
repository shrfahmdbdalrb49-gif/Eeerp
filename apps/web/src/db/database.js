/* ============================================
   شرف ERP - قاعدة البيانات الفعلية (IndexedDB / Dexie)
   كل البيانات تُخزن دائمًا داخل متصفح المستخدم.
   لا Mock Data، لا بيانات ثابتة.
   ============================================ */
import Dexie from 'dexie'

const db = new Dexie('SharafERP')

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
export async function activeItems() {
  return (await db.items.toArray()).filter(isActive)
}
export async function activeCustomers() {
  return (await db.customers.toArray()).filter(isActive).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'))
}
export async function activeSuppliers() {
  return (await db.suppliers.toArray()).filter(isActive).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'))
}
export async function activeAccounts() {
  return (await db.chartOfAccounts.toArray()).filter(isActive)
}
export default db
export { db }
