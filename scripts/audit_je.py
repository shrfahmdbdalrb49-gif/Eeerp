#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""فحص كل القيود على الإنتاج: كشف الأسطر التي فيها debit>0 وcredit>0 معًا"""
import requests, json, sys

BASE = "https://eeerp-production.up.railway.app"
tok = requests.post(f'{BASE}/api/auth/login', json={'username': 'شرف', 'password': 'شرف'}, timeout=30).json()['token']
H = {'Authorization': f'Bearer {tok}'}

list_ = requests.get(f'{BASE}/api/journals', headers=H, timeout=60).json()
print(f"عدد القيود: {len(list_)}")
bad_count = 0
for e in list_:
    d = requests.get(f"{BASE}/api/journals/{e['id']}", headers=H, timeout=60).json()
    for l in d.get('lines', []):
        dr = float(l.get('debit') or 0)
        cr = float(l.get('credit') or 0)
        if dr > 0 and cr > 0:
            bad_count += 1
            print(f"  مشوه: {e['entry_no']} سطر {l['id']} حساب {l['account_id']} dr={dr} cr={cr} | {l.get('description','')[:40]}")
        if dr == 0 and cr == 0:
            print(f"  صفري: {e['entry_no']} سطر {l['id']}")
print(f"أسطر مشوهة (dr>0 وcr>0): {bad_count}")
