<template>
  <!--
    DocumentShell — القالب المشترك للشاشات الكلاسيكية المكتبية
    التركيب: شريط عنوان → شريط أدوات (أزرار F صغيرة) → رأس مستند → جدول التفاصيل → إجماليات → شريط أوامر
    كل شاشة تحقن محتواها عبر السلاطات: doc-header / details-table / totals
  -->
  <div class="doc-shell">
    <!-- ===== شريط الأدوات ===== -->
    <div class="doc-toolbar">
      <slot name="toolbar-actions"></slot>
      <span class="toolbar-spacer"></span>
      <span v-if="subtitle" class="toolbar-subtitle">{{ subtitle }}</span>
    </div>

    <!-- ===== رأس المستند ===== -->
    <div v-if="$slots['doc-header']" class="doc-header">
      <slot name="doc-header"></slot>
    </div>

    <!-- ===== جدول التفاصيل ===== -->
    <div class="doc-details">
      <slot name="details-table"></slot>
    </div>

    <!-- ===== منطقة الإجماليات ===== -->
    <div v-if="$slots.totals" class="doc-totals">
      <slot name="totals"></slot>
    </div>

    <!-- ===== شريط الأوامر السفلي ===== -->
    <div class="doc-commandbar">
      <slot name="commandbar">
        <span class="cmd-hint">الإجماليات محسوبة تلقائيًا — استخدم أزرار شريط الأدوات أو اختصارات F</span>
      </slot>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, provide } from 'vue'

const props = defineProps({
  subtitle: { type: String, default: '' },
  windowId: { type: [String, Number], default: null },
  /** يُحدَّث من الأب عند تبديل النافذة النشطة — الشاشات تستجيب لاختصارات F فقط عندما تكون نشطة */
  active: { type: Boolean, default: false },
})

const emit = defineEmits(['new'])

provide('docActive', () => props.active)

// حدث sharaf-new-doc صادر من App.vue عند الضغط على «جديد» (F2) أثناء وجود شاشة مستندات نشطة
const onNewDoc = (e) => {
  if (!props.active) return
  if (e?.detail?.windowId && String(e.detail.windowId) !== String(props.windowId)) return
  emit('new')
}

onMounted(() => window.addEventListener('sharaf-new-doc', onNewDoc))
onUnmounted(() => window.removeEventListener('sharaf-new-doc', onNewDoc))
</script>

<style scoped>
/* ============================================
   DocumentShell — القالب الكلاسيكي المكتبي
   أبيض / رمادي فاتح / سماوي فاتح / أزرق للتحديد
   بدون Gradients أو ظلال كبيرة أو كروت حديثة
   ============================================ */
.doc-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #fff;
  border: 1px solid #98a2b3;
  font-size: 12px;
}

/* ---- شريط الأدوات (أزرار صغيرة متجاورة رمادية) ---- */
.doc-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px 4px;
  background: #eef1f5;
  border-bottom: 1px solid #c4ccd4;
  flex-shrink: 0;
}
.tool-f {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 24px;
  padding: 0 8px;
  background: #f6f7f9;
  border: 1px solid #b9c2cc;
  border-radius: 2px;
  color: #1d2939;
  font-family: Arial, Helvetica, Tahoma, "Noto Sans Arabic", sans-serif;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
}
.tool-f:hover { background: #e3ecf7; border-color: #0d5aa7; }
.tool-f:active { background: #cfe1f2; }
.tool-f.primary { background: #dbe8f7; border-color: #0d5aa7; font-weight: bold; }
.tool-f .fkey {
  font-size: 10px;
  color: #0d5aa7;
  font-weight: bold;
  border: 1px solid #9ec2ef;
  background: #eaf2fb;
  padding: 0 3px;
  border-radius: 2px;
  direction: ltr;
}
.toolbar-spacer { flex: 1; }
.toolbar-subtitle { font-size: 11px; color: #667085; }
.toolbar-sep { width: 1px; height: 18px; background: #c4ccd4; margin: 0 3px; }

/* ---- رأس المستند: حقول مجمّعة بإطار واحد ---- */
.doc-header {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: #f4f6f9;
  border-bottom: 1px solid #c4ccd4;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.field-group {
  border: 1px solid #c4ccd4;
  background: #fff;
  padding: 3px 6px 4px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 150px;
}
.field-group-title {
  font-size: 10px;
  font-weight: bold;
  color: #0d5aa7;
  margin-bottom: 1px;
  letter-spacing: 0.2px;
}
.field-group .field {
  display: flex;
  align-items: center;
  gap: 4px;
}
.field-group .field label {
  font-size: 11px;
  color: #667085;
  white-space: nowrap;
  min-width: 44px;
}
.field input, .field select {
  height: 22px;
  min-height: 22px;
  padding: 0 5px;
  border: 1px solid #c4ccd4;
  border-radius: 1px;
  font-family: Arial, Helvetica, Tahoma, "Noto Sans Arabic", sans-serif;
  font-size: 12px;
  background: #fff;
  color: #1d2939;
  width: 100%;
}
.field input:focus, .field select:focus { outline: none; border-color: #0d5aa7; background: #f2f8ff; }
.field input[readonly] { background: #f2f4f7; color: #475467; }
.field-btn {
  width: 22px;
  height: 22px;
  min-width: 22px;
  border: 1px solid #b9c2cc;
  background: #f6f7f9;
  cursor: pointer;
  font-size: 10px;
  color: #0d5aa7;
  border-radius: 1px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.field-btn:hover { background: #e3ecf7; border-color: #0d5aa7; }

/* ---- جدول التفاصيل: أكبر عنصر في الشاشة ---- */
.doc-details {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: #fff;
  border-top: 1px solid #c4ccd4;
}

/* ---- منطقة الإجماليات: حقول صغيرة متجاورة ---- */
.doc-totals {
  display: flex;
  align-items: stretch;
  gap: 3px;
  padding: 4px;
  background: #f4f6f9;
  border-top: 2px solid #0d5aa7;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.total-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  border: 1px solid #c4ccd4;
  background: #fff;
  padding: 2px 6px;
  min-height: 24px;
  font-size: 11px;
}
.total-cell .t-label { color: #667085; white-space: nowrap; }
.total-cell .t-value {
  direction: ltr;
  text-align: left;
  font-weight: bold;
  color: #1d2939;
}
.total-cell.net {
  background: #dbe8f7;
  border-color: #0d5aa7;
}
.total-cell.net .t-label { color: #094080; font-weight: bold; }
.total-cell.net .t-value { font-size: 14px; color: #094080; }

/* ---- شريط الأوامر السفلي ---- */
.doc-commandbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px 4px;
  background: #eef1f5;
  border-top: 1px solid #c4ccd4;
  flex-shrink: 0;
}
.cmd-hint { font-size: 11px; color: #667085; margin-left: auto; }
.cmd-error { color: #b71c1c; font-size: 11px; font-weight: bold; margin-left: auto; }
.cmd-success { color: #1b5e20; font-size: 11px; font-weight: bold; margin-left: auto; }

/* أزرار شريط الأوامر بنفس نمط شريط الأدوات */
.doc-commandbar .tool-f { height: 24px; }
</style>
