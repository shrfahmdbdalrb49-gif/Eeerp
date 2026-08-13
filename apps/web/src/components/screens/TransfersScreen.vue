<template>
  <!-- ========== شاشة التحويل بين الفروع ========== -->
  <div class="window-body flex-col">
    <div class="screen-layout">
      <div class="screen-sidebar">
        <button :class="['screen-tab', { active: tab === 'new' }]" @click="tab = 'new'">📤 تحويل جديد</button>
        <button :class="['screen-tab', { active: tab === 'list' }]" @click="tab = 'list'">📋 سجل التحويلات</button>
      </div>

      <div class="screen-content">
        <div v-if="tab === 'new'" class="flex-col full-height">
          <div class="invoice-header">
            <div class="header-block">
              <div class="block-title">بيانات التحويل</div>
              <div class="field-row"><label>رقم التحويل</label><input type="text" class="input-field" :value="transferNo" readonly /></div>
              <div class="field-row"><label>التاريخ</label><input type="date" class="input-field" v-model="transferDate" /></div>
              <div class="field-row"><label>الفرع المصدر</label>
                <select class="input-field" v-model="fromBranch">
                  <option>الفرع الرئيسي - صنعاء</option>
                  <option>فرع عدن</option>
                  <option>فرع تعز</option>
                </select>
              </div>
              <div class="field-row"><label>الفرع المستلم</label>
                <select class="input-field" v-model="toBranch">
                  <option>فرع عدن</option>
                  <option>فرع تعز</option>
                  <option>الفرع الرئيسي - صنعاء</option>
                </select>
              </div>
            </div>
          </div>

          <div class="items-section">
            <div class="items-toolbar">
              <div class="search-box">
                <input type="text" class="input-field" placeholder="ابحث عن دواء للتحويل..." v-model="drugQuery"
                  @focus="showDropdown = true" @blur="setTimeout(() => showDropdown = false, 200)" />
                <div v-if="showDropdown && filteredDrugs.length" class="search-dropdown">
                  <div v-for="d in filteredDrugs.slice(0, 8)" :key="d.code" class="dropdown-item" @mousedown.prevent="addItem(d)">
                    <span class="drug-name">{{ d.name }}</span>
                    <span class="drug-barcode">مخزون المصدر: {{ d.stock }}</span>
                    <span class="drug-price">{{ d.code }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="table-scroll">
              <table class="dense-table">
                <thead>
                  <tr>
                    <th style="width:30px">#</th>
                    <th>الصنف</th>
                    <th>الباركود</th>
                    <th>الوحدة</th>
                    <th>الكمية المحوَّلة</th>
                    <th>مخزون المصدر</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, i) in items" :key="i">
                    <td>{{ i + 1 }}</td>
                    <td>{{ item.name }}</td>
                    <td>{{ item.barcode }}</td>
                    <td>{{ item.unit }}</td>
                    <td><input type="number" class="input-field qty-input" v-model.number="item.qty" min="1" /></td>
                    <td>{{ item.stock }}</td>
                    <td><button class="row-delete" @click="items.splice(i, 1)">✕</button></td>
                  </tr>
                  <tr v-if="items.length === 0">
                    <td colspan="7" class="empty-state">أضف أصنافًا للتحويل من البحث أعلاه</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="totals-bar">
            <div class="total-item"><span class="total-label">عدد الأصناف:</span><span class="total-value">{{ items.length }}</span></div>
            <div class="total-item"><span class="total-label">إجمالي الكميات:</span><span class="total-value">{{ items.reduce((s, i) => s + i.qty, 0) }}</span></div>
          </div>

          <div class="form-actions">
            <button class="btn btn-primary" @click="postTransfer">✅ ترحيل التحويل</button>
            <button class="btn btn-secondary" @click="items = []; drugQuery = ''">🗑️ تفريغ</button>
          </div>
        </div>

        <div v-if="tab === 'list'" class="flex-col full-height">
          <div class="table-scroll">
            <table class="dense-table">
              <thead>
                <tr>
                  <th style="width:30px">#</th>
                  <th>رقم التحويل</th>
                  <th>التاريخ</th>
                  <th>المصدر</th>
                  <th>المستلم</th>
                  <th>الأصناف</th>
                  <th>الكمية</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(t, i) in transfers" :key="t.no">
                  <td>{{ i + 1 }}</td>
                  <td><span class="invoice-no">{{ t.no }}</span></td>
                  <td>{{ t.date }}</td>
                  <td>{{ t.from }}</td>
                  <td>{{ t.to }}</td>
                  <td>{{ t.itemsCount }}</td>
                  <td>{{ t.qty }}</td>
                  <td><span :class="['badge', t.status === 'delivered' ? 'badge-posted' : 'badge-draft']">{{ t.statusLabel }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { sampleDrugs } from '../../data/sampleData.js'

const tab = ref('new')
const transferNo = ref('TRF-2026-001')
const transferDate = ref(new Date().toISOString().slice(0, 10))
const fromBranch = ref('الفرع الرئيسي - صنعاء')
const toBranch = ref('فرع عدن')
const drugQuery = ref('')
const showDropdown = ref(false)
const items = ref([])

const transfers = ref([
  { no: 'TRF-2026-003', date: '2026-08-12', from: 'الفرع الرئيسي - صنعاء', to: 'فرع عدن', itemsCount: 5, qty: 120, status: 'delivered', statusLabel: 'مستلمة' },
  { no: 'TRF-2026-002', date: '2026-08-10', from: 'الفرع الرئيسي - صنعاء', to: 'فرع تعز', itemsCount: 3, qty: 60, status: 'delivered', statusLabel: 'مستلمة' },
  { no: 'TRF-2026-001', date: '2026-08-08', from: 'فرع عدن', to: 'الفرع الرئيسي - صنعاء', itemsCount: 2, qty: 30, status: 'in-transit', statusLabel: 'قيد النقل' },
])

const filteredDrugs = computed(() => {
  if (!drugQuery.value) return sampleDrugs.filter(d => d.stock > 10)
  const q = drugQuery.value
  return sampleDrugs.filter(d => d.name.includes(q) || d.barcode.includes(q) || d.code.includes(q))
})

function addItem(d) {
  const exists = items.value.find(i => i.code === d.code)
  if (exists) { exists.qty += 1 }
  else {
    items.value.push({ code: d.code, name: d.name, barcode: d.barcode, unit: d.unit, stock: d.stock, qty: 1 })
  }
  drugQuery.value = ''
  showDropdown.value = false
}

function postTransfer() {
  if (items.value.length === 0) { alert('⚠️ أضف صنفًا واحدًا على الأقل'); return }
  if (fromBranch.value === toBranch.value) { alert('⚠️ يجب أن يختلف الفرع المستلم عن المصدر'); return }
  for (const it of items.value) {
    if (it.qty > it.stock) {
      if (!confirm('⚠️ الكمية المحوَّلة من "' + it.name + '" أكبر من مخزون المصدر. المتابعة؟')) return
    }
  }
  transfers.value.unshift({
    no: transferNo.value,
    date: transferDate.value,
    from: fromBranch.value,
    to: toBranch.value,
    itemsCount: items.value.length,
    qty: items.value.reduce((s, i) => s + i.qty, 0),
    status: 'in-transit',
    statusLabel: 'قيد النقل',
  })
  alert('✅ تم ترحيل التحويل: ' + transferNo.value)
  transferNo.value = 'TRF-2026-' + String(transfers.value.length + 1).padStart(3, '0')
  items.value = []
  drugQuery.value = ''
  tab.value = 'list'
}
</script>

<style scoped>
.screen-layout { display: flex; flex: 1; gap: 8px; min-height: 0; }

.screen-sidebar {
  width: 140px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px;
  flex-shrink: 0;
}

.screen-tab {
  height: 40px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  text-align: right;
  padding: 0 8px;
  border-radius: 2px;
  white-space: nowrap;
}
.screen-tab:hover { background: var(--color-bg-primary); }
.screen-tab.active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: bold;
  border-color: var(--color-primary);
}

.screen-content { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.full-height { flex: 1; display: flex; flex-direction: column; min-height: 0; }

.invoice-header { display: flex; gap: 8px; margin-bottom: 6px; flex-shrink: 0; }

.header-block {
  flex: 1;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  padding: 6px 8px;
  background: var(--color-bg-secondary);
}

.block-title {
  font-size: var(--font-size-sm);
  font-weight: bold;
  color: var(--color-primary);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 3px;
  margin-bottom: 5px;
}

.field-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.field-row label { width: 95px; font-size: var(--font-size-sm); flex-shrink: 0; color: var(--color-text-secondary); }

.items-section { flex: 1; display: flex; flex-direction: column; min-height: 0; border: 1px solid var(--color-border); border-radius: 2px; background: var(--color-bg-secondary); }

.items-toolbar { display: flex; gap: 6px; padding: 6px; flex-shrink: 0; }
.search-box { flex: 1; position: relative; }

.search-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  left: 0;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-primary);
  border-radius: 2px;
  z-index: 100;
  max-height: 200px;
  overflow-y: auto;
  box-shadow: 2px 2px 6px rgba(0,0,0,0.15);
}

.dropdown-item {
  display: flex;
  justify-content: space-between;
  padding: 5px 8px;
  cursor: pointer;
  font-size: var(--font-size-sm);
  border-bottom: 1px solid var(--color-bg-secondary);
}
.dropdown-item:hover { background: var(--color-row-hover); }
.drug-name { font-weight: bold; }
.drug-barcode { color: var(--color-text-secondary); font-size: 11px; }
.drug-price { color: var(--color-primary); font-weight: bold; }

.table-scroll { flex: 1; overflow: auto; background: var(--color-bg-primary); min-height: 0; }

.qty-input { width: 60px; text-align: center; }
.empty-state { text-align: center; color: var(--color-text-secondary); padding: 16px; }
.invoice-no { color: var(--color-primary); font-weight: bold; }
.row-delete { border: none; background: transparent; color: var(--color-error); cursor: pointer; font-weight: bold; }

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 6px;
  background: var(--color-bg-secondary);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

.flex-col { flex-direction: column; }

@media (max-width: 768px) {
  .screen-layout { flex-direction: column; }
  .screen-sidebar { width: 100%; flex-direction: row; overflow-x: auto; }
  .screen-tab { width: auto; min-width: 110px; }
  .invoice-header { flex-direction: column; }
}
</style>
