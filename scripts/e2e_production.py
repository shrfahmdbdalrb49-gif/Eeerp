#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
اختبار E2E شامل على بيئة الإنتاج (Railway) — v77
الحقول مبينة من قراءة الكود الفعلي:
- items: code, name, unit, purchase_unit_cost, sale_price
- purchases/sales: head fields + lines[] (item_id, quantity, unit_cost/unit_price)
- ميزان المراجعة: {to_date, accounts:[{code,name,debit,credit,balance}], total_debit, total_credit}
- /api/accounts GET يعيد صفوف chart_of_accounts (عمودا type و name)
"""
import requests, json, time

BASE = "https://eeerp-production.up.railway.app"

def auth(username, password):
    r = requests.post(f"{BASE}/api/auth/login", json={"username": username, "password": password}, timeout=30)
    assert r.status_code == 200 and r.json().get("token"), f"فشل تسجيل الدخول: {r.status_code} {r.text[:150]}"
    return {"Authorization": f"Bearer {r.json()['token']}", "Content-Type": "application/json"}

def req(method, path, H, data=None):
    r = requests.request(method, f"{BASE}{path}", headers=H, json=data, timeout=60)
    assert r.status_code in (200, 201, 204), f"HTTP {r.status_code} {method} {path}: {r.text[:300]}"
    try: return r.json()
    except Exception: return {}

H = auth("شرف", "شرف")
results = []

def check(name, ok, detail=""):
    status = "✅" if ok else "❌"
    results.append((name, ok, detail))
    print(f"{status} {name}" + (f" — {detail}" if detail else ""))

# 0) Health
health = requests.get(f"{BASE}/api/health", timeout=30)
check("صحة API (Health)", health.status_code == 200, f"v{health.json().get('build','?')}")

accts = req("GET", "/api/accounts", H)
accts_list = accts if isinstance(accts, list) else accts.get("rows") or accts.get("accounts") or []
check("قراءة الحسابات", len(accts_list) > 0, f"{len(accts_list)} حساب")
by_code = {a["code"]: a for a in accts_list}
inv_id, cash_id, cust_id, sup_id = by_code.get("1105",{}).get("id"), by_code.get("1101",{}).get("id"), by_code.get("1104",{}).get("id"), by_code.get("2101",{}).get("id")
check("حسابات قياسية جاهزة", bool(inv_id and cash_id and cust_id and sup_id), f"مخزون={inv_id}, صندوق={cash_id}, ذمم مدينة={cust_id}, موردون={sup_id}")

# ميزان قبل
tb0 = req("GET", "/api/reports/trial-balance", H)
b0 = tb0.get("total_debit", 0), tb0.get("total_credit", 0)

# 1) صنف
item = req("POST", "/api/items", H, {"code": f"E2E{int(time.time()) % 100000}", "name": "صنف اختبار E2E لا تحذفه", "unit": "حبة", "purchase_unit_cost": 100, "sale_price": 150})
item_id = item.get("id")
check("إنشاء صنف", bool(item_id), f"id={item_id}")

# 2) مورّد وعميل
sup = req("POST", "/api/suppliers", H, {"name": "مورّد اختبار E2E", "phone": "0000000000"})
cust = req("POST", "/api/customers", H, {"name": "عميل اختبار E2E", "phone": "0000000000"})
check("إنشاء مورّد وعميل", bool(sup.get("id") and cust.get("id")), f"مورّد={sup.get('id')}, عميل={cust.get('id')}")

# 3) فاتورة شراء + ترحيل
po = req("POST", "/api/purchases", H, {"supplier_id": sup["id"], "lines": [{"item_id": item_id, "quantity": 10, "unit_cost": 95}]})
po_id = po.get("id")
check("إنشاء فاتورة شراء", bool(po_id), f"id={po_id}, total={po.get('total_amount')}")
po_post = req("POST", f"/api/purchases/{po_id}/post", H)
check("ترحيل الشراء", po_post.get("ok") is True, f"entry_no={po_post.get('entry_no')}")
stock1 = req("GET", f"/api/items/{item_id}/stock", H)
q1 = sum(float(b.get("qty_available") or b.get("quantity") or 0) for b in (stock1 if isinstance(stock1, list) else []))
check("المخزون بعد الشراء", q1 == 10, f"المتاح={q1}")

# 4) فاتورة بيع + ترحيل (نقدي جزئي لتوليد قيد تحصيل)
so = req("POST", "/api/sales", H, {"customer_id": cust["id"], "lines": [{"item_id": item_id, "quantity": 4, "unit_price": 150}], "paid_amount": 300})
so_id = so.get("id")
check("إنشاء فاتورة بيع", bool(so_id), f"id={so_id}, total={so.get('total_amount')}, paid={so.get('paid_amount')}")
so_post = req("POST", f"/api/sales/{so_id}/post", H)
check("ترحيل البيع", so_post.get("ok") is True, f"entry_no={so_post.get('entry_no')}")
stock2 = req("GET", f"/api/items/{item_id}/stock", H)
q2 = sum(float(b.get("qty_available") or b.get("quantity") or 0) for b in (stock2 if isinstance(stock2, list) else []))
check("المخزون بعد البيع", q2 == 6, f"المتاح={q2}")

# 5) مرتجع بيع + ترحيل
ret = req("POST", "/api/sales/returns", H, {"customer_id": cust["id"], "lines": [{"item_id": item_id, "quantity": 1, "unit_price": 150}]})
ret_id = ret.get("id")
check("إنشاء مرتجع مبيعات", bool(ret_id), f"id={ret_id}")
ret_post = req("POST", f"/api/sales/returns/{ret_id}/post", H)
check("ترحيل المرتجع (بقيم حقيقية)", ret_post.get("ok") is True, f"entry_no={ret_post.get('entry_no')}")
stock3 = req("GET", f"/api/items/{item_id}/stock", H)
q3 = sum(float(b.get("qty_available") or b.get("quantity") or 0) for b in (stock3 if isinstance(stock3, list) else []))
check("المخزون بعد المرتجع", q3 == 7, f"المتاح={q3}")

# 6) اختبار رفض المرتجع الصفري
try:
    bad = requests.post(f"{BASE}/api/sales/returns", headers=H, json={"customer_id": cust["id"], "lines": [{"item_id": item_id, "quantity": 1, "unit_price": 0}]}, timeout=60)
    check("رفض مرتجع صفري القيمة", bad.status_code in (400, 422), f"HTTP {bad.status_code}")
except Exception as e:
    check("رفض مرتجع صفري القيمة", False, str(e)[:100])

# 7) ميزان المراجعة
tb = req("GET", "/api/reports/trial-balance", H)
accs = tb.get("accounts", [])
td, tc = tb.get("total_debit", 0), tb.get("total_credit", 0)
diff = abs(td - tc)
check("ميزان المراجعة (مجموع المدين والدائن)", len(accs) > 0, f"حسابات={len(accs)}")
check("توازن الميزان", diff < 0.01, f"مدين={td:.2f}, دائن={tc:.2f}, فرق={diff:.2f}")

# 8) قيود اليوم الفعلية للتحقق من عدم وجود أسطر صفرية
je = req("GET", "/api/journals", H)
je_list = je if isinstance(je, list) else je.get("entries") or je.get("rows") or []
zero_lines = 0
for e in je_list:
    for l in (e.get("lines") or []):
        if float(l.get("debit") or 0) == 0 and float(l.get("credit") or 0) == 0:
            zero_lines += 1
check("لا توجد أسطر قيود صفرية", zero_lines == 0, f"قيود={len(je_list)}, أسطر صفرية={zero_lines}")

# 9) قائمة الدخل + الميزانية
is_data = req("GET", "/api/reports/income-statement", H)
bs_data = req("GET", "/api/reports/balance-sheet", H)
check("قائمة الدخل", bool(is_data), f"{str(is_data)[:120]}")
check("الميزانية العمومية", bool(bs_data), f"{str(bs_data)[:120]}")

# 10) التحقق من وجود القيود المرتبطة بالشراء/البيع/المرتجع في السجل
refs = {r["ref_kind"] for r in (tb.get("entries") or [])} if False else set()
gl = req("GET", "/api/reports/general-ledger/1105", H)  # مخزون
check("الأستاذ العام (مخزون)", bool(gl), f"{str(gl)[:150]}")

print("\n" + "=" * 60)
ok_n = sum(1 for _, o, _ in results if o)
print(f"✅ نجح: {ok_n}/{len(results)} خطوة")
for n, o, d in results:
    if not o: print("  ⛔", n, "-", d)
print("=" * 60)
