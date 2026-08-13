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
        @select="activePage = $event"
      />

      <!-- مساحة العمل (النوافذ) -->
      <Workspace
        :windows="openWindows"
        :active-window="activeWindowId"
        @window-activate="activeWindowId = $event"
        @window-close="closeWindow"
        @window-minimize="minimizeWindow"
        @window-maximize="maximizeWindow"
      />
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
