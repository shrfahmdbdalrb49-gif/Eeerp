/* ============================================
   تقسيم ملفات SQL إلى أوامر منفصلة — نسخة سليمة
   المشكلة السابقة: split بسيط كان يدمج التعليقات مع CREATE الأولى ويحذفها
   الحل: حذف أسطر التعليقات المستقلة أولًا، ثم التقسيم بالمنقوطة
   ============================================ */
export function splitSQL(src) {
  const lines = src.split('\n').filter(l => l.trim().length > 0 && !l.trim().startsWith('--'))
  const text = lines.join('\n')
  /* تقسيم ذكي: لا يقسم عند ؛ داخل أوامر DO $$ ... $$ أو $anything$ ... $anything$ */
  const result = []
  let cur = ''
  let inDollar = false
  let dollarTag = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (!inDollar && ch === '$') {
      /* بداية $tag$ */
      const m = text.slice(i).match(/^(\$([a-zA-Z0-9_]*)\$)/)
      if (m) {
        inDollar = true
        dollarTag = m[1]
        cur += m[0]
        i += m[0].length - 1
        continue
      }
    } else if (inDollar && text.slice(i).startsWith(dollarTag)) {
      inDollar = false
      cur += dollarTag
      i += dollarTag.length - 1
      dollarTag = ''
      continue
    }
    if (!inDollar && ch === ';') {
      const stmt = cur.trim()
      if (stmt.length > 0) result.push(stmt)
      cur = ''
      continue
    }
    cur += ch
  }
  if (cur.trim().length > 0) result.push(cur.trim())
  return result
}
