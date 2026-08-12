<template>
  <!-- ===== القائمة الجانبية (Sidebar) ===== -->
  <aside class="sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <span v-if="!collapsed">{{ currentHeaderLabel }}</span>
      <button
        class="sidebar-toggle"
        @click="$emit('toggle')"
        :title="collapsed ? 'توسيع القائمة' : 'طي القائمة'"
      >
        {{ collapsed ? '▶' : '◀' }}
      </button>
    </div>

    <ul v-if="!collapsed" class="sidebar-menu">
      <template v-for="section in currentSections" :key="section.title">
        <li class="sidebar-section">{{ section.title }}</li>
        <li
          v-for="item in section.items"
          :key="item.page"
          class="sidebar-item"
          :class="{ active: activePage === item.page }"
          @click="$emit('select', item.page)"
        >
          {{ item.label }}
        </li>
      </template>
    </ul>
  </aside>
</template>

<script setup>
/**
 * Sidebar — القائمة الجانبية التي تتغير بنودها حسب القائمة العلوية النشطة
 * Props:
 *   - activeMenu: String  → القائمة العلوية النشطة (sales, purchases, ...)
 *   - collapsed:  Boolean → هل القائمة مطوية
 * Events:
 *   - toggle       → طي/توسيع القائمة
 *   - select(page) → النقر على بند جانبي
 */
const props = defineProps({
  activeMenu: {
    type: String,
    default: 'sales',
  },
  collapsed: {
    type: Boolean,
    default: false,
  },
  /** الصفحة النشطة داخل القائمة الجانبية (اختياري، للتمييز البصري) */
  activePage: {
    type: [String, null],
    default: null,
  },
})

import { computed } from 'vue'

defineEmits(['toggle', 'select'])

const headerLabel = {
  dashboard:  'لوحة التحكم',
  sales:      'المبيعات',
  purchases:  'المشتريات',
  inventory:  'المخزون',
  insurance:  'التأمين',
  accounting: 'الحسابات',
  reports:    'التقارير',
  admin:      'الإدارة',
}

/** تعريف كامل لبنود القائمة الجانبية لكل قائمة علوية — مطابق لبنيات index.html */
const sectionsByMenu = {
  sales: [
    {
      title: 'المبيعات',
      items: [
        { page: 'pos',                label: 'نقطة البيع POS' },
        { page: 'customers',          label: 'العملاء (المرضى)' },
        { page: 'doctors',            label: 'الأطباء' },
        { page: 'prescriptions',      label: 'الوصفات الطبية' },
        { page: 'invoices',           label: 'فواتير المبيعات' },
        { page: 'returns',            label: 'مرتجعات المبيعات' },
        { page: 'collections',        label: 'التحصيل' },
      ],
    },
  ],
  purchases: [
    {
      title: 'المشتريات',
      items: [
        { page: 'suppliers',          label: 'الموردون' },
        { page: 'purchase-orders',    label: 'طلبات الشراء' },
        { page: 'purchase-invoices',  label: 'فواتير المشتريات' },
        { page: 'purchase-returns',   label: 'مرتجعات المشتريات' },
      ],
    },
  ],
  inventory: [
    {
      title: 'المخزون',
      items: [
        { page: 'items',              label: 'الأصناف' },
        { page: 'warehouses',         label: 'المخازن' },
        { page: 'expiry',             label: 'مراقبة الصلاحية' },
        { page: 'stocktake',          label: 'الجرد' },
        { page: 'transfers',          label: 'تحويلات الفروع' },
      ],
    },
  ],
  insurance: [
    {
      title: 'التأمين',
      items: [
        { page: 'insurance-companies', label: 'شركات التأمين' },
        { page: 'insurance-cards',     label: 'بطاقات التأمين' },
        { page: 'insurance-claims',    label: 'المطالبات' },
      ],
    },
  ],
  accounting: [
    {
      title: 'الحسابات',
      items: [
        { page: 'accounts',           label: 'دليل الحسابات' },
        { page: 'journal',            label: 'القيود اليومية' },
        { page: 'treasury',           label: 'الصندوق والبنوك' },
        { page: 'payable',            label: 'الذمم (الموردون)' },
        { page: 'receivable',         label: 'الذمم (العملاء)' },
      ],
    },
  ],
  reports: [
    {
      title: 'التقارير',
      items: [
        { page: 'reports-sales',      label: 'تقارير المبيعات' },
        { page: 'reports-inventory',  label: 'تقارير المخزون' },
        { page: 'reports-financial',  label: 'التقارير المالية' },
        { page: 'reports-insurance',  label: 'تقارير التأمين' },
      ],
    },
  ],
  admin: [
    {
      title: 'الإدارة',
      items: [
        { page: 'users',              label: 'المستخدمون والأدوار' },
        { page: 'branches',           label: 'الفروع' },
        { page: 'settings',           label: 'إعدادات النظام' },
        { page: 'audit',              label: 'سجل العمليات' },
      ],
    },
  ],
  dashboard: [
    {
      title: 'نظرة عامة',
      items: [
        { page: 'dashboard',          label: 'لوحة التحكم' },
        { page: 'notifications',      label: 'التنبيهات' },
      ],
    },
  ],
}

const currentSections = sectionsByMenu[props.activeMenu] ?? sectionsByMenu.dashboard

const currentHeaderLabel = computed(() => headerLabel[props.activeMenu] ?? 'القائمة')
</script>
