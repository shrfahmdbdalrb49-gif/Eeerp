/* ============================================
   شرف ERP - محرك المحاسبة مزدوجة القيد + حركة المخزون
   كل قيد يُضاف عبر postJournalEntry مع توازن إجباري (debit = credit)
   المخزون يُدار بال_batches مع FEFO
   ============================================ */
import { db, audit, ACCOUNT_TYPE_LABEL, activeAccounts } from './database.js'

export function fmt(n) {
  const v = Number(n ?? 0)
  if (!Number.isFinite(v)) return '0'
  return v.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

/* ---------- رصيد الحساب: افتتاحي + مجموع مدين − مجموع دائن (لا NaN) ---------- */
export async function accountBalance(accountId) {
  const acc = await db.chartOfAccounts.get(accountId)
  if (!acc) return 0
  const lines = await db.journalLines.where('accountId').equals(accountId).toArray()
  const debit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0)
  const credit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0)
  const t = (acc.type || '').toString()
  // أصول ومصروفات: مدين موجب | خصوم وحقوق ملكية وإيرادات: دائن موجب
  if (t === 'Assets' || t === 'Expense') return (acc.openingDebit || 0) + debit - credit
  return (acc.openingCredit || 0) + credit - debit
}

/* ---------- ميزان المراجعة ---------- */
export async function trialBalance() {
  const accounts = await activeAccounts()
  const rows = []
  for (const acc of accounts) {
    const lines = await db.journalLines.where('accountId').equals(acc.id).toArray()
    const debit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0)
    const credit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0)
    const t = (acc.type || '').toString()
    let balance = 0
    if (t === 'Assets' || t === 'Expense') balance = (acc.openingDebit || 0) + debit - credit
    else balance = (acc.openingCredit || 0) + credit - debit
    rows.push({ ...acc, debit, credit, balance })
  }
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0)
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0)
  return { rows, totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 }
}

/* ---------- الأستاذ العام (كل القيود على حساب) ---------- */
export async function generalLedger(accountId, from, to) {
  const lines = await db.journalLines
    .where('accountId')
    .equals(accountId)
    .and(l => {
      if (!l.entry) return true
      const d = l.entry.date
      if (from && d < from) return false
      if (to && d > to) return false
      return true
    })
    .toArray()
  // إحضار القيود المرتبطة
  const entryIds = [...new Set(lines.map(l => l.entryId))]
  const entries = await db.journalEntries.where('id').anyOf(entryIds).toArray()
  const entryMap = Object.fromEntries(entries.map(e => [e.id, e]))
  let run = 0
  return lines.map(l => {
    const e = entryMap[l.entryId]
    run += (Number(l.debit) || 0) - (Number(l.credit) || 0)
    return { ...l, entry: e, running: run }
  })
}

/* ---------- قائمة الدخل (إيرادات − مصروفات) ---------- */
export async function incomeStatement(from, to) {
  const all = await activeAccounts()
  const accounts = all.filter(a => a.type === 'Revenue' || a.type === 'Expense')
  const revenues = [], expenses = []
  for (const acc of accounts) {
    const lines = await db.journalLines.where('accountId').equals(acc.id).toArray()
    const net = lines.reduce((s, l) => s + (Number(l.credit) || 0) - (Number(l.debit) || 0), 0)
    const row = { ...acc, net }
    if (acc.type === 'Revenue') revenues.push(row)
    else expenses.push(row)
  }
  const totalRevenue = revenues.reduce((s, r) => s + r.net, 0)
  const totalExpense = expenses.reduce((s, r) => s + r.net, 0)
  return { revenues, expenses, totalRevenue, totalExpense, netIncome: totalRevenue - totalExpense }
}

/* ---------- نشر قيد مزدوج (يجب أن يتوازن) ---------- */
export async function postJournalEntry({ date, description, refKind, refId, lines }) {
  const debitSum = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0)
  const creditSum = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0)
  if (Math.abs(debitSum - creditSum) > 0.005) {
    throw new Error(`القيد غير متوازن: مدين ${fmt(debitSum)} / دائن ${fmt(creditSum)}`)
  }
  if (lines.length < 2) throw new Error('القيد يتطلب سطرين على الأقل')
  for (const l of lines) {
    if (!l.accountId) throw new Error('سطر قيد بدون حساب')
    if ((Number(l.debit) || 0) < 0 || (Number(l.credit) || 0) < 0) throw new Error('قيم سالبة غير مسموحة')
    if ((Number(l.debit) || 0) === 0 && (Number(l.credit) || 0) === 0) throw new Error('سطر بقيمة صفرية')
  }
  const entryId = await db.journalEntries.add({
    date: date || new Date().toISOString().slice(0, 10),
    description: description || '',
    refKind: refKind || null,
    refId: refId || null,
    posted: true,
    createdAt: Date.now(),
  })
  await db.journalLines.bulkAdd(
    lines.map(l => ({ entryId, accountId: l.accountId, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 }))
  )
  await audit('journal_post', 'journal', entryId, description)
  return entryId
}

/* ---------- المخزون: إضافة تشغيلة عند الشراء/الفتح ---------- */
export async function addBatch({ itemId, storeId, batchNo, mfgDate, expDate, qty, cost, sourceKind, sourceId }) {
  if (!qty || qty <= 0) throw new Error('كمية غير صحيحة')
  const id = await db.batches.add({
    itemId, storeId: storeId || 1, batchNo: batchNo || '', mfgDate: mfgDate || null,
    expDate: expDate || null, qty: Number(qty), cost: Number(cost) || 0,
    sourceKind: sourceKind || 'purchase', sourceId: sourceId || null,
    quarantined: false, createdAt: Date.now(),
  })
  await db.stockMovements.add({
    itemId, batchId: id, kind: 'in', qty: Number(qty), refKind: sourceKind, refId: sourceId,
    date: new Date().toISOString().slice(0, 10), createdAt: Date.now(),
  })
  return id
}

/* ---------- قراءة المخزون: إجمالي الكميات لكل صنف (FEFO: الأقدم صالحًا أولًا) ---------- */
export async function itemStock(itemId, asOf) {
  const batches = await db.batches
    .where('itemId').equals(itemId)
    .and(b => !b.quarantined && b.qty > 0)
    .toArray()
  // FEFO: ترتيب حسب تاريخ الانتهاء ثم التكلفة
  batches.sort((a, b) => (a.expDate || '9999') < (b.expDate || '9999') ? -1 : 1)
  const total = batches.reduce((s, b) => s + b.qty, 0)
  // متوسط التكلفة الموزون
  const totalCost = batches.reduce((s, b) => s + b.qty * (b.cost || 0), 0)
  return { batches, total, avgCost: total > 0 ? totalCost / total : 0 }
}

/* ---------- صرف من المخزون (FEFO) — يُستخدم في البيع ---------- */
export async function consumeStock(itemId, qty) {
  const { batches } = await itemStock(itemId)
  let remaining = Number(qty)
  const consumed = []
  for (const b of batches) {
    if (remaining <= 0) break
    const take = Math.min(b.qty, remaining)
    consumed.push({ batchId: b.id, qty: take, cost: b.cost })
    b.qty -= take
    remaining -= take
    await db.batches.update(b.id, { qty: b.qty })
    if (b.qty === 0) await db.batches.delete(b.id)
    await db.stockMovements.add({
      itemId, batchId: b.id, kind: 'out', qty: take, refKind: 'sale', refId: null,
      date: new Date().toISOString().slice(0, 10), createdAt: Date.now(),
    })
  }
  if (remaining > 0) throw new Error(`مخزون غير كافٍ للصنف #${itemId}: المتاح أقل من المطلوب بـ ${remaining}`)
  return consumed
}

/* ---------- حساب تكلفة المبيعات لقيود مزدوجة ---------- */
export async function computeCOGS(itemId, qty) {
  const { batches } = await itemStock(itemId)
  const sorted = [...batches].sort((a, b) => (a.expDate || '9999') < (b.expDate || '9999') ? -1 : 1)
  let remaining = Number(qty), cogs = 0
  for (const b of sorted) {
    if (remaining <= 0) break
    const take = Math.min(b.qty, remaining)
    cogs += take * (b.cost || 0)
    remaining -= take
  }
  return { cogs, available: batches.reduce((s, b) => s + b.qty, 0) }
}

/* ---------- حسابات النظام الرئيسية (تُقرأ من الإعدادات) ---------- */
export async function sysAccounts() {
  const all = await db.chartOfAccounts.toArray()
  const get = code => { const a = all.find(x => x.code === code); return a ? a.id : null }
  return {
    cash: get('1-1-1'),        // الصندوق الرئيسي
    bank: get('1-1-2'),
    receivables: get('1-2'),   // ذمم مدينة
    inventory: get('1-3'),     // مخزون
    payables: get('2-1'),      // ذمم دائنة
    equity: get('3-1'),        // رأس المال
    salesRevenue: get('4-1'),
    salesReturns: get('4-2'),
    cogs: get('5-1'),          // تكلفة المبيعات
    operatingExpenses: get('5-2'),
  }
}

/* ---------- قيد بيع: الصندوق/الذمم ← إيرادات + تكلفة مبيعات ← مخزون ---------- */
export async function postSaleJournal({ saleId, total, paid, customerPaid, cogsAmount }) {
  const sys = await sysAccounts()
  // paid: المبلغ المدفوع نقدًا/بنكًا فورًا؛ الباقي (total - paid) يُرحَّل إلى الذمم المدينة
  const onCredit = Math.max(0, (Number(total) || 0) - (Number(paid) || 0))
  const lines = []
  if (paid > 0) {
    if (customerPaid === 'bank') lines.push({ accountId: sys.bank, debit: paid })
    else if (customerPaid === 'cash') lines.push({ accountId: sys.cash, debit: paid })
  }
  if (onCredit > 0) lines.push({ accountId: sys.receivables, debit: onCredit })
  lines.push({ accountId: sys.salesRevenue, credit: total })
  if (cogsAmount > 0) {
    lines.push({ accountId: sys.cogs, debit: cogsAmount })
    lines.push({ accountId: sys.inventory, credit: cogsAmount })
  }
  await postJournalEntry({ date: new Date().toISOString().slice(0, 10), description: `قيد بيع #${saleId}`, refKind: 'sale', refId: saleId, lines })
}

/* ---------- قيد شراء: مخزون ← ذمم/الصندوق ---------- */
export async function postPurchaseJournal({ purchaseId, total, paymentType }) {
  const sys = await sysAccounts()
  const lines = [{ accountId: sys.inventory, debit: total }]
  if (paymentType === 'cash') lines.push({ accountId: sys.cash, credit: total })
  else if (paymentType === 'bank') lines.push({ accountId: sys.bank, credit: total })
  else lines.push({ accountId: sys.payables, credit: total })
  await postJournalEntry({ date: new Date().toISOString().slice(0, 10), description: `قيد شراء #${purchaseId}`, refKind: 'purchase', refId: purchaseId, lines })
}

/* ---------- قيد تحصيل: صندوق ← ذمم مدينة ---------- */
export async function postCollectionJournal({ collectionId, amount, method }) {
  const sys = await sysAccounts()
  const lines = [
    { accountId: method === 'bank' ? sys.bank : sys.cash, debit: amount },
    { accountId: sys.receivables, credit: amount },
  ]
  await postJournalEntry({ date: new Date().toISOString().slice(0, 10), description: `قيد تحصيل #${collectionId}`, refKind: 'collection', refId: collectionId, lines })
}

/* ---------- قيد مرتجع: مرتدات ← ذمم/صندوق ---------- */
export async function postReturnJournal({ returnId, total, refundMethod }) {
  const sys = await sysAccounts()
  const lines = [
    { accountId: sys.salesReturns, debit: total },
    { accountId: refundMethod === 'cash' ? sys.cash : refundMethod === 'bank' ? sys.bank : sys.receivables, credit: total },
  ]
  await postJournalEntry({ date: new Date().toISOString().slice(0, 10), description: `قيد مرتجع #${returnId}`, refKind: 'saleReturn', refId: returnId, lines })
}

/* ---------- قيد سداد مورد: ذمم دائنة ← صندوق/بنك ---------- */
export async function postSupplierPaymentJournal({ paymentId, amount, method }) {
  const sys = await sysAccounts()
  const lines = [
    { accountId: sys.payables, debit: amount },
    { accountId: method === 'bank' ? sys.bank : sys.cash, credit: amount },
  ]
  await postJournalEntry({ date: new Date().toISOString().slice(0, 10), description: `قيد سداد مورد #${paymentId}`, refKind: 'supplierPayment', refId: paymentId, lines })
}

/* ---------- قيد قيد يدوي من شاشة القيود اليومية ---------- */
export async function postManualJournal({ date, description, lines }) {
  await postJournalEntry({ date, description, refKind: 'manual', refId: null, lines })
}

/* ---------- قيد افتتاحي ---------- */
export async function postOpeningJournal({ date, description, lines }) {
  await postJournalEntry({ date, description, refKind: 'opening', refId: null, lines })
}

/* ---------- قيد تحويل بين مخازن (لا أثر محاسبي على القيمة، حركة فقط) ---------- */
export async function recordTransfer({ fromStoreId, toStoreId, itemId, batchId, qty }) {
  const b = await db.batches.get(batchId)
  if (!b || b.qty < qty) throw new Error('مخزون غير كافٍ للتحويل')
  const newId = await db.batches.add({
    itemId, storeId: toStoreId, batchNo: b.batchNo + '-T', mfgDate: b.mfgDate,
    expDate: b.expDate, qty, cost: b.cost, sourceKind: 'transfer_in', sourceId: b.id,
    quarantined: false, createdAt: Date.now(),
  })
  await db.batches.update(batchId, { qty: b.qty - qty })
  await db.stockMovements.bulkAdd([
    { itemId, batchId, kind: 'transfer_out', qty, refKind: 'transfer', refId: null, date: new Date().toISOString().slice(0, 10), createdAt: Date.now() },
    { itemId, batchId: newId, kind: 'transfer_in', qty, refKind: 'transfer', refId: null, date: new Date().toISOString().slice(0, 10), createdAt: Date.now() },
  ])
}

export default { fmt, accountBalance, trialBalance, generalLedger, incomeStatement, postJournalEntry, addBatch, itemStock, consumeStock, computeCOGS, sysAccounts, postSaleJournal, postPurchaseJournal, postCollectionJournal, postReturnJournal, postSupplierPaymentJournal, postManualJournal, postOpeningJournal, recordTransfer }
