/* ============================================
   شرف ERP - ترقية البيانات القديمة (Legacy Migration)
   عند وجود سجلات من نسخة الواجهة السابقة (snake_case
   بدون حقول المصادقة) تُرقّى تلقائيًا إلى الصيغة
   الحالية camelCase المستخدمة في فهارس Dexie.
   الترقية تحافظ على الحقول القديمة (لا تُحذف) لضمان
   توافق العرض، وتضيف الحقول الجديدة المطلوبة.
   ============================================ */
import { hashPassword } from './database.js'

const MIGRATION_KEY = 'schemaMigrated'
const MIGRATION_VERSION = 2

/* تحويل snake_case → camelCase حسب خريطة الحقول */
export const FIELD_MAP = {
  // المستخدمون
  users: {
    full_name: 'fullName',
    branch_id: 'branchId',
    last_login_at: 'lastLoginAt',
  },
  // فواتير المشتريات
  purchaseInvoices: {
    invoice_no: 'invoiceNo',
    supplier_id: 'supplierId',
    branch_id: 'branchId',
    store_id: 'storeId',
    invoice_date: 'invoiceDate',
    payment_type: 'paymentType',
    paid_amount: 'paidAmount',
    created_by: 'createdBy',
    created_at: 'createdAt',
    supplier_name: 'supplierName',
  },
  // سطور المشتريات
  purchaseLines: {
    invoice_id: 'invoiceId',
    item_id: 'itemId',
    unit_cost: 'unitCost',
    batch_no: 'batchNo',
    item_name: 'itemName',
  },
  // فواتير المبيعات
  salesInvoices: {
    invoice_no: 'invoiceNo',
    customer_id: 'customerId',
    branch_id: 'branchId',
    store_id: 'storeId',
    invoice_date: 'invoiceDate',
    payment_type: 'paymentType',
    paid_amount: 'paidAmount',
    created_by: 'createdBy',
    created_at: 'createdAt',
    customer_name: 'customerName',
  },
  // سطور المبيعات
  salesLines: {
    invoice_id: 'invoiceId',
    item_id: 'itemId',
    batch_ids: 'batchIds',
    item_name: 'itemName',
  },
  // القيود المحاسبية
  journalEntries: {
    entry_no: 'entryNo',
    entry_date: 'entryDate',
    ref_kind: 'refKind',
    ref_id: 'refId',
    total_debit: 'totalDebit',
    total_credit: 'totalCredit',
    created_by: 'createdBy',
    created_at: 'createdAt',
  },
  // سطور القيود
  journalLines: {
    entry_id: 'entryId',
    account_id: 'accountId',
    account_code: 'accountCode',
    account_name: 'accountName',
  },
  // دليل الحسابات
  chartOfAccounts: {
    parent_id: 'parentId',
    opening_debit: 'openingDebit',
    opening_credit: 'openingCredit',
    created_at: 'createdAt',
  },
  // الأصناف
  items: {
    status: 'active',
    scientific_name: 'scientificName',
    min_stock: 'minStock',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
  },
  // التشغيلات (الدفات)
  batches: {
    item_id: 'itemId',
    store_id: 'storeId',
    batch_no: 'batchNo',
    mfg_date: 'mfgDate',
    exp_date: 'expDate',
    source_kind: 'sourceKind',
    source_id: 'sourceId',
    created_at: 'createdAt',
  },
  // الموردون والعملاء
  suppliers: { status: 'active', created_at: 'createdAt' },
  customers: { status: 'active', created_at: 'createdAt' },
  // التحصيل (سندات القبض)
  collections: {
    receipt_no: 'receiptNo',
    customer_id: 'customerId',
    collected_date: 'collectedDate',
    reference_no: 'referenceNo',
    created_by: 'createdBy',
    created_at: 'createdAt',
    customer_name: 'customerName',
  },
  // سداد الموردين (سندات الصرف)
  supplierPayments: {
    payment_no: 'paymentNo',
    supplier_id: 'supplierId',
    payment_date: 'paymentDate',
    reference_no: 'referenceNo',
    created_by: 'createdBy',
    created_at: 'createdAt',
    expense_account_id: 'expenseAccountId',
    expense_account_code: 'expenseAccountCode',
    expense_account_name: 'expenseAccountName',
    supplier_name: 'supplierName',
  },
  // حركة المخزون
  stockMovements: {
    item_id: 'itemId',
    batch_id: 'batchId',
    store_id: 'storeId',
    ref_kind: 'refKind',
    ref_id: 'refId',
    created_at: 'createdAt',
  },
  // سجل التدقيق
  auditLogs: {
    user_id: 'userId',
    user_name: 'userName',
    ref_kind: 'refKind',
    ref_id: 'refId',
    created_at: 'createdAt',
  },
  // الأطباء والوصفات
  doctors: { created_at: 'createdAt' },
  prescriptions: {
    patient_id: 'patientId',
    doctor_id: 'doctorId',
    created_at: 'createdAt',
  },
}

/* حقول خاصة لكل جدول تحتاج معالجة إضافية */
async function migrateRecord(table, rec) {
  const copy = { ...rec }
  const map = FIELD_MAP[table] || {}
  for (const [oldKey, newKey] of Object.entries(map)) {
    if (oldKey in copy && !(newKey in copy)) {
      copy[newKey] = copy[oldKey]
    }
  }
  /* --- معالجة خاصة: المستخدمون والمصادقة --- */
  if (table === 'users') {
    if (!copy.passwordHash) {
      const isCashier = copy.username === 'cashier'
      const salt = isCashier ? 'sharaf-salt-2' : 'sharaf-salt-1'
      copy.salt = salt
      copy.passwordHash = hashPassword(isCashier ? 'cash123' : 'admin123', salt)
    }
    if (!copy.role) copy.role = 'admin'
    if (!('active' in copy)) copy.active = true
  }
  /* --- الأصناف: status → active --- */
  if (table === 'items') {
    if (typeof copy.active !== 'boolean') {
      copy.active = copy.status !== 'inactive' && copy.status !== 'deleted'
    }
  }
  if (table === 'suppliers' || table === 'customers') {
    if (typeof copy.active !== 'boolean') {
      copy.active = copy.status !== 'inactive' && copy.status !== 'deleted'
    }
  }
  /* --- سطور المبيعات: batch_ids مصفوفة → batchIds مصفوفة --- */
  if (table === 'salesLines' && copy.batchIds && !Array.isArray(copy.batchIds)) {
    copy.batchIds = [copy.batchIds]
  }
  /* --- الحسابات: code نصي أو رقمي --- */
  if (table === 'chartOfAccounts') {
    copy.code = String(copy.code ?? copy.number ?? '')
    if (copy.number == null) copy.number = Number(copy.code) || 0
    if (typeof copy.active !== 'boolean') copy.active = true
  }
  /* --- سداد الموردين: supplier_id=null (مصروف بدون مورد) → إبقاء null --- */
  return copy
}

/* جدول settings قد لا يكون معرفًا بعد في بعض الإصدارات القديمة */
function settingsTable(db) {
  return db.settings || db['_settings'] || null
}

export async function migrateLegacyData(db) {
  try {
    /* فحص إصدار الترقية الحالي */
    const t = settingsTable(db)
    let ver = 0
    if (t) {
      try {
        const row = await t.get(MIGRATION_KEY)
        ver = row?.value || row?.version || 0
      } catch {}
    }
    if (ver >= MIGRATION_VERSION) return { migrated: false, reason: 'up-to-date' }

    const migratedTables = []
    for (const [table, map] of Object.entries(FIELD_MAP)) {
      try {
        const tbl = db[table]
        if (!tbl) continue
        const needsMigration = Object.keys(map).some(k => k.includes('_'))
        const all = await tbl.toArray()
        if (!all.length) continue
        /* تحقق سريع: هل يوجد حقل قديم غير مترجم؟ */
        const hasOld = all.some(r => Object.keys(map).some(k => k in r && !(map[k] in r)))
        if (!hasOld) continue
        for (const rec of all) {
          const next = await migrateRecord(table, rec)
          await tbl.put(next)
        }
        migratedTables.push(table)
      } catch (e) {
        console.warn('[SharafERP] تعذّرت ترقية جدول', table, e?.message)
      }
    }

    /* تسجيل إصدار الترقية */
    if (t) {
      try {
        await t.put({ key: MIGRATION_KEY, value: MIGRATION_VERSION, version: MIGRATION_VERSION, migratedAt: Date.now() })
      } catch (e) {
        console.warn('[SharafERP] تعذّر تسجيل إصدار الترقية', e?.message)
      }
    }
    console.info('[SharafERP] اكتملت ترقية البيانات القديمة:', migratedTables.join(', '))
    return { migrated: true, tables: migratedTables }
  } catch (e) {
    console.warn('[SharafERP] فشلت الترقية العامة:', e?.message)
    return { migrated: false, error: e?.message }
  }
}

export default migrateLegacyData
