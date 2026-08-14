<template>
  <!-- ===== القائمة الجانبية (Bolt-style Dark Navigation) ===== -->
  <aside class="sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <span v-if="!collapsed" class="sidebar-title">القائمة الرئيسية</span>
      <button
        class="sidebar-toggle"
        @click="$emit('toggle')"
        :title="collapsed ? 'توسيع القائمة' : 'طي القائمة'"
      >
        {{ collapsed ? '▶' : '◀' }}
      </button>
    </div>

    <nav v-if="!collapsed" class="sidebar-nav" role="tree">
      <template v-for="section in allSections" :key="section.key">
        <!-- عنوان القسم + أيقونته الملونة -->
        <button
          class="section-title"
          :class="{ active: activeMenu === section.menuKey }"
          type="button"
          @click="$emit('select', section.defaultPage)"
        >
          <span class="section-icon">{{ section.icon }}</span>
          <span class="section-label">{{ section.title }}</span>
          <span class="section-arrow">{{ activeMenu === section.menuKey ? '▼' : '◀' }}</span>
        </button>

        <!-- بنود القسم موسعة دائمًا داخل الوحدة النشطة -->
        <ul v-if="activeMenu === section.menuKey" class="section-items">
          <template v-for="group in section.groups" :key="group.title">
            <li v-if="group.title" class="group-title">{{ group.title }}</li>
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
          </template>
        </ul>
      </template>
    </nav>
  </aside>
</template>

<script setup>
/**
 * Sidebar — القائمة الجانبية الداكنة (Bolt-style)
 * تُعرض جميع الوحدات كأقسام، والقسم النشط تكون بنوده موسعة بالكامل.
 * Props:
 *   - activeMenu: String  → الوحدة العلوية النشطة (sales, purchases, ...)
 *   - collapsed:  Boolean → هل القائمة مطوية
 *   - activePage: String  → الصفحة الجانبية النشطة
 * Events:
 *   - toggle        → طي/توسيع القائمة
 *   - select(page)  → النقر على بند نهائي في الشجرة
 */
import { reactive } from 'vue'

const props = defineProps({
  activeMenu: { type: String, default: 'dashboard' },
  collapsed: { type: Boolean, default: false },
  activePage: { type: [String, null], default: null },
})

defineEmits(['toggle', 'select'])

// حالة التوسيع للمجموعات الفرعية فقط (المستوى الثالث)
const expandedSub = reactive({})
function toggleSub(title) {
  expandedSub[title] = !expandedSub[title]
}

/**
 * جميع وحدات النظام كأقسام مع أيقوناتها الملونة وبنودها.
 * مطابقة لبنية الشجرة السابقة — لا تغيير على روابط الصفحات.
 */
const allSections = [
  {
    key: 'sec-dashboard',
    menuKey: 'dashboard',
    title: 'النظام',
    icon: '🎛️',
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
    icon: '🗃️',
    defaultPage: 'settings',
    groups: [
      {
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
  },
  {
    key: 'sec-sales',
    menuKey: 'sales',
    title: 'المبيعات',
    icon: '🛒',
    defaultPage: 'pos',
    groups: [
      {
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
  },
  {
    key: 'sec-purchases',
    menuKey: 'purchases',
    title: 'المشتريات',
    icon: '📦',
    defaultPage: 'purchase-invoices',
    groups: [
      {
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
  },
  {
    key: 'sec-inventory',
    menuKey: 'inventory',
    title: 'المخزون',
    icon: '🏷️',
    defaultPage: 'items',
    groups: [
      {
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
  },
  {
    key: 'sec-insurance',
    menuKey: 'insurance',
    title: 'التأمين الصحي',
    icon: '🏥',
    defaultPage: 'insurance-claims',
    groups: [
      {
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
  },
  {
    key: 'sec-treasury',
    menuKey: 'treasury',
    title: 'الصندوق والبنوك',
    icon: '🏦',
    defaultPage: 'receipt-voucher',
    groups: [
      {
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
  },
  {
    key: 'sec-accounting',
    menuKey: 'accounting',
    title: 'الحسابات',
    icon: '💰',
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
          { page: 'aging-customers', label: 'أعمار الديون (عملاء / تأمين)' },
          { page: 'aging-suppliers', label: 'أعمار الديون (موردون)' },
          { page: 'bad-debt-provision', label: 'مخصص الديون المشكوك فيها' },
        ],
      },
    ],
  },
  {
    key: 'sec-profit',
    menuKey: 'profit',
    title: 'الربحية والتكاليف',
    icon: '📉',
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
    key: 'sec-reports',
    menuKey: 'reports',
    title: 'التقارير',
    icon: '📈',
    defaultPage: 'reports-sales',
    groups: [
      {
        title: 'تقارير المبيعات',
        children: [
          { page: 'rpt-sales-item', label: 'حسب الصنف' },
          { page: 'rpt-sales-doctor', label: 'حسب الطبيب' },
          { page: 'rpt-sales-insurance', label: 'حسب التأمين' },
        ],
      },
      {
        title: 'التقارير الأخرى',
        children: [
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
        title: 'تقارير الربحية',
        children: [{ page: 'reports-profit', label: 'تقارير الربحية' }],
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
        title: 'التقارير الضريبية',
        children: [{ page: 'tax-reports', label: 'التقارير الضريبية' }],
      },
      {
        title: 'التقارير المخصصة',
        children: [{ page: 'custom-reports', label: 'التقارير المخصصة' }],
      },
    ],
  },
  {
    key: 'sec-admin',
    menuKey: 'admin',
    title: 'الإدارة',
    icon: '⚙️',
    defaultPage: 'users',
    groups: [
      {
        title: 'المستخدمون والتشغيل',
        children: [
          { page: 'settings', label: 'إعدادات النظام' },
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
  },
  {
    key: 'sec-help',
    menuKey: 'help',
    title: 'المساعدة',
    icon: '❓',
    defaultPage: 'about',
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
  background: transparent;
  border: none;
  color: #cbd5e1;
  font-size: 12px;
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
  gap: 8px;
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
  font-size: 14px;
  flex-shrink: 0;
}

.section-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.section-arrow {
  font-size: 9px;
  color: #64748b;
  flex-shrink: 0;
}

/* ===== بنود القسم النشط ===== */
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

.tree-subgroup .tree-leaf {
  padding-inline: 8px 42px;
  font-size: 12px;
  color: #7d8aa0;
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
