<template>
  <!-- ===== مساحة العمل (Workspace) — إدارة النوافذ ===== -->
  <main class="workspace">
    <transition-group name="window" tag="div" class="windows-stack">
      <div
        v-for="(win, index) in sortedWindows"
        :key="win.id"
        v-show="!win.minimized"
        class="window-frame"
        :class="{
          maximized: win.maximized,
          active: win.id === activeWindow,
        }"
        :style="windowPosition(win, index)"
        @mousedown="$emit('window-activate', win.id)"
      >
        <!-- شريط عنوان النافذة -->
        <div class="window-title-bar">
          <span class="window-title-text">{{ win.title }}</span>

          <div class="window-status">
            <span
              class="badge"
              :class="statusBadgeClass(win.status)"
            >
              {{ statusLabel(win.status) }}
            </span>
          </div>

          <div class="window-controls">
            <button
              v-if="!win.maximized"
              title="تصغير"
              @click.stop="$emit('window-minimize', win.id)"
            >
              ─
            </button>
            <button
              title="تكبير / استعادة"
              @click.stop="$emit('window-maximize', win.id)"
            >
              {{ win.maximized ? '❐' : '□' }}
            </button>
            <button
              title="إغلاق"
              @click.stop="$emit('window-close', win.id)"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- جسم النافذة — slot مسمى حسب نوع النافذة -->
        <div class="window-body">
          <slot :name="win.type" :window="win">
            <div class="empty-window">
              <p>محتوى النافذة من نوع: <strong>{{ win.type }}</strong></p>
              <p class="hint">أضف مكوّناً عبر &lt;template #{{ win.type }}&gt; داخل Workspace</p>
            </div>
          </slot>
        </div>
      </div>
    </transition-group>

    <div v-if="windows.length === 0" class="workspace-empty">
      <p>لا توجد نوافذ مفتوحة</p>
      <p class="hint">اضغط «جديد» (F2) لفتح وثيقة جديدة</p>
    </div>
  </main>
</template>

<script setup>
import { computed } from 'vue'

/**
 * Workspace — مساحة العمل التي تستضيف النوافذ المفتوحة
 * Props:
 *   - windows:      Array<{id, title, type, status, minimized, maximized}>
 *   - activeWindow: String|null → معرف النافذة النشطة
 * Events:
 *   - window-activate(id)  → تفعيل نافذة
 *   - window-close(id)     → إغلاق نافذة
 *   - window-minimize(id)  → تصغير نافذة
 *   - window-maximize(id)  → تكبير/استعادة نافذة
 *
 * ملاحظة: النافذة النشطة تُرسم دائماً أخيراً (z-order أعلى)
 * بحيث تظهر فوق بقية النوافذ.
 */
const props = defineProps({
  windows: {
    type: Array,
    default: () => [],
  },
  activeWindow: {
    type: [String, null],
    default: null,
  },
})

defineEmits(['window-activate', 'window-close', 'window-minimize', 'window-maximize'])

/** ترتيب النوافذ: النافذة النشطة تظهر فوق الجميع */
const sortedWindows = computed(() => {
  const inactive = props.windows.filter((w) => w.id !== props.activeWindow)
  const active = props.windows.find((w) => w.id === props.activeWindow)
  return active ? [...inactive, active] : [...inactive]
})

/** موضع النوافذ غير المكبّرة: إزاحة تدريجية (كاسكيد) بحيث يُرى عنوان كل نافذة */
function windowPosition(win, index) {
  if (win.maximized) return {}
  const offset = Math.min(index, 6) * 24
  return { top: `${10 + offset}px`, right: `${10 + offset}px` }
}

const statusLabels = {
  draft:     'مسودة',
  posted:    'مرحّلة',
  cancelled: 'ملغاة',
  final:     'معتمد',
}

function statusLabel(status) {
  return statusLabels[status] ?? 'مسودة'
}

function statusBadgeClass(status) {
  const map = {
    draft:     'badge-draft',
    posted:    'badge-posted',
    cancelled: 'badge-cancelled',
    final:     'badge-posted',
  }
  return map[status] ?? 'badge-draft'
}
</script>

<style scoped>
.windows-stack {
  position: relative;
  width: 100%;
  height: 100%;
}

.window-frame.active {
  z-index: 10;
}

.window-title-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-window {
  padding: 24px;
  text-align: center;
  color: var(--color-text-secondary);
}

.empty-window .hint {
  margin-top: 8px;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.workspace-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  gap: 8px;
}

.workspace-empty .hint {
  font-size: var(--font-size-xs);
}

/* حركات فتح/إغلاق النوافذ */
.window-enter-active,
.window-leave-active {
  transition: all 0.2s ease;
}

.window-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.window-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
