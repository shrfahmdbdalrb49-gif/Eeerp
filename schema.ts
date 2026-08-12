import {
  int,
  bigint,
  boolean,
  date,
  decimal,
  double,
  index,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * شرف ERP — مخطط قاعدة البيانات
 * Multi-Tenant Pharmacy SaaS. كل الجداول عدا users/systems تحمل tenantId.
 * الأرقام المالية تُخزَّن bigint (بالفلس/الهللة = 2 خانة عشرية) لتجنب أخطاء floating.
 */

// ============ المستخدمون والمستأجرون ============

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** منظمة / مستأجر (سلسلة صيدليات أو صيدلية فردية) */
export const tenants = mysqlTable("tenants", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  currency: varchar("currency", { length: 6 }).default("YER").notNull(),
  minExpiryDays: int("minExpiryDays").default(90).notNull(),
  settings: json("settings"), // إعدادات عامة: لغة، تقويم، سياسات
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** عضو في منظمة مع دور وصلاحية */
export const tenantUsers = mysqlTable("tenant_users", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "pharmacist", "technician", "accountant", "purchase_manager", "branch_manager", "staff"]).default("staff").notNull(),
  branchId: int("branchId"),
  settings: json("settings"), // إعدادات العرض: إعدادات الجداول المخصصة
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [uniqueIndex("tu_tenant_user").on(t.tenantId, t.userId)]);

// ============ البيانات الأساسية ============

export const branches = mysqlTable("branches", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  code: varchar("code", { length: 24 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  address: varchar("address", { length: 320 }),
  phone: varchar("phone", { length: 40 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [uniqueIndex("br_code").on(t.tenantId, t.code)]);

export const stores = mysqlTable("stores", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  branchId: int("branchId").notNull(),
  code: varchar("code", { length: 24 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [uniqueIndex("st_code").on(t.tenantId, t.code)]);

export const currencies = mysqlTable("currencies", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  code: varchar("code", { length: 6 }).notNull(), // YER, USD, SAR
  name: varchar("name", { length: 80 }).notNull(),
  rate: double("rate").default(1).notNull(), // مقابل عملة المنظمة الأساسية
  active: boolean("active").default(true).notNull(),
}, (t) => [uniqueIndex("cur_code").on(t.tenantId, t.code)]);

export const taxes = mysqlTable("taxes", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  code: varchar("code", { length: 24 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  rate: double("rate").default(0).notNull(), // %
  active: boolean("active").default(true).notNull(),
}, (t) => [uniqueIndex("tx_code").on(t.tenantId, t.code)]);

export const fiscalYears = mysqlTable("fiscal_years", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  closed: boolean("closed").default(false).notNull(),
}, (t) => [uniqueIndex("fy_tenant").on(t.tenantId, t.name)]);

export const paymentMethods = mysqlTable("payment_methods", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  code: varchar("code", { length: 40 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  kind: mysqlEnum("kind", ["cash", "card", "bank_transfer", "check", "insurance"]).default("cash").notNull(),
  active: boolean("active").default(true).notNull(),
}, (t) => [uniqueIndex("pm_code").on(t.tenantId, t.code)]);

export const units = mysqlTable("units", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  code: varchar("code", { length: 24 }).notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  active: boolean("active").default(true).notNull(),
}, (t) => [uniqueIndex("un_code").on(t.tenantId, t.code)]);

export const therapeuticGroups = mysqlTable("therapeutic_groups", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  code: varchar("code", { length: 24 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  parentId: int("parentId"),
  active: boolean("active").default(true).notNull(),
});

// ============ الأصناف وقاعدة البيانات الدوائية ============

export const items = mysqlTable("items", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  code: varchar("code", { length: 40 }).notNull(),
  barcode: varchar("barcode", { length: 64 }),
  name: varchar("name", { length: 200 }).notNull(),
  nameEn: varchar("nameEn", { length: 200 }),
  scientificName: varchar("scientificName", { length: 200 }),
  manufacturer: varchar("manufacturer", { length: 200 }),
  strength: varchar("strength", { length: 120 }), // التركيز
  dosageForm: varchar("dosageForm", { length: 120 }), // الشكل الدوائي
  groupId: int("groupId"), // المجموعة العلاجية
  unitId: int("unitId"),
  requiresPrescription: boolean("requiresPrescription").default(false).notNull(),
  hasExpiry: boolean("hasExpiry").default(true).notNull(),
  useBatch: boolean("useBatch").default(true).notNull(),
  minStock: double("minStock").default(0).notNull(), // حد أدنى للمخزون
  costPrice: bigint("costPrice", {mode: "number"}).default(0).notNull(), // بالعملة الصغرى
  sellPrice: bigint("sellPrice", {mode: "number"}).default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [uniqueIndex("it_code").on(t.tenantId, t.code)]);

/** البدائل الدوائية */
export const itemAlternatives = mysqlTable("item_alternatives", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  itemId: int("itemId").notNull(),
  alternativeId: int("alternativeId").notNull(),
}, (t) => [index("ia_item").on(t.itemId)]);

/** التفاعلات الدوائية */
export const itemInteractions = mysqlTable("item_interactions", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  itemIdA: int("itemIdA").notNull(),
  itemIdB: int("itemIdB").notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high"]).default("medium").notNull(),
  note: varchar("note", { length: 300 }),
});

/** قوائم الأسعار */
export const priceLists = mysqlTable("price_lists", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  active: boolean("active").default(true).notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
});

export const priceListItems = mysqlTable("price_list_items", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  priceListId: int("priceListId").notNull(),
  itemId: int("itemId").notNull(),
  price: bigint("price", {mode: "number"}).default(0).notNull(),
}, (t) => [uniqueIndex("pli_pl_item").on(t.tenantId, t.priceListId, t.itemId)]);

/** سياسات التسعير (هامش تلقائي) */
export const pricingPolicies = mysqlTable("pricing_policies", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  marginPercent: double("marginPercent").default(20).notNull(),
  rounding: varchar("rounding", { length: 40 }).default("nearest100").notNull(),
  active: boolean("active").default(true).notNull(),
});

// ============ الأطراف: عملاء / مرضى / أطباء / موردون / تأمين ============

export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  kind: mysqlEnum("kind", ["patient", "regular"]).default("patient").notNull(),
  code: varchar("code", { length: 40 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  taxNumber: varchar("taxNumber", { length: 40 }),
  creditLimit: bigint("creditLimit", {mode: "number"}).default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [uniqueIndex("cu_code").on(t.tenantId, t.code)]);

export const doctors = mysqlTable("doctors", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  code: varchar("code", { length: 40 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  specialty: varchar("specialty", { length: 160 }),
  phone: varchar("phone", { length: 40 }),
  source: varchar("source", { length: 120 }), // جهة الوصف
  active: boolean("active").default(true).notNull(),
}, (t) => [uniqueIndex("dr_code").on(t.tenantId, t.code)]);

export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  code: varchar("code", { length: 40 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  taxNumber: varchar("taxNumber", { length: 40 }),
  city: varchar("city", { length: 120 }),
  creditLimit: bigint("creditLimit", {mode: "number"}).default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [uniqueIndex("su_code").on(t.tenantId, t.code)]);

export const insuranceCompanies = mysqlTable("insurance_companies", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  code: varchar("code", { length: 40 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  contractRate: double("contractRate").default(100).notNull(), // % من الفاتورة تغطيها الشركة
  contactPhone: varchar("contactPhone", { length: 40 }),
  active: boolean("active").default(true).notNull(),
}, (t) => [uniqueIndex("ic_code").on(t.tenantId, t.code)]);

export const insuranceCards = mysqlTable("insurance_cards", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  customerId: int("customerId").notNull(),
  companyId: int("companyId").notNull(),
  cardNumber: varchar("cardNumber", { length: 80 }).notNull(),
  expiryDate: date("expiryDate"),
  active: boolean("active").default(true).notNull(),
}, (t) => [index("icard_cust").on(t.customerId)]);

// ============ المحاسبة: دليل الحسابات ============

export const glAccounts = mysqlTable("gl_accounts", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  code: varchar("code", { length: 24 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  kind: mysqlEnum("kind", ["asset", "liability", "equity", "income", "expense"]).notNull(),
  parentId: int("parentId"),
  level: int("level").default(1).notNull(),
  allowPost: boolean("allowPost").default(true).notNull(),
  active: boolean("active").default(true).notNull(),
}, (t) => [uniqueIndex("gla_code").on(t.tenantId, t.code)]);

/** أرصدة الحسابات المحسوبة (تُحافظ عليها مع كل قيد) */
export const glAccountBalances = mysqlTable("gl_account_balances", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  accountId: int("accountId").notNull(),
  debit: bigint("debit", {mode: "number"}).default(0).notNull(),
  credit: bigint("credit", {mode: "number"}).default(0).notNull(),
}, (t) => [uniqueIndex("gab_acc").on(t.tenantId, t.accountId)]);

/** أرصدة الأطراف المساعدة: صندوق، بنك، عميل، تأمين، مورد */
export const partyBalances = mysqlTable("party_balances", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  kind: mysqlEnum("kind", ["cash_box", "bank", "customer", "insurance", "supplier"]).notNull(),
  refId: int("refId").notNull(),
  balance: bigint("balance", {mode: "number"}).default(0).notNull(), // + قبض من العميل / رصيد صندوق
}, (t) => [uniqueIndex("pb_ref").on(t.tenantId, t.kind, t.refId)]);

// ============ المبيعات ============

export const saleInvoices = mysqlTable("sale_invoices", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  branchId: int("branchId").notNull(),
  storeId: int("storeId").notNull(),
  docNo: varchar("docNo", { length: 32 }).notNull(),
  docDate: date("docDate").notNull(),
  customerId: int("customerId"),
  doctorId: int("doctorId"),
  prescriptionNo: varchar("prescriptionNo", { length: 40 }),
  insuranceCardId: int("insuranceCardId"),
  kind: mysqlEnum("kind", ["cash", "credit", "insurance"]).default("cash").notNull(),
  currencyId: int("currencyId"),
  rate: double("rate").default(1).notNull(),
  status: mysqlEnum("status", ["draft", "final", "posted", "cancelled"]).default("draft").notNull(),
  subtotal: bigint("subtotal", {mode: "number"}).default(0).notNull(),
  discount: bigint("discount", {mode: "number"}).default(0).notNull(),
  tax: bigint("tax", {mode: "number"}).default(0).notNull(),
  total: bigint("total", {mode: "number"}).default(0).notNull(),
  paid: bigint("paid", {mode: "number"}).default(0).notNull(),
  remaining: bigint("remaining", {mode: "number"}).default(0).notNull(),
  paymentMethodId: int("paymentMethodId"),
  cashAccountId: int("cashAccountId"), // صندوق/بنك مستلم
  dueDate: date("dueDate"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  postedAt: timestamp("postedAt"),
}, (t) => [uniqueIndex("si_docno").on(t.tenantId, t.docNo), index("si_date").on(t.tenantId, t.docDate)]);

export const saleInvoiceLines = mysqlTable("sale_invoice_lines", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  invoiceId: int("invoiceId").notNull(),
  itemId: int("itemId").notNull(),
  batchId: int("batchId").notNull(), // التشغيلة (FEFO)
  unit: varchar("unit", { length: 40 }),
  qty: double("qty").default(0).notNull(),
  price: bigint("price", {mode: "number"}).default(0).notNull(),
  discountPercent: double("discountPercent").default(0).notNull(),
  taxPercent: double("taxPercent").default(0).notNull(),
  lineTotal: bigint("lineTotal", {mode: "number"}).default(0).notNull(),
}, (t) => [index("sil_inv").on(t.invoiceId)]);

export const saleReturns = mysqlTable("sale_returns", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  invoiceId: int("invoiceId").notNull(),
  docNo: varchar("docNo", { length: 32 }).notNull(),
  docDate: date("docDate").notNull(),
  status: mysqlEnum("status", ["draft", "final", "posted", "cancelled"]).default("draft").notNull(),
  total: bigint("total", { mode: "number" }).default(0).notNull(),
  notes: text("notes"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [uniqueIndex("sr_docno").on(t.tenantId, t.docNo)]);

export const saleReturnLines = mysqlTable("sale_return_lines", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  returnId: int("returnId").notNull(),
  lineId: int("lineId").notNull(),
  itemId: int("itemId").notNull(),
  batchId: int("batchId").notNull(),
  qty: double("qty").default(0).notNull(),
  price: bigint("price", { mode: "number" }).default(0).notNull(),
  lineTotal: bigint("lineTotal", { mode: "number" }).default(0).notNull(),
}, (t) => [index("srl_ret").on(t.returnId)]);

export const purchaseReturns = mysqlTable("purchase_returns", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  supplierId: int("supplierId").notNull(),
  docNo: varchar("docNo", { length: 32 }).notNull(),
  docDate: date("docDate").notNull(),
  status: mysqlEnum("status", ["draft", "final", "posted", "cancelled"]).default("draft").notNull(),
  total: bigint("total", {mode: "number"}).default(0).notNull(),
  notes: text("notes"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [uniqueIndex("pr_docno").on(t.tenantId, t.docNo)]);

export const purchaseReturnLines = mysqlTable("purchase_return_lines", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  returnId: int("returnId").notNull(),
  itemId: int("itemId").notNull(),
  batchId: int("batchId").notNull(),
  qty: double("qty").default(0).notNull(),
  price: bigint("price", {mode: "number"}).default(0).notNull(),
  lineTotal: bigint("lineTotal", {mode: "number"}).default(0).notNull(),
}, (t) => [index("prl_ret").on(t.returnId)]);

// ============ المشتريات ============

export const purchaseOrders = mysqlTable("purchase_orders", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  supplierId: int("supplierId").notNull(),
  docNo: varchar("docNo", { length: 32 }).notNull(),
  docDate: date("docDate").notNull(),
  branchId: int("branchId").notNull(),
  status: mysqlEnum("status", ["draft", "sent", "received", "cancelled"]).default("draft").notNull(),
  total: bigint("total", {mode: "number"}).default(0).notNull(),
  notes: text("notes"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [uniqueIndex("po_docno").on(t.tenantId, t.docNo)]);

export const purchaseOrderLines = mysqlTable("purchase_order_lines", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  orderId: int("orderId").notNull(),
  itemId: int("itemId").notNull(),
  qty: double("qty").default(0).notNull(),
  unit: varchar("unit", { length: 40 }),
  estPrice: bigint("estPrice", {mode: "number"}).default(0).notNull(),
}, (t) => [index("pol_ord").on(t.orderId)]);

export const purchaseInvoices = mysqlTable("purchase_invoices", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  supplierId: int("supplierId").notNull(),
  branchId: int("branchId").notNull(),
  storeId: int("storeId").notNull(),
  docNo: varchar("docNo", { length: 32 }).notNull(),
  refNo: varchar("refNo", { length: 40 }), // رقم فاتورة المورد
  docDate: date("docDate").notNull(),
  dueDate: date("dueDate"),
  currencyId: int("currencyId"),
  rate: double("rate").default(1).notNull(),
  kind: mysqlEnum("kind", ["cash", "credit"]).default("credit").notNull(),
  status: mysqlEnum("status", ["draft", "approved", "final", "posted", "cancelled"]).default("draft").notNull(),
  orderId: int("orderId"), // أمر شراء مستدعى
  awbNo: varchar("awbNo", { length: 40 }), // بوليصة الشحن
  carrier: varchar("carrier", { length: 120 }),
  arrivedAt: date("arrivedAt"),
  receivedBy: varchar("receivedBy", { length: 120 }),
  subtotal: bigint("subtotal", {mode: "number"}).default(0).notNull(),
  bonus: bigint("bonus", {mode: "number"}).default(0).notNull(),
  discount: bigint("discount", {mode: "number"}).default(0).notNull(),
  tax: bigint("tax", {mode: "number"}).default(0).notNull(),
  shippingCost: bigint("shippingCost", {mode: "number"}).default(0).notNull(),
  extraCosts: bigint("extraCosts", {mode: "number"}).default(0).notNull(),
  total: bigint("total", {mode: "number"}).default(0).notNull(),
  paid: bigint("paid", {mode: "number"}).default(0).notNull(),
  remaining: bigint("remaining", {mode: "number"}).default(0).notNull(),
  paymentMethodId: int("paymentMethodId"),
  cashAccountId: int("cashAccountId"),
  receiptNo: varchar("receiptNo", { length: 40 }), // سند ربط
  notes: text("notes"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  postedAt: timestamp("postedAt"),
}, (t) => [uniqueIndex("pi_docno").on(t.tenantId, t.docNo), uniqueIndex("pi_ref").on(t.tenantId, t.supplierId, t.refNo), index("pi_date").on(t.tenantId, t.docDate)]);

export const purchaseInvoiceLines = mysqlTable("purchase_invoice_lines", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  invoiceId: int("invoiceId").notNull(),
  itemId: int("itemId").notNull(),
  unit: varchar("unit", { length: 40 }),
  batchNo: varchar("batchNo", { length: 60 }),
  mfgDate: date("mfgDate"),
  expDate: date("expDate"),
  qty: double("qty").default(0).notNull(),
  bonusQty: double("bonusQty").default(0).notNull(),
  purchasePrice: bigint("purchasePrice", {mode: "number"}).default(0).notNull(),
  discountPercent: double("discountPercent").default(0).notNull(),
  discountValue: bigint("discountValue", {mode: "number"}).default(0).notNull(),
  taxPercent: double("taxPercent").default(0).notNull(),
  taxValue: bigint("taxValue", {mode: "number"}).default(0).notNull(),
  extraCost: bigint("extraCost", {mode: "number"}).default(0).notNull(),
  unitCost: bigint("unitCost", {mode: "number"}).default(0).notNull(), // التكلفة النهائية للوحدة
  lineTotal: bigint("lineTotal", {mode: "number"}).default(0).notNull(),
  shelf: varchar("shelf", { length: 60 }),
  notes: text("notes"),
}, (t) => [index("pil_inv").on(t.invoiceId)]);

// ============ المخزون: التشغيلات (Batches) ============

export const batches = mysqlTable("batches", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  itemId: int("itemId").notNull(),
  storeId: int("storeId").notNull(),
  batchNo: varchar("batchNo", { length: 60 }).notNull(),
  mfgDate: date("mfgDate"),
  expDate: date("expDate").notNull(),
  qty: double("qty").default(0).notNull(), // الكمية المتبقية
  cost: bigint("cost", {mode: "number"}).default(0).notNull(), // تكلفة الوحدة
  shelf: varchar("shelf", { length: 60 }),
  sourceKind: mysqlEnum("sourceKind", ["purchase", "opening", "transfer_in", "return", "adjusted", "recalled"]).default("purchase").notNull(),
  sourceId: int("sourceId"), // فاتورة شراء / قيد افتتاحي / تحويل / مرتجع
  recalled: boolean("recalled").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [index("bt_item_store").on(t.tenantId, t.itemId, t.storeId), index("bt_exp").on(t.tenantId, t.expDate)]);

/** حركة المخزون (التشغيلات) */
export const stockMovements = mysqlTable("stock_movements", {
  id: bigint("id", {mode: "number"}).autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  itemId: int("itemId").notNull(),
  batchId: int("batchId").notNull(),
  storeId: int("storeId").notNull(),
  kind: mysqlEnum("kind", ["in_purchase", "in_return", "in_adjust_up", "in_transfer", "out_sale", "out_return", "out_adjust_down", "out_destroy", "out_transfer"]).notNull(),
  qty: double("qty").default(0).notNull(),
  cost: bigint("cost", {mode: "number"}).default(0).notNull(),
  refKind: varchar("refKind", { length: 60 }), // sale_invoices / purchase_invoices / ...
  refId: int("refId"),
  docNo: varchar("docNo", { length: 32 }),
  docDate: date("docDate").notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [index("sm_item").on(t.tenantId, t.itemId), index("sm_ref").on(t.tenantId, t.refKind, t.refId)]);

/** الجرد */
export const stockCounts = mysqlTable("stock_counts", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  branchId: int("branchId").notNull(),
  storeId: int("storeId").notNull(),
  docNo: varchar("docNo", { length: 32 }).notNull(),
  docDate: date("docDate").notNull(),
  kind: mysqlEnum("kind", ["periodic", "surprise", "expiry"]).default("periodic").notNull(),
  status: mysqlEnum("status", ["draft", "final", "posted", "cancelled"]).default("draft").notNull(),
  notes: text("notes"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [uniqueIndex("sc_docno").on(t.tenantId, t.docNo)]);

export const stockCountLines = mysqlTable("stock_count_lines", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  countId: int("countId").notNull(),
  itemId: int("itemId").notNull(),
  batchId: int("batchId").notNull(),
  systemQty: double("systemQty").default(0).notNull(),
  actualQty: double("actualQty").default(0).notNull(),
  cost: bigint("cost", {mode: "number"}).default(0).notNull(),
}, (t) => [index("scl_cnt").on(t.countId)]);

// ============ الصندوق والبنوك والسندات ============

export const cashAccounts = mysqlTable("cash_accounts", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  code: varchar("code", { length: 24 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  kind: mysqlEnum("kind", ["box", "bank"]).notNull(),
  currencyId: int("currencyId"),
  active: boolean("active").default(true).notNull(),
}, (t) => [uniqueIndex("ca_code").on(t.tenantId, t.code)]);

export const treasuryDocuments = mysqlTable("treasury_documents", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  kind: mysqlEnum("kind", ["receipt", "payment"]).notNull(),
  docNo: varchar("docNo", { length: 32 }).notNull(),
  docDate: date("docDate").notNull(),
  cashAccountId: int("cashAccountId").notNull(),
  partyKind: mysqlEnum("partyKind", ["customer", "insurance", "supplier", "gl"]).notNull(),
  partyId: int("partyId").notNull(),
  checkNo: varchar("checkNo", { length: 40 }),
  isCheck: boolean("isCheck").default(false).notNull(),
  total: bigint("total", {mode: "number"}).default(0).notNull(),
  status: mysqlEnum("status", ["draft", "final", "posted", "cancelled"]).default("draft").notNull(),
  notes: text("notes"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  postedAt: timestamp("postedAt"),
}, (t) => [uniqueIndex("td_docno").on(t.tenantId, t.docNo)]);

export const treasuryLines = mysqlTable("treasury_lines", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  documentId: int("documentId").notNull(),
  refKind: mysqlEnum("refKind", ["sale_invoice", "purchase_invoice", "gl"]).notNull(),
  refId: int("refId").notNull(),
  amount: bigint("amount", {mode: "number"}).default(0).notNull(),
}, (t) => [index("tl_doc").on(t.documentId)]);

/** التحويلات المالية بين الصناديق */
export const fundTransfers = mysqlTable("fund_transfers", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  docNo: varchar("docNo", { length: 32 }).notNull(),
  docDate: date("docDate").notNull(),
  fromAccountId: int("fromAccountId").notNull(),
  toAccountId: int("toAccountId").notNull(),
  amount: bigint("amount", {mode: "number"}).default(0).notNull(),
  status: mysqlEnum("status", ["draft", "final", "posted", "cancelled"]).default("draft").notNull(),
  notes: text("notes"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [uniqueIndex("ft_docno").on(t.tenantId, t.docNo)]);

/** التحويل بين المخازن/الفروع */
export const branchTransfers = mysqlTable("branch_transfers", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  docNo: varchar("docNo", { length: 32 }).notNull(),
  docDate: date("docDate").notNull(),
  fromStoreId: int("fromStoreId").notNull(),
  toStoreId: int("toStoreId").notNull(),
  status: mysqlEnum("status", ["draft", "final", "posted", "cancelled"]).default("draft").notNull(),
  notes: text("notes"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [uniqueIndex("bt_docno").on(t.tenantId, t.docNo)]);

export const branchTransferLines = mysqlTable("branch_transfer_lines", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  transferId: int("transferId").notNull(),
  itemId: int("itemId").notNull(),
  batchId: int("batchId").notNull(),
  qty: double("qty").default(0).notNull(),
  receivedQty: double("receivedQty").default(0).notNull(),
}, (t) => [index("btl_trf").on(t.transferId)]);

// ============ القيود المحاسبية ============

export const journalEntries = mysqlTable("journal_entries", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  docNo: varchar("docNo", { length: 32 }).notNull(),
  docDate: date("docDate").notNull(),
  description: varchar("description", { length: 300 }),
  sourceKind: varchar("sourceKind", { length: 60 }), // auto / sale / purchase / treasury / opening / manual
  refKind: varchar("refKind", { length: 60 }),
  refId: int("refId"),
  status: mysqlEnum("status", ["draft", "posted", "cancelled"]).default("draft").notNull(),
  totalDebit: bigint("totalDebit", {mode: "number"}).default(0).notNull(),
  totalCredit: bigint("totalCredit", {mode: "number"}).default(0).notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  postedAt: timestamp("postedAt"),
}, (t) => [uniqueIndex("je_docno").on(t.tenantId, t.docNo), index("je_src").on(t.tenantId, t.sourceKind, t.refKind, t.refId)]);

export const journalEntryLines = mysqlTable("journal_entry_lines", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  entryId: int("entryId").notNull(),
  accountId: int("accountId").notNull(),
  description: varchar("description", { length: 300 }),
  debit: bigint("debit", {mode: "number"}).default(0).notNull(),
  credit: bigint("credit", {mode: "number"}).default(0).notNull(),
}, (t) => [index("jel_je").on(t.entryId)]);

// ============ التأمين: المطالبات ============

export const insuranceApprovals = mysqlTable("insurance_approvals", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  cardId: int("cardId").notNull(),
  approvalNo: varchar("approvalNo", { length: 60 }),
  amount: bigint("amount", {mode: "number"}).default(0).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const insuranceClaims = mysqlTable("insurance_claims", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  docNo: varchar("docNo", { length: 32 }).notNull(),
  docDate: date("docDate").notNull(),
  invoiceId: int("invoiceId").notNull(),
  customerId: int("customerId").notNull(),
  companyId: int("companyId").notNull(),
  cardId: int("cardId"),
  amount: bigint("amount", {mode: "number"}).default(0).notNull(),
  settledAmount: bigint("settledAmount", {mode: "number"}).default(0).notNull(),
  status: mysqlEnum("status", ["pending", "sent", "accepted", "rejected", "settled"]).default("pending").notNull(),
  rejectionReason: varchar("rejectionReason", { length: 300 }),
  notes: text("notes"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [uniqueIndex("cl_docno").on(t.tenantId, t.docNo), index("cl_inv").on(t.invoiceId)]);

// ============ الوصفات الطبية ============

export const prescriptions = mysqlTable("prescriptions", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  docNo: varchar("docNo", { length: 32 }).notNull(),
  docDate: date("docDate").notNull(),
  customerId: int("customerId").notNull(),
  doctorId: int("doctorId"),
  note: text("note"),
  status: mysqlEnum("status", ["draft", "filled", "cancelled"]).default("draft").notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [uniqueIndex("rx_docno").on(t.tenantId, t.docNo)]);

export const prescriptionLines = mysqlTable("prescription_lines", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  prescriptionId: int("prescriptionId").notNull(),
  itemId: int("itemId").notNull(),
  dose: varchar("dose", { length: 200 }),
  duration: varchar("duration", { length: 120 }),
  qty: double("qty").default(0).notNull(),
}, (t) => [index("rsl_rx").on(t.prescriptionId)]);

// ============ المرفقات وسجل العمليات ============

export const attachments = mysqlTable("attachments", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  refKind: varchar("refKind", { length: 60 }).notNull(),
  refId: int("refId").notNull(),
  fileName: varchar("fileName", { length: 200 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 500 }).notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const auditLogs = mysqlTable("audit_logs", {
  id: bigint("id", {mode: "number"}).autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId").notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  refKind: varchar("refKind", { length: 60 }),
  refId: int("refId"),
  detail: json("detail"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [index("al_tenant").on(t.tenantId)]);

// ============ الموظفون ============

export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId"),
  name: varchar("name", { length: 200 }).notNull(),
  role: mysqlEnum("role", ["pharmacist", "technician", "accountant", "purchase", "cashier", "staff"]).default("staff").notNull(),
  branchId: int("branchId"),
  phone: varchar("phone", { length: 40 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
