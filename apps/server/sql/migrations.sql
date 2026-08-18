-- مigrations: إضافة الأعمدة الناقصة للجداول الموجودة (CREATE TABLE IF NOT EXISTS لا يحدّث الجداول القديمة)
-- يُنفذ قبل schema.sql؛ فشل أي أمر غير حرج (العمود موجود أصلًا) ويُتجاهل بأمان عبر DO blocks

-- purchases: عمود posted
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'posted') THEN
    ALTER TABLE purchases ADD COLUMN posted boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- sales: عمود posted
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'posted') THEN
    ALTER TABLE sales ADD COLUMN posted boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- purchases/sales: عمود status إن لم يوجد
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'status') THEN
    ALTER TABLE purchases ADD COLUMN status text NOT NULL DEFAULT 'draft';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'status') THEN
    ALTER TABLE sales ADD COLUMN status text NOT NULL DEFAULT 'draft';
  END IF;
END $$;

-- stock_movements: reserved_quantity
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'reserved_quantity') THEN
    ALTER TABLE stock_movements ADD COLUMN reserved_quantity numeric(18,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- journal_entries: posted
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journal_entries' AND column_name = 'posted') THEN
    ALTER TABLE journal_entries ADD COLUMN posted boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- journal_entries: ref_kind / ref_id / user_id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journal_entries' AND column_name = 'ref_kind') THEN
    ALTER TABLE journal_entries ADD COLUMN ref_kind text;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journal_entries' AND column_name = 'ref_id') THEN
    ALTER TABLE journal_entries ADD COLUMN ref_id int;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'journal_entries' AND column_name = 'user_id') THEN
    ALTER TABLE journal_entries ADD COLUMN user_id int;
  END IF;
END $$;

-- users: full_name / active إن لم exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'full_name') THEN
    ALTER TABLE users ADD COLUMN full_name text;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'active') THEN
    ALTER TABLE users ADD COLUMN active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- items: الحقول الأساسية إن لم توجد
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'unit') THEN
    ALTER TABLE items ADD COLUMN unit text;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'barcode') THEN
    ALTER TABLE items ADD COLUMN barcode text;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'sale_price') THEN
    ALTER TABLE items ADD COLUMN sale_price numeric(18,2);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'purchase_unit_cost') THEN
    ALTER TABLE items ADD COLUMN purchase_unit_cost numeric(18,2);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'min_stock') THEN
    ALTER TABLE items ADD COLUMN min_stock numeric(18,2);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'category') THEN
    ALTER TABLE items ADD COLUMN category text;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'active') THEN
    ALTER TABLE items ADD COLUMN active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- purchase_lines / sales_lines: عمود tax_rate للضريبة الاختيارية على مستوى السطر
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_lines' AND column_name = 'tax_rate') THEN
    ALTER TABLE purchase_lines ADD COLUMN tax_rate numeric(6,4) NOT NULL DEFAULT 0;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_lines' AND column_name = 'tax_rate') THEN
    ALTER TABLE sales_lines ADD COLUMN tax_rate numeric(6,4) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- customers / suppliers: name + حقول أساسية
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'name') THEN
    ALTER TABLE customers ADD COLUMN name text;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'name') THEN
    ALTER TABLE suppliers ADD COLUMN name text;
  END IF;
END $$;

-- items: ربط الصنف بالمورد الرئيسي (المورد المفضل)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'preferred_supplier_id') THEN
    ALTER TABLE items ADD COLUMN preferred_supplier_id int REFERENCES suppliers(id) ON DELETE SET NULL;
  END IF;
END $$;
