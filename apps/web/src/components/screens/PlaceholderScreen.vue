<template>
  <!-- ========== شاشة عامة (placeholder) للصفحات غير المنفذة بعد ========== -->
  <div class="placeholder-screen">
    <div class="placeholder-header">
      <h2 class="placeholder-title">{{ title }}</h2>
      <span class="badge badge-posted">قيد التنفيذ</span>
    </div>
    <div class="placeholder-body">
      <p>{{ description }}</p>
      <p class="hint">سيتم ربط هذه الشاشة بقاعدة البيانات الفعلية بعد اكتمال مرحلة التطوير الأساسية.</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: 'الشاشة' },
  description: { type: String, default: 'محتوى هذه الشاشة قيد التطوير...' },
})
</script>

<style scoped>
.placeholder-screen {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.placeholder-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
}

.placeholder-title {
  font-size: var(--font-size-lg);
  color: var(--color-primary);
  margin: 0;
}

.placeholder-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  color: var(--color-text-secondary);
  text-align: center;
  padding: var(--space-4);
}

.hint {
  font-size: var(--font-size-xs);
}
</style>
