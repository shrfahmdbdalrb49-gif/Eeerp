<template>
  <!-- ========== شاشة سندات الصندوق (قبض/صرف) ========== -->
  <div class="window-body flex-col">
    <div class="screen-layout">
      <div class="screen-sidebar">
        <button :class="['screen-tab', { active: tab === 'receipt' }]" @click="tab = 'receipt'">📥 سند قبض</button>
        <button :class="['screen-tab', { active: tab === 'payment' }]" @click="tab = 'payment'">📤 سند صرف</button>
        <button :class="['screen-tab', { active: tab === 'log' }]" @click="tab = 'log'">📋 سجل الحركة</button>
      </div>

      <div class="screen-content">
        <!-- سند القبض -->
        <div v-if="tab === 'receipt'" class="flex-col full-height">
          <div class="invoice-header">
            <div class="header-block">
              <div class="block-title">بيانات السند</div>
              <div class="field-row"><label>رقم السند</label><input type="text" class="input-field" :value="receiptNo" readonly /></div>
              <div class="field-row"><label>التاريخ</label><input type="date" class="input-field" v-model="receiptDate" /></div>
              <div class="field-row"><label>الصندوق</label>
                <select class="input-field" v-model="receiptBox">
                  <option>صندوق المبيعات الرئيسي</option>
                  <option>صندوق الوارد</option>
                  <option>بنك الكريمي</option>
                </select>
              </div>
            </div>
            <div class="header-block">
              <div class="block-title">بيانات التحصيل</div>
              <div class="field-row"><label>المستلم من</label><input type="text" class="input-field" v-model="receiptFrom" placeholder="اسم العميل / المريض" /></div>
              <div class="field-row"><label>المبلغ</label><input type="number" class="input-field" v-model.number="receiptAmount" min="0" /></div>
              <div class="field-row"><label>العملة</label>
                <select class="input-field" v-model="receiptCurrency">
                  <option>YER - ريال يمني</option>
                  <option>USD - دولار أمريكي</option>
                </select>
              </div>
              <div class="field-row"><label>طريقة الدفع</label>
                <select class="input-field" v-model="receiptMethod">
                  <option>نقدي</option>
                  <option>شيك</option>
                  <option>بطاقة</option>
                  <option>تحويل</option>
                </select>
              </div>
            </div>
          </div>
          <div class="totals-bar">
            <div class="total-item"><span class="total-label">رصيد الصندوق الحالي:</span><span class="total-value">2,450,000</span></div>
            <div class="total-item"><span class="total-label">بعد التحصيل:</span><span class="total-value total-net">{{ fmt(2450000 + receiptAmount) }}</span></div>
          </div>
          <div class="form-actions">
            <button class="btn btn-success" @click="saveReceipt">✅ ترحيل السند</button>
            <button class="btn btn-secondary" @click="receiptNo = 'RCV-2026-' + String(receiptLog.length + 1).padStart(3, '0'); receiptFrom = ''; receiptAmount = 0">🗑️ تفريغ</button>
          </div>
        </div>

        <!-- سند الصرف -->
        <div v-if="tab === 'payment'" class="flex-col full-height">
          <div class="invoice-header">
            <div class="header-block">
              <div class="block-title">بيانات السند</div>
              <div class="field-row"><label>رقم السند</label><input type="text" class="input-field" :value="payNo" readonly /></div>
              <div class="field-row"><label>التاريخ</label><input type="date" class="input-field" v-model="payDate" /></div>
              <div class="field-row"><label>الصندوق</label>
                <select class="input-field" v-model="payBox">
                  <option>صندوق المبيعات الرئيسي</option>
                  <option>صندوق الوارد</option>
                  <option>بنك الكريمي</option>
                </select>
              </div>
            </div>
            <div class="header-block">
              <div class="block-title">بيانات الصرف</div>
              <div class="field-row"><label>صرف إلى</label><input type="text" class="input-field" v-model="payTo" placeholder="اسم المورد / الموظف" /></div>
              <div class="field-row"><label>المبلغ</label><input type="number" class="input-field" v-model.number="payAmount" min="0" /></div>
              <div class="field-row"><label>العملة</label>
                <select class="input-field" v-model="payCurrency">
                  <option>YER - ريال يمني</option>
                  <option>USD - دولار أمريكي</option>
                </select>
              </div>
              <div class="field-row"><label>نوع المصروف</label>
                <select class="input-field" v-model="payType">
                  <option>مصروفات تشغيلية</option>
                  <option>رواتب</option>
                  <option>إيجارات</option>
                  <option>فواتير (كهرباء/مياه/إنترنت)</option>
                  <option>أخرى</option>
                </select>
              </div>
            </div>
          </div>
          <div class="totals-bar">
            <div class="total-item"><span class="total-label">رصيد الصندوق الحالي:</span><span class="total-value">2,450,000</span></div>
            <div class="total-item"><span class="total-label">بعد الصرف:</span><span class="total-value total-net" :style="{ color: payAmount > 2450000 ? 'var(--color-error)' : 'var(--color-primary)' }">{{ fmt(2450000 - payAmount) }}</span></div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" @click="savePay">✅ ترحيل السند</button>
            <button class="btn btn-secondary" @click="payNo = 'PAY-2026-' + String(payLog.length + 1).padStart(3, '0'); payTo = ''; payAmount = 0">🗑️ تفريغ</button>
          </div>
        </div>

        <!-- سجل الحركة -->
        <div v-if="tab === 'log'" class="flex-col full-height">
          <div class="screen-toolbar">
            <input type="text" class="input-field" placeholder="بحث في السجل..." v-model="logSearch" style="width:250px" />
          </div>
          <div class="table-scroll">
            <table class="dense-table">
              <thead>
                <tr>
                  <th style="width:30px">#</th>
                  <th>رقم السند</th>
                  <th>النوع</th>
                  <th>التاريخ</th>
                  <th>الاسم</th>
                  <th>المبلغ</th>
                  <th>الصندوق</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(l, i) in filteredLog" :key="l.no">
                  <td>{{ i + 1 }}</td>
                  <td><span class="invoice-no">{{ l.no }}</span></td>
                  <td><span :class="['badge', l.type === 'قبض' ? 'badge-posted' : 'badge-draft']">{{ l.type }}</span></td>
                  <td>{{ l.date }}</td>
                  <td>{{ l.person }}</td>
                  <td :style="{ color: l.type === 'قبض' ? 'var(--color-success)' : 'var(--color-error)' }"><strong>{{ l.type === 'قبض' ? '+' : '-' }}{{ fmt(l.amount) }}</strong></td>
                  <td>{{ l.box }}</td>
                  <td><span class="badge badge-posted">مرحّل</span></td>
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

const tab = ref('receipt')
const logSearch = ref('')

const receiptNo = ref('RCV-2026-001')
const receiptDate = ref(new Date().toISOString().slice(0, 10))
const receiptBox = ref('صندوق المبيعات الرئيسي')
const receiptFrom = ref('')
const receiptAmount = ref(0)
const receiptCurrency = ref('YER - ريال يمني')
const receiptMethod = ref('نقدي')

const payNo = ref('PAY-2026-001')
const payDate = ref(new Date().toISOString().slice(0, 10))
const payBox = ref('صندوق المبيعات الرئيسي')
const payTo = ref('')
const payAmount = ref(0)
const payCurrency = ref('YER - ريال يمني')
const payType = ref('مصروفات تشغيلية')

const receiptLog = ref([
  { no: 'RCV-2026-005', type: 'قبض', date: '2026-08-12', person: 'خالد عمر سعيد', amount: 10000, box: 'صندوق المبيعات الرئيسي' },
  { no: 'RCV-2026-004', type: 'قبض', date: '2026-08-11', person: 'عائشة يوسف إبراهيم', amount: 5000, box: 'بنك الكريمي' },
])

const payLog = ref([
  { no: 'PAY-2026-002', type: 'صرف', date: '2026-08-12', person: 'مؤسسة الشفاء للتوريدات', amount: 50000, box: 'بنك الكريمي' },
  { no: 'PAY-2026-001', type: 'صرف', date: '2026-08-10', person: 'فواتير الكهرباء', amount: 15000, box: 'صندوق المبيعات الرئيسي' },
])

const allLog = computed(() =>
  [...receiptLog.value.map(r => ({ ...r, no: r.no })), ...payLog.value].sort((a, b) => b.date.localeCompare(a.date))
)

const filteredLog = computed(() =>
  allLog.value.filter(l => !logSearch.value || l.person.includes(logSearch.value) || l.no.includes(logSearch.value))
)

function fmt(n) {
  return Number(n).toLocaleString('en-US')
}

function saveReceipt() {
  if (!receiptFrom.value || !receiptAmount.value) {
    alert('⚠️ أدخل اسم المستلم والمبلغ')
    return
  }
  receiptLog.value.unshift({
    no: receiptNo.value, type: 'قبض', date: receiptDate.value,
    person: receiptFrom.value, amount: receiptAmount.value, box: receiptBox.value,
  })
  alert('✅ تم ترحيل سند القبض: ' + receiptNo.value)
  receiptNo.value = 'RCV-2026-' + String(receiptLog.value.length + 1).padStart(3, '0')
  receiptFrom.value = ''
  receiptAmount.value = 0
  tab.value = 'log'
}

function savePay() {
  if (!payTo.value || !payAmount.value) {
    alert('⚠️ أدخل اسم المستلم والمبلغ')
    return
  }
  if (payAmount.value > 2450000) {
    if (!confirm('⚠️ المبلغ يتجاوز رصيد الصندوق. المتابعة؟')) return
  }
  payLog.value.unshift({
    no: payNo.value, type: 'صرف', date: payDate.value,
    person: payTo.value, amount: payAmount.value, box: payBox.value,
  })
  alert('✅ تم ترحيل سند الصرف: ' + payNo.value)
  payNo.value = 'PAY-2026-' + String(payLog.value.length + 1).padStart(3, '0')
  payTo.value = ''
  payAmount.value = 0
  tab.value = 'log'
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

.screen-toolbar {
  display: flex;
  gap: 6px;
  padding: 6px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  margin-bottom: 6px;
  flex-shrink: 0;
}

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
.field-row label { width: 90px; font-size: var(--font-size-sm); flex-shrink: 0; color: var(--color-text-secondary); }

.table-scroll { flex: 1; overflow: auto; background: var(--color-bg-primary); min-height: 0; }

.invoice-no { color: var(--color-primary); font-weight: bold; }

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
