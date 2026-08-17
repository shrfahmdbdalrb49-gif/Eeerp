<template>
  <!-- ===== شريط القائمة الرئيسي (Menu Bar) — أفقي بعرض الشاشة، نمط Desktop ERP ===== -->
  <nav class="menu-bar" role="menubar" aria-label="القائمة الرئيسية">
    <template v-for="section in allSections" :key="section.key">
      <div
        class="menu-wrapper"
        @mouseenter="onHover(section.key)"
      >
        <div
          class="menu-item"
          role="menuitem"
          tabindex="0"
          :class="{ open: openMenu === section.key }"
          @click="toggleMenu(section.key)"
          @keydown.enter.space.prevent="toggleMenu(section.key)"
        >
          <span class="menu-label">{{ section.title }}</span>
          <svg class="menu-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>

        <!-- القائمة المنسدلة -->
        <transition name="dropdown">
          <div
            v-if="openMenu === section.key"
            class="dropdown-panel"
            role="menu"
            @click.stop
            @mouseleave="keepOpen = false"
          >
          <div class="dropdown-scroll">
            <template v-for="group in section.groups" :key="group.title">
              <div v-if="group.title" class="dropdown-group-title">{{ group.title }}</div>
              <template v-for="child in group.children" :key="child.title ?? child.page">
                <!-- فرع قابل للتوسيع (مستوى ثالث) -->
                <div v-if="child.children" class="dropdown-subgroup">
                  <button
                    class="dropdown-subtitle"
                    type="button"
                    @click.stop="toggleSub(section.key, child.title)"
                  >
                    <span>{{ child.title }}</span>
                    <svg class="dropdown-sub-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                  <transition name="sub-open">
                    <div v-show="expandedSub[child.title]" class="dropdown-subchildren">
                      <button
                        v-for="leaf in child.children"
                        :key="leaf.page"
                        class="dropdown-item"
                        :class="{ active: activePage === leaf.page }"
                        type="button"
                        @click.stop="pick(section.key, leaf.page)"
                      >
                        {{ leaf.label }}
                      </button>
                    </div>
                  </transition>
                </div>
                <!-- ورقة مباشرة -->
                <button
                  v-else
                  class="dropdown-item"
                  :class="{ active: activePage === child.page }"
                  type="button"
                  @click.stop="pick(section.key, child.page)"
                >
                  {{ child.label }}
                </button>
              </template>
            </template>
          </div>
        </div>
        </transition>
      </div>
    </template>
  </nav>
</template>

<script setup>
/**
 * MenuBar — شريط القائمة الرئيسي الأفقي (Desktop ERP style)
 * يستبدل Toolbar والقائمة الجانبية القديمة.
 * عند الضغط على أي قسم تظهر قائمة منسدلة تحته مباشرة،
 * وعند اختيار بند تُفتح الشاشة في مساحة العمل مع بقاء الشريط ظاهرًا.
 * Props:
 *   - activePage: String|null → الصفحة النشطة حاليًا
 * Events:
 *   - select(page) → فتح شاشة من القائمة
 */
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  activePage: { type: [String, null], default: null },
})

const emit = defineEmits(['select'])

// ===== الأقسام الـ14 — نفس بنية Sidebar بالضبط (لا تحذف أي وظيفة) =====
const allSections = [
  {
    key: 'sec-dashboard',
    menuKey: 'dashboard',
    title: 'النظام',
    defaultPage: 'dashboard',
    groups: [
      {
        title: 'نظرة عامة',
        children: [
          { page: 'dashboard', label: 'لوحة التحكم' },
          { page: 'notifications', label: 'مركز التنبيهات' },
          { page: 'stats', label: 'الإحصائيات' },
        ],
      },
    ],
  },
  {
    key: 'sec-masterdata',
    menuKey: 'masterdata',
    title: 'البيانات الأساسية',
    defaultPage: 'items',
    groups: [
      {
        title: 'الأطراف',
        children: [
          { page: 'customers', label: 'العملاء (المرضى)' },
          { page: 'suppliers', label: 'الموردون (شركات الأدوية)' },
          { page: 'doctors', label: 'الأطباء وجهات الوصف' },
        ],
      },
      {
        title: 'الأصناف والوحدات',
        children: [
          { page: 'items', label: 'الأصناف (الأدوية والمستلزمات)' },
          { page: 'therapeutic-groups', label: 'المجموعات العلاجية' },
          { page: 'units', label: 'الوحدات' },
          { page: 'price-lists', label: 'قوائم أسعار البيع' },
        ],
      },
      {
        title: 'إعدادات البيانات',
        children: [
          { page: 'branches', label: 'الفروع' },
          { page: 'currencies', label: 'العملات' },
          { page: 'taxes', label: 'الضرائب' },
          { page: 'fiscal-years', label: 'السنوات المالية' },
          { page: 'payment-methods', label: 'طرق الدفع' },
        ],
      },
    ],
  },
  {
    key: 'sec-sales',
    menuKey: 'sales',
    title: 'المبيعات',
    defaultPage: 'pos',
    groups: [
      {
        title: 'عمليات البيع',
        children: [
          { page: 'pos', label: 'نقطة البيع POS' },
          { page: 'invoices', label: 'فواتير المبيعات' },
          { page: 'prescriptions', label: 'الوصفات الطبية' },
          { page: 'returns', label: 'مرتجعات المبيعات' },
          { page: 'discounts', label: 'الخصومات والعروض' },
        ],
      },
      {
        title: 'الذمم والتحصيل',
        children: [
          { page: 'collections', label: 'التحصيل' },
          { page: 'aging-customers', label: 'أعمار ديون العملاء' },
        ],
      },
    ],
  },
  {
    key: 'sec-purchases',
    menuKey: 'purchases',
    title: 'المشتريات',
    defaultPage: 'purchase-invoices',
    groups: [
      {
        title: 'عمليات الشراء',
        children: [
          { page: 'purchase-requests', label: 'طلبات الشراء' },
          { page: 'purchase-orders', label: 'أوامر الشراء' },
          { page: 'purchase-invoices', label: 'فواتير المشتريات' },
          { page: 'receiving', label: 'استلام الشحنات' },
          { page: 'purchase-returns', label: 'مرتجعات المشتريات' },
        ],
      },
      {
        title: 'السداد',
        children: [{ page: 'supplier-payments', label: 'السداد للموردين' }],
      },
    ],
  },
  {
    key: 'sec-inventory',
    menuKey: 'inventory',
    title: 'المخزون',
    defaultPage: 'items',
    groups: [
      {
        title: 'الأرصدة والحركة',
        children: [
          { page: 'warehouses', label: 'المخازن والفروع' },
          { page: 'receiving-stock', label: 'التوريد' },
          { page: 'dispensing', label: 'الصرف' },
          { page: 'transfers', label: 'التحويل بين الفروع' },
          { page: 'stocktake', label: 'الجرد' },
          { page: 'stock-movement', label: 'حركة الأصناف والتشغيلات' },
        ],
      },
      {
        title: 'الصلاحية والتشغيلات',
        children: [{ page: 'expiry', label: 'مراقبة الصلاحية' }],
      },
    ],
  },
  {
    key: 'sec-insurance',
    menuKey: 'insurance',
    title: 'التأمين الصحي',
    defaultPage: 'insurance-claims',
    groups: [
      {
        title: 'التأمين',
        children: [
          { page: 'insurance-companies', label: 'شركات التأمين' },
          { page: 'insurance-cards', label: 'بطاقات التأمين' },
          { page: 'approvals', label: 'الموافقات' },
          { page: 'insurance-claims', label: 'المطالبات (Claims)' },
          { page: 'rejected-claims', label: 'المطالبات المرفوضة' },
          { page: 'settlements', label: 'التسويات' },
        ],
      },
    ],
  },
  {
    key: 'sec-treasury',
    menuKey: 'treasury',
    title: 'الصندوق والبنوك',
    defaultPage: 'receipt-voucher',
    groups: [
      {
        title: 'السندات',
        children: [
          { page: 'receipt-voucher', label: 'سند قبض' },
          { page: 'payment-voucher', label: 'سند صرف' },
        ],
      },
      {
        title: 'الصناديق والبنوك',
        children: [
          { page: 'cash-boxes', label: 'الصناديق' },
          { page: 'banks', label: 'البنوك' },
          { page: 'financial-transfers', label: 'التحويلات المالية' },
          { page: 'cheques', label: 'الشيكات' },
        ],
      },
    ],
  },
  {
    key: 'sec-accounting',
    menuKey: 'accounting',
    title: 'الحسابات',
    defaultPage: 'accounts',
    groups: [
      {
        title: 'القيود والحسابات',
        children: [
          { page: 'accounts', label: 'دليل الحسابات' },
          { page: 'journal', label: 'القيود اليومية' },
          { page: 'opening-entries', label: 'القيود الافتتاحية' },
          { page: 'posting', label: 'الترحيل المحاسبي' },
          { page: 'period-close', label: 'إقفال الفترات' },
          { page: 'bank-reconciliation', label: 'التسويات البنكية' },
        ],
      },
      {
        title: 'الذمم وأعمار الديون',
        children: [
          { page: 'aging-suppliers', label: 'أعمار ديون الموردين' },
          { page: 'bad-debt-provision', label: 'مخصص الديون المشكوك فيها' },
        ],
      },
    ],
  },
  {
    key: 'sec-assets',
    menuKey: 'assets',
    title: 'الأصول الثابتة',
    defaultPage: 'fixed-assets',
    groups: [
      {
        title: 'الأصول',
        children: [
          { page: 'fixed-assets', label: 'دليل الأصول' },
          { page: 'asset-depreciation', label: 'الإهلاك' },
          { page: 'asset-disposal', label: 'بيع واستبعاد الأصول' },
          { page: 'asset-inventory', label: 'جرد الأصول' },
        ],
      },
    ],
  },
  {
    key: 'sec-profit',
    menuKey: 'profit',
    title: 'الربحية والتكاليف',
    defaultPage: 'item-cost',
    groups: [
      {
        title: 'التكلفة والربحية',
        children: [
          { page: 'item-cost', label: 'تكلفة الأصناف' },
          { page: 'avg-cost', label: 'متوسط التكلفة' },
          { page: 'profit-margin', label: 'هامش الربح' },
          { page: 'drug-profit', label: 'تحليل ربحية الأدوية' },
          { page: 'branch-profit', label: 'تحليل ربحية الفروع' },
          { page: 'pricing-policy', label: 'سياسات التسعير' },
        ],
      },
    ],
  },
  {
    key: 'sec-hr',
    menuKey: 'hr',
    title: 'الموارد البشرية والرواتب',
    defaultPage: 'employees',
    groups: [
      {
        title: 'الموظفون والرواتب',
        children: [
          { page: 'employees', label: 'الموظفون والورديات' },
          { page: 'payroll', label: 'مسيرات الرواتب' },
          { page: 'hr-attendance', label: 'الحضور والانصراف' },
          { page: 'hr-loans', label: 'السلف والخصومات' },
          { page: 'hr-end-service', label: 'نهاية الخدمة' },
          { page: 'hr-reports', label: 'تقارير الموارد البشرية' },
        ],
      },
    ],
  },
  {
    key: 'sec-reports',
    menuKey: 'reports',
    title: 'التقارير',
    defaultPage: 'reports-sales',
    groups: [
      {
        title: 'تقارير المبيعات',
        children: [
          { page: 'rpt-sales-item', label: 'حسب الصنف' },
          { page: 'rpt-sales-doctor', label: 'حسب الطبيب' },
          { page: 'rpt-sales-insurance', label: 'حسب التأمين' },
          { page: 'reports-purchases', label: 'تقارير المشتريات' },
        ],
      },
      {
        title: 'تقارير المخزون',
        children: [
          { page: 'rpt-expiry', label: 'الصلاحية' },
          { page: 'rpt-turnover', label: 'دوران المخزون' },
          { page: 'rpt-movement', label: 'حركة الأصناف' },
        ],
      },
      {
        title: 'التقارير المالية',
        children: [
          { page: 'trial-balance', label: 'ميزان المراجعة' },
          { page: 'general-ledger', label: 'الأستاذ العام والمساعد' },
          { page: 'income-statement', label: 'قائمة الدخل' },
          { page: 'balance-sheet', label: 'الميزانية العمومية' },
        ],
      },
      {
        title: 'تقارير أخرى',
        children: [
          { page: 'reports-profit', label: 'تقارير الربحية' },
          { page: 'tax-reports', label: 'التقارير الضريبية' },
          { page: 'custom-reports', label: 'التقارير المخصصة' },
        ],
      },
    ],
  },
  {
    key: 'sec-admin',
    menuKey: 'admin',
    title: 'الإدارة',
    defaultPage: 'users',
    groups: [
      {
        title: 'المستخدمون والصلاحيات',
        children: [
          { page: 'users', label: 'المستخدمون والصلاحيات (RBAC)' },
          { page: 'settings', label: 'إعدادات النظام' },
        ],
      },
      {
        title: 'التشغيل والمراقبة',
        children: [
          { page: 'audit', label: 'سجل العمليات (Audit Log)' },
          { page: 'backup', label: 'النسخ الاحتياطي' },
          { page: 'branches', label: 'إدارة الفروع' },
          { page: 'notification-settings', label: 'إعدادات الإشعارات' },
          { page: 'system-monitor', label: 'مراقبة النظام' },
        ],
      },
    ],
  },
  {
    key: 'sec-help',
    menuKey: 'help',
    title: 'المساعدة',
    defaultPage: 'user-guide',
    groups: [
      {
        title: 'المساعدة',
        children: [
          { page: 'user-guide', label: 'دليل المستخدم' },
          { page: 'shortcuts', label: 'اختصارات لوحة المفاتيح' },
          { page: 'updates', label: 'التحديثات' },
          { page: 'support', label: 'الدعم الفني' },
          { page: 'about', label: 'حول النظام' },
        ],
      },
    ],
  },
]

// ===== القائمة المنسدلة =====
const openMenu = ref(null)
const keepOpen = ref(false)
const expandedSub = ref({})

function toggleMenu(key) {
  openMenu.value = openMenu.value === key ? null : key
}

/** تمرير الماوس: الانتقال بين الأقسام أثناء فتح أحدها (سلوك سطح المكتب) */
function onHover(key) {
  if (openMenu.value && openMenu.value !== key) {
    openMenu.value = key
    keepOpen.value = false
  }
}

function toggleSub(sectionKey, title) {
  expandedSub.value = { ...expandedSub.value, [title]: !expandedSub.value[title] }
}

function pick(sectionKey, page) {
  keepOpen.value = true
  openMenu.value = null
  emit('select', page)
}

/** إغلاق القائمة المنسدلة عند النقر خارجها (لا نُغلق إذا كان النقر داخل الشريط نفسه) */
function onDocClick(e) {
  if (e && e.target && e.target.closest('.menu-bar')) return
  if (!keepOpen.value) openMenu.value = null
  keepOpen.value = false
}

let timer = null
onMounted(() => {
  document.addEventListener('click', onDocClick)
  // إغلاق القائمة تلقائيًا بعد فترة عند فتح شاشة (للتوافق مع الجوال)
  timer = setInterval(() => {
    if (keepOpen.value) {
      keepOpen.value = false
    }
  }, 30_000)
})
onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.menu-bar {
  height: 44px;
  background: #0b1220;
  border-bottom: 1px solid #1e293b;
  display: flex;
  align-items: stretch;
  padding: 0 10px;
  gap: 2px;
  flex-shrink: 0;
  overflow-x: auto;
  direction: rtl;
  font-family: Arial, 'Segoe UI', 'Noto Sans Arabic', sans-serif;
}

/* إخفاء شريط التمرير الأفقي */
.menu-bar::-webkit-scrollbar { height: 0; }

.menu-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  background: transparent;
  color: #cbd5e1;
  border: none;
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  white-space: nowrap;
  font-size: 13.5px;
  font-weight: 600;
  transition: background 0.12s ease, color 0.12s ease;
}

.menu-item:hover,
.menu-item.open {
  background: #1e293b;
  color: #ffffff;
}

.menu-label {
  white-space: nowrap;
}

.menu-arrow {
  width: 14px;
  height: 14px;
  opacity: 0.7;
  transition: transform 0.15s ease;
}

.menu-item.open .menu-arrow {
  transform: rotate(180deg);
}

/* ===== القائمة المنسدلة ===== */
.menu-wrapper {
  position: relative;
}

.dropdown-panel {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 240px;
  max-width: 300px;
  max-height: calc(100vh - 60px);
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-top: 2px solid #2563eb;
  border-radius: 0 0 10px 10px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.28);
  z-index: 90;
  display: flex;
  flex-direction: column;
  direction: rtl;
}

.dropdown-scroll {
  overflow-y: auto;
  padding: 6px 0;
}

.dropdown-group-title {
  padding: 6px 16px 2px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #94a3b8;
  text-transform: uppercase;
}

.dropdown-item {
  display: block;
  width: 100%;
  text-align: right;
  padding: 9px 16px;
  background: transparent;
  color: #1e293b;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: inherit;
  transition: background 0.1s ease, color 0.1s ease;
}

.dropdown-item:hover {
  background: #eff6ff;
  color: #1d4ed8;
}

.dropdown-item.active {
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 700;
}

.dropdown-subtitle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 9px 16px;
  background: transparent;
  color: #334155;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  font-family: inherit;
  transition: background 0.1s ease;
}

.dropdown-subtitle:hover {
  background: #f8fafc;
}

.dropdown-sub-arrow {
  width: 13px;
  height: 13px;
  opacity: 0.6;
  transition: transform 0.15s ease;
}

.dropdown-subgroup:has(.dropdown-subchildren > *:first-child) .dropdown-subtitle:active .dropdown-sub-arrow {
  transform: rotate(90deg);
}

.dropdown-subchildren {
  padding: 2px 0 2px 10px;
  margin-right: 10px;
  border-right: 2px solid #e2e8f0;
}

/* ===== الحركات ===== */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.sub-open-enter-active,
.sub-open-leave-active {
  transition: all 0.15s ease;
}

.sub-open-enter-from,
.sub-open-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
