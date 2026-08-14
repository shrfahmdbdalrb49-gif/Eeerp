<template>
  <!-- ===== شريط الأدوات (Toolbar) ===== -->
  <div class="toolbar">
    <button class="tool-btn" title="جديد (F2)" @click="$emit('new')">
      <span class="tool-icon">📄</span>
      <span class="tool-label">جديد</span>
      <span class="tool-shortcut">F2</span>
    </button>

    <div class="tool-separator"></div>

    <button class="tool-btn" title="حفظ (F8)" @click="$emit('save')">
      <span class="tool-icon">💾</span>
      <span class="tool-label">حفظ</span>
      <span class="tool-shortcut">F8</span>
    </button>

    <button class="tool-btn" title="ترحيل (F10)" @click="$emit('post')">
      <span class="tool-icon">✅</span>
      <span class="tool-label">ترحيل</span>
      <span class="tool-shortcut">F10</span>
    </button>

    <div class="tool-separator"></div>

    <button class="tool-btn" title="طباعة (Ctrl+P)" @click="$emit('print')">
      <span class="tool-icon">🖨️</span>
      <span class="tool-label">طباعة</span>
      <span class="tool-shortcut">Ctrl+P</span>
    </button>

    <button class="tool-btn" title="بحث (F3)" @click="$emit('search')">
      <span class="tool-icon">🔍</span>
      <span class="tool-label">بحث</span>
      <span class="tool-shortcut">F3</span>
    </button>

    <div class="tool-separator"></div>

    <button class="tool-btn" title="إغلاق (Esc)" @click="$emit('close')">
      <span class="tool-icon">✕</span>
      <span class="tool-label">إغلاق</span>
      <span class="tool-shortcut">Esc</span>
    </button>
  </div>
</template>

<script setup>
/**
 * Toolbar — شريط أدوات الوثيقة
 * Events:
 *   - new    → فتح نافذة/وثيقة جديدة (F2)
 *   - save   → حفظ كمسودة (F8)
 *   - post   → ترحيل الوثيقة (F10)
 *   - print  → طباعة (Ctrl+P)
 *   - search → فتح البحث السريع (F3)
 *   - close  → إغلاق النافذة النشطة (Esc)
 *
 * الفئات المستخدمة مطابقة لـ style.css (.toolbar, .tool-btn, .tool-icon,
 * .tool-label, .tool-shortcut, .tool-separator)
 */
defineEmits(['new', 'save', 'post', 'print', 'search', 'close'])
</script>
