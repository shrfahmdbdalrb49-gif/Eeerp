/* ============================================
   شرف ERP - تحديد نمط التخزين (محلي / خادم مركزي)
   يتم التبديل بمتغير واحد: STORAGE_MODE
   - 'local'  : IndexedDB داخل المتصفح (الأصل)
   - 'server' : الخادم المركزي PostgreSQL + JWT
   يمكن التبديل لاحقًا عبر الإعدادات دون إعادة بناء.
   ============================================ */
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

/* قراءة النمط المفضّل المحفوظ محليًا (إن وُجد) */
try {
  const saved = localStorage.getItem('sharaf-storage-mode')
  if (saved === 'local' || saved === 'server') STORAGE_MODE = saved
} catch {}

/* إصلاح «محتوى مختلط» (Mixed Content): عند نشر النظام على GitHub Pages (https) فإن محاولة
   الاتصال بخادم على localhost (http) تُرفض من المتصفح فورًا بخطأ «Failed to fetch».
   في هذه الحالة لا معنى لوضع الخادم، فنتحول تلقائيًا إلى التخزين المحلي. */
try {
  const securePage = location.protocol === 'https:'
  const triesLocalhost = (import.meta.env.VITE_API_BASE || 'localhost:4000').includes('localhost')
  if (securePage && triesLocalhost && STORAGE_MODE === 'server') {
    STORAGE_MODE = 'local'
    try { localStorage.setItem('sharaf-storage-mode', 'local') } catch {}
  }
} catch {}

export { STORAGE_MODE }
