#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""اختبار نهائي بعد v80d: بيع → ترحيل → فحص batch_id → ميزان المراجعة"""
import requests, json

BASE = "https://eeerp-production.up.railway.app"
H = {}
H['Authorization'] = f"Bearer {requests.post(f'{BASE}/api/auth/login', json={'username':'شرف','password':'شرف'}, timeout=30).json()['token']}"

# شراء صغير لإعادة المخزون
p = requests.post(f'{BASE}/api/purchases', headers=H, json={
    'supplier_id': None,
    'lines': [{'item_id': 13, 'quantity': 3, 'unit_cost': 95}],
    'invoice_date': '2026-08-18',
}, timeout=30).json()
pid = p['id']
print('purchase', pid)
print('post purchase:', requests.post(f'{BASE}/api/purchases/{pid}/post', headers=H, timeout=30).json())

# بيع 2
inv = requests.post(f'{BASE}/api/sales', headers=H, json={
    'customer_id': None,
    'lines': [{'item_id': 13, 'quantity': 2, 'unit_price': 200}],
    'invoice_date': '2026-08-18',
}, timeout=30).json()
iid = inv['id']
print('invoice', iid)
r = requests.post(f'{BASE}/api/sales/{iid}/post', headers=H, timeout=30).json()
print('post sale:', r)

# حركات الصنف
ms = requests.get(f'{BASE}/api/items/13/mov', headers=H, timeout=30).json()
print('آخر 4 حركات:')
for m in ms[-4:]:
    print(f"  id={m['id']} {m['movement_type']} {m['quantity']} batch={m['batch_id']} {m['ref_kind']}:{m['ref_id']}")
net = sum(float(m['quantity']) for m in ms)
print('net qty:', net)

# ميزان المراجعة
tb = requests.get(f'{BASE}/api/reports/trial-balance', headers=H, timeout=60).json()
td = sum(float(a.get('debit') or 0) for a in tb['accounts'])
tc = sum(float(a.get('credit') or 0) for a in tb['accounts'])
print(f"ميزان: مدين={td:,.2f} دائن={tc:,.2f} متوازن={abs(td-tc)<0.01}")

# منع البيع فوق المخزون
inv2 = requests.post(f'{BASE}/api/sales', headers=H, json={
    'customer_id': None,
    'lines': [{'item_id': 13, 'quantity': 999, 'unit_price': 200}],
    'invoice_date': '2026-08-18',
}, timeout=30).json()
iid2 = inv2['id']
r2 = requests.post(f'{BASE}/api/sales/{iid2}/post', headers=H, timeout=30)
print('بيع 999 (يجب رفض):', r2.status_code, r2.text[:120])
