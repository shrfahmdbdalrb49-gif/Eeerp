<template>
  <div class="erp-app">
    <!-- شارة وضع الاستعراض: تُعرض في النسخة المُنشورة على GitHub Pages حيث لا يوجد خادم خلفي -->
    <div v-if="isDemoMode && !demoBannerDismissed" class="demo-banner">
      <span>◉ وضع الاستعراض (Demo) — البيانات تُخزّن محليًا في جهازك ولا تُزامن مع خادم مركزي</span>
      <button class="demo-banner-dismiss" title="إخفاء" @click="dismissDemoBanner">✕</button>
    </div>
    <!-- شاشة تسجيل الدخول تُعرض قبل كل شيء حتى المصادقة الفعلية -->
    <LoginScreen v-if="!authenticated" @logged-in="onLoggedIn" />
    <template v-else>
    <!-- الشريط العلوي الرئيسي -->
    <MainRibbon
      :active-menu="activeMenu"
      :user-name="currentUser?.fullName || 'مدير النظام'"
      :role-label="roleLabel"
      @menu-change="handleHeaderMenuChange"
    />

    <!-- شريط الأدوات -->
    <Toolbar
      @new="handleNew"
      @save="handleSave"
      @post="handlePost"
      @print="handlePrint"
      @search="handleSearch"
      @close="handleClose"
    />

    <!-- الحاوية الرئيسية -->
    <div class="main-container">
      <!-- القائمة الجانبية -->
      <Sidebar
        :active-menu="activeMenu"
        :collapsed="sidebarCollapsed"
        :active-page="activePage"
        @toggle="sidebarCollapsed = !sidebarCollapsed"
        @select="selectPage($event)"
      />

      <!-- مساحة العمل (النوافذ) -->
      <Workspace
        :windows="openWindows"
        :active-window="activeWindowId"
        @window-activate="activeWindowId = $event"
        @window-close="closeWindow"
        @window-minimize="minimizeWindow"
        @window-maximize="maximizeWindow"
      >
        <!-- محتوى النوافذ الداخلية -->
        <template #sales-invoice="{ window: win }">
          <SalesInvoiceScreen :window-id="win.id" :active="activeWindowId === win.id" />
        </template>
        <template #pos>
          <PosScreen />
        </template>
        <template #items>
          <ItemsScreen />
        </template>
        <template #customers>
          <CustomersScreen />
        </template>
        <template #doctors>
          <DoctorsScreen />
        </template>
        <template #dashboard>
          <DashboardScreen />
        </template>
        <template #invoices>
          <InvoicesScreen />
        </template>
        <template #prescriptions>
          <PrescriptionsScreen />
        </template>
        <template #returns>
          <ReturnsScreen />
        </template>
        <template #collections="{ window: win }">
          <CollectionsScreen :window-id="win.id" :active="activeWindowId === win.id" :opts="win.opts || {}" />
        </template>
        <template #suppliers>
          <SuppliersScreen />
        </template>
        <template #expiry>
          <ExpiryScreen />
        </template>
        <template #transfers>
          <TransfersScreen />
        </template>
        <template #accounts>
          <AccountsScreen />
        </template>
        <template #journal>
          <JournalScreen />
        </template>
        <template #reports>
          <ReportsScreen />
        </template>
        <template #purchases="{ window: win }">
          <PurchasesScreen :window-id="win.id" :active="activeWindowId === win.id" />
        </template>
        <template #supplier-payments="{ window: win }">
          <SupplierPaymentsScreen :window-id="win.id" :active="activeWindowId === win.id" />
        </template>
        <template #receipt-voucher="{ window: win }">
          <ReceiptVoucherScreen :window-id="win.id" :active="activeWindowId === win.id" />
        </template>
        <template #payment-voucher="{ window: win }">
          <PaymentVoucherScreen :window-id="win.id" :active="activeWindowId === win.id" />
        </template>
        <template #users>
          <UsersScreen />
        </template>
        <template #settings>
          <SettingsScreen />
        </template>
        <template #generic="{ window: win }">
          <PlaceholderScreen :title="win.title" :description="pageDescription(win.type)" />
        </template>
      </Workspace>
    </div>

    <!-- شريط المهام السفلي -->
    <Taskbar
      :windows="openWindows"
      :active-window="activeWindowId"
      :user-name="currentUser?.fullName || 'مدير النظام'"
      @window-activate="activeWindowId = $event"
    />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import LoginScreen from './components/screens/LoginScreen.vue'
import MainRibbon from './components/layout/MainRibbon.vue'
import Toolbar from './components/layout/Toolbar.vue'
import Sidebar from './components/layout/Sidebar.vue'
import Workspace from './components/layout/Workspace.vue'
import Taskbar from './components/layout/Taskbar.vue'
import JournalScreen from './components/screens/JournalScreen.vue'
import ReportsScreen from './components/screens/ReportsScreen.vue'
import PurchasesScreen from './components/screens/PurchasesScreen.vue'
import SupplierPaymentsScreen from './components/screens/SupplierPaymentsScreen.vue'
import SalesInvoiceScreen from './components/screens/SalesInvoiceScreen.vue'
import PosScreen from './components/screens/PosScreen.vue'
import ItemsScreen from './components/screens/ItemsScreen.vue'
import CustomersScreen from './components/screens/CustomersScreen.vue'
import DoctorsScreen from './components/screens/DoctorsScreen.vue'
import DashboardScreen from './components/screens/DashboardScreen.vue'
import InvoicesScreen from './components/screens/InvoicesScreen.vue'
import PrescriptionsScreen from './components/screens/PrescriptionsScreen.vue'
import ReturnsScreen from './components/screens/ReturnsScreen.vue'
import CollectionsScreen from './components/screens/CollectionsScreen.vue'
import SuppliersScreen from './components/screens/SuppliersScreen.vue'
import ExpiryScreen from './components/screens/ExpiryScreen.vue'
import ReceiptVoucherScreen from './components/screens/ReceiptVoucherScreen.vue'
import PaymentVoucherScreen from './components/screens/PaymentVoucherScreen.vue'
import AccountsScreen from './components/screens/AccountsScreen.vue'
import TransfersScreen from './components/screens/TransfersScreen.vue'
import UsersScreen from './components/screens/UsersScreen.vue'
import SettingsScreen from './components/screens/SettingsScreen.vue'
import PlaceholderScreen from './components/screens/PlaceholderScreen.vue'

// ---- الحالة ----
// ---- المصادقة ----
const authenticated = ref(null) // null = جارٍ التحقق، false = غير مسجل
const currentUser = ref(null)
// شارة وضع الاستعراض (تُخفى بالضغط على ✕ لكل مستخدم)
const isDemoMode = ref(false)
const demoBannerDismissed = ref(localStorage.getItem('sharaf-demo-banner-dismissed') === '1')
function dismissDemoBanner() {
  localStorage.setItem('sharaf-demo-banner-dismissed', '1')
  demoBannerDismissed.value = true
}

const activeMenu = ref('dashboard')
const roleLabel = computed(() => {
  const roles = { admin: 'مدير النظام', cashier: 'كاشير', accountant: 'محاسب' }
  return roles[currentUser.value?.role] || currentUser.value?.role || 'مدير النظام'
})

/** معالجة أحداث الهيدر: menu-change(value) للتبديل العادي، و('search', page) للبحث السريع */
function handleHeaderMenuChange(valueOrEvent, page) {
  if (page) {
    selectPage(page)
    return
  }
  activeMenu.value = valueOrEvent
}
const sidebarCollapsed = ref(window.innerWidth <= 768)
const activeWindowId = ref('win-1')
const activePage = ref(null)

// النوافذ المفتوحة
const openWindows = ref([])

// خريطة الصفحات الجانبية إلى أنواع النوافذ
const pageWindowTypes = {
  pos: { type: 'pos', title: 'نقطة البيع POS' },
  customers: { type: 'customers', title: 'العملاء (المرضى)' },
  doctors: { type: 'doctors', title: 'الأطباء' },
  items: { type: 'items', title: 'الأصناف - الأدوية والمستلزمات' },
  dashboard: { type: 'dashboard', title: 'لوحة التحكم' },
  invoices: { type: 'sales-invoice', title: 'فواتير المبيعات (نقدي / آجل / تأمين)' },
  'sales-invoices': { type: 'sales-invoice', title: 'فواتير المبيعات (نقدي / آجل / تأمين)' },
  prescriptions: { type: 'prescriptions', title: 'الوصفات الطبية' },
  returns: { type: 'returns', title: 'مرتجعات المبيعات' },
  collections: { type: 'collections', title: 'التحصيل', opts: { tab: 'history' } },
  suppliers: { type: 'suppliers', title: 'الموردون' },
  'purchase-orders': { type: 'generic', title: 'طلبات الشراء' },
  'purchase-invoices': { type: 'purchases', title: 'فواتير المشتريات' },
  'purchase-returns': { type: 'generic', title: 'مرتجعات المشتريات' },
  warehouses: { type: 'generic', title: 'المخازن' },
  expiry: { type: 'expiry', title: 'مراقبة الصلاحية' },
  stocktake: { type: 'generic', title: 'الجرد' },
  transfers: { type: 'transfers', title: 'تحويلات الفروع' },
  'insurance-companies': { type: 'generic', title: 'شركات التأمين' },
  'insurance-cards': { type: 'generic', title: 'بطاقات التأمين' },
  'insurance-claims': { type: 'generic', title: 'المطالبات' },
  accounts: { type: 'accounts', title: 'دليل الحسابات' },
  journal: { type: 'journal', title: 'القيود اليومية' },
  treasury: { type: 'generic', title: 'الصندوق والبنوك' },
  payable: { type: 'supplier-payments', title: 'الذمم (الموردون)' },
  receivable: { type: 'collections', title: 'الذمم (العملاء)' },
  'reports-sales': { type: 'reports', title: 'تقارير المبيعات' },
  'reports-inventory': { type: 'reports', title: 'تقارير المخزون' },
  'reports-financial': { type: 'reports', title: 'التقارير المالية' },
  'reports-insurance': { type: 'generic', title: 'تقارير التأمين' },
  users: { type: 'users', title: 'المستخدمون والأدوار' },
  branches: { type: 'generic', title: 'الفروع' },
  settings: { type: 'settings', title: 'إعدادات النظام' },
  audit: { type: 'reports', title: 'سجل العمليات (Audit Log)' },
  notifications: { type: 'generic', title: 'التنبيهات' },
  stats: { type: 'generic', title: 'الإحصائيات' },
  currencies: { type: 'generic', title: 'العملات' },
  taxes: { type: 'generic', title: 'الضرائب' },
  'fiscal-years': { type: 'generic', title: 'السنوات المالية' },
  'payment-methods': { type: 'generic', title: 'طرق الدفع' },
  'purchase-requests': { type: 'generic', title: 'طلبات الشراء' },
  receiving: { type: 'purchases', title: 'استلام الشحنات' },
  'supplier-payments': { type: 'supplier-payments', title: 'السداد للموردين' },
  'drug-commercial-name': { type: 'generic', title: 'قاعدة بيانات الأدوية — الاسم التجاري' },
  'drug-scientific-name': { type: 'generic', title: 'قاعدة بيانات الأدوية — الاسم العلمي' },
  'drug-manufacturer': { type: 'generic', title: 'قاعدة بيانات الأدوية — الشركة المصنعة' },
  'drug-dosage-form': { type: 'generic', title: 'قاعدة بيانات الأدوية — التركيز والشكل الدوائي' },
  'drug-alternatives': { type: 'generic', title: 'قاعدة بيانات الأدوية — البدائل الدوائية' },
  'drug-interactions': { type: 'generic', title: 'قاعدة بيانات الأدوية — التفاعلات الدوائية' },
  'drug-requires-rx': { type: 'generic', title: 'قاعدة بيانات الأدوية — يحتاج وصفة؟' },
  'drug-database': { type: 'generic', title: 'قاعدة بيانات الأدوية' },
  'therapeutic-groups': { type: 'generic', title: 'المجموعات العلاجية' },
  units: { type: 'generic', title: 'الوحدات' },
  'receiving-stock': { type: 'generic', title: 'التوريد' },
  dispensing: { type: 'generic', title: 'الصرف' },
  'stock-movement': { type: 'generic', title: 'حركة الأصناف والتشغيلات' },
  approvals: { type: 'generic', title: 'الموافقات' },
  'rejected-claims': { type: 'generic', title: 'المطالبات المرفوضة' },
  settlements: { type: 'generic', title: 'التسويات' },
  'cash-boxes': { type: 'generic', title: 'الصناديق' },
  banks: { type: 'generic', title: 'البنوك' },
  'receipt-voucher': { type: 'receipt-voucher', title: 'سند قبض' },
  'payment-voucher': { type: 'payment-voucher', title: 'سند صرف' },
  'financial-transfers': { type: 'generic', title: 'التحويلات المالية' },
  cheques: { type: 'generic', title: 'الشيكات' },
  'opening-entries': { type: 'journal', title: 'القيود الافتتاحية' },
  posting: { type: 'journal', title: 'الترحيل المحاسبي' },
  'period-close': { type: 'generic', title: 'إقفال الفترات' },
  'bank-reconciliation': { type: 'generic', title: 'التسويات البنكية' },
  'aging-customers': { type: 'collections', title: 'أعمار ديون العملاء', opts: { tab: 'aging' } },
  'aging-suppliers': { type: 'supplier-payments', title: 'أعمار ديون الموردين', opts: { tab: 'aging' } },
  'bad-debt-provision': { type: 'generic', title: 'مخصص الديون المشكوك فيها' },
  'item-cost': { type: 'generic', title: 'تكلفة الأصناف' },
  'avg-cost': { type: 'generic', title: 'متوسط التكلفة' },
  'profit-margin': { type: 'generic', title: 'هامش الربح' },
  'drug-profit': { type: 'generic', title: 'تحليل ربحية الأدوية' },
  'branch-profit': { type: 'generic', title: 'تحليل ربحية الفروع' },
  'pricing-policy': { type: 'generic', title: 'سياسات التسعير' },
  'rpt-sales-item': { type: 'generic', title: 'تقارير المبيعات حسب الصنف' },
  'rpt-sales-doctor': { type: 'generic', title: 'تقارير المبيعات حسب الطبيب' },
  'rpt-sales-insurance': { type: 'generic', title: 'تقارير المبيعات حسب التأمين' },
  'reports-purchases': { type: 'generic', title: 'تقارير المشتريات' },
  'rpt-expiry': { type: 'generic', title: 'تقرير الصلاحية' },
  'rpt-turnover': { type: 'generic', title: 'دوران المخزون' },
  'rpt-movement': { type: 'generic', title: 'حركة الأصناف' },
  'reports-profit': { type: 'generic', title: 'تقارير الربحية' },
  'trial-balance': { type: 'reports', title: 'ميزان المراجعة' },
  'general-ledger': { type: 'reports', title: 'الأستاذ العام والمساعد' },
  'income-statement': { type: 'reports', title: 'قائمة الدخل' },
  'balance-sheet': { type: 'reports', title: 'الميزانية العمومية' },
  'tax-reports': { type: 'generic', title: 'التقارير الضريبية' },
  'custom-reports': { type: 'generic', title: 'التقارير المخصصة' },
  employees: { type: 'generic', title: 'الموظفون والورديات' },
  backup: { type: 'generic', title: 'النسخ الاحتياطي' },
  'notification-settings': { type: 'generic', title: 'إعدادات الإشعارات' },
  'system-monitor': { type: 'generic', title: 'مراقبة النظام' },
  'price-lists': { type: 'generic', title: 'قوائم أسعار البيع' },
  discounts: { type: 'generic', title: 'الخصومات والعروض' },
  'user-guide': { type: 'generic', title: 'دليل المستخدم' },
  shortcuts: { type: 'generic', title: 'اختصارات لوحة المفاتيح' },
  updates: { type: 'generic', title: 'التحديثات' },
  support: { type: 'generic', title: 'الدعم الفني' },
  about: { type: 'generic', title: 'حول النظام' },
}

const EXTRA_KEYS = ['fixed-assets','asset-depreciation','asset-disposal','asset-inventory','payroll','hr-attendance','hr-loans','hr-end-service','hr-reports']
const AR_TITLES = {"fixed-assets": "دليل الأصول الثابتة", "asset-depreciation": "إهلاك الأصول", "asset-disposal": "بيع واستبعاد الأصول", "asset-inventory": "جرد الأصول الثابتة", "payroll": "مسيرات الرواتب", "hr-attendance": "الحضور والانصراف", "hr-loans": "السلف والخصومات", "hr-end-service": "نهاية الخدمة", "hr-reports": "تقارير الموارد البشرية"}
EXTRA_KEYS.forEach((k) => { pageWindowTypes[k] = { type: 'generic', title: AR_TITLES[k] } })
const pageDescriptions = {
  'hr-reports': 'تقارير الموارد البشرية والرواتب.',
  'hr-end-service': 'حساب مستحقات نهاية الخدمة.',
  'hr-loans': 'السلف للموظفين وجدولة الخصومات من الرواتب.',
  'hr-attendance': 'تسجيل الحضور والانصراف للموظفين.',
  'payroll': 'مسيرات الرواتب الشهرية والاستحقاقات والخصومات.',
  'asset-inventory': 'جرد الأصول الثابتة ومطابقة الأرصدة الفعلية.',
  'asset-disposal': 'بيع واستبعاد الأصول الثابتة وحساب المكاسب والخسائر.',
  'asset-depreciation': 'حساب إهلاك الأصول بالطرق المحاسبية المعتمدة.',
  'fixed-assets': 'دليل الأصول الثابتة وتواريخ الشراء وقيم الدفاتر.',
  pos: 'شاشة نقطة البيع للمبيعات السريعة بالبحث عن الأدوية وإتمام البيع الفوري.',
  customers: 'سجل المرضى والعملاء مع أرصدتهم الآجلة ونوع التأمين.',
  doctors: 'دليل الأطباء وتخصصاتهم وأرقام التراخيص.',
  items: 'جدول الأصناف والأدوية مع البحث والفلترة وأرصدة المخزون والصلاحية.',
  dashboard: 'لوحة التحكم بإحصائيات المخزون والمبيعات والتنبيهات.',
  invoices: 'سجل فواتير المبيعات السابقة والقدرة على إعادة فتح أي فاتورة.',
  returns: 'مرتجعات المبيعات وإرجاع الأصناف من العملاء.',
  collections: 'شاشة التحصيل من العملاء الآجلين.',
  prescriptions: 'إدارة الوصفات الطبية ووصف الأدوية من قبل الأطباء.',
  suppliers: 'دليل الموردين وبيانات الاتصال ورصيدهم.',
  'purchase-orders': 'إنشاء ومتابعة أوامر شراء الأدوية من الموردين.',
  'purchase-invoices': 'تسجيل فواتير المشتريات الواردة من الموردين.',
  'purchase-returns': 'إرجاع الأصناف للموردين.',
  warehouses: 'إدارة المخازن وأرصدة كل مخزن.',
  expiry: 'مراقبة أصناف المخزون منتهية أو قريبة الانتهاء.',
  stocktake: 'عمليات الجرد الدوري ومقارنة الأرصدة الفعلية.',
  transfers: 'تحويلات الأصناف بين الفروع والمخازن.',
  'insurance-companies': 'شركات التأمين المتعاقد معها وبنود العقود.',
  'insurance-cards': 'بطاقات التأمين للمرضى وسقف التغطية.',
  'insurance-claims': 'المطالبات التأمينية ومراحل مراجعتها.',
  accounts: 'دليل الحسابات الشجري (الدفتر الأستاذ).',
  journal: 'القيود اليومية المحاسبية.',
  treasury: 'إدارة الصندوق والبنوك.',
  payable: 'أرصدة الموردين المستحقة.',
  receivable: 'أرصدة العملاء المستحقة.',
  'reports-sales': 'تقارير المبيعات حسب الفترة والفرع والمستخدم.',
  'reports-inventory': 'تقارير المخزون والحركة.',
  'reports-financial': 'التقارير المالية والقوائم.',
  'reports-insurance': 'تقارير التأمين والمطالبات.',
  users: 'إدارة المستخدمين وصلاحياتهم.',
  branches: 'إدارة الفروع.',
  settings: 'إعدادات النظام العامة.',
  audit: 'سجل العمليات والمستخدمين.',
  notifications: 'التنبيهات والإشعارات.',
  stats: 'الإحصائيات التفصيلية لمؤشرات النظام.',
  currencies: 'العملات المستخدمة في النظام مع سعر الصرف (YER افتراضية).',
  taxes: 'الضرائب ونسبها المطبقة على الأصناف والفواتير.',
  'fiscal-years': 'السنوات المالية والفترات المحاسبية.',
  'payment-methods': 'طرق الدفع المتاحة (نقدي، آجل، تأمين، بطاقة).',
  'purchase-requests': 'طلبات الشراء الداخلية للأدوية والمستلزمات.',
  receiving: 'استلام الشحنات الواردة من الموردين وتحديث المخزون.',
  'supplier-payments': 'سداد الدفعات للموردين ومتابعة الأرصدة.',
  'drug-commercial-name': 'قاعدة بيانات الأدوية: البحث والإدارة بالاسم التجاري.',
  'drug-scientific-name': 'قاعدة بيانات الأدوية: البحث والإدارة بالاسم العلمي.',
  'drug-manufacturer': 'قاعدة بيانات الأدوية: الشركات المصنّعة للأدوية.',
  'drug-dosage-form': 'قاعدة بيانات الأدوية: التركيز والشكل الدوائي (أقراص، شراب، حقن...).',
  'drug-alternatives': 'قاعدة بيانات الأدوية: البدائل الدوائية المتكافئة.',
  'drug-interactions': 'قاعدة بيانات الأدوية: التفاعلات والتحذيرات الدوائية.',
  'drug-requires-rx': 'قاعدة بيانات الأدوية: تصنيف الأصناف التي تحتاج وصفة طبية.',
  'drug-database': 'قاعدة بيانات الأدوية: الاسم التجاري والعلمي والمصنّع والتركيب والبدائل والتفاعلات.',
  'therapeutic-groups': 'المجموعات العلاجية للأدوية.',
  units: 'وحدات القياس للأصناف (علبة، شريط، حبة...).',
  'receiving-stock': 'تشغيلات التوريد الداخل للمخازن.',
  dispensing: 'تشغيلات الصرف من المخازن.',
  'stock-movement': 'حركة الأصناف وجميع التشغيلات المخزنية.',
  approvals: 'الموافقات المسبقة من شركات التأمين.',
  'rejected-claims': 'المطالبات التأمينية المرفوضة ومتابعتها.',
  settlements: 'تسويات المطالبات مع شركات التأمين.',
  'cash-boxes': 'الصناديق النقدية وأرصدتها.',
  banks: 'الحسابات البنكية والحركات عليها.',
  'receipt-voucher': 'سندات القبض من العملاء.',
  'payment-voucher': 'سندات الصرف للمصروفات والموردين.',
  'financial-transfers': 'التحويلات المالية بين الصناديق والبنوك.',
  cheques: 'إدارة الشيكات الواردة والصادرة.',
  'opening-entries': 'القيود الافتتاحية للسنة المالية.',
  posting: 'الترحيل المحاسبي التلقائي من العمليات.',
  'period-close': 'إقفال الفترات المحاسبية.',
  'bank-reconciliation': 'التسوية بين سجلات النظام وكشوف البنوك.',
  'aging-customers': 'تحليل أعمار الديون للعملاء وشركات التأمين.',
  'aging-suppliers': 'تحليل أعمار الديون المستحقة للموردين.',
  'bad-debt-provision': 'مخصص الديون المشكوك فيها.',
  'item-cost': 'تكلفة الأصناف وطرق احتسابها.',
  'avg-cost': 'متوسط التكلفة المتحركة للأدوية.',
  'profit-margin': 'هوامش الربح حسب الصنف والمجموعة.',
  'drug-profit': 'تحليل ربحية الأدوية ومقارنة التكلفة بالسعر.',
  'branch-profit': 'تحليل ربحية الفروع ومقارنتها.',
  'pricing-policy': 'سياسات التسعير وقواعد التسعير التلقائي.',
  'rpt-sales-item': 'تقرير المبيعات حسب الصنف.',
  'rpt-sales-doctor': 'تقرير المبيعات حسب الطبيب.',
  'rpt-sales-insurance': 'تقرير المبيعات حسب التأمين.',
  'reports-purchases': 'تقارير المشتريات حسب المورد والفترة.',
  'rpt-expiry': 'تقرير الأصناف منتهية أو قريبة الانتهاء.',
  'rpt-turnover': 'تقرير دوران المخزون ومعدلاته.',
  'rpt-movement': 'تقرير حركة الأصناف والتشغيلات.',
  'reports-profit': 'تقارير الربحية والهوامش.',
  'trial-balance': 'ميزان المراجعة العام.',
  'general-ledger': 'الأستاذ العام والمساعد.',
  'income-statement': 'قائمة الدخل (الأرباح والخسائر).',
  'balance-sheet': 'الميزانية العمومية.',
  'tax-reports': 'التقارير الضريبية للتقديم.',
  'custom-reports': 'إنشاء تقارير مخصصة حسب المعايير.',
  employees: 'الموظفون والورديات والمناوبات.',
  backup: 'إدارة النسخ الاحتياطي واستعادته.',
  'notification-settings': 'إعدادات الإشعارات والتنبيهات.',
  'system-monitor': 'مراقبة أداء النظام والحمل.',
  'price-lists': 'قوائم أسعار البيع المتعددة حسب العميل أو الفترة.',
  discounts: 'الخصومات والعروض الترويجية.',
  'user-guide': 'دليل استخدام النظام.',
  shortcuts: 'اختصارات لوحة المفاتيح المتاحة.',
  updates: 'سجل تحديثات وإصدارات النظام.',
  support: 'قنوات الدعم الفني والتواصل.',
  about: 'معلومات حول النظام والإصدار.',
}

const NOT_IMPLEMENTED = new Set([
  'insurance-companies','insurance-cards','insurance-claims','warehouses','stocktake',
  'branches','notifications','stats','currencies','taxes',
  'fiscal-years','payment-methods','cheques','bank-reconciliation','custom-reports',
  'employees','backup','system-monitor','about','drug-database',
])

function pageDescription(type) {
  if (NOT_IMPLEMENTED.has(type)) return 'هذه الشاشة غير منفذة فعليًا في هذا الإصدار.'
  return pageDescriptions[type] ?? 'محتوى هذه الشاشة قيد التطوير...'
}

// فتح شاشة من القائمة الجانبية
function selectPage(page) {
  if (!page || !pageWindowTypes[page]) return
  const mapping = pageWindowTypes[page]
  const exists = openWindows.value.find((w) => w.page === page && mapping.type !== 'generic')
  if (exists) {
    activeWindowId.value = exists.id
    exists.minimized = false
    // إعادة القائمة الجانبية مطوية عند الانتقال إلى نافذة مفتوحة مسبقًا
    sidebarCollapsed.value = true
    return
  }
  const newId = 'win-' + Date.now()
  const newWin = {
    id: newId,
    title: mapping.title,
    type: mapping.type,
    page,
    status: 'draft',
    minimized: false,
    maximized: false,
    ...(mapping.opts || {}),
  }
  openWindows.value.push(newWin)
  activeWindowId.value = newId
  // إغلاق القائمة الجانبية تلقائيًا بعد فتح النافذة الجديدة
  sidebarCollapsed.value = true
}

// ---- اختصارات لوحة المفاتيح ----
function handleKeydown(e) {
  // F2 - جديد
  if (e.key === 'F2') {
    e.preventDefault()
    handleNew()
  }
  // F8 - حفظ
  if (e.key === 'F8') {
    e.preventDefault()
    handleSave()
  }
  // F10 - ترحيل
  if (e.key === 'F10') {
    e.preventDefault()
    handlePost()
  }
  // F3 - بحث
  if (e.key === 'F3') {
    e.preventDefault()
    handleSearch()
  }
  // Escape - إغلاق
  if (e.key === 'Escape') {
    e.preventDefault()
    handleClose()
  }
  // Ctrl+P - طباعة
  if (e.ctrlKey && e.key === 'p') {
    e.preventDefault()
    handlePrint()
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('sharaf-logout', () => {
    authenticated.value = false
    currentUser.value = null
  })
  // تهيئة قاعدة البيانات (المستخدم الافتراضي + دليل الحسابات) ثم التحقق من الجلسة
  const { initSystem, getStorageMode } = await import('./db/database.js')
  const { currentSession } = await import('./db/session.js')
  // وضع الاستعراض الذكي: إذا كان الخادم غير متاح (نشر GitHub Pages) يتحول تلقائيًا للتخزين المحلي
  const { ensureDemoMode } = await import('./db/demoMode.js')
  await ensureDemoMode()
  /* ترقية البيانات القديمة من النسخ السابقة تلقائيًا:
     - تحويل أسماء الحقول من snake_case إلى camelCase
     - إضافة كلمات مرور مشفرة للمستخدمين القدامى
     بدون هذه الترقية يظهر «كلمة المرور غير صحيحة» وتحمل الشاشات بيانات غير متوافقة */
  try {
    const { db } = await import('./db/database.js')
    const { migrateLegacyData } = await import('./db/migration.js')
    const result = await migrateLegacyData(db)
    if (result?.migrated) console.info('[SharafERP] رُقّيت البيانات القديمة:', result.tables?.length || 0, 'جدولًا')
  } catch (e) {
    console.warn('[SharafERP] تعذّرت ترقية البيانات القديمة:', e?.message)
  }
  /* شارة وضع الاستعراض */
  if (getStorageMode() === 'local') isDemoMode.value = true
  if (getStorageMode() === 'server') {
    // في وضع الخادم المركزي: التحقق من الاتصال بالخادم قبل استكمال التحميل
    const { apiBase } = await import('./db/api.js')
    let ok = false
    for (const url of [apiBase() + '/health', apiBase() + '/settings']) {
      try { const r = await fetch(url, { signal: AbortSignal.timeout(6000) }); ok = r.ok || r.status === 401; if (ok) break } catch {}
    }
    if (!ok) console.warn('[SharafERP] الخادم المركزي غير متاح على', apiBase(), '— لن تعمل العمليات حتى يصبح متصلًا')
  }
  await initSystem()
  /* تنظيف الحسابات المكررة الخاملة (خلل QA #10: 4000/1010) */
  if (getStorageMode() === 'local') {
    try {
      const { db } = await import('./db/database.js')
      const { sanitizeAccounts } = await import('./db/database.js')
      const removed = await sanitizeAccounts(db)
      if (removed) console.info('[SharafERP] أُزيلت', removed, 'حسابات مكررة خاملة من دليل الحسابات')
    } catch (e) { console.warn('[SharafERP] تعذّر تنظيف الحسابات المكررة:', e?.message) }
  }
  const session = await currentSession()
  authenticated.value = !!session
  currentUser.value = session
  // فتح صفحة محددة عبر معلمة URL (مثال: ?page=returns)
  const params = new URLSearchParams(window.location.search)
  const page = params.get('page')
  if (page && pageWindowTypes[page]) {
    openWindows.value = []
    selectPage(page)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// ---- الإجراءات ----
function handleNew() {
  // الشاشات المعاد تصميمها (بواجهة Desktop ERP) تفتح نموذجًا جديدًا داخل نفس النافذة
  const DOC_SCREEN_TYPES = ['purchases', 'sales-invoice', 'receipt-voucher', 'payment-voucher', 'supplier-payments']
  const activeWin = openWindows.value.find((w) => w.id === activeWindowId.value)
  if (activeWin && DOC_SCREEN_TYPES.includes(activeWin.type)) {
    window.dispatchEvent(new CustomEvent('sharaf-new-doc', { detail: { windowId: activeWindowId.value } }))
    return
  }
  const newId = 'win-' + Date.now()
  openWindows.value.push({
    id: newId,
    title: activeWin ? activeWin.title : 'نقطة البيع POS',
    type: activeWin ? activeWin.type : 'pos',
    page: activeWin ? (activeWin.page || activeWin.type) : 'pos',
    status: 'draft',
    minimized: false,
    maximized: false
  })
  activeWindowId.value = newId
}

function handleSave() {
  // الحفظ الفعلي يتم داخل كل شاشة (تخزين في IndexedDB)
}

function handlePost() {
  // الترحيل الفعلي يتم داخل كل شاشة (قيود مزدوجة في IndexedDB)
}

function handlePrint() {
  window.print()
}

function handleSearch() {
  // البحث السريع يتم داخل كل شاشة عبر حقول البحث الفعلية
}

function handleClose() {
  closeWindow(activeWindowId.value)
}

function onLoggedIn(user) {
  authenticated.value = true
  currentUser.value = user
}

function closeWindow(id) {
  openWindows.value = openWindows.value.filter(w => w.id !== id)
  if (openWindows.value.length > 0) {
    activeWindowId.value = openWindows.value[openWindows.value.length - 1].id
  } else {
    activeWindowId.value = null
  }
}

function minimizeWindow(id) {
  const win = openWindows.value.find(w => w.id === id)
  if (win) {
    win.minimized = true
  }
}

function maximizeWindow(id) {
  const win = openWindows.value.find(w => w.id === id)
  if (win) {
    win.maximized = !win.maximized
  }
}
</script>

<style scoped>
.erp-app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* شارة وضع الاستعراض */
.demo-banner {
  background: linear-gradient(90deg, #b45309 0%, #d97706 50%, #b45309 100%);
  color: #fff;
  font-size: 12.5px;
  font-weight: 600;
  text-align: center;
  padding: 6px 36px 6px 12px;
  position: relative;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  flex-shrink: 0;
  direction: rtl;
}
.demo-banner-dismiss {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #fff;
  font-size: 15px;
  cursor: pointer;
  line-height: 1;
  padding: 2px 8px;
  border-radius: 4px;
}
.demo-banner-dismiss:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
