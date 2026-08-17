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

/* قيود الشراء: أسطر الصندوق (دفع مقدم) — سددت نقدي: debit = paid_amount */
UPDATE journal_lines jl
SET debit = CASE WHEN jl.debit = 0 THEN COALESCE(p.paid_amount,0) ELSE jl.debit END
FROM journal_entries je
JOIN purchases p ON p.id = je.ref_id AND je.ref_kind = 'purchase'
WHERE jl.entry_id = je.id AND jl.debit = 0 AND jl.credit = 0;

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
