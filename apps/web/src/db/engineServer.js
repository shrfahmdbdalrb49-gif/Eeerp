/* ============================================
   شرف ERP - محركات المحاسبة عبر الخادم المركزي
   عندما يكون STORAGE === 'server' فإن كل عمليات النشر
   (بيع/شراء/تحصيل/قيود) تتم على الخادم حيث تجري
   المعاملة + القيد المزدوج + المخزون في Transaction واحد.
   ============================================ */
import { apiFetch } from './api.js'

/* نشر قيد يدوي: POST /journals */
export async function postManualJournal({ date, description, lines }) {
  const data = await apiFetch('/journals', {
    method: 'POST',
    body: JSON.stringify({
      date, description,
      lines: (lines || []).map(l => ({ accountId: l.accountId, description: l.description || null, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 })),
    }),
  })
  return data.entryId
}

export async function postOpeningJournal({ date, description, lines }) {
  return await postManualJournal({ date, description, lines })
}

/* حذف/إلغاء فاتورة شراء (عكس الحركات والقيد) */
export async function cancelPurchase(purchaseId) {
  await apiFetch('/purchases/' + purchaseId + '/cancel', { method: 'POST' })
  return true
}

/* حذف/إلغاء فاتورة بيع (عكس الحركات والقيد) */
export async function cancelSale(saleId) {
  await apiFetch('/sales/' + saleId + '/cancel', { method: 'POST' })
  return true
}

export default { postManualJournal, postOpeningJournal, cancelPurchase, cancelSale }
