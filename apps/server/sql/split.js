/* ============================================
   تقسيم ملفات SQL إلى أوامر منفصلة — نسخة سليمة
   المشكلة السابقة: split بسيط كان يدمج التعليقات مع CREATE الأولى ويحذفها
   الحل: حذف أسطر التعليقات المستقلة أولًا، ثم التقسيم بالمنقوطة
   ============================================ */
export function splitSQL(src) {
  const lines = src.split('\n').filter(l => l.trim().length > 0 && !l.trim().startsWith('--'))
  const text = lines.join('\n')
  return text.split(/;\s*\n/).map(s => s.trim()).filter(s => s.length > 0)
}
