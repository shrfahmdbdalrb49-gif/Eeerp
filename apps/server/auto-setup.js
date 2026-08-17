/* ============================================
   التهيئة التلقائية لقاعدة البيانات
   تُنشئ الجداول والبيانات الأولية تلقائيًا عند بدء الخادم
   لا حاجة لتشغيل أي ملف SQL يدويًا
   ============================================ */
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { splitSQL } from './sql/split.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export async function autoSetup(pool) {
  console.log('🔧 بدء التهيئة التلقائية لقاعدة البيانات...')
  try {
    /* أولًا: migrations — إضافة الأعمدة الناقصة للجداول القديمة (لا تفشل أبدًا) */
    try {
      const mig = await readFile(join(__dirname, 'sql', 'migrations.sql'), 'utf8')
      const migStatements = splitSQL(mig)
      for (const stmt of migStatements) {
        try { await pool.query(stmt) } catch (e) { /* تجاهل أخطاء الأعمدة الموجودة */ }
      }
      console.log(`🔧 تم تنفيذ ${migStatements.length} أمر ترقية (migrations) على الجداول القديمة`)
    } catch (e) { console.error('⚠️ migrations skipped:', e.message) }

    const schema = await readFile(join(__dirname, 'sql', 'schema.sql'), 'utf8')
    // تنفيذ أوامر CREATE TABLE واحدة تلو الأخرى (pg.query لا يدعم pg_multiple_statements الافتراضي)
    const statements = splitSQL(schema)
    console.log(`📦 عدد أوامر المخطط: ${statements.length}`)
    let ok = 0
    let fail = 0
    for (const stmt of statements) {
      try {
        await pool.query(stmt)
        ok++
      } catch (e) {
        fail++
        console.error(`⚠️ فشل أمر المخطط [${ok + fail}]: ${e.message}`)
      }
    }
    console.log(`✅ ${ok} أمر مخطط نجح، ${fail} فشل`)

    // تفعيل امتداد pgcrypto لاستخدام crypt() و gen_salt() في seed.sql
    await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto')

    const seed = await readFile(join(__dirname, 'sql', 'seed.sql'), 'utf8')
    const seedStatements = splitSQL(seed)
    let seedOk = 0
    let seedFail = 0
    for (const stmt of seedStatements) {
      try {
        await pool.query(stmt)
        seedOk++
      } catch (e) {
        seedFail++
        console.error(`⚠️ فشل أمر بيانات [${seedOk + seedFail}]: ${e.message}`)
      }
    }
    console.log(`✅ ${seedOk} أمر بيانات أولية (أدوار، حسابات، مستخدم admin) نجح، ${seedFail} فشل`)
    console.log('🔐 بيانات الدخول: admin / Admin@1234 (يُفضَّل تغييرها)')
    return true
  } catch (err) {
    console.error('⚠️ فشل التهيئة التلقائية كليًا:', err.message)
    return false
  }
}

export default autoSetup
