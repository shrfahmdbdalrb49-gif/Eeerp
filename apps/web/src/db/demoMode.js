/* ============================================
   شرف ERP - وضع الاستعراض الذكي (Demo Mode)

   عند النشر على GitHub Pages لا يوجد خادم خلفي متاح
   (الخادم على Railway فقط). هذا الملف يجعل الواجهة
   ذكية: إذا اتصلت بالخادم بنجاح تستخدمه، وإلا تعمل
   بالكامل محليًا (IndexedDB) بحيث تفتح من أي جهاز
   وتعمل دون رسالة "خطأ في جلب البيانات".

   سلوك الوضع:
   - في وضعية 'server': يحاول الاتصال بالخادم أول مرة
     فإن فشل يستبدل الوضعية محليًا 'local' تلقائيًا
     ويحفظ الاختيار (يمكن الرجوع يدويًا لاحقًا)
   - يمكن تفعيل الوضع المحلي دائمًا عبر:
     localStorage.setItem('sharaf-storage-mode','local')
     أو ?demo=1 في الرابط
   ============================================ */
import { getStorageMode, setStorageMode, STORAGE_MODE } from './storage.js'
import { apiBase } from './api.js'
import { migrateLegacyData } from './migration.js'

export async function serverReachable(timeoutMs = 6000) {
  try {
    const r = await fetch(apiBase() + '/health', { signal: AbortSignal.timeout(timeoutMs) })
    return r.ok
  } catch {
    return false
  }
}

/* استدعى هذه الدالة عند بدء التطبيق قبل أي عملية مصادقة */
export async function ensureDemoMode() {
  /* تفعيل إجباري عبر الرابط (?demo=1) */
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('demo') === '1') {
      setStorageMode('local')
      return 'local'
    }
  } catch {}

  if (getStorageMode() === 'server') {
    const reachable = await serverReachable(5000)
    if (!reachable) {
      /* الخادم غير متاح (مثل النشر على GitHub Pages) → التحويل محليًا */
      console.info('[SharafERP] الخادم غير متاح — التشغيل في وضع الاستعراض المحلي (IndexedDB)')
      setStorageMode('local')
    }
  }
  return getStorageMode()
}

/* هل النسخة الحالية تعمل في وضع الاستعراض المحلي؟ */
export function isDemo() {
  return getStorageMode() === 'local'
}

export { STORAGE_MODE }


export { migrateLegacyData }
