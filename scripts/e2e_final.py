#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""E2E نهائي على الإنتاج بعد v79e: بيع جديد + فحص batch_id + عرض المخزون + ميزان المراجعة"""
import requests, json, sys

BASE = "https://eeerp-production.up.railway.app"
H = {}

def login():
    tok = requests.post(f'{BASE}/api/auth/login', json={'username': 'شرف', 'password': 'شرف'}, timeout=30).json()['token']
    H['Authorization'] = f'Bearer {tok}'

login()

# 1. بيع جديد على الصنف 13 (متوفر حاليًا 10-11=-1?? لا — المخزون الفعلي: 10 in - 4-2-5=11 out + 2 مرتجع = 1)
# المتوفر = 1. بيع 1 يجب أن ينجح، وبيع 2 يجب أن يُرفض.
print("=== 1) بيع 1 حبة على الصنف 13 (يجب أن ينجح) ===")
r1 = requests.post(f'{BASE}/api/sales', headers=H, json={
    'customer_id': None,
    'lines': [{'item_id': 13, 'quantity': 1, 'unit_price': 200}],
    'invoice_date': '2026-08-18',
}, timeout=30)
print(r1.status_code, r1.text[:200])
inv_id = r1.json().get('id') if r1.ok else None
print("=== 2) ترحيل الفاتورة ===")
if inv_id:
    r2 = requests.post(f'{BASE}/api/sales/{inv_id}/post', headers=H, timeout=30)
    print(r2.status_code, r2.text[:150])

print("=== 3) بيع 2 حبة أخرى (يجب أن يُرفض — المتوفر 0) ===")
r3 = requests.post(f'{BASE}/api/sales', headers=H, json={
    'customer_id': None,
    'lines': [{'item_id': 13, 'quantity': 2, 'unit_price': 200}],
    'invoice_date': '2026-08-18',
}, timeout=30)
print(r3.status_code, r3.text[:200])

print("=== 4) عرض المخزون (يجب أن يكون total=0) ===")
r4 = requests.get(f'{BASE}/api/items/13/stock', headers=H, timeout=30)
print(r4.status_code, r4.text[:400])

print("=== 5) حركات المخزون (يجب أن تكون حركات البيع الجديدة بـ batch_id=11) ===")
r5 = requests.get(f'{BASE}/api/items/13/mov', headers=H, timeout=30)
for m in r5.json():
    print(f"  id={m['id']} {m['movement_type']} {m['quantity']} batch={m['batch_id']} ref={m['ref_kind']}:{m['ref_id']}")

print("=== 6) ميزان المراجعة ===")
r6 = requests.get(f'{BASE}/api/reports/trial-balance', headers=H, timeout=60)
tb = r6.json()
td = sum(float(a.get('total_debit') or 0) for a in tb.get('accounts', []))
tc = sum(float(a.get('total_credit') or 0) for a in tb.get('accounts', []))
print(f"مدين = {td:,.2f} | دائن = {tc:,.2f} | متوازن = {abs(td-tc) < 0.01}")
