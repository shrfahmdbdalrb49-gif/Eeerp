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

export { STORAGE_MODE }
