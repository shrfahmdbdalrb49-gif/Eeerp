/* ============================================
   شرف ERP - محرك المحاسبة مزدوجة القيد + حركة المخزون
   كل قيد يُضاف عبر postJournalEntry مع توازن إجباري (debit = credit)
   المخزون يُدار بال_batches مع FEFO
   ============================================ */
import { db, audit, ACCOUNT_TYPE_LABEL, activeAccounts, listCashBoxes, listBankAccounts, listPeriodCloses as listPeriodClosesDb, isPeriodClosed, assertPeriodOpen } from './database.js'
import { getStorageMode } from './storage.js'
import { apiFetch } from './api.js'
import * as engineServer from './engineServer.js'

/* حالة وضع الخادم المركزي: المحركات تنفّذ العملية عبر API */
function isServer() { return getStorageMode() === 'server' }

export function fmt(n) {
  const v = Number(n ?? 0)
  if (!Number.isFinite(v)) return '0'
  return v.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

/* ---------- رصيد الحساب: افتتاحي + مجموع مدين − مجموع دائن (لا NaN) ---------- */
export async function accountBalance(accountId) {
  if (isServer()) {
    try {
      const acc = await apiFetch('/accounts/' + accountId)
      return acc && acc.balance ? acc.balance.balance : 0
    } catch (e) {
      if (e.status === 404) return 0
      throw e
    }
  }
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
  /* في وضع الخادم المركزي: الحساب من الخادم */
  if (isServer()) {
    const data = await apiFetch('/reports/trial-balance')
    if (data && Array.isArray(data.rows)) return data
    return data
  }
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
  if (isServer()) {
    const data = await apiFetch('/reports/general-ledger/' + accountId + (from || to ? '?' + new URLSearchParams({ from: from || '', to: to || '' }).toString() : ''))
    return data && Array.isArray(data) ? data : []
  }
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
  if (isServer()) {
    const qs = new URLSearchParams()
    if (from) qs.set('from', from)
    if (to) qs.set('to', to)
    const q = qs.toString()
    const data = await apiFetch('/reports/income-statement' + (q ? '?' + q : ''))
    return data
  }
  const all = await activeAccounts()
  const accounts = all.filter(a => a.type === 'Revenue' || a.type === 'Expense')
  const revenues = [], expenses = []
  for (const acc of accounts) {
    const lines = await db.journalLines.where('accountId').equals(acc.id).toArray()
    // الإيرادات: الرصيد = دائن − مدين (موجب) · المصروفات: الرصيد = مدين − دائن (موجب)
    const creditSum = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0)
    const debitSum = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0)
    const net = acc.type === 'Revenue' ? creditSum - debitSum : debitSum - creditSum
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
  /* في وضع الخادم المركزي: النشر يتم على الخادم (transaction كامل) */
  if (isServer()) {
    const data = await apiFetch('/journals', {
      method: 'POST',
      body: JSON.stringify({
        date: date || new Date().toISOString().slice(0, 10),
        description: description || '',
        refKind: refKind || null,
        refId: refId || null,
        lines: lines.map(l => ({ accountId: l.accountId, description: l.description || null, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 })),
      }),
    })
    await audit('journal_post', 'journal', data.entryId || null, description)
    return data.entryId
  }
  for (const l of lines) {
    if (!l.accountId) throw new Error('سطر قيد بدون حساب')
    if ((Number(l.debit) || 0) < 0 || (Number(l.credit) || 0) < 0) throw new Error('قيم سالبة غير مسموحة')
    if ((Number(l.debit) || 0) === 0 && (Number(l.credit) || 0) === 0) throw new Error('سطر بقيمة صفرية')
  }
  /* ترقيم آمن لأرقام القيود المحاسبية */
  let entryNo = null
  try {
    const { nextDocNo } = await import('./sequences.js')
    const entryDate = date || new Date().toISOString().slice(0, 10)
    entryNo = await nextDocNo('journal', new Date(entryDate).getFullYear())
  } catch (e) {
    // فشل التتابع غير حرج: القيد يُنشأ بلا رقم ظاهري (يُعرض برقمه التسلسلي)
    entryNo = null
  }
  const entryId = await db.journalEntries.add({
    date: date || new Date().toISOString().slice(0, 10),
    description: description || '',
    refKind: refKind || null,
    refId: refId || null,
    posted: true,
    createdAt: Date.now(),
    entry_no: entryNo,
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
  /* في وضع الخادم المركزي: التشغيلة تُضاف عبر الشراء أو التحويل على الخادم */
  if (isServer()) {
    const b = await apiFetch('/batches', {
      method: 'POST',
      body: JSON.stringify({ itemId, storeId: storeId || 1, batchNo: batchNo || '', mfgDate: mfgDate || null, expDate: expDate || null, qty: Number(qty), cost: Number(cost) || 0 }),
    })
    return b.id
  }
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
  if (isServer()) {
    try {
      const data = await apiFetch('/items/' + itemId + '/stock')
      return data
    } catch (e) {
      if (e.status === 404) return { batches: [], total: 0, avgCost: 0 }
      throw e
    }
  }
  const batches = await db.batches
    .where('itemId').equals(itemId)
    .and(b => !b.quarantined && b.qty > 0)
    .toArray()
  // FEFO: ترتيب حسب تاريخ الانتهاء ثم التكلفة
  batches.sort((a, b) => (a.expDate || '9999') < (b.expDate || '9999') ? -1 : 1)
  const total = batches.reduce((s, b) => s + b.qty, 0)
  // متوسط التكلفة الموزون
  const totalCost = batches.reduce((s, b) => s + b.qty * (b.cost ?? b.costPrice ?? 0), 0)
  return { batches, total, avgCost: total > 0 ? totalCost / total : 0 }
}

/* ---------- صرف من المخزون (FEFO) — يُستخدم في البيع ---------- */
export async function consumeStock(itemId, qty, opts = {}) {
  /* في وضع الخادم المركزي: الخادم ينفذ الصرف تلقائيًا داخل POST /sales — تخطٍّ فقط */
  if (isServer()) return []
  const { batches } = await itemStock(itemId)
  let remaining = Number(qty)
  const consumed = []
  for (const b of batches) {
    if (remaining <= 0) break
    const take = Math.min(b.qty, remaining)
    consumed.push({ batchId: b.id, qty: take, cost: b.cost ?? b.costPrice ?? 0 })
    b.qty -= take
    remaining -= take
    await db.batches.update(b.id, { qty: b.qty })
    if (b.qty === 0) await db.batches.delete(b.id)
    await db.stockMovements.add({
      itemId, batchId: b.id, kind: 'out', qty: take, refKind: opts.refKind || 'sale', refId: opts.refId || null,
      date: new Date().toISOString().slice(0, 10), createdAt: Date.now(),
    })
  }
  if (remaining > 0) throw new Error(`مخزون غير كافٍ للصنف #${itemId}: المتاح أقل من المطلوب بـ ${remaining}`)
  return consumed
}

/* ---------- حساب تكلفة المبيعات لقيود مزدوجة ---------- */
export async function computeCOGS(itemId, qty) {
  if (isServer()) {
    const { batches } = await itemStock(itemId)
    const sorted = [...batches].sort((a, b) => (a.exp_date || a.expDate || '9999') < (b.exp_date || b.expDate || '9999') ? -1 : 1)
    let remaining = Number(qty), cogs = 0
    for (const b of sorted) {
      if (remaining <= 0) break
      const take = Math.min(b.qty, remaining)
      cogs += take * (b.cost ?? b.costPrice ?? 0)
      remaining -= take
    }
    return { cogs, available: batches.reduce((s, b) => s + b.qty, 0) }
  }
  const { batches } = await itemStock(itemId)
  const sorted = [...batches].sort((a, b) => (a.expDate || '9999') < (b.expDate || '9999') ? -1 : 1)
  let remaining = Number(qty), cogs = 0
  for (const b of sorted) {
    if (remaining <= 0) break
    const take = Math.min(b.qty, remaining)
    cogs += take * (b.cost ?? b.costPrice ?? 0)
    remaining -= take
  }
  return { cogs, available: batches.reduce((s, b) => s + b.qty, 0) }
}

/* ---------- حسابات النظام الرئيسية (تُقرأ من الإعدادات) ---------- */
export async function sysAccounts() {
  if (isServer()) {
    const all = await apiFetch('/accounts')
    const arr = Array.isArray(all) ? all : []
    const get = code => { const a = arr.find(x => x.code === code); return a ? a.id : null }
    return {
      cash: get('1-1-1'), bank: get('1-1-2'), receivables: get('1-2'), inventory: get('1-3'),
      payables: get('2-1'), equity: get('3-1'), salesRevenue: get('4-1'), salesReturns: get('4-2'),
      cogs: get('5-1'), operatingExpenses: get('5-2'),
    }
  }
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

/* ---------- قائمة الحسابات كاملة (لحجز قيد بمصاريف/حساب محدد) ---------- */
export async function sysAccountsList() {
  if (isServer()) {
    const all = await apiFetch('/accounts')
    return Array.isArray(all) ? all : []
  }
  return await db.chartOfAccounts.toArray()
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

/* ---------- إلغاء فاتورة بيع (soft delete حقيقي في local mode): عكس المخزون والقيود ---------- */
export async function cancelSaleLocal(saleId) {
  const sale = await db.salesInvoices.get(saleId)
  if (!sale) throw new Error('الفاتورة غير موجودة')
  if (sale.status === 'cancelled') return
  await assertPeriodOpen(sale.date)
  /* 1. منع الإلغاء إذا كان هناك تحصيلات مرتبطة (يجب عكسها يدويًا أولًا) */
  const cols = await db.collections.where('customerId').equals(sale.customerId).toArray()
  const totalCollected = cols.reduce((s, x) => s + (x.amount || 0), 0)
  if (totalCollected > 0.005) {
    throw new Error('لا يمكن إلغاء الفاتورة: توجد تحصيلات مرتبطة بالعميل — أَلغِها أو عدّلها أولًا')
  }
  /* 2. عكس قيد البيع */
  const jeIds = (await db.journalEntries.where('refKind').equals('sale').and(j => j.refId === saleId).toArray()).map(j => j.id)
  for (const jeId of jeIds) {
    await db.journalLines.where('entryId').equals(jeId).delete()
    await db.journalEntries.delete(jeId)
  }
  /* 3. استرجاع الكميات إلى التشغيلات (عكس FEFO الاستهلاك) */
  const lines = await db.salesLines.where('invoiceId').equals(saleId).toArray()
  for (const l of lines) {
    const consumed = Array.isArray(l.batchIds) ? l.batchIds : (l.batchId ? [l.batchId] : [])
    if (consumed.length === 0) continue
    const perBatch = Number(l.qty) / consumed.length
    for (const batchId of consumed) {
      let batch = await db.batches.get(batchId)
      if (!batch) {
        // التشغيلة أُكلت بالكامل عند البيع — نعيد إنشاءها بنفس التكلفة
        const cogsData = await computeCOGS(l.itemId, perBatch)
        batch = { itemId: l.itemId, storeId: sale.storeId || 1, batchNo: `RST-${saleId}-${batchId}`, mfgDate: null, expDate: null, qty: perBatch, cost: cogsData.cogs / perBatch || 0, quarantined: false, createdAt: Date.now() }
        await db.batches.add(batch)
      } else {
        await db.batches.update(batchId, { qty: (batch.qty || 0) + perBatch })
      }
      await db.stockMovements.add({
        itemId: l.itemId, batchId: batch.id, kind: 'in', qty: perBatch, refKind: 'cancel', refId: saleId,
        date: new Date().toISOString().slice(0, 10), createdAt: Date.now(),
      })
    }
  }
  await db.salesLines.where('invoiceId').equals(saleId).delete()
  await db.salesInvoices.update(saleId, { status: 'cancelled', canceledAt: Date.now() })
  await audit('sale_cancelled', 'sale', saleId, `إلغاء فاتورة البيع ${sale.invoice_no || saleId}`)
}

/* ---------- إلغاء فاتورة شراء (soft delete حقيقي في local mode) ---------- */
export async function cancelPurchaseLocal(purchaseId) {
  const inv = await db.purchaseInvoices.get(purchaseId)
  if (!inv) throw new Error('الفاتورة غير موجودة')
  if (inv.status === 'cancelled') return
  await assertPeriodOpen(inv.date)
  const pays = await db.supplierPayments.where('supplierId').equals(inv.supplierId).toArray()
  const totalPaid = pays.reduce((s, x) => s + (x.amount || 0), 0)
  if (totalPaid > 0.005) {
    throw new Error('لا يمكن إلغاء الفاتورة: توجد دفعات للمورد — عكسها أولًا')
  }
  const jeIds = (await db.journalEntries.where('refKind').equals('purchase').and(j => j.refId === purchaseId).toArray()).map(j => j.id)
  for (const jeId of jeIds) {
    await db.journalLines.where('entryId').equals(jeId).delete()
    await db.journalEntries.delete(jeId)
  }
  const lines = await db.purchaseLines.where('invoiceId').equals(purchaseId).toArray()
  for (const l of lines) {
    const batch = await db.batches.get(l.batchId)
    if (batch) {
      await db.batches.update(l.batchId, { qty: Math.max(0, (batch.qty || 0) - (l.qty || 0)) })
      if ((batch.qty || 0) - (l.qty || 0) <= 0) await db.batches.delete(l.batchId)
      await db.stockMovements.add({
        itemId: l.itemId, batchId: l.batchId, kind: 'out', qty: l.qty, refKind: 'cancel', refId: purchaseId,
        date: new Date().toISOString().slice(0, 10), createdAt: Date.now(),
      })
    }
  }
  await db.purchaseLines.where('invoiceId').equals(purchaseId).delete()
  await db.purchaseInvoices.update(purchaseId, { status: 'cancelled', canceledAt: Date.now() })
  await audit('purchase_cancelled', 'purchase', purchaseId, `إلغاء فاتورة الشراء ${inv.invoice_no || purchaseId}`)
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
export async function postSupplierPaymentJournal({ paymentId, amount, method, operationType, expenseAccountKey }) {
  const sys = await sysAccounts()
  let lines
  if (operationType === 'expense' && expenseAccountKey) {
    const accs = await sysAccountsList()
    const acc = accs.find(a => a.code === expenseAccountKey && a.active)
    if (!acc) throw new Error(`حساب المصاريف ${expenseAccountKey} غير موجود`)
    lines = [
      { accountId: acc.id, debit: amount },
      { accountId: method === 'bank' ? sys.bank : sys.cash, credit: amount },
    ]
    await postJournalEntry({ date: new Date().toISOString().slice(0, 10), description: `قيد مصروفات #${paymentId}`, refKind: 'supplierPayment', refId: paymentId, lines })
    return
  }
  lines = [
    { accountId: sys.payables, debit: amount },
    { accountId: method === 'bank' ? sys.bank : sys.cash, credit: amount },
  ]
  await postJournalEntry({ date: new Date().toISOString().slice(0, 10), description: `قيد سداد مورد #${paymentId}`, refKind: 'supplierPayment', refId: paymentId, lines })
}

/* ---------- قيد قيد يدوي من شاشة القيود اليومية ---------- */
export async function postManualJournal({ date, description, lines }) {
  await assertPeriodOpen(date)
  await postJournalEntry({ date, description, refKind: 'manual', refId: null, lines })
}

/* ---------- قيد افتتاحي ---------- */
export async function postOpeningJournal({ date, description, lines }) {
  await assertPeriodOpen(date)
  await postJournalEntry({ date, description, refKind: 'opening', refId: null, lines })
}

/* ======================================================================
   الخزائن (Treasury) — v51: عدة صناديق وعدة حسابات بنكية
   ========================================================= */
export async function treasuryBalance(accountId, asOf) {
  const lines = await db.journalLines.where('accountId').equals(accountId).toArray()
  let balance = 0
  for (const l of lines) {
    const entry = await db.journalEntries.get(l.entryId)
    if (!entry) continue
    if (asOf && String(entry.date || '') > String(asOf)) continue
    balance += (Number(l.debit) || 0) - (Number(l.credit) || 0)
  }
  return balance
}
export async function treasurySummary() {
  const accounts = await sysAccountsList()
  const mainCash = accounts.find(a => a.code === '1-1-1')
  const mainBank = accounts.find(a => a.code === '1-1-2')
  const cashBoxes = await listCashBoxes()
  const banks = await listBankAccounts()
  const [mainCashBalance, mainBankBalance] = await Promise.all([
    mainCash ? treasuryBalance(mainCash.id) : Promise.resolve(0),
    mainBank ? treasuryBalance(mainBank.id) : Promise.resolve(0),
  ])
  return {
    mainCash: { id: mainCash?.id || null, name: mainCash?.name || 'الصندوق الرئيسي', code: '1-1-1', balance: mainCashBalance },
    mainBank: { id: mainBank?.id || null, name: mainBank?.name || 'البنك (حساب جاري)', code: '1-1-2', balance: mainBankBalance },
    cashBoxes,
    banks,
  }
}

/* ======================================================================
   إقفال الفترات المحاسبية — v51
   الفترة بصيغة YYYY-MM. لا يمكن التعديل/الإلغاء/النشر في فترة مغلقة.
   ========================================================= */
export async function listPeriodCloses() { return await listPeriodClosesDb() }
/* ميزان المراجعة حتى نهاية تاريخ معين (للتأكد من توازن الأصول = الخصوم + الحقوق عند الإقفال) */
export async function trialBalanceAsOf(asOf) {
  /* أرصدة تراكمية حتى تاريخ asOf — تُحسب من سطور القيود بتاريخ القيد نفسه
     (وليس من ميزان المراجعة اللحظي، لأن trialBalance لا يحمل تاريخًا لكل صف) */
  const accounts = await sysAccountsList()
  const accMap = new Map(accounts.map(a => [a.id, a]))
  const limit = asOf || '9999-12-31'
  let assetsDr = 0, liabilitiesCr = 0, equityCr = 0, revenueCr = 0, expenseDr = 0
  for (const acc of accounts) {
    const lines = await db.journalLines.where('accountId').equals(acc.id).toArray()
    let debit = 0, credit = 0
    for (const l of lines) {
      const entry = await db.journalEntries.get(l.entryId)
      if (!entry) continue
      if (String(entry.date || '') > String(limit)) continue
      debit += Number(l.debit) || 0
      credit += Number(l.credit) || 0
    }
    const t = (acc.type || '').toString()
    let balance = 0
    if (t === 'Assets' || t === 'Expense') balance = (acc.openingDebit || 0) + debit - credit
    else balance = (acc.openingCredit || 0) + credit - debit
    const row = { ...acc, debit, credit, balance }
    if (acc.type === 'Assets') assetsDr += balance
    else if (acc.type === 'Liabilities') liabilitiesCr += balance
    else if (acc.type === 'Equity') equityCr += balance
    else if (acc.type === 'Revenue') revenueCr += balance
    else if (acc.type === 'Expense') expenseDr += balance
  }
  const totalAssets = assetsDr
  const totalClaims = liabilitiesCr + equityCr + revenueCr - expenseDr
  return {
    assets: totalAssets,
    claims: totalClaims,
    balanced: Math.abs(totalAssets - totalClaims) < 0.01,
    rows: { assetsDr, liabilitiesCr, equityCr, revenueCr, expenseDr },
  }
}

/* قيود معلقة غير مُرحّلة في نطاق تاريخي */
export async function pendingJournalEntries(from, to) {
  const f = from || '1000-01-01'
  const t = to || '9999-12-31'
  const entries = await db.journalEntries
    .where('date').between(f, t, false, true)
    .filter(e => !e.posted)
    .sortBy('date')
  const rows = []
  for (const e of entries) {
    const lines = await db.journalLines.where('entryId').equals(e.id).toArray()
    rows.push({
      ...e,
      lines,
      debit: lines.reduce((s, l) => s + (Number(l.debit) || 0), 0),
      credit: lines.reduce((s, l) => s + (Number(l.credit) || 0), 0),
    })
  }
  return rows
}

/* ترحيل قيد معلق يدويًا من شاشة الترحيل */
export async function postPendingEntry(entryId) {
  const entry = await db.journalEntries.get(entryId)
  if (!entry) throw new Error('القيد غير موجود')
  if (entry.posted) throw new Error('القيد مُرحّل مسبقًا')
  await assertPeriodOpen(entry.date)
  const lines = await db.journalLines.where('entryId').equals(entryId).toArray()
  if (lines.length === 0) throw new Error('القيد بلا سطور — لا يمكن ترحيله')
  const debit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0)
  const credit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0)
  if (Math.abs(debit - credit) > 0.005) throw new Error('القيد غير متوازن (' + fmt(debit) + ' / ' + fmt(credit) + ') — لا يمكن ترحيله')
  await db.journalEntries.update(entryId, { posted: true, postedAt: Date.now() })
  await audit('entry_post', 'journal', entryId, 'ترحيل القيد المعلق #' + entryId + ' — ' + (entry.description || ''))
  return true
}

/* حذف قيد معلق (غير مُرحّل) من شاشة الترحيل */
export async function deletePendingEntry(entryId) {
  const entry = await db.journalEntries.get(entryId)
  if (!entry) throw new Error('القيد غير موجود')
  if (entry.posted) throw new Error('لا يمكن حذف قيد مُرحّل — يُلغى من مصدره (فاتورة/سند)')
  await assertPeriodOpen(entry.date)
  await db.journalLines.where('entryId').equals(entryId).delete()
  await db.journalEntries.delete(entryId)
  await audit('entry_delete', 'journal', entryId, 'حذف القيد المعلق #' + entryId)
  return true
}

/* ---------- قيد تحويل بين مخازن (لا أثر محاسبي على القيمة، حركة فقط) ---------- */
export async function recordTransfer({ fromStoreId, toStoreId, itemId, batchId, qty }) {
  if (isServer()) {
    await apiFetch('/transfers', {
      method: 'POST',
      body: JSON.stringify({ fromStoreId, toStoreId, itemId, batchId, qty }),
    })
    return
  }
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

export default { fmt, accountBalance, trialBalance, generalLedger, incomeStatement, postJournalEntry, addBatch, itemStock, consumeStock, computeCOGS, sysAccounts, sysAccountsList, postSaleJournal, postPurchaseJournal, postCollectionJournal, postReturnJournal, postSupplierPaymentJournal, postManualJournal, postOpeningJournal, recordTransfer, treasuryBalance, treasurySummary, trialBalanceAsOf, pendingJournalEntries, postPendingEntry, deletePendingEntry, isPeriodClosed }
