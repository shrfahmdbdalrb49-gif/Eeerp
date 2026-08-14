تم إعادة صياغة البرومبت كاملاً بصيغة إلزامية قاطعة، مع الحفاظ الحرفي على جميع العناوين والأرقام والجداول الـ60 وأكواد SQL والمسارات والاختصارات وقيم CHECK والـ19 قسم كاملة، دون حذف أو دمج أو تلخيص أي سطر. الملف جاهز ورابط التحميل الفعلي موجود أدناه.

📥 تحميل الملف الكامل SHARAF_ERP_STRICT_FINAL.md (199.64 KB)

وثيقة المتطلبات الشاملة لنظام "شرف ERP" – الإصدار النهائي الجاهز للتطوير 4.0

(Software Requirements Specification – Final Build-Ready Strict Version)

أولاً: الرؤية والفلسفة التشغيلية ومقاييس النجاح

الرؤية:

يجب أن يكون نظام "شرف ERP" منصة تخطيط موارد مؤسسية سحابية متعددة المستأجرين (Multi-Tenant SaaS) إلزامياً، تُصمم خصيصاً لتلبية احتياجات الشركات الصغيرة والمتوسطة والكبيرة في اليمن والمنطقة العربية، مع قابلية التوسع إلزامية للأسواق العالمية. يجب أن يجمع النظام إلزامياً بين العمق المحاسبي والإجرائي لأنظمة ERP العالمية (مثل SAP وOracle) وسرعة وسهولة الاستخدام التي تتميز بها الأنظمة المحلية (مثل اليمن سوفت والأمين)، مع تركيز إلزامي خاص على تجربة مستخدم عربية (RTL) محسّنة، وأداء تقني فائق.

الفلسفة التشغيلية:

يجب تمكين المستخدم النهائي (المحاسب، مدير المخزون، كاتب المبيعات) إلزامياً من إنجاز مهامه اليومية بأقل عدد ممكن من الخطوات والنقرات. يُمنع منعاً باتاً المساس بالدقة المحاسبية أو الرقابة المالية. يجب أن يقوم النظام بالعمل الثقيل خلف الكواليس إلزامياً (الترحيل الآلي، حساب التكاليف، التدقيق) بينما يبقى المستخدم في سياق عمله دون تشتت.

مقاييس نجاح إلزامية للمرحلة الأولى (قابلة للاختبار الكمي والأتمتة):

1. سرعة إتمام فاتورة مبيعات:

   - يجب ألّا يتجاوز الزمن المستغرق من لحظة فتح شاشة "فاتورة مبيعات جديدة" (بعد تحميل الواجهة) حتى ظهور إشعار "تم الترحيل بنجاح" 60 ثانية في المتوسط.

   - سيناريو الاختبار القياسي إلزامي: عميل موجود مسبقاً، 3 أصناف مخزنية معروفة، المستخدم متوسط المهارة، اتصال إنترنت بسرعة 2 ميغابت/ثانية، وخادم التطبيق في نفس المنطقة الجغرافية.

2. كفاءة إدخال البنود:

   - يجب ألّا يزيد عدد الإجراءات اللازمة لإضافة بند واحد إلى الفاتورة عن 4 إجراءات متتالية إلزامياً: (1) تفعيل نافذة إضافة الصنف (Ctrl+Alt+I)، (2) كتابة جزء من اسم الصنف في حقل البحث، (3) اختيار النتيجة المعروضة، (4) حفظ البند.

3. أداء تحميل النظام:

   - يجب أن يكون وقت عرض أول محتوى (First Contentful Paint) للقائمة الجانبية وأول شاشة داخلية بعد تسجيل الدخول أقل من 400 ميلي ثانية إلزامياً، بافتراض استخدام متصفح حديث واتصال 2 ميغابت/ثانية.

4. زمن استجابة الخادم:

   - يجب ألّا يتجاوز متوسط زمن استجابة REST API لعملية CRUD أساسية (مثل GET /api/products?limit=20) عندما يحتوي الجدول على 100,000 سجل 300 ميلي ثانية إلزامياً.

5. دقة التقارير المالية:

   - يجب أن يكون ميزان المراجعة الناتج من النظام متوازناً إلزامياً (مجموع الأرصدة المدينة = مجموع الأرصدة الدائنة) بنسبة 100% في كل الأوقات، ويجب أن يُولد مباشرة من جدول journal_entry_items دون أي معالجة إضافية إلزامياً.

6. اتساق المخزون تحت الحمل المتزامن:

   - يجب ألّا يتجاوز الانحراف بين الكمية المحسوبة (النظامية) والكمية الفعلية صفراً إلزامياً عند تنفيذ 20 مستخدماً متزامناً عمليات بيع وصرف على نفس المنتج والمخزن لمدة 10 دقائق. يجب التحقق من ذلك عبر اختبار إجهاد آلي إلزامياً.

آلية القياس والمتابعة:

- يجب تضمين هذه المقاييس في خطة اختبار القبول (Acceptance Test Plan) إلزامياً، ويجب تنفيذها بشكل دوري خلال التطوير.

- يجب استخدام أدوات مثل Lighthouse إلزامياً لقياس أداء الواجهة، وJMeter لقياس أداء API والتحميل، واختبارات وحدات (Unit Tests) للتحقق من دقة القيود المحاسبية.

ثانياً: نطاق التطوير والمراحل

المرحلة الأولى – MVP (المنتج الأدنى القابل للتطبيق):

يجب أن تشمل هذه المرحلة كل ما تحتاجه شركة صغيرة أو متوسطة إلزامياً لإدارة عملياتها المالية والمخزنية بشكل كامل، مع تركيز إلزامي على إطلاق سريع وجودة عالية. يجب استبعاد أي ميزة لا تمس الحاجة اليومية إلزامياً (مثل الموافقات أو التصنيع) لضمان عدم زحف النطاق.

الوحدات المفصلة للمرحلة الأولى:

1. لوحة التحكم:

   - يجب عرض 10 مؤشرات رئيسية فوراً إلزامياً: (1) إجمالي المبيعات اليوم، (2) إجمالي المشتريات اليوم، (3) عدد فواتير المبيعات المنشأة، (4) إجمالي التحصيلات، (5) إجمالي المدفوعات، (6) عدد الأصناف التي وصلت للحد الأدنى، (7) عدد الفواتير المتأخرة، (8) الشيكات المستحقة اليوم، (9) أعلى 5 أرصدة حسابات نقدية، (10) ربح اليوم التقديري (المبيعات ناقصاً تكلفة المبيعات).

   - التقويم المالي إلزامي: يجب أن يُظهر السنة المالية الحالية وفتراتها.

2. البيانات الأساسية:

   - الفروع والعناوين: يجب توفير إدارة الهيكل التنظيمي إلزامياً.

   - العملات وأسعار الصرف: إلزامية مع جدول يومي لأسعار الصرف مقابل العملة الأساسية (YER).

   - السنوات المالية والفترات: إلزامية، 12 فترة قابلة للإقفال.

   - الضرائب والقواعد: إعداد ضريبي مرن إلزامي مع إمكانية الإعفاءات على مستوى الصنف أو العميل.

   - شروط الدفع: إلزامية، مثل (نقداً، 30 يوم، 60 يوم).

   - الإعدادات العامة: جميع الثوابت التي تتحكم بسلوك النظام إلزامية (ستُفصل لاحقاً).

   - تسلسلات المستندات: للاطلاع فقط إلزامي، حيث تُدار تلقائياً.

3. المبيعات:

   - العملاء: إلزاميون مع أرصدة افتتاحية وحد ائتماني وإعدادات افتراضية.

   - مندوبو المبيعات: إلزاميون مع نسب عمولة.

   - قوائم أسعار البيع: إلزامية، يمكن ربطها بالعملاء.

   - عروض الأسعار: إلزامية، مستند غير محاسبي.

   - أوامر البيع: إلزامية، مستند غير محاسبي، قابل للتحويل لفاتورة (كلياً أو جزئياً).

   - فواتير المبيعات: إلزامية، (بضاعة/خدمة، نقدي/آجل) مع ترحيل محاسبي كامل وتأثير على المخزون.

   - مرتجعات المبيعات: إلزامية مع ربط بالفاتورة الأصلية وعكس القيود.

   - تحصيل المدفوعات: إلزامي، (سندات قبض) تدعم توزيع المبلغ على عدة فواتير وشيكات.

   - تقارير: إلزامية، مبيعات، عملاء، عمولات، الضرائب.

4. المشتريات:

   - الموردون: إلزاميون مع أرصدة افتتاحية.

   - قوائم أسعار الشراء: إلزامية، تسجل تاريخ آخر شراء وسعره.

   - طلبات الشراء: إلزامية، (اختياري، كأداة تخطيط).

   - أوامر الشراء: إلزامية، مستند غير محاسبي، قابل للتحويل لفاتورة.

   - فواتير المشتريات: إلزامية مع تأثير على المخزون والتكلفة.

   - مرتجعات المشتريات: إلزامية، عكس حركة وقيد الشراء.

   - سداد المدفوعات: إلزامي، (سندات صرف) مع توزيع وشيكات.

   - تقارير: إلزامية، مشتريات، موردون، الضرائب.

5. المخزون:

   - الأصناف: إلزاميون مع وحدات متعددة، باركود، وطرق تقييد (FIFO فقط حالياً).

   - المجموعات والوحدات والمخازن: إلزامية.

   - التوريد والصرف: سجل لحركات المخزون إلزامي (يجب أن يُسمح بإنشائها يدوياً أحياناً بصلاحيات خاصة).

   - التحويل بين المخازن: إلزامي.

   - الجرد الدوري: إلزامي مع حساب تلقائي للفروق والتكلفة وتوليد القيود.

   - حركة الأصناف: تقرير زمني بالرصيد إلزامي.

   - طبقات التكلفة: عرض للـ FIFO layers إلزامي.

6. الصندوق والبنوك:

   - إدارة الصناديق والبنوك (حسابات نقدية) إلزامية.

   - سندات القبض والصرف (مدفوعات عامة ولموردين/عملاء) إلزامية.

   - التحويلات بين الحسابات النقدية إلزامية.

   - الشيكات الواردة والصادرة إلزامية: مع دورة حياة (معلق، محصل، مرتجع).

   - تقارير إلزامية: أرصدة، حركات.

7. الحسابات:

   - دليل حسابات هرمي إلزامي (حتى 6 مستويات).

   - القيود اليومية اليدوية إلزامية: مع قوالب وقود محفوظة.

   - القيود الافتتاحية إلزامية: شاشة متكاملة لإدخال أرصدة أول المدة.

   - الترحيل الآلي إلزامي: من جميع المستندات التشغيلية.

   - إلغاء الترحيل (Reverse) إلزامي.

   - إقفال الفترات إلزامي: يُمنع منعاً باتاً الترحيل لفترات مقفلة.

   - التقارير المالية إلزامية: الأستاذ العام والمساعد، ميزان المراجعة، قائمة الدخل، الميزانية العمومية.

   - أعمار الديون (عملاء وموردين) إلزامية.

   - التسويات البنكية إلزامية: يدوية أولية.

8. التقارير:

   - قوالب تقارير مجمعة لكل وحدة إلزامية، مع إمكانية تصدير CSV/PDF إلزامية.

9. الإدارة:

   - المستخدمون والأدوار والصلاحيات (RBAC) إلزاميون.

   - سجل المراجعة (Audit Log) إلزامي.

   - إعدادات النظام العامة إلزامية.

   - إدارة المستأجر (للمشرف العام فقط) إلزامية: خطط، فوترة، تعليق.

10. المساعدة:

    - دليل المستخدم (ملفات ثابتة) إلزامي.

    - اختصارات لوحة المفاتيح (قائمة ديناميكية) إلزامية.

    - المساعد الذكي (شرف AI) إلزامي: استعلامات قراءة فقط باللغة العربية والعامية.

11. منصة SaaS:

    - تسجيل ذاتي وإنشاء مستأجر ببيانات بذرة إلزامي (دليل حسابات، عملة، ضرائب).

    - خطط اشتراك بحدود إلزامية (مستخدمين، فواتير).

    - فوترة آلية للمستأجرين وتعليق تلقائي عند عدم السداد إلزامي.

    - فترة تجريبية 30 يوماً إلزامية.

المرحلة الثانية (مستقبلاً):

- التصنيع: قوائم مكونات (BOM)، أوامر إنتاج.

- المشاريع: تتبع التكاليف والإيرادات.

- الأصول الثابتة والإهلاك.

- الموارد البشرية والرواتب.

- الاعتمادات المستندية.

- تطبيق جوال أصلي مع دعم Offline.

- محرك الموافقات.

المرحلة الثالثة (مستقبلاً):

- مساعد ذكي متقدم (AI/ML).

- محرك نماذج وتقارير ديناميكية.

- سير عمل مرئي (BPMN).

- نظام إدارة المستندات (DMS).

- سوق إضافات (Marketplace).

- التفكيك إلى Microservices للوحدات ذات الضغط العالي.

ثالثاً: البنية التقنية التفصيلية

النمط المعماري العام: Modular Monolith

- يجب تطوير النظام كتطبيق واحد (Monolith) إلزامياً في بيئة NestJS، مع تقسيم داخلي صارم إلزامي إلى وحدات مستقلة (Modules) مثل: SalesModule, PurchasingModule, InventoryModule, AccountingModule, TreasuryModule, AdministrationModule, SaaSModule.

- يجب أن تتواصل هذه الوحدات مع بعضها البعض عبر واجهات خدمية محددة (Application Services) إلزامياً، ويُمنع منعاً باتاً التواصل من خلال استدعاءات HTTP داخلية. يجب أن يضمن ذلك إلزامياً:

  - إمكانية إجراء عمليات تشمل عدة وحدات (مثل ترحيل فاتورة) ضمن معاملة قاعدة بيانات واحدة (Atomicity).

  - إمكانية فصل أي وحدة مستقبلاً إلى خدمة مصغرة (Microservice) بأقل جهد إلزامياً، لأن الاعتماديات محدودة ومقننة.

- يُمنع منعاً باتاً السماح لوحدة بالوصول المباشر إلى جدول قاعدة بيانات خاص بوحدة أخرى؛ يجب أن يتم الوصول إلزامياً عبر الخدمة المخصصة فقط.

إدارة المعاملات (Transactions):

- يجب تنفيذ أي عملية تغير حالة النظام مالياً (ترحيل فاتورة، إلغاء، جرد، سند) كاملة داخل EntityManager.transaction() في NestJS/TypeORM إلزامياً.

- آلية وحدة العمل (Unit of Work) إلزامية: يجب تجميع كل عمليات الكتابة على قاعدة البيانات (إنشاء الفاتورة، حركات المخزون، القيد اليومي، تحديث الأرصدة في جداول الحركات) داخل دالة رد واحدة (callback) إلزامياً. يجب أن إما أن تنجح جميعاً أو يفشل الجميع (Rollback).

- يجب أن يمنع هذا منعاً باتاً أي حالة غير متسقة (مثل وجود فاتورة بدون قيد محاسبي، أو حركة مخزون بدون تحديث طبقة التكلفة).

مكدس التقنيات (Tech Stack):

- الخادم الخلفي (Backend):

  - يجب استخدام Node.js (LTS) إلزامياً مع إطار عمل NestJS مكتوب بالـ TypeScript.

  - يجب استخدام TypeORM إلزامياً لإدارة الكيانات والاستعلامات والهجرات (Migrations).

  - يجب أن تكون بنية المشروع: Monorepo باستخدام npm workspaces أو Nx إلزامياً. المجلد الرئيسي /apps/api.

- قاعدة البيانات (Database):

  - يجب استخدام PostgreSQL 15+ إلزامياً.

  - يجب تفعيل إضافة pgcrypto إلزامياً لدعم gen_random_uuid()، مع استخدام UUID v4 كـ public_id للكيانات، وBigInt id كـ PK داخلي متسلسل إلزامياً لتحسين أداء الفهارس والعلاقات.

  - يجب أن تحتوي جميع الجداول على tenant_id BIGINT NOT NULL إلزامياً.

  - يُمنع منعاً باتاً استخدام Triggers لأسباب تتعلق بالشفافية وسهولة الصيانة.

  - يجب استخدام Row Level Security (RLS) إلزامياً كطبقة أمان إضافية على مستوى القاعدة.

- التخزين المؤقت (Caching):

  - يجب استخدام Redis (v7+) إلزامياً. يجب استخدامه إلزامياً لتخزين:

    - جلسات المستخدمين (Sessions).

    - نتائج استعلامات ثقيلة ومتكررة (مثل شجرة دليل الحسابات الكاملة، وتُمسح من الكاش عند تعديلها).

    - نتائج البحث المباشر (Live Search) مع صلاحية قصيرة إلزامية (30 ثانية).

    - الأقفال الموزعة (Distributed Locks) إلزامياً لضمان سلامة الترقيم المتزامن.

- الواجهة الأمامية (Frontend):

  - يجب بناء تطبيق صفحة واحدة (SPA) إلزامياً بـ React 18+ مع TypeScript.

  - يجب استخدام Vite كحزمة بناء إلزامياً (لتجربة تطوير فائقة السرعة).

  - يجب استخدام Tailwind CSS للإطار التصميمي إلزامياً، مع تفعيل وضع RTL (Right-to-Left) للعربية بشكل كامل إلزامياً.

  - يجب استخدام إدارة الحالة: TanStack Query (React Query) للتعامل مع بيانات الخادم والتخزين المؤقت، وContext API للحالة العامة للـ UI (مثل القائمة الجانبية) إلزامياً.

  - يجب بناء مكتبة مكونات داخلية (LookupModal, DataTable, AppLayout) إلزامياً لضمان الاتساق.

- التوثيق والتواصل (API):

  - يجب أن يعمل NestJS كـ API Gateway إلزامياً. يجب أن تكون جميع نقاط النهاية RESTful إلزامياً.

  - يجب توفير توثيق تلقائي إلزامي باستخدام Swagger (OpenAPI 3.0) متاح على /api/docs.

- المصادقة والصلاحيات:

  - يجب استخدام JWT (JSON Web Tokens) إلزامياً. يجب أن يكون Access Token قصير العمر إلزامياً (15 دقيقة)، Refresh Token طويل العمر إلزامياً (7 أيام) مع تدوير إجباري (Rotation). يجب عند استخدام Refresh Token إصدار زوج جديد وإبطال القديم إلزامياً. يجب تخزين عائلة الرموز في جدول refresh_tokens إلزامياً.

- البحث النصي:

  - يجب الاعتماد كلياً على PostgreSQL Full-Text Search إلزامياً. يجب إنشاء عمود search_vector tsvector في الجداول المعنية إلزامياً (مثل customers, products) وفهرس GIN عليه. يجب تحديث هذا العمود تلقائياً إلزامياً عبر كود التطبيق (قبل الحفظ) أو عبر استعلام محسوب.

- الجدولة والمهام الخلفية:

  - يجب استخدام مكتبة @nestjs/schedule (المبنية على node-cron) إلزامياً لتنفيذ المهام الدورية (تنبيهات المخزون، الفواتير المتأخرة، فوترة المستأجرين).

- النشر والبنية التحتية:

  - يجب تغليف جميع المكونات (NestJS, React static files, PostgreSQL, Redis) في حاويات Docker إلزامياً.

  - يجب التنسيق (Orchestration) عبر Kubernetes (K3s لبيئة MVP) إلزامياً.

  - يجب توفير CI/CD عبر GitHub Actions إلزامياً: تشغيل الفحوصات (Lint, Tests)، بناء الحاويات، ونشرها تلقائياً على البيئة التجريبية.

  - يجب اعتماد استراتيجية النسخ الاحتياطي إلزامية: نسخ احتياطي كامل يومي (pg_dump) مع أرشفة WAL مستمرة لاستعادة البيانات إلى أي نقطة زمنية (PITR) خلال 24 ساعة.

- الأمان:

  - يجب أن تكون جميع الاتصالات عبر TLS 1.3 إلزامياً.

  - يجب تجزئة كلمات المرور بـ bcrypt (Salt Rounds=12) إلزامياً.

  - يجب توفير حماية من هجمات CSRF إلزامية عبر رأس X-CSRF-Token.

  - يجب منع حقن XSS إلزامياً عبر سياسة أمان المحتوى (Content-Security-Policy) الصارمة وتفادي dangerouslySetInnerHTML.

  - يجب فحص وتطهير جميع البيانات المدخلة إلزامياً عبر class-validator.

  - يجب تطبيق تحديد معدل الطلبات (Rate Limiting) على مستوى API العام ومستوى المستأجر إلزامياً (لمنع تجاوز حدود الخطة).

  - يجب توفير حماية من هجمات القوة العمياء إلزامية: قفل الحساب لمدة 15 دقيقة بعد 5 محاولات فاشلة.

  - يجب تشفير البيانات الحساسة المخزنة (مثل أرقام الحسابات البنكية في جداول cash_accounts) بـ AES-256-GCM على مستوى التطبيق إلزامياً.

رابعاً: مخطط قاعدة البيانات (MVP)

رابعاً: مخطط قاعدة البيانات النهائي (MVP)

فلسفة التصميم:

- يجب تصميم جميع الجداول للعمل في بيئة Multi-Tenant إلزامياً مع عزل تام عبر tenant_id.

- يجب اعتماد BigInt كـ Primary Key داخلي (id) إلزامياً لضمان أداء فائق للفهارس والـ JOINs، ويجب استخدام UUID v4 (public_id) كمعرف خارجي في واجهات API إلزامياً لأسباب أمنية (منع تخمين التسلسل).

- يجب ألّا تُخزن الأرصدة (حسابات، مخزون) بشكل دائم إلزامياً، بل يجب أن تُحسب عبر Views أو استعلامات مجمعة لتجنب عدم الاتساق، باستثناء quantity_balance في stock_movements الذي يجب استخدامه كـ "لقطة" للرصيد بعد كل حركة إلزامياً مع حمايته بآليات قفل صارمة.

- يجب أن تُخزن جميع التواريخ بتوقيت UTC في حقول TIMESTAMPTZ إلزامياً.

- يجب أن يكون الحذف المنطقي (Soft Delete) إلزامياً لجميع الكيانات الهامة عبر عمود deleted_at.

اصطلاحات الأعمدة الأساسية في كل جدول:

- id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY.

- public_id UUID DEFAULT gen_random_uuid() UNIQUE.

- tenant_id BIGINT NOT NULL.

- created_at TIMESTAMPTZ DEFAULT NOW().

- updated_at TIMESTAMPTZ.

- deleted_at TIMESTAMPTZ.

الجداول الأساسية (60 جدولاً):

1. tenants

   - name VARCHAR(255) NOT NULL

   - subdomain VARCHAR(100) UNIQUE NOT NULL

   - plan_id BIGINT FK -> plans.id

   - status VARCHAR(50) DEFAULT 'trial' CHECK (status IN ('active', 'suspended', 'trial'))

   - settings JSONB DEFAULT '{}'

   - trial_ends_at TIMESTAMPTZ

2. plans

   - name VARCHAR(100) NOT NULL

   - max_users INT DEFAULT 1

   - max_invoices_monthly INT DEFAULT 50

   - price_monthly DECIMAL(10,2)

   - features JSONB (مثل {"reports": true, "api_access": false})

3. subscriptions

   - tenant_id BIGINT FK -> tenants.id

   - plan_id BIGINT FK -> plans.id

   - start_date DATE NOT NULL

   - end_date DATE NOT NULL

   - status VARCHAR(50) DEFAULT 'active'

   - auto_renew BOOLEAN DEFAULT true

4. tenant_billing_invoices

   - tenant_id BIGINT FK -> tenants.id

   - subscription_id BIGINT FK -> subscriptions.id

   - amount DECIMAL(10,2) NOT NULL

   - due_date DATE NOT NULL

   - paid_at TIMESTAMPTZ

   - status VARCHAR(50) DEFAULT 'unpaid'

5. users

   - tenant_id BIGINT FK -> tenants.id

   - name VARCHAR(255) NOT NULL

   - email VARCHAR(255) NOT NULL

   - password_hash VARCHAR(255) NOT NULL

   - phone VARCHAR(50)

   - role_id BIGINT FK -> roles.id (الدور الأساسي، ويمكن أن يكون للمستخدم عدة أدوار عبر user_roles)

   - is_active BOOLEAN DEFAULT true

   - last_login_at TIMESTAMPTZ

   - default_branch_id BIGINT FK -> branches.id

   - default_warehouse_id BIGINT FK -> warehouses.id

   - failed_login_attempts INT DEFAULT 0

   - locked_until TIMESTAMPTZ

   - ملاحظة إلزامية: يجب أن تُحسب الصلاحيات النهائية من جميع أدوار المستخدم.

6. refresh_tokens

   - user_id BIGINT FK -> users.id

   - token_hash VARCHAR(255) NOT NULL

   - family VARCHAR(255) NOT NULL (لتدوير الرمز)

   - revoked_at TIMESTAMPTZ

   - expires_at TIMESTAMPTZ NOT NULL

7. branches

   - name VARCHAR(255) NOT NULL

   - is_headquarters BOOLEAN DEFAULT false

   - address_id BIGINT FK -> addresses.id

8. addresses

   - entity_type VARCHAR(100) NOT NULL (مثل 'branch', 'customer')

   - entity_id BIGINT NOT NULL

   - line1 TEXT NOT NULL

   - line2 TEXT

   - city VARCHAR(100)

   - state VARCHAR(100)

   - postal_code VARCHAR(50)

   - country VARCHAR(100) DEFAULT 'اليمن'

   - is_default BOOLEAN DEFAULT false

9. currencies

   - code VARCHAR(10) UNIQUE NOT NULL (مثل 'YER', 'USD')

   - name VARCHAR(100) NOT NULL

   - symbol VARCHAR(10)

   - exchange_rate_to_base DECIMAL(15,6) DEFAULT 1 (مقابل العملة الأساسية للمستأجر)

   - is_default BOOLEAN DEFAULT false

10. exchange_rates

    - currency_id BIGINT FK -> currencies.id

    - rate DECIMAL(15,6) NOT NULL (مقابل العملة الأساسية)

    - date DATE NOT NULL

11. fiscal_years

    - name VARCHAR(100) NOT NULL

    - start_date DATE NOT NULL

    - end_date DATE NOT NULL

    - is_closed BOOLEAN DEFAULT false

12. fiscal_periods

    - fiscal_year_id BIGINT FK -> fiscal_years.id

    - name VARCHAR(100)

    - start_date DATE NOT NULL

    - end_date DATE NOT NULL

    - is_closed BOOLEAN DEFAULT false

13. chart_of_accounts

    - account_code VARCHAR(50)

    - name VARCHAR(255) NOT NULL

    - type VARCHAR(50) NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'income', 'expense'))

    - parent_id BIGINT FK -> chart_of_accounts.id (ذاتي)

    - level INT DEFAULT 1

    - is_active BOOLEAN DEFAULT true

    - description TEXT

14. tax_configs

    - name VARCHAR(255) NOT NULL

    - rate_percent DECIMAL(5,2) NOT NULL

    - type VARCHAR(50) NOT NULL CHECK (type IN ('sales', 'purchase', 'withholding'))

    - account_id BIGINT FK -> chart_of_accounts.id (حساب الضريبة)

    - is_compound BOOLEAN DEFAULT false

15. tax_rules

    - tax_config_id BIGINT FK -> tax_configs.id

    - applies_to_type VARCHAR(50) NOT NULL (مثل 'product', 'customer', 'category')

    - applies_to_id BIGINT NOT NULL

    - is_exempt BOOLEAN DEFAULT false

16. customers

    - name VARCHAR(255) NOT NULL

    - phone VARCHAR(50)

    - email VARCHAR(255)

    - credit_limit DECIMAL(15,2) DEFAULT 0

    - account_id_ar BIGINT FK -> chart_of_accounts.id (حساب الأستاذ المساعد للعميل)

    - default_price_list_id BIGINT FK -> price_lists.id

    - default_payment_term_id BIGINT FK -> payment_terms.id

    - opening_balance DECIMAL(15,2) DEFAULT 0

    - opening_balance_date DATE

    - is_active BOOLEAN DEFAULT true

17. customer_contacts

    - customer_id BIGINT FK -> customers.id

    - name VARCHAR(255) NOT NULL

    - position VARCHAR(100)

    - phone VARCHAR(50)

    - email VARCHAR(255)

    - is_primary BOOLEAN DEFAULT false

18. suppliers

    - name VARCHAR(255) NOT NULL

    - phone VARCHAR(50)

    - email VARCHAR(255)

    - account_id_ap BIGINT FK -> chart_of_accounts.id

    - default_payment_term_id BIGINT FK -> payment_terms.id

    - opening_balance DECIMAL(15,2) DEFAULT 0

    - is_active BOOLEAN DEFAULT true

19. supplier_contacts (مشابه لـ customer_contacts إلزامياً)

20. payment_terms

    - name VARCHAR(255) NOT NULL

    - days_due INT NOT NULL

    - description TEXT

21. warehouses

    - branch_id BIGINT FK -> branches.id

    - name VARCHAR(255) NOT NULL

    - is_active BOOLEAN DEFAULT true

22. product_categories

    - name VARCHAR(255) NOT NULL

    - parent_id BIGINT FK -> product_categories.id (ذاتي)

23. products

    - code VARCHAR(50) UNIQUE

    - barcode VARCHAR(100)

    - name VARCHAR(255) NOT NULL

    - description TEXT

    - category_id BIGINT FK -> product_categories.id

    - unit_id BIGINT FK -> product_units.id (الوحدة الأساسية)

    - cost_method VARCHAR(10) DEFAULT 'fifo' CHECK (cost_method IN ('fifo')) (يضاف المتوسط لاحقاً)

    - min_stock DECIMAL(15,4) DEFAULT 0

    - max_stock DECIMAL(15,4) DEFAULT 0

    - is_inventory BOOLEAN DEFAULT true (هل هو صنف مخزني)

    - is_active BOOLEAN DEFAULT true

24. product_units

    - name VARCHAR(100) NOT NULL (كرتون، قطعة، كيلو)

    - conversion_factor_to_base DECIMAL(15,6) DEFAULT 1

25. price_lists

    - name VARCHAR(255) NOT NULL (مثل "سعر الجملة")

    - is_active BOOLEAN DEFAULT true

26. price_list_items

    - price_list_id BIGINT FK -> price_lists.id

    - product_id BIGINT FK -> products.id

    - unit_price DECIMAL(15,4) NOT NULL

    - currency_id BIGINT FK -> currencies.id

27. supplier_price_lists

    - supplier_id BIGINT FK -> suppliers.id

    - product_id BIGINT FK -> products.id

    - unit_price DECIMAL(15,4) NOT NULL

    - currency_id BIGINT FK -> currencies.id

    - last_purchase_date DATE

28. salespersons

    - name VARCHAR(255) NOT NULL

    - commission_percent DECIMAL(5,2) DEFAULT 0

    - account_id BIGINT FK -> chart_of_accounts.id (حساب ذمم المندوب)

29. stock_movements (الجدول المحوري للمخزون)

    - product_id BIGINT FK -> products.id

    - warehouse_id BIGINT FK -> warehouses.id

    - movement_type VARCHAR(50) NOT NULL (purchase, sale, return, transfer_in, transfer_out, adjustment)

    - reference_type VARCHAR(100) NOT NULL (sales_invoice, purchase_invoice, ...)

    - reference_id BIGINT NOT NULL

    - quantity DECIMAL(15,4) NOT NULL (موجب للداخل، سالب للخارج)

    - unit_cost DECIMAL(15,4) NOT NULL

    - quantity_balance DECIMAL(15,4) NOT NULL

    - total_cost_balance DECIMAL(15,4) NOT NULL

    - created_at TIMESTAMPTZ DEFAULT NOW()

    - آلية القفل إلزامية: عند إنشاء حركة صادر، يجب أن يستخدم النظام قفل استشاري pg_advisory_xact_lock إلزامياً على (product_id, warehouse_id) لضمان التسلسل ومنع التضارب.

30. cost_layers (طبقات FIFO)

    - product_id BIGINT FK -> products.id

    - warehouse_id BIGINT FK -> warehouses.id

    - purchase_invoice_item_id BIGINT FK -> purchase_invoice_items.id

    - quantity_received DECIMAL(15,4) NOT NULL

    - unit_cost DECIMAL(15,4) NOT NULL

    - quantity_remaining DECIMAL(15,4) NOT NULL (المتبقي للاستهلاك)

31. sales_orders

    - order_number BIGINT NOT NULL

    - date DATE NOT NULL

    - customer_id BIGINT FK -> customers.id

    - warehouse_id BIGINT FK -> warehouses.id

    - status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'partially_invoiced', 'invoiced', 'cancelled'))

    - subtotal DECIMAL(15,2)

    - grand_total DECIMAL(15,2)

32. sales_order_items

    - order_id BIGINT FK -> sales_orders.id

    - product_id BIGINT FK -> products.id

    - quantity DECIMAL(15,4) NOT NULL

    - unit_price DECIMAL(15,4) NOT NULL

    - line_total DECIMAL(15,2)

    - remaining_quantity_to_invoice DECIMAL(15,4) NOT NULL

33. purchase_orders

    - order_number BIGINT NOT NULL

    - date DATE NOT NULL

    - supplier_id BIGINT FK -> suppliers.id

    - warehouse_id BIGINT FK -> warehouses.id

    - status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'partially_received', 'received', 'cancelled'))

    - subtotal DECIMAL(15,2)

    - grand_total DECIMAL(15,2)

34. purchase_order_items

    - order_id BIGINT FK -> purchase_orders.id

    - product_id BIGINT FK -> products.id

    - quantity DECIMAL(15,4) NOT NULL

    - unit_price DECIMAL(15,4) NOT NULL

    - line_total DECIMAL(15,2)

    - remaining_quantity_to_receive DECIMAL(15,4) NOT NULL

35. sales_invoices

    - invoice_number BIGINT NOT NULL

    - date DATE NOT NULL

    - type VARCHAR(50) NOT NULL CHECK (type IN ('goods', 'service'))

    - payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('cash', 'credit'))

    - customer_id BIGINT FK -> customers.id (يمكن أن يكون null للبيع النقدي حيث يستخدم عميل افتراضي)

    - salesperson_id BIGINT FK -> salespersons.id

    - warehouse_id BIGINT FK -> warehouses.id

    - tax_config_id BIGINT FK -> tax_configs.id

    - currency_id BIGINT FK -> currencies.id

    - exchange_rate DECIMAL(15,6) NOT NULL

    - payment_term_id BIGINT FK -> payment_terms.id

    - due_date DATE

    - subtotal DECIMAL(15,2) NOT NULL

    - discount_total DECIMAL(15,2) DEFAULT 0

    - tax_total DECIMAL(15,2) DEFAULT 0

    - grand_total DECIMAL(15,2) NOT NULL

    - status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'reversed'))

    - posted_at TIMESTAMPTZ

    - created_by BIGINT FK -> users.id

36. sales_invoice_items

    - invoice_id BIGINT FK -> sales_invoices.id

    - product_id BIGINT FK -> products.id

    - unit_id BIGINT FK -> product_units.id

    - quantity DECIMAL(15,4) NOT NULL

    - unit_price DECIMAL(15,4) NOT NULL

    - discount_percent DECIMAL(5,2) DEFAULT 0

    - discount_amount DECIMAL(15,2) DEFAULT 0

    - tax_amount DECIMAL(15,2) DEFAULT 0

    - line_total DECIMAL(15,2) NOT NULL

    - cost_of_goods_sold DECIMAL(15,2) (تكلفة البضاعة المباعة المحسوبة)

37. sales_returns (هيكل مماثل للفاتورة مع إضافة sales_invoice_id الأصلي وعلاقة عكسية إلزامي)

38. purchase_invoices

    - هيكل مماثل للمبيعات إلزامي، مع supplier_id بدلاً من customer_id، ويجب ألّا يوجد salesperson_id.

39. purchase_invoice_items (مماثل إلزامياً مع إضافة bonus_quantity أو التعامل معها على أنها كمية مجانية بسعر صفر)

40. purchase_returns (مماثل إلزامياً مع ربط بالفاتورة الأصلية)

41. payment_allocations

    - receipt_id BIGINT FK -> receipts.id

    - invoice_id BIGINT NOT NULL (يمكن أن يكون من sales_invoices أو purchase_invoices)

    - invoice_type VARCHAR(50) NOT NULL ('sales' أو 'purchase')

    - allocated_amount DECIMAL(15,2) NOT NULL

42. cash_accounts

    - name VARCHAR(255) NOT NULL

    - type VARCHAR(50) NOT NULL CHECK (type IN ('cash', 'bank'))

    - branch_id BIGINT FK -> branches.id

    - currency_id BIGINT FK -> currencies.id

    - gl_account_id BIGINT FK -> chart_of_accounts.id (الحساب المرتبط بدفتر الأستاذ)

    - is_active BOOLEAN DEFAULT true

43. receipts (سند القبض أو الصرف)

    - voucher_number BIGINT NOT NULL

    - date DATE NOT NULL

    - type VARCHAR(50) NOT NULL CHECK (type IN ('receipt', 'payment'))

    - cash_account_id BIGINT FK -> cash_accounts.id

    - partner_type VARCHAR(50) NOT NULL (customer, supplier, other)

    - partner_id BIGINT NOT NULL

    - total_amount DECIMAL(15,2) NOT NULL

    - status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'reversed'))

    - cheque_id BIGINT FK -> cheques.id

44. receipt_items

    - receipt_id BIGINT FK -> receipts.id

    - account_id BIGINT FK -> chart_of_accounts.id (عادة حساب العميل/المورد)

    - description VARCHAR(255)

    - amount DECIMAL(15,2) NOT NULL

45. cheques

    - type VARCHAR(50) NOT NULL CHECK (type IN ('received', 'issued'))

    - cheque_number VARCHAR(100) NOT NULL

    - bank_name VARCHAR(255)

    - amount DECIMAL(15,2) NOT NULL

    - due_date DATE NOT NULL

    - status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'cleared', 'bounced', 'cancelled'))

    - receipt_id BIGINT FK -> receipts.id (السند المرتبط به)

    - clearing_date DATE

    - notes TEXT

46. journal_entries

    - entry_number BIGINT NOT NULL

    - date DATE NOT NULL

    - description TEXT

    - source_type VARCHAR(100) (مثل 'sales_invoice')

    - source_id BIGINT

    - is_auto_generated BOOLEAN DEFAULT false

    - status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'reversed'))

47. journal_entry_items

    - entry_id BIGINT FK -> journal_entries.id

    - account_id BIGINT FK -> chart_of_accounts.id

    - description VARCHAR(255)

    - debit DECIMAL(15,2) DEFAULT 0

    - credit DECIMAL(15,2) DEFAULT 0

    - currency_id BIGINT FK -> currencies.id

    - exchange_rate DECIMAL(15,6) DEFAULT 1

48. inventory_adjustments

    - date DATE NOT NULL

    - warehouse_id BIGINT FK -> warehouses.id

    - type VARCHAR(50) (surplus, shortage)

    - status VARCHAR(50) DEFAULT 'draft'

    - is_posted BOOLEAN DEFAULT false

49. inventory_adjustment_items

    - adjustment_id BIGINT FK -> inventory_adjustments.id

    - product_id BIGINT FK -> products.id

    - system_quantity DECIMAL(15,4) NOT NULL

    - actual_quantity DECIMAL(15,4) NOT NULL

    - difference DECIMAL(15,4) NOT NULL

    - cost DECIMAL(15,4) NOT NULL

50. stock_transfers

    - from_warehouse_id BIGINT FK -> warehouses.id

    - to_warehouse_id BIGINT FK -> warehouses.id

    - date DATE NOT NULL

    - status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'received', 'cancelled'))

51. stock_transfer_items

    - transfer_id BIGINT FK -> stock_transfers.id

    - product_id BIGINT FK -> products.id

    - quantity DECIMAL(15,4) NOT NULL

    - unit_cost DECIMAL(15,4) NOT NULL

52. document_sequences

    - document_type VARCHAR(100) NOT NULL

    - fiscal_year_id BIGINT FK -> fiscal_years.id

    - branch_id BIGINT FK -> branches.id (nullable)

    - last_number BIGINT DEFAULT 0

    - UNIQUE (tenant_id, document_type, fiscal_year_id, COALESCE(branch_id, -1))

53. roles

    - name VARCHAR(255) NOT NULL

    - description TEXT

54. permissions

    - name VARCHAR(255) NOT NULL (مثل 'invoice:create')

    - resource VARCHAR(100) NOT NULL

    - action VARCHAR(100) NOT NULL

55. role_permissions

    - role_id BIGINT FK -> roles.id

    - permission_id BIGINT FK -> permissions.id

56. user_roles

    - user_id BIGINT FK -> users.id

    - role_id BIGINT FK -> roles.id

57. audit_logs

    - user_id BIGINT FK -> users.id

    - action VARCHAR(50) NOT NULL (CREATE, UPDATE, DELETE, POST, REVERSE)

    - entity_type VARCHAR(100) NOT NULL

    - entity_id BIGINT NOT NULL

    - old_values JSONB

    - new_values JSONB

    - ip_address INET

    - user_agent TEXT

    - created_at TIMESTAMPTZ DEFAULT NOW()

58. alerts

    - alert_type VARCHAR(100) NOT NULL (low_stock, overdue_invoice, cheque_due)

    - entity_type VARCHAR(100)

    - entity_id BIGINT

    - message TEXT NOT NULL

    - severity VARCHAR(50) DEFAULT 'info' (info, warning, critical)

    - is_read BOOLEAN DEFAULT false

    - action_url TEXT

    - created_at TIMESTAMPTZ DEFAULT NOW()

59. notifications

    - user_id BIGINT FK -> users.id

    - alert_id BIGINT FK -> alerts.id

    - title VARCHAR(255) NOT NULL

    - message TEXT NOT NULL

    - is_read BOOLEAN DEFAULT false

    - created_at TIMESTAMPTZ DEFAULT NOW()

60. settings

    - key VARCHAR(255) NOT NULL

    - value JSONB NOT NULL

    - description TEXT

    - UNIQUE (tenant_id, key)

طرق العرض والمشاهدات (Views) – إلزامية:

- account_balances_view: تجميع مباشر من journal_entry_items إلزامي (للحسابات النشطة والمرحلة فقط). يجب أن يعرض tenant_id, account_id, balance.

- product_stock_view: يجب أن يستخرج quantity_balance من آخر حركة لكل منتج/مخزن إلزامياً عبر DISTINCT ON (product_id, warehouse_id) ORDER BY ... id DESC.

- customer_balances_view: تجميع الفواتير والمدفوعات إلزامي.

فهارس إضافية (لتحسين الأداء) – إلزامية:

- يجب إنشاء فهارس مركبة على (tenant_id, id) في جميع الجداول إلزامياً.

- يجب إنشاء فهارس GIN على search_vector في جداول customers, products, chart_of_accounts إلزامياً.

- يجب إنشاء فهارس على (tenant_id, status) في فواتير المبيعات والمشتريات إلزامياً.

- يجب إنشاء فهارس على (tenant_id, product_id, warehouse_id, created_at) في stock_movements إلزامياً.

- يجب عمل فهارس فريدة على (tenant_id, document_type, fiscal_year_id, COALESCE(branch_id, 0)) في document_sequences إلزامياً.

خامساً: القائمة الجانبية وشجرة التنقل (موسع ومفصل)

الفلسفة والهدف:

يجب أن تكون القائمة الجانبية المدخل الرئيسي لجميع وظائف النظام إلزامياً. يجب أن تكون مرنة، قابلة للتخصيص حسب صلاحيات المستخدم، وسريعة الاستجابة إلزامياً. يجب أن تدعم الوضعين RTL (العربية) وLTR (الإنجليزية) مع ترجمة كاملة للعناصر إلزامياً. يجب أن تخضع لشروط سهولة الاستخدام إلزامية: وضوح التصنيف، تقليل عمق المستويات إلى 3 كحد أقصى، وإبراز القسم النشط.

السلوك العام والتصميم إلزامي:

- الموضع إلزامي: يجب أن تكون القائمة ثابتة في الجانب الأيمن (في الوضع RTL) أو الأيسر (في LTR) بعرضين: 260px موسعة، 70px مطوية (أيقونات فقط).

- شكل الطي إلزامي: يجب توفر أيقونة "هامبرغر" في أعلى القائمة للتبديل بين الوضعين. عند الطي، يجب أن تظهر الأيقونات فقط مع Tooltip بالاسم عند التمرير.

- التمييز البصري إلزامي: يجب أن يظهر العنصر النشط بخلفية بلون (#0D5AA7) أو (#E6F0FA) مع خط عريض.

- التمرير إلزامي: يجب أن تكون القائمة قابلة للتمرير العمودي إذا زاد ارتفاعها عن الشاشة، مع تثبيت الشعار في الأعلى وزر الإعدادات/تسجيل الخروج في الأسفل.

- حالة الطي إلزامية: يجب حفظها في Local Storage تحت مفتاح sidebar_collapsed للمستخدم الحالي إلزامياً لتستمر عبر الجلسات.

هيكل شجرة التنقل (الأقسام والعناصر) – إلزامي:

يجب أن تُبنى القائمة بشكل ديناميكي من مصفوفة كائنات JSON إلزامياً (تُعرّف في الكود أو في ملف إعدادات)، مما يسهل تعديلها مستقبلاً. يجب أن يكون لكل عنصر الخصائص إلزامية:

- key: معرف فريد.

- label: نص التسمية (مفتاح ترجمة i18n).

- icon: مكون أيقونة من Lucide Icons.

- path: المسار (اختياري، للعناصر الطرفية).

- permission: الصلاحية المطلوبة لعرض العنصر (اختياري، إذا كان null يظهر للجميع).

- children: عناصر فرعية (للقوائم المنسدلة).

شجرة التنقل الكاملة للمرحلة الأولى (RTL) – إلزامية:

1. لوحة التحكم

   - المسار: /dashboard

   - الأيقونة: LayoutDashboard

   - الصلاحية: dashboard:view

   - عناصر فرعية إلزامية:

     - المؤشرات الرئيسية (/dashboard)

     - التقويم المالي (/dashboard/calendar)

2. البيانات الأساسية

   - الأيقونة: Database

   - الصلاحية: settings:view

   - عناصر فرعية إلزامية:

     - الفروع والعناوين (/master/branches)

     - العملات وأسعار الصرف (/master/currencies)

     - السنوات المالية والفترات (/master/fiscal-years)

     - الضرائب والقواعد (/master/taxes)

     - شروط الدفع (/master/payment-terms)

     - الإعدادات العامة (/master/settings)

     - تسلسلات المستندات (/master/sequences) – للاطلاع فقط إلزامي

3. المبيعات

   - الأيقونة: ShoppingCart

   - الصلاحية: sales:view

   - عناصر فرعية إلزامية:

     - العملاء (/sales/customers)

     - مندوبو المبيعات (/sales/salespersons)

     - قوائم الأسعار (/sales/price-lists)

     - عروض الأسعار (/sales/quotations)

     - أوامر البيع (/sales/orders)

     - فواتير المبيعات (/sales/invoices)

     - مرتجعات المبيعات (/sales/returns)

     - تحصيل المدفوعات (/sales/receipts)

     - عمولات المندوبين (/sales/commissions)

4. المشتريات

   - الأيقونة: Truck

   - الصلاحية: purchasing:view

   - عناصر فرعية إلزامية:

     - الموردون (/purchasing/suppliers)

     - قوائم أسعار الموردين (/purchasing/supplier-prices)

     - طلبات الشراء (/purchasing/requisitions)

     - أوامر الشراء (/purchasing/orders)

     - فواتير المشتريات (/purchasing/invoices)

     - مرتجعات المشتريات (/purchasing/returns)

     - سداد المدفوعات (/purchasing/receipts)

5. المخزون

   - الأيقونة: Package

   - الصلاحية: inventory:view

   - عناصر فرعية إلزامية:

     - الأصناف (/inventory/products)

     - المجموعات المخزنية (/inventory/categories)

     - الوحدات (/inventory/units)

     - المخازن (/inventory/warehouses)

     - التوريد (/inventory/stock-in)

     - الصرف (/inventory/stock-out)

     - التحويل بين المخازن (/inventory/transfers)

     - الجرد الدوري (/inventory/adjustments)

     - حركة الأصناف (/inventory/movements)

     - طبقات التكلفة (/inventory/cost-layers)

6. الصندوق والبنوك

   - الأيقونة: Landmark

   - الصلاحية: treasury:view

   - عناصر فرعية إلزامية:

     - الصناديق (/treasury/cash-accounts)

     - البنوك (/treasury/banks)

     - سند قبض (/treasury/receipts?type=receipt)

     - سند صرف (/treasury/receipts?type=payment)

     - التحويلات بين الحسابات (/treasury/transfers)

     - سجل الشيكات (/treasury/cheques)

7. الحسابات

   - الأيقونة: BookOpen

   - الصلاحية: accounting:view

   - عناصر فرعية إلزامية:

     - دليل الحسابات (/accounting/chart-of-accounts)

     - القيود اليومية (/accounting/journal-entries)

     - القيود الافتتاحية (/accounting/opening-balances)

     - إقفال الفترات (/accounting/close-periods)

     - الأستاذ العام (/accounting/reports/general-ledger)

     - الأستاذ المساعد (/accounting/reports/subsidiary-ledger)

     - ميزان المراجعة (/accounting/reports/trial-balance)

     - قائمة الدخل (/accounting/reports/income-statement)

     - الميزانية العمومية (/accounting/reports/balance-sheet)

     - أعمار الديون - عملاء (/accounting/reports/aging/customers)

     - أعمار الديون - موردين (/accounting/reports/aging/suppliers)

     - التسويات البنكية (/accounting/reconciliations)

8. التقارير

   - الأيقونة: BarChart3

   - الصلاحية: reports:view

   - عناصر فرعية إلزامية (مجمعة للوصول السريع):

     - تقارير المبيعات (/reports/sales)

     - تقارير المشتريات (/reports/purchasing)

     - تقارير المخزون (/reports/inventory)

     - تقارير الصندوق والبنوك (/reports/treasury)

     - تقارير العملاء (/reports/customers)

     - تقارير الموردين (/reports/suppliers)

     - تقارير الضرائب (/reports/taxes)

     - التقارير المالية (مكررة للوصول السريع، تحول إلى قسم الحسابات)

9. الإدارة

   - الأيقونة: ShieldCheck

   - الصلاحية: admin:view

   - عناصر فرعية إلزامية:

     - المستخدمون والأدوار (/admin/users)

     - سجل العمليات والمراجعة (/admin/audit-log)

     - إعدادات النظام (/admin/settings) (للمشرف العام فقط)

     - إدارة المستأجر (/admin/tenant) (للمشرف العام فقط)

10. المساعدة

    - الأيقونة: HelpCircle

    - لا توجد صلاحية محددة (عام)

    - عناصر فرعية إلزامية:

      - دليل المستخدم (/help/user-guide)

      - اختصارات لوحة المفاتيح (/help/keyboard-shortcuts)

      - شرف AI (/help/ai-assistant)

      - الدعم الفني (/help/support)

آلية التحكم بالصلاحيات (RBAC) – إلزامية:

- يجب عند تسجيل الدخول تضمين قائمة صلاحيات المستخدم في JWT إلزامياً (كمصفوفة strings: permissions).

- يجب أن يستخدم مكون القائمة usePermissions hook لفلترة العناصر إلزامياً. يجب أن يظهر العنصر فقط إذا كان permission الخاص به موجوداً في مصفوفة صلاحيات المستخدم، أو كان null.

- يجب أن تُخفى الأقسام الفرعية لقسم ما تلقائياً إلزامياً إذا كانت كل العناصر الفرعية مخفية.

- يجب ألّا يُعتمد على الواجهة فقط إلزامياً؛ يجب أن يفرض الخادم الصلاحيات على API.

تعدد اللغات والترجمة – إلزامي:

- يجب أن تكون جميع التسميات (label) مفاتيح ترجمة إلزاماً (مثل "sidebar.customers").

- يجب استخدام مكتبة react-i18next إلزامياً لترجمة النصوص حسب اللغة المختارة (ar/en). يجب أن تكون ملفات الترجمة بتنسيق JSON إلزامياً.

- يجب أن تتغير القائمة بالكامل فوراً عند تبديل اللغة إلزامياً (بما في ذلك الاتجاه RTL/LTR) دون إعادة تحميل.

السلوك التقني (React Component) – إلزامي:

- يجب أن يقرأ مكون Sidebar مصفوفة العناصر من ملف navigation.ts إلزامياً ويطابقها مع الصلاحيات.

- يجب أن يستخدم مكون NavLink من React Router إلزامياً لتمييز الرابط النشط.

- يجب أن تستخدم الأقسام القابلة للطي (Accordion) useState محلي إلزامياً للتحكم في حالة الفتح/الإغلاق. عند الطي الكامل، يجب أن تبقى الأقسام مفتوحة افتراضياً (يمكن تغييرها).

- يجب تخزين حالة الأقسام المفتوحة/المغلقة في LocalStorage إلزامياً لاستمرارها عبر التنقل.

- الأداء إلزامي: يجب ألّا تُعاد تحميل القائمة بالكامل عند تغيير المسار، بل تتفاعل فقط مع تغييرات الصلاحية (نادرة) أو اللغة.

اختصار لوحة المفاتيح إلزامي:

- Ctrl + B (أو Ctrl + \): يجب أن يطوي/يوسع القائمة الجانبية إلزامياً.

القائمة على الأجهزة المحمولة إلزامية:

- في الشاشات الصغيرة ( fiscal_years.id`

   - branch_id BIGINT FK -> branches.id (nullable؛ إذا كان null فالترقيم مشترك بين الفروع)

   - last_number BIGINT DEFAULT 0

   - قيد فريد إلزامي: UNIQUE (tenant_id, document_type, fiscal_year_id, COALESCE(branch_id, 0)) (يجب استخدام 0 كممثل للـ null لضمان فرادة القيد).

2. دالة الترقيم داخل المعاملة إلزامية:

   يجب أن تتم عملية الحصول على رقم جديد حصرياً داخل معاملة قاعدة بيانات واحدة (Database Transaction) ضماناً لـ Atomicity و Consistency إلزامياً. يجب أن تكون الخوارزمية كالتالي إلزامياً:

   - الخطوة 1 إلزامية: بدء المعاملة.

   - الخطوة 2 إلزامية: يجب تنفيذ استعلام قفل الصف (SELECT ... FOR UPDATE) إلزامياً لضمان عدم تمكن أي معاملة أخرى من قراءة أو تعديل last_number لنفس المفتاح في نفس اللحظة.

     SELECT last_number 
     FROM document_sequences 
     WHERE tenant_id = :tenantId 
       AND document_type = :docType 
       AND fiscal_year_id = :fiscalYearId 
       AND COALESCE(branch_id, 0) = COALESCE(:branchId, 0)
     FOR UPDATE;

   - الخطوة 3 إلزامية: إذا لم يُرجع الاستعلام أي صف، يجب إنشاء سجل جديد بـ last_number = 0 (أول مرة في السنة/الفرع) إلزامياً، ويجب إعادة تعيين المتغير محلياً.

   - الخطوة 4 إلزامية: يجب زيادة المتغير newNumber = last_number + 1 إلزامياً.

   - الخطوة 5 إلزامية: يجب تحديث السجل إلزامياً:

     UPDATE document_sequences 
     SET last_number = :newNumber 
     WHERE ...;

     أو يجب استخدام استعلام واحد أكثر كفاءة إلزامياً مع INSERT ... ON CONFLICT DO UPDATE ولكن يجب التعامل مع الإرجاع إلزامياً. يجب أن تكون الطريقة المثلى:

     INSERT INTO document_sequences (tenant_id, document_type, fiscal_year_id, branch_id, last_number) 
     VALUES (:tenantId, :docType, :fiscalYearId, :branchId, 1)
     ON CONFLICT (tenant_id, document_type, fiscal_year_id, COALESCE(branch_id, 0)) 
     DO UPDATE SET last_number = document_sequences.last_number + 1
     RETURNING last_number;

     - ملاحظة إلزامية: يجب استخدام COALESCE(branch_id, 0) في القيد الفريد لمعاملة القيم null بشكل صحيح.

   - الخطوة 6 إلزامية: يجب استخدام الرقم المُعاد (last_number) كرقم للمستند إلزامياً.

   - الخطوة 7 إلزامية: يجب إتمام المعاملة (Commit) إذا تم حفظ المستند بنجاح، أو التراجع (Rollback) إذا فشل الحفظ لأي سبب (خطأ تحقق، فشل في القيد المحاسبي...) إلزامياً. يجب أن يضمن ذلك إلزامياً عدم وجود فراغات رقمية ناتجة عن فشل العملية.

تعيين النطاق (Scope) – إلزامي:

- يجب تحديد fiscal_year_id تلقائياً إلزامياً من تاريخ المستند (بمطابقته مع السنة المالية النشطة أو الفترة).

- يجب تحديد branch_id من الجلسة إلزامياً (إذا كان المستخدم مقيداً بفرع) أو من حقل الفرع في المستند. في حال كان المستأجر لا يستخدم الأفرع، يجب أن يكون branch_id بقيمة NULL إلزامياً، ويجب أن يعمل القيد الفريد باستخدام COALESCE(branch_id, 0) كما سبق.

- يجب أن يتحقق ذلك إلزامياً:

  - ترقيم منفصل لكل سنة مالية (يجب أن يعود الرقم 1 مع بداية كل سنة).

  - ترقيم منفصل لكل فرع إذا تطلب الأمر (مثلاً، فواتير الفرع أ تبدأ من 1، وفواتير الفرع ب تبدأ من 1 في نفس السنة). يجب أن يحدد الإعداد الافتراضي للمستأجر ما إذا كان الترقيم مركزياً أم لكل فرع إلزامياً.

التطبيق في NestJS (مثال خدمة DocumentNumberingService) – إلزامي:

- يجب توفير خدمة واحدة إلزامية مسؤولة عن إصدار الرقم لأي نوع مستند.

- يجب أن تستقبل tenantId, documentType, documentDate, branchId (اختياري) إلزامياً.

- يجب أن تحدد fiscalYearId من التاريخ عبر خدمة FiscalYearService إلزامياً.

- يجب أن تستخدم EntityManager.transaction() إلزامياً لتنفيذ الخوارزمية أعلاه داخل معاملة.

- يجب أن تُرجع الرقم الجديد للمستدعي (Controller) إلزامياً ليتم تعيينه للمستند قبل الحفظ النهائي.

سلوك المسودات والأرقام المؤقتة – إلزامي:

- عند إنشاء مستند جديد وحفظه كمسودة (Draft) لأول مرة، قد لا يحصل على رقم فوري (أو يحصل على رقم "مسودة" مؤقت لا يُدرج في تسلسل الترقيم). إلزامياً يجب أن تكون السياسة المختارة هي:

  - عند أول حفظ (حتى كمسودة) إلزامي: يجب حجز رقم من المسلسل وإعطائه للمستند إلزامياً. يجب أن يضمن ذلك إلزامياً أن المستخدم يرى رقم المستند حتى وهو في حالة مسودة، ويسهل الرجوع إليه.

  - يجب ألّا يسبب هذا فراغات حقيقية إلزامياً في حال حذف المسودة لاحقاً، لأن الحذف سيكون منطقياً (Soft Delete)، ويبقى الرقم محجوزاً. في حالات نادرة إذا تقرر حذف المسودة نهائياً، يجب أن يُفهم أن الرقم قد يُفقد (وهذا مقبول).

- عند الترحيل إلزامي: يجب ألّا يتغير الرقم، بل يبقى كما هو.

تأمين الأداء العالي والتزامن – إلزامي:

- يجب أن يُطبق القفل (SELECT ... FOR UPDATE) على صف واحد فقط إلزامياً (مفتاح مركب: مستأجر + نوع + سنة + فرع)، مما يجعله قصيراً جداً ولا يؤثر على المعاملات الأخرى لنفس المستأجر التي تستخدم أنواع مستندات أو فروع أخرى. حتى في حالة نوع مستند واحد ونفس الفرع، يجب أن يحرره commit/rollback بسرعة إلزامياً.

- يجب استخدام Redis كآلية إضافية إلزامية (ليس بديلاً) للقفل الموزع إذا تطلب الأمر، لكن PostgreSQL كافٍ تماماً لـ MVP بـ 20 مستخدماً متزامناً.

- يُمنع منعاً باتاً تنفيذ الترقيم خارج المعاملة أو باستخدام استعلامات بدون قفل مناسب، لأن ذلك سيؤدي حتماً إلى أرقام مكررة تحت الضغط.

عرض الرقم في الواجهة – إلزامي:

- يجب عرض الرقم دائمًا كعدد صحيح بدون أي تنسيق إلزامياً (مثل 123).

- في شاشات القوائم، يجب أن يظهر في عمود "رقم المستند" إلزامياً.

- في التقارير والطباعة، يجب أن يظهر بصيغته العددية الصرفة إلزامياً.

أثر إلغاء الترحيل (Reverse) – إلزامي:

- عندما يُلغى مستند (يُعكس)، يجب ألّا يُحرر رقمه إلزامياً. يجب أن يبقى الرقم مرتبطاً بالمستند الملغي إلزامياً، ويجب أن تُنشأ مستندات الإلغاء (مثل إشعار الدائن) بأرقام جديدة من نفس المسلسل إلزامياً. يجب أن يتوافق ذلك مع المعايير المحاسبية التي تمنع إعادة استخدام الأرقام.

اختبار الأداء إلزامي:

- يجب اختبار السيناريو الأسوأ إلزامياً: 20 مستخدمًا يحاولون إنشاء فاتورة مبيعات في نفس اللحظة لنفس المستأجر والفرع. يجب أن تنجح جميع الطلبات دون خطأ duplicate key ودون تجاوز زمن الاستجابة المحدد إلزامياً.

سابعاً: الترابط المحاسبي التلقائي – Accounting Engine (موسع ومفصل)

الفلسفة العامة:

يجب أن يكون قلب النظام المحاسبي هو محرك الترحيل الآلي (Accounting Engine) إلزامياً. يجب أن يكون المبدأ الأساسي إلزامياً: "كل مستند تشغيلي يُنشئ قيده المحاسبي تلقائياً وبشكل فوري عند ترحيله، دون أي تدخل يدوي". يجب أن يضمن ذلك تطابقاً تاماً بين العمليات التشغيلية والدفاتر المحاسبية إلزامياً، ويمنع أي تلاعب أو خطأ بشري. يجب أن يكون المحرك مبنياً على مبدأ القيد المزدوج (Double-Entry) إلزامياً ويتعامل مع جميع أنواع المستندات: فواتير البيع والشراء، المرتجعات، سندات القبض والصرف، الجرد، والتحويلات. يجب أن تُنفذ جميع هذه العمليات داخل Transaction واحدة إلزامياً لضمان Atomicity.

هيكل المحرك (AccountingService) – إلزامي:

- يجب توفير خدمة واحدة مركزية إلزامية في وحدة الحسابات (AccountingModule) مسؤولة عن بناء القيود وتوليدها.

- يجب أن تستدعي أي خدمة أخرى (مثل SalesService أو PurchasingService) دالة postDocument من هذه الخدمة عند ترحيل مستند إلزامياً، وتمرر كائن المستند كاملاً إلزامياً.

- يجب أن تتعامل الخدمة مع EntityManager إلزامياً لضمان أن القيد المحاسبي (JournalEntry + Items) وحركات المخزون (StockMovements) وتحديث طبقات التكلفة (CostLayers) كلها جزء من نفس معاملة المستند الأصلي.

تدفق الترحيل العام (postDocument) – إلزامي:

1. استلام المستند إلزامي: يجب أن تستلم الدالة المستند (فاتورة، سند...) ونوعه.

2. التحقق من الحالة إلزامي: يجب أن تتأكد من أن المستند في حالة draft ولم يُرحل مسبقاً.

3. تحديد الحسابات الافتراضية إلزامي: يجب أن تجلب معرفات الحسابات المحاسبية من جدول settings إلزامياً (مثل حساب المبيعات، تكلفة المبيعات، المخزون، النقدية، فروق العملة) وتستخدمها في القيود.

4. حساب التكاليف (للمستندات المخزنية) إلزامي: يجب استدعاء CostingService التي تقوم بـ:

   - للصادر (بيع، مرتجع شراء) إلزامي: استهلاك طبقات التكلفة (CostLayers) حسب طريقة FIFO إلزامياً. يجب أن تبدأ من أقدم طبقة مفتوحة للمنتج/المخزن وتخصم الكمية المطلوبة من quantity_remaining، وتجمع التكلفة المباعة إلزامياً. يجب أن تستخدم أقفالاً (pg_advisory_xact_lock) لمنع التضارب.

   - للوارد (شراء، مرتجع بيع) إلزامي: يجب إنشاء طبقة تكلفة جديدة أو تعديل طبقة قائمة.

   - يجب تخزين تكلفة البضاعة المباعة (COGS) في بند الفاتورة إلزامياً.

5. توليد كائنات القيد إلزامي: يجب بناء مصفوفة من كائنات JournalEntryItem حسب نوع المستند إلزامياً (التفاصيل أدناه). يجب التأكد من توازن المدين والدائن إلزامياً.

6. إنشاء سجل القيد إلزامي: يجب حفظ كائن JournalEntry مع جميع بنوده في قاعدة البيانات إلزامياً.

7. إنشاء حركات المخزون إلزامي: لكل بند مخزني، يجب إنشاء حركة في stock_movements بالنوع والكمية والتكلفة المناسبة إلزامياً، مع تحديث quantity_balance و total_cost_balance.

8. تحديث حالة المستند إلزامي: يجب تعيين status = 'posted' و posted_at = now() إلزامياً.

9. تسجيل التدقيق إلزامي: يجب إنشاء سجل في audit_logs يوثق عملية الترحيل إلزامياً.

يجب عمل Rollback للمعاملة بالكامل إذا فشلت أي خطوة إلزامياً.

التفصيل الكامل للقيود المحاسبية حسب نوع المستند (إلزامي):

أولاً: فاتورة مبيعات (بضاعة، نقداً) – إلزامي:

- الحدث: بيع بضاعة من المخزون، الدفع نقداً.

- البيانات الداخلة إلزامية: كائن SalesInvoice مع بنوده.

- الخدمات المستدعاة إلزامياً: CostingService.calculateCOGS(invoice).

- الخطوات إلزامية:

  1. لكل بند، يجب حساب تكلفة البضاعة المباعة (COGS) عبر استهلاك طبقات FIFO إلزامياً. يجب خصم المخزون.

  2. يجب بناء القيد المركب إلزامياً:

     - قيد تكلفة المبيعات (COGS): مدين: حساب تكلفة المبيعات (من الإعدادات) / دائن: حساب المخزون (من الإعدادات)، بقيمة إجمالي التكلفة.

     - قيد الإيراد: مدين: الحساب النقدي (المختار في الفاتورة أو الصندوق الافتراضي) / دائن: حساب المبيعات (من الإعدادات) + دائن: حساب ضريبة المبيعات المستحقة (من tax_config.account_id)، بقيمة إجمالي الفاتورة شامل الضريبة.

  3. حركة مخزون: صادر (sale) بكمية سالبة إلزامية لكل صنف.

- مثال (فاتورة بصنف واحد، سعر البيع 1000، التكلفة 700، ضريبة 10%):

  - القيد 1 (تكلفة): 700 مدين (تكلفة مبيعات) / 700 دائن (مخزون).

  - القيد 2 (إيراد): 1100 مدين (نقدية) / 1000 دائن (مبيعات) + 100 دائن (ضريبة مبيعات).

ثانياً: فاتورة مبيعات (بضاعة، آجل) – إلزامي:

- كما السابق تماماً، مع استبدال إلزامي للحساب النقدي بحساب العميل (مدين).

- مثال: 1100 مدين (العميل) / 1000 دائن (مبيعات) + 100 دائن (ضريبة مبيعات).

- يجب تسجيل ذمم العميل إلزامياً.

ثالثاً: فاتورة مبيعات (خدمة) – إلزامي:

- لا يوجد بضاعة، لا مخزون، لا قيد تكلفة مبيعات.

- قيد واحد فقط إلزامي: مدين (النقدية أو العميل) / دائن (إيراد الخدمات) + ضريبة.

رابعاً: فاتورة مشتريات (بضاعة، نقداً) – إلزامي:

- الحدث: شراء بضاعة وإدخالها للمخزون، الدفع نقداً.

- الخطوات إلزامية:

  1. لكل بند، يجب إنشاء طبقة تكلفة جديدة إلزامياً في cost_layers (quantity_received, unit_cost = سعر الشراء / الكمية).

  2. حركة مخزون: وارد (purchase) بكمية موجبة، تكلفة الوحدة من سعر الشراء.

  3. يجب بناء القيد إلزامياً:

     - مدين: حساب المخزون (قيمة الشراء) + مدين: حساب ضريبة المشتريات القابلة للاسترداد (إن وُجدت) / دائن: الحساب النقدي (إجمالي الفاتورة).

- مثال (شراء بسعر 500، ضريبة 5%):

  - 500 مدين (مخزون) + 25 مدين (ضريبة مشتريات) / 525 دائن (نقدية).

خامساً: فاتورة مشتريات (آجل) – إلزامي:

- كما أعلاه مع استبدال إلزامي للنقدية بحساب المورد (دائن).

- مثال: 500 مدين (مخزون) + 25 مدين (ضريبة) / 525 دائن (المورد).

سادساً: مرتجع مبيعات (بضاعة) – إلزامي:

- الحدث: إعادة العميل لبضاعة، واستردادها للمخزون، وإلغاء الذمم أو رد النقدية.

- السياسة المحاسبية المتبعة إلزامياً: يجب عكس القيد الأصلي باستخدام نفس تكلفة البيع الأصلية للبضاعة المرتجعة. يجب أن يحافظ هذا على هامش الربح ويمنع التلاعب. يجب جلب التكلفة من بند الفاتورة الأصلي (المخزنة في cost_of_goods_sold للبند) إلزامياً.

- الخطوات إلزامية:

  1. حركة مخزون: وارد (return) بكمية موجبة، تكلفة الوحدة = تكلفة البيع الأصلية. لا يجوز إنشاء طبقة تكلفة جديدة بل يجب اعتبارها إلغاء لاستهلاك سابق.

  2. يجب بناء القيد العكسي إلزامياً:

     - مدين: حساب المخزون (بنفس تكلفة البيع الأصلية) / دائن: حساب تكلفة المبيعات (عكس COGS).

     - مدين: حساب المبيعات + مدين: حساب ضريبة المبيعات / دائن: حساب العميل (أو النقدية) بقيمة المرتجع.

- مثال (مرتجع صنف، سعر بيعه 1000، تكلفته 700، ضريبة 100):

  - 700 مدين (مخزون) / 700 دائن (تكلفة مبيعات).

  - 1000 مدين (مبيعات) + 100 مدين (ضريبة) / 1100 دائن (العميل).

سابعاً: مرتجع مشتريات (بضاعة) – إلزامي:

- الحدث: إعادة بضاعة للمورد.

- السياسة المحاسبية إلزامية: يجب عكس قيد الشراء باستخدام تكلفة الشراء الأصلية من طبقة التكلفة المرتبطة بالفاتورة الأصلية إلزامياً. يجب إغلاق الطبقة أو إنقاصها إلزامياً.

- الخطوات إلزامية:

  1. حركة مخزون: صادر (purchase_return) بكمية سالبة، تكلفة الوحدة = تكلفة الشراء الأصلية.

  2. القيد: مدين: حساب المورد (أو النقدية) / دائن: حساب المخزون + دائن: حساب ضريبة المشتريات (عكسها).

- مثال: 525 مدين (المورد) / 500 دائن (مخزون) + 25 دائن (ضريبة مشتريات).

ثامناً: سند قبض (تحصيل من عميل) – إلزامي:

- الحدث: استلام نقدية أو شيك من عميل لسداد فواتير.

- الخدمات: يجب ألّا تستدعي CostingService.

- الخطوات إلزامية:

  1. يجب بناء قيد بسيط إلزامي: مدين: الحساب النقدي (أو شيكات برسم التحصيل) / دائن: حساب العميل (بقيمة السند).

  2. في حالة وجود شيك، يجب استخدام حساب "شيكات برسم التحصيل" (أصل) إلزامياً، ويجب ربط سجل الشيك إلزامياً.

  3. يجب ألّا ينشئ توزيع المبلغ على الفواتير عبر payment_allocations قيوداً إضافية إلزامياً، بل يجب استخدامه لتقارير أعمار الديون وإغلاق الفواتير. (سياسة MVP إلزامية).

تاسعاً: سند صرف (دفع لمورد) – إلزامي:

- الحدث: دفع نقدية أو شيك لمورد.

- الخطوات إلزامية:

  1. يجب أن يكون القيد إلزامياً: مدين: حساب المورد / دائن: الحساب النقدي (أو شيكات مستحقة الدفع).

  2. مع شيك صادر، يجب استخدام حساب "شيكات مستحقة الدفع" (التزام) إلزامياً.

عاشراً: شيك وارد (تحصيل لاحق) – إلزامي:

- المرحلة 1 (سند القبض بالشيك) إلزامية:

  - مدين: شيكات برسم التحصيل (أصل) / دائن: العميل.

  - يجب إنشاء سجل الشيك بحالة pending إلزامياً.

- المرحلة 2 (سند قبض عند التحصيل) إلزامية:

  - مدين: البنك (النقدية) / دائن: شيكات برسم التحصيل.

  - يجب تحديث حالة الشيك إلى cleared إلزامياً.

حادي عشر: شيك صادر (صرف لاحق) – إلزامي:

- المرحلة 1 (سند الصرف بالشيك) إلزامية:

  - مدين: المورد / دائن: شيكات مستحقة الدفع.

- المرحلة 2 (سند صرف عند تقديم الشيك للصرف) إلزامية:

  - مدين: شيكات مستحقة الدفع / دائن: البنك.

ثاني عشر: التحويل بين المخازن – إلزامي:

- يجب ألّا يوجد أي قيد محاسبي إلزامياً. يجب أن تكون حركتا مخزون فقط: صادر من المصدر، وارد للوجهة بنفس التكلفة (منقولة من طبقات المصدر) إلزامياً. يجب ألّا يكون هناك ربح ولا خسارة.

ثالث عشر: الجرد الدوري – إلزامي:

- عجز إلزامي:

  - يجب أن تكون حركة مخزون: صادر (adjustment) بكمية سالبة، التكلفة = تكلفة FIFO في تاريخ الجرد إلزامياً.

  - يجب أن يكون القيد إلزامياً: مدين: مصروف عجز مخزني / دائن: المخزون.

- زيادة إلزامية:

  - يجب أن تكون حركة مخزون: وارد (adjustment) بكمية موجبة، التكلفة = سعر الشراء الأخير أو تكلفة تقديرية (يدخلها المستخدم) إلزامياً.

  - يجب أن يكون القيد إلزامياً: مدين: المخزون / دائن: إيراد زيادة مخزنية.

رابع عشر: القيود الافتتاحية – إلزامي:

- يجب إنشاؤها مرة واحدة إلزامياً من شاشة الأرصدة الافتتاحية.

- يجب أن يكون قيد مركب واحد (أو عدة قيود) بتاريخ أول يوم في السنة المالية إلزامياً.

- للعملاء (أرصدة مدينة) إلزامي: مدين: حسابات العملاء الفرعية / دائن: حساب "أرصدة افتتاحية".

- للموردين (أرصدة دائنة) إلزامي: مدين: حساب "أرصدة افتتاحية" / دائن: حسابات الموردين الفرعية.

- للمخزون إلزامي: مدين: المخزون / دائن: أرصدة افتتاحية.

- للحسابات الأخرى إلزامي: حسب طبيعتها (الأصول مدينة، الخصوم دائنة).

- يجب أن يتوازن القيد إلزامياً (مجموع الأرصدة المدينة = مجموع الأرصدة الدائنة). يجب أن يمثل حساب "أرصدة افتتاحية" حساباً مؤقتاً يُصفّر في نهاية إنشاء القيد.

خامس عشر: فروق سعر الصرف (عملات أجنبية) – إلزامي:

- عند السداد (فروق محققة) إلزامي:

  - فاتورة آجلة مسجلة بالدولار (مثلاً 100$ بسعر صرف 250 YER = 25,000 YER). عند السداد، يصبح سعر الصرف 260 YER.

  - يجب أن يكون قيد السداد إلزامياً: مدين: المورد (بالريال اليمني المعادل وقت الفاتورة) 25,000 / دائن: البنك (بقيمة السداد الفعلية) 26,000. يجب تسجيل الفرق 1,000 في قيد منفصل إلزامياً:

    - مدين: مصروف فروق عملة (خسارة) 1,000 / دائن: المورد 1,000.

  - يجب تصفية ذمة المورد بالكامل إلزامياً.

- عند إعادة التقييم (فروق غير محققة - للمرحلة الثانية) إلزامي: في نهاية الفترة، يجب إعادة تقييم الأرصدة المعلقة بالعملات الأجنبية والاعتراف بالفرق كربح/خسارة غير محققة إلزامياً. (سياسة MVP إلزامية: تكتفي بالفروق المحققة فقط).

سادس عشر: إلغاء الترحيل (Reverse) – إلزامي:

- الآلية إلزامية: يُمنع منعاً باتاً حذف أي مستند مرحل. يجب إنشاء عملية "عكس" إلزامياً. عند طلب إلغاء مستند (مثلاً فاتورة مبيعات)، يجب أن يقوم المحرك بما يلي إلزامياً:

  1. يجب إنشاء مستند إلغاء (Reverse Document) يكون صورة طبق الأصل عن المستند الأصلي ولكن بحالة reversed إلزامياً.

  2. يجب تنفيذ قيود عكسية تماماً (مدين يصبح دائناً والعكس) لجميع بنود القيد الأصلي إلزامياً. يجب تسجيل هذا القيد العكسي في journal_entries وربطه بالمستند الأصلي عبر source_id و source_type إلزامياً.

  3. يجب تنفيذ حركات مخزون عكسية (صادر يصبح وارداً والعكس) بنفس التكاليف الأصلية إلزامياً.

  4. يجب تحديث حالة المستند الأصلي إلى reversed ليصبح للقراءة فقط إلزامياً.

- الأثر: يجب أن يضمن مسار تدقيق كامل إلزامياً. يجب ألّا يُسمح بالتلاعب بالبيانات المالية بأثر رجعي.

إعداد الحسابات الافتراضية (جدول settings) – إلزامي:

- يجب أن يعتمد المحرك على إعدادات مخزنة لكل مستأجر إلزامياً لتحديد الحسابات التي لا يحددها المستخدم بشكل صريح في المستند. يجب أن تكون هذه الإعدادات إلزامية:

  - default_sales_account_id (حساب المبيعات)

  - default_cogs_account_id (حساب تكلفة المبيعات)

  - default_inventory_account_id (حساب المخزون)

  - default_customer_cash_account_id (حساب العميل النقدي للبيع النقدي)

  - default_sales_tax_account_id (حساب ضريبة المبيعات، يمكن تجاوزه من tax_config)

  - default_forex_gain_account_id (حساب أرباح فروق العملة)

  - default_forex_loss_account_id (حساب خسائر فروق العملة)

- يجب ملء هذه الإعدادات أثناء إنشاء المستأجر (Seed) إلزامياً ويجب على المستأجر التأكد من صحتها إلزامياً. بدونها، لن يعمل الترحيل.

آلية القفل ومنع التضارب في المخزون – إلزامية:

- داخل CostingService، قبل استهلاك أي طبقة تكلفة، يجب الحصول على قفل استشاري حصري pg_advisory_xact_lock(product_id, warehouse_id) إلزامياً. يجب أن يضمن ذلك أن مستخدماً واحداً فقط يمكنه تعديل مخزون هذا المنتج في هذا المخزن في لحظة معينة إلزامياً. يجب تحرير القفل تلقائياً بنهاية المعاملة إلزامياً. يجب أن يمنع هذا التضارب ويضمن الدقة في ظل التزامن حتى 20 مستخدماً.

اختبار المحرك إلزامي:

- يجب أن تشمل اختبارات الوحدة (Unit Tests) إلزامياً السيناريوهات التالية:

  - ترحيل فاتورة بيع عادية والتحقق من القيد وحركة المخزون والرصيد الجديد.

  - ترحيل مرتجع والتحقق من عكس القيم بشكل صحيح.

  - ترحيل فاتورة بعملة أجنبية وسدادها بسعر صرف مختلف، والتحقق من فروق العملة.

  - إلغاء الترحيل والتحقق من إنشاء مستند الإلغاء.

  - محاولة ترحيل فاتورة بمخزون غير كاف ورفضها (عند allow_negative_stock=false).

  - اختبار إجهاد (Stress Test) إلزامي لـ 20 مستخدماً متزامناً يبيعون نفس المنتج، والتأكد من عدم وجود تضارب في الأرصدة أو طبقات التكلفة.

ثامناً: سلوكيات الشاشات الإجبارية والتفصيلية

1. مكون LookupModal الموحد – إلزامي

- الغرض: يجب استخدام مكون LookupModal إلزامياً لاختيار أي كيان في النظام (عملاء، موردين، أصناف، حسابات، مخازن، فروع، مستخدمين، شروط دفع، قوائم أسعار، إلخ) بدلاً من القوائم المنسدلة الطويلة.

- السلوك عند الفتح إلزامي:

  - يجب أن يظهر Modal وسطي بقياس: عرض 90% من الشاشة، ارتفاع 85%، وبحد أقصى 1200 بكسل عرض و900 بكسل ارتفاع إلزامياً.

  - يجب أن تكون الواجهة RTL كلياً إلزامياً.

  - يجب أن يظهر رأس الـ Modal بلون أزرق غامق (#0D5AA7) ويحتوي إلزامياً على:

    - عنوان ديناميكي حسب الكيان (مثل "اختيار العميل").

    - شريط بحث نصي مباشر مع عنصر نائب مناسب (مثلاً "ابحث عن عميل بالاسم أو الرمز...").

    - عداد نتائج (مثلاً "نتائج: 25").

    - زر إغلاق في الزاوية اليسرى.

- منطقة المحتوى إلزامية:

  - يجب توفير جدول بيانات قابل للتمرير العامودي إلزامياً.

  - يجب أن يعرض كل صف حقول مختصرة حسب الكيان إلزامياً: (الرمز، الاسم، الرصيد/السعر/الوصف).

  - يجب أن تكون الصفوف قابلة للنقر (Clickable) وتدعم التحديد بلوحة المفاتيح (أسهم + Enter) إلزامياً.

  - عند النقر على صف، يجب إغلاق الـ Modal فوراً وإرجاع الكائن المختار إلى الحقل الأصلي إلزامياً، مع تعبئة أي حقول تابعة (مثل ملء السعر الافتراضي عند اختيار صنف، أو شرط الدفع عند اختيار عميل) إلزامياً.

- البحث إلزامي:

  - يجب توفير Live Search مع تأخير 300 ميلي ثانية (debounce) إلزامياً.

  - يجب إرسال استفسار إلى API إلزامياً مثل: GET /api/lookup/customers?search=...&limit=50.

  - يجب اعتماد البحث على PostgreSQL Full-TextSearch إلزامياً عبر عمود search_vector الذي يُحدَّث تلقائياً مع كل إدراج/تحديث.

  - يجب أن يشمل البحث حقول: الاسم، الكود، الباركود، رقم الهاتف، وأي حقل مخصص للكيان إلزامياً.

- الأداء والأمان إلزامي:

  - يجب تمرير tenant_id تلقائياً إلزامياً من JWT.

  - يجب ألّا تُعرض أكثر من 50 صف في الصفحة الواحدة، مع توفير إمكانية التمرير اللانهائي (Infinite Scroll) إلزامياً ليحل محل الترقيم التقليدي.

- الصلاحيات: يجب ألّا توجد صلاحيات خاصة، أي مستخدم لديه إذن عرض الكيان يجب أن يتمكن من استخدام الـ LookupModal.

- الاختصارات إلزامية:

  - Ctrl + Shift + L: يجب أن يفتح Lookup للحقل النشط الحالي إلزامياً.

  - Escape: يجب أن يغلق الـ Modal إلزامياً.

  - Tab / Shift+Tab: يجب التنقل بين الحقول داخل الـ Modal إلزامياً.

  - Enter: يجب اختيار الصف المظلل إلزامياً.

2. شاشة فاتورة المبيعات (المسار: /sales/invoices) – إلزامية

- فتح الشاشة وسلوك التهيئة إلزامي:

  - عند الدخول لإنشاء فاتورة جديدة، يجب عرض الشاشة بالحقول التالية في الهيكل العلوي (ثابت لا يتحرك مع التمرير) إلزامياً:

    - رقم الفاتورة: حقل تلقائي القراءة فقط، يجب أن يظهر بعد الحفظ الأول كرقم مسودة مؤقت (أو يعرض "تلقائي" قبل الحفظ). يجب ملؤه بالرقم الفعلي بعد الترحيل.

    - التاريخ: ميلادي افتراضي (قابل للتعديل)، مع إمكانية عرضه هجرياً حسب إعدادات المستأجر. يجب استخدام DatePicker يدعم كلا التقويمين إلزامياً.

    - نوع الفاتورة: قائمة منسدلة (بضاعة/خدمة). يجب ألّا يمكن تغييرها بعد إضافة أصناف أو حفظ كمسودة.

    - طريقة الدفع: قائمة منسدلة (نقدي/آجل). يجب التعامل إلزامياً:

      - إذا كانت "نقدي":

        - يجب أن يظهر حقل "الحساب النقدي" (اختيار من LookupModal لجدول cash_accounts).

        - خلف الكواليس، يجب ربط الفاتورة تلقائياً إلزامياً بحساب "عميل نقدي" افتراضي مُعرف في الإعدادات (default_customer_cash_account_id)، ويجب ألّا يظهر هذا الحساب للمستخدم.

      - إذا كانت "آجل":

        - يجب أن يظهر حقل "العميل" (إجباري، عبر LookupModal). عند اختيار العميل إلزامياً:

          - يجب ملء حقل "شرط الدفع" تلقائياً من إعداد العميل الافتراضي (قابل للتغيير).

          - يجب حساب تاريخ الاستحقاق (due_date) = تاريخ الفاتورة + أيام شرط الدفع.

          - يجب فحص الحد الائتماني مباشرة إلزامياً (يعرض الرصيد الحالي والحد الأعلى للمستخدم كمرجع).

        - حقل "قائمة الأسعار": اختياري، من LookupModal. عند اختيارها، يجب تطبيقها على الأصناف المضافة لاحقاً إلزامياً.

    - المخزن: (إجباري إذا نوع الفاتورة "بضاعة") من LookupModal إلزامياً.

    - المندوب: (اختياري) من LookupModal على جدول salespersons إلزامياً.

    - البيان: حقل نصي حر (اختياري) يجب أن يظهر في رأس الفاتورة.

    - العملة: افتراضية YER، يجب أن تكون قابلة للتغيير من LookupModal. عند تغيير العملة، يجب جلب سعر الصرف إلزامياً لتاريخ الفاتورة من جدول exchange_rates. إذا لم يوجد سعر لتاريخ الفاتورة، يجب تطبيق قاعدة ارتداد إلزامية: آخر سعر متاح (الأحدث فالأحدث). كما يجب أن يكون المستخدم قادراً على تعديل سعر الصرف يدوياً حسب الصلاحية.

  - بعد التهيئة، يجب أن ينتقل المؤشر إلى منطقة الأصناف إلزامياً (أو يجب أن يفتح حقل إضافة صنف إذا كانت الشاشة فارغة).

- منطقة الأصناف (جدول البنود) – إلزامية:

  - يجب أن يكون جدول RTL يحتوي على أعمدة إلزامية: # (رقم تسلسلي تلقائي)، الصنف (اسم)، الوحدة، الكمية، السعر، الخصم %، الخصم قيمة، الضريبة %، الإجمالي، زر حذف.

  - يجب أن تكون الصفوف قابلة للتعديل المباشر (Inline Edit) إلزامياً: عند النقر المزدوج على خلية الكمية أو السعر أو الخصم، يجب أن تتحول إلى حقل إدخال إلزامياً. يجب أن يحفظ الضغط على Enter التعديل وينتقل للخلية التالية، ويجب أن يلغي Escape.

  - يجب أن يُعيد أي تعديل حساب إجمالي الصف والأعمدة السفلية مباشرة إلزامياً (باستخدام JavaScript دون استدعاء الخادم).

  - قارئ الباركود إلزامي:

    - يجب توفير مستمع خفي على مستوى الشاشة (حقل إدخال شفاف أو مستمع لأحداث لوحة المفاتيح العامة عندما لا يكون هناك حقل نشط) إلزامياً.

    - إذا استقبل سلسلة نصية تنتهي بـ Enter وتحتوي على أرقام فقط (أو حروف وأرقام)، يجب اعتبارها باركود إلزامياً.

    - يجب البحث عن الصنف في قاعدة البيانات إلزامياً عبر API (/api/products/by-barcode/{barcode}).

    - إذا وُجد الصنف إلزامياً:

      - إذا كان الباركود يبدأ ببادئة الوزن (مثلاً "2")، يجب استخراج الوزن من الباركود (حسب صيغة محددة: 2xxxxxwwwwwc) وملء الكمية تلقائياً بالوزن.

      - وإلا، يجب إضافة كمية افتراضية "1".

      - يجب إضافة الصنف مباشرة إلى الجدول إلزامياً بدون فتح نافذة الإضافة، ما لم يوجد خيار إضافي (مثل خصم خاص)، فيجب فتح نافذة الإضافة مع بيانات مملوءة.

    - إذا لم يُعثر على الصنف، يجب إظهار رسالة "باركود غير معروف" إلزامياً.

- نافذة إضافة صنف (AddItemModal) – إلزامية:

  - يجب أن تُفتح عند الضغط على زر "إضافة صنف" (+) أو Ctrl+Alt+I.

  - ليست Modal مستقلة، بل يجب أن تكون قسم منبثق (Popover/Panel) كبير إلزامياً ضمن نفس صفحة الفاتورة، بعرض 600 بكسل، يتموضع إلى يسار الشاشة (RTL) أو في المنتصف.

  - التركيب إلزامي:

    - شريط علوي: يجب أن يحتوي على عنوان "إضافة صنف"، زر "حفظ وإضافة آخر"، زر "حفظ وإغلاق"، ومربع اختيار "إخفاء بعد الحفظ" (مفعل افتراضياً).

    - حقل البحث عن صنف إلزامي: حقل نصي مع أيقونة بحث. عند البدء بالكتابة، يجب أن يظهر أسفله مباشرةً قسم نتائج بحث (قائمة منسدلة داخل نفس الحاوية) ولا يجب أن يفتح Modal آخر. يجب أن تشمل النتائج: الكود، الاسم، سعر البيع، الرصيد المتاح. عند اختيار نتيجة إلزامياً:

      - يجب ملء حقول التفاصيل إلزامياً: الصنف (معرف واسم)، الوحدة (افتراضية من إعداد الصنف، قابلة للتغيير)، الرصيد في المخزن المختار، سعر البيع من قائمة الأسعار (إن وُجدت، وإلا من آخر سعر بيع للعميل، وإلا من سعر البيع الافتراضي للمنتج إن أضيف لاحقاً).

    - يجب توفير حقول قابلة للتعديل إلزامياً:

      - الكمية (افتراضية 1).

      - الكمية المجانية (البونص، إن وجدت، يجب أن تضاف كمية فقط بدون تأثير على القيمة المالية للبند ولكن قد تؤثر على التكلفة المتوسطة إذا كانت ضمن الحسابات، هنا تعامل ككمية إضافية بسعر صفر).

      - السعر (قابل للتعديل، ويجب حساب الإجمالي = الكمية × السعر).

      - الخصم (% أو قيمة)، مع احترام إعداد discount_before_tax من إعدادات المستأجر إلزامياً:

        - إذا كان الخصم قبل الضريبة: صافي البند = (الكمية × السعر - الخصم)، ثم الضريبة = الصافي × النسبة.

        - إذا كان الخصم بعد الضريبة: المبلغ قبل الضريبة = الكمية × السعر، الضريبة = المبلغ × النسبة، ثم الخصم يُطرح من الإجمالي بعد الضريبة.

      - الضريبة (%): يجب جلبها افتراضياً إلزامياً من جدول tax_configs المرتبط بالفاتورة أو بالصنف، لكن يجب أن تكون قابلة للتعديل يدوياً.

    - التحقق من الأخطاء إلزامي:

      - إذا كان allow_negative_stock = false، يجب فحص الرصيد المتاح إلزامياً (آخر quantity_balance من stock_movements). إذا كانت الكمية المطلوبة > الرصيد، يجب إظهار رسالة خطأ ومنع الحفظ.

      - إذا كان سعر البيع أقل من تكلفة الصنف الحالية (محسوبة من cost_layers) وتجاوز الحد المسموح، يجب إظهار رسالة تحذير (يجب السماح بالتجاوز بصلاحية invoice:override_price).

    - أزرار الحفظ إلزامية:

      - "حفظ وإغلاق": يجب أن يحفظ البند في جدول الفاتورة، يغلق النافذة، ويعيد التركيز إلى جدول الأصناف.

      - "حفظ وإضافة آخر": يجب أن يحفظ البند، ثم يفرغ حقول الكمية والسعر والخصم والضريبة، ويعيد المؤشر إلى حقل بحث الصنف، مع بقاء النافذة مفتوحة. إذا كان "إخفاء بعد الحفظ" مفعلاً، يجب أن تغلق النافذة تلقائياً (سلوك يشبه حفظ وإغلاق).

- الشريط السفلي وإجماليات الفاتورة – إلزامي:

  - يجب عرض الإجمالي قبل الضريبة (Subtotal)، إجمالي الخصم، إجمالي الضريبة، المبلغ الإجمالي (Grand Total) إلزامياً.

  - يجب تحديث هذه القيم Live مع أي إضافة أو تعديل أو حذف بند إلزامياً.

- أزرار الفاتورة الرئيسية إلزامية:

  - حفظ كمسودة: يجب أن يحفظ الفاتورة بحالة draft دون ترحيل. يجب أن تكون قابلة للتعديل لاحقاً.

  - حفظ وترحيل (Ctrl+Enter): يجب أن ينفذ التحقق النهائي إلزامياً:

    - يجب أن تحتوي الفاتورة على بند واحد على الأقل.

    - يجب توفر رصيد مخزون كافٍ (إن كان الصنف مخزني).

    - يجب ألّا يتجاوز الحد الائتماني للعميل (إن كان آجل) – يُمنع منعاً باتاً تجاوزه دون صلاحية invoice:override_credit_limit.

    - ثم يجب استدعاء POST /api/sales/invoices مع post: true إلزامياً. يجب أن ينفذ الخادم كل عمليات الترحيل المحاسبي وحركات المخزون داخل معاملة واحدة. يجب إعادة نجاح مع رقم الفاتورة النهائي.

  - حفظ وترحيل وطباعة: نفس السابق مع فتح نافذة طباعة مباشرة (أو تحويل لصفحة طباعة) إلزامياً.

  - إلغاء: يجب مسح التغييرات والعودة لقائمة الفواتير (مع تأكيد إذا كان هناك بيانات غير محفوظة) إلزامياً.

- سلوك ما بعد الترحيل إلزامي:

  - يجب أن تُصبح الفاتورة للقراءة فقط. يجب أن يكون إلغاؤها (Reverse) ممكناً عبر زر "إلغاء الترحيل" (إذا لم تكن هناك مدفوعات مرتبطة).

  - عند الإلغاء، يجب إنشاء حركات وقيد عكسي، ويجب إغلاق الفاتورة الأصلية إلزامياً.

- الصلاحيات المطلوبة إلزامية:

  - invoice:view (لرؤية الشاشة)

  - invoice:create (لإنشاء وتعديل المسودة)

  - invoice:post (للترحيل)

  - invoice:override_credit_limit

  - invoice:override_price

  - invoice:reverse (للإلغاء)

- سجل التدقيق إلزامي: يجب تسجيل إنشاء الفاتورة، أي تحديث، الترحيل، والإلغاء.

3. شاشة فاتورة المشتريات (المسار: /purchases/invoices) – إلزامية

- يجب أن تكون مشابهة تماماً لشاشة فاتورة المبيعات إلزامياً مع الاستبدالات التالية إلزامية:

  - العميل يصبح المورد (يتم اختياره من جدول الموردين).

  - سعر البيع يصبح سعر الشراء (يجب جلبه من supplier_price_lists أو آخر سعر شراء من فواتير سابقة).

  - يُمنع منعاً باتاً وجود "مندوب مبيعات" أو "عمولة".

  - حقل "استلام بونص" إلزامي: عند إضافة صنف، يجب السماح بإدخال "كمية البونص" (كمية إضافية مجانية بدون تكلفة). عند الترحيل إلزامياً:

    - يجب أن تشمل حركة المخزون الواردة الكمية الأصلية + البونص إلزامياً.

    - يجب إنشاء طبقة التكلفة إلزامياً فقط للكمية الأصلية (تكلفة = إجمالي سطر الشراء / الكمية الأصلية). يجب إضافة البونص إلى quantity_balance بدون فتح طبقة تكلفة جديدة.

  - طريقة الدفع إلزامية: نقدي (اختيار الحساب النقدي) أو آجل (تسجيل ذمم للمورد).

  - تحويل أمر شراء إلى فاتورة إلزامي:

    - يجب توفير زر "تحديد أمر شراء" (LookupModal على أوامر الشراء المفتوحة).

    - عند اختيار أمر شراء، يجب ملء بنود الفاتورة تلقائياً إلزامياً بالكميات المتبقية من الأمر، مع إمكانية تعديلها (استلام جزئي).

    - بعد الترحيل، يجب تحديث الأمر إلزامياً ليصبح "مستلم جزئياً" أو "مكتمل الاستلام".

  - التحقق: يُمنع التحقق من سعر أقل من التكلفة، ولكن يجب إضافة تحقق من سعر أعلى من المعتاد (تحذير) إلزامياً.

  - يجب أن يكون القيد المحاسبي إلزامياً: مدين المخزون (أو المشتريات) + ضريبة مدينة / دائن النقدية أو المورد.

4. شاشة أوامر البيع وأوامر الشراء – إلزامية

- شاشة أمر البيع (/sales/orders) إلزامية:

  - يجب أن يحتوي الهيكل الرئيسي على: رقم تلقائي، تاريخ، عميل، مخزن (اختياري)، طريقة الدفع، تاريخ الاستحقاق، بيان.

  - يجب أن يكون جدول الأصناف إلزامي: الصنف، الكمية، السعر، الإجمالي، الكمية المتبقية للتحويل (تُحسب تلقائياً).

  - يجب أن تكون الحالة إلزامية: مسودة، مؤكد، محول جزئياً، محول كلياً، ملغي.

  - يجب توفير زر "إنشاء فاتورة": يجب أن يفتح شاشة فاتورة مبيعات جديدة مع بنود منقولة من الأمر (مع إمكانية تعديل الكميات). يُمنع منعاً باتاً وجود ترحيل محاسبي.

- شاشة أمر الشراء (/purchases/orders) إلزامية:

  - يجب أن تكون مشابهة، مع مورد بدل عميل.

  - يجب توفير زر "إنشاء فاتورة مشتريات": يجب أن يحول الأمر لفاتورة إلزامياً.

5. شاشة سند القبض والصرف (موحدة – /treasury/receipts) – إلزامية

- الغرض: يجب توفير إدارة إلزامية للمقبوضات والمدفوعات النقدية أو بالشيكات.

- الهيكل العلوي إلزامي:

  - الرقم: يجب أن يكون تلقائياً إلزامياً.

  - التاريخ: يجب أن يكون ميلادي/هجري إلزامياً.

  - نوع السند: قبض (Receipt) أو صرف (Payment). يجب أن يؤثر هذا الاختيار على سلوك القيد (مدين/دائن) إلزامياً.

  - الحساب النقدي: (إجباري) يجب اختياره من الصناديق والبنوك عبر LookupModal.

  - الطرف: يجب أن يكون:

    - عميل (عند قبض)

    - مورد (عند صرف)

    - آخر (حساب GL عادي، مثلاً سلفة موظف).

  - اختيار الطرف إلزامي: عبر LookupModal، وعند اختيار عميل أو مورد، يجب أن يظهر رصيده المعلق، ويجب توفير إمكانية عرض الفواتير غير المسددة إلزامياً.

  - المبلغ الإجمالي: يجب أن يكون مجموع بنود السند (يُحسب تلقائياً) إلزامياً.

  - البيان: نص حر.

- قسم الشيكات إلزامي:

  - يجب توفير مربع اختيار "استلام/إصدار شيك". عند تفعيله، يجب أن تظهر حقول إضافية إلزامياً:

    - رقم الشيك (نص).

    - اسم البنك (نص حر أو من قائمة البنوك إن وُجدت).

    - تاريخ الاستحقاق.

    - المبلغ (يجب أن يكون مطابقاً لإجمالي السند).

  - عند الحفظ مع الشيك إلزامياً:

    - إذا كان السند قبض: يجب إنشاء سجل في cheques إلزامياً بنوع received، والحالة pending. القيد المحاسبي إلزامي: مدين "شيكات برسم التحصيل" بدلاً من الحساب النقدي، ودائن العميل.

    - إذا كان السند صرف: يجب إنشاء سجل cheque إلزامياً بنوع issued، حالة pending. القيد إلزامي: مدين المورد، ودائن "شيكات مستحقة الدفع".

  - تصفية الشيك لاحقاً إلزامية: من خلال شاشة سند قبض/صرف جديد، يجب اختيار الشيك المعلق وتغيير حالته إلى cleared مع إنشاء قيد تحويل (مدين النقدية، دائن شيكات برسم التحصيل) إلزامياً.

- جدول البنود (توزيع المبلغ) إلزامي:

  - للسندات التي تغطي عدة فواتير أو حسابات، يجب إضافة بنود إلزامياً.

  - يجب أن يحتوي كل بند إلزامياً: الحساب (العميل/المورد/حساب GL)، الوصف، المبلغ.

  - يجب السماح بربط البند بفاتورة محددة عبر payment_allocations (لأغراض أعمار الديون) إلزامياً. يجب توفير آلية سهلة: زر "توزيع على فواتير" يفتح نافذة تعرض الفواتير المعلقة للطرف، ويجب إدخال المبلغ المسدد لكل فاتورة إلزامياً.

  - يجب أن يكون مجموع البنود = المبلغ الإجمالي إلزامياً.

- الترحيل إلزامي:

  - يجب إنشاء قيد محاسبي مركب إلزامياً: حساب نقدي (أو شيكات) مقابل حساب العميل/المورد/GL.

  - يجب تسجيل payment_allocations إلزامياً لربط المدفوعات بالفواتير وتحديث أرصدتها.

- الصلاحيات إلزامية: receipt:create, receipt:post, receipt:view.

- سجل التدقيق إلزامي: يجب تسجيل إنشاء السند والترحيل.

6. شاشة الجرد الدوري (/inventory/adjustments) – إلزامية

- الهيكل إلزامي:

  - يجب اختيار المخزن (إجباري) إلزامياً.

  - تاريخ الجرد (افتراضي اليوم).

  - نوع الجرد: جرد كامل (يشمل جميع الأصناف) أو جزئي (تحديد أصناف).

  - يجب توفير زر "تحميل الأصناف والكميات النظامية" إلزامياً: يجب أن ينفذ استعلام يحسب لكل منتج في المخزن quantity_balance من آخر حركة في stock_movements حتى تاريخ الجرد (باستخدام DISTINCT ON أو استعلام نافذة).

  - الجدول الرئيسي إلزامي: أعمدة:

    - الصنف (اسم ورمز)

    - الوحدة

    - الكمية النظامية (للقراءة فقط)

    - الكمية الفعلية (إدخال يدوي أو عبر مسح باركود)

    - الفرق (تلقائي = الفعلية - النظامية)

    - التكلفة (للغرض المحاسبي): يجب حسابها تلقائياً إلزامياً لكل صنف حسب طريقة التقييم (FIFO) في تاريخ الجرد. بالنسبة للعجز، يجب أخذ التكلفة من طبقات التكلفة المتاحة (أقدم طبقة). للزيادة، يجب استخدام آخر سعر شراء أو تكلفة تقديرية (يجب تحديدها يدوياً).

    - قيمة الفرق (الفرق × التكلفة).

  - يجب السماح بإضافة أصناف غير مذكورة يدوياً إلزامياً (بحث عبر LookupModal).

- الترحيل إلزامي:

  - لكل صف فرق غير صفري، يجب إنشاء حركة مخزون إلزامياً:

    - عجز: صادر (adjustment) بقيمة الفرق.

    - زيادة: وارد (adjustment) بقيمة الفرق.

  - يجب إنشاء القيد المحاسبي الإجمالي إلزامياً:

    - العجز: مدين مصروف عجز مخزني / دائن المخزون (بقيمة إجمالي العجز).

    - الزيادة: مدين المخزون / دائن إيراد زيادة مخزنية (بقيمة إجمالي الزيادة).

  - يجب السماح بتوليد قيد واحد مجمع أو قيد لكل صنف حسب الإعداد إلزامياً.

- التحقق إلزامي: يجب ألّا يكون هناك حركات مخزنية غير مرحلة بين تاريخ الجرد وتاريخ آخر حركة. (يجب تنبيه المستخدم إلزامياً).

- الصلاحيات إلزامية: inventory:adjust:create, inventory:adjust:post.

7. شاشة القيد اليومي اليدوي (/accounting/journal-entries) – إلزامية

- الغرض: يجب تسجيل قيود محاسبية غير ناتجة عن مستندات أخرى إلزامياً.

- الهيكل إلزامي:

  - يجب أن يكون رقم القيد تلقائياً عند الترحيل إلزامياً.

  - التاريخ.

  - البيان (وصف عام للقيد).

  - جدول البنود إلزامي:

    - الحساب (يجب اختياره عبر LookupModal إلزامياً من دليل الحسابات، مع إظهار الرمز والاسم).

    - وصف البند (نص حر).

    - مدين (رقم).

    - دائن (رقم).

    - يجب السماح بإضافة/حذف بنود.

  - التوازن إلزامي: يجب أن يكون مجموع المدين = مجموع الدائن قبل الحفظ/الترحيل. يجب أن يظهر مؤشر التوازن بشكل واضح (باللون الأخضر إذا متوازن، أحمر إذا لا).

- ميزات إضافية إلزامية:

  - تحميل قالب: يجب توفير قائمة منسدلة بقوالب القيود المحفوظة (إن وُجدت) إلزامياً. عند اختيار قالب، يجب ملء البنود وترك إدخال المبالغ للمستخدم.

  - حفظ كمسودة: يجب أن يحفظ القيد بحالة draft إلزامياً.

  - حفظ وترحيل: يجب التحقق من التوازن، وصلاحية الحسابات (الحسابات النشطة فقط) إلزامياً، ثم يجب ترحيل القيد وإنشاء journal_entry بحالة posted.

- الإلغاء إلزامي: يُمنع منعاً باتاً حذف قيد مرحل، لكن يجب توفير عكسه عبر زر "عكس القيد" الذي ينشأ قيد جديد معكوس (مدين/دائن معكوس) ويربطهما.

- الصلاحيات إلزامية: journal_entry:create, journal_entry:post.

- سجل التدقيق إلزامي: يجب تسجيل الإنشاء والترحيل.

8. شاشة القيود الافتتاحية (/accounting/opening-balances) – إلزامية

- الغرض: يجب إدخال الأرصدة الافتتاحية إلزامياً عند بدء استخدام النظام أو بداية سنة مالية جديدة.

- تبويبات الشاشة إلزامية:

  - العملاء: جدول يجب أن يُظهر جميع العملاء، مع عمود "الرصيد الافتتاحي مدين" و"تاريخ الافتتاح".

  - الموردون: مشابه مع أرصدة دائنة.

  - المخزون: جدول الأصناف مع الكمية الافتتاحية والتكلفة الافتتاحية للوحدة لكل مخزن.

  - الحسابات: جدول دليل الحسابات (باستثناء حسابات العملاء والموردين) مع عمود "الرصيد الافتتاحي" (مدين/دائن).

- وظائف إلزامية:

  - يجب السماح باستيراد الأرصدة من ملف CSV/Excel.

  - عند الانتهاء، يجب توفير زر "إنشاء قيود افتتاحية" إلزامياً:

    - يجب إنشاء قيد يومي مركب واحد (أو أكثر) إلزامياً بتاريخ بداية السنة المالية.

    - للعملاء: مدين حسابات العملاء الفرعية، دائن حساب "أرصدة افتتاحية" (حساب مؤقت).

    - للموردين: مدين "أرصدة افتتاحية"، دائن حسابات الموردين.

    - للمخزون: مدين المخزون، دائن "أرصدة افتتاحية".

    - لباقي الحسابات: حسب طبيعة الحساب.

  - يجب أن تتوازن الأرصدة الافتتاحية (مجموع المدين = مجموع الدائن) إلزامياً قبل السماح بالإنشاء.

- بعد إنشاء القيود الافتتاحية، يُمنع منعاً باتاً تعديلها إلا بإلغاء القيد والعودة للشاشة.

9. شاشة التحويل بين المخازن (/inventory/transfers) – إلزامية

- الهيكل إلزامي:

  - مخزن المصدر (إجباري).

  - مخزن الوجهة (إجباري، مختلف عن المصدر).

  - التاريخ.

  - جدول الأصناف إلزامي: الصنف، الكمية.

  - يجب السماح بإضافة أصناف عبر LookupModal.

- الترحيل (تنفيذ التحويل) إلزامي:

  - يجب إنشاء حركتي مخزون إلزامياً:

    - صادر من مخزن المصدر (نوع transfer_out).

    - وارد إلى مخزن الوجهة (نوع transfer_in).

    - بنفس التكلفة (من طبقات FIFO في المصدر).

    - يجب قفل المخزونين إلزامياً لضمان الاتساق.

  - يُمنع منعاً باتاً وجود أي قيود محاسبية.

- الحالة إلزامية: يجب أن تكون مباشرة (completed).

10. شاشات القوائم (العملاء، الموردين، الأصناف، الحسابات... إلخ) – إلزامية

- يجب أن تتبع جميع شاشات عرض البيانات الرئيسية نمطاً موحداً إلزامياً:

  - شريط أدوات علوي إلزامي:

    - زر "جديد": يجب أن يفتح شاشة إضافة/تعديل.

    - حقل بحث نصي سريع: يجب أن يدعم FTS.

    - أزرار تصدير (Excel، PDF، CSV): يجب أن تطبق على البيانات المعروضة.

    - أزرار تصفية إضافية (مثل الفلترة حسب المجموعة، النشاط).

  - جدول البيانات إلزامي:

    - يجب أن تكون أعمدة قابلة للفرز (بالنقر على رأس العمود).

    - يجب أن تكون أعمدة قابلة للاختيار (لتحديد صفوف).

    - يجب أن تكون الصفوف قابلة للنقر للانتقال إلى شاشة التفاصيل/التعديل.

    - يجب توفير ترقيم صفحات (Pagination) قائم على المؤشر (cursor-based) إلزامياً للأداء، مع عرض أزرار "السابق" و"التالي".

  - سلوك الحذف إلزامي:

    - يجب أن يكون الحذف منطقياً (Soft Delete) للكيانات الرئيسية إلزامياً عبر تعيين deleted_at.

    - يُمنع منعاً باتاً حذف كيان مرتبط بمستندات مرحلة (يجب إظهار خطأ).

11. شاشة عرض حركة الأصناف وتفاصيل التكلفة – إلزامية

- حركة الأصناف (/inventory/stock-movements) إلزامية: جدول زمني مفصل لكل حركة (نوعها، مستندها، الكمية، التكلفة، الرصيد بعد الحركة) مع إمكانية الفلترة بمنتج ومخزن وتاريخ.

- طبقات التكلفة (/inventory/cost-layers) إلزامية: يجب أن يعرض الطبقات المفتوحة (غير المستهلكة بالكامل) لكل منتج/مخزن، مع تاريخ الاستلام، الكمية الأصلية، المتبقي، وتكلفة الوحدة. للقراءة فقط إلزامياً.

12. شاشات التقارير الأساسية – إلزامية

- يجب أن تتبع جميعها نمطاً موحداً إلزامياً:

  - معاملات: يجب توفر نطاق التاريخ (من/إلى)، فرع، مخزن، عميل/مورد، إلخ إلزامياً.

  - زر "عرض": يجب أن يولد التقرير إلزامياً.

  - يجب عرض التقرير في جدول أو مخطط بياني (إن أمكن) إلزامياً.

  - يجب توفير إمكانية الطباعة والتصدير إلزامية.

- التقارير المالية (ميزان المراجعة، قائمة الدخل، الميزانية) إلزامية: يجب أن تُعرض بشكل هرمي (مستويات الحسابات) مع إمكانية التوسيع/الطي إلزامياً. يجب أن تكون بياناتها من account_balances_view أو Materialized View إلزامياً. يجب أن يكون ميزان المراجعة متوازناً دائماً.

13. شاشة إعدادات النظام والمستأجر – إلزامية

- إعدادات المستأجر (/admin/settings) إلزامية:

  - يجب توفير تبويبات إلزامية: عامة (شعار، اسم الشركة)، إعدادات مالية (حسابات افتراضية، خيارات الخصم والضريبة)، إعدادات مخزنية (طريقة التقييم الافتراضية، السماح بالرصيد السالب)، إعدادات العملة واللغة (RTL/LTR، العربية/الإنجليزية، التقويم).

  - يجب تخزين الإعدادات كمفاتيح وقيم JSON إلزامياً في جدول settings.

  - يُمنع منعاً باتاً تعديلها إلا بصلاحية admin:settings.

14. شاشات الإدارة (المستخدمون، الأدوار، سجل المراجعة) – إلزامية

- المستخدمون إلزامي: يجب توفر جدول بمستخدمي المستأجر، إضافة/تعديل/تعطيل. يجب إسناد دور للمستخدم إلزامياً.

- الأدوار والصلاحيات إلزامية: يجب عرض شجرة الصلاحيات المجمعة (Resource -> Actions) مع إمكانية تخصيصها للدور إلزامياً.

- سجل المراجعة إلزامي: يجب توفر جدول للقراءة فقط يعرض الأحداث (المستخدم، الكيان، الإجراء، التاريخ، البيانات القديمة/الجديدة بصيغة JSON قابلة للطي) إلزامياً. يجب توفير إمكانية التصدير.

15. شاشة المساعد الذكي "شرف AI" – إلزامية

- يجب توفير واجهة محادثة بسيطة (RTL) إلزامياً مع مربع إدخال نصي وسجل محادثة.

- يجب السماح بكتابة سؤال مثل "كم رصيد صنف الأرز اليوم؟" أو "فواتير متأخرة لمحمد علي". يجب أن يكون الرد نصاً مباشراً إلزامياً مع رابط للانتقال للشاشة المعنية (action_url).

- آلية العمل إلزامية: يجب إرسال السؤال إلى /api/ai/query إلزامياً. يجب أن يحلل الخادم النية (Regex)، يبحث عن الكيان، ينفذ استعلام SQL للقراءة فقط، ويعيد الرد. يُمنع منعاً باتاً تنفيذ تحديثات.

تاسعاً: اختصارات لوحة المفاتيح – Keyboard Shortcuts (موسع ومفصل)

الفلسفة والهدف:

يجب توفير إنتاجية عالية إلزامية للمستخدمين المحترفين عبر مجموعة موحدة وثابتة من اختصارات لوحة المفاتيح تغطي العمليات الرئيسية في جميع شاشات النظام. يجب تقليل الاعتماد على الفأرة وتسريع إدخال البيانات والتنقل إلزامياً. يجب أن تكون الاختصارات إلزاماً:

- بديهية ومتسقة عبر كل الشاشات (نفس الاختصار لنفس العملية أينما وجدت).

- متوافقة مع أنظمة التشغيل (Windows/Linux) مع مراعاة متصفحات الويب.

- غير متعارضة مع اختصارات المتصفح الافتراضية الحيوية، مع إعطاء أولوية لاختصارات النظام عند الضرورة عبر preventDefault().

- قابلة للاكتشاف إلزامياً عبر شاشة مساعدة مخصصة ودليل المستخدم.

آلية التنفيذ التقني إلزامية:

- يجب استخدام useKeyboardShortcuts hook عام إلزامياً في تطبيق React، يُسجل في مكون App الرئيسي.

- يجب الاستماع لحدث keydown إلزامياً على مستوى document، ويجب التحقق من التركيز الحالي: إذا كان التركيز على حقل إدخال نصي (input, textarea) وكان الاختصار لا يتضمن مفتاح Ctrl/Alt، يجب تجاهله (مثلاً Escape يجب أن يُعالج دائماً، أما F2 قد يُعالج حتى داخل الحقول).

- يجب التحقق من التطابق إلزامياً بين المفاتيح المضغوطة (event.key, event.ctrlKey, event.altKey, event.shiftKey) مع قائمة الاختصارات المسجلة.

- في حالة التطابق، يجب استدعاء event.preventDefault() إلزامياً لمنع سلوك المتصفح الافتراضي (خاصة لاختصارات مثل Ctrl+S وCtrl+P وCtrl+D).

- يجب ربط كل اختصار بمعالج (Handler) للسياق الحالي إلزامياً (مثلاً: إذا كان المستخدم في شاشة الفاتورة، Ctrl+Alt+I يفتح نافذة إضافة صنف. في شاشة أخرى قد لا يفعل شيئاً).

- يجب تقديم قائمة كاملة بالاختصارات النشطة في الشاشة الحالية إلزامياً عبر ضغط F1 أو من قائمة المساعدة.

الجدول النهائي لاختصارات لوحة المفاتيح (معالج ومنقح) – إلزامي:

| الاختصار | السياق (الشاشات) | الوظيفة | معالجة التعارض مع المتصفح |
|---|---|---|---|
| Ctrl + N | جميع شاشات القوائم والمستندات | يجب إنشاء مستند جديد (فاتورة، سند، قيد...) إلزامياً | يُمنع منعاً باتاً السلوك الافتراضي (فتح نافذة جديدة) |
| Ctrl + S | شاشات المستندات (فاتورة، سند...) | يجب حفظ المستند الحالي كمسودة إلزامياً | يُمنع منعاً باتاً حفظ صفحة HTML |
| Ctrl + Enter | شاشات المستندات | يجب حفظ وترحيل المستند الحالي إلزامياً | لا يوجد تعارض، لا يحتاج منع |
| Ctrl + Shift + P | شاشات المستندات والتقارير | يجب فتح نافذة الطباعة المخصصة للمستند إلزامياً | يجب استخدامه بدلاً من Ctrl+P لمنع تعارض طباعة المتصفح |
| Ctrl + D | الجداول وقوائم العناصر | يجب حذف الصف المحدد (مع تأكيد) إلزامياً – فقط للمسودات | يُمنع منعاً باتاً إضافة الصفحة للمفضلة |
| Ctrl + F | جميع الشاشات | يجب فتح شريط البحث السريع الخاص بالصفحة (إن وجد، وإلا يُستخدم بحث المتصفح) | لا يمنع (يُترك للمتصفح كخيار احتياطي) |
| Ctrl + Alt + I | شاشات فواتير البيع/الشراء | يجب فتح نافذة "إضافة صنف" (AddItemModal) إلزامياً | تم اختياره لتجنب تعارض Ctrl+Shift+I (أدوات المطور) |
| Ctrl + Shift + L | جميع شاشات الإدخال | يجب فتح نافذة البحث الموحد (LookupModal) للحقل النشط إلزامياً | لا يوجد تعارض شائع |
| Ctrl + B (أو Ctrl + \) | جميع الشاشات | يجب طي/توسيع القائمة الجانبية إلزامياً | لا يوجد تعارض |
| Escape | النوافذ المنبثقة، الحقول | يجب إغلاق النافذة المنبثقة (Modal/Popover) أو إلغاء التعديل في الحقل إلزامياً | يجب معالجته على مستوى التطبيق أولاً |
| F2 | الجداول | يجب تعديل الصف المحدد (تفعيل وضع Inline Edit) إلزامياً | لا يوجد تعارض |
| F5 | جميع الشاشات | يجب تحديث بيانات الشاشة الحالية (إعادة استدعاء API) إلزامياً | يُمنع منعاً باتاً إعادة تحميل الـ SPA بالكامل |
| Tab / Shift+Tab | جميع الشاشات | يجب التنقل بين الحقول والعناصر التفاعلية إلزامياً | السلوك الافتراضي، لكن يُحسّن ليتوافق مع ترتيب RTL |

تفاصيل إضافية إلزامية لبعض الاختصارات:

- Ctrl + Enter إلزامي: في شاشات الفواتير والسندات، بعد الضغط، يجب ظهور رسالة تأكيد سريعة (أو يتم الترحيل مباشرة إذا كانت جميع الحقول صحيحة ومكتملة). يجب أن يكون هذا اختصار "الترحيل السريع".

- Ctrl + Shift + L إلزامي: يجب ألّا يعمل إلا إذا كان هناك حقل بحث مرتبط بـ LookupModal نشط حالياً (مُظلل). يجب فتح الـ Modal مباشرة إلزامياً دون الحاجة للنقر على الأيقونة.

- F5 إلزامي: بدلاً من إعادة تحميل المتصفح، يجب إبطال ذاكرة التخزين المؤقت لاستعلامات React Query وإعادة جلبها إلزامياً، مما يعطي تأثير التحديث الفوري.

- Ctrl + D إلزامي: يجب ظهور مربع حوار تأكيد إلزامي "هل أنت متأكد من حذف [اسم العنصر]؟". يُمنع منعاً باتاً أن يعمل على المستندات المرحلة أو التي لا تقبل الحذف.

تخصيصات إضافية للشاشات الخاصة – إلزامية:

- في شاشة الفاتورة:

  - Ctrl + Alt + I: يجب فتح AddItemModal، وإذا كان مفتوحاً بالفعل، يجب إغلاقه إلزامياً.

  - Ctrl + Up/Down Arrow: يجب التنقل بين صفوف جدول الأصناف إلزامياً (لأعلى/لأسفل).

  - Ctrl + Delete: يجب حذف صف الصنف المحدد إلزامياً (بدلاً من Ctrl + D إذا كانت هناك حاجة للتفريق، لكن يُفضل توحيد Ctrl + D).

- في شاشة القيد اليومي:

  - Ctrl + Shift + N: يجب إضافة بند جديد في جدول القيد إلزامياً.

- في LookupModal:

  - Arrow Up/Down: يجب التنقل بين نتائج البحث إلزامياً.

  - Enter: يجب اختيار النتيجة المظللة وإغلاق الـ Modal إلزامياً.

قائمة المساعدة والاكتشاف – إلزامية:

- يجب توفير شاشة مخصصة (/help/keyboard-shortcuts) تعرض جميع الاختصارات في جدول منظم إلزامياً، مع إمكانية تصفيتها حسب الشاشة.

- يجب أن يكون الوصول إليها من أي مكان عبر F1 أو من القائمة الجانبية تحت "المساعدة" إلزامياً.

- في كل شاشة، عند الضغط على F1، يجب فتح نافذة تعرض اختصارات تلك الشاشة تحديداً إلزامياً.

اختبار الاختصارات إلزامي:

- يجب التأكد من أن جميع الاختصارات لا تتعارض مع بعضها عبر الشاشات.

- يجب اختبارها إلزامياً أنها تعمل بشكل صحيح مع لوحات المفاتيح العربية والإنجليزية، وفي وضعي RTL/LTR.

- يجب اختبار عدم تداخلها مع اختصارات المتصفح عند الحاجة إلزامياً (مثلاً Ctrl+Shift+P يجب ألّا يفتح نافذة التصفح المتخفي في Chrome، وهذا غالباً لا يتعارض لأن اختصار المتصفح هو Ctrl+Shift+N للتصفح المتخفي، لكن Ctrl+Shift+P يفتح الطباعة في Edge أحياناً – يُمنع منعاً باتاً فتحها).

- يجب اختبار سلوك preventDefault في المتصفحات المستهدفة إلزامياً (Chrome, Firefox, Edge).

عاشراً: نظام التنبيهات والإشعارات الذكي (موسع ومفصل)

الفلسفة والهدف:

يجب أن يكون نظام التنبيهات عقلاً تحليلياً استباقياً إلزامياً يراقب الحالة التشغيلية والمالية للمؤسسة بشكل مستمر. يجب أن يهدف إلزامياً إلى منع المشكلات قبل حدوثها (مثل نفاد المخزون، تجاوز الحد الائتماني، تأخر السداد)، ولفت انتباه المستخدم الفوري للأحداث الحرجة، وتوفير مسار عمل سريع (Actionable Alerts) عبر رابط مباشر من التنبيه إلى الشاشة المعنية. يجب أن ينقسم النظام إلزامياً إلى نوعين: تنبيهات متزامنة (Inline) تظهر أثناء العمل، وتنبيهات غير متزامنة (خلفية) تُفحص دورياً أو بشكل تفاعلي.

مكونات النظام إلزامية:

- المُشغلات (Triggers) إلزامية: أحداث في التطبيق (مثل حفظ فاتورة، حركة مخزون، سند صرف) أو وظائف Cron Jobs.

- مُولّد التنبيهات (Alert Generator) إلزامي: خدمة داخل AlertsModule تستقبل الأحداث وتقرر إنشاء تنبيه أو إشعار.

- قاعدة البيانات إلزامية: جدول alerts للتخزين المركزي للتنبيهات، وجدول notifications لربطها بالمستخدمين.

- النقل المباشر (Transport) إلزامي: WebSocket (Socket.io) لإرسال الإشعارات الفورية إلى واجهة المستخدم.

- الواجهة (UI) إلزامية: أيقونة الجرس في الشريط العلوي، وشاشة مركز الإشعارات، وشريط التنبيهات السفلي أو العلوي في بعض الشاشات.

أولاً: التنبيهات المتزامنة (Inline & On-Submit) – إلزامية:

1. التحقق من المخزون (في فاتورة البيع والتحويل والصرف) إلزامي:

   - الحدث: عند إضافة بند في فاتورة بيع، أو عند الضغط على "حفظ وترحيل".

   - المنطق: إذا كان إعداد allow_negative_stock = false (وهو الافتراضي)، يجب حساب الكمية المطلوبة + أي كميات محجوزة إلزامياً مقابل quantity_balance من آخر حركة للمنتج/المخزن.

   - الإجراء: يجب ظهور رسالة خطأ فورية إلزامياً داخل الشاشة: "الرصيد المتاح لـ [اسم الصنف] هو [X] فقط. الكمية المطلوبة [Y].". يُمنع منعاً باتاً إتمام الترحيل حتى يتم تعديل الكمية أو تغيير المخزن.

   - الاستثناء: صلاحية invoice:allow_negative_stock يجب أن تسمح بالتجاوز، مع تسجيل ذلك في سجل التدقيق كحدث تحذيري إلزامياً.

2. التحقق من الحد الائتماني (في فواتير البيع الآجلة) إلزامي:

   - الحدث: عند اختيار عميل لفاتورة آجلة، وعند الضغط على "حفظ وترحيل".

   - المنطق: current_balance (من customer_balances_view) + invoice_total > customer.credit_limit.

   - الإجراء: يجب ظهور تحذير برتقالي إلزامياً داخل الشاشة: "تنبيه: العميل [اسم العميل] تجاوز الحد الائتماني (الحد: [X]، المستحق: [Y]).". يجب أن يكون المستخدم قادراً على تعديل الفاتورة. إذا حاول الترحيل، يجب منعه وإظهار خطأ. صلاحية invoice:override_credit_limit يجب أن تسمح بالتجاوز، مع تسجيل حدث تدقيقي إلزامياً.

3. التحقق من سعر البيع مقابل التكلفة (في فاتورة البيع) إلزامي:

   - الحدث: عند إضافة بند وتحديد السعر، أو عند الترحيل.

   - المنطق: إذا كان `unit_price  رصيد الحساب النقدي المختار (من account_balances_view).

   - الإجراء: يُمنع منعاً باتاً الترحيل ويجب ظهور خطأ إلزامي: "الرصيد المتاح في [اسم الصندوق/البنك] غير كافٍ. الرصيد: [X].".

   - الاستثناء: صلاحية treasury:allow_overdraft يجب أن تسمح بالتجاوز.

ثانياً: التنبيهات غير المتزامنة (Background & Event-Driven) – إلزامية:

آلية التوليد إلزامية:

- الخدمة: AlertService يجب أن تقدم دوال مثل checkLowStock(), checkOverdueInvoices(), createAlert(type, entity, message, severity) إلزامياً.

- وظائف Cron (Node Schedule) إلزامية:

  - checkOverdueInvoices: يجب أن تعمل يومياً (أو كل ساعة) إلزامياً. يجب أن تستعلم عن الفواتير غير المسددة بالكامل حيث due_date = max_users`، يجب منع الإنشاء.

- الحد من الفواتير الشهرية إلزامي: عداد في Redis أو استعلام عددي (SELECT COUNT(*) FROM sales_invoices WHERE tenant_id=? AND created_at >= start_of_month). إذا تم تجاوز الحد، يجب منع حفظ أي فاتورة جديدة وإرجاع خطأ 402 Payment Required إلزامياً مع رسالة "لقد تجاوزت حد الفواتير الشهرية (الحد: [X]). الرجاء الترقية.".

- Rate Limiting إلزامي: يجب استخدام nestjs-throttler مع تخصيص للمستأجر. يجب أن تحصل الخطط المتقدمة على Limits أعلى إلزامياً.

خامساً: إدارة المستأجر (للمشرف العام) – إلزامية:

- يجب توفير واجهة إدارية خاصة إلزامية (يمكن أن تكون في نفس التطبيق مع صلاحيات super_admin). يجب أن تسمح إلزامياً بـ:

  - عرض جميع المستأجرين وحالاتهم.

  - تعليق/تفعيل أي مستأجر يدوياً.

  - تعديل خطة المستأجر يدوياً.

  - عرض سجل الفواتير والمدفوعات.

- يجب تسجيل هذه الوظائف بالكامل في audit_logs إلزامياً.

سادساً: الفوترة اليدوية وتسجيل المدفوعات (لـ MVP) – إلزامية:

- نظراً لعدم وجود بوابة دفع في MVP، يجب توفير واجهة للمشرف العام إلزامية لتسديد فاتورة المستأجر يدوياً.

- عند الضغط على "تسديد"، يجب تحديث paid_at للفاتورة إلى التاريخ الحالي، وتغيير حالتها إلى paid إلزامياً. إذا كان المستأجر معلقاً، يجب تفعيله تلقائياً إلزامياً إذا كان أقرب اشتراك غير منتهي.

ثاني عشر: الأمان والصلاحيات – RBAC (موسع ومفصل)

الفلسفة والهدف:

يجب توفير نظام أمان متعدد الطبقات إلزامياً يضمن حماية بيانات كل مستأجر من الوصول غير المصرح به (داخلياً أو خارجياً)، مع تحكم دقيق في صلاحيات المستخدمين بناءً على أدوارهم. يجب أن يرتكز إلزامياً على نموذج التحكم بال الوصول القائم على الدور (RBAC) مع إمكانية تخصيص الأدوار، ويجب تطبيقه على مستوى API والواجهة الأمامية. يجب أن يهدف إلزامياً إلى تحقيق عزل تام بين المستأجرين (Tenant Isolation) ومنع أي إجراء غير مصرح به.

أولاً: المصادقة والتخويل (Authentication & Authorization) – إلزامي:

- JWT (Access Token) إلزامي: يجب إصداره عند تسجيل الدخول، صلاحيته 15 دقيقة. يجب أن يحتوي إلزامياً على:

  - sub: userId

  - tenantId: معرف المستأجر

  - permissions: مصفوفة صلاحيات المستخدم (strings مثل invoice:create, report:view)

  - iat, exp

- Refresh Token إلزامي: يجب إصداره مع Access Token، صلاحيته 7 أيام. يجب تخزينه مُجزّأً (hash) إلزامياً في جدول refresh_tokens مع family لتتبع سلسلة التدوير. عند استخدامه لتجديد Access Token، يجب إبطال القديم وإصدار جديد (Rotation) إلزامياً. إذا تم استخدام token مُبطل، يجب إبطال كل العائلة (family) إلزامياً كإجراء أمني ضد سرقة الرمز.

- عملية تسجيل الدخول إلزامية: يجب أن يقدم المستخدم email + password. إذا كانت صحيحة والحساب غير مقفل والمستأجر نشط، يجب إصدار زوج الرموز إلزامياً. يجب تحديث last_login_at إلزامياً. يجب إعادة تعيين failed_login_attempts إلى 0 إلزامياً.

- الحماية من القوة العمياء (Brute Force) إلزامية: بعد 5 محاولات فاشلة، يجب زيادة failed_login_attempts إلزامياً. عند الوصول للحد، يجب تعيين locked_until = now() + 15 minutes إلزامياً. يجب أن تُقابل أي محاولة لاحقة برسالة "الحساب مقفل مؤقتاً" إلزامياً.

ثانياً: الصلاحيات (Permissions) – إلزامية:

- نمط التسمية إلزامي: resource:action. أمثلة إلزامية:

  - invoice:create, invoice:update, invoice:delete, invoice:post, invoice:view, invoice:override_credit_limit, invoice:override_price, invoice:reverse

  - customer:create, customer:update, customer:delete, customer:view

  - report:view, report:export

  - admin:manage_users, admin:manage_roles, admin:view_audit_log

- تجميع الصلاحيات إلزامي: يجب جمع الصلاحيات من كل الأدوار المسندة للمستخدم (عبر user_roles و role_permissions) إلزامياً. يجب تضمين قائمة موحدة (Union) في JWT إلزامياً.

- تطبيق الصلاحيات على الـ API (Backend) إلزامي:

  - يجب أن يتحقق PermissionsGuard إلزامياً من أن المستخدم يملك الصلاحية المطلوبة للمسار (المحددة عبر decorator @Permissions('invoice:post')).

  - إذا لم توجد الصلاحية، يجب إرجاع 403 Forbidden إلزامياً.

- تطبيق الصلاحيات على الواجهة (Frontend) إلزامي:

  - يجب أن يقرأ usePermission hook الصلاحيات إلزامياً من JWT المخزن.

  - يجب إخفاء أو تعطيل الأزرار والقوائم التي لا يملك المستخدم صلاحيتها إلزامياً. هذا للراحة فقط، والأمان الحقيقي في الخادم إلزامي.

ثالثاً: عزل المستأجرين (Tenant Isolation) – إلزامي:

- استخلاص tenantId إلزامي: يجب استخلاصه من JWT في TenantGuard ووضعه في request.tenantId إلزامياً.

- فلترة تلقائية للاستعلامات إلزامية:

  - يجب استخدام ClsService (من nestjs-cls) إلزامياً لتمرير tenantId في سياق الطلب.

  - في جميع استعلامات TypeORM، يجب إضافة شرط WHERE tenant_id = :tenantId تلقائياً إلزامياً عبر Subscriber أو بشكل صريح. يُفضّل الصريح لتجنب المفاجآت. قاعدة صارمة إلزامية: "لا يوجد استعلام بدون فلتر tenant_id".

- Row Level Security (RLS) إلزامي: كطبقة حماية إضافية على قاعدة البيانات. يجب تفعيل RLS إلزامياً على جميع الجداول بسياسة USING (tenant_id = current_setting('app.current_tenant_id')::BIGINT). يجب ضبط app.current_tenant_id في بداية كل جلسة قاعدة بيانات أو معاملة بواسطة التطبيق إلزامياً.

رابعاً: أمان API والواجهة – إلزامي:

- CORS إلزامي: يجب السماح فقط بالنطاقات المصرح بها إلزامياً (نطاقات المستأجرين والنطاق الرئيسي).

- CSRF إلزامي: يجب استخدام X-CSRF-Token إلزامياً في الطلبات من النماذج.

- XSS Prevention إلزامي: يجب تطبيق Content-Security-Policy صارمة إلزامياً، وتجنب dangerouslySetInnerHTML، وتطهير أي HTML مدخل.

- Input Validation إلزامي: يجب استخدام class-validator للـ DTOs مع مجموعات التحقق إلزامياً. يجب رفض أي بيانات إضافية غير معروفة (forbidNonWhitelisted) إلزامياً.

- Rate Limiting إلزامي: يجب تطبيق ThrottlerGuard على جميع نقاط النهاية إلزامياً، مع حدود عامة (100 طلب/دقيقة) وأخرى حسب الخطة.

خامساً: تشفير البيانات الحساسة – إلزامي:

- يجب تشفير البيانات الحساسة المخزنة إلزامياً مثل أرقام الحسابات البنكية (في cash_accounts إن وُجدت) أو أي حقول يحددها المستأجر كحساسة بـ AES-256-GCM على مستوى التطبيق قبل الحفظ في قاعدة البيانات إلزامياً. يجب حفظ مفتاح التشفير في متغيرات البيئة أو خدمة إدارة مفاتيح (KMS) إلزامياً. في MVP، يجب استخدام مفتاح واحد للجميع مع إمكانية تحسينه لاحقاً.

سادساً: أدوار وصلاحيات افتراضية (Seed) – إلزامية:

- مدير النظام (Admin) إلزامي: يجب أن يملك جميع الصلاحيات.

- محاسب إلزامي: صلاحيات كاملة إلزامية على الحسابات والمبيعات والمشتريات والمخزون (عرض)، بدون صلاحيات إدارة المستخدمين أو إعدادات النظام.

- مدير مبيعات إلزامي: صلاحيات إلزامية على العملاء، العروض، الفواتير، التحصيلات، وتقارير المبيعات. يُمنع منعاً باتاً رؤية المشتريات أو الحسابات.

- أمين مخزون إلزامي: صلاحيات كاملة إلزامية على المخزون والأصناف، وعرض فقط للمشتريات والمبيعات.

- مستخدم للقراءة فقط إلزامي: صلاحية view إلزامية على كل الموارد.

ثالث عشر: الأداء وقابلية التوسع (موسع ومفصل)

الهدف:

يجب ضمان إلزامي أن النظام قادر على تلبية متطلبات الأداء المحددة في ظل حجم بيانات واقعي (100 ألف سجل) وعدد متزامن يصل إلى 20 مستخدماً للمستأجر الواحد، مع إمكانية التوسع مستقبلاً إلى آلاف المستأجرين وملايين السجلات دون إعادة هيكلة جوهرية.

أولاً: استراتيجيات قاعدة البيانات – إلزامية:

- الترقيم (Pagination) إلزامي: يجب أن تستخدم جميع قوائم API ترقيم الصفحات القائم على المؤشر (Keyset Pagination) إلزامياً كلما أمكن (مثل WHERE id > :lastId ORDER BY id LIMIT 20). يجب أن يبقى OFFSET متاحاً للصفحات الصغيرة أو عند طلب التنقل العشوائي.

- الاستعلامات الثقيلة والرصيد – إلزامية:

  - stock_movements: يجب اعتماد quantity_balance إلزامياً لجلب رصيد المخزون بأسرع وقت (استعلام ORDER BY id DESC LIMIT 1 مع فهرس على (product_id, warehouse_id, id)). لحماية الرصيد من التضارب، يجب استخدام القفل الاستشاري إلزامياً.

  - account_balances: يجب إنشاء مادة عرض مادية (Materialized View) تُحدّث دورياً كل 5 دقائق إلزامياً باستخدام REFRESH MATERIALIZED VIEW CONCURRENTLY، مما يوفر أداء فائقاً للتقارير. يجب أن يبقى الاستعلام المباشر متاحاً للعمليات الحية التي تحتاج دقة حتى الثانية.

- فهارس محسنة (Indexing) إلزامية:

  - يجب إنشاء فهارس مركبة على (tenant_id, ...) في كل جدول إلزامياً.

  - يجب إنشاء فهارس جزئية (Partial Indexes) إلزامياً لتحسين استعلامات الحالة: CREATE INDEX idx_sales_invoices_draft ON sales_invoices (tenant_id) WHERE status = 'draft'.

  - يجب إنشاء فهارس GIN على أعمدة search_vector إلزامياً للبحث النصي.

- تجنب مشاكل UUID إلزامي: يجب الاعتماد على BigInt PK داخلي إلزامياً لضمان بقاء حجم الفهارس صغيراً وسرعة JOINs عالية. يجب استخدام public_id UUID فقط في التعرض الخارجي.

ثانياً: التخزين المؤقت (Caching) – إلزامي:

- Redis إلزامي:

  - يجب تخزين نتائج استعلامات ثقيلة لا تتغير كثيراً إلزامياً: مثل شجرة دليل الحسابات الكاملة (تخزين مؤقت لمدة 10 دقائق، مع مسح يدوي عند التعديل).

  - يجب تخزين نتائج البحث المباشر (Live Search) إلزامياً لمدة 30 ثانية لتقليل الضغط على PostgreSQL FTS.

  - يجب تخزين إدارة الجلسات إلزامياً.

  - يجب تخزين الأقفال الموزعة إلزامياً.

- HTTP Caching إلزامي: يجب إضافة رؤوس Cache-Control و ETag إلزامياً لاستجابات API التي تطلبها الواجهة بشكل متكرر (مثل قائمة العملات، الفروع). يجب أن يستفيد React Query من هذه الرؤوس تلقائياً إلزامياً.

ثالثاً: تحسينات الواجهة الأمامية – إلزامية:

- تقسيم الكود (Code Splitting) إلزامي: يجب تحميل كل مسار (Route) بشكل كسول (Lazy Loading) إلزامياً باستخدام React.lazy() و Suspense. يجب أن يقلل هذا حجم الحزمة الرئيسية (Bundle Size) بشكل كبير.

- تحسين الصور والأصول إلزامي: يجب استخدام صيغ حديثة (WebP)، تحميل الخطوط محلياً، وتحميل الأيقونات عند الطلب (Tree Shaking من Lucide Icons) إلزامياً.

- Virtualization إلزامي: في الجداول التي قد تحتوي على آلاف الصفوف المعروضة (مثل سجل الحركات)، يجب استخدام مكتبة مثل @tanstack/react-virtual إلزامياً لتحميل وعرض الصفوف الظاهرة فقط في منفذ العرض (Viewport)، مما يحافظ على أداء DOM عالي.

رابعاً: إدارة المعاملات المتزامنة – إلزامية:

- الأقفال الاستشارية (Advisory Locks) إلزامية: يجب أن تكون العمود الفقري لمنع السباق على المخزون إلزامياً. يجب استخدام pg_advisory_xact_lock إلزامياً في CostingService لقفل الجمع بين product_id و warehouse_id، مما يجعل عمليات الصرف لنفس المنتج متسلسلة وآمنة دون قفل الجدول بأكمله.

- مستوى العزل إلزامي: يجب أن يكون المستوى الافتراضي READ COMMITTED كافياً مع الأقفال الصريحة إلزامياً. يجب رفعه إلى REPEATABLE READ أو SERIALIZABLE فقط للعمليات الحرجة جداً إذا لزم الأمر إلزامياً.

خامساً: البنية التحتية والتوسع الأفقي – إلزامي:

- Monolith أولاً إلزامي: في MVP، يجب أن يكون تطبيق NestJS واحد كافياً تماماً إلزامياً. يجب أن يسمح التقسيم إلى وحدات (Modules) لاحقاً بفصل أي وحدة (مثل المخزون أو التقارير) إلى خدمة مصغرة (Microservice) مستقلة إذا تطلب الضغط.

- قاعدة البيانات إلزامية: يجب البدء بخادم PostgreSQL واحد قوي إلزامياً. للتوسع، يجب استخدام النسخ المتماثلة للقراءة (Read Replicas) إلزامياً لتوجيه استعلامات التقارير والقراءة الثقيلة إليها، بينما يبقى الخادم الرئيسي لعمليات الكتابة.

رابع عشر: إعدادات وتوطين النظام (موسع ومفصل)

الهدف:

يجب تقديم نظام مرن إلزامياً يتكيف مع المتطلبات المحلية (اليمن والدول العربية) من حيث اللغة والتقويم والعملة وتنسيق الأرقام، بالإضافة إلى إعدادات تشغيلية تتحكم في سلوك النظام بعمق، دون الحاجة لتغيير الكود. يجب أن تكون كل هذه الإعدادات خاصة بكل مستأجر إلزامياً.

أولاً: اللغة والاتجاه (Language & Direction) – إلزامي:

- اللغة الافتراضية إلزامية: العربية (ar).

- اللغات المدعومة إلزامية: العربية (ar) والإنجليزية (en) في MVP.

- ملفات الترجمة إلزامية: يجب استخدام مكتبة react-i18next إلزامياً مع ملفات JSON منفصلة لكل لغة (ar.json, en.json). يجب أن تغطي مفاتيح الترجمة كل نص في الواجهة (أزرار، تسميات، رسائل خطأ، قوائم) إلزامياً.

- تبديل اللغة إلزامي: يجب أن يكون المستخدم قادراً على تغيير اللغة من قائمة ملفه الشخصي إلزامياً. يجب حفظها في إعدادات المستخدم (users.settings JSONB) إلزامياً. يجب تحميل ملف الترجمة المناسب وتحديث اتجاه الصفحة (dir="rtl" للعربية، dir="ltr" للإنجليزية) إلزامياً.

- RTL/LTR إلزامي: يجب أن يكون التصميم مبنياً على Tailwind CSS مع دعم كامل للاتجاهين إلزامياً. يجب استخدام rtl:... و ltr:... modifiers إلزامياً لضبط الهوامش والحواف حسب الاتجاه. يجب أن تكون المكونات موجهة (Mirror) تلقائياً إلزامياً.

- الخط الأساسي إلزامي: Arial (يجب تضمينه كـ web font أو الاعتماد على خط النظام) إلزامياً. يجب أن يدعم العربية والإنجليزية بشكل ممتاز.

ثانياً: التقويم (Calendar) – إلزامي:

- التخزين إلزامي: يجب تخزين جميع التواريخ في قاعدة البيانات بتنسيق ميلادي (ISO 8601) وبتوقيت UTC إلزامياً. يجب أن يكون هذا هو المرجع الوحيد.

- العرض إلزامي: يجب عرض التواريخ في الواجهة إلزامياً حسب إعدادات المستأجر.

  - الإعداد إلزامي: date_format (ميلادي أو هجري). الافتراضي: ميلادي.

- التقويم الهجري إلزامي: يجب استخدام مكتبة موثوقة إلزامياً (مثل moment-hijri أو @internationalized/date) لتحويل التواريخ من ميلادي إلى هجري (أم القرى) والعكس عند العرض والإدخال.

- مكونات الإدخال (DatePicker) إلزامية: يجب أن تدعم إدخال التاريخ بالميلادي والهجري إلزامياً حسب الإعداد. يجب أن تعرض التقويم الهجري أو الميلادي للاختيار.

ثالثاً: العملات وأسعار الصرف – إلزامي:

- العملة الأساسية إلزامية: يجب تعيينها لكل مستأجر إلزامياً (افتراضياً الريال اليمني YER).

- العملات الإضافية إلزامية: يجب السماح بإضافة عملات أخرى إلزامياً (مثل USD, SAR). لكل عملة، يجب تسجيل سعر صرفها مقابل العملة الأساسية إلزامياً.

- تحديث أسعار الصرف إلزامي: يجب إدخالها يدوياً في exchange_rates إلزامياً (يومياً أو حسب الحاجة). يمكن لاحقاً التكامل مع API خارجي لجلب الأسعار تلقائياً.

- قاعدة الارتداد (Fallback) إلزامية: عند طلب سعر صرف لتاريخ معين ولم يوجد، يجب استخدام آخر سعر متاح إلزامياً (أحدث تاريخ سابق). يجب أن يمنع هذا توقف العمل إذا لم يتم تحديث السعر ليوم عطلة.

- تنسيق الأرقام والعملات إلزامي: يجب أن يعتمد على لغة المستخدم (ar => تنسيق عربي، en => تنسيق غربي) إلزامياً. مثال: 1,234.56 بالإنجليزية، و١٬٢٣٤٫٥٦ بالعربية. يجب استخدام Intl.NumberFormat إلزامياً.

رابعاً: إعدادات عامة للمستأجر (جدول settings) – إلزامية:

- الإعدادات المحاسبية إلزامية:

  - cogs_account_id: حساب تكلفة المبيعات الافتراضي.

  - sales_account_id: حساب المبيعات الافتراضي.

  - inventory_account_id: حساب المخزون الافتراضي.

  - default_customer_cash_account_id: حساب العميل النقدي (للمبيعات النقدية).

  - forex_gain_account_id, forex_loss_account_id: حسابات فروق العملة.

  - discount_before_tax: (boolean) هل الخصم يُحسب قبل الضريبة أم بعدها؟ الافتراضي true.

  - default_tax_config_id: إعداد الضريبة الافتراضي للفواتير.

- الإعدادات المخزنية إلزامية:

  - allow_negative_stock: السماح بالرصيد السالب (بيع بدون رصيد كافٍ). الافتراضي false.

  - cost_method: طريقة تقييم المخزون الافتراضية (حالياً fifo فقط).

- إعدادات الترقيم إلزامية:

  - sequence_by_branch: (boolean) هل الترقيم منفصل لكل فرع؟ الافتراضي false (مركزي).

- معلومات الشركة إلزامية:

  - company_name, company_logo_url, company_address, company_phone, company_email.

  - يجب أن تظهر هذه البيانات إلزامياً في رأس التقارير والفواتير المطبوعة.

خامساً: إعدادات المستخدم الشخصية – إلزامية:

- يجب تخزينها في users.settings (JSONB) إلزامياً. يجب أن تشمل إلزامياً:

  - language: ar أو en.

  - date_format: gregorian أو hijri.

  - default_branch_id, default_warehouse_id: لتعبئة تلقائية في الشاشات.

خامس عشر: سجل العمليات والتدقيق – Audit Trail (موسع ومفصل)

الفلسفة والهدف:

يجب توفير سجل كامل، غير قابل للتلاعب، إلزامياً لكل حدث يؤثر على البيانات المالية والتشغيلية. يجب أن يخدم السجل أغراض الرقابة الداخلية، التدقيق الخارجي، وتتبع أي أخطاء أو تجاوزات إلزامياً. يجب أن يهدف إلزامياً إلى الإجابة على أسئلة: "من فعل ماذا؟ متى؟ ومن أي جهاز؟ وما هي القيم قبل وبعد؟".

أولاً: آلية التسجيل التلقائي – إلزامية:

- يجب التنفيذ عبر TypeORM Subscriber (AuditSubscriber) إلزامياً. يجب الاستماع للأحداث إلزامياً: afterInsert, afterUpdate, afterRemove (أو beforeRemove للقبض على القيم).

- الكيانات الخاضعة للتدقيق إلزامية: يجب خضوع كل الكيانات الهامة التي تمثل مستندات أو بيانات رئيسية إلزامياً:

  - sales_invoices, purchase_invoices, sales_returns, purchase_returns

  - receipts, cheques

  - journal_entries (القيود اليدوية)

  - products, customers, suppliers

  - chart_of_accounts

  - users, roles

- الكيانات المستثناة إلزامياً: يجب استثناء الجداول الناتجة عن الترحيل (stock_movements, cost_layers) إلزامياً، جداول النظام (audit_logs نفسها، notifications، refresh_tokens).

ثانياً: هيكل سجل التدقيق (audit_logs) – إلزامي:

- يجب توفير الحقول إلزامية: id, tenant_id

- user_id: المستخدم الذي قام بالإجراء. إلزامي. (إذا كان الإجراء تلقائياً من النظام، يجب أن يكون user_id = NULL أو مستخدم نظامي خاص).

- action: نوع الإجراء إلزامي:

  - CREATE: إدراج جديد.

  - UPDATE: تعديل (يجب تسجيل القيم القديمة والجديدة إلزامياً).

  - DELETE: حذف منطقي (Soft Delete) أو حذف فعلي نادر.

  - POST: ترحيل مستند (يجب تسجيله كحدث خاص إلزامياً).

  - REVERSE: إلغاء ترحيل أو عكس مستند.

- entity_type: اسم الجدول أو الكيان إلزامي (مثل sales_invoice).

- entity_id: المعرف (id) للكيان المتأثر إلزامي.

- old_values: (JSONB) القيم قبل التغيير إلزامية. في حالة CREATE، تكون NULL.

- new_values: (JSONB) القيم بعد التغيير إلزامية. في حالة DELETE، تكون NULL.

- ip_address: عنوان IP للمستخدم إلزامي.

- user_agent: متصفح المستخدم إلزامي.

- created_at: التاريخ والوقت بدقة إلزامي.

ثالثاً: تفاصيل جمع البيانات – إلزامية:

- في حالة UPDATE إلزامية: يجب أن يقوم الـ Subscriber بمقارنة الكيان قبل التحديث (الموجود في event.databaseEntity) وبعده (event.entity) إلزامياً. يجب تخزين الفروقات فقط لتقليل حجم old_values و new_values إلزامياً، أو تخزين كل الأعمدة للتأريخ الكامل. يجب اختيار تخزين كل الأعمدة المتغيرة في MVP للتبسيط والوضوح إلزامياً.

- في حالة POST/REVERSE إلزامية: لا يوجد كيان واحد، بل سلسلة من الإجراءات. يجب استدعاء AuditService يدوياً إلزامياً بعد الترحيل الناجح لتسجيل حدث من نوع POST مع entity_type و entity_id للمستند الأصلي، وتفاصيل ملخصة عن القيد المنشأ.

- حذف الحقول الحساسة إلزامي: قبل تخزين new_values أو old_values، يجب التأكد من عدم تخزين كلمات المرور أو البيانات شديدة الحساسية إلزامياً. يجب وضع قائمة سوداء (blacklist) للحقول مثل password, password_hash, token إلزامياً.

رابعاً: الوصول إلى سجل التدقيق – إلزامي:

- شاشة المراجعة إلزامية: (/admin/audit-log). يجب توفر واجهة بحث وتصفية متقدمة إلزامياً:

  - فلترة إلزامية حسب: entity_type (نوع المستند)، user_id (المستخدم)، action (نوع الإجراء)، نطاق زمني، و entity_id (رقم المستند).

  - يجب العرض في جدول زمني إلزامياً. عند النقر على صف، يجب توفير إمكانية توسيعه لعرض old_values و new_values بشكل مقروء (JSON Viewer).

- الصلاحية إلزامية: admin:view_audit_log فقط للأدوار الإدارية.

- الاحتفاظ والأرشفة إلزامية: يُمنع منعاً باتاً حذف سجلات التدقيق أبداً إلزامياً. للحفاظ على أداء الجدول، يجب وضع سياسة أرشفة إلزامية: مثلاً، نقل السجلات الأقدم من سنتين إلى جدول audit_logs_archive.

خامساً: أثر التدقيق على الأداء – إلزامي:

- يجب أن تتم عملية الكتابة في audit_logs ضمن نفس معاملة الإجراء الأصلي إلزاماً لضمان الاتساق. يجب ألّا يضيف هذا سوى وقت ضئيل للكتابة، وهو مقبول تماماً للفوائد الرقابية.

- يجب أن تعتمد الاستعلامات على سجل التدقيق على فهارس (tenant_id, entity_type, entity_id) و (tenant_id, created_at) إلزامياً لضمان السرعة.

سادس عشر: أدوات التطوير والنشر – DevOps (موسع ومفصل)

الهدف:

يجب توفير بيئة تطوير موحدة، وخط أنابيب (Pipeline) يضمن جودة الكود وسلامة البناء، ونشر آلي وموثوق لتقليل الأخطاء البشرية وتسريع وصول الميزات للمستخدمين إلزامياً.

أولاً: بيئة التطوير المحلية (Local Dev) – إلزامية:

- Docker Compose إلزامي: يجب توفير ملف docker-compose.yml في جذر المشروع إلزامياً يُشغّل:

  - api: تطبيق NestJS مع تفعيل Hot Reload إلزامي (عبر volumes لمزامنة الكود).

  - web: خادم Vite للتطوير مع Hot Module Replacement إلزامي.

  - postgres: قاعدة بيانات PostgreSQL 15 إلزامية.

  - redis: خادم Redis إلزامي.

- إدارة الحزم إلزامية: Monorepo باستخدام npm workspaces أو Turborepo إلزامي. المجلدات: /apps/api, /apps/web, /packages/shared.

- متغيرات البيئة إلزامية: ملف .env خاص بكل بيئة إلزامي، ويجب ألّا يتم تضمينه في Git إلزامياً. يجب توفر .env.example للمرجع إلزامياً.

ثانياً: إدارة مخطط قاعدة البيانات (Migrations) – إلزامية:

- يجب استخدام TypeORM Migrations بشكل صارم إلزامياً.

- أثناء التطوير إلزامي: يجب السماح باستخدام synchronize: true (فقط في بيئة التطوير) إلزامياً لتحديث المخطط تلقائياً.

- قبل الإصدار إلزامي: يجب أن يقابل كل تغيير في الـ Entities ملف Migration إلزامياً يتم توليده تلقائياً عبر typeorm migration:generate -n ، ثم يراجع يدوياً إلزامياً.

- في الإنتاج إلزامي: يجب تشغيل الـ Migrations تلقائياً إلزامياً كجزء من عملية النشر (npm run migration:run). يُمنع منعاً باتاً استخدام synchronize في الإنتاج.

ثالثاً: اختبار الكود (Testing) – إلزامي:

- اختبارات الوحدة (Unit Tests) إلزامية: باستخدام Jest إلزامي. يجب تغطية الخدمات الحيوية إلزامية (AccountingService, CostingService, DocumentNumberingService) بشكل مكثف.

- اختبارات التكامل (e2e Tests) إلزامية: باستخدام Supertest إلزامي لاختبار نقاط نهاية API الرئيسية (إنشاء فاتورة وترحيلها والتحقق من القيد).

- اختبارات الواجهة (اختياري): يمكن إضافتها باستخدام React Testing Library.

- التغطية (Coverage) إلزامية: خط أساسي 70% كهدف أولي إلزامي.

رابعاً: CI/CD Pipeline (GitHub Actions) – إلزامي:

- المشغلات إلزامية: Push و Pull Requests على فروع main و develop.

- خطوات خط الأنابيب (Workflow) إلزامية:

  1. Checkout إلزامي: يجب سحب الكود.

  2. Setup إلزامي: يجب تثبيت Node.js، PostgreSQL، Redis (للاستخدام في الاختبارات).

  3. Install إلزامي: يجب تشغيل npm ci.

  4. Lint إلزامي: يجب تشغيل eslint و prettier إلزامياً للتحقق من جودة الكود.

  5. Test إلزامي: يجب تشغيل اختبارات الوحدة والتكامل إلزامياً.

  6. Build إلزامي: يجب بناء تطبيق NestJS (npm run build) وتطبيق React (npm run build لإنتاج static files) إلزامياً.

  7. Build Docker Images إلزامي: يجب بناء صور Docker للـ API و Web (Nginx يخدم الـ static files) ودفعها إلى Docker Registry (مثل Docker Hub أو GitLab Registry) إلزامياً.

  8. Deploy إلزامي: (للفرع main فقط) يجب تحديث خدمة Kubernetes (K3s) في بيئة الإنتاج باستخدام kubectl set image إلزامياً.

خامساً: النشر والإنتاج (Deployment) – إلزامي:

- التنسيق إلزامي: Kubernetes (K3s) خفيف الوزن إلزامي.

- الخدمات داخل الكتلة (Cluster) إلزامية:

  - api-deployment: يجب تشغيل عدة نسخ (Replicas) من تطبيق NestJS إلزامياً. يجب اكتشافها عبر Service (ClusterIP).

  - web-deployment: يجب تشغيل Nginx إلزامياً يخدم ملفات React الثابتة، مع تكوين Reverse Proxy إلزامي لطلبات /api إلى خدمة الـ API.

  - postgres-statefulset: لإدارة قاعدة البيانات إلزامياً، مع Persistent Volume للنسخ الاحتياطية.

  - redis-deployment إلزامي.

- الدخول (Ingress) إلزامي: يجب تشغيل Nginx Ingress Controller إلزامياً يوجه النطاقات (مثل *.sharaf-erp.com) إلى الخدمات المناسبة، مع إنهاء TLS إلزامي.

- النسخ الاحتياطي والاستعادة إلزامي:

  - يجب تشغيل pg_dump مجدول يومياً إلزامياً (CronJob داخل K3s) لنسخة كاملة.

  - يجب تفعيل WAL Archiving في PostgreSQL إلزامياً مع أداة مثل pgBackRest أو WAL-G لعمل نسخ احتياطي مستمر (Point-in-Time Recovery).

- المراقبة (Monitoring) إلزامية: أساسي عبر kubectl top و logs إلزامياً. يمكن إضافة Prometheus + Grafana للمراقبة المتقدمة لاحقاً.

سابع عشر: المساعد الذكي "شرف AI" (موسع ومفصل)

الفلسفة والهدف:

يجب أن يكون "شرف AI" مساعداً ذكياً داخل التطبيق إلزامياً يُحدث نقلة نوعية في تفاعل المستخدم مع النظام. بدلاً من التنقل بين الشاشات والتقارير، يجب أن يستطيع المستخدم (خاصة المدراء التنفيذيين والمحاسبين) توجيه أسئلته باللغة العربية الفصحى أو العامية اليمنية، والحصول على إجابات فورية مدعومة ببيانات حية من قاعدة البيانات إلزامياً. يجب أن يكون بمثابة "مُحلّل بيانات فوري" وليس مجرد شات بوت إلزامياً. يجب أن يركز حصراً على الاستعلامات القرائية ولا يُنفذ أي عمليات كتابة إلزامياً.

أولاً: واجهة المستخدم – إلزامية:

- الوصول إلزامي: يجب توفير أيقونة المساعد في الشريط العلوي (بجانب الجرس)، أو صفحة مستقلة /ai-assistant إلزامياً.

- التصميم إلزامي: يجب توفير نافذة محادثة (Chat Panel) تنسدل من أسفل اليمين (أو تظهر كصفحة كاملة على الجوال) إلزامياً. يجب أن يكون التصميم RTL إلزامياً.

- سجل المحادثة إلزامي: يجب توفير فقاعات نصية إلزامياً، أسئلة المستخدم على اليمين، إجابات المساعد على اليسار. يجب أن تدعم الإجابات تنسيق Markdown البسيط إلزامياً (جداول، قوائم، خط عريض).

- الإجراءات السريعة (Quick Actions) إلزامية: يجب توفير أزرار لأسئلة مقترحة إلزامياً أسفل حقل الإدخال مثل "مبيعات اليوم"، "أصناف أقل من الحد الأدنى"، "فواتير متأخرة". يجب أن تضغط مرة واحدة لإرسال السؤال إلزامياً.

- حقل الإدخال إلزامي: يجب أن يدعم الكتابة الحرة، ويجب أن يدعم الصوت (Speech-to-Text) عبر Web Speech API إلزامياً.

ثانياً: آلية العمل (Backend - AiService) – إلزامية:

1. استقبال النص إلزامي: يجب توفير POST /api/ai/query مع { "query": "نص السؤال" } إلزامياً.

2. تحليل النية (Intent Detection) إلزامي: يُمنع الاعتماد على شبكة عصبية معقدة في MVP إلزامياً، بل يجب أن يعتمد على نظام هجين من Regex وقواعد محددة مسبقاً، مصمم خصيصاً إلزامياً للأسئلة المحاسبية والإدارية الشائعة بالعربية والعامية اليمنية. أمثلة إلزامية:

   - stock_check: "كم رصيد [صنف]؟"، "رصيد [صنف] في [مخزن]؟"، "وش باقي من [صنف]؟"

   - customer_balance: "كم رصيد [عميل]؟"، "فلوس [عميل] علينا؟"

   - sales_today: "مبيعات اليوم"، "وش بعنا اليوم؟"، "إجمالي فواتير اليوم"

   - low_stock: "أصناف ناقصة"، "وش الأصناف اللي وصلت حد الطلب؟"

   - overdue_invoices: "فواتير متأخرة"، "ناس ما سددوا"

   - profit_today: "ربح اليوم"

3. استخراج الكيانات (Entity Extraction) إلزامي: يجب أن يتم إلزامياً باستخدام البحث النصي (FTS) في جداول products, customers, warehouses، ويجب أن يقوم النظام بمطابقة أجزاء من النص مع أسماء الكيانات إلزامياً. مثلاً "سكر ناعم" -> product.id = 123. يجب استخدام أسلوب ts_rank إلزامياً لاختيار أفضل تطابق.

4. بناء الاستعلام (Query Building) إلزامي: بمجرد معرفة النية والكيانات، يجب ترجمتها إلى استعلام SQL ذو معاملات (Parameterized) أو استدعاء دالة داخلية إلزامياً. يُمنع منعاً باتاً توليد SQL من النص الخام.

5. تنفيذ الاستعلام وجلب البيانات إلزامي: من قاعدة البيانات للقراءة فقط إلزامياً.

6. توليد الرد (Response Generation) إلزامي: يجب أن يتم باستخدام قوالب نصية معبّأة بالبيانات إلزامياً. مثال: "الرصيد الحالي لـ سكر ناعم في مخزن الرئيسي هو 150 كيلو جرام." يجب إضافة رابط "عرض التفاصيل" إلزامياً الذي يفتح الشاشة المختصة (action_url).

ثالثاً: نطاق الأسئلة المدعومة (MVP) – إلزامي:

- يجب دعم رصيد صنف إلزامياً (الإجمالي أو في مخزن محدد).

- يجب دعم رصيد عميل أو مورد إلزامياً.

- يجب دعم مبيعات اليوم إلزامياً (الإجمالي وعدد الفواتير).

- يجب دعم مشتريات اليوم إلزامياً.

- يجب دعم أرباح اليوم التقديرية إلزامياً.

- يجب دعم أفضل 5 منتجات مبيعاً اليوم إلزامياً.

- يجب دعم فواتير متأخرة إلزامياً (عدد وقائمة مختصرة).

- يجب دعم شيكات مستحقة اليوم إلزامياً.

- يجب دعم أصناف منخفضة المخزون إلزامياً.

رابعاً: الأمان والخصوصية – إلزامي:

- يجب أن يعمل المساعد ضمن سياق المستأجر للمستخدم إلزامياً (الـ tenantId يمرر تلقائياً).

- يُمنع منعاً باتاً الوصول لأي بيانات خارج نطاق صلاحيات المستخدم (يجب التحقق من الصلاحيات حتى للاستعلامات القرائية).

- يجب تسجيل كل استفسار في سجل التدقيق إلزامياً مع المستخدم والنص الكامل للاستفسار، للرقابة ولمنع إساءة الاستخدام.

خامساً: القيود والتوسع المستقبلي – إلزامي:

- يُمنع فهم الأسئلة المركبة جداً أو السياقية العميقة في MVP إلزامياً.

- يُمنع المقارنة بين فترات ("مبيعات الشهر هذا مقارنة بالشهر الماضي") بسهولة، لكن يجب إضافة نوايا جديدة بشكل دوري.

- في المرحلة الثالثة، يجب استبدال المحرك القاعدي بنموذج LLM مدرب أو مضمَّن إلزامياً، مع الحفاظ على مبدأ "عدم تنفيذ أوامر كتابة".

ثامن عشر: المخرجات النهائية للمرحلة الأولى (موسع ومفصل)

عند الانتهاء من تطوير المرحلة الأولى (MVP)، يجب أن يكون التسليم النهائي عبارة عن حزمة متكاملة تشمل كل ما يلي، وتكون قابلة للاختبار بشكل مستقل إلزامياً:

1. الكود المصدري الكامل (Monorepo) إلزامي:

   - تطبيق NestJS الخلفي (/apps/api) مع جميع الوحدات المذكورة إلزامياً.

   - تطبيق React الأمامي (/apps/web) مع جميع الشاشات والمكونات إلزامياً.

   - مكتبة الأنواع المشتركة (/packages/shared) إلزامية.

   - يجب أن يكون الكود نظيفاً، خالياً من تحذيرات TypeScript، ومعلقاً عليه في الأجزاء المعقدة إلزامياً.

2. قاعدة البيانات إلزامية:

   - ملفات الـ Migrations التي تُنشئ جميع الجداول (60+) والفهارس وطرق العرض المادية إلزامياً.

   - سكريبتات Seed Data لإنشاء الخطط الافتراضية، أدوار النظام، وبيانات المستأجر التجريبي إلزامية.

3. واجهة المستخدم إلزامية:

   - يجب أن تكون جميع الشاشات المذكورة في الفصل الثامن (القائمة الجانبية) مبنية وجاهزة للاستخدام، ومتصلة بـ API إلزامياً.

   - يجب توفير دعم كامل إلزامي للغة العربية (RTL) والإنجليزية (LTR).

   - يجب أن تكون تجربة مستخدم سريعة ومتجاوبة إلزامياً (Desktop + Mobile Web).

4. REST API إلزامي:

   - يجب توثيق جميع نقاط النهاية بالكامل عبر Swagger إلزامياً على /api/docs.

   - يجب أن يعمل نظام المصادقة (JWT + Refresh Token) إلزامياً.

   - يجب تفعيل نظام الصلاحيات (RBAC) على جميع نقاط النهاية إلزامياً.

5. المحرك المحاسبي إلزامي:

   - يجب ترحيل تلقائي لجميع أنواع المستندات إلزامياً (مبيعات، مشتريات، مرتجعات، سندات، جرد، قيود افتتاحية).

   - يجب أن تعمل آلية FIFO لتقييم المخزون بشكل صحيح إلزامياً.

   - يجب إنشاء قيود يومية صحيحة ودقيقة 100% إلزامياً.

   - يجب أن يعمل إلغاء الترحيل (Reverse) بشكل كامل إلزامياً.

6. التقارير المالية الأساسية إلزامية:

   - ميزان مراجعة (متوازن) إلزامي.

   - قائمة الدخل إلزامية.

   - الميزانية العمومية إلزامية.

   - الأستاذ العام والمساعد إلزامي.

   - أعمار الديون إلزامية.

   - التقارير التشغيلية (مبيعات، مشتريات، مخزون) إلزامية.

7. منصة SaaS إلزامية:

   - يجب توفير تسجيل ذاتي وإنشاء مستأجر جديد ببيانات أولية جاهزة إلزامياً.

   - يجب توفير نظام خطط واشتراكات (يدوي في MVP) إلزامياً.

   - يجب توفير تعليق تلقائي عند عدم السداد إلزامياً.

8. نظام التنبيهات إلزامي:

   - يجب توفير تنبيهات متزامنة (داخل الشاشات) إلزامية.

   - يجب توفير تنبيهات غير متزامنة (مخزون، فواتير، شيكات) إلزامية.

   - يجب توفير إشعارات داخل التطبيق عبر WebSocket إلزامية.

9. سجل التدقيق (Audit Trail) إلزامي:

   - يجب تسجيل تلقائي لجميع العمليات على الكيانات الهامة إلزامياً.

10. المساعد الذكي إلزامي:

    - يجب توفير مساعد "شرف AI" بواجهة محادثة إلزامياً، يجيب على مجموعة محددة من الاستفسارات.

11. البنية التحتية للنشر إلزامية:

    - يجب توفير ملفات Dockerfiles و Docker Compose إلزامية.

    - يجب توفير ملفات Kubernetes (YAML) إلزامية.

    - يجب توفير سكريبتات CI/CD (GitHub Actions) إلزامية.

12. التوثيق إلزامي:

    - يجب توفير دليل المستخدم (PDF أو Wiki) إلزامي.

    - يجب توفير دليل المطور (README مع تعليمات الإعداد والتشغيل) إلزامي.

    - يجب توفير قائمة اختصارات لوحة المفاتيح إلزامية.

تاسع عشر: الممنوعات بشكل قاطع (موسع ومفصل)

تمثل هذه القائمة "الخطوط الحمراء" التي يجب ألّا يجوز تجاوزها إلزامياً خلال تطوير المرحلة الأولى. يجب اعتبار أي خرق لها خطأً من الدرجة الأولى (P0) ويجب إصلاحه فوراً إلزامياً.

أولاً: ممنوعات تتعلق بالترقيم وهوية المستندات – يُمنع منعاً باتاً:

1. يُمنع منعاً باتاً استخدام أي بادئات (Prefixes) أو لاحقات (Suffixes) في الترقيم: يجب أن تكون الأرقام أعداداً صحيحة خالصة إلزامياً (1, 2, 3...) في document_sequences وفي واجهة المستخدم. يجب ألّا يُسمح بـ "INV-0001" ولا "SL/2024/001". يجب ألّا يعترف النظام إلا بالرقم الصحيح.

2. يُمنع منعاً باتاً إعادة استخدام رقم مستند تم إلغاؤه أو حذفه: حتى لو تم حذف مستند (Soft Delete) أو إلغاؤه، يجب أن يبقى رقمه محجوزاً إلزامياً ولا يُسند لمستند جديد.

ثانياً: ممنوعات تتعلق بسلامة البيانات المالية والمخزنية – يُمنع منعاً باتاً:

3. يُمنع منعاً باتاً التعديل المباشر على أي رصيد (حساب أو مخزون) خارج إطار القيود والحركات: يُمنع منعاً باتاً لأي مستخدم أو عملية (حتى عبر API أو SQL مباشرة) تعديل رصيد حساب في chart_of_accounts أو كمية مخزون دون إنشاء journal_entry أو stock_movement يوثق السبب إلزامياً. جداول الأرصدة المنفصلة غير موجودة أساساً، ويجب أن تحسب الفيوزات الأرصدة من مصادرها إلزامياً.

4. يُمنع منعاً باتاً الحذف الفعلي (Hard Delete) لأي مستند مالي أو مخزني تم ترحيله: يجب ألّا يكون أي مستند بحالة posted قابلاً للحذف إلزامياً. لإلغاء أثره، يجب استخدام آلية العكس (Reverse) إلزامياً التي تنشئ مستند إلغاء وتُبقي على السجل الأصلي للتدقيق.

ثالثاً: ممنوعات تتعلق بتجربة المستخدم والواجهة – يُمنع منعاً باتاً:

5. يُمنع منعاً باتاً استخدام القوائم المنسدلة (Dropdown/Select) لعرض أكثر من 50 خياراً: في هذه الحالة، يجب استخدام مكون LookupModal الموحد المزود بالبحث النصي (FTS) والترقيم إلزامياً. يجب أن ينطبق هذا إلزامياً على اختيار العملاء، الموردين، الأصناف، الحسابات، إلخ.

6. يُمنع منعاً باتاً فتح نافذة منبثقة (Modal) فوق نافذة منبثقة أخرى: يجب ألّا يُسمح بذلك إلزامياً. يجب التعامل مع الاحتياجات الفرعية داخل النافذة الرئيسية عبر الأقسام المنبثقة (Popovers) أو التوسيع الديناميكي للمحتوى (كما في AddItemModal) إلزامياً.

7. يُمنع منعاً باتاً حفظ أي مستند مالي دون تحقق من توازن القيد (إن كان قيداً يدوياً) أو من وجود بنود (للفواتير والسندات): يجب ألّا توجد فاتورة فارغة أبداً.

رابعاً: ممنوعات تتعلق بالبنية التقنية والأداء – يُمنع منعاً باتاً:

8. يُمنع منعاً باتاً استخدام Elasticsearch أو أي محرك بحث خارجي في MVP: يجب أن تعتمد جميع عمليات البحث على PostgreSQL Full-TextSearch إلزامياً. يجب أن يُبسط هذا البنية ويُقلل نقاط الفشل.

9. يُمنع منعاً باتاً استخدام Change Data Capture (CDC) أو أدوات تحليل بيانات خارجية (مثل Debezium) في MVP.

10. يُمنع منعاً باتاً استخدام PostGIS أو أي إضافة جغرافية في MVP.

11. يُمنع منعاً باتاً تشغيل أي عملية كتابة على قاعدة البيانات خارج سياق المعاملة (Transaction): يجب أن تكون كل عملية تؤثر على أكثر من جدول (مثل الترحيل) Atomic إلزامياً.

خامساً: ممنوعات تتعلق بنطاق المشروع (Scope Creep) – يُمنع منعاً باتاً:

12. يُمنع منعاً باتاً تطوير أي ميزة تنتمي للمرحلة الثانية أو الثالثة: يجب ألّا يتم تطوير التصنيع، الأصول الثابتة، الموارد البشرية، سير الموافقات المرئي، أو تطبيق الجوال الأصلي إلزامياً. يجب أن يقتصر التركيز على MVP كما هو موصوف إلزامياً.

13. يُمنع منعاً باتاً إضافة حقول أو جداول غير مذكورة في هذه الوثيقة أو تم الاتفاق عليها إلا بعد مراجعة تأثيرها على النطاق والجدول الزمني إلزامياً.

سادساً: ممنوعات تتعلق بجودة الكود – يُمنع منعاً باتاً:

14. يُمنع منعاً باتاً استخدام any بشكل مفرط في TypeScript: يجب أن يكون الكود خاضعاً للأنواع (Strict Typing) إلزامياً لضمان استقراره وسهولة صيانته. يجب ألّا يُسمح باستخدام any إلا عند التعامل مع مكتبات خارجية غير متوافقة تماماً، مع تعليق يوضح السبب إلزامياً.

15. يُمنع منعاً باتاً إغفال كتابة الاختبارات (Tests) للخدمات المحاسبية والمخزنية الأساسية: يجب أن تكون هذه الخدمات الحساسة مغطاة باختبارات وحدة (Unit Tests) إلزامياً لضمان عدم انهيار المنطق المحاسبي مع أي تعديل.

خاتمة الموجه:

هذا الموجه إلزامي حرفي لكل بند من بنوده، ولا يجوز حذف أو دمج أو تلخيص أي جزء منه. يجب الالتزام بالفصل بين العناصر التقنية (أسماء، أرقام، جداول، أكواد، مسارات، اختصارات، قيم CHECK) – التي يجب الحفاظ عليها حرفياً بدون أي تعديل – والنبرة الإنشائية الوصفية – التي يجب تحويلها إلى صيغ إلزامية قاطعة باستخدام "يجب / إلزامي / يُمنع منعاً باتاً" فقط.



نتائج التحقق النهائية قبل التسليم:

| البند | الناتج | الحالة |
|---|---|---|
| عدد الأقسام المرقّمة (أولاً…تاسع عشر) | 19 | ✅ |
| عدد الجداول في رابعاً | 60 | ✅ |
| عدد نقاط الممنوعات (تاسع عشر) | 15 | ✅ |
| حجم الملف | 199.64 KB | ✅ |
| رفع الملف في هذه الجلسة | https://www.genspark.ai/api/files/s/Qi96OQ34 | ✅ |

📥 تحميل الملف الكامل SHARAF_ERP_STRICT_FINAL.md