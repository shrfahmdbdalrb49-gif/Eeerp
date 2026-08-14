<template>
  <div class="login-screen">
    <div class="login-card">
      <div class="login-brand">
        <div class="brand-icon">⚕</div>
        <h1>شرف ERP</h1>
        <p>نظام إدارة الصيدليات</p>
      </div>
      <form class="login-form" @submit.prevent="doLogin">
        <div class="field">
          <label>اسم المستخدم</label>
          <input type="text" v-model.trim="username" autocomplete="username" autofocus />
        </div>
        <div class="field">
          <label>كلمة المرور</label>
          <input type="password" v-model="password" autocomplete="current-password" />
        </div>
        <div v-if="error" class="login-error">{{ error }}</div>
        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? 'جاري التحقق...' : 'تسجيل الدخول' }}
        </button>
        <div class="login-hint">
          حسابات جاهزة: admin / admin123 (مدير كامل الصلاحيات) — cashier / cash123 (كاشير/محاسب)
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { login } from '../../db/session.js'

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const emit = defineEmits(['logged-in'])

async function doLogin() {
  error.value = ''
  if (!username.value || !password.value) {
    error.value = 'أدخل اسم المستخدم وكلمة المرور'
    return
  }
  loading.value = true
  try {
    const res = await login(username.value, password.value)
    if (res.ok) emit('logged-in', res.user)
    else error.value = res.error
  } catch (e) {
    error.value = 'حدث خطأ أثناء تسجيل الدخول'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-screen {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, #094080 0%, #0D5AA7 55%, #1E7FE0 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 16px;
}
.login-card {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
  width: 100%;
  max-width: 400px;
  overflow: hidden;
}
.login-brand {
  background: var(--color-primary, #0D5AA7);
  color: #fff;
  text-align: center;
  padding: 26px 16px 22px;
}
.brand-icon { font-size: 44px; margin-bottom: 6px; }
.login-brand h1 { margin: 0; font-size: 26px; }
.login-brand p { margin: 4px 0 0; opacity: 0.85; font-size: 14px; }
.login-form { padding: 22px 24px 18px; }
.login-form .field { margin-bottom: 14px; }
.login-form label { display: block; font-size: 13px; font-weight: bold; color: #444; margin-bottom: 5px; }
.login-form input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ccd3de;
  border-radius: 6px;
  font-size: 15px;
  box-sizing: border-box;
}
.login-form input:focus { outline: none; border-color: var(--color-primary, #0D5AA7); box-shadow: 0 0 0 3px rgba(13, 90, 167, 0.15); }
.login-error {
  background: #fdeaea;
  color: #b71c1c;
  border: 1px solid #f0bcbc;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 13px;
  margin-bottom: 12px;
}
.login-btn {
  width: 100%;
  padding: 12px;
  background: var(--color-primary, #0D5AA7);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}
.login-btn:hover { background: #094080; }
.login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.login-hint {
  margin-top: 14px;
  font-size: 12px;
  color: #7a8699;
  text-align: center;
  line-height: 1.5;
}
</style>
