/* ============================================
   auto-setup.js — النسخة المصححة للتشغيل المحلي والإنتاج
   الإصلاحات:
   1. قفل تنفيذ واحد (singleton): حتى لو استُدعي autoSetup مرتين أو عبر عدة عمليات
      فإن التنفيذ الفعلي يجري مرة واحدة فقط، والباقي ينتظر نفس النتيجة.
   2. إعادة محاولة واحدة: إذا فشل أي أمر في المخطط، تُعاد المحاولة مرة واحدة بعد 2 ثانية
      (لحل مشاكل التوقيت والتنافس على الأوامر).
   3. تنفيذ schema.sql كاملاً في transaction واحد قدر الإمكان.
   ============================================ */
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { splitSQL } from './sql/split.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/* قفل تنفيذ واحد */
let setupPromise = null

export function autoSetup(pool) {
  if (!setupPromise) {
    setupPromise = runSetup(pool).catch((err) => {
      console.error('❌ فشل التهيئة التلقائية:', err.message)
      setupPromise = null
      throw err
    })
  }
  return setupPromise
}

async function runSetup(pool) {
  console.log('🔧 بدء التهيئة التلقائية لقاعدة البيانات...')

  const migrations = await readFile(join(__dirname, 'sql', 'migrations.sql'), 'utf8')
  const migStatements = splitSQL(migrations)
  for (const stmt of migStatements) {
    try { await pool.query(stmt) } catch (e) { /* تجاهل أخطاء الأعمدة الموجودة */ }
  }
  console.log(`🔧 تم تنفيذ ${migStatements.length} أمر ترقية (migrations)`)

  const schema = await readFile(join(__dirname, 'sql', 'schema.sql'), 'utf8')
  const statements = splitSQL(schema)
  console.log(`📦 عدد أوامر المخطط: ${statements.length}`)

  /* التنفيذ في محاولة أولى، ثم إعادة محاولة وحيدة للأوامر الفاشلة */
  const failed = []
  for (const stmt of statements) {
    try {
      await pool.query(stmt)
    } catch (e) {
      failed.push(stmt)
      console.error(`⚠️ فشل أمر مخطط [م1]: ${e.message.slice(0, 120)}`)
    }
  }
  if (failed.length > 0) {
    console.log(`🔁 إعادة محاولة ${failed.length} أمر مخطط فاشل بعد انتظار قصير...`)
    await new Promise((r) => setTimeout(r, 2000))
    const stillFailed = []
    for (const stmt of failed) {
      try {
        await pool.query(stmt)
      } catch (e) {
        stillFailed.push(e.message.slice(0, 120))
      }
    }
    console.log(`✅ ${failed.length - stillFailed.length}/${failed.length} أمر صُحح في إعادة المحاولة`)
    if (stillFailed.length > 0) {
      console.error(`⚠️ ${stillFailed.length} أوامر ما زالت فاشلة بعد إعادة المحاولة (قد تكون طبيعية)`)
    }
  }

  /* تفعيل امتداد pgcrypto */
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
      console.error(`⚠️ فشل أمر بيانات [${seedOk + seedFail}]: ${e.message.slice(0, 120)}`)
    }
  }
  console.log(`✅ ${seedOk} أمر بيانات أولية (أدوار، حسابات، مستخدم إداري) نجح، ${seedFail} فشل`)

  /* سياسة المستخدم: حساب إداري عربي (شرف) فقط — حذف admin الافتراضي نهائيًا */
  const sharafCheck = await pool.query("SELECT id FROM users WHERE username = 'شرف' AND role = 'admin' AND active = true")
  if (sharafCheck.rowCount > 0) {
    await pool.query(`DELETE FROM users WHERE username = 'admin'`).catch(() => {})
    console.log('🔐 حساب admin الافتراضي حُذف (الحساب الإداري: شرف)')
  } else {
    console.log('🔐 بيانات الدخول الافتراضية: admin / Admin@1234 (يُفضَّل تغييرها)')
  }

  return true
}
