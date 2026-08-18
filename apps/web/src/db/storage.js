/* ============================================
   شرف ERP - تحديد نمط التخزين (محلي / خادم مركزي)
   يتم التبديل بمتغير واحد: STORAGE_MODE
   - 'local'  : IndexedDB داخل المتصفح (الأصل)
   - 'server' : الخادم المركزي PostgreSQL + JWT
   يمكن التبديل لاحقًا عبر الإعدادات دون إعادة بناء.
   ============================================ */
/* الافتراضي 'server': النظام منشور بالكامل على Railway (خادم + PostgreSQL).
   وضع الاستعراض المحلي يُفعّل يدويًا فقط (?demo=1 أو الإعدادات). */
let STORAGE_MODE = import.meta.env.VITE_STORAGE_MODE || 'server'

export function getStorageMode() {
  return STORAGE_MODE
}

export function setStorageMode(mode) {
  if (mode === 'local' || mode === 'server') {
    STORAGE_MODE = mode
    try { localStorage.setItem('sharaf-storage-mode', mode) } catch {}
  }
}

/* قراءة النمط المفضّل المحفوظ محليًا (إن وُجد)
   ملاحظة: لا نستعمل القيمة المحفوظة إذا كانت 'local' والنمط الافتراضي 'server'،
   لأن تحويل demoMode القديم إلى local ترك قيمة محفوظة في أجهزة المستخدمين
   وتسبب بفتح النظام على IndexedDB فارغ بدل الخادم المركزي. */
try {
  const saved = localStorage.getItem('sharaf-storage-mode')
  const defaultMode = String(import.meta.env.VITE_STORAGE_MODE || 'server')
  if ((saved === 'local' || saved === 'server') && saved === defaultMode) STORAGE_MODE = saved
} catch {}

/* إصلاح «محتوى مختلط» (Mixed Content): عند اتصال صفحة آمنة (https) بخادم localhost غير آمن،
   لا نحوّل النمط تلقائيًا بل نكتفي بإصلاح عنوان الخادم إلى النطاق الآمن نفسه (same-origin)
   لأن الخادم يعمل الآن على نفس النطاق. */
try {
  const securePage = location.protocol === 'https:'
  const triesLocalhost = (import.meta.env.VITE_API_BASE || 'localhost:4000').includes('localhost')
  if (securePage && triesLocalhost) {
    try { window.API_BASE = location.origin + '/api' } catch {}
  }
} catch {}

export { STORAGE_MODE }
