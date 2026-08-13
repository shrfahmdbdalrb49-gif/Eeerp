<template>
  <!-- ========== شاشة الأصناف - الأدوية والمستلزمات ========== -->
  <div class="items-screen">
    <!-- شريط بحث الأصناف -->
    <div class="items-toolbar">
      <input
        type="text"
        class="input-field"
        placeholder="🔍 بحث بالاسم، الكود، الباركود، الاسم العلمي..."
        v-model="search"
        style="flex: 1; max-width: 400px"
      />
      <select class="input-field" v-model="category" style="width: 150px">
        <option value="">كل المجموعات</option>
        <option>مسكنات</option>
        <option>مضادات حيوية</option>
        <option>أمراض مزمنة</option>
        <option>فيتامينات</option>
        <option>أخرى</option>
      </select>
      <select class="input-field" v-model="stockFilter" style="width: 140px">
        <option value="">كل الأصناف</option>
        <option value="low">رصيد منخفض</option>
        <option value="out">نفذ من المخزون</option>
        <option value="expiring">ينتهي قريباً</option>
      </select>
      <button class="btn btn-primary" @click="showForm = !showForm">+ صنف جديد</button>
    </div>

    <!-- نموذج إضافة صنف جديد -->
    <div v-if="showForm" class="new-item-form">
      <div class="form-title">إضافة صنف / دواء جديد</div>
      <div class="form-grid">
        <div class="field-row"><label>الاسم التجاري</label><input class="input-field" v-model="form.name" /></div>
        <div class="field-row"><label>الاسم العلمي</label><input class="input-field" v-model="form.scientific" /></div>
        <div class="field-row"><label>الباركود</label><input class="input-field" v-model="form.barcode" /></div>
        <div class="field-row"><label>المجموعة</label>
          <select class="input-field" v-model="form.category">
            <option>مسكنات</option>
            <option>مضادات حيوية</option>
            <option>أمراض مزمنة</option>
            <option>فيتامينات</option>
            <option>أخرى</option>
          </select>
        </div>
        <div class="field-row"><label>الوحدة</label><input class="input-field" v-model="form.unit" /></div>
        <div class="field-row"><label>سعر الشراء</label><input type="number" class="input-field" v-model.number="form.buyPrice" /></div>
        <div class="field-row"><label>سعر البيع</label><input type="number" class="input-field" v-model.number="form.sellPrice" /></div>
        <div class="field-row"><label>الرصيد</label><input type="number" class="input-field" v-model.number="form.stock" /></div>
        <div class="field-row"><label>الحد الأدنى</label><input type="number" class="input-field" v-model.number="form.minStock" /></div>
        <div class="field-row"><label>الصلاحية</label><input type="date" class="input-field" v-model="form.expiry" /></div>
        <div class="field-row">
          <label>يحتاج وصفة؟</label>
          <select class="input-field" v-model="form.prescription">
            <option :value="false">لا</option>
            <option :value="true">نعم</option>
          </select>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-success" @click="addNewItem">حفظ</button>
        <button class="btn btn-secondary" @click="showForm = false">إلغاء</button>
      </div>
    </div>

    <!-- جدول الأصناف -->
    <div class="table-container flex-1">
      <table class="dense-table">
        <thead>
          <tr>
            <th style="width:30px">#</th>
            <th style="width:70px">الكود</th>
            <th style="width:155px">الاسم التجاري</th>
            <th style="width:135px">الاسم العلمي</th>
            <th style="width:100px">الباركود</th>
            <th style="width:80px">المجموعة</th>
            <th style="width:50px">الوحدة</th>
            <th style="width:70px">سعر الشراء</th>
            <th style="width:70px">سعر البيع</th>
            <th style="width:50px">الرصيد</th>
            <th style="width:55px">الحد الأدنى</th>
            <th style="width:70px">أقرب صلاحية</th>
            <th style="width:45px">وصفة؟</th>
            <th style="width:60px">الحالة</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(drug, idx) in filteredItems" :key="drug.code">
            <td>{{ idx + 1 }}</td>
            <td>{{ drug.code }}</td>
            <td style="font-weight: bold">{{ drug.name }}</td>
            <td style="color: var(--color-text-secondary)">{{ drug.scientific }}</td>
            <td>{{ drug.barcode }}</td>
            <td>{{ drug.category }}</td>
            <td>{{ drug.unit }}</td>
            <td>{{ fmt(drug.buyPrice) }}</td>
            <td style="font-weight: bold; color: var(--color-primary)">{{ fmt(drug.sellPrice) }}</td>
            <td :class="{ 'status-low': drug.stock > 0 && drug.stock <= drug.minStock, 'status-out': drug.stock === 0 }">
              {{ drug.stock === 0 ? 'نفذ' : drug.stock }}
            </td>
            <td>{{ drug.minStock }}</td>
            <td :class="expiryClass(drug.expiry)">{{ drug.expiry }}</td>
            <td style="text-align: center">{{ drug.prescription ? '✅' : '—' }}</td>
            <td class="status-active">نشط</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- شريط معلومات الأصناف -->
    <div class="totals-bar">
      <div class="totals-right">
        <div class="total-item">
          <span class="total-label">إجمالي الأصناف:</span>
          <span class="total-value">{{ filteredItems.length }}</span>
        </div>
        <div class="total-item">
          <span class="total-label">رصيد منخفض:</span>
          <span class="total-value" style="color: var(--color-warning)">{{ lowCount }}</span>
        </div>
        <div class="total-item">
          <span class="total-label">نفذ:</span>
          <span class="total-value" style="color: var(--color-error)">{{ outCount }}</span>
        </div>
      </div>
      <div class="totals-left">
        <div class="total-item">
          <span class="total-label">قيمة المخزون:</span>
          <span class="total-net">{{ fmt(inventoryValue) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { sampleDrugs } from '../../data/sampleData.js'

const drugs = ref(sampleDrugs.map((d) => ({ ...d })))
const search = ref('')
const category = ref('')
const stockFilter = ref('')
const showForm = ref(false)

const form = reactive({
  name: '',
  scientific: '',
  barcode: '',
  category: 'أخرى',
  unit: 'علبة',
  buyPrice: 0,
  sellPrice: 0,
  stock: 0,
  minStock: 10,
  expiry: '',
  prescription: false,
})

let codeSeq = drugs.value.length + 1

function addNewItem() {
  if (!form.name.trim()) return
  const code = 'DRG-' + String(codeSeq++).padStart(3, '0')
  drugs.value.push({
    code,
    name: form.name,
    scientific: form.scientific,
    barcode: form.barcode || '—',
    category: form.category,
    unit: form.unit,
    buyPrice: Number(form.buyPrice) || 0,
    sellPrice: Number(form.sellPrice) || 0,
    stock: Number(form.stock) || 0,
    minStock: Number(form.minStock) || 10,
    expiry: form.expiry,
    prescription: form.prescription,
    status: 'active',
  })
  Object.assign(form, {
    name: '', scientific: '', barcode: '', category: 'أخرى', unit: 'علبة',
    buyPrice: 0, sellPrice: 0, stock: 0, minStock: 10, expiry: '', prescription: false,
  })
  showForm.value = false
}

const filteredItems = computed(() => {
  const q = search.value.toLowerCase().trim()
  const cat = category.value
  const sf = stockFilter.value
  const today = new Date()
  return drugs.value.filter((d) => {
    const matchSearch =
      !q ||
      d.name.toLowerCase().includes(q) ||
      d.scientific.toLowerCase().includes(q) ||
      d.barcode.includes(q) ||
      d.code.toLowerCase().includes(q)
    const matchCat = !cat || d.category === cat
    let matchStock = true
    if (sf === 'low') matchStock = d.stock > 0 && d.stock <= d.minStock
    else if (sf === 'out') matchStock = d.stock === 0
    else if (sf === 'expiring') matchStock = isExpiringSoon(d.expiry)
    return matchSearch && matchCat && matchStock
  })
})

const lowCount = computed(() => filteredItems.value.filter((d) => d.stock > 0 && d.stock <= d.minStock).length)
const outCount = computed(() => filteredItems.value.filter((d) => d.stock === 0).length)
const inventoryValue = computed(() =>
  filteredItems.value.reduce((s, d) => s + d.stock * d.buyPrice, 0)
)

function isExpiringSoon(exp) {
  const d = new Date(exp)
  return d - new Date() <= 120 * 86400000
}

function expiryClass(exp) {
  const today = new Date()
  const d = new Date(exp)
  const days = (d - today) / 86400000
  if (days <= 0) return 'expiry-red'
  if (days <= 60) return 'expiry-orange'
  if (days <= 120) return 'expiry-yellow'
  return 'expiry-green'
}

function fmt(n) {
  return String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
</script>

<style scoped>
.items-screen {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.flex-1 {
  flex: 1;
  min-height: 0;
}

.items-toolbar {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  align-items: center;
  flex-wrap: wrap;
}

.new-item-form {
  background: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
  padding: var(--space-3);
  flex-shrink: 0;
}

.form-title {
  font-size: var(--font-size-base);
  font-weight: bold;
  color: var(--color-primary);
  margin-bottom: var(--space-2);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-2);
}

.form-grid .field-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.form-grid .field-row label {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-weight: bold;
}

.form-actions {
  margin-top: var(--space-2);
  display: flex;
  gap: var(--space-2);
}

.table-container {
  overflow: auto;
}

.table-container table {
  min-width: 900px;
}

.status-low {
  color: var(--color-warning);
  font-weight: bold;
}

.status-out {
  color: var(--color-error);
  font-weight: bold;
}

.status-active {
  color: var(--color-success);
}

.expiry-green { color: var(--color-success); font-weight: bold }
.expiry-yellow { color: #f9a825; font-weight: bold }
.expiry-orange { color: var(--color-warning); font-weight: bold }
.expiry-red { color: var(--color-error); font-weight: bold }
</style>
