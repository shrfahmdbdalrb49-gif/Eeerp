#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import requests, json, sys

BASE = "https://eeerp-production.up.railway.app"
tok = requests.post(f'{BASE}/api/auth/login', json={'username': 'شرف', 'password': 'شرف'}, timeout=30).json()['token']
H = {'Authorization': f'Bearer {tok}'}
d = requests.get(f'{BASE}/api/reports/general-ledger/16', headers=H, timeout=60).json()
print('opening:', d['opening_balance'])
bal = float(d['opening_balance'] or 0)
for m in d['movements']:
    dr = float(m.get('debit') or 0)
    cr = float(m.get('credit') or 0)
    bal += dr - cr
    print(m['entry_no'], '|', (m.get('description') or '')[:55], '| dr', dr, 'cr', cr)
print('closing balance:', round(bal, 2))
