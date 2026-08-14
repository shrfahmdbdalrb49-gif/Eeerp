/* ============================================
   شرف ERP - جداول الخادم المركزي (بديل IndexedDB)
   محاكاة واجهة Dexie الأساسية فوق REST API
   حتى تتمكن الشاشات الحالية من العمل دون تعديل كبير.
   ============================================ */
import { apiFetch, getToken } from './api.js'

/* مزامنة الأسماء بين الواجهة والخادم */
const ENDPOINT_MAP = {
  chartOfAccounts: 'accounts',
  journalEntries: 'journals',
  journalLines: 'journals-lines',
  purchases: 'purchases',
  purchaseLines: 'purchase-lines',
  salesInvoices: 'sales',
  salesLines: 'sales-lines',
  salesReturns: 'sales-returns',
  salesReturnLines: 'sales-return-lines',
  collections: 'collections',
  supplierPayments: 'supplier-payments',
  users: 'users',
  rolePermissions: 'permissions',
  doctors: 'doctors',
  prescriptions: 'prescriptions',
  prescriptionLines: 'prescription-lines',
  transfers: 'transfers',
  transferLines: 'transfer-lines',
  auditLogs: 'audit',
  branches: 'branches',
  stores: 'stores',
}

function endpoint(table) {
  return '/' + (ENDPOINT_MAP[table] || table)
}

/* تحويل أسماء حقول الخادم (snake_case) إلى الواجهة (camelCase) عند الحاجة */
function toClient(row, table) {
  if (!row || typeof row !== 'object') return row
  if (table === 'journalEntries') {
    /* الخادم يعيد القيد مع سطر lines مدمج */
    const { lines, ...rest } = row
    const res = { ...rest }
    if (Array.isArray(lines)) {
      res.lines = lines.map(l => ({
        id: l.id,
        entryId: res.id,
        accountId: Number(l.account_id),
        description: l.description || null,
        debit: Number(l.debit || 0),
        credit: Number(l.credit || 0),
      }))
    }
    return res
  }
  return row
}

/* تجميع الصفوف من endpoint يعيد مصفوفة */
class TableApi {
  constructor(table) {
    this.table = table
  }

  /* الحصول على كل السجلات (مع فلترة status عند توفر الاستعلام) */
  async toArray() {
    try {
      const data = await apiFetch(endpoint(this.table))
      const rows = Array.isArray(data) ? data : []
      return rows.map(r => toClient(r, this.table))
    } catch (e) {
      if (e.status === 404) return []
      throw e
    }
  }

  async count() {
    const rows = await this.toArray()
    return rows.length
  }

  async get(id) {
    try {
      const row = await apiFetch(endpoint(this.table) + '/' + id)
      return row ? toClient(row, this.table) : undefined
    } catch (e) {
      if (e.status === 404) return undefined
      throw e
    }
  }

  async add(obj) {
    const body = this.toServer(obj)
    if (body == null) throw new Error('هذه العملية غير مدعومة على الخادم عبر هذه الواجهة — استخدم الدالة المتخصصة')
    const row = await apiFetch(endpoint(this.table), { method: 'POST', body: JSON.stringify(body) })
    /* إضافة متكررة: الخادم يعيد الصف المنشأ (بما فيه id) */
    return row && row.id ? row.id : (row && row.entryId ? row.entryId : null)
  }

  async bulkAdd(arr) {
    const ids = []
    for (const obj of arr) ids.push(await this.add(obj))
    return ids
  }

  async put(obj) {
    if (obj.id) return await this.update(obj.id, obj)
    return await this.add(obj)
  }

  async update(id, changes) {
    if (!id) throw new Error('تحديث بدون معرِّف')
    const row = await apiFetch(endpoint(this.table) + '/' + id, { method: 'PUT', body: JSON.stringify(this.toServer(changes)) })
    return row ? 1 : 0
  }

  async delete(id) {
    await apiFetch(endpoint(this.table) + '/' + id, { method: 'DELETE' })
    return 1
  }

  /* فلترة عميلية بسيطة: where(index).equals(value) */
  where(index) {
    const self = this
    return {
      equals(value) {
        const arr = self.toArray().then(rows => rows.filter(r => (r || {})[index] == value))
        return {
          async toArray() { return arr },
          async first() { const rows = await arr; return rows[0] || undefined },
          async count() { return (await arr).length },
          async delete() {
            const rows = await arr
            for (const r of rows) await self.delete(r.id)
            return rows.length
          },
          async and(fn) {
            const rows = await arr
            return {
              async toArray() { return rows.filter(fn) },
              async delete() {
                const filtered = rows.filter(fn)
                for (const r of filtered) await self.delete(r.id)
                return filtered.length
              },
            }
          },
        }
      },
      anyOf(values) {
        const arr = self.toArray().then(rows => rows.filter(r => values.includes((r || {})[index])))
        return {
          async toArray() { return arr },
          async first() { const rows = await arr; return rows[0] || undefined },
          async and(fn) {
            const rows = await arr
            return { async toArray() { return rows.filter(fn) } }
          },
        }
      },
    }
  }

  orderBy(index) {
    return {
      toArray: () =>
        this.toArray().then(rows =>
          rows.slice().sort((a, b) => String(a[index] || '').localeCompare(String(b[index] || ''), undefined, { numeric: true }))
        ),
    }
  }

  filter(fn) {
    return {
      toArray: () => this.toArray().then(rows => rows.filter(fn)),
    }
  }

  /* تحويل أسماء حقول الواجهة إلى الخادم */
  toServer(obj) {
    if (!obj || typeof obj !== 'object') return obj
    const t = this.table
    if (t === 'journalLines' && obj.entryId) return { entryId: obj.entryId, accountId: obj.accountId, description: obj.description || null, debit: obj.debit, credit: obj.credit }
    if (t === 'purchaseLines') {
      return { invoiceId: obj.invoiceId, itemId: obj.itemId, qty: obj.qty, cost: obj.cost, expDate: obj.expDate || null, batchNo: obj.batchNo || null }
    }
    if (t === 'salesLines') return { invoiceId: obj.invoiceId, itemId: obj.itemId, qty: obj.qty, price: obj.price, batchIds: obj.batchIds || null }
    if (t === 'salesReturnLines') return { returnId: obj.returnId, itemId: obj.itemId, qty: obj.qty, price: obj.price, batchId: obj.batchId || null }
    if (t === 'prescriptionLines') return { prescriptionId: obj.prescriptionId, itemId: obj.itemId, qty: obj.qty }
    if (t === 'transferLines') return { transferId: obj.transferId, itemId: obj.itemId, batchId: obj.batchId, qty: obj.qty }
    if (t === 'journalEntries') {
      return { date: obj.date, description: obj.description, refKind: obj.refKind || null, refId: obj.refId || null, lines: (obj.lines || []).map(l => ({ accountId: l.accountId, description: l.description || null, debit: l.debit, credit: l.credit })), posted: obj.posted }
    }
    return obj
  }
}

/* كائن الجداول العامة */
export function createTables() {
  const t = {
    items: new TableApi('items'),
    customers: new TableApi('customers'),
    suppliers: new TableApi('suppliers'),
    purchaseInvoices: new TableApi('purchases'),
    purchaseLines: new TableApi('purchaseLines'),
    batches: new TableApi('batches'),
    salesInvoices: new TableApi('salesInvoices'),
    salesLines: new TableApi('salesLines'),
    salesReturns: new TableApi('salesReturns'),
    salesReturnLines: new TableApi('salesReturnLines'),
    collections: new TableApi('collections'),
    supplierPayments: new TableApi('supplierPayments'),
    journalEntries: new TableApi('journalEntries'),
    journalLines: new TableApi('journalLines'),
    stockMovements: new TableApi('stockMovements'),
    users: new TableApi('users'),
    roles: new TableApi('roles'),
    rolePermissions: new TableApi('rolePermissions'),
    auditLogs: new TableApi('auditLogs'),
    settings: new TableApi('settings'),
    transfers: new TableApi('transfers'),
    transferLines: new TableApi('transferLines'),
    chartOfAccounts: new TableApi('chartOfAccounts'),
    doctors: new TableApi('doctors'),
    prescriptions: new TableApi('prescriptions'),
    prescriptionLines: new TableApi('prescriptionLines'),
    branches: new TableApi('branches'),
    stores: new TableApi('stores'),
  }
  /* سجل التدقيق: الحفظ عبر الخادم مع الجلسة الحالية */
  const tks = t.auditLogs
  tks.add = async (obj) => {
    try {
      await apiFetch('/audit', { method: 'POST', body: JSON.stringify(obj) })
      return null
    } catch {
      return null
    }
  }
  return t
}

export default createTables
