/* fix-je-lines: تصحيح الأسطر التي أفسدها retro-je-fix.sql
   retro-je-fix كان يملأ debit وcredit معًا (نفس المبلغ) في أسطر كانت صفرية
   القاعدة: الأسطر "مشتريات/مبيعات/تكلفة مبيعات/خصم مخزون" مدينة تمامًا
            والأسطر "فاتورة مورد/إيراد مبيعات/سداد" دائنة تمامًا */

/* الأسطر المدينة: نُصفّر الدائن */
UPDATE journal_lines
SET credit = 0
WHERE debit > 0 AND credit > 0
  AND (description LIKE 'مشتريات%'
    OR description LIKE 'مبيعات: %'
    OR description LIKE 'تكلفة مبيعات%'
    OR description LIKE 'خصم مخزون%'
    OR description LIKE 'تحصيل نقدي%'
    OR description LIKE 'دفعة مقدمة%'
    OR description LIKE 'سداد مورد%');

/* الأسطر الدائنة: نُصفّر المدين */
UPDATE journal_lines
SET debit = 0
WHERE debit > 0 AND credit > 0
  AND (description LIKE 'فاتورة مورد%'
    OR description LIKE 'إيراد مبيعات%'
    OR description LIKE 'سداد جزء من الذمم%'
    OR description LIKE 'دفعة من الصندوق%'
    OR description LIKE 'سداد دفعة%');
