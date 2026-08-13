<template>
  <!-- ========== إعدادات النظام ========== -->
  <div class="settings-screen">
    <div class="settings-header">
      <h2 class="settings-title">إعدادات النظام</h2>
      <span class="mode-badge" :class="isServer ? 'mode-server' : 'mode-local'">
        {{ isServer ? 'الخادم المركزي (PostgreSQL)' : 'التخزين المحلي (IndexedDB)' }}
      </span>
    </div>
    <div class="settings-body">
      <div class="settings-section">
        <h3 class="section-title">وضع التشغيل</h3>
        <div class="mode-options">
          <label class="mode-card" :class="{ active: mode === 'local' }">
            <input type="radio" :value="'local'" v-model="mode" />
            <div class="mode-info">
              <span class="mode-name">التخزين المحلي</span>
              <span class="mode-desc">البيانات محفوظة داخل متصفح هذا الجهاز فقط (IndexedDB). لا مزامنة بين الفروع.</span>
            </div>
          </label>
          <label class="mode-card" :class="{ active: mode === 'server' }">
            <input type="radio" :value="'server'" v-model="mode" />
            <div class="mode-info">
              <span class="mode-name">الخادم المركزي</span>
              <span class="mode-desc">بيانات موحّدة عبر قاعدة بيانات PostgreSQL: مزامنة فورية بين جميع الفروع والأجهزة.</span>
            </div>
          </label>
        </div>
      </div>

      <div class="settings-section" v-if="mode === 'server'">
        <h3 class="section-title">الخادم المركزي</h3>
        <div class="field-row">
          <label class="field-label">عنوان الخادم (API)</label>
          <input class="field-input" v-model="apiUrl" placeholder="https://example.com" />
        </div>
        <div class="conn-status" v-if="serverStatus">
          <span class="status-dot" :class="serverStatus.ok ? 'ok' : 'bad'"></span>
          <span class="status-text">{{ serverStatus.msg }}</span>
          <button class="btn btn-sm" @click="checkServer">إعادة الفحص</button>
        </div>
        <div class="hint">ملاحظة: عند تبديل الوضع ستُطلب منك إعادة تسجيل الدخول.</div>
      </div>

      <div class="settings-section">
        <h3 class="section-title">تسجيل الخروج</h3>
        <button class="btn btn-danger" @click="doLogout">تسجيل الخروج من هذه الجلسة</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { getStorageMode, setStorageMode } from '../../db/storage.js'
import { apiBase, serverLogout } from '../../db/api.js'

const mode = ref(getStorageMode())
const apiUrl = ref(apiBase())
const serverStatus = ref(null)

const isServer = computed(() => mode.value === 'server')

watch(mode, (newMode) => {
  setStorageMode(newMode)
  serverLogout().catch(() => {})
  if (newMode === 'server') checkServer()
})

watch(apiUrl, (v) => {
  if (v && v !== apiBase()) {
    localStorage.setItem('sharaf-api-base', v.trim())
    location.reload()
  }
})

async function checkServer () {
  try {
    const res = await fetch(apiUrl.value + '/api/health')
    const j = await res.json()
    serverStatus.value = { ok: j.status === 'ok', msg: 'الخادم متصل ويعمل: Sharaf ERP API' }
  } catch {
    serverStatus.value = { ok: false, msg: 'تعذّر الاتصال بالخادم — تحقق من العنوان والشبكة' }
  }
}

function doLogout () {
  serverLogout().catch(() => {})
  window.dispatchEvent(new CustomEvent('sharaf-logout'))
}

onMounted(() => { if (mode.value === 'server') checkServer() })
</script>

<style scoped>
.settings-screen {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  flex-wrap: wrap;
}
.settings-title {
  font-size: var(--font-size-lg);
  color: var(--color-primary);
  margin: 0;
}
.settings-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-width: 720px;
}
.settings-section {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.section-title {
  font-size: var(--font-size-base);
  color: var(--color-text);
  margin: 0;
}
.mode-options { display: flex; flex-direction: column; gap: var(--space-2); }
.mode-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-2);
  cursor: pointer;
}
.mode-card.active {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
}
.mode-card input { margin-top: 2px; }
.mode-info { display: flex; flex-direction: column; }
.mode-name { font-weight: 600; color: var(--color-text); }
.mode-desc { font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-top: 2px; }
.field-row { display: flex; flex-direction: column; gap: 4px; }
.field-label { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
.field-input {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 8px 10px;
  font-size: var(--font-size-sm);
  direction: ltr;
}
.conn-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-sm);
}
.status-dot { width: 8px; height: 8px; border-radius: 50%; }
.status-dot.ok { background: #16a34a; }
.status-dot.bad { background: #dc2626; }
.status-text { color: var(--color-text-secondary); }
.hint { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.mode-badge {
  font-size: var(--font-size-xs);
  padding: 4px 10px;
  border-radius: 999px;
  white-space: nowrap;
}
.mode-badge.mode-server { background: #16a34a22; color: #16a34a; }
.mode-badge.mode-local { background: #f59e0b22; color: #b45309; }
.btn {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  color: var(--color-text);
  padding: 6px 12px;
  font-size: var(--font-size-sm);
  cursor: pointer;
}
.btn-sm { padding: 4px 10px; font-size: var(--font-size-xs); }
.btn-danger { background: #dc2626; color: #fff; border-color: #dc2626; }
@media (min-width: 768px) {
  .mode-options { flex-direction: row; }
  .mode-card { flex: 1; }
}
</style>
