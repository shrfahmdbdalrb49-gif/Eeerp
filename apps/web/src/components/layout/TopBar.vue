<template>
  <!-- ===== الشريط العلوي المكتبي الموحّد — هوية شرف ERP ===== -->
  <header class="top-bar" role="banner">
    <!-- العلامة التجارية -->
    <div class="brand">
      <span class="brand-mark" aria-hidden="true">ش</span>
      <span class="brand-name">شرف</span>
      <span class="brand-sub">ERP</span>
    </div>

    <!-- قائمة الأقسام الأفقية -->
    <nav class="menu-bar" role="menubar" aria-label="القائمة الرئيسية" @mouseleave="onBarLeave">
      <template v-for="section in allSections" :key="section.key">
        <div class="menu-wrapper" @mouseenter="onHover(section.menuKey)">
          <button
            type="button"
            class="menu-item"
            role="menuitem"
            tabindex="0"
            :data-menu-key="section.menuKey"
            :class="{ open: openMenu === section.menuKey }"
            @click="toggleMenu(section.menuKey)"
            @touchend.prevent.stop="toggleMenu(section.menuKey)"
            @keydown.enter.space.prevent="toggleMenu(section.menuKey)"
          >
            <span class="menu-label">{{ section.title }}</span>
            <svg class="menu-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

        </div>
      </template>
    </nav>

    <!-- رسالة تنبيه للشاشات قيد التطوير -->
    <transition name="toast-msg">
      <div v-if="notImplMsg" class="notimpl-toast" role="alert">
        <svg class="notimpl-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
        <span>{{ notImplMsg }}</span>
        <button type="button" class="notimpl-close" @click="notImplMsg = null" aria-label="إغلاق">×</button>
      </div>
    </transition>

    <!-- البحث السريع + المستخدم -->
    <div class="top-tools">
      <div class="search-box">
        <input
          ref="searchInput"
          v-model="searchText"
          type="text"
          class="search-input"
          placeholder="بحث... (Ctrl+F)"
          aria-label="البحث السريع في الشاشات"
          @keydown="handleSearchKey"
        />
      </div>
      <div class="user-chip" title="المستخدم الحالي">
        <span class="user-initial">{{ avatarChar }}</span>
        <div class="user-text">
          <span class="user-name">{{ userName }}</span>
          <span v-if="roleLabel && roleLabel !== userName" class="user-role">{{ roleLabel }}</span>
        </div>
      </div>
    </div>
  </header>

  <!-- ===== القائمة المنسدلة — تُعرض فوق كل شيء خارج الشريط (Teleport) =====
       الحل يضمن ظهور القائمة فوق أي نافذة مفتوحة بغض النظر عن طبقات stacking -->
  <teleport to="body">
  <transition name="dropdown">
    <div v-if="openMenu" class="dropdown-transition-shell">
      <div v-for="section in allSections" :key="'tp-' + section.menuKey">
      <div
        v-if="openMenu === section.menuKey"
        class="dropdown-panel dropdown-panel--teleported"
        :style="panelStyle"
        role="menu"
        @mouseenter="keepOpen = true"
        @mouseleave="keepOpen = false"
        @click.stop
      >
        <div class="dropdown-scroll">
          <template v-for="group in section.groups" :key="'g-' + group.title">
            <div v-if="group.title" :class="['dropdown-group-title', { 'is-report-group': /^تقارير/.test(group.title) }]">{{ group.title }}</div>
            <template v-for="child in group.children" :key="'c-' + (child.title ?? child.page)">
              <div v-if="child.children" class="dropdown-group-title dropdown-group-title--nested">{{ child.title }}</div>
              <template v-for="leaf in (child.children || [child])" :key="'l-' + leaf.page">
                <button
                  type="button"
                  class="dropdown-item"
                  :class="{ active: activePage === leaf.page, pending: !isImplemented(leaf.page), nested: !!child.children }"
                  @click.stop="pick(section.menuKey, leaf.page)"
                >
                  <span class="dropdown-item-label">{{ leaf.label }}</span>
                  <span class="dropdown-item-trail">
                    <svg v-if="child.children" class="dropdown-item-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>
                    <span v-if="!isImplemented(leaf.page)" class="dropdown-item-badge" title="هذه الشاشة قيد التطوير وغير منفذة فعليًا">قيد التطوير</span>
                  </span>
                </button>
              </template>
            </template>
          </template>
        </div>
      </div>
      </div>
    </div>
  </transition>
  </teleport>
</template>

<script setup>
/**
 * TopBar — الشريط العلوي المكتبي الموحّد (Desktop ERP)
 * يدمج العلامة التجارية + قائمة الأقسام المنسدلة + البحث السريع + المستخدم
 * في شريط واحد داكن بهوية شرف (كحلي عميق + خط ذهبي).
 * Props:
 *   - activePage: String|null → الصفحة النشطة
 *   - userName:   String      → اسم المستخدم الحالي
 *   - roleLabel:  String      → وصف الدور
 * Events:
 *   - select(page) → فتح شاشة
 */
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  activePage: { type: [String, null], default: null },
  userName: { type: String, default: 'مدير النظام' },
  roleLabel: { type: String, default: 'مدير النظام' },
})

const emit = defineEmits(['select'])

// ===== قائمة الأقسام الـ14 =====
// قائمة مفاتيح الصفحات المنفذة فعليًا (لها شاشة تعمل وتحفظ بيانات حقيقية)
// كل ما هو خارجها يُعرض في القوائم بعلامة «قيد التطوير» ورسالة واضحة بدل شاشة فارغة.
const implementedPages = new Set([
  'dashboard',
  'customers', 'suppliers', 'doctors', 'items',
  'pos', 'invoices', 'sales-invoices', 'prescriptions', 'returns',
  'collections', 'aging-customers',
  'purchase-invoices', 'receiving', 'transfers',
  'supplier-payments', 'payable', 'aging-suppliers',
  'expiry',
  'treasury', 'cash-boxes', 'banks', 'cheques', 'receipt-voucher', 'payment-voucher', 'financial-transfers',
  'accounts', 'journal', 'opening-entries', 'posting', 'period-close',
  'users', 'branches', 'settings', 'audit',
  'reports-sales', 'reports-inventory', 'reports-financial',
  'trial-balance', 'income-statement', 'balance-sheet', 'general-ledger',
])

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
          { page: 'purchase-invoices', label: 'فواتير المشتريات' },
          { page: 'purchase-orders', label: 'أوامر الشراء' },
          { page: 'purchase-requests', label: 'طلبات الشراء' },
          { page: 'receiving', label: 'استلام الشحنات' },
          { page: 'purchase-returns', label: 'مرتجعات المشتريات' },
        ],
      },
      {
        title: 'الذمم والسداد',
        children: [
          { page: 'supplier-payments', label: 'السداد للموردين' },
          { page: 'payable', label: 'الذمم (الموردون)' },
          { page: 'aging-suppliers', label: 'أعمار ديون الموردين' },
        ],
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
        title: 'الحركات',
        children: [
          { page: 'stock-movement', label: 'حركة الأصناف والتشغيلات' },
          { page: 'receiving-stock', label: 'التوريد' },
          { page: 'dispensing', label: 'الصرف' },
          { page: 'transfers', label: 'تحويلات المخازن' },
          { page: 'stocktake', label: 'الجرد' },
        ],
      },
      {
        title: 'الرقابة',
        children: [
          { page: 'expiry', label: 'مراقبة الصلاحية' },
          { page: 'item-cost', label: 'تكلفة الأصناف' },
          { page: 'avg-cost', label: 'متوسط التكلفة' },
          { page: 'rpt-turnover', label: 'دوران المخزون' },
          { page: 'rpt-movement', label: 'حركة الأصناف' },
        ],
      },
    ],
  },
  {
    key: 'sec-insurance',
    menuKey: 'insurance',
    title: 'التأمين الصحي',
    defaultPage: 'insurance-companies',
    groups: [
      {
        title: 'التأمين',
        children: [
          { page: 'insurance-companies', label: 'شركات التأمين' },
          { page: 'insurance-cards', label: 'بطاقات التأمين' },
          { page: 'insurance-claims', label: 'المطالبات' },
          { page: 'approvals', label: 'الموافقات المسبقة' },
          { page: 'rejected-claims', label: 'المطالبات المرفوضة' },
          { page: 'settlements', label: 'التسويات' },
          { page: 'reports-insurance', label: 'تقارير التأمين' },
          { page: 'rpt-sales-insurance', label: 'مبيعات التأمين' },
        ],
      },
    ],
  },
  {
    key: 'sec-treasury',
    menuKey: 'treasury',
    title: 'الصندوق والبنوك',
    defaultPage: 'treasury',
    groups: [
      {
        title: 'الصناديق والبنوك',
        children: [
          { page: 'treasury', label: 'الصندوق والبنوك' },
          { page: 'cash-boxes', label: 'الصناديق' },
          { page: 'banks', label: 'البنوك' },
          { page: 'cheques', label: 'الشيكات' },
          { page: 'financial-transfers', label: 'التحويلات المالية' },
        ],
      },
      {
        title: 'السندات',
        children: [
          { page: 'receipt-voucher', label: 'سند قبض' },
          { page: 'payment-voucher', label: 'سند صرف' },
        ],
      },
      {
        title: 'التسويات',
        children: [
          { page: 'bank-reconciliation', label: 'التسويات البنكية' },
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
        title: 'الدليل والقيود',
        children: [
          { page: 'accounts', label: 'دليل الحسابات' },
          { page: 'journal', label: 'القيود اليومية' },
          { page: 'opening-entries', label: 'القيود الافتتاحية' },
          { page: 'posting', label: 'الترحيل المحاسبي' },
          { page: 'period-close', label: 'إقفال الفترات' },
        ],
      },
      {
        title: 'المستويات المحاسبية',
        children: [
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
          { page: 'fixed-assets', label: 'دليل الأصول الثابتة' },
          { page: 'asset-inventory', label: 'جرد الأصول' },
          { page: 'asset-depreciation', label: 'إهلاك الأصول' },
          { page: 'asset-disposal', label: 'بيع واستبعاد الأصول' },
        ],
      },
    ],
  },
  {
    key: 'sec-profit',
    menuKey: 'profit',
    title: 'الربحية والتكاليف',
    defaultPage: 'reports-profit',
    groups: [
      {
        title: 'الربحية',
        children: [
          { page: 'profit-margin', label: 'هوامش الربح' },
          { page: 'drug-profit', label: 'ربحية الأدوية' },
          { page: 'branch-profit', label: 'ربحية الفروع' },
          { page: 'pricing-policy', label: 'سياسات التسعير' },
          { page: 'reports-profit', label: 'تقارير الربحية' },
        ],
      },
    ],
  },
  {
    key: 'sec-hr',
    menuKey: 'hr',
    title: 'الموارد البشرية',
    defaultPage: 'employees',
    groups: [
      {
        title: 'الموظفون والرواتب',
        children: [
          { page: 'employees', label: 'الموظفون والورديات' },
          { page: 'hr-attendance', label: 'الحضور والانصراف' },
          { page: 'hr-loans', label: 'السلف والخصومات' },
          { page: 'payroll', label: 'مسيرات الرواتب' },
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
    defaultPage: 'reports-financial',
    groups: [
      {
        title: 'التقارير التشغيلية',
        children: [
          { page: 'reports-sales', label: 'تقارير المبيعات' },
          { page: 'rpt-sales-item', label: 'المبيعات حسب الصنف' },
          { page: 'rpt-sales-doctor', label: 'المبيعات حسب الطبيب' },
          { page: 'rpt-expiry', label: 'تقرير الصلاحية' },
          { page: 'reports-purchases', label: 'تقارير المشتريات' },
          { page: 'reports-inventory', label: 'تقارير المخزون' },
        ],
      },
      {
        title: 'القوائم والتقارير المالية',
        children: [
          { page: 'trial-balance', label: 'ميزان المراجعة' },
          { page: 'income-statement', label: 'قائمة الدخل' },
          { page: 'balance-sheet', label: 'الميزانية العمومية' },
          { page: 'general-ledger', label: 'الأستاذ العام والمساعد' },
          { page: 'reports-financial', label: 'التقارير المالية' },
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
        title: 'إدارة النظام',
        children: [
          { page: 'users', label: 'المستخدمون والأدوار' },
          { page: 'branches', label: 'الفروع' },
          { page: 'settings', label: 'إعدادات النظام' },
          { page: 'backup', label: 'النسخ الاحتياطي' },
          { page: 'audit', label: 'سجل العمليات (Audit)' },
          { page: 'system-monitor', label: 'مراقبة النظام' },
          { page: 'notification-settings', label: 'إعدادات الإشعارات' },
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
        title: 'المساعدة والدعم',
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

/**
 * تموضع القائمة المنسدلة: تُعرض fixed أعلى كل العناصر (خارج شجرة الشريط)
 * حتى لا تُغطى بأي نافذة مفتوحة مهما كانت طبقاتها.
 */
const panelStyle = ref({})

function positionMenu(sectionKey) {
  const button = document.querySelector(
    `.menu-wrapper .menu-item.open, .menu-item[data-menu-key="${sectionKey}"].open`
  )
  if (!button) return
  const r = button.getBoundingClientRect()
  // في RTL: القسم يمتد من r.left حتى r.right؛ القائمة بعرض ثابت وتبدأ عند الحافة اليمنى للقسم
  panelStyle.value = {
    position: 'fixed',
    top: '46px',
    left: r.left + 'px',
    width: '218px',
    zIndex: 9999,
    boxShadow: '0 10px 28px rgba(8, 14, 28, 0.35)',
  }
}

function toggleMenu(key) {
  // النقر على قسم مغلق يفتحه فورًا — النقر على قسم مفتوح يغلقه
  if (openMenu.value === key) {
    openMenu.value = null
  } else {
    openMenu.value = key
    keepOpen.value = false
    nextTick(() => positionMenu(key))
  }
}

/**
 * التمرير بالفأرة فوق أي قسم: فتح قائمته فورًا (سلوك سطح المكتب)
 * — مضمون الظهور حتى لو لم تكن أي قائمة مفتوحة سابقًا.
 */
let lastHoverKey = null
function onHover(key) {
  if (lastHoverKey === key) return
  lastHoverKey = key
  openMenu.value = key
  keepOpen.value = false
  nextTick(() => positionMenu(key))
}

function pick(sectionKey, page) {
  keepOpen.value = true
  if (!implementedPages.has(page)) {
    // قسم غير منفذ: لا نفتح شاشة فارغة ولا نُوحِي بأنه يعمل — رسالة واضحة فقط
    const child = (allSections.find(s => s.menuKey === sectionKey)?.groups || [])
      .flatMap(g => g.children || [])
      .find(c => c.page === page)
    showNotImplemented(child ? child.label : page)
    openMenu.value = null
    return
  }
  openMenu.value = null
  emit('select', page)
}

// ===== رسالة توضيحية للشاشات غير المنفذة =====
const notImplMsg = ref(null)
let notImplTimer = null
function showNotImplemented(label) {
  notImplMsg.value = `شاشة «${label}» قيد التطوير — غير منفذة فعليًا بعد ولا تحفظ أي بيانات.`
  if (notImplTimer) clearTimeout(notImplTimer)
  notImplTimer = setTimeout(() => { notImplMsg.value = null }, 6000)
}

let pointerStartedInTopBar = false
function onGlobalPointerDown(e) {
  // يسجّل بداية اللمس/النقر: هل بدأت من داخل الشريط العلوي؟
  pointerStartedInTopBar = !!(e && e.target && e.target.closest && e.target.closest('.top-bar'))
}
function onDocClick(e) {
  // الإغلاق فقط إذا بدأ النقر من خارج الشريط العلوي — يمنع إغلاقًا خاطئًا على اللمس
  if (pointerStartedInTopBar) return
  if (e && e.target && e.target.closest && e.target.closest('.top-bar')) return
  if (!keepOpen.value) openMenu.value = null
  keepOpen.value = false
}

/** إغلاق القائمة عند مغادرة الشريط العلوي بالكامل بالفأرة (سلوك سطح المكتب) */
function onBarLeave() {
  if (!keepOpen.value) openMenu.value = null
}

let timer = null
onMounted(() => {
  document.addEventListener('pointerdown', onGlobalPointerDown, true)
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', globalShortcut)
  timer = setInterval(() => {
    if (keepOpen.value) keepOpen.value = false
  }, 30_000)
})
onUnmounted(() => {
  document.removeEventListener('pointerdown', onGlobalPointerDown, true)
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', globalShortcut)
  if (timer) clearInterval(timer)
})

// ===== البحث السريع =====
const searchInput = ref(null)
const searchText = ref('')

const searchablePages = [
  { page: 'pos', label: 'نقطة البيع POS' },
  { page: 'invoices', label: 'فواتير المبيعات' },
  { page: 'sales-invoices', label: 'فواتير المبيعات' },
  { page: 'customers', label: 'العملاء (المرضى)' },
  { page: 'doctors', label: 'الأطباء' },
  { page: 'prescriptions', label: 'الوصفات الطبية' },
  { page: 'returns', label: 'مرتجعات المبيعات' },
  { page: 'collections', label: 'التحصيل' },
  { page: 'suppliers', label: 'الموردون' },
  { page: 'purchase-invoices', label: 'فواتير المشتريات' },
  { page: 'receiving', label: 'استلام الشحنات' },
  { page: 'purchase-returns', label: 'مرتجعات المشتريات' },
  { page: 'supplier-payments', label: 'السداد للموردين' },
  { page: 'items', label: 'الأصناف (الأدوية والمستلزمات)' },
  { page: 'warehouses', label: 'المخازن' },
  { page: 'transfers', label: 'تحويلات المخازن' },
  { page: 'expiry', label: 'مراقبة الصلاحية' },
  { page: 'stock-movement', label: 'حركة الأصناف' },
  { page: 'accounts', label: 'دليل الحسابات' },
  { page: 'journal', label: 'القيود اليومية' },
  { page: 'receipt-voucher', label: 'سند قبض' },
  { page: 'payment-voucher', label: 'سند صرف' },
  { page: 'reports-sales', label: 'تقارير المبيعات' },
  { page: 'reports-inventory', label: 'تقارير المخزون' },
  { page: 'reports-financial', label: 'التقارير المالية' },
  { page: 'trial-balance', label: 'ميزان المراجعة' },
  { page: 'income-statement', label: 'قائمة الدخل' },
  { page: 'balance-sheet', label: 'الميزانية العمومية' },
  { page: 'users', label: 'المستخدمون والأدوار' },
  { page: 'settings', label: 'إعدادات النظام' },
  { page: 'dashboard', label: 'لوحة التحكم' },
  { page: 'notifications', label: 'التنبيهات' },
]

function handleSearchKey(e) {
  const t = searchText.value.trim()
  if (!t || e.key !== 'Enter') return
  const found = searchablePages.find(p => p.label.includes(t) || p.page.includes(t))
  if (found) {
    emit('select', found.page)
  }
  searchText.value = ''
  searchInput.value?.blur()
}

function globalShortcut(e) {
  if (e.key === 'F' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    searchInput.value?.focus()
  }
}

const avatarChar = computed(() => (props.userName || 'أ')[0])

function isImplemented(page) {
  return implementedPages.has(page)
}
</script>

<style scoped>
.top-bar {
  height: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: stretch;
  background: linear-gradient(180deg, #1c2a42 0%, #141e32 100%);
  border-bottom: 2px solid #b89428;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  font-family: Arial, 'Segoe UI', 'Noto Sans Arabic', sans-serif;
  direction: rtl;
  z-index: 100;
}

/* ===== العلامة التجارية ===== */
.brand {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 14px;
  border-left: 1px solid #2c3a55;
  flex-shrink: 0;
}
.brand-mark {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #b89428;
  color: #141e32;
  font-size: 16px;
  font-weight: 800;
  line-height: 1;
}
.brand-name {
  color: #f2ecdc;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.brand-sub {
  color: #b89428;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

/* ===== القائمة الأفقية ===== */
.menu-bar {
  flex: 1;
  display: flex;
  align-items: stretch;
  padding: 0 4px;
  gap: 1px;
  overflow-x: auto;
}
.menu-bar::-webkit-scrollbar { height: 0; }

.menu-wrapper { position: relative; }

.menu-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 13px;
  background: transparent;
  color: #c6d0e0;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}
.menu-item:hover,
.menu-item.open {
  background: #26344f;
  color: #ffffff;
  border-bottom-color: #b89428;
}

.menu-arrow {
  width: 12px;
  height: 12px;
  opacity: 0.7;
  transition: transform 0.15s ease;
}
.menu-item.open .menu-arrow { transform: rotate(180deg); }

/* ===== القائمة المنسدلة — تصميم البرامج المحاسبية المكتبية =====
   قائمة بيضاء ضيقة، كل عنصر بعرض القائمة كاملًا، متراصّة واحدًا تحت الآخر
   مع أسهم ◂ للعناصر الفرعية وخطوط فاصلة بين المجموعات. */
.dropdown-panel {
  position: absolute;
  top: 100%;
  left: 0;
  width: 218px;
  background: #ffffff;
  border: 1px solid #a9b4c2;
  box-shadow: 0 10px 28px rgba(8, 14, 28, 0.35);
  z-index: 120;
  display: flex;
  flex-direction: column;
  direction: rtl;
  padding: 3px;
}

.dropdown-scroll {
  overflow-y: auto;
  padding: 2px 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.dropdown-group-title {
  padding: 7px 12px 4px;
  font-size: 12px;
  font-weight: 700;
  color: #1c2a42;
  background: #f4f6f9;
  border-bottom: 1px solid #cfd8e3;
}
.dropdown-group-title.is-report-group {
  border-top: 2px solid #a9b4c2;
  margin-top: 4px;
}
.dropdown-group-title--nested {
  background: #ffffff;
  color: #33455f;
  padding-right: 24px;
  font-weight: 600;
}

.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  text-align: right;
  padding: 7px 12px;
  background: transparent;
  color: #1d2a3d;
  border: none;
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 500;
  font-family: inherit;
  line-height: 1.35;
  transition: background 0.08s ease, color 0.08s ease;
}
.dropdown-item:hover {
  background: #c9d8f0;
  color: #0d1b33;
}
.dropdown-item.active {
  background: #aebfdc;
  color: #0d1b33;
  font-weight: 700;
}
.dropdown-item.pending {
  color: #6a7688;
}
.dropdown-item.nested {
  padding-right: 24px;
}
.dropdown-item-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dropdown-item-arrow {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  opacity: 0.75;
  color: inherit;
}
.dropdown-item-trail {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.dropdown-item-badge {
  margin-inline-start: 4px;
  padding: 1px 6px;
  border-radius: 2px;
  background: #eef0f4;
  border: 1px solid #c9d2de;
  color: #6a7688;
  font-size: 9px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ===== رسالة الشاشات قيد التطوير ===== */
.notimpl-toast {
  position: absolute;
  top: 46px;
  inset-inline-start: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: #fff8e1;
  border: 1px solid #d9c994;
  border-radius: 8px;
  color: #6b5a15;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 10px 30px rgba(8, 14, 28, 0.4);
  z-index: 130;
  max-width: 70vw;
}
.notimpl-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
.notimpl-close {
  background: transparent;
  border: none;
  color: #8a6f22;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0 2px;
}
.toast-msg-enter-active,
.toast-msg-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.toast-msg-enter-from,
.toast-msg-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-6px);
}

/* فاصل أفقي ───── قبل مجموعات التقارير، مثل الصورة المرجعية */
.dropdown-group-title--nested {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #c9d2de;
}
.dropdown-group-title.is-report-group {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #c9d2de;
}

/* ===== أدوات الشريط: البحث + المستخدم ===== */
.top-tools {
  display: flex;
  align-items: stretch;
  border-right: 1px solid #2c3a55;
  flex-shrink: 0;
}

.search-box {
  display: flex;
  align-items: center;
  padding: 0 8px;
}
.search-input {
  width: 150px;
  height: 26px;
  padding: 0 8px;
  background: #0e1626;
  border: 1px solid #33415e;
  color: #e8edf5;
  font-size: 12px;
  font-family: inherit;
  outline: none;
  direction: rtl;
}
.search-input::placeholder { color: #66738d; }
.search-input:focus {
  border-color: #b89428;
  background: #121c30;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  cursor: default;
}
.user-initial {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2c3a55;
  border: 1px solid #b89428;
  color: #e8dfc2;
  font-size: 12px;
  font-weight: 700;
}
.user-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.user-name { color: #e8edf5; font-size: 11.5px; font-weight: 600; }
.user-role { color: #b89428; font-size: 10px; font-weight: 600; }

/* ===== الحركات ===== */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-enter-from,
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
