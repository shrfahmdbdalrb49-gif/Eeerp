#!/usr/bin/env python3
"""
QA API Test Suite — Sharaf ERP
دورة كاملة: صنف → مورد → عميل → شراء → ترحيل (مخزون+قيد) → بيع → ترحيل (COGS+قيد)
→ تحصيل → سداد مورد → مرتجع → تقارير (ميزان مراجعة/قائمة دخل/حركة الأصناف)
"""
import sys, requests

BASE = "http://localhost:4000/api"
AUTH = None
results = []

def run(name, fn):
    try:
        ok, msg = fn()
        results.append((name, ok, msg))
        print(("✅" if ok else "❌") + f" {name}: {msg}")
    except Exception as e:
        results.append((name, False, str(e)[:200]))
        print(f"💥 {name}: {e}")

def req(method, path, payload=None, token=None):
    h = {"Content-Type": "application/json"}
    if token is None: token = AUTH
    if token:
        h["Authorization"] = f"Bearer {token}"
    r = requests.request(method, BASE + path, headers=h, json=payload, timeout=30)
    return r

def jget(path):
    r = req("GET", path)
    if r.status_code >= 400:
        raise RuntimeError(f"{path} -> {r.status_code} {r.text[:200]}")
    return r.json()

def jpost(path, payload):
    r = req("POST", path, payload)
    if r.status_code >= 400:
        raise RuntimeError(f"{path} -> {r.status_code} {r.text[:200]}")
    return r.json()

item_id, item2_id, supplier_id, customer_id = None, None, None, None
purchase_id, sale_id = None, None
purchase_entry_no, sale_entry_no, collection_entry_no = None, None, None

def t_login():
    global AUTH
    r = req("POST", "/auth/login", {"username": "admin", "password": "Admin@1234"})
    if r.status_code != 200:
        return False, r.text[:200]
    AUTH = r.json()["token"]
    return bool(AUTH), "token ok"

def t_create_item():
    global item_id
    j = {"name": "باراسيتامول 500mg", "barcode": "6280001234567", "code": "PAR-500",
         "unit": "حبة", "sale_price": 500, "purchase_price": 300}
    r = req("POST", "/items", j)
    if r.status_code >= 400:
        return False, r.text[:200]
    item_id = r.json()["id"]
    return True, f"id={item_id}"

def t_create_item2():
    global item2_id
    j = {"name": "أموكسيسيلين 250mg", "barcode": "6280009876543", "code": "AMX-250",
         "unit": "حبة", "sale_price": 800, "purchase_price": 450}
    r = req("POST", "/items", j)
    if r.status_code >= 400:
        return False, r.text[:200]
    item2_id = r.json()["id"]
    return True, f"id={item2_id}"

def t_create_supplier():
    global supplier_id
    r = req("POST", "/suppliers", {"name": "شركة الأدوية المتحدة", "phone": "777111222"})
    if r.status_code >= 400:
        return False, r.text[:200]
    supplier_id = r.json()["id"]
    return True, f"id={supplier_id}"

def t_create_customer():
    global customer_id
    r = req("POST", "/customers", {"name": "صيدلية الأمل", "phone": "777333444"})
    if r.status_code >= 400:
        return False, r.text[:200]
    customer_id = r.json()["id"]
    return True, f"id={customer_id}"

def t_create_purchase():
    global purchase_id
    r = req("POST", "/purchases", {"supplier_id": supplier_id, "store_id": 1,
        "total_amount": 6000, "lines": [
            {"item_id": item_id, "quantity": 10, "unit_cost": 300, "line_total": 3000},
            {"item_id": item2_id, "quantity": 10, "unit_cost": 300, "line_total": 3000},
        ]})
    if r.status_code >= 400:
        return False, r.text[:200]
    purchase_id = r.json()["id"]
    return True, f"id={purchase_id} no={r.json().get('purchase_no')}"

def t_post_purchase():
    global purchase_entry_no
    r = req("POST", f"/purchases/{purchase_id}/post", {})
    if r.status_code != 200:
        return False, r.text[:300]
    purchase_entry_no = r.json().get("entry_no")
    return True, f"entry={purchase_entry_no}"

def t_stock_check():
    mv = jget("/reports/item-movements")
    rows = mv.get("rows", [])
    total = sum(float(x.get("qty_net", 0)) for x in rows if x.get("item_id") == item_id)
    return abs(total - 10) < 0.001, f"qty={total} (expected 5)"

def t_purchase_je():
    entries = jget("/journals")
    last = next((e for e in entries if e.get("entry_no") == purchase_entry_no), entries[-1])
    full = jget(f"/journals/{last['id']}")
    lns = full.get("lines", [])
    dr = sum(float(x.get("debit", 0)) for x in lns)
    cr = sum(float(x.get("credit", 0)) for x in lns)
    return abs(dr - 6000) < 0.01 and abs(cr - 6000) < 0.01, f"dr={dr} cr={cr}"

def t_create_sale():
    global sale_id
    r = req("POST", "/sales", {"customer_id": customer_id, "store_id": 1,
        "total_amount": 6500, "lines": [
            {"item_id": item_id, "quantity": 5, "unit_price": 500, "line_total": 2500,
             "batch_id": None, "cost_at_sale": 1500},
            {"item_id": item2_id, "quantity": 5, "unit_price": 800, "line_total": 4000,
             "batch_id": None, "cost_at_sale": 1500},
        ]})
    if r.status_code >= 400:
        return False, r.text[:300]
    sale_id = r.json()["id"]
    return True, f"id={sale_id} total={r.json().get('total_amount')}"

def t_post_sale():
    global sale_entry_no
    r = req("POST", f"/sales/{sale_id}/post", {"payment_type": "credit", "paid_amount": 0})
    if r.status_code != 200:
        return False, r.text[:300]
    sale_entry_no = r.json().get("entry_no")
    return True, f"entry={sale_entry_no}"

def t_stock_after_sale():
    mv = jget("/reports/item-movements")
    rows = mv.get("rows", [])
    total = sum(float(x.get("qty_net", 0)) for x in rows if x.get("item_id") == item_id)
    return abs(total - 5) < 0.001, f"qty={total} (expected 5)"

def t_sale_je():
    entries = jget("/journals")
    last = next((e for e in entries if e.get("entry_no") == sale_entry_no), entries[-1])
    lns = jget(f"/journals/{last['id']}").get("lines", [])
    dr = sum(float(x.get("debit", 0)) for x in lns)
    cr = sum(float(x.get("credit", 0)) for x in lns)
    return abs(dr - cr) < 0.01 and dr >= 6500, f"dr={dr} cr={cr} balanced={abs(dr-cr)<0.01}"

def t_collection():
    global collection_entry_no
    from datetime import date
    r = req("POST", "/collections", {"customer_id": customer_id, "amount": 3000,
        "payment_method": "cash", "entry_date": str(date.today())})
    if r.status_code >= 400:
        return False, r.text[:300]
    collection_entry_no = r.json().get("entry_no")
    return True, f"id={r.json()['id']} entry={collection_entry_no}"

def t_collection_je():
    entries = jget("/journals")
    last = next((e for e in entries if e.get("entry_no") == collection_entry_no), None)
    if last is None:
        # fallback: أحدث قيد ref_kind=collection
        last = next((e for e in entries if e.get("ref_kind") == "collection"), None)
    if last is None:
        return False, "collection journal not found"
    lns = jget(f"/journals/{last['id']}").get("lines", [])
    dr = sum(float(x.get("debit", 0)) for x in lns)
    cr = sum(float(x.get("credit", 0)) for x in lns)
    return abs(dr - 3000) < 0.01 and abs(cr - 3000) < 0.01, f"dr={dr} cr={cr}"

def t_supplier_payment():
    from datetime import date
    r = req("POST", "/supplier-payments", {"supplier_id": supplier_id, "amount": 2000,
        "payment_method": "cash", "entry_date": str(date.today())})
    if r.status_code >= 400:
        return False, r.text[:300]
    return True, f"id={r.json()['id']}"

def t_sales_return():
    r = req("POST", "/sales/sales-returns", {"invoice_id": sale_id, "lines": [
        {"item_id": item_id, "quantity": 1, "reason": "اختبار QA"}
    ]})
    if r.status_code >= 400:
        return False, r.text[:300]
    return True, f"id={r.json()['id']}"

def t_trial_balance():
    tb = jget("/reports/trial-balance")
    accounts = tb.get("accounts", [])
    if not accounts:
        return False, "empty accounts"
    dr = sum(float(a.get("debit", 0) or 0) for a in accounts)
    cr = sum(float(a.get("credit", 0) or 0) for a in accounts)
    return abs(dr - cr) < 0.01, f"dr={dr} cr={cr} rows={len(accounts)}"

def t_income_statement():
    is_ = jget("/reports/income-statement")
    return "revenue" in is_ or "rows" in is_, f"revenue={is_.get('revenue')} expense={is_.get('expense')} net={is_.get('net_income')}"

def t_relogin():
    global AUTH
    AUTH = None
    r = req("POST", "/auth/login", {"username": "admin", "password": "Admin@1234"})
    if r.status_code != 200:
        return False, r.text[:100]
    AUTH = r.json()["token"]
    items = jget("/items")
    arr = items if isinstance(items, list) else items.get("items", [])
    return len(arr) >= 2, f"{len(arr)} items persisted"

def t_authz():
    r = req("POST", "/purchases", {"total_amount": 1}, token="invalid-token-xyz")
    return r.status_code == 401, f"status={r.status_code} (expected 401)"

def t_idempotent_post():
    r = req("POST", "/purchases", {"supplier_id": supplier_id, "store_id": 1,
        "total_amount": 900, "lines": [{"item_id": item_id, "quantity": 3,
        "unit_cost": 300, "line_total": 900}]})
    if r.status_code >= 400:
        return False, f"create: {r.text[:150]}"
    pid = r.json()["id"]
    r1 = req("POST", f"/purchases/{pid}/post", {})
    if r1.status_code != 200:
        return False, f"first post: {r1.text[:150]}"
    r2 = req("POST", f"/purchases/{pid}/post", {})
    return r2.status_code >= 400, f"second post status={r2.status_code} (expected >=400)"

if __name__ == "__main__":
    tests = [
        ("login", t_login), ("create_item", t_create_item), ("create_item2", t_create_item2),
        ("create_supplier", t_create_supplier), ("create_customer", t_create_customer),
        ("create_purchase", t_create_purchase), ("post_purchase", t_post_purchase),
        ("stock_check", t_stock_check), ("purchase_je", t_purchase_je),
        ("create_sale", t_create_sale), ("post_sale", t_post_sale),
        ("stock_after_sale", t_stock_after_sale), ("sale_je", t_sale_je),
        ("collection", t_collection), ("collection_je", t_collection_je),
        ("supplier_payment", t_supplier_payment), ("sales_return", t_sales_return),
        ("trial_balance", t_trial_balance), ("income_statement", t_income_statement),
        ("relogin", t_relogin), ("authz", t_authz), ("idempotent_post", t_idempotent_post),
    ]
    for name, fn in tests:
        run(name, fn)
    passed = sum(1 for _, ok, _ in results if ok)
    print(f"\n{'='*50}\nنتيجة: {passed}/{len(results)} نجح")
    sys.exit(0 if passed == len(results) else 1)
