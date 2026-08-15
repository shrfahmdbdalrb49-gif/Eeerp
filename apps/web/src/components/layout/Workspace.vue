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
              @click.stop="requestClose(win.id)"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- رسالة تأكيد إغلاق النافذة — تظهر على النافذة النشطة فقط -->
        <div
          v-if="pendingCloseId === win.id"
          class="close-confirm-overlay"
          @mousedown.stop
        >
          <div class="close-confirm-box">
            <p class="close-confirm-text">هل تريد الخروج من هذه النافذة؟</p>
            <div class="close-confirm-actions">
              <button class="confirm-yes" @click="confirmClose">نعم، خروج</button>
              <button class="confirm-no" @click="cancelClose">إلغاء</button>
            </div>
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
import { computed, ref } from 'vue'

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

const emit = defineEmits(['window-activate', 'window-close', 'window-minimize', 'window-maximize'])

// معرف النافذة المعلقة إغلاقها (بانتظار تأكيد المستخدم)
const pendingCloseId = ref(null)

/** طلب إغلاق نافذة: يُظهر رسالة تأكيد بدلًا من الإغلاق الفوري */
function requestClose(id) {
  pendingCloseId.value = id
}

/** تأكيد الإغلاق: تُغلق النافذة فعلًا */
function confirmClose() {
  const id = pendingCloseId.value
  pendingCloseId.value = null
  if (id != null) emit('window-close', id)
}

/** إلغاء الإغلاق: تبقى النافذة مفتوحة */
function cancelClose() {
  pendingCloseId.value = null
}

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

/* رسالة تأكيد إغلاق النافذة */
.close-confirm-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 15, 30, 0.45);
  border-radius: inherit;
}

.close-confirm-box {
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 12px;
  padding: 20px 24px;
  min-width: 280px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
  text-align: center;
}

.close-confirm-text {
  margin: 0 0 16px;
  font-size: var(--font-size-md, 15px);
  font-weight: 600;
  color: var(--color-text, #111827);
}

.close-confirm-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.close-confirm-actions button {
  padding: 8px 18px;
  border-radius: 8px;
  font-size: var(--font-size-sm, 13px);
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: opacity 0.15s ease;
}

.close-confirm-actions button:hover {
  opacity: 0.85;
}

.close-confirm-actions .confirm-yes {
  background: #dc2626;
  color: #ffffff;
}

.close-confirm-actions .confirm-no {
  background: #f3f4f6;
  color: #111827;
  border-color: #d1d5db;
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
