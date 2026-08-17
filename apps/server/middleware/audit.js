/* ============================================
   سجل التدقيق المركزي
   جدول audit_logs الفعلي: id, user_id, action, ref_kind, ref_id, details (jsonb), created_at
   ============================================ */
export async function auditLog(req, action, refKind, refId, detail = null) {
  try {
    const { query } = await import('../config/db.js')
    const userId = req.user?.id || null
    const details = detail != null ? (typeof detail === 'object' ? detail : { note: String(detail) }) : null
    await query(
      `INSERT INTO audit_logs (user_id, action, ref_kind, ref_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, refKind || null, refId != null ? Number(refId) : null,
       details != null ? JSON.stringify(details) : null],
    )
  } catch (err) {
    console.error('[audit error]', err.message)
  }
}

export default { auditLog }
