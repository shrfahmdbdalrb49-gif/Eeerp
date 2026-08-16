/*
 * dev-only: هذا الملف غير مستخدم في الإنتاج.
 * فقط لاختبار تشغيل الخادم محليًا في بيئة بدون PostgreSQL.
 */
export function getPool() {
  throw new Error('PostgreSQL not configured')
}
