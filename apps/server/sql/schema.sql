-- ============================================
-- شرف ERP - مخطط قاعدة البيانات المركزية (PostgreSQL)
-- نسخة 2 - متطابق بالكامل مع كود الخادم الجديد
-- يدعم: المحاسبة المزدوجة، المخزون بالدفعات،
-- المبيعات والمشتريات والمرتجعات، التحصيل، الخزينة،
-- إقفال الفترات، المستخدمين والصلاحيات (RBAC)، التدقيق
-- ============================================

-- ---------- المستخدمون والأدوار (RBAC) ----------
CREATE TABLE IF NOT EXISTS roles (
  id serial PRIMARY KEY,
  name text UNIQUE NOT NULL,            -- admin, accountant, sales, cashier, warehouse
  description text
);

CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  username text UNIQUE NOT NULL,
  full_name text,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'cashier', -- يرتبط بـ roles.name
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id serial PRIMARY KEY,
  role_name text NOT NULL REFERENCES roles(name) ON DELETE CASCADE,
  permission text NOT NULL,             -- مثال: sales.create, reports.read, journals.post
  UNIQUE (role_name, permission)
);

-- ---------- الإعدادات العامة ----------
CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value jsonb
);

-- ---------- الفروع والمخازن والصناديق ----------
CREATE TABLE IF NOT EXISTS branches (
  id serial PRIMARY KEY,
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  address text,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS stores (
  id serial PRIMARY KEY,
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  branch_id int REFERENCES branches(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS cash_boxes (
  id serial PRIMARY KEY,
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  branch_id int REFERENCES branches(id) ON DELETE SET NULL,
  balance numeric(18,2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'YER',
  active boolean NOT NULL DEFAULT true
);

-- ---------- دليل الحسابات المحاسبي ----------
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id serial PRIMARY KEY,
  code text UNIQUE NOT NULL,            -- مثال: 1100
  number text NOT NULL,                 -- رقم العرض (قد يكرر الفروع)
  name text NOT NULL,
  type text NOT NULL,                   -- asset, liability, equity, revenue, expense
  parent_id text REFERENCES chart_of_accounts(code) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED,
  balance_direction text CHECK (balance_direction IN ('debit','credit')),
  is_contra boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order int DEFAULT 0
);

-- ---------- الأصناف والدفعات والمخزون ----------
CREATE TABLE IF NOT EXISTS items (
  id serial PRIMARY KEY,
  code text UNIQUE,
  barcode text UNIQUE,
  name text NOT NULL,
  name_en text,
  category text,
  unit text DEFAULT 'حبة',
  purchase_unit_cost numeric(18,2) DEFAULT 0,
  sale_price numeric(18,2) DEFAULT 0,
  min_stock numeric(18,2) DEFAULT 0,
  taxable boolean NOT NULL DEFAULT false,
  tax_rate numeric(8,2) DEFAULT 0,
  profit_account_id int REFERENCES chart_of_accounts(id),
  purchase_account_id int REFERENCES chart_of_accounts(id),
  inventory_account_id int REFERENCES chart_of_accounts(id),
  cogs_account_id int REFERENCES chart_of_accounts(id),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS batches (
  id serial PRIMARY KEY,
  item_id int NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  store_id int REFERENCES stores(id) ON DELETE SET NULL,
  batch_no text,
  expiry_date date,
  cost_per_unit numeric(18,2) DEFAULT 0,
  UNIQUE (item_id, store_id, batch_no)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id serial PRIMARY KEY,
  item_id int NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  batch_id int REFERENCES batches(id) ON DELETE SET NULL,
  store_id int REFERENCES stores(id) ON DELETE SET NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('in','out','adjust')),
  quantity numeric(18,2) NOT NULL DEFAULT 0,
  unit_cost numeric(18,2) DEFAULT 0,
  ref_kind text,                        -- purchase, sale, return, transfer, opening
  ref_id int,
  created_by int REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stock_mov_ref ON stock_movements(ref_kind, ref_id);

-- ---------- الموردون والمشتريات ----------
CREATE TABLE IF NOT EXISTS suppliers (
  id serial PRIMARY KEY,
  code text UNIQUE,
  name text NOT NULL,
  phone text,
  address text,
  active boolean NOT NULL DEFAULT true
);

CREATE SEQUENCE IF NOT EXISTS seq_purchases START 1;

CREATE TABLE IF NOT EXISTS purchases (
  id serial PRIMARY KEY,
  purchase_no text UNIQUE,
  purchase_date date NOT NULL,
  supplier_id int REFERENCES suppliers(id) ON DELETE SET NULL,
  branch_id int REFERENCES branches(id) ON DELETE SET NULL,
  store_id int REFERENCES stores(id) ON DELETE SET NULL,
  total_before_discount numeric(18,2) NOT NULL DEFAULT 0,
  total_discount numeric(18,2) NOT NULL DEFAULT 0,
  total_tax numeric(18,2) NOT NULL DEFAULT 0,
  total_amount numeric(18,2) NOT NULL DEFAULT 0,
  paid_amount numeric(18,2) NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'credit' CHECK (payment_method IN ('cash','credit','bank')),
  currency text DEFAULT 'YER',
  notes text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','received','posted','cancelled')),
  created_by int REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_lines (
  id serial PRIMARY KEY,
  purchase_id int NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  item_id int NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  batch_id int REFERENCES batches(id) ON DELETE SET NULL,
  quantity numeric(18,2) NOT NULL,
  bonus_quantity numeric(18,2) DEFAULT 0,
  unit_cost numeric(18,2) NOT NULL,
  total_discount numeric(18,2) DEFAULT 0,
  tax_amount numeric(18,2) DEFAULT 0,
  line_total numeric(18,2) NOT NULL
);

-- ---------- العملاء والمبيعات ----------
CREATE TABLE IF NOT EXISTS customers (
  id serial PRIMARY KEY,
  code text UNIQUE,
  name text NOT NULL,
  phone text,
  address text,
  active boolean NOT NULL DEFAULT true
);

CREATE SEQUENCE IF NOT EXISTS seq_invoices START 1;
CREATE SEQUENCE IF NOT EXISTS seq_journal_entries START 1;

CREATE TABLE IF NOT EXISTS sales_invoices (
  id serial PRIMARY KEY,
  invoice_no text UNIQUE,
  invoice_date date NOT NULL,
  invoice_time time,
  customer_id int REFERENCES customers(id) ON DELETE SET NULL,
  branch_id int REFERENCES branches(id) ON DELETE SET NULL,
  store_id int REFERENCES stores(id) ON DELETE SET NULL,
  sale_type text DEFAULT 'retail' CHECK (sale_type IN ('retail','wholesale')),
  payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash','credit','bank')),
  currency text DEFAULT 'YER',
  total_before_discount numeric(18,2) NOT NULL DEFAULT 0,
  total_discount numeric(18,2) NOT NULL DEFAULT 0,
  total_tax numeric(18,2) NOT NULL DEFAULT 0,
  total_amount numeric(18,2) NOT NULL DEFAULT 0,
  paid_amount numeric(18,2) NOT NULL DEFAULT 0,
  remaining_amount numeric(18,2) NOT NULL DEFAULT 0,
  notes text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','final','cancelled')),
  created_by int REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales_lines (
  id serial PRIMARY KEY,
  invoice_id int NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  item_id int NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  batch_id int REFERENCES batches(id) ON DELETE SET NULL,
  quantity numeric(18,2) NOT NULL,
  unit text,
  unit_price numeric(18,2) NOT NULL,
  discount_amount numeric(18,2) DEFAULT 0,
  tax_amount numeric(18,2) DEFAULT 0,
  line_total numeric(18,2) NOT NULL,
  cost_at_sale numeric(18,2) DEFAULT 0   -- التكلفة لحظة البيع لحساب الربح
);

-- ---------- المرتجعات ----------
CREATE TABLE IF NOT EXISTS sales_returns (
  id serial PRIMARY KEY,
  return_no text UNIQUE,
  return_date date NOT NULL,
  original_invoice_id int REFERENCES sales_invoices(id) ON DELETE SET NULL,
  customer_id int REFERENCES customers(id) ON DELETE SET NULL,
  branch_id int REFERENCES branches(id) ON DELETE SET NULL,
  store_id int REFERENCES stores(id) ON DELETE SET NULL,
  reason text,
  total_amount numeric(18,2) NOT NULL DEFAULT 0,
  notes text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','final','cancelled')),
  created_by int REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales_return_lines (
  id serial PRIMARY KEY,
  return_id int NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
  item_id int NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  quantity numeric(18,2) NOT NULL,
  unit_price numeric(18,2) NOT NULL,
  line_total numeric(18,2) NOT NULL
);

-- ---------- التحصيل والسداد ----------
CREATE TABLE IF NOT EXISTS collections (
  id serial PRIMARY KEY,
  collection_no text UNIQUE,
  collection_date date NOT NULL,
  customer_id int REFERENCES customers(id) ON DELETE SET NULL,
  supplier_id int REFERENCES suppliers(id) ON DELETE SET NULL,
  amount numeric(18,2) NOT NULL,
  payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash','bank','check','other')),
  cash_box_id int REFERENCES cash_boxes(id) ON DELETE SET NULL,
  receipt_no text,
  notes text,
  created_by int REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_payments (
  id serial PRIMARY KEY,
  payment_no text UNIQUE,
  payment_date date NOT NULL,
  supplier_id int REFERENCES suppliers(id) ON DELETE SET NULL,
  amount numeric(18,2) NOT NULL,
  payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash','bank','check','other')),
  cash_box_id int REFERENCES cash_boxes(id) ON DELETE SET NULL,
  notes text,
  created_by int REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- قيود اليومية (المحاسبة المزدوجة) ----------
CREATE TABLE IF NOT EXISTS journal_entries (
  id serial PRIMARY KEY,
  entry_no text UNIQUE,
  entry_date date NOT NULL,
  description text,
  ref_kind text,                        -- sale, purchase, collection, supplier_payment, manual, opening, salary, expense
  ref_id int,
  posted boolean NOT NULL DEFAULT false,
  locked boolean NOT NULL DEFAULT false,-- يمنع التعديل بعد إقفال الفترة
  created_by int REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);

CREATE TABLE IF NOT EXISTS journal_lines (
  id serial PRIMARY KEY,
  entry_id int NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id int NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  description text,
  debit numeric(18,2) NOT NULL DEFAULT 0,
  credit numeric(18,2) NOT NULL DEFAULT 0,
  CHECK (debit >= 0 AND credit >= 0)
);

-- ---------- الخزينة ----------
CREATE TABLE IF NOT EXISTS bank_accounts (
  id serial PRIMARY KEY,
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  bank_name text,
  account_no text,
  branch_id int REFERENCES branches(id) ON DELETE SET NULL,
  balance numeric(18,2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'YER',
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS receipts (
  id serial PRIMARY KEY,
  ref_no text UNIQUE,
  receipt_type text NOT NULL DEFAULT 'expense' CHECK (receipt_type IN ('expense','treasury_transfer','check')),
  account_key text,
  branch_id int REFERENCES branches(id) ON DELETE SET NULL,
  treasury text,
  amount numeric(18,2) NOT NULL,
  currency text DEFAULT 'YER',
  check_no text,
  check_due_date date,
  check_bank text,
  cost_center text,
  recipient text,
  statement text,
  doc_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','posted','cancelled')),
  entry_id int,
  notes text,
  created_by int REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- إقفال الفترات ----------
CREATE TABLE IF NOT EXISTS period_closes (
  id serial PRIMARY KEY,
  period text UNIQUE NOT NULL,          -- صيغة YYYY-MM
  closed_at timestamptz NOT NULL DEFAULT now(),
  closed_by int REFERENCES users(id) ON DELETE SET NULL,
  notes text
);

-- ---------- التحويلات بين المخازن ----------
CREATE TABLE IF NOT EXISTS transfers (
  id serial PRIMARY KEY,
  ref_no text UNIQUE,
  from_store_id int REFERENCES stores(id) ON DELETE SET NULL,
  to_store_id int REFERENCES stores(id) ON DELETE SET NULL,
  transfer_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','cancelled')),
  notes text,
  created_by int REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transfer_lines (
  id serial PRIMARY KEY,
  transfer_id int NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  item_id int NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  batch_id int REFERENCES batches(id) ON DELETE SET NULL,
  qty numeric(18,2) NOT NULL
);

-- ---------- الأطباء والوصفات ----------
CREATE TABLE IF NOT EXISTS doctors (
  id serial PRIMARY KEY,
  code text UNIQUE,
  name text NOT NULL,
  specialty text,
  phone text,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id serial PRIMARY KEY,
  patient_name text,
  patient_phone text,
  doctor_id int REFERENCES doctors(id) ON DELETE SET NULL,
  prescription_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','dispensed','cancelled')),
  notes text,
  created_by int REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prescription_lines (
  id serial PRIMARY KEY,
  prescription_id int NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  item_id int NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  qty numeric(18,2) NOT NULL,
  instructions text
);

-- ---------- الفواتير المعلقة ----------
CREATE TABLE IF NOT EXISTS held_invoices (
  id serial PRIMARY KEY,
  customer_id int REFERENCES customers(id) ON DELETE SET NULL,
  payment_type text DEFAULT 'cash',
  total numeric(18,2) NOT NULL DEFAULT 0,
  lines jsonb NOT NULL DEFAULT '[]',
  held_at timestamptz NOT NULL DEFAULT now(),
  held_by int REFERENCES users(id) ON DELETE SET NULL
);

-- ---------- سجل التدقيق ----------
CREATE TABLE IF NOT EXISTS audit_logs (
  id serial PRIMARY KEY,
  user_id int REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,                 -- item.create, sale.post, journal.manual...
  ref_kind text,
  ref_id int,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
