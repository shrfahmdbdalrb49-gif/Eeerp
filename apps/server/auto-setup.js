/* ============================================
   التهيئة التلقائية لقاعدة البيانات
   تُنشئ الجداول والبيانات الأولية تلقائيًا عند بدء الخادم
   لا حاجة لتشغيل أي ملف SQL يدويًا
   ============================================ */
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export async function autoSetup(pool) {
  console.log('🔧 بدء التهيئة التلقائية لقاعدة البيانات...')
  try {
    const schema = await readFile(join(__dirname, 'sql', 'schema.sql'), 'utf8')
    // تنفيذ أوامر CREATE TABLE واحدة تلو الأخرى (pg.query لا يدعم pg_multiple_statements الافتراضي)
    const statements = schema.split(/;\s*\n/).map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'))
    for (const stmt of statements) {
      // تخطي أوامر CREATE INDEX المنفصلة (إن وجدت) — ستُنفذ مع جدولها
      await pool.query(stmt)
    }
    console.log(`✅ تم إنشاء ${statements.length} أمر CREATE TABLE/INDEX`)

    // تفعيل امتداد pgcrypto لاستخدام crypt() و gen_salt() في seed.sql
    await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto')

    const seed = await readFile(join(__dirname, 'sql', 'seed.sql'), 'utf8')
    const seedStatements = seed.split(/;\s*\n/).map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'))
    for (const stmt of seedStatements) {
      await pool.query(stmt)
    }
    console.log(`✅ تم تنفيذ ${seedStatements.length} أمر بيانات أولية (أدوار، حسابات، مستخدم admin)`)
    console.log('🔐 بيانات الدخول: admin / Admin@1234 (يُفضَّل تغييرها)')
    return true
  } catch (err) {
    console.error('⚠️ فشل التهيئة التلقائية:', err.message)
    console.error('💡 قد تكون الجداول موجودة مسبقًا — يستمر الخادم بالعمل.')
    return false
  }
}

export default autoSetup
