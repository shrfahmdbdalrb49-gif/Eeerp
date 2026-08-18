<template>
  <!-- ===== شريط الحالة المكتبي (Desktop ERP Status Bar) ===== -->
  <footer class="status-bar" role="status">
    <!-- أزرار النوافذ المفتوحة (يمين) -->
    <div class="sb-windows">
      <span class="sb-title">نوافذ مفتوحة</span>
      <button
        v-for="win in windows"
        :key="win.id"
        type="button"
        class="sb-win"
        :class="{ active: activeWindow === win.id, minimized: win.minimized }"
        :title="win.title"
        @click="$emit('window-activate', win.id)"
      >
        <span class="sb-win-title">{{ win.title }}</span>
        <span class="sb-win-state" :class="win.status">{{ stateLabel(win.status) }}</span>
      </button>
      <span v-if="windows.length === 0" class="sb-empty">لا توجد نوافذ مفتوحة — افتح شاشة من القائمة الرئيسية</span>
    </div>

    <!-- معلومات النظام (يسار) -->
    <div class="sb-info">
      <span class="sb-item">
        <b>مستخدم:</b> {{ userName }}<template v-if="roleLabel && roleLabel !== userName"> ({{ roleLabel }})</template>
      </span>
      <span class="sb-sep">|</span>
      <span class="sb-item">
        <b>الوضع:</b> {{ storageLabel }}
      </span>
      <span class="sb-sep">|</span>
      <span class="sb-item sb-online" :class="{ online: connected, offline: !connected }">
        <span class="sb-dot"></span>
        {{ connected ? 'متصل' : 'غير متصل' }}
      </span>
      <span class="sb-sep">|</span>
      <span class="sb-item sb-clock">{{ clock }}</span>
    </div>
  </footer>
</template>

<script setup>
/**
 * StatusBar — شريط الحالة السفلي (نمط Desktop ERP)
 * يعرض النوافذ المفتوحة وحالتها + المستخدم والوضع والاتصال والساعة.
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getStorageMode } from '../../db/storage.js'

const props = defineProps({
  windows: { type: Array, default: () => [] },
  activeWindow: { type: [String, null], default: null },
  userName: { type: String, default: 'مدير النظام' },
  roleLabel: { type: String, default: 'مدير النظام' },
})

defineEmits(['window-activate'])

const connected = ref(true)
const clock = ref('')

const storageLabel = computed(() => (getStorageMode() === 'server' ? 'خادم مركزي' : 'تخزين محلي (Demo)'))

const stateLabels = {
  draft: 'مسودة',
  final: 'معتمد',
  posted: 'مرحّلة',
  cancelled: 'ملغاة',
}
function stateLabel(s) {
  return stateLabels[s] ?? 'مسودة'
}

function tick() {
  const d = new Date()
  clock.value = d.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit', hour12: false })
}

async function probeConnection() {
  try {
    const { apiBase } = await import('../../db/api.js')
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 5000)
    const r = await fetch(apiBase() + '/health', { signal: ctrl.signal })
    clearTimeout(t)
    connected.value = r.ok || r.status === 401
  } catch {
    connected.value = getStorageMode() !== 'server'
  }
}

let clockTimer = null
let probeTimer = null
onMounted(() => {
  tick()
  clockTimer = setInterval(tick, 20_000)
  probeConnection()
  probeTimer = setInterval(probeConnection, 30_000)
})
onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
  if (probeTimer) clearInterval(probeTimer)
})
</script>

<style scoped>
.status-bar {
  height: 26px;
  flex-shrink: 0;
  display: flex;
  align-items: stretch;
  background: #101726;
  border-top: 1px solid #2a3650;
  color: #8f9cb4;
  font-family: Arial, 'Segoe UI', 'Noto Sans Arabic', sans-serif;
  font-size: 11px;
  direction: rtl;
  z-index: 100;
}

/* النوافذ المفتوحة */
.sb-windows {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  overflow-x: auto;
  min-width: 0;
}
.sb-windows::-webkit-scrollbar { height: 0; }

.sb-title {
  color: #60708a;
  font-size: 10px;
  font-weight: 700;
  padding: 0 6px;
  border-left: 1px solid #2a3650;
  flex-shrink: 0;
}

.sb-win {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 220px;
  height: 19px;
  padding: 0 9px;
  background: #1b2740;
  border: 1px solid #2e3c5a;
  color: #aab7cc;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  font-size: 10.5px;
  font-family: inherit;
  transition: background 0.1s ease, border-color 0.1s ease;
}
.sb-win:hover {
  background: #24334f;
  border-color: #4a5a7c;
}
.sb-win.active {
  background: #30416a;
  border-color: #b89428;
  color: #ffffff;
}
.sb-win.minimized { opacity: 0.55; }

.sb-win-title {
  overflow: hidden;
  text-overflow: ellipsis;
}
.sb-win-state {
  font-size: 9px;
  font-weight: 700;
  padding: 0 5px;
  height: 14px;
  line-height: 14px;
  flex-shrink: 0;
}
.sb-win-state.draft { color: #8f9cb4; border: 1px solid #4a5670; }
.sb-win-state.final { color: #7ea6ff; border: 1px solid #3b5699; }
.sb-win-state.posted { color: #6fd48a; border: 1px solid #2f7a4a; }
.sb-win-state.cancelled { color: #f28a8a; border: 1px solid #8a3030; }

.sb-empty { color: #55637d; font-size: 10px; }

/* معلومات النظام */
.sb-info {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border-right: 1px solid #2a3650;
  background: #0c1220;
  flex-shrink: 0;
  white-space: nowrap;
}
.sb-item b { color: #b6c2d6; font-weight: 600; }
.sb-sep { color: #36435e; }
.sb-online { display: flex; align-items: center; gap: 5px; }
.sb-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.sb-online.online .sb-dot { background: #43b581; box-shadow: 0 0 4px #43b581; }
.sb-online.offline .sb-dot { background: #d14b4b; box-shadow: 0 0 4px #d14b4b; }
.sb-online.online { color: #7fd8a0; }
.sb-online.offline { color: #e08a8a; }
.sb-clock { color: #e8edf5; font-weight: 700; font-variant-numeric: tabular-nums; }
</style>
