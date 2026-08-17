/* اختبار POST /purchases/:id/post مباشرة عبر الخادم */
const BASE = 'http://localhost:3333/api'

async function api(url, body) {
  const r = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: r.status, data: await r.json() }
}

let TOKEN
const lr = await fetch(`${BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'Admin@1234' }),
})
TOKEN = (await lr.json()).token
console.log('login ok')

// الصنف الموجود (من QA السابق، id=1)
const items = await api(`${BASE}/items`, null)
const item = items.data[0]
console.log('item:', item?.id, item?.name)

const sup = await api(`${BASE}/suppliers`, { name: 'المورد الموحدين', phone: '777000000' })
console.log('supplier:', sup.status, sup.data.id || sup.data.error)
const supId = sup.data.id || 1

const stores = await api(`${BASE}/stores`, null)
const storeId = stores.data[0]?.id
console.log('store:', storeId)

const pur = await api(`${BASE}/purchases`, {
  supplier_id: supId, store_id: storeId,
  purchase_date: '2026-08-17',
  paid_amount: 0, payment_method: 'credit', currency: 'YER',
  lines: [{ item_id: item.id, quantity: 100, unit_cost: 300, line_total: 30000 }],
  total_amount: 30000, total_before_discount: 30000, total_discount: 0, total_tax: 0,
})
console.log('purchase:', pur.status, pur.data.id || pur.data.error)
const pid = pur.data.id

const posted = await api(`${BASE}/purchases/${pid}/post`, {})
console.log('post:', posted.status, JSON.stringify(posted.data))

// فحص المخزون بعد الترحيل
const stock = await fetch(`${BASE}/items/${item.id}/stock?store_id=${storeId}`, { headers: { Authorization: `Bearer ${TOKEN}` } })
console.log('stock:', await stock.json())

// التحقق من القيد المحاسبي
const je = await fetch(`${BASE}/journals?ref_kind=purchase&ref_id=${pid}`, { headers: { Authorization: `Bearer ${TOKEN}` } })
console.log('journal:', await je.json())

process.exit(0)
