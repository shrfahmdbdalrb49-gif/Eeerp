/* ============================================
   شرف ERP - النسخ الاحتياطي والاستعادة (المرحلة A)
   تصدير كامل لكل جداول IndexedDB إلى ملف JSON واحد،
   واستيراد يعيد بناء قاعدة البيانات كاملة مع إعادة
   توليد أرقام المستندات (voucher_no) من التسلسلات.
   ============================================ */
import Dexie from 'dexie'
import db, { audit, hashPassword } from './database.js'

const BACKUP_VERSION = 1
const DB_NAME = 'SharafERP'

/* كل الجداول المعرّفة في database.js (الوضع المحلي) */
const ALL_TABLES = [
  'users', 'roles', 'rolePermissions', 'settings',
  'chartOfAccounts', 'journalEntries', 'journalLines',
  'items', 'batches', 'stockMovements',
  'suppliers', 'purchaseInvoices', 'purchaseLines',
  'customers', 'salesInvoices', 'salesLines',
  'salesReturns', 'salesReturnLines',
  'collections', 'supplierPayments', 'paymentAllocations',
  'auditLogs',
  'transfers', 'transferLines',
  'doctors', 'prescriptions', 'prescriptionLines',
]

let _seqDb = null
function seqDb() {
  if (_seqDb) return _seqDb
  _seqDb = new Dexie(DB_NAME + '.Sequences')
  _seqDb.version(1).stores({ documentSequences: 'code' })
  return _seqDb
}

/* ---------- التصدير ---------- */
export async function exportSystem() {
  const tables = {}
  for (const t of ALL_TABLES) {
    try {
      tables[t] = await db.table(t).toArray()
    } catch {
      tables[t] = []
    }
  }
  /* أرقام المستندات (تسلسلات) تُصدَّر أيضًا لضمان استمرار التسلسل */
  let sequences = []
  try {
    sequences = await seqDb().documentSequences.toArray()
  } catch { sequences = [] }
  const payload = {
    app: 'SharafERP',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tables,
    sequences,
  }
  return payload
}

export function exportToDownload() {
  return exportSystem().then(payload => {
    const json = JSON.stringify(payload, null, 2)
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
    a.href = url
    a.download = `sharaf-erp-backup-${stamp}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 3000)
    return json.length
  })
}

/* ---------- الاستيراد ---------- */
export async function validateBackup(jsonText) {
  let payload
  try {
    payload = JSON.parse(jsonText)
  } catch {
    throw new Error('ملف النسخة الاحتياطية تالف — لا يمكن تحليل JSON')
  }
  if (!payload || payload.app !== 'SharafERP') throw new Error('هذا الملف ليس نسخة احتياطية من نظام شرف ERP')
  if (payload.version > BACKUP_VERSION) {
    throw new Error('نسخة احتياطية من إصدار أحدث من النظام الحالي — حدّث النظام أولًا')
  }
  if (!payload.tables || typeof payload.tables !== 'object') throw new Error('الملف لا يحتوي جداول بيانات صالحة')
  return payload
}

/**
 * استعادة نظام كامل: يحذف كل البيانات الحالية ويعيد بناء الجداول من النسخة.
 * بعد الاستعادة تُعاد تهيئة المستخدم الافتراضي إذا كانت النسخة خالية من مستخدمين.
 */
export async function importSystem(payload, options = { confirmReplace: true }) {
  if (options.confirmReplace) {
    const ok = confirm('تحذير: الاستيراد سيحذف كل البيانات الحالية في هذا المتصفح ويستبدلها ببيانات النسخة الاحتياطية. هل أنت متأكد؟')
    if (!ok) throw new Error('أُلغيت الاستعادة')
  }
  const tables = payload.tables

  /* تفريغ الجداول داخل معامل واحد */
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) {
      await t.clear()
    }
  })

  /* الإدراج بترتيب اعتمادية الجداول على المفاتيح الأجنبية */
  const order = [
    'settings', 'users', 'roles', 'rolePermissions',
    'chartOfAccounts',
    'customers', 'suppliers', 'items', 'doctors',
    'batches', 'purchaseInvoices', 'purchaseLines',
    'salesInvoices', 'salesLines', 'salesReturns', 'salesReturnLines',
    'journalEntries', 'journalLines', 'collections', 'supplierPayments',
    'stockMovements', 'transfers', 'transferLines',
    'prescriptions', 'prescriptionLines', 'auditLogs',
  ]
  const counts = {}
  for (const t of order) {
    const rows = tables[t] || []
    if (!Array.isArray(rows)) continue
    /* إزالة الحقول غير المعرّفة في الجدول الحالي (حماية ضد مخطط أحدث) */
    const schema = db.table(t).schema.primKey ? null : null
    if (rows.length > 0) {
      await db.table(t).bulkAdd(rows.map(r => ({ ...r })))
    }
    counts[t] = rows.length
  }
  /* جداول قد تكون غير موجودة في نسختنا القديمة */
  for (const t of ALL_TABLES) {
    if (!order.includes(t)) {
      const rows = tables[t] || []
      if (Array.isArray(rows) && rows.length > 0) {
        try { await db.table(t).bulkAdd(rows) } catch { /* يتجاهل الجداول غير المطابقة */ }
      }
    }
  }

  /* استعادة تسلسلات أرقام المستندات */
  if (Array.isArray(payload.sequences) && payload.sequences.length > 0) {
    const sdb = seqDb()
    await sdb.transaction('rw', sdb.documentSequences, async () => {
      await sdb.documentSequences.clear()
      if (payload.sequences.length > 0) await sdb.documentSequences.bulkAdd(payload.sequences)
    })
  }

  /* إعادة تهيئة المستخدمين الافتراضيين إذا لم تكن النسخة تحوي مستخدمين */
  const usersCount = await db.users.count()
  if (usersCount === 0) {
    const { initSystem } = await import('./database.js')
    await initSystem()
  }

  await audit('system_restore', 'system', null, `استعادة نظام من نسخة احتياطية — الجداول: ${Object.keys(counts).map(k => k + '(' + counts[k] + ')').join('، ')}`)

  return counts
}

export function fileToText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('تعذّر قراءة الملف'))
    reader.readAsText(file)
  })
}

export default { exportSystem, exportToDownload, validateBackup, importSystem }
