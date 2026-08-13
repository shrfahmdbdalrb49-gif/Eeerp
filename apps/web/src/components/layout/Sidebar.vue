<template>
  <!-- ===== القائمة الجانبية المساعدة (Secondary Sidebar) — شجرة أكورديون ===== -->
  <aside class="sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <span v-if="!collapsed" class="sidebar-title">{{ currentModuleLabel }}</span>
      <button
        class="sidebar-toggle"
        @click="$emit('toggle')"
        :title="collapsed ? 'توسيع القائمة' : 'طي القائمة'"
      >
        {{ collapsed ? '▶' : '◀' }}
      </button>
    </div>

    <nav v-if="!collapsed" class="sidebar-nav" role="tree">
      <template v-for="group in currentGroups" :key="group.title">
        <div
          class="tree-group"
          :class="{ expanded: expandedGroups[group.key] }"
        >
          <button class="tree-group-title" @click="toggleGroup(group.key)" type="button">
            <span class="tree-chevron">{{ expandedGroups[group.key] ? '▼' : '◀' }}</span>
            <span class="tree-label">{{ group.title }}</span>
          </button>

          <ul v-show="expandedGroups[group.key]" class="tree-children">
            <template v-for="child in group.children" :key="child.title ?? child.page">
              <!-- فرع قابل للتوسيع (مستوى ثالث) -->
              <li v-if="child.children" class="tree-subgroup" :class="{ expanded: expandedSub[child.title] }">
                <button class="tree-subgroup-title" @click="toggleSub(child.title)" type="button">
                  <span class="tree-chevron">{{ expandedSub[child.title] ? '▼' : '◀' }}</span>
                  <span class="tree-label">{{ child.title }}</span>
                </button>
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
          </ul>
        </div>
      </template>
    </nav>
  </aside>
</template>

<script setup>
/**
 * Sidebar — القائمة الجانبية المساعدة بنظام شجرة أكورديون
 *Props:
 *   - activeMenu: String  → الوحدة العلوية النشطة (sales, purchases, ...)
 *   - collapsed:  Boolean → هل القائمة مطوية
 *   - activePage: String  → الصفحة الجانبية النشطة
 * Events:
 *   - toggle        → طي/توسيع القائمة
 *   - select(page)  → النقر على بند نهائي في الشجرة
 */
import { computed, reactive } from 'vue'

const props = defineProps({
  activeMenu: { type: String, default: 'dashboard' },
  collapsed: { type: Boolean, default: false },
  activePage: { type: [String, null], default: null },
})

defineEmits(['toggle', 'select'])

// حالة التوسيع لكل مجموعة (أكورديون مستقل لكل مجموعة)
const expandedGroups = reactive({})
const expandedSub = reactive({})

const headerLabel = {
  dashboard: 'النظام',
  masterdata: 'البيانات الأساسية',
  sales: 'المبيعات',
  purchases: 'المشتريات',
  inventory: 'المخزون',
  insurance: 'التأمين الصحي',
  treasury: 'الصندوق والبنوك',
  accounting: 'الحسابات',
  profit: 'الربحية والتكاليف',
  reports: 'التقارير والتحليلات',
  admin: 'الإدارة',
  help: 'المساعدة',
}

/**
 * الشجرة الكاملة للقائمة الجانبية لكل وحدة علوية.
 * مطابقة للهيكلية المطلوبة من المستخدم (أكورديون متداخل حتى 3 مستويات).
 */
const treeByMenu = {
  dashboard: [
    {
      key: 'overview',
      title: 'نظرة عامة',
      children: [
        { page: 'dashboard', label: 'لوحة التحكم' },
        { page: 'notifications', label: 'مركز التنبيهات' },
        { page: 'stats', label: 'الإحصائيات' },
      ],
    },
  ],
  masterdata: [
    {
      key: 'basic',
      title: 'البيانات الأساسية',
      children: [
        { page: 'branches', label: 'الفروع' },
        { page: 'currencies', label: 'العملات (YER افتراضية)' },
        { page: 'taxes', label: 'الضرائب' },
        { page: 'fiscal-years', label: 'السنوات المالية' },
        { page: 'payment-methods', label: 'طرق الدفع' },
        { page: 'settings', label: 'إعدادات النظام العامة' },
      ],
    },
  ],
  sales: [
    {
      key: 'operations',
      title: 'عمليات البيع',
      children: [
        { page: 'pos', label: 'نقطة البيع POS' },
        { page: 'customers', label: 'العملاء (المرضى)' },
        { page: 'doctors', label: 'الأطباء وجهات الوصف' },
        { page: 'prescriptions', label: 'الوصفات الطبية' },
        { page: 'invoices', label: 'فواتير المبيعات (نقدي / آجل / تأمين)' },
        { page: 'returns', label: 'مرتجعات المبيعات' },
        { page: 'collections', label: 'التحصيل' },
        { page: 'price-lists', label: 'قوائم أسعار البيع' },
        { page: 'discounts', label: 'الخصومات والعروض' },
      ],
    },
  ],
  purchases: [
    {
      key: 'procurement',
      title: 'المشتريات والسداد',
      children: [
        { page: 'suppliers', label: 'الموردون (شركات الأدوية)' },
        { page: 'purchase-requests', label: 'طلبات الشراء' },
        { page: 'purchase-orders', label: 'أوامر الشراء' },
        { page: 'purchase-invoices', label: 'فواتير المشتريات' },
        { page: 'receiving', label: 'استلام الشحنات' },
        { page: 'purchase-returns', label: 'مرتجعات المشتريات' },
        { page: 'supplier-payments', label: 'السداد للموردين' },
      ],
    },
  ],
  inventory: [
    {
      key: 'items',
      title: 'الأصناف والبيانات',
      children: [
        { page: 'items', label: 'الأصناف (الأدوية والمستلزمات)' },
        {
          title: 'قاعدة بيانات الأدوية',
          children: [
            { page: 'drug-commercial-name', label: 'الاسم التجاري' },
            { page: 'drug-scientific-name', label: 'الاسم العلمي' },
            { page: 'drug-manufacturer', label: 'الشركة المصنعة' },
            { page: 'drug-dosage-form', label: 'التركيز والشكل الدوائي' },
            { page: 'drug-alternatives', label: 'البدائل الدوائية' },
            { page: 'drug-interactions', label: 'التفاعلات الدوائية' },
            { page: 'drug-requires-rx', label: 'يحتاج وصفة؟' },
          ],
        },
        { page: 'therapeutic-groups', label: 'المجموعات العلاجية' },
        { page: 'units', label: 'الوحدات' },
      ],
    },
    {
      key: 'stock',
      title: 'الحركة والمخازن',
      children: [
        { page: 'warehouses', label: 'المخازن والفروع' },
        { page: 'receiving-stock', label: 'التوريد' },
        { page: 'dispensing', label: 'الصرف' },
        { page: 'transfers', label: 'التحويل بين الفروع' },
        { page: 'stocktake', label: 'الجرد' },
        { page: 'stock-movement', label: 'حركة الأصناف والتشغيلات' },
        { page: 'expiry', label: 'مراقبة الصلاحية' },
      ],
    },
  ],
  insurance: [
    {
      key: 'claims',
      title: 'التأمين الصحي',
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
  treasury: [
    {
      key: 'cash',
      title: 'الصندوق والبنوك',
      children: [
        { page: 'cash-boxes', label: 'الصناديق' },
        { page: 'banks', label: 'البنوك' },
        { page: 'receipt-voucher', label: 'سند قبض' },
        { page: 'payment-voucher', label: 'سند صرف' },
        { page: 'financial-transfers', label: 'التحويلات المالية' },
        { page: 'cheques', label: 'الشيكات' },
      ],
    },
  ],
  accounting: [
    {
      key: 'ledger',
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
      key: 'aging',
      title: 'الذمم وأعمار الديون',
      children: [
        { page: 'aging-customers', label: 'أعمار الديون (عملاء / تأمين)' },
        { page: 'aging-suppliers', label: 'أعمار الديون (موردون)' },
        { page: 'bad-debt-provision', label: 'مخصص الديون المشكوك فيها' },
      ],
    },
  ],
  profit: [
    {
      key: 'costs',
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
  reports: [
    {
      key: 'sales-reports',
      title: 'تقارير المبيعات',
      children: [
        { page: 'rpt-sales-item', label: 'حسب الصنف' },
        { page: 'rpt-sales-doctor', label: 'حسب الطبيب' },
        { page: 'rpt-sales-insurance', label: 'حسب التأمين' },
      ],
    },
    {
      key: 'other-reports',
      title: 'التقارير الأخرى',
      children: [
        { page: 'reports-purchases', label: 'تقارير المشتريات' },
      ],
    },
    {
      key: 'inventory-reports',
      title: 'تقارير المخزون',
      children: [
        { page: 'rpt-expiry', label: 'الصلاحية' },
        { page: 'rpt-turnover', label: 'دوران المخزون' },
        { page: 'rpt-movement', label: 'حركة الأصناف' },
      ],
    },
    {
      key: 'profit-reports',
      title: 'تقارير الربحية',
      children: [{ page: 'reports-profit', label: 'تقارير الربحية' }],
    },
    {
      key: 'financial-reports',
      title: 'التقارير المالية',
      children: [
        { page: 'trial-balance', label: 'ميزان المراجعة' },
        { page: 'general-ledger', label: 'الأستاذ العام والمساعد' },
        { page: 'income-statement', label: 'قائمة الدخل' },
        { page: 'balance-sheet', label: 'الميزانية العمومية' },
      ],
    },
    {
      key: 'tax-reports',
      title: 'التقارير الضريبية',
      children: [{ page: 'tax-reports', label: 'التقارير الضريبية' }],
    },
    {
      key: 'custom-reports',
      title: 'التقارير المخصصة',
      children: [{ page: 'custom-reports', label: 'التقارير المخصصة' }],
    },
  ],
  admin: [
    {
      key: 'security',
      title: 'المستخدمون والتشغيل',
      children: [
        { page: 'users', label: 'المستخدمون والصلاحيات (RBAC)' },
        { page: 'employees', label: 'الموظفون والورديات' },
        { page: 'audit', label: 'سجل العمليات (Audit Log)' },
        { page: 'backup', label: 'النسخ الاحتياطي' },
        { page: 'branches', label: 'إدارة الفروع' },
        { page: 'notification-settings', label: 'إعدادات الإشعارات' },
        { page: 'system-monitor', label: 'مراقبة النظام' },
      ],
    },
  ],
  help: [
    {
      key: 'support',
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
}

const currentModuleLabel = computed(() => headerLabel[props.activeMenu] ?? 'القائمة')
const currentGroups = computed(() => treeByMenu[props.activeMenu] ?? treeByMenu.dashboard)

function toggleGroup(key) {
  expandedGroups[key] = !expandedGroups[key]
}

function toggleSub(title) {
  expandedSub[title] = !expandedSub[title]
}
</script>

<style scoped>
/* ===== حاوية القائمة الجانبية ===== */
.sidebar {
  width: 260px;
  min-width: 260px;
  background: var(--sidebar-bg, #1e2a3a);
  color: var(--sidebar-color, #e8eef5);
  font-family: Arial, 'Segoe UI', sans-serif;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border-color, #2c3e50);
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
  padding: 8px 10px;
  background: var(--sidebar-header-bg, rgba(0, 0, 0, 0.18));
  border-bottom: 1px solid var(--border-color, #2c3e50);
  position: sticky;
  top: 0;
  z-index: 2;
}

.sidebar-title {
  font-size: 13px;
  font-weight: bold;
  color: var(--sidebar-title-color, #ffffff);
  white-space: nowrap;
}

.sidebar-toggle {
  background: transparent;
  border: none;
  color: var(--sidebar-color, #e8eef5);
  font-size: 12px;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  line-height: 1;
}

.sidebar-toggle:hover {
  background: rgba(255, 255, 255, 0.12);
}

/* ===== شجرة الأكورديون ===== */
.sidebar-nav {
  flex: 1;
  padding: 6px 0;
}

.tree-group {
  margin-bottom: 4px;
}

.tree-group-title,
.tree-subgroup-title {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--sidebar-group-color, #c9d6e2);
  text-align: right;
  font-size: 13px;
  font-weight: bold;
  padding: 7px 12px 7px 8px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s ease;
}

.tree-group-title:hover,
.tree-subgroup-title:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.tree-chevron {
  font-size: 9px;
  color: var(--sidebar-chevron, #8ea3b8);
  flex-shrink: 0;
  display: inline-block;
  transition: transform 0.15s ease;
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

/* ===== الأوراق (العناصر النهائية) ===== */
.tree-leaf {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px 6px 8px;
  padding-inline: 8px 30px;
  font-size: 12.5px;
  color: var(--sidebar-leaf-color, #b8c6d4);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background 0.15s ease, color 0.15s ease;
  border-right: 2px solid transparent;
}

.tree-leaf:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.tree-leaf.active {
  background: var(--sidebar-active-bg, rgba(52, 120, 220, 0.35));
  color: #ffffff;
  font-weight: bold;
  border-right-color: var(--accent-color, #4a90d9);
}

/* ===== المجموعات الفرعية المتداخلة ===== */
.tree-subgroup {
  margin: 0;
}

.tree-subgroup-title {
  padding-inline: 8px 30px;
  font-size: 12.5px;
  font-weight: 600;
}

.tree-subgroup .tree-leaf {
  padding-inline: 8px 46px;
  font-size: 12px;
  color: var(--sidebar-subleaf-color, #a7b8c9);
}

/* ===== الجوال ===== */
@media (max-width: 768px) {
  .sidebar {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 50;
    box-shadow: -2px 0 10px rgba(0, 0, 0, 0.3);
  }
  .sidebar.collapsed {
    width: 0;
    min-width: 0;
    border: none;
  }
}
</style>
