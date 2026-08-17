/* retro-je-fix: تصحيح الأسطر الصفرية في القيود القديمة أُنشئت قبل إصلاحات المحاسبة
   فقط الصفوف التي فيها debit=0 AND credit=0 تُحدَّث (الأسطر السليمة لا تُمس) */

/* قيود الشراء: سطر المخزون debit وخطر المورد/الصندوق credit = line_total */
UPDATE journal_lines jl
SET debit  = CASE WHEN jl.debit = 0 THEN COALESCE(pl.line_total,0) ELSE jl.debit END,
    credit = CASE WHEN jl.credit = 0 THEN COALESCE(pl.line_total,0) ELSE jl.credit END
FROM journal_entries je
JOIN purchases p          ON p.id = je.ref_id AND je.ref_kind = 'purchase'
JOIN purchase_lines pl    ON pl.purchase_id = p.id
WHERE jl.entry_id = je.id AND jl.debit = 0 AND jl.credit = 0;

/* أولًا: تصحيح purchase_lines line_total الخاطئ في المشتريات القديمة (أنشئت قبل إصلاح الحساب) */
UPDATE purchase_lines
SET line_total = ROUND((quantity * COALESCE(unit_cost, 0))::numeric, 2)
WHERE line_total = 0;

/* تصحيح إجماليات المشتريات القديمة: total = مجموع الخطوط، paid = المدفوع */
UPDATE purchases
SET total_before_discount = t.ta,
    total_amount = t.ta
FROM (
  SELECT purchase_id,
         COALESCE(SUM(line_total), 0) AS ta
  FROM purchase_lines GROUP BY purchase_id
) t
WHERE purchases.id = t.purchase_id;

/* قيود الشراء: أسطر الصندوق (دفع مقدم) — سددت نقدي: debit = paid_amount */
UPDATE journal_lines jl
SET debit = CASE WHEN jl.debit = 0 THEN COALESCE(p.paid_amount,0) ELSE jl.debit END
FROM journal_entries je
JOIN purchases p ON p.id = je.ref_id AND je.ref_kind = 'purchase'
WHERE jl.entry_id = je.id AND jl.debit = 0 AND jl.credit = 0;

/* أولًا: تصحيح line_total الخاطئ في سطور الفواتير القديمة (أنشئت قبل إصلاح الحساب) */
UPDATE sales_lines
SET line_total = ROUND((quantity * (COALESCE(unit_price, 0) - COALESCE(discount_amount, 0) + COALESCE(tax_amount, 0)))::numeric, 2)
WHERE line_total = 0;

UPDATE sales_invoices s
SET total_before_discount = t.tbd,
    total_discount = t.td,
    total_tax = t.tt,
    total_amount = t.ta
FROM (
  SELECT invoice_id,
         COALESCE(SUM(ROUND((quantity * (COALESCE(unit_price, 0) - COALESCE(discount_amount, 0)))::numeric, 2)), 0) AS tbd,
         COALESCE(SUM(COALESCE(discount_amount, 0)), 0) AS td,
         COALESCE(SUM(COALESCE(tax_amount, 0)), 0) AS tt,
         COALESCE(SUM(line_total), 0) AS ta
  FROM sales_lines GROUP BY invoice_id
) t
WHERE s.id = t.invoice_id AND s.status = 'final' AND s.total_amount = 0;

/* قيود المبيعات: سطر العميل debit وخطر الإيراد credit = line_total */
UPDATE journal_lines jl
SET debit  = CASE WHEN jl.debit = 0 THEN COALESCE(sl.line_total,0) ELSE jl.debit END,
    credit = CASE WHEN jl.credit = 0 THEN COALESCE(sl.line_total,0) ELSE jl.credit END
FROM journal_entries je
JOIN sales_invoices s   ON s.id = je.ref_id AND je.ref_kind = 'sale'
JOIN sales_lines sl     ON sl.invoice_id = s.id
WHERE jl.entry_id = je.id AND jl.debit = 0 AND jl.credit = 0;

/* قيود المبيعات: سطر COGS debit وخطر المخزون credit = cost_at_sale */
UPDATE journal_lines jl
SET debit  = CASE WHEN jl.debit = 0 THEN COALESCE(sl.cost_at_sale,0) ELSE jl.debit END,
    credit = CASE WHEN jl.credit = 0 THEN COALESCE(sl.cost_at_sale,0) ELSE jl.credit END
FROM journal_entries je
JOIN sales_invoices s   ON s.id = je.ref_id AND je.ref_kind = 'sale'
JOIN sales_lines sl     ON sl.invoice_id = s.id
WHERE jl.entry_id = je.id AND jl.debit = 0 AND jl.credit = 0;

/* قيود التحصيل النقدي للمبيعات: سطر الصندوق debit وخطر العملاء credit = amount */
UPDATE journal_lines jl
SET debit = CASE WHEN jl.debit = 0 THEN COALESCE(c.amount,0) ELSE jl.debit END
FROM journal_entries je
JOIN collections c ON c.id = je.ref_id AND je.ref_kind = 'collection'
WHERE jl.entry_id = je.id AND jl.debit = 0 AND jl.credit = 0;

UPDATE journal_lines jl
SET credit = CASE WHEN jl.credit = 0 THEN COALESCE(c.amount,0) ELSE jl.credit END
FROM journal_entries je
JOIN collections c ON c.id = je.ref_id AND je.ref_kind = 'collection'
WHERE jl.entry_id = je.id AND jl.debit = 0 AND jl.credit = 0;

/* قيود سداد الموردين: سطر الموردون debit وخطر الصندوق credit = amount */
UPDATE journal_lines jl
SET debit = CASE WHEN jl.debit = 0 THEN COALESCE(sp.amount,0) ELSE jl.debit END
FROM journal_entries je
JOIN supplier_payments sp ON sp.id = je.ref_id AND je.ref_kind = 'supplier_payment'
WHERE jl.entry_id = je.id AND jl.debit = 0 AND jl.credit = 0;

UPDATE journal_lines jl
SET credit = CASE WHEN jl.credit = 0 THEN COALESCE(sp.amount,0) ELSE jl.credit END
FROM journal_entries je
JOIN supplier_payments sp ON sp.id = je.ref_id AND je.ref_kind = 'supplier_payment'
WHERE jl.entry_id = je.id AND jl.debit = 0 AND jl.credit = 0;
