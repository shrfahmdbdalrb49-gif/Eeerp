# شرف ERP — الخادم المركزي (Backend)

خادم Node.js (Express) مع قاعدة بيانات PostgreSQL يوفر:

- تسجيل دخول آمن (JWT) مع صلاحيات RBAC (مدير / محاسب / مبيعات / كاشير / مخزني).
- المحاسبة المزدوجة الكاملة: قيود تلقائية عند البيع والشراء والتحصل والسداد + قيود يدوية.
- دليل حسابات محاسبي (الأصول، الالتزامات، حقوق الملكية، الإيرادات، المصروفات).
- المخزون بالدفعات (LOT) مع صلاحية وانتهاء وحركات مقيدة من المبيعات والمشتريات والتحويلات.
- فواتير المبيعات والمرتجعات والمشتريات مع الترحيل المحاسبي.
- العملاء والموردون والذمم والتحصيل وسداد الموردين.
- الخزينة: الصناديق والحسابات البنكية وسندات الصرف والتحويلات.
- إقفال الفترات الشهرية مع قفل القيود.
- التقارير: ميزان المراجعة، الأستاذ العام، قائمة الدخل.
- سجل تدقيق (Audit Log) لكل العمليات.

## التثبيت محليًا

1. جهّز قاعدة PostgreSQL واحصل على رابط الاتصال `DATABASE_URL`:
   ```
   postgresql://user:password@host:5432/sharaf_erp
   ```
2. أنشئ الجداول:
   ```
   psql "$DATABASE_URL" -f sql/schema.sql
   psql "$DATABASE_URL" -f sql/seed.sql
   ```
3. أنشئ ملف البيئة:
   ```
   cp .env.example .env
   ```
   وعدّل القيم: `DATABASE_URL`, `JWT_SECRET` (سلسلة طويلة عشوائية), `PORT` (الافتراضي 4000).
4. شغّل الخادم:
   ```
   npm install
   npm run start
   ```

## الحساب الإداري الافتراضي (بعد seed)

| اسم المستخدم | كلمة المرور | الدور |
|---|---|---|
| admin | Admin@1234 | مدير — غيّر كلمة المرور فور الدخول |

## الاستضافة على Railway

1. افتح https://railway.app وأنشئ مشروعًا جديدًا.
2. من "New" اختر **PostgreSQL** — ستنشأ قاعدة بيانات ويظهر متغير `DATABASE_URL` تلقائيًا.
3. من "New" اختر **Deploy from GitHub repo** واختر مستودع `Eeerp`.
4. في إعدادات الخدمة (Settings → Variables) أضف:
   - `PORT` = 4000
   - `JWT_SECRET` = سلسلة عشوائية طويلة (مثال: احصل عليها من `openssl rand -base64 32`)
   - تأكد وجود `DATABASE_URL` الذي أنشأه Railway تلقائيًا.
5. في "Deploy" فعّل **Watch GitHub Repo** أو أعد النشر. بعد بدء التشغيل افتح رابط الخدمة ثم `/health` للتحقق.

## ربط الواجهة (الويب) بالخادم

في ملف بيئة الواجهة أو إعدادات التشغيل ابدأ الخادم على رابط متاح، ثم حدّث نقطة API في الواجهة لتشير إلى:
```
https://<رابط-خدمة-railway>
```
(يتم الربط النهائي في جلسة قادمة — الواجهة حاليًا تعمل محليًا بـ IndexedDB).

## هيكل المشروع

```
apps/server/
├── server.js            # نقطة الدخول (Express)
├── config/db.js         # اتصال PostgreSQL + دوال query
├── middleware/
│   ├── auth.js          # JWT + RBAC (requireAuth, requirePermission)
│   └── audit.js         # auditLog (سجل التدقيق)
├── engine/accounting.js # محرك القيود المزدوجة والتقارير
├── routes/              # نقاط API تحت /api
│   ├── auth.routes.js        /api/auth
│   ├── users.routes.js       /api/users
│   ├── accounts.routes.js    /api/accounts
│   ├── items.routes.js       /api/items (+batches, stock)
│   ├── purchases.routes.js   /api/purchases
│   ├── sales.routes.js       /api/sales (+returns)
│   ├── collections.routes.js /api/collections
│   ├── supplierPayments.routes.js /api/supplier-payments
│   ├── journals.routes.js    /api/journals
│   ├── reports.routes.js     /api/reports
│   ├── audit.routes.js       /api/audit-logs
│   └── misc.routes.js        /api/branches, /api/stores, /api/cash-boxes, /api/suppliers, /api/customers, /api/bank-accounts, /api/receipts, /api/period-closes, /api/transfers, /api/doctors, /api/prescriptions
└── sql/
    ├── schema.sql       # مخطط قاعدة البيانات
    └── seed.sql         # الأدوار والصلاحيات ودليل الحسابات والمستخدم الإداري
```
