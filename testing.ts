/**
 * Sharaf ERP — دوال مساعدة قابلة للاختبار (Pure functions).
 * تُستخدم في اختبارات vitest وتُستدعى من منطق الإنتاج.
 */

interface BatchLike {
  id: number;
  batchNo: string;
  expDate: Date;
  qty: number;
}

/**
 * اختيار التشغيلة وفق FEFO: الأقدم انتهاءً أولاً، مع تتبع المتبقي.
 * @returns التشغيلة المختارة + المتبقي منها، أو null إن لم تكفِ الكميات.
 */
export function pickFefo(batches: BatchLike[], qty: number): { batchNo: string; remaining: number } | null {
  const sorted = [...batches].filter((b) => b.qty > 0).sort((a, b) => a.expDate.getTime() - b.expDate.getTime());
  let remaining = qty;
  let picked: BatchLike | null = null;
  for (const batch of sorted) {
    if (batch.qty >= remaining) {
      picked = batch;
      remaining = 0;
      break;
    }
    remaining -= batch.qty;
  }
  if (picked === null) return null;
  return { batchNo: picked.batchNo, remaining };
}

/** تحويل الهلالة (صغرى) إلى نص عملة بعرض خانتين */
export function formatHalala(halala: number): string {
  return (halala / 100).toFixed(2);
}

/** توليد رقم مستند: {prefix}{YYYYMMDD}-{seq} */
export function nextSequence(prefix: string, date: Date, seq: number): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${prefix}${y}${m}${d}-${String(seq).padStart(7, "0")}`;
}
