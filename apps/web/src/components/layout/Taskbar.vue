<template>
  <!-- ===== شريط المهام السفلي (Taskbar) ===== -->
  <div class="taskbar">
    <button
      v-for="win in windows"
      :key="win.id"
      class="taskbar-item"
      :class="{ active: win.id === activeWindow }"
      @click="handleClick(win)"
    >
      <span class="taskbar-icon">📄</span>
      <span class="taskbar-title">{{ win.title }}</span>
      <span v-if="win.status === 'posted'" class="taskbar-status" title="مرحّلة">✅</span>
    </button>

    <div class="taskbar-spacer"></div>

    <div class="taskbar-info">
      <span>👤 {{ userName }}</span>
      <span>🏥 {{ branchName }}</span>
      <span>{{ currentTime }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Taskbar — شريط المهام السفلي
 * Props:
 *   - windows:      Array<{id, title, status, ...}>
 *   - activeWindow: String|null
 *   - userName:     String  → اسم المستخدم الحالي (اختياري)
 *   - branchName:   String  → اسم الفرع الحالي (اختياري)
 * Events:
 *   - window-activate(id)  → النقر على بند لرفع النافذة / تصغيرها
 */
defineProps({
  windows: {
    type: Array,
    default: () => [],
  },
  activeWindow: {
    type: [String, null],
    default: null,
  },
  userName: {
    type: String,
    default: 'مدير النظام',
  },
  branchName: {
    type: String,
    default: 'الفرع الرئيسي',
  },
})

const emit = defineEmits(['window-activate'])

/** عند النقر على نافذة مصغّرة يتم إصدار restore قبل التفعيل */
function handleClick(win) {
  if (win.minimized) {
    win.minimized = false
  }
  emit('window-activate', win.id)
}

/** ساعة حية في شريط المهام */
const currentTime = ref('')

function updateTime() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

let timer = null
onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.taskbar-icon {
  margin-left: 4px;
}

.taskbar-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.taskbar-status {
  margin-right: 4px;
  font-size: var(--font-size-xs);
}
</style>
