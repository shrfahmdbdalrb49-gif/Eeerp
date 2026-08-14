<template>
  <!-- ========== إعدادات النظام — نمط bolt.host ========== -->
  <div class="settings-screen">
    <div class="page-screen">
      <div class="page-header">
        <div class="page-title">
          <h1>الإعدادات</h1>
          <p class="page-subtitle">وضع التشغيل والخادم المركزي والجلسة</p>
        </div>
        <span class="mode-badge" :class="isServer ? 'mode-server' : 'mode-local'">
          {{ isServer ? 'الخادم المركزي (PostgreSQL)' : 'التخزين المحلي (IndexedDB)' }}
        </span>
      </div>

      <!-- وضع التشغيل -->
      <div class="settings-card">
        <div class="card-heading"><span class="h-icon">⚙️</span> وضع التشغيل</div>
        <div class="mode-options">
          <label class="mode-card" :class="{ active: mode === 'local' }">
            <input type="radio" :value="'local'" v-model="mode" />
            <div class="mode-info">
              <span class="mode-icon">💻</span>
              <div class="mode-text">
                <span class="mode-name">التخزين المحلي</span>
                <span class="mode-desc">البيانات محفوظة داخل متصفح هذا الجهاز فقط (IndexedDB). لا مزامنة بين الفروع.</span>
              </div>
            </div>
          </label>
          <label class="mode-card" :class="{ active: mode === 'server' }">
            <input type="radio" :value="'server'" v-model="mode" />
            <div class="mode-info">
              <span class="mode-icon">☁️</span>
              <div class="mode-text">
                <span class="mode-name">الخادم المركزي</span>
                <span class="mode-desc">بيانات موحّدة عبر قاعدة بيانات PostgreSQL: مزامنة فورية بين جميع الفروع والأجهزة.</span>
              </div>
            </div>
          </label>
        </div>
      </div>

      <!-- الخادم المركزي -->
      <div class="settings-card" v-if="mode === 'server'">
        <div class="card-heading"><span class="h-icon">🌐</span> الخادم المركزي</div>
        <div class="field-group">
          <label class="field-label">عنوان الخادم (API)</label>
          <input class="fi" v-model="apiUrl" placeholder="https://example.com" />
        </div>
        <div class="conn-status" v-if="serverStatus">
          <span class="status-dot" :class="serverStatus.ok ? 'ok' : 'bad'"></span>
          <span class="status-text" :class="serverStatus.ok ? 'ok' : 'bad'">{{ serverStatus.msg }}</span>
          <button class="btn btn-outline btn-sm" @click="checkServer">إعادة الفحص</button>
        </div>
        <div class="hint">ملاحظة: عند تبديل الوضع ستُطلب منك إعادة تسجيل الدخول.</div>
      </div>

      <!-- الجلسة -->
      <div class="settings-card">
        <div class="card-heading"><span class="h-icon">🚪</span> تسجيل الخروج</div>
        <p class="section-hint">إنهاء الجلسة الحالية وإعادتك إلى شاشة الدخول.</p>
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

async function checkServer() {
  try {
    const res = await fetch(apiUrl.value + '/api/health')
    const j = await res.json()
    serverStatus.value = { ok: j.status === 'ok', msg: 'الخادم متصل ويعمل: Sharaf ERP API' }
  } catch {
    serverStatus.value = { ok: false, msg: 'تعذّر الاتصال بالخادم — تحقق من العنوان والشبكة' }
  }
}

function doLogout() {
  serverLogout().catch(() => {})
  window.dispatchEvent(new CustomEvent('sharaf-logout'))
}

onMounted(() => { if (mode.value === 'server') checkServer() })
</script>

<style scoped>
/* ============================================
   الإعدادات — نمط bolt.host
   ============================================ */
.settings-screen { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
.page-screen { padding: 24px; display: flex; flex-direction: column; gap: 16px; overflow: auto; max-width: 760px; width: 100%; }
.page-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.page-title h1 { font-size: 26px; font-weight: 800; color: #0f172a; line-height: 1.2; }
.page-subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }

.mode-badge { font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px; white-space: nowrap; }
.mode-badge.mode-server { background: #f0fdf4; color: #15803d; }
.mode-badge.mode-local { background: #fff7ed; color: #c2410c; }

.settings-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05); padding: 18px; }
.card-heading { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 14px; }
.h-icon { font-size: 16px; }
.section-hint { font-size: 13px; color: #64748b; margin: 0 0 12px; }
.hint { font-size: 12px; color: #94a3b8; margin-top: 8px; }

.mode-options { display: flex; flex-direction: column; gap: 10px; }
.mode-card { display: flex; align-items: flex-start; gap: 12px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; cursor: pointer; transition: all 0.15s; }
.mode-card:hover { border-color: #93c5fd; background: #fafcff; }
.mode-card.active { border-color: #2563eb; background: #eff6ff; }
.mode-card input { margin-top: 3px; accent-color: #2563eb; }
.mode-info { display: flex; align-items: flex-start; gap: 12px; }
.mode-icon { font-size: 26px; }
.mode-text { display: flex; flex-direction: column; gap: 3px; }
.mode-name { font-weight: 700; color: #0f172a; font-size: 14px; }
.mode-desc { font-size: 12px; color: #64748b; line-height: 1.5; }

.field-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
.field-label { font-size: 12px; font-weight: 600; color: #64748b; }
.fi { height: 38px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 12px; font-size: 13px; font-family: inherit; color: #0f172a; background: #fff; outline: none; direction: ltr; }
.fi:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15); }

.conn-status { display: flex; align-items: center; gap: 8px; font-size: 13px; margin-top: 10px; }
.status-dot { width: 8px; height: 8px; border-radius: 999px; flex-shrink: 0; }
.status-dot.ok { background: #16a34a; }
.status-dot.bad { background: #dc2626; }
.status-text { font-weight: 600; }
.status-text.ok { color: #15803d; }
.status-text.bad { color: #b91c1c; }

.btn { display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 18px; border-radius: 8px; font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer; border: 1px solid #d1d5db; background: #fff; color: #374151; transition: all 0.15s; white-space: nowrap; }
.btn:hover { background: #f9fafb; border-color: #9ca3af; }
.btn-sm { height: 32px; padding: 0 12px; font-size: 12px; }
.btn-danger { background: #dc2626; color: #fff; border-color: #dc2626; }
.btn-danger:hover { background: #b91c1c; border-color: #b91c1c; }

@media (min-width: 768px) {
  .mode-options { flex-direction: row; }
  .mode-card { flex: 1; }
}
@media (max-width: 768px) {
  .page-screen { padding: 16px; }
}
</style>
