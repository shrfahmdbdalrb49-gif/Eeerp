<template>
  <!-- ========== شاشة دليل الحسابات ========== -->
  <div class="window-body flex-col">
    <div class="screen-toolbar">
      <button class="btn btn-primary" @click="showForm = true">➕ حساب جديد</button>
      <input type="text" class="input-field" placeholder="بحث برقم الحساب أو الاسم..." v-model="search" style="width:250px" />
      <select class="input-field filter-select" v-model="levelFilter">
        <option value="">جميع المستويات</option>
        <option value="1">المستوى الأول</option>
        <option value="2">المستوى الثاني</option>
        <option value="3">المستوى الثالث</option>
      </select>
    </div>

    <div class="table-scroll">
      <table class="dense-table">
        <thead>
          <tr>
            <th style="width:30px">#</th>
            <th>رقم الحساب</th>
            <th>اسم الحساب</th>
            <th>المستوى</th>
            <th>النوع</th>
            <th>الرصيد الافتتاحي</th>
            <th>الحركة المدينة</th>
            <th>الحركة الدائنة</th>
            <th>الرصيد الحالي</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(a, i) in filteredAccounts" :key="a.code" :style="{ 'padding-right': (a.level - 1) * 20 + 'px' }" @dblclick="openLedger(a)">
            <td>{{ i + 1 }}</td>
            <td><strong>{{ a.code }}</strong></td>
            <td :style="{ 'padding-right': (a.level - 1) * 20 + 'px', 'font-weight': a.level === 1 ? 'bold' : 'normal' }">
              {{ a.level > 1 ? '└─ ' : '' }}{{ a.name }}
            </td>
            <td>م{{ a.level }}</td>
            <td>{{ a.type }}</td>
            <td>{{ fmt(a.opening) }}</td>
            <td>{{ fmt(a.debit) }}</td>
            <td>{{ fmt(a.credit) }}</td>
            <td :class="{ 'text-danger': a.balance < 0 }"><strong>{{ fmt(a.balance) }}</strong></td>
            <td><span class="badge badge-posted">نشط</span></td>
          </tr>
          <tr v-if="filteredAccounts.length === 0">
            <td colspan="10" class="empty-state">لا توجد حسابات مطابقة</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- نموذج حساب جديد -->
    <div v-if="showForm" class="form-modal-overlay" @click.self="showForm = false">
      <div class="form-modal">
        <div class="modal-title">
          <span>حساب جديد</span>
          <button class="close-btn" @click="showForm = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="field-row"><label>رقم الحساب</label><input type="text" class="input-field" v-model="form.code" readonly /></div>
            <div class="field-row"><label>اسم الحساب</label><input type="text" class="input-field" v-model="form.name" /></div>
            <div class="field-row"><label>الحساب الأب</label>
              <select class="input-field" v-model="form.parent">
                <option value="">— بدون أب —</option>
                <option v-for="p in mainAccounts" :key="p.code" :value="p.code">{{ p.code }} - {{ p.name }}</option>
              </select>
            </div>
            <div class="field-row"><label>النوع</label>
              <select class="input-field" v-model="form.type">
                <option>أصول</option>
                <option>خصوم</option>
                <option>إيرادات</option>
                <option>مصروفات</option>
              </select>
            </div>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" @click="saveAccount">💾 حفظ</button>
          <button class="btn btn-secondary" @click="showForm = false">إلغاء</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const search = ref('')
const levelFilter = ref('')
const showForm = ref(false)

const accounts = ref([
  { code: '1', name: 'الأصول', level: 1, type: 'أصول', opening: 5000000, debit: 1200000, credit: 300000 },
  { code: '1-1', name: 'الأصول المتداولة', level: 2, type: 'أصول', opening: 3000000, debit: 800000, credit: 200000 },
  { code: '1-1-1', name: 'الصندوق', level: 3, type: 'أصول', opening: 2450000, debit: 650000, credit: 180000 },
  { code: '1-1-2', name: 'البنوك', level: 3, type: 'أصول', opening: 1500000, debit: 400000, credit: 300000 },
  { code: '1-1-3', name: 'الذمم المدينة (عملاء)', level: 3, type: 'أصول', opening: 85000, debit: 150000, credit: 100000 },
  { code: '1-2', name: 'المخزون', level: 2, type: 'أصول', opening: 2000000, debit: 400000, credit: 100000 },
  { code: '1-2-1', name: 'مخزون الأدوية', level: 3, type: 'أصول', opening: 1800000, debit: 380000, credit: 95000 },
  { code: '1-2-2', name: 'مستلزمات طبية', level: 3, type: 'أصول', opening: 200000, debit: 20000, credit: 5000 },
  { code: '2', name: 'الخصوم', level: 1, type: 'خصوم', opening: 1200000, debit: 100000, credit: 500000 },
  { code: '2-1', name: 'الذمم الدائنة (موردون)', level: 2, type: 'خصوم', opening: 865000, debit: 80000, credit: 350000 },
  { code: '2-2', name: 'قروض بنكية', level: 2, type: 'خصوم', opening: 335000, debit: 20000, credit: 150000 },
  { code: '3', name: 'حقوق الملكية', level: 1, type: 'خصوم', opening: 3800000, debit: 0, credit: 200000 },
  { code: '4', name: 'الإيرادات', level: 1, type: 'إيرادات', opening: 0, debit: 50000, credit: 4500000 },
  { code: '4-1', name: 'إيرادات المبيعات', level: 2, type: 'إيرادات', opening: 0, debit: 30000, credit: 4200000 },
  { code: '4-2', name: 'إيرادات التأمين', level: 2, type: 'إيرادات', opening: 0, debit: 20000, credit: 300000 },
  { code: '5', name: 'المصروفات', level: 1, type: 'مصروفات', opening: 0, debit: 1800000, credit: 10000 },
  { code: '5-1', name: 'تكلفة المبيعات', level: 2, type: 'مصروفات', opening: 0, debit: 1500000, credit: 5000 },
  { code: '5-2', name: 'المصروفات التشغيلية', level: 2, type: 'مصروفات', opening: 0, debit: 300000, credit: 5000 },
])

const form = ref({ code: '', name: '', parent: '', type: 'أصول' })

const mainAccounts = computed(() => accounts.value.filter(a => a.level === 1))

const filteredAccounts = computed(() =>
  accounts.value.filter(a => {
    if (levelFilter.value && String(a.level) !== levelFilter.value) return false
    if (search.value) {
      const q = search.value
      return a.name.includes(q) || a.code.includes(q)
    }
    return true
  })
)

function fmt(n) {
  return Number(n).toLocaleString('en-US')
}

function saveAccount() {
  if (!form.value.name) {
    alert('⚠️ أدخل اسم الحساب')
    return
  }
  const next = String(accounts.value.length + 1).padStart(3, '0')
  accounts.value.push({
    code: form.value.code || ('6-' + next),
    name: form.value.name,
    level: form.value.parent ? 3 : 1,
    type: form.value.type,
    opening: 0, debit: 0, credit: 0,
  })
  showForm.value = false
  alert('✅ تم إضافة الحساب: ' + form.value.name)
}

function openLedger(a) {
  alert('فتح كشف حساب: ' + a.code + ' - ' + a.name + '\nالرصيد الحالي: ' + fmt(a.opening + a.debit - a.credit))
}
</script>

<style scoped>
.screen-toolbar {
  display: flex;
  gap: 6px;
  padding: 6px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  margin-bottom: 6px;
  flex-shrink: 0;
  align-items: center;
  flex-wrap: wrap;
}

.filter-select { width: 150px; }

.table-scroll { flex: 1; overflow: auto; background: var(--color-bg-primary); min-height: 0; }

.empty-state { text-align: center; color: var(--color-text-secondary); padding: 16px; }
.text-danger { color: var(--color-error); }

.form-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-modal {
  background: var(--color-bg-primary);
  border: 2px solid var(--color-primary);
  border-radius: 4px;
  width: 480px;
  max-width: 92vw;
  box-shadow: 4px 4px 16px rgba(0,0,0,0.3);
}

.modal-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--color-primary);
  color: white;
  font-weight: bold;
  padding: 4px 10px;
}

.close-btn { background: transparent; border: none; color: white; cursor: pointer; font-size: 14px; }
.modal-body { padding: 10px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }

.field-row { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
.field-row label { width: 100px; font-size: var(--font-size-sm); flex-shrink: 0; color: var(--color-text-secondary); }

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 6px 10px;
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
}

@media (max-width: 768px) {
  .screen-toolbar { flex-direction: column; }
  .screen-toolbar .input-field, .screen-toolbar .filter-select { width: 100% !important; }
  .form-grid { grid-template-columns: 1fr; }
}
</style>
