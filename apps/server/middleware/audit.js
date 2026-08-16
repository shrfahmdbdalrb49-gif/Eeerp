/* ============================================
   سجل التدقيق المركزي
   ============================================ */
export async function auditLog(req, action, refKind, refId, detail = null) {
  try {
    const userId = req.user?.id || null
    const userName = req.user?.full_name || req.user?.username || null
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null
    await (await import('../config/db.js')).query(
      `INSERT INTO audit_logs (user_id, user_name, action, ref_kind, ref_id, detail, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, userName, action, refKind || null, refId != null ? Number(refId) : null,
       detail != null ? JSON.stringify(detail) : null, ip],
    )
  } catch (err) {
    console.error('[audit error]', err.message)
  }
}

export default { auditLog }
