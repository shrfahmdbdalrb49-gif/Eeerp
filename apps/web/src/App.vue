<template>
  <div class="erp-app">
    <!-- الشريط العلوي الرئيسي -->
    <MainRibbon
      :active-menu="activeMenu"
      @menu-change="activeMenu = $event"
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
          <SalesInvoiceScreen />
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
        <template #generic="{ window: win }">
          <PlaceholderScreen :title="win.title" :description="pageDescription(win.type)" />
        </template>
      </Workspace>
    </div>

    <!-- شريط المهام السفلي -->
    <Taskbar
      :windows="openWindows"
      :active-window="activeWindowId"
      @window-activate="activeWindowId = $event"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import MainRibbon from './components/layout/MainRibbon.vue'
import Toolbar from './components/layout/Toolbar.vue'
import Sidebar from './components/layout/Sidebar.vue'
import Workspace from './components/layout/Workspace.vue'
import Taskbar from './components/layout/Taskbar.vue'
import SalesInvoiceScreen from './components/screens/SalesInvoiceScreen.vue'
import PosScreen from './components/screens/PosScreen.vue'
import ItemsScreen from './components/screens/ItemsScreen.vue'
import CustomersScreen from './components/screens/CustomersScreen.vue'
import DoctorsScreen from './components/screens/DoctorsScreen.vue'
import DashboardScreen from './components/screens/DashboardScreen.vue'
import InvoicesScreen from './components/screens/InvoicesScreen.vue'
import PrescriptionsScreen from './components/screens/PrescriptionsScreen.vue'
import PlaceholderScreen from './components/screens/PlaceholderScreen.vue'

// ---- الحالة ----
const activeMenu = ref('sales')
const sidebarCollapsed = ref(false)
const activeWindowId = ref('win-1')
const activePage = ref(null)

// النوافذ المفتوحة
const openWindows = ref([
  {
    id: 'win-1',
    title: 'فاتورة مبيعات #INV-2024-001',
    type: 'sales-invoice',
    status: 'draft',
    minimized: false,
    maximized: true
  }
])

// خريطة الصفحات الجانبية إلى أنواع النوافذ
const pageWindowTypes = {
  pos: { type: 'pos', title: 'نقطة البيع POS' },
  customers: { type: 'customers', title: 'العملاء (المرضى)' },
  doctors: { type: 'doctors', title: 'الأطباء' },
  items: { type: 'items', title: 'الأصناف - الأدوية والمستلزمات' },
  dashboard: { type: 'dashboard', title: 'لوحة التحكم' },
  invoices: { type: 'invoices', title: 'فواتير المبيعات' },
  prescriptions: { type: 'prescriptions', title: 'الوصفات الطبية' },
  returns: { type: 'generic', title: 'مرتجعات المبيعات' },
  collections: { type: 'generic', title: 'التحصيل' },
  suppliers: { type: 'generic', title: 'الموردون' },
  'purchase-orders': { type: 'generic', title: 'طلبات الشراء' },
  'purchase-invoices': { type: 'generic', title: 'فواتير المشتريات' },
  'purchase-returns': { type: 'generic', title: 'مرتجعات المشتريات' },
  warehouses: { type: 'generic', title: 'المخازن' },
  expiry: { type: 'generic', title: 'مراقبة الصلاحية' },
  stocktake: { type: 'generic', title: 'الجرد' },
  transfers: { type: 'generic', title: 'تحويلات الفروع' },
  'insurance-companies': { type: 'generic', title: 'شركات التأمين' },
  'insurance-cards': { type: 'generic', title: 'بطاقات التأمين' },
  'insurance-claims': { type: 'generic', title: 'المطالبات' },
  accounts: { type: 'generic', title: 'دليل الحسابات' },
  journal: { type: 'generic', title: 'القيود اليومية' },
  treasury: { type: 'generic', title: 'الصندوق والبنوك' },
  payable: { type: 'generic', title: 'الذمم (الموردون)' },
  receivable: { type: 'generic', title: 'الذمم (العملاء)' },
  'reports-sales': { type: 'generic', title: 'تقارير المبيعات' },
  'reports-inventory': { type: 'generic', title: 'تقارير المخزون' },
  'reports-financial': { type: 'generic', title: 'التقارير المالية' },
  'reports-insurance': { type: 'generic', title: 'تقارير التأمين' },
  users: { type: 'generic', title: 'المستخدمون والأدوار' },
  branches: { type: 'generic', title: 'الفروع' },
  settings: { type: 'generic', title: 'إعدادات النظام' },
  audit: { type: 'generic', title: 'سجل العمليات' },
  notifications: { type: 'generic', title: 'التنبيهات' },
}

const pageDescriptions = {
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
}

function pageDescription(type) {
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
  }
  openWindows.value.push(newWin)
  activeWindowId.value = newId
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

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// ---- الإجراءات ----
function handleNew() {
  const newId = 'win-' + Date.now()
  const count = openWindows.value.length + 1
  openWindows.value.push({
    id: newId,
    title: `فاتورة مبيعات #INV-2024-${String(count).padStart(3, '0')}`,
    type: 'sales-invoice',
    status: 'draft',
    minimized: false,
    maximized: false
  })
  activeWindowId.value = newId
}

function handleSave() {
  alert('تم الحفظ كمسودة (F8)')
}

function handlePost() {
  const win = openWindows.value.find(w => w.id === activeWindowId.value)
  if (win) {
    win.status = 'posted'
    alert('تم الترحيل بنجاح (F10)')
  }
}

function handlePrint() {
  window.print()
}

function handleSearch() {
  alert('فتح البحث السريع (F3)')
}

function handleClose() {
  closeWindow(activeWindowId.value)
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
</style>
