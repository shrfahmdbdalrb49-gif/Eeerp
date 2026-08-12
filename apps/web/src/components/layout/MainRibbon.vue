<template>
  <!-- ===== الشريط العلوي الرئيسي (Ribbon) ===== -->
  <div class="main-ribbon">
    <div class="ribbon-logo">شرف ERP</div>
    <nav class="ribbon-menu" role="tablist">
      <button
        v-for="menu in menus"
        :key="menu.value"
        role="tab"
        class="menu-item"
        :class="{ active: activeMenu === menu.value }"
        :aria-selected="activeMenu === menu.value"
        @click="$emit('menu-change', menu.value)"
      >
        <span class="menu-icon" v-if="menu.icon">{{ menu.icon }}</span>
        <span>{{ menu.label }}</span>
      </button>
    </nav>
  </div>
</template>

<script setup>
/**
 * MainRibbon — الشريط العلوي الرئيسي (Ribbon Menu)
 * Props:
 *   - activeMenu: String  → القائمة النشطة حالياً
 * Events:
 *   - menu-change(value)  → عند النقر على تبويب
 */
defineProps({
  activeMenu: {
    type: String,
    default: 'sales',
  },
})

defineEmits(['menu-change'])

// قائمة التبويبات الرئيسية — ترتب حسب التسلسل المنطقي في النظام
const menus = [
  { value: 'dashboard',  label: 'لوحة التحكم', icon: '📊' },
  { value: 'sales',      label: 'المبيعات',   icon: '🛒' },
  { value: 'purchases',  label: 'المشتريات',  icon: '📦' },
  { value: 'inventory',  label: 'المخزون',    icon: '🏷️' },
  { value: 'insurance',  label: 'التأمين',    icon: '🏥' },
  { value: 'accounting', label: 'الحسابات',   icon: '💰' },
  { value: 'reports',    label: 'التقارير',   icon: '📈' },
  { value: 'admin',      label: 'الإدارة',    icon: '⚙️' },
]
</script>

<style scoped>
.menu-icon {
  margin-left: 4px;
}
</style>
