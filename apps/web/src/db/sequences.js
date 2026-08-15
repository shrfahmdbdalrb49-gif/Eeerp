/* ============================================
   شرف ERP - توليد أرقام المستندات الآمن
   prevents رقم متكرر حتى تحت الضغط المتزامن.
   في الوضع المحلي: جدول documentSequences في IndexedDB مع Transaction atomique
   في وضع الخادم: الخادم يولّد الرقم (الواجهة تطلب من الخادم)
   ============================================ */
import Dexie from 'dexie'

/* أنواع المستندات وبوادئها */
export const DOC_TYPES = {
  sale: { prefix: 'S', label: 'فاتورة مبيعات' },
  purchase: { prefix: 'P', label: 'فاتورة مشتريات' },
  saleReturn: { prefix: 'SR', label: 'مرتجع مبيعات' },
  purchaseReturn: { prefix: 'PR', label: 'مرتجع مشتريات' },
  receipt: { prefix: 'REC', label: 'سند قبض' },
  payment: { prefix: 'PAY', label: 'سند صرف' },
  journal: { prefix: 'JE', label: 'قيد يومية' },
  transfer: { prefix: 'TRF', label: 'تحويل مخزني' },
  customer: { prefix: 'CUS', label: 'عميل' },
  item: { prefix: 'ITM', label: 'صنف' },
  supplier: { prefix: 'SUP', label: 'مورد' },
  expense: { prefix: 'EXP', label: 'مصروف تشغيلي' },
}

const DB_NAME = 'SharafERP'
let _seqDb = null

/* نسخة Dexie مستقلة لجداول التسلسل فقط (تعمل بجانب SharafERP دون تغيير schemaversion) */
function seqDb() {
  if (_seqDb) return _seqDb
  _seqDb = new Dexie(DB_NAME + '.Sequences')
  _seqDb.version(1).stores({
    documentSequences: 'code', // code مثل 'sale|2026'
  })
  return _seqDb
}

/**
 * يولّد الرقم التالي للمستند بشكل آمن (atomic read-modify-write داخل Dexie transaction).
 * format: {prefix}-{YY}-{sequential}  مثال: S-26-000012
 */
export async function nextDocNo(docType, year) {
  if (!DOC_TYPES[docType]) throw new Error(`نوع مستند غير معروف: ${docType}`)
  const y = year || new Date().getFullYear()
  const code = `${docType}|${y}`
  const prefix = DOC_TYPES[docType].prefix
  const db = seqDb()
  for (let attempt = 0; attempt < 20; attempt++) {
    const result = await db.transaction('rw', db.documentSequences, async () => {
      let seq = await db.documentSequences.get(code)
      if (!seq) {
        seq = { code, lastNo: 0, prefix }
        await db.documentSequences.add(seq)
      }
      seq.lastNo += 1
      await db.documentSequences.put(seq)
      return `${prefix}-${String(y).slice(-2)}-${String(seq.lastNo).padStart(6, '0')}`
    }).catch(e => {
      if (e.name === 'AbortError' || /locked|busy/i.test(e.message || '')) return null
      throw e
    })
    if (result !== null) return result
  }
  throw new Error('تعذر توليد رقم المستند — حاول مرة أخرى')
}

/* تهيئة أولية اختيارية: إعادة تعيين تسلسل معين (لأغراض الإدارة) */
export async function resetSequence(docType, year, newStart = 0) {
  const y = year || new Date().getFullYear()
  const code = `${docType}|${y}`
  const db = seqDb()
  await db.transaction('rw', db.documentSequences, async () => {
    await db.documentSequences.delete(code)
    if (newStart > 0) {
      await db.documentSequences.put({ code, lastNo: newStart, prefix: DOC_TYPES[docType].prefix })
    }
  })
}

export default { nextDocNo, resetSequence, DOC_TYPES }
