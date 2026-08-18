/* ============================================
   شرف ERP - عميل API المركزي (الخادم البعدي PostgreSQL)
   مصادقة JWT + إرسال جميع الطلبات للخادم المركزي
   بدل IndexedDB المحلي — يدعم المزامنة بين عدة فروع.
   ============================================ */
const STORAGE_KEY = 'sharaf-erp-auth'

/* عنوان الخادم: النافذة > localStorage > متغير البيئة > الافتراضي */
export function apiBase() {
  if (typeof window !== 'undefined' && window.API_BASE) return String(window.API_BASE).replace(/\/$/, '')
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('sharaf-api-base')
    if (saved) return String(saved).replace(/\/$/, '')
  }
  return (import.meta.env.VITE_API_BASE || 'http://localhost:4000/api').replace(/\/$/, '')
}

function readAuth() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export function getToken() {
  return readAuth().token || null
}

export function getUser() {
  return readAuth().user || null
}

function saveAuth(auth) {
  if (auth) localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
  else localStorage.removeItem(STORAGE_KEY)
}

/* ============================================
   طبقة توافق: الخادم يتوقع snake_case بينما
   الشاشات ترسل camelCase — تُحوَّل تلقائيًا هنا
   لطلبات POST/PUT فقط (GET لا يتأثر).
   ============================================ */
const CAMEL2SNAKE_MAP = {
  // رؤوس الفواتير والمعاملات
  customerId: 'customer_id', supplierId: 'supplier_id',
  invoiceDate: 'invoice_date', purchaseDate: 'purchase_date', invoiceTime: 'invoice_time',
  paymentType: 'payment_type', paymentMethod: 'payment_method', paidAmount: 'paid_amount',
  remainingAmount: 'remaining_amount', totalAmount: 'total_amount',
  totalBeforeDiscount: 'total_before_discount', totalDiscount: 'total_discount', totalTax: 'total_tax',
  branchId: 'branch_id', storeId: 'store_id', warehouseId: 'store_id',
  invoiceNo: 'invoice_no', purchaseNo: 'purchase_no',
  saleType: 'sale_type', collectedDate: 'collection_date', collectedDate_: 'collection_date',
  paymentDate: 'payment_date', referenceNo: 'reference_no', checkNo: 'check_no',
  checkDueDate: 'check_due_date', checkBank: 'check_bank', exchangeRate: 'exchange_rate',
  dueDate: 'due_date', docType: 'doc_type', currency: 'currency', costCenter: 'cost_center',
  operationType: 'operation_type', accountKey: 'account_key', recipient: 'recipient',
  // المرتجعات والتحويلات
  saleInvoiceId: 'original_invoice_id', refundMethod: 'refund_method',
  fromStoreId: 'from_store_id', toStoreId: 'to_store_id',
  // الأسطر
  itemId: 'item_id', batchId: 'batch_id', batchNo: 'batch_no', lineTotal: 'line_total',
  unitPrice: 'unit_price', unitCost: 'unit_cost', quantity: 'quantity', qty: 'quantity',
  discountAmount: 'discount_amount', taxAmount: 'tax_amount', taxRate: 'tax_rate', taxable: 'taxable',
  unit: 'unit', bonus: 'bonus_quantity', bonusQuantity: 'bonus_quantity',
  expiryDate: 'expiry_date', expDate: 'expiry_date', costAtSale: 'cost_at_sale',
  // عام
  fullName: 'full_name', isActive: 'is_active', createdAt: 'created_at',
  posted: 'posted',
}
function camelToSnake(obj) {
  if (Array.isArray(obj)) return obj.map(camelToSnake)
  if (obj && typeof obj === 'object' && !(obj instanceof Date) && !(obj instanceof File)) {
    const out = {}
    for (const k of Object.keys(obj)) {
      const nk = CAMEL2SNAKE_MAP[k] || k
      out[nk] = camelToSnake(obj[k])
    }
    return out
  }
  return obj
}
function isMutationMethod(method) { return ['POST', 'PUT', 'PATCH', 'DELETE'].includes((method || '').toUpperCase()) }

/* طلب HTTP موحد مع توكن JWT */
export async function apiFetch(path, options = {}) {
  const fallback = options.fallback
  const token = getToken()
  const headers = { 'Content-Type': 'application/json; charset=utf-8', ...(options.headers || {}) }
  if (token) headers.Authorization = 'Bearer ' + token
  if (options.body && typeof options.body === 'string' && isMutationMethod(options.method)) {
    try {
      const parsed = JSON.parse(options.body)
      options = { ...options, body: JSON.stringify(camelToSnake(parsed)) }
    } catch { /* ليس JSON — يُرسل كما هو */ }
  }
  const res = await fetch(apiBase() + path, { ...options, headers })
  const text = await res.text()
  let data = null
  let rawText = false
  try { data = text ? JSON.parse(text) : null } catch { data = null; rawText = true }
  if (!res.ok || rawText) {
    if (fallback !== undefined) return typeof fallback === 'function' ? fallback() : fallback
    const msg = (data && (data.error || data.message)) || 'خطأ في الاتصال بالخادم'
    const err = new Error(msg)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

/* تسجيل الدخول عبر الخادم (bcrypt + JWT) */
export async function serverLogin(username, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: (username || '').trim().toLowerCase(), password }),
  })
  saveAuth({ user: data.user, token: data.token })
  return { ok: true, user: data.user }
}

export function serverLogout() {
  saveAuth(null)
}

/* حالة الجلسة الحالية */
export function serverSession() {
  const user = getUser()
  if (!user) return null
  return { userId: user.id, userName: user.fullName, role: user.role, username: user.username }
}

export default { apiBase, getToken, getUser, apiFetch, serverLogin, serverLogout, serverSession }
