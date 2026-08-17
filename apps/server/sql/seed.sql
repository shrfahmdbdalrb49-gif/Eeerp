-- ============================================
-- شرف ERP - البيانات الأولية (تُنفذ مرة واحدة بعد schema.sql)
-- الأدوار والصلاحيات + دليل حسابات قياسي + مستخدم إداري + إعدادات
-- ============================================

-- ---------- الأدوار ----------
INSERT INTO roles (name, description) VALUES
  ('admin', 'مدير النظام - صلاحيات كاملة'),
  ('accountant', 'محاسب - القيود والتقارير وإقفال الفترات'),
  ('sales', 'مبيعات وتحصيل'),
  ('cashier', 'كاشير - فواتير وتحصيل فقط'),
  ('warehouse', 'مخازن - مشتريات ومخزون'),
  ('viewer', 'مشاهد فقط - قراءة التقارير')
ON CONFLICT (name) DO NOTHING;

-- ---------- الصلاحيات ----------
INSERT INTO role_permissions (role_name, permission) VALUES
  ('admin', 'users.manage'),
  ('admin', 'system.settings'),
  ('admin', 'audit.read'),
  ('admin', 'sales.read'),
  ('admin', 'sales.create'),
  ('admin', 'sales.delete'),
  ('admin', 'purchases.read'),
  ('admin', 'purchases.create'),
  ('admin', 'purchases.receive'),
  ('admin', 'items.read'),
  ('admin', 'items.write'),
  ('admin', 'collections.read'),
  ('admin', 'collections.write'),
  ('admin', 'supplier_payments.write'),
  ('admin', 'accounts.read'),
  ('admin', 'accounts.write'),
  ('admin', 'journals.read'),
  ('admin', 'journals.write'),
  ('admin', 'journals.post'),
  ('admin', 'reports.read'),
  ('admin', 'branches.manage'),
  ('admin', 'period.close'),
  ('admin', 'cashboxes.manage'),

  ('accountant', 'accounts.read'),
  ('accountant', 'accounts.write'),
  ('accountant', 'journals.read'),
  ('accountant', 'journals.write'),
  ('accountant', 'journals.post'),
  ('accountant', 'reports.read'),
  ('accountant', 'audit.read'),
  ('accountant', 'items.read'),
  ('accountant', 'sales.read'),
  ('accountant', 'purchases.read'),
  ('accountant', 'collections.read'),
  ('accountant', 'supplier_payments.read'),
  ('accountant', 'period.close'),
  ('accountant', 'treasury.read'),
  ('accountant', 'treasury.write'),

  ('sales', 'sales.read'),
  ('sales', 'sales.create'),
  ('sales', 'sales.delete'),
  ('sales', 'collections.read'),
  ('sales', 'collections.write'),
  ('sales', 'customers.read'),
  ('sales', 'items.read'),
  ('sales', 'cashboxes.read'),

  ('cashier', 'sales.read'),
  ('cashier', 'sales.create'),
  ('cashier', 'sales.delete'),
  ('cashier', 'collections.read'),
  ('cashier', 'collections.write'),
  ('cashier', 'customers.read'),
  ('cashier', 'items.read'),
  ('cashier', 'cashboxes.read'),

  ('warehouse', 'purchases.read'),
  ('warehouse', 'purchases.create'),
  ('warehouse', 'purchases.receive'),
  ('warehouse', 'items.read'),
  ('warehouse', 'items.write'),
  ('warehouse', 'suppliers.read'),
  ('warehouse', 'suppliers.write'),
  ('warehouse', 'stores.read'),
  ('warehouse', 'transfers.manage'),

  ('viewer', 'items.read'),
  ('viewer', 'reports.read')
ON CONFLICT (role_name, permission) DO NOTHING;

-- ---------- دليل الحسابات المحاسبي القياسي ----------
INSERT INTO chart_of_accounts (code, number, name, type, parent_id, balance_direction, sort_order) VALUES
  ('1', '1', 'الأصول', 'asset', NULL, 'debit', 1),
  ('2', '2', 'الخصوم', 'liability', NULL, 'credit', 20),
  ('3', '3', 'حقوق الملكية', 'equity', NULL, 'credit', 40),
  ('4', '4', 'الإيرادات', 'revenue', NULL, 'credit', 60),
  ('5', '5', 'المصروفات', 'expense', NULL, 'debit', 80)
ON CONFLICT (code) DO NOTHING;
INSERT INTO chart_of_accounts (code, number, name, type, parent_id, balance_direction, sort_order) VALUES
  ('11', '11', 'الأصول المتداولة', 'asset', 1, 'debit', 2),
  ('21', '21', 'الخصوم المتداولة', 'liability', 2, 'credit', 21),
  ('41', '41', 'إيرادات المبيعات', 'revenue', 4, 'credit', 61),
  ('42', '42', 'مردودات ومقاصة المبيعات', 'revenue', 4, 'debit', 65),
  ('51', '51', 'تكلفة المبيعات', 'expense', 5, 'debit', 81),
  ('52', '52', 'المصروفات التشغيلية', 'expense', 5, 'debit', 90)
ON CONFLICT (code) DO NOTHING;
INSERT INTO chart_of_accounts (code, number, name, type, parent_id, balance_direction, sort_order) VALUES
  ('1101', '1101', 'الصندوق الرئيسي', 'asset', 11, 'debit', 3),
  ('1102', '1102', 'الصندوق الفرعي', 'asset', 11, 'debit', 4),
  ('1103', '1103', 'البنك - الحساب الجاري', 'asset', 11, 'debit', 5),
  ('1104', '1104', 'العملاء - الذمم المدينة', 'asset', 11, 'debit', 6),
  ('1105', '1105', 'المخزون', 'asset', 11, 'debit', 7),
  ('1106', '1106', 'الشيكات المستلمة', 'asset', 11, 'debit', 8),
  ('1107', '1107', 'العهدة الفرعية', 'asset', 11, 'debit', 9),
  ('1108', '1108', 'سلف الموظفين', 'asset', 11, 'debit', 10),
  ('2101', '2101', 'الموردون - الذمم الدائنة', 'liability', 21, 'credit', 22),
  ('2102', '2102', 'الشيكات المعطاة', 'liability', 21, 'credit', 23),
  ('2103', '2103', 'رواتب مستحقة الدفع', 'liability', 21, 'credit', 24),
  ('2104', '2104', 'الضرائب المستحقة', 'liability', 21, 'credit', 25),
  ('3101', '3101', 'رأس المال', 'equity', 3, 'credit', 41),
  ('3102', '3102', 'الأرباح المحتجزة', 'equity', 3, 'credit', 42),
  ('4101', '4101', 'إيرادات المبيعات', 'revenue', 41, 'credit', 62),
  ('4102', '4102', 'إيرادات صرف الوصفات', 'revenue', 41, 'credit', 63),
  ('4103', '4103', 'إيرادات أخرى', 'revenue', 41, 'credit', 64),
  ('5101', '5101', 'تكلفة الأصناف المباعة', 'expense', 51, 'debit', 82),
  ('5102', '5102', 'مرجعيات ومردودات المبيعات', 'expense', 51, 'debit', 83),
  ('5201', '5201', 'رواتب وأجور', 'expense', 52, 'debit', 91),
  ('5202', '5202', 'إيجارات', 'expense', 52, 'debit', 92),
  ('5203', '5203', 'كهرباء وماء', 'expense', 52, 'debit', 93),
  ('5204', '5204', 'صيانة', 'expense', 52, 'debit', 94),
  ('5205', '5205', 'مصروفات عامة وإدارية', 'expense', 52, 'debit', 95)
ON CONFLICT (code) DO NOTHING;

-- ---------- المستخدم الإداري ----------
-- كلمة المرور الافتراضية: Admin@1234 (يجب تغييرها فور أول دخول)
INSERT INTO users (username, full_name, password_hash, role, active) VALUES
  ('admin', 'مدير النظام', crypt('Admin@1234', gen_salt('bf')), 'admin', true),
  ('شرف', 'المالك — شرف', crypt('شرف', gen_salt('bf')), 'admin', true)
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, full_name = EXCLUDED.full_name, role = EXCLUDED.role, active = EXCLUDED.active;

-- ---------- إعدادات النظام ----------
INSERT INTO settings (key, value) VALUES
  ('company_name', '"Sharaf ERP"'),
  ('currency', '"YER"'),
  ('storage_mode', '"server"')
ON CONFLICT (key) DO NOTHING;

-- ---------- الفرع والمخزن والصندوق الافتراضي ----------
INSERT INTO branches (code, name, active) VALUES
  ('HQ', 'الفرع الرئيسي', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO stores (code, name, branch_id) VALUES
  ('MAIN', 'المخزن الرئيسي', (SELECT id FROM branches WHERE code = 'HQ' LIMIT 1))
ON CONFLICT (code) DO NOTHING;

INSERT INTO cash_boxes (code, name, branch_id) VALUES
  ('MAIN_CB', 'الصندوق الرئيسي', (SELECT id FROM branches WHERE code = 'HQ' LIMIT 1))
ON CONFLICT (code) DO NOTHING;

-- ---------- تسلسلات أرقام المراجع ----------
CREATE SEQUENCE IF NOT EXISTS seq_purchases START 1;
CREATE SEQUENCE IF NOT EXISTS seq_sales START 1;
CREATE SEQUENCE IF NOT EXISTS seq_collections START 1;
CREATE SEQUENCE IF NOT EXISTS seq_supplier_payments START 1;
CREATE SEQUENCE IF NOT EXISTS seq_transfers START 1;
CREATE SEQUENCE IF NOT EXISTS seq_sales_returns START 1;
CREATE SEQUENCE IF NOT EXISTS seq_receipts START 1;
CREATE SEQUENCE IF NOT EXISTS seq_journal_entries START 1;
