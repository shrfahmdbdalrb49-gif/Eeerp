#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""تشخيص حركة المخزون على الإنتاج: لماذا لم ينقص المخزون بعد البيع؟"""
import requests, json

BASE = "https://eeerp-production.up.railway.app"
H = {"Authorization": f"Bearer {requests.post(f'{BASE}/api/auth/login', json={'username':'شرف','password':'شرف'}, timeout=30).json()['token']}", "Content-Type": "application/json"}

# فحص حركات المخزون عبر تقرير item-movements (متاح API)
r = requests.get(f"{BASE}/api/reports/item-movements", headers=H, timeout=60)
print("item-movements:", r.status_code)
print(json.dumps(r.json(), ensure_ascii=False, indent=1)[:3000])
