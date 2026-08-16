<template>
  <div class="journal-screen">
    <div class="page-screen">
      <div class="page-header">
        <div class="page-title">
          <h1>الترحيل المحاسبي</h1>
          <p class="page-subtitle">القيود غير المرحّلة (معلّقة) — راجعها ثم رحّلها للأستاذ العام دفعة واحدة</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary btn-lg" @click="postAll" :disabled="pending.length === 0 || saving">
            <span v-if="saving" class="spin">⏳</span>
            <span>ترحيل الكل ({{ pending.length }})</span>
          </button>
        </div>
      </div>

      <div class="info-card" v-if="pending.length">
        <p>يوجد <b>{{ pending.length }}</b> قيد(ًا) معلقًا غير مرحَّل — إجمالي مدين {{ fmt(totalDebit) }} ودائن {{ fmt(totalCredit) }}.
          لا يمكن إقفال الفترة التي يوجد فيها قيود غير مرحّلة.</p>
      </div>

      <div class="table-card">
        <table class="bolt-table">
          <thead>
            <tr>
              <th style="width:85px">رقم القيد</th>
              <th style="width:110px">التاريخ</th>
              <th>البيان</th>
              <th>الحسابات</th>
              <th style="width:115px; text-align:left">مدين</th>
              <th style="width:115px; text-align:left">دائن</th>
              <th style="width:165px">إجراء</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in pending" :key="e.id">
              <td><span class="link-cell">#{{ e.id }}</span></td>
              <td>{{ e.date }}</td>
              <td style="font-weight:600">{{ e.description || '—' }}</td>
              <td class="small-cells">{{ accountNames(e.lines) }}</td>
              <td class="num-cell">{{ fmt(e.debit) }}</td>
              <td class="num-cell">{{ fmt(e.credit) }}</td>
              <td>
                <button class="btn btn-primary btn-sm" @click="postOne(e.id)" :disabled="saving || Math.abs(e.debit - e.credit) > 0.005">
                  ترحيل
                </button>
                <button class="btn btn-outline btn-sm" @click="deleteOne(e)" :disabled="saving">حذف</button>
              </td>
            </tr>
            <tr v-if="pending.length === 0">
              <td colspan="7" class="empty-row">
                <div class="empty-box">
                  <span class="empty-icon">✅</span>
                  <p class="empty-title">لا توجد قيود معلقة</p>
                  <p class="empty-hint">كل القيود مرحّلة للأستاذ العام — النظام في حالة ممتازة</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="msg" class="toast" :class="msg.ok ? 'toast-ok' : 'toast-err'" @click="msg = null">
      {{ msg.text }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { db, activeAccounts } from '../../db/database.js'
import { fmt, pendingJournalEntries, postPendingEntry, deletePendingEntry } from '../../db/engine.js'
import { requirePermission } from '../../db/session.js'

const pending = ref([])
const accounts = ref([])
const saving = ref(false)
const msg = ref(null)

const totalDebit = computed(() => pending.value.reduce((s, e) => s + (e.debit || 0), 0))
const totalCredit = computed(() => pending.value.reduce((s, e) => s + (e.credit || 0), 0))

function accountNames(lines) {
  const names = (lines || []).map(l => {
    const a = accounts.value.find(x => x.id === l.accountId)
    return a ? (a.code + ' — ' + a.name) : 'حساب محذوف'
  })
  return [...new Set(names)].join(' · ')
}

async function loadData() {
  accounts.value = await activeAccounts()
  pending.value = await pendingJournalEntries()
}

function toast(text, ok = true) {
  msg.value = { text, ok }
  setTimeout(() => { if (msg.value?.text === text) msg.value = null }, 3500)
}

async function postOne(id) {
  saving.value = true
  try {
    await requirePermission('journal.write', 'ترحيل قيد معلق')
    await postPendingEntry(id)
    toast('تم ترحيل القيد بنجاح ✓')
    await loadData()
  } catch (e) {
    toast(e.message, false)
  } finally {
    saving.value = false
  }
}

async function postAll() {
  saving.value = true
  let ok = 0
  try {
    await requirePermission('journal.write', 'ترحيل القيود المعلقة')
    for (const e of [...pending.value]) {
      if (Math.abs(e.debit - e.credit) > 0.005) continue
      try {
        await postPendingEntry(e.id)
        ok++
      } catch (err) {
        toast('فشل ترحيل القيد #' + e.id + ': ' + err.message, false)
        break
      }
    }
    toast(ok ? 'تم ترحيل ' + ok + ' قيد(ًا) بنجاح ✓' : 'لم يُرحّل أي قيد', ok > 0)
    await loadData()
  } catch (e) {
    toast(e.message, false)
  } finally {
    saving.value = false
  }
}

async function deleteOne(e) {
  if (e.posted) return
  try {
    await requirePermission('journal.write', 'حذف قيد معلق')
    await deletePendingEntry(e.id)
    toast('تم حذف القيد المعلق #' + e.id)
    await loadData()
  } catch (err) {
    toast(err.message, false)
  }
}
onMounted(loadData)
</script>

<style scoped>
.journal-screen { height: 100%; display: flex; flex-direction: column; }
.page-screen { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 14px 18px 10px; border-bottom: 1px solid var(--ox-border, #e5e7eb); }
.page-title h1 { font-size: 17px; font-weight: 700; margin: 0; }
.page-subtitle { font-size: 12px; color: var(--ox-muted, #6b7280); margin: 3px 0 0; }
.header-actions { display: flex; gap: 8px; }
.btn { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; padding: 7px 14px; border-radius: 6px; border: none; cursor: pointer; }
.btn-primary { background: var(--ox-primary, #2563eb); color: #fff; }
.btn-lg { padding: 9px 18px; font-size: 14px; }
.btn-outline { background: #fff; border: 1px solid var(--ox-border, #d1d5db); color: #374151; }
.btn-sm { font-size: 12px; padding: 4px 10px; }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.info-card { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px 14px; margin: 10px 18px; font-size: 12.5px; color: #1e40af; }
.info-card p { margin: 0; }
.table-card { flex: 1; margin: 10px 18px 14px; border: 1px solid var(--ox-border, #e5e7eb); border-radius: 8px; overflow: auto; min-height: 0; }
.bolt-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.bolt-table th { background: var(--ox-head, #f3f4f6); padding: 8px 10px; text-align: right; font-weight: 600; border-bottom: 2px solid var(--ox-border, #e5e7eb); position: sticky; top: 0; }
.bolt-table td { padding: 7px 10px; border-bottom: 1px solid var(--ox-border, #f0f0f0); vertical-align: middle; }
.link-cell { color: var(--ox-primary, #2563eb); font-weight: 600; }
.small-cells { font-size: 11.5px; color: var(--ox-muted, #6b7280); line-height: 1.45; }
.num-cell { text-align: left; font-variant-numeric: tabular-nums; }
.empty-row td { padding: 48px 24px !important; border-bottom: none; }
.empty-box { text-align: center; color: var(--ox-muted, #6b7280); }
.empty-icon { font-size: 30px; display: block; margin-bottom: 8px; }
.empty-title { font-weight: 600; color: #374151; margin: 0 0 4px; }
.empty-hint { font-size: 12px; margin: 0; }
.toast { position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%); z-index: 9500; padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; box-shadow: 0 8px 30px rgba(0,0,0,.25); cursor: pointer; }
.toast-ok { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
.toast-err { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
.spin { display: inline-block; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
