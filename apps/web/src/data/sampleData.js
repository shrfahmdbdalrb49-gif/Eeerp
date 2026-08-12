/**
 * بيانات تجريبية (Demo Data) لنظام شرف ERP
 * مستخرجة من نسخة script.js القديمة — تم إصلاح علامات التنصيص
 * وتُستخدم لتجربة الواجهات قبل ربط قاعدة البيانات الحقيقية.
 */

// ===== الأصناف / الأدوية (20 دواء) =====
export const sampleDrugs = [
  { code: 'DRG-001', name: 'بنادول 500mg', scientific: 'Paracetamol', barcode: '6281234567890', category: 'مسكنات', unit: 'علبة', buyPrice: 800, sellPrice: 1500, stock: 150, minStock: 20, expiry: '2025-08-15', prescription: false, status: 'active' },
  { code: 'DRG-002', name: 'أموكسيسيلين 500mg', scientific: 'Amoxicillin', barcode: '6281234567891', category: 'مضادات حيوية', unit: 'علبة', buyPrice: 1500, sellPrice: 2500, stock: 80, minStock: 15, expiry: '2025-06-20', prescription: true, status: 'active' },
  { code: 'DRG-003', name: 'بروفين 400mg', scientific: 'Ibuprofen', barcode: '6281234567892', category: 'مسكنات', unit: 'علبة', buyPrice: 1200, sellPrice: 2000, stock: 200, minStock: 25, expiry: '2025-12-01', prescription: false, status: 'active' },
  { code: 'DRG-004', name: 'فلاجيل 500mg', scientific: 'Metronidazole', barcode: '6281234567893', category: 'مضادات حيوية', unit: 'علبة', buyPrice: 1000, sellPrice: 1800, stock: 60, minStock: 10, expiry: '2025-04-10', prescription: true, status: 'active' },
  { code: 'DRG-005', name: 'زيرتك 10mg', scientific: 'Cetirizine', barcode: '6281234567894', category: 'أخرى', unit: 'علبة', buyPrice: 1800, sellPrice: 3000, stock: 45, minStock: 10, expiry: '2025-09-30', prescription: false, status: 'active' },
  { code: 'DRG-006', name: 'كونكور 5mg', scientific: 'Bisoprolol', barcode: '6281234567895', category: 'أمراض مزمنة', unit: 'علبة', buyPrice: 2500, sellPrice: 4500, stock: 30, minStock: 10, expiry: '2025-11-15', prescription: true, status: 'active' },
  { code: 'DRG-007', name: 'جلوكوفاج 850mg', scientific: 'Metformin', barcode: '6281234567896', category: 'أمراض مزمنة', unit: 'علبة', buyPrice: 2000, sellPrice: 3500, stock: 90, minStock: 15, expiry: '2025-10-20', prescription: true, status: 'active' },
  { code: 'DRG-008', name: 'أوميبرازول 20mg', scientific: 'Omeprazole', barcode: '6281234567897', category: 'أخرى', unit: 'علبة', buyPrice: 1300, sellPrice: 2200, stock: 120, minStock: 20, expiry: '2025-07-25', prescription: false, status: 'active' },
  { code: 'DRG-009', name: 'فيتامين D3 1000IU', scientific: 'Cholecalciferol', barcode: '6281234567898', category: 'فيتامينات', unit: 'علبة', buyPrice: 3000, sellPrice: 5000, stock: 55, minStock: 10, expiry: '2026-03-15', prescription: false, status: 'active' },
  { code: 'DRG-010', name: 'سيتال 500mg', scientific: 'Paracetamol', barcode: '6281234567899', category: 'مسكنات', unit: 'شريط', buyPrice: 200, sellPrice: 500, stock: 300, minStock: 50, expiry: '2025-08-30', prescription: false, status: 'active' },
  { code: 'DRG-011', name: 'أوجمنتين 625mg', scientific: 'Amoxicillin+Clavulanate', barcode: '6281234567900', category: 'مضادات حيوية', unit: 'علبة', buyPrice: 3500, sellPrice: 5500, stock: 25, minStock: 10, expiry: '2025-05-18', prescription: true, status: 'active' },
  { code: 'DRG-012', name: 'ليبيتر 20mg', scientific: 'Atorvastatin', barcode: '6281234567901', category: 'أمراض مزمنة', unit: 'علبة', buyPrice: 4000, sellPrice: 6500, stock: 8, minStock: 10, expiry: '2025-09-10', prescription: true, status: 'active' },
  { code: 'DRG-013', name: 'نكسيوم 40mg', scientific: 'Esomeprazole', barcode: '6281234567902', category: 'أخرى', unit: 'علبة', buyPrice: 5000, sellPrice: 8000, stock: 15, minStock: 5, expiry: '2025-12-20', prescription: true, status: 'active' },
  { code: 'DRG-014', name: 'فولتارين 50mg', scientific: 'Diclofenac', barcode: '6281234567903', category: 'مسكنات', unit: 'علبة', buyPrice: 1500, sellPrice: 2800, stock: 0, minStock: 15, expiry: '2025-06-30', prescription: false, status: 'active' },
  { code: 'DRG-015', name: 'شراب برونكikum', scientific: 'Bronchicum Syrup', barcode: '6281234567904', category: 'أخرى', unit: 'علبة', buyPrice: 2500, sellPrice: 4000, stock: 3, minStock: 8, expiry: '2025-03-25', prescription: false, status: 'active' },
  { code: 'DRG-016', name: 'أسبرين 100mg', scientific: 'Acetylsalicylic Acid', barcode: '6281234567905', category: 'أمراض مزمنة', unit: 'علبة', buyPrice: 500, sellPrice: 1000, stock: 250, minStock: 30, expiry: '2026-01-15', prescription: false, status: 'active' },
  { code: 'DRG-017', name: 'زنك 50mg', scientific: 'Zinc Sulfate', barcode: '6281234567906', category: 'فيتامينات', unit: 'علبة', buyPrice: 800, sellPrice: 1500, stock: 70, minStock: 15, expiry: '2026-06-20', prescription: false, status: 'active' },
  { code: 'DRG-018', name: 'سبراكس 200mg', scientific: 'Cefixime', barcode: '6281234567907', category: 'مضادات حيوية', unit: 'علبة', buyPrice: 2800, sellPrice: 4500, stock: 12, minStock: 8, expiry: '2025-07-10', prescription: true, status: 'active' },
  { code: 'DRG-019', name: 'إندرال 40mg', scientific: 'Propranolol', barcode: '6281234567908', category: 'أمراض مزمنة', unit: 'علبة', buyPrice: 600, sellPrice: 1200, stock: 180, minStock: 20, expiry: '2025-11-30', prescription: true, status: 'active' },
  { code: 'DRG-020', name: 'ملتي فيتامين', scientific: 'Multivitamin', barcode: '6281234567909', category: 'فيتامينات', unit: 'علبة', buyPrice: 4500, sellPrice: 7500, stock: 5, minStock: 10, expiry: '2025-04-05', prescription: false, status: 'active' },
]

// ===== المرضى / العملاء =====
export const patientsDatabase = [
  { code: 'PAT-001', name: 'أحمد محمد علي', phone: '777123456', insurance: 'بدون تأمين', balance: 0, visits: 12 },
  { code: 'PAT-002', name: 'فاطمة عبدالله حسن', phone: '777234567', insurance: 'شركة التأمين الوطنية', balance: 5000, visits: 8 },
  { code: 'PAT-003', name: 'محمد سالم أحمد', phone: '777345678', insurance: 'بدون تأمين', balance: 0, visits: 25 },
  { code: 'PAT-004', name: 'عائشة يوسف إبراهيم', phone: '777456789', insurance: 'شركة سبأ للتأمين', balance: 12000, visits: 5 },
  { code: 'PAT-005', name: 'علي حسين محمد', phone: '777567890', insurance: 'بدون تأمين', balance: 3000, visits: 15 },
  { code: 'PAT-006', name: 'مريم عبدالرحمن', phone: '777678901', insurance: 'شركة التأمين الوطنية', balance: 0, visits: 3 },
  { code: 'PAT-007', name: 'خالد عمر سعيد', phone: '777789012', insurance: 'بدون تأمين', balance: 8500, visits: 20 },
  { code: 'PAT-008', name: 'نورة أحمد صالح', phone: '777890123', insurance: 'شركة سبأ للتأمين', balance: 0, visits: 7 },
]

// ===== الأطباء =====
export const doctorsDatabase = [
  { code: 'DOC-001', name: 'د. عبدالكريم الشميري', specialty: 'باطنية', phone: '771111111', license: 'MED-2019-001' },
  { code: 'DOC-002', name: 'د. سمية المقطري', specialty: 'أطفال', phone: '771222222', license: 'MED-2020-045' },
  { code: 'DOC-003', name: 'د. فيصل الحيمي', specialty: 'قلب', phone: '771333333', license: 'MED-2018-012' },
  { code: 'DOC-004', name: 'د. منى السعيدي', specialty: 'نساء وولادة', phone: '771444444', license: 'MED-2021-078' },
  { code: 'DOC-005', name: 'د. ياسر النعماني', specialty: 'عظام', phone: '771555555', license: 'MED-2017-034' },
  { code: 'DOC-006', name: 'د. ريم الجنيد', specialty: 'جلدية', phone: '771666666', license: 'MED-2022-091' },
]

// ===== نسخ قصيرة لأغراض الـ Lookup السريع في POS =====
export const sampleDrugsShort = sampleDrugs.map(d => ({
  name: d.name,
  barcode: d.barcode,
  unit: d.unit,
  price: d.sellPrice,
}))
