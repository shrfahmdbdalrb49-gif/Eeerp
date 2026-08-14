<template>
  <!-- ===== الهيدر العلوي الرئيسي (Bolt-style Header) ===== -->
  <header class="main-ribbon">
    <div class="ribbon-right">
      <div class="brand">
        <span class="brand-circle">ش</span>
        <div class="brand-text">
          <span class="brand-name">نظام شرف</span>
          <span class="brand-sub">ERP System</span>
        </div>
      </div>
    </div>

    <div class="ribbon-center">
      <label class="quick-search" :title="'بحث سريع (Ctrl+F)'">
        <span class="qs-icon">🔍</span>
          <input
            ref="searchInput"
            class="qs-input"
            type="text"
            dir="ltr"
            v-model="searchText"
            placeholder="بحث سريع... (Ctrl+F)"
          @keydown="handleSearchKey"
        />
      </label>
    </div>

    <div class="ribbon-left">
      <button class="bell-btn" title="التنبيهات" @click="emit('menu-change', 'notifications')">
        <span class="bell-icon">🔔</span>
        <span v-if="notifCount > 0" class="bell-badge">{{ notifCount > 9 ? '9+' : notifCount }}</span>
      </button>

      <div class="user-chip" @click="emit('menu-change', 'users')">
        <span class="user-avatar">
          {{ avatarChar }}
        </span>
        <span class="user-name">{{ userName }}</span>
        <span v-if="roleLabel !== userName" class="user-role">· {{ roleLabel }}</span>
      </div>
    </div>
  </header>
</template>

<script setup>
/**
 * MainRibbon — الهيدر العلوي الرئيسي (Bolt-style)
 * Props:
 *   - activeMenu: String  → القائمة النشطة حاليًا
 *   - userName:   String  → اسم المستخدم الحالي (اختياري)
 *   - roleLabel:  String  → وصف الدور (اختياري)
 * Events:
 *   - menu-change(value)  → عند اختيار بند من الهيدر
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  activeMenu: { type: String, default: 'sales' },
  userName: { type: String, default: 'مدير النظام' },
  roleLabel: { type: String, default: 'مدير النظام' },
})

const emit = defineEmits(['menu-change'])

// ===== البحث السريع =====
const searchInput = ref(null)
const searchText = ref('')

/** قائمة بنود البحث: page → عنوان قابل للعرض */
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
  { page: 'transfers', label: 'تحويلات الفروع' },
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
  const found = searchablePages.find(p =>
    p.label.includes(t) || p.page.includes(t)
  )
  if (found) {
    emit('menu-change', 'search', found.page)
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

// ===== عداد التنبيهات (حسب الأحداث المفتوحة في السجل) =====
const notifCount = ref(0)

async function refreshNotifs() {
  try {
    const { db } = await import('../../db/database.js')
    if (!db?.auditLogs) return
    const recent = await db.auditLogs
      .where('action')
      .anyOf(['item_expired_soon', 'stock_low', 'period_end_soon'])
      .reverse()
      .limit(30)
      .toArray()
    notifCount.value = recent.length
  } catch {
    notifCount.value = 0
  }
}

const avatarChar = computed(() => (props.userName || 'أ')[0])

let timer = null
onMounted(() => {
  document.addEventListener('keydown', globalShortcut)
  refreshNotifs()
  timer = setInterval(refreshNotifs, 60_000)
})
onUnmounted(() => {
  document.removeEventListener('keydown', globalShortcut)
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.main-ribbon {
  height: 54px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  padding: 0 14px;
  gap: 12px;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  font-family: Arial, 'Segoe UI', 'Noto Sans Arabic', sans-serif;
}

/* --- يمين: العلامة التجارية --- */
.ribbon-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-circle {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: #ffffff;
  font-size: 17px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(37, 99, 235, 0.4);
  flex-shrink: 0;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.brand-name {
  font-size: 15px;
  font-weight: bold;
  color: #111827;
  white-space: nowrap;
}

.brand-sub {
  font-size: 11px;
  color: #9ca3af;
  white-space: nowrap;
}

/* --- وسط: البحث السريع --- */
.ribbon-center {
  flex: 1;
  display: flex;
  justify-content: center;
  min-width: 0;
}

.quick-search {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0 12px;
  width: min(420px, 42%);
  height: 36px;
  cursor: text;
}

.quick-search:focus-within {
  border-color: #2563eb;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.qs-icon {
  font-size: 13px;
  color: #6b7280;
}

.qs-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 13px;
  color: #111827;
  outline: none;
  font-family: inherit;
  min-width: 0;
}

.qs-input::placeholder {
  color: #9ca3af;
}

/* --- يسار: التنبيهات + المستخدم --- */
.ribbon-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.bell-btn {
  position: relative;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 8px;
  font-size: 17px;
  line-height: 1;
  transition: background 0.15s;
}

.bell-btn:hover {
  background: #f3f4f6;
}

.bell-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: #ef4444;
  color: #ffffff;
  font-size: 10px;
  font-weight: bold;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateX(30%);
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  padding: 4px 12px 4px 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.user-chip:hover {
  background: #e5e7eb;
}

.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #ffffff;
  font-size: 13px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-name {
  font-size: 12.5px;
  font-weight: bold;
  color: #111827;
  white-space: nowrap;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: 11px;
  color: #6b7280;
  white-space: nowrap;
}
</style>
