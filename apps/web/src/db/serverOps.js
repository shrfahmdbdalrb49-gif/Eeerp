/* ============================================
   شرف ERP - عمليات المعاملات عبر الخادم المركزي
   دوال مساعدة تستدعيها الشاشات في وضع الخادم
   (STORAGE_MODE === 'server') لنشر الفواتير
   والقيود والتحصيل في Transaction واحد على الخادم.
   ============================================ */
import { apiFetch } from './api.js'

function today() { return new Date().toISOString().slice(0, 10) }

/* ---------- فواتير الشراء ---------- */
export async function serverPostPurchase({ supplierId, date, lines, paymentType, paidAmount, discount, tax, notes }) {
  return await apiFetch('/purchases', {
    method: 'POST',
    body: JSON.stringify({
      supplierId, invoiceDate: date || today(), paymentType: paymentType || 'credit',
      paidAmount: paidAmount == null ? 0 : Number(paidAmount), discount: discount || 0, tax: tax || 0, notes: notes || null,
      lines: lines.map(l => ({ itemId: l.itemId, qty: Number(l.qty), unitCost: Number(l.cost ?? l.unitCost ?? 0), discount: 0, tax: 0, subtotal: Number(l.qty) * Number(l.cost ?? l.unitCost ?? 0), batchNo: l.batchNo || null, expiryDate: l.expDate || l.expiryDate || null })),
    }),
  })
}

/* ---------- فواتير البيع (POS + فواتير) ---------- */
export async function serverPostSale({ customerId, date, lines, paymentType, paidAmount, discount, tax, notes }) {
  return await apiFetch('/sales', {
    method: 'POST',
    body: JSON.stringify({
      customerId: customerId || null, invoiceDate: date || today(), paymentType: paymentType || 'cash',
      paidAmount: paidAmount == null ? null : Number(paidAmount), discount: discount || 0, tax: tax || 0, notes: notes || null,
      lines: lines.map(l => ({ itemId: l.itemId, qty: Number(l.qty), price: Number(l.price ?? l.sellPrice ?? 0), discount: 0, tax: 0, subtotal: Number(l.qty) * Number(l.price ?? l.sellPrice ?? 0) })),
    }),
  })
}

/* ---------- التحصيل من العملاء ---------- */
export async function serverPostCollection({ customerId, amount, method, date, referenceNo, notes }) {
  return await apiFetch('/collections', {
    method: 'POST',
    body: JSON.stringify({ customerId, amount: Number(amount), method: method || 'cash', collectedDate: date || today(), referenceNo: referenceNo || null, notes: notes || null }),
  })
}

/* ---------- السداد للموردين ---------- */
export async function serverPostSupplierPayment({ supplierId, amount, method, date, referenceNo, notes }) {
  return await apiFetch('/supplier-payments', {
    method: 'POST',
    body: JSON.stringify({ supplierId, amount: Number(amount), method: method || 'cash', paymentDate: date || today(), referenceNo: referenceNo || null, notes: notes || null }),
  })
}

/* ---------- مرتجعات المبيعات ---------- */
export async function serverPostReturn({ saleInvoiceId, customerId, lines, refundMethod, notes }) {
  return await apiFetch('/sales-returns', {
    method: 'POST',
    body: JSON.stringify({ saleInvoiceId: saleInvoiceId || null, customerId: customerId || null, refundMethod: refundMethod || 'cash', notes: notes || null, lines: lines.map(l => ({ itemId: l.itemId, qty: Number(l.qty), price: Number(l.price ?? l.sellPrice ?? 0), batchId: l.batchId || null })) }),
  })
}

/* ---------- التحويلات بين المخازن ---------- */
export async function serverPostTransfer({ fromStoreId, toStoreId, itemId, batchId, qty }) {
  return await apiFetch('/transfers', {
    method: 'POST',
    body: JSON.stringify({ fromStoreId, toStoreId, itemId, batchId, qty }),
  })
}

/* ---------- إلغاء المعاملات (عكس الحركات والقيود) ---------- */
export async function serverCancelPurchase(id) { await apiFetch('/purchases/' + id + '/cancel', { method: 'POST' }) }

/* ---------- دورة حياة فواتير الشراء: مسودة ← استلام ← ترحيل ← إلغاء استلام ---------- */
export async function serverCreatePurchaseDraft({ supplierId, date, lines, paymentType, notes }) {
  return await apiFetch('/purchases/draft', {
    method: 'POST',
    body: JSON.stringify({
      supplierId, invoiceDate: date || today(), paymentType: paymentType || 'credit',
      notes: notes || null,
      lines: lines.map(l => ({ itemId: l.itemId, qty: Number(l.qty), unitCost: Number(l.cost ?? l.unitCost ?? 0), discount: 0, tax: 0, subtotal: Number(l.qty) * Number(l.cost ?? l.unitCost ?? 0), expiryDate: l.expDate || l.expiryDate || null })),
    }),
  })
}
export async function serverReceivePurchase(id) { return await apiFetch('/purchases/' + id + '/receive', { method: 'POST' }) }
export async function serverPostPurchaseInvoice(id) { return await apiFetch('/purchases/' + id + '/post', { method: 'POST' }) }
export async function serverUnreceivePurchase(id) { return await apiFetch('/purchases/' + id + '/unreceive', { method: 'POST' }) }
export async function serverCancelSale(id) { await apiFetch('/sales/' + id + '/cancel', { method: 'POST' }) }

export default {
  serverPostPurchase, serverPostSale, serverPostCollection,
  serverPostSupplierPayment, serverPostReturn, serverPostTransfer,
  serverCancelPurchase, serverCancelSale,
  serverCreatePurchaseDraft, serverReceivePurchase, serverPostPurchaseInvoice, serverUnreceivePurchase,
}
