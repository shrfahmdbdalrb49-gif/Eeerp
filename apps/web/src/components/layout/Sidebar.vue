<template>
  <!-- ===== القائمة الجانبية (Bolt-style Dark Navigation) — 14 قسمًا رئيسيًا مع accordion ===== -->
  <aside class="sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <span v-if="!collapsed" class="sidebar-title">القائمة الرئيسية</span>
      <button
        class="sidebar-toggle"
        @click="$emit('toggle')"
        :title="collapsed ? 'توسيع القائمة' : 'طي القائمة'"
      >
        <ChevronsIcon :name="collapsed ? 'chevron-right' : 'chevron-left'" />
      </button>
    </div>

    <nav v-if="!collapsed" class="sidebar-nav" role="tree">
      <template v-for="section in allSections" :key="section.key">
        <!-- عنوان القسم + أيقونته — سلوك accordion: فتح قسم يغلق القسم السابق -->
        <button
          class="section-title"
          :class="{ active: openSection === section.key }"
          type="button"
          @click="toggleSection(section.key)"
          :aria-expanded="openSection === section.key"
        >
          <span class="section-icon" :style="{ color: section.iconColor }">
            <component :is="section.icon" :size="15" :stroke-width="1.75" />
          </span>
          <span class="section-label">{{ section.title }}</span>
          <span class="section-arrow" :class="{ expanded: openSection === section.key }">
            <ChevronsIcon :name="openSection === section.key ? 'chevron-down' : 'chevron-left'" />
          </span>
        </button>

        <!-- بنود القسم: تظهر فقط للقسم المفتوح -->
        <transition name="section-open">
          <ul v-if="openSection === section.key" class="section-items">
            <template v-for="group in section.groups" :key="group.title">
              <li v-if="group.title" class="group-title">{{ group.title }}</li>
              <template v-for="child in group.children" :key="child.title ?? child.page">
                <!-- فرع قابل للتوسيع (مستوى ثالث) -->
                <li v-if="child.children" class="tree-subgroup" :class="{ expanded: expandedSub[child.title] }">
                  <button class="tree-subgroup-title" @click="toggleSub(child.title)" type="button">
                    <span class="tree-chevron" :class="{ rotated: expandedSub[child.title] }">
                      <ChevronsIcon name="chevron-left" />
                    </span>
                    <span class="tree-label">{{ child.title }}</span>
                  </button>
                  <transition name="sub-open">
                    <ul v-show="expandedSub[child.title]" class="tree-children">
                      <li
                        v-for="leaf in child.children"
                        :key="leaf.page"
                        class="tree-leaf"
                        :class="{ active: activePage === leaf.page }"
                        @click="$emit('select', leaf.page)"
                      >
                        {{ leaf.label }}
                      </li>
                    </ul>
                  </transition>
                </li>
                <!-- ورقة مباشرة -->
                <li
                  v-else
                  class="tree-leaf"
                  :class="{ active: activePage === child.page }"
                  @click="$emit('select', child.page)"
                >
                  {{ child.label }}
                </li>
              </template>
            </template>
          </ul>
        </transition>
      </template>
    </nav>
  </aside>
</template>

<script setup>
/**
 * Sidebar — القائمة الجانبية الداكنة (Bolt-style)
 * بنية جديدة: 14 قسمًا رئيسيًا فقط، سلوك accordion (قسم مفتوح واحد فقط)،
 * أيقونات موحدة من مكتبة lucide-vue-next الفعلية (ليست Emoji).
 * Props:
 *   - activeMenu: String  → القسم المفتوح افتراضيًا
 *   - collapsed:  Boolean → هل القائمة مطوية
 *   - activePage: String  → الصفحة الجانبية النشطة
 * Events:
 *   - toggle        → طي/توسيع القائمة
 *   - select(page)  → النقر على بند نهائي في الشجرة
 */
import { ref } from 'vue'
import {
  LayoutGrid,
  Database,
  ShoppingCart,
  PackageSearch,
  Boxes,
  ShieldCheck,
  Landmark,
  BookOpen,
  Building2,
  ChartColumn,
  FileText,
  Settings,
  CircleQuestionMark,
} from 'lucide-vue-next'

const props = defineProps({
  activeMenu: { type: String, default: 'dashboard' },
  collapsed: { type: Boolean, default: false },
  activePage: { type: [String, null], default: null },
})

defineEmits(['toggle', 'select'])

/** حالة accordion: قسم مفتوح واحد فقط (أو لا شيء) */
const openSection = ref(props.activeMenu || 'sec-dashboard')

function toggleSection(key) {
  openSection.value = openSection.value === key ? null : key
}

// حالة التوسيع للمجموعات الفرعية فقط (المستوى الثالث)
const expandedSub = ref({})
function toggleSub(title) {
  expandedSub.value = { ...expandedSub.value, [title]: !expandedSub.value[title] }
}

/**
 * أيقونات الأقسام — جميعها من مكتبة lucide-vue-next الفعلية.
 */
const iconMap = {
  LayoutGrid,
  Database,
  ShoppingCart,
  PackageSearch,
  Boxes,
  ShieldCheck,
  Landmark,
  BookOpen,
  Building2,
  ChartColumn,
  FileText,
  Settings,
  CircleQuestionMark,
}

/**
 * أيقونات lucide v1 هي render functions عارية — لا يجب لفّها بـshallowRef/ref
 * وإلا سيحوّلها Vue إلى Reactive Proxy وتُعرض كـ"[object Object]" داخل
 * <component :is="...">. نمرّر الدوال الخام مباشرة.
 */
const Icon = (name) => iconMap[name]

/**
 * مكوّن أيقونة السهم الداخلي (chevron-left / chevron-right / chevron-down)
 * من مكتبة lucide الفعلية بدل رموز نصية.
 */
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-vue-next'
const chevronMap = {
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
}
const ChevronsIcon = (name) => chevronMap[name]

/**
 * الأقسام الـ14 الرئيسية — جميع وظائف النظام الحالية موزعة عليها.
 * لا تحذف أي وظيفة: البنود الموجودة تبقى بنفس مفاتيح الصفحات (page keys)
 * ليتم تمريرها عبر $emit('select', page) إلى App.vue كما كان.
 */
const allSections = [
  {
    key: 'sec-dashboard',
    menuKey: 'dashboard',
    title: 'النظام',
    icon: Icon({ name: 'LayoutGrid' }),
    iconColor: '#60a5fa',
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
    icon: Icon({ name: 'Database' }),
    iconColor: '#34d399',
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
    icon: Icon({ name: 'ShoppingCart' }),
    iconColor: '#f472b6',
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
    icon: Icon({ name: 'PackageSearch' }),
    iconColor: '#fb923c',
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
    icon: Icon({ name: 'Boxes' }),
    iconColor: '#a78bfa',
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
    icon: Icon({ name: 'ShieldCheck' }),
    iconColor: '#2dd4bf',
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
    icon: Icon({ name: 'Landmark' }),
    iconColor: '#fbbf24',
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
    icon: Icon({ name: 'BookOpen' }),
    iconColor: '#60a5fa',
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
    icon: Icon({ name: 'Building2' }),
    iconColor: '#94a3b8',
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
    icon: Icon({ name: 'ChartColumn' }),
    iconColor: '#4ade80',
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
    icon: Icon({ name: 'Users' }),
    iconColor: '#818cf8',
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
    icon: Icon({ name: 'FileText' }),
    iconColor: '#22d3ee',
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
    icon: Icon({ name: 'Settings' }),
    iconColor: '#cbd5e1',
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
    icon: Icon({ name: 'CircleQuestionMark' }),
    iconColor: '#f87171',
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
</script>

<style scoped>
/* ===== حاوية القائمة الجانبية ===== */
.sidebar {
  width: 250px;
  min-width: 250px;
  background: #0a0f1a;
  color: #cbd5e1;
  font-family: Arial, 'Segoe UI', 'Noto Sans Arabic', sans-serif;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #1e293b;
  transition: width 0.2s ease, min-width 0.2s ease;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar.collapsed {
  width: 42px;
  min-width: 42px;
}

/* ===== ترويسة القائمة ===== */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.25);
  border-bottom: 1px solid #1e293b;
  position: sticky;
  top: 0;
  z-index: 2;
}

.sidebar-title {
  font-size: 12.5px;
  font-weight: bold;
  color: #ffffff;
  white-space: nowrap;
}

.sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: #cbd5e1;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  line-height: 1;
}

.sidebar-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* ===== شجرة الأقسام ===== */
.sidebar-nav {
  flex: 1;
  padding: 4px 0 12px;
}

.section-title {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  background: transparent;
  border: none;
  color: #94a3b8;
  text-align: right;
  font-size: 13.5px;
  font-weight: bold;
  padding: 9px 14px 9px 8px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s ease, color 0.12s ease;
}

.section-title:hover {
  background: rgba(255, 255, 255, 0.07);
  color: #f1f5f9;
}

.section-title.active {
  background: rgba(37, 99, 235, 0.22);
  color: #ffffff;
  border-right: 3px solid #3b82f6;
}

.section-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 22px;
}

.section-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.section-arrow {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  color: #64748b;
  transition: transform 0.18s ease;
}

/* ===== بنود القسم المفتوح ===== */
.section-items {
  list-style: none;
  margin: 0;
  padding: 2px 0 6px;
  background: rgba(15, 23, 42, 0.8);
  border-bottom: 1px solid #1e293b;
}

.group-title {
  padding: 7px 14px 3px 8px;
  font-size: 10.5px;
  font-weight: bold;
  letter-spacing: 0.3px;
  color: #64748b;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== الأوراق (العناصر النهائية) ===== */
.tree-leaf {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px 7px 8px;
  padding-inline: 8px 28px;
  font-size: 12.5px;
  color: #94a3b8;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background 0.12s ease, color 0.12s ease;
  border-right: 2px solid transparent;
}

.tree-leaf:hover {
  background: rgba(255, 255, 255, 0.07);
  color: #ffffff;
}

.tree-leaf.active {
  background: #2563eb;
  color: #ffffff;
  font-weight: bold;
  border-right-color: #60a5fa;
}

/* ===== المجموعات الفرعية المتداخلة ===== */
.tree-subgroup {
  margin: 0;
}

.tree-subgroup-title {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: #94a3b8;
  text-align: right;
  font-size: 12.5px;
  font-weight: 600;
  padding: 7px 14px 7px 8px;
  padding-inline: 8px 28px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s ease, color 0.12s ease;
}

.tree-subgroup-title:hover {
  background: rgba(255, 255, 255, 0.07);
  color: #ffffff;
}

.tree-chevron {
  font-size: 9px;
  color: #64748b;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  transition: transform 0.15s ease;
}

.tree-chevron.rotated {
  transform: rotate(90deg);
}

.tree-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-children {
  list-style: none;
  margin: 0;
  padding: 0;
}

.tree-subgroup .tree-leaf {
  padding-inline: 8px 42px;
  font-size: 12px;
  color: #7d8aa0;
}

/* ===== حركات فتح الأقسام ===== */
.section-open-enter-active,
.section-open-leave-active {
  transition:
    max-height 0.25s ease,
    opacity 0.2s ease;
  overflow: hidden;
}
.section-open-enter-from,
.section-open-leave-to {
  max-height: 0;
  opacity: 0;
}
.section-open-enter-to,
.section-open-leave-from {
  max-height: 800px;
  opacity: 1;
}

.sub-open-enter-active,
.sub-open-leave-active {
  transition:
    max-height 0.2s ease,
    opacity 0.15s ease;
  overflow: hidden;
}
.sub-open-enter-from,
.sub-open-leave-to {
  max-height: 0;
  opacity: 0;
}
.sub-open-enter-to,
.sub-open-leave-from {
  max-height: 500px;
  opacity: 1;
}

/* ===== الجوال ===== */
@media (max-width: 768px) {
  .sidebar {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 50;
    box-shadow: -2px 0 10px rgba(0, 0, 0, 0.4);
  }
  .sidebar.collapsed {
    width: 0;
    min-width: 0;
    border: none;
  }
}
</style>
