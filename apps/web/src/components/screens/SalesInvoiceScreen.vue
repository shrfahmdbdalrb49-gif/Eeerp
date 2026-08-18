<template>
  <!--
    شاشة فاتورة المبيعات — نمط Onyx Pro تشغيلي (كثافة مكتبية / RTL)
    تفتح مباشرة فاتورة جديدة — بحث فوري بأول حرف — Enter/Tab داخل الجدول —
    اختصارات F-key فعلية — تعليق حقيقي — نافذة دفع سريعة متعددة الطرق —
    تبويبات متقدمة (تأمين/قيد/مخزون/سجل/عميل) — كل البيانات حقيقية من DB.
  -->
  <div class="ox-screen" tabindex="-1" @keydown="handleKeydown" ref="screenRoot">

    <!-- ==========================================================
         قائمة الفواتير — تُفتح عبر "السجل" فقط؛ الدخول = فاتورة جديدة
         ========================================================== -->
    <template v-if="listMode">
      <div class="page-screen">
        <div class="topbar">
          <div class="topbar-right">
            <h1 class="topbar-title">سجل فواتير المبيعات</h1>
            <span class="topbar-status">العدد: {{ invoices.length }} · الإجمالي: {{ fmt(totalSales) }} <span class="cur">ريال</span></span>
          </div>
          <div class="topbar-center">
            <button class="tb-btn primary" @click="openNewInvoice">فاتورة جديدة (F11)</button>
            <button class="tb-btn" @click="loadData" title="إعادة تحميل">↻ تحديث</button>
          </div>
          <div class="topbar-left">
            <div class="tb-search">
              <svg class="tb-search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
              <input v-model="searchText" placeholder="بحث رقم/عميل..." @keydown.enter="applySearch" />
            </div>
            <select class="df-small" v-model="listFilter">
              <option value="">الكل</option>
              <option value="on_hold">المعلّقة</option>
              <option value="draft">المسودات</option>
              <option value="posted">المرحّلة</option>
              <option value="cancelled">الملغاة</option>
            </select>
          </div>
        </div>
        <div class="table-card" style="flex:1">
          <table class="bolt-table">
            <thead>
              <tr>
                <th style="width:110px">رقم الفاتورة</th>
                <th style="width:100px">التاريخ</th>
                <th>العميل</th>
                <th style="width:90px">نوع الدفع</th>
                <th style="width:80px; text-align:left">الإجمالي</th>
                <th style="width:90px">الحالة</th>
                <th style="width:150px">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="inv in visibleInvoices" :key="inv.id"
                  :class="{ selected: selectedRow === inv.id }"
                  @click="selectedRow = inv.id">
                <td><span class="link-cell">{{ inv.invoice_no }}</span></td>
                <td>{{ inv.date }}</td>
                <td>{{ inv.customerName || 'نقدي' }}</td>
                <td>{{ payLabel(inv.paymentType) }}</td>
                <td class="num-cell"><b>{{ fmt(inv.total || 0) }}</b></td>
                <td><span class="status-dot" :class="inv.status || 'posted'"></span><span class="status-name" :class="inv.status || 'posted'">{{ statusName(inv.status) }}</span></td>
                <td class="action-cells">
                  <button class="act" title="استئناف / فتح" @click.stop="openInvoiceForEdit(inv)">{{ inv.status === 'on_hold' ? 'استرجاع' : 'فتح' }}</button>
                  <button class="act" title="طباعة" @click.stop="printInvoice(inv)">طباعة</button>
                  <button v-if="(inv.status || 'posted') === 'posted'" class="act danger" title="إلغاء (عكس المخزون والقيود)" @click.stop="cancelInvoice(inv)">✕</button>
                </td>
              </tr>
              <tr v-if="visibleInvoices.length === 0">
                <td colspan="7" class="empty-row">
                  <div class="empty-box">
                    <span class="empty-icon">◈</span>
                    <p class="empty-title">لا توجد فواتير</p>
                    <p class="empty-hint">اضغط «فاتورة جديدة» أو F11</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ==========================================================
         شاشة الفاتورة — نمط Onyx Pro التشغيلي
         ========================================================== -->
    <template v-else>
      <div class="ox-layout">

        <!-- 1. شريط عنوان الفاتورة المضغوط -->
        <div class="ox-titlebar">
          <span class="ox-title">فاتورة مبيعات</span>
          <span class="topbar-status status-name" :class="editStatusClass">{{ editStatusName }}</span>
          <span class="ox-title-sep" v-if="form.docNo">· {{ form.docNo }}</span>
        </div>

        <!-- 2. صف الحقول الأول: رقم الفاتورة | التاريخ | الوقت | الفرع | المخزن | المستخدم -->
        <div class="ox-head">
          <div class="ox-field"><label>رقم الفاتورة</label><input class="ox-inp" :value="docNoDisplay" readonly tabindex="-1"/></div>
          <div class="ox-field"><label>التاريخ</label>
            <div class="ox-date-row">
              <input type="date" class="ox-inp ox-date-hidden" v-model="form.date" :style="{ position:'absolute', opacity:0, width:'100%', height:'30px' }" aria-label="تاريخ الفاتورة" />
              <input class="ox-inp" :value="dateLabel" readonly tabindex="-1" />
            </div>
          </div>
          <div class="ox-field"><label>الوقت</label><input class="ox-inp" :value="currentTime" readonly tabindex="-1"/></div>
          <div class="ox-field"><label>الفرع</label><select class="ox-inp" v-model.number="form.storeId"><option :value="1">الفرع الرئيسي</option></select></div>
          <div class="ox-field"><label>المخزن</label><select class="ox-inp" v-model.number="form.warehouseId"><option :value="1">المخزن الرئيسي</option></select></div>
          <div class="ox-field"><label>المستخدم</label><input class="ox-inp" :value="currentUserName" readonly tabindex="-1"/></div>
        </div>

        <!-- 3. صف الحقول الثاني: العميل | نوع البيع | طريقة الدفع | العملة -->
        <div class="ox-head2">
          <div class="ox-field ox-customer" :class="{ 'ox-field-focus': customerDropdownOpen }">
              <label>العميل</label>
              <div class="ox-cust-row">
                <input class="ox-inp ox-cust-inp" v-model="customerSearch" placeholder="بحث عن العميل..."
                       ref="customerInput" list="cust-list"
                       @input="onCustomerSearch" @focus="openCustomerDropdown"
                       @keydown.enter.prevent="addCustomerBySearch"
                       @keydown.arrow-down.prevent="cdNav(1)" @keydown.arrow-up.prevent="cdNav(-1)"
                       @keydown.escape.prevent="closeDropdowns" @blur="onCustomerBlur" />
                <button class="btn-plus" @click="openNewCustomer" title="عميل جديد">+</button>
                <datalist id="cust-list"><option v-for="c in customerDropdownList" :key="c.id" :value="c.name"></option></datalist>
                <div class="dd dd-cust" v-if="customerDropdownOpen && customerDropdownList.length">
                  <div v-for="(c, ci) in customerDropdownList" :key="c.id" class="dd-item" :class="{ 'dd-active': ci === cdIndex }"
                       @mousedown.prevent="selectFoundCustomer(c)">
                    <span>{{ c.name }}<span class="dd-code" v-if="c.code"> · {{ c.code }}</span></span>
                    <span class="dd-meta">{{ c.phone || '—' }} · رصيد: {{ fmt(c._balance || 0) }}</span>
                  </div>
                </div>
                <div class="dd dd-cust" v-else-if="customerDropdownOpen && customerSearch.trim() && !customerDropdownList.length">
                  <div class="dd-nor">لا يوجد عميل «{{ customerSearch.trim() }}» — اضغط Enter أو + لإضافة عميل جديد</div>
                </div>
              </div>
            </div>
            <div class="ox-field"><label>نوع البيع</label>
              <select class="ox-inp" v-model="form.paymentType">
                <option value="cash">نقدي</option><option value="credit">آجل</option><option value="insurance">تأمين</option>
              </select>
            </div>
            <div class="ox-field"><label>طريقة الدفع</label>
              <select class="ox-inp" v-model="form.payMethod">
                <option value="cash">نقد</option><option value="card">بطاقة</option><option value="transfer">تحويل</option><option value="bank">بنك</option>
              </select>
            </div>
            <div class="ox-field"><label>العملة</label><select class="ox-inp" v-model="form.currency"><option value="YER">YER</option></select></div>
            <div class="ox-field ox-info-mini" v-if="selectedCustomer">
              <label>سابقة / حد ائتمان / بعد الفاتورة</label>
              <span class="ox-mini-info">{{ fmt(customerPrevBalance) }} / {{ fmt(selectedCustomer.creditLimit || 0) }} / <b>{{ fmt(customerBalanceAfter) }}</b></span>
            </div>
        </div>

        <!-- 4. شريط إدخال الصنف: حقل كبير واحد + الكمية بجانبه + نتائج فورية تحت الحقل -->
        <div class="ox-itembar">
          <div class="ox-search-cell" :class="{ 'ox-field-focus': dropdownOpen }">
            <svg class="tb-search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input class="ox-search-input" v-model="quickItem" placeholder="اكتب أول حرف من اسم الصنف أو امسح الباركود... (Enter للإضافة)"
                   list="quick-items" ref="quickInput"
                   @input="onQuickSearch" @focus="openItemDropdown"
                   @keydown.enter.prevent="quickItemSubmit"
                   @keydown.tab.prevent="qtyFocus()"
                   @keydown.arrow-down.prevent="ddNav(1)" @keydown.arrow-up.prevent="ddNav(-1)"
                   @keydown.escape.prevent="closeDropdowns" @blur="onQuickBlur" />
            <datalist id="quick-items"><option v-for="it in stockItems" :key="it.id" :value="it.name"></option></datalist>
            <!-- Dropdown ذكي: اسم | كود | باركود | وحدة | سعر | متاح -->
            <div class="dd dd-item" v-if="dropdownOpen && quickDropdown.length">
              <div v-for="(it, qi) in quickDropdown" :key="it.id" class="dd-item" :class="{ 'dd-active': qi === ddIndex, 'dd-out': !it._stock }"
                   @mousedown.prevent="addFoundItem(it)">
                <span class="dd-n">{{ it.name }}<span class="dd-code" v-if="it.code"> · {{ it.code }}</span></span>
                <span class="dd-meta">{{ it.barcode || '—' }} · {{ unitLabel(it.unit) }} · {{ fmt(it.sellPrice || 0) }} · متاح: {{ it._stock }}</span>
              </div>
            </div>
            <div class="dd dd-item" v-else-if="dropdownOpen && quickItem.trim() && !quickDropdown.length">
              <div class="dd-nor">لا توجد أصناف مطابقة لـ «{{ quickItem.trim() }}»</div>
            </div>
          </div>
          <input type="number" min="1" step="1" class="ox-qty" v-model.number="quickQty" ref="qtyInput" placeholder="الكمية" />
          <button class="tb-btn primary ox-add-btn" @click="quickItemSubmit" :disabled="!quickItem.trim()">إضافة</button>
        </div>

        <!-- 4. جدول البنود — قلب الشاشة، تحرير مباشر -->
        <div class="ox-lines">
          <table class="ox-table">
            <thead>
              <tr>
                <th style="width:20%">الصنف</th>
                <th style="width:8%">الباركود</th>
                <th style="width:6%">الوحدة</th>
                <th style="width:9%">LOT</th>
                <th style="width:8%">الصلاحية</th>
                <th style="width:6%">الكمية</th>
                <th style="width:6%">المتاح</th>
                <th style="width:7%">السعر</th>
                <th style="width:6%">الخصم</th>
                <th style="width:6%">الضريبة</th>
                <th style="width:8%; text-align:left">الإجمالي</th>
                <th style="width:26px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(l, i) in form.lines" :key="i"
                  :class="{ 'ox-row-active': i === activeLine, 'row-warn': lineHasWarning(l) }"
                  @click="activeLine = i">
                <td class="ox-line-card">
                  <div class="ox-line-card-top">
                    <span class="ox-line-item">{{ itemOf(l.itemId)?.name || '—' }} <span class="dd-code" v-if="barcodeOf(l.itemId)">{{ barcodeOf(l.itemId) }}</span></span>
                    <span class="ox-line-lot">{{ l.lotLabel || '—' }}</span>
                    <span class="ox-line-exp">{{ expiryOf(l.itemId) || '—' }}</span>
                    <button class="delete-btn-sm" @click.stop="removeLine(i)" :disabled="form.lines.length <= 1" title="حذف السطر">✕</button>
                  </div>
                  <div class="ox-line-grid">
                    <div class="ox-line-cell"><label>الوحدة</label><span>{{ unitLabel(l.unit || itemOf(l.itemId)?.unit) || '—' }}</span></div>
                    <div class="ox-line-cell"><label>الكمية (المتاح {{ itemOf(l.itemId)?._stock ?? '—' }})</label><input type="number" min="1" step="1" class="lx" v-model.number="l.qty" @input="recalc()" /></div>
                    <div class="ox-line-cell"><label>السعر / الخصم</label><input type="number" min="0" step="0.01" class="lx" v-model.number="l.price" @input="recalc()" :disabled="!canEditPrice" style="width:70px" /> / <input type="number" min="0" step="0.01" class="lx" v-model.number="l.discount" @input="recalc()" :disabled="!canEditDiscount" style="width:56px" /></div>
                    <div class="ox-line-cell"><label>الإجمالي</label><span class="ox-line-total">{{ fmt(lineTotal(l)) }}</span></div>
                  </div>
                </td>
                <td><span class="cell-item-name">{{ itemOf(l.itemId)?.name || '—' }}</span></td>
                <td class="num-cell tiny">{{ barcodeOf(l.itemId) || '—' }}</td>
                <td>{{ unitLabel(l.unit || itemOf(l.itemId)?.unit) }}</td>
                <td><span class="lot-cell" @click="openLotModal(i)">{{ l.lotLabel || '—' }}<span class="lot-icon" v-if="lotsOf(l.itemId).length > 1">▼</span></span></td>
                <td class="num-cell tiny">{{ expiryOf(l.itemId) || '—' }}</td>
                <td><input type="number" min="1" step="1" class="lx" v-model.number="l.qty" @input="recalc()" @keydown.enter.prevent="enterLine(i)" /></td>
                <td class="num-cell">{{ itemOf(l.itemId)?._stock ?? '—' }}</td>
                <td><input type="number" min="0" step="0.01" class="lx" v-model.number="l.price" @input="recalc(); logChange('price', i)" @keydown.enter.prevent="enterLine(i)" :disabled="!canEditPrice" :title="canEditPrice ? '' : 'السعر مقيد بالصلاحيات'" /></td>
                <td><input type="number" min="0" step="0.01" class="lx" v-model.number="l.discount" @input="recalc()" @keydown.enter.prevent="enterLine(i)" :disabled="!canEditDiscount" :title="canEditDiscount ? '' : 'الخصم مقيد بالصلاحيات'" /></td>
                <td><input type="number" min="0" step="0.01" class="lx" v-model.number="l.tax" @input="recalc()" @keydown.enter.prevent="enterLine(i)" /></td>
                <td class="num-cell row-total">{{ fmt(lineTotal(l)) }}</td>
                <td><button class="delete-btn-sm" @click="removeLine(i)" :disabled="form.lines.length <= 1" title="حذف السطر (F3)">✕</button></td>
              </tr>
              <tr v-if="lineHasWarning(form.lines[form.lines.length - 1])" class="warn-band">
                <td colspan="12" class="warn-text">{{ lastWarning }}</td>
              </tr>
              <tr v-if="form.lines.length === 0" class="ox-empty-row">
                <td colspan="12">
                  <span>لا توجد بنود — اكتب أول حرف من اسم الصنف في حقل البحث أعلاه ثم Enter لإضافته مباشرة</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 6. تبويبات متقدمة (خارج مسار البيع السريع) -->
          <div class="ox-tabs ox-tabs-marg" v-if="form.docNo || form.lines.length">
          <button class="tab-btn" :class="{ active: tab === 'cust' }" @click="tab = 'cust'">بيانات العميل</button>
          <button class="tab-btn" :class="{ active: tab === 'ins' }" @click="tab = 'ins'">التأمين</button>
          <button class="tab-btn" :class="{ active: tab === 'journal' }" @click="tab = 'journal'">القيد المحاسبي</button>
          <button class="tab-btn" :class="{ active: tab === 'stock' }" @click="tab = 'stock'">حركة المخزون</button>
          <button class="tab-btn" :class="{ active: tab === 'audit' }" @click="tab = 'audit'">سجل العمليات</button>
          <button class="tab-btn" :class="{ active: tab === 'notes' }" @click="tab = 'notes'">ملاحظات</button>
        </div>

        <div class="ox-tabpane" v-if="tab">
          <!-- بيانات العميل -->
          <div v-if="tab === 'cust'" class="tab-inner">
            <div v-if="selectedCustomer">
              <div class="mini-grid"><div class="mini-field"><label>الاسم</label><input class="ox-inp" :value="selectedCustomer.name" readonly tabindex="-1"/></div>
              <div class="mini-field"><label>الكود</label><input class="ox-inp" :value="selectedCustomer.code || '—'" readonly tabindex="-1"/></div>
              <div class="mini-field"><label>الهاتف</label><input class="ox-inp" :value="selectedCustomer.phone || '—'" readonly tabindex="-1"/></div>
              <div class="mini-field"><label>الحد الائتماني</label><input class="ox-inp" :value="fmt(selectedCustomer.creditLimit || 0)" readonly tabindex="-1"/></div></div>
              <div class="mini-grid" style="margin-top:8px">
                <div class="mini-field"><label>الرصيد السابق (الذمم المفتوحة)</label><input class="ox-inp" :value="fmt(customerPrevBalance)" readonly tabindex="-1"/></div>
                <div class="mini-field"><label>قيمة هذه الفاتورة</label><input class="ox-inp" :value="fmt(netTotal)" readonly tabindex="-1"/></div>
                <div class="mini-field"><label><b>الرصيد بعد الفاتورة</b></label><input class="ox-inp ox-inp-strong" :value="fmt(customerBalanceAfter)" readonly tabindex="-1"/></div>
              </div>
            </div>
            <div v-else class="hint-text">لم يتم اختيار عميل — الفاتورة نقدية بدون ذمم.</div>
          </div>
          <!-- التأمين -->
          <div v-if="tab === 'ins'" class="tab-inner">
            <div v-if="form.docType === 'insurance' || form.paymentType === 'insurance'">
              <div class="mini-grid">
                <div class="mini-field"><label>شركة التأمين</label><input v-model="form.insuranceCompany" class="ox-inp" /></div>
                <div class="mini-field"><label>بطاقة التأمين</label><input v-model="form.insuranceCard" class="ox-inp" /></div>
                <div class="mini-field"><label>رقم المطالبة</label><input v-model="form.claimNo" class="ox-inp" /></div>
                <div class="mini-field"><label>نسبة التغطية %</label><input type="number" min="0" max="100" v-model.number="form.insuranceCoverage" class="ox-inp" /></div>
              </div>
              <div class="mini-grid" style="margin-top:8px">
                <div class="mini-field"><label>حصة التأمين</label><input class="ox-inp" :value="fmt(insuranceShare)" readonly tabindex="-1"/></div>
                <div class="mini-field"><label>حصة المريض</label><input class="ox-inp" :value="fmt(patientShare)" readonly tabindex="-1"/></div>
              </div>
            </div>
            <div v-else class="hint-text">تفاصيل التأمين تظهر فقط عندما يكون نوع البيع «تأمين».</div>
          </div>
          <!-- القيد المحاسبي -->
          <div v-if="tab === 'journal'" class="tab-inner">
            <div v-if="lastPostedJournal.length">
              <table class="bolt-table">
                <thead><tr><th>مدين</th><th>دائن</th><th>الحساب</th><th>المبلغ</th><th>المرجع</th></tr></thead>
                <tbody>
                  <tr v-for="(j, ji) in lastPostedJournal" :key="ji">
                    <td class="num-cell">{{ j.debit || 0 }}</td><td class="num-cell">{{ j.credit || 0 }}</td>
                    <td>{{ j.accountName }}</td><td class="num-cell"><b>{{ fmt(j.amount || j.debit || j.credit) }}</b></td><td class="num-cell tiny">{{ j.ref || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="hint-text">القيد يُنشأ فعليًا عند الترحيل — هذه الفاتورة لم تُرحَّل بعد أو هي مسودة.</div>
          </div>
          <!-- حركة المخزون -->
          <div v-if="tab === 'stock'" class="tab-inner">
            <div v-if="form.lines.length">
              <table class="bolt-table">
                <thead><tr><th>الصنف</th><th>LOT</th><th>الكمية الخارجة</th><th>التشغيلة المقترحة (FEFO)</th></tr></thead>
                <tbody>
                  <tr v-for="(l, i) in form.lines" :key="i">
                    <td>{{ itemOf(l.itemId)?.name || '—' }}</td>
                    <td class="num-cell">{{ l.lotLabel || '—' }}</td>
                    <td class="num-cell"><b>{{ l.qty }}</b></td>
                    <td>{{ lotsOf(l.itemId)[0]?.batchNo ? lotsOf(l.itemId)[0].batchNo + ' (تنتهي ' + (lotsOf(l.itemId)[0].expDate || '—') + ')' : '—' }}</td>
                  </tr>
                </tbody>
              </table>
              <p class="hint-text" style="margin-top:6px">خصم المخزون FEFO الفعلي يتم عند الترحيل.</p>
            </div>
            <div v-else class="hint-text">لا توجد بنود بعد.</div>
          </div>
          <!-- سجل العمليات -->
          <div v-if="tab === 'audit'" class="tab-inner">
            <div v-if="auditTrail.length">
              <table class="bolt-table">
                <thead><tr><th>الحدث</th><th>المستخدم</th><th>الوقت</th><th>التفاصيل</th></tr></thead>
                <tbody>
                  <tr v-for="(a, ai) in auditTrail" :key="ai">
                    <td>{{ auditName(a.action) }}</td><td>{{ a.userName }}</td><td class="num-cell tiny">{{ a.when }}</td><td>{{ a.detail }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="hint-text">تسجيل التعديلات (من غير السعر/الكمية/من رحّل/من ألغى) يظهر هنا بعد الترحيل.</div>
          </div>
          <!-- ملاحظات -->
          <div v-if="tab === 'notes'" class="tab-inner">
            <div class="mini-grid">
              <div class="mini-field"><label>ملاحظات الفاتورة (تظهر في الطباعة)</label><input v-model="form.notes" class="ox-inp" placeholder="ملاحظات..." /></div>
              <div class="mini-field"><label>ملاحظات داخلية</label><input v-model="form.internalNotes" class="ox-inp" placeholder="داخلية فقط..." /></div>
            </div>
          </div>
        </div>

        <!-- 7. صف الإجماليات الأفقي + شريط الأوامر السفلي -->
        <div class="ox-summary">
          <div class="ox-sum-item"><span class="ox-sum-lbl">الإجمالي</span><span class="ox-sum-val">{{ fmt(preDiscountTotal) }}</span></div>
          <div class="ox-sum-item"><span class="ox-sum-lbl">الخصم</span><span class="ox-sum-val">−{{ fmt(totalDiscount) }}</span></div>
          <div class="ox-sum-item"><span class="ox-sum-lbl">الضريبة</span><span class="ox-sum-val">+{{ fmt(totalTax) }}</span></div>
          <div class="ox-sum-item ox-sum-net"><span class="ox-sum-lbl">الصافي</span><span class="ox-sum-val">{{ fmt(netTotal) }}</span></div>
          <div class="ox-sum-item"><span class="ox-sum-lbl">المدفوع</span><span class="ox-sum-val">{{ fmt(paidAmount) }}</span></div>
          <div class="ox-sum-item"><span class="ox-sum-lbl">المتبقي</span><span class="ox-sum-val">{{ fmt(remaining) }}</span></div>
          <div class="ox-sum-item"><span class="ox-sum-lbl">حالة السداد</span><span class="ox-sum-val" :class="payStatusClass">{{ payStatusName }}</span></div>
        </div>

        <!-- 8. شريط الأوامر السفلي الواحد -->
        <div class="ox-cmdbar">
          <button class="cm-btn" @click="openNewInvoice" title="F11">+ جديد</button>
          <button class="cm-btn" @click="goList" title="السجل">سجل</button>
          <button class="cm-btn" @click="saveDraft" :disabled="saving" title="F9">حفظ</button>
          <button class="cm-btn primary" @click="save" :disabled="saving" title="F8">ترحيل (F8)</button>
          <button class="cm-btn" @click="saveThenPrint" :disabled="saving">طباعة</button>
          <button class="cm-btn warn" @click="holdInvoice" :disabled="saving" title="F4">تعليق (F4)</button>
          <button class="cm-btn warn" @click="openDiscountByAmount" title="F5">خصم مبلغ</button>
          <button class="cm-btn warn" @click="openDiscountByPercent" title="F6">خصم %</button>
          <button class="cm-btn" @click="openMultiPay" title="F12">تعدد الدفع</button>
          <button class="cm-btn danger" @click="closeWindow">✕ إلغاء</button>
          <div class="cm-pay">
            <button class="cm-btn cm-pay-btn" @click="openPayWindow" :disabled="saving" title="F10">💳 دفع (F10)</button>
          </div>
        </div>
      </div>

      <!-- رسائل الحالة -->
      <div v-if="formError" class="form-msg form-msg-error">{{ formError }}</div>
      <div v-if="formStatusMsg" class="form-msg" :class="formStatusClass === 'cmd-error' ? 'form-msg-error' : 'form-msg-ok'">{{ formStatusMsg }}</div>

      <!-- نموذج إضافة عميل جديد -->
      <div v-if="showNewCustomer" class="form-modal-overlay" @click.self="showNewCustomer = false">
        <div class="mini-form">
          <div class="mini-form-title"><span>إضافة عميل جديد</span><button class="close-btn" @click="showNewCustomer = false">✕</button></div>
          <div class="mini-field"><label>اسم العميل</label><input v-model="newCustomer.name" /></div>
          <div class="mini-field"><label>الهاتف</label><input v-model="newCustomer.phone" /></div>
          <div class="mini-field"><label>حد الائتمان</label><input type="number" min="0" step="0.01" v-model.number="newCustomer.creditLimit" /></div>
          <div class="mini-actions">
            <button class="tb-btn" @click="showNewCustomer = false">إلغاء</button>
            <button class="tb-btn primary" @click="saveNewCustomer" :disabled="saving">حفظ</button>
          </div>
        </div>
      </div>

      <!-- نافذة LOT / التشغيلة (FEFO) سريعة -->
      <div v-if="lotModalIndex >= 0" class="form-modal-overlay" @click.self="lotModalIndex = -1">
        <div class="mini-form wide">
          <div class="mini-form-title"><span>اختيار التشغيلة — {{ itemOf(lotModalItem)?.name || '' }}</span><button class="close-btn" @click="lotModalIndex = -1">✕</button></div>
          <table class="bolt-table" style="max-height: 280px">
            <thead><tr><th style="width:15%">LOT</th><th style="width:20%">الصلاحية</th><th style="width:15%">المتاح</th><th style="width:15%">التكلفة</th><th></th></tr></thead>
            <tbody>
              <tr v-for="(b, i) in lotsOf(lotModalItem)" :key="b.id" :class="{ fefo: i === 0 }">
                <td class="num-cell">{{ b.batchNo || b.id }}</td>
                <td>{{ b.expDate || '—' }}</td>
                <td class="num-cell">{{ b.qty }}</td>
                <td class="num-cell">{{ fmt(b.cost ?? b.costPrice ?? 0) }}</td>
                <td><button class="tb-btn primary" @click="selectLot(lotModalIndex, b)">اختيار</button></td>
              </tr>
            </tbody>
          </table>
          <p class="hint-text" style="margin-top:6px">⭐ الصف الأول = التشغيلة المقترحة وفق FEFO (الأقرب انتهاءً أولًا)</p>
        </div>
      </div>

      <!-- نافذة الدفع السريعة (F10) -->
      <div v-if="showPayWindow" class="form-modal-overlay" @click.self="showPayWindow = false">
        <div class="mini-form wide">
          <div class="mini-form-title"><span>الدفع — {{ fmt(netTotal) }} <span class="cur">ريال</span></span><button class="close-btn" @click="showPayWindow = false">✕</button></div>
          <div class="mini-field">
            <label>طريقة الدفع</label>
            <div class="pay-chips">
              <button class="pay-chip" :class="{ active: payForm.method === 'cash' }" @click="payForm.method = 'cash'">💵 نقد</button>
              <button class="pay-chip" :class="{ active: payForm.method === 'card' }" @click="payForm.method = 'card'">💳 بطاقة</button>
              <button class="pay-chip" :class="{ active: payForm.method === 'transfer' }" @click="payForm.method = 'transfer'">🏦 تحويل</button>
              <button class="pay-chip" :class="{ active: payForm.method === 'bank' }" @click="payForm.method = 'bank'">🏢 بنك</button>
              <button class="pay-chip" :class="{ active: payForm.method === 'credit' }" @click="payForm.method = 'credit'">◈ آجل</button>
            </div>
          </div>
          <div class="mini-field"><label>المبلغ المدفوع (المتبقي يعامل كآجل/مستحق)</label>
            <input type="number" min="0" step="0.01" v-model.number="payForm.amount" />
            <div class="pay-partial-row" v-if="payForm.amount < netTotal && payForm.amount > 0">
              <span class="hint-text">المدفوع {{ fmt(payForm.amount) }} — المتبقي {{ fmt(netTotal - payForm.amount) }} سيُسجَّل كتسديد جزئي (ذمم)</span>
            </div>
          </div>
          <div class="mini-actions">
            <button class="tb-btn" @click="showPayWindow = false">إلغاء</button>
            <button class="tb-btn" @click="confirmPayThenPrint">دفع وطباعة</button>
            <button class="tb-btn primary" @click="confirmPay">دفع</button>
          </div>
          <p class="hint-text" style="margin-top:6px">تعدد طرق الدفع مع توزيع المبلغ: F12</p>
        </div>
      </div>

      <!-- نافذة تعدد طرق الدفع (F12) -->
      <div v-if="showMultiPay" class="form-modal-overlay" @click.self="showMultiPay = false">
        <div class="mini-form wide">
          <div class="mini-form-title"><span>تعدد طرق الدفع — توزيع مبلغ الفاتورة</span><button class="close-btn" @click="showMultiPay = false">✕</button></div>
          <div v-for="(p, pi) in multiPayList" :key="pi" class="multi-row">
            <select class="ox-inp" v-model="p.method">
              <option value="cash">نقد</option><option value="card">بطاقة</option>
              <option value="transfer">تحويل</option><option value="bank">بنك</option>
            </select>
            <input type="number" min="0" step="0.01" class="ox-inp" v-model.number="p.amount" />
            <button class="delete-btn-sm" @click="multiPayList.splice(pi, 1)" :disabled="multiPayList.length <= 1">✕</button>
          </div>
          <button class="tb-btn ghost" @click="multiPayList.push({ method: 'cash', amount: 0 })">+ طريقة أخرى</button>
          <div class="multi-total">
            <span>الإجمالي الموزع: <b>{{ fmt(multiPayTotal) }}</b></span>
            <span :class="multiPayTotal > netTotal ? 'multi-over' : 'hint-text'">
              صافي الفاتورة: {{ fmt(netTotal) }} — {{ multiPayTotal >= netTotal ? '✔ التوزيع يغطي الفاتورة' : 'المتبقي غير الموزع: ' + fmt(netTotal - multiPayTotal) }}
            </span>
          </div>
          <div class="mini-actions">
            <button class="tb-btn" @click="showMultiPay = false">إلغاء</button>
            <button class="tb-btn primary" @click="confirmMultiPay">توزيع وحفظ وترحيل</button>
          </div>
        </div>
      </div>

      <!-- نافذة الخصم بالمبلغ (F5) / النسبة (F6) -->
      <div v-if="showDiscountModal" class="form-modal-overlay" @click.self="showDiscountModal = false">
        <div class="mini-form">
          <div class="mini-form-title"><span>{{ discountKind === 'amount' ? 'خصم إجمالي بالمبلغ' : 'خصم إجمالي بالنسبة' }}</span><button class="close-btn" @click="showDiscountModal = false">✕</button></div>
          <div class="mini-field"><label>{{ discountKind === 'amount' ? 'مبلغ الخصم الإجمالي' : 'نسبة الخصم % (توزع على البنود)' }}</label>
            <input type="number" min="0" step="0.01" v-model.number="discountValue" />
          </div>
          <div class="mini-actions">
            <button class="tb-btn" @click="showDiscountModal = false">إلغاء</button>
            <button class="tb-btn primary" @click="applyDiscount">تطبيق</button>
          </div>
        </div>
      </div>

      <!-- عرض / طباعة الفاتورة -->
      <div v-if="showView && viewed" class="form-modal-overlay" @click.self="showView = false">
        <div class="print-area">
          <div class="form-card-title print-hide">
            <span>فاتورة المبيعات {{ viewed.invoice_no }}</span>
            <button class="close-btn" @click="showView = false">✕</button>
          </div>
          <div class="invoice-head">
            <div class="inv-co"><div class="inv-co-name">نظام شرف — SHARAF ERP</div><div class="inv-co-sub">محاسبة ومخازن ومبيعات</div></div>
            <div class="inv-meta">
              <div><strong>رقم الفاتورة: {{ viewed.invoice_no }}</strong></div>
              <div>التاريخ: {{ viewed.date }}</div>
              <div>العميل: {{ viewed.customerName || 'نقدي (بدون عميل)' }}</div>
              <div>الدفع: {{ payLabel(viewed.paymentType) }} — الحالة: <span class="status-name" :class="viewed.status || 'posted'">{{ statusName(viewed.status) }}</span></div>
            </div>
          </div>
          <table class="lines-table" style="border:1px solid #e2e8f0">
            <thead><tr><th>#</th><th>الصنف</th><th>LOT</th><th style="text-align:left">الكمية</th><th style="text-align:left">السعر</th><th style="text-align:left">الإجمالي</th></tr></thead>
            <tbody>
              <tr v-for="(l, i) in (viewedLinesMap[viewed.id] || [])" :key="l.id || i">
                <td style="width:40px" class="num-cell">{{ i + 1 }}</td>
                <td>{{ l.item_name || itemOf(l.item_id)?.name || '—' }}</td>
                <td class="num-cell">{{ l.lotLabel || '—' }}</td>
                <td class="num-cell">{{ l.qty }}</td>
                <td class="num-cell">{{ fmt(l.price) }}</td>
                <td class="num-cell">{{ fmt(l.subtotal || l.qty * l.price) }}</td>
              </tr>
            </tbody>
          </table>
          <div class="invoice-total">الإجمالي: <strong>{{ fmt(viewed.total || 0) }} ري</strong></div>
          <div class="print-actions print-hide">
            <button class="btn btn-primary" @click="window.print()">طباعة</button>
            <button class="btn btn-outline" @click="showView = false">إغلاق</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, onUnmounted, inject, provide, nextTick } from 'vue'
import { db, activeItems, activeCustomers, getStorageMode } from '../../db/database.js'
import { fmt, consumeStock, computeCOGS, postSaleJournal } from '../../db/engine.js'
import { requirePermission, currentSession } from '../../db/session.js'
import { serverPostSale, serverCancelSale } from '../../db/serverOps.js'

function isServer() { return getStorageMode() === 'server' }

const invoices = ref([])
const customers = ref([])
const items = ref([])
const saving = ref(false)
const listMode = ref(false)
const listFilter = ref('')
const editing = ref(true)
const onNewDoc = (ev) => { if (getActive()) { if (editing.value) editing.value = false; openNewInvoice() } }
const searchText = ref('')
const selectedRow = ref(null)
const currentUserName = ref('—')

/* ---------- حالة النموذج ---------- */
const form = ref({
  customerId: null,
  docType: 'sale',
  date: new Date().toISOString().slice(0, 10),
  storeId: 1,
  warehouseId: 1,
  paymentType: 'cash',
  payMethod: 'cash',
  currency: 'YER',
  dueDate: '',
  notes: '',
  internalNotes: '',
  insuranceCompany: '',
  insuranceCard: '',
  claimNo: '',
  insuranceCoverage: 0,
  paidAmount: 0,
  lines: [],
  docNo: '',
})

/* ---------- بحث الصنف الفوري ---------- */
const quickItem = ref('')
const quickQty = ref(1)
const quickDropdown = ref([])
const dropdownOpen = ref(false)
const ddIndex = ref(0)

/* ---------- بحث العميل الفوري ---------- */
const customerSearch = ref('')
const customerDropdownOpen = ref(false)
const customerDropdownList = ref([])
const cdIndex = ref(0)

/* ---------- النوافذ ---------- */
const showNewCustomer = ref(false)
const newCustomer = ref({ name: '', phone: '', creditLimit: 0 })
const showView = ref(false)
const viewed = ref(null)
const viewedLinesMap = ref({})
const lotModalIndex = ref(-1)
const lotModalItem = ref(null)
const showPayWindow = ref(false)
const payForm = ref({ method: 'cash', amount: 0 })
const showMultiPay = ref(false)
const multiPayList = ref([{ method: 'cash', amount: 0 }])
const showDiscountModal = ref(false)
const discountKind = ref('amount')
const discountValue = ref(0)
const activeLine = ref(0)
const tab = ref('')

/* ---------- السجل المحلي للتغييرات والتبويبات ---------- */
const editAuditTrail = ref([])
const lastPostedJournal = ref([])
const formError = ref('')
const formStatusMsg = ref('')
const formStatusClass = ref('cmd-success')

/* ---------- مراجع الحقول ---------- */
const quickInput = ref(null)
const qtyInput = ref(null)
const customerInput = ref(null)

/* ---------- مشتقات الأصناف والمخزون ---------- */
const stockItems = computed(() => items.value.filter(it => it._stock > 0).sort((a, b) => a.name.localeCompare(b.name, 'ar')))

function itemOf(id) { return items.value.find(i => i.id === id) }
function barcodeOf(id) { return itemOf(id)?.barcode || '' }
function unitLabel(u) { return { box: 'علبة', strip: 'شريط', tab: 'قرص', vial: 'قارورة', pack: 'حبة' }[u] || u || 'وحدة' }
function payLabel(t) { return { cash: 'نقدي', credit: 'آجل', insurance: 'تأمين', bank: 'بنكي' }[t] || t || 'نقدي' }
function statusName(s) { return { posted: 'مرحل', draft: 'مسودة', cancelled: 'ملغى', on_hold: 'معلّق' }[s] || 'مرحل' }

function lotsOf(itemId) {
  if (!itemId) return []
  return (itemOf(itemId)?._batches || []).slice()
}
function expiryOf(itemId) {
  const lots = lotsOf(itemId)
  return lots.length ? (lots[0].expDate || '—') : '—'
}

/* ---------- مشتقات الإجماليات ---------- */
function lineTotal(l) {
  const qty = Number(l.qty || 0)
  const disc = Number(l.discount || 0)
  const tax = Number(l.tax || 0)
  return Math.max(0, qty * Number(l.price || 0) - disc + tax)
}
const preDiscountTotal = computed(() => form.value.lines.reduce((s, l) => Number(l.qty || 0) * Number(l.price || 0) + s, 0))
const totalDiscount = computed(() => form.value.lines.reduce((s, l) => s + Number(l.discount || 0), 0))
const totalTax = computed(() => form.value.lines.reduce((s, l) => s + Number(l.tax || 0), 0))
const netTotal = computed(() => Math.max(0, preDiscountTotal.value - totalDiscount.value + totalTax.value))
const paidAmount = computed(() => form.value.paymentType === 'credit' ? 0 : netTotal.value)
const remaining = computed(() => Math.max(0, netTotal.value - paidAmount.value))
const payStatusName = computed(() => {
  if (form.value.paymentType === 'cash') return 'مدفوع'
  if (form.value.paymentType === 'credit') return 'آجل'
  return remaining.value <= 0 ? 'مدفوع' : (paidAmount.value > 0 ? 'جزئي' : 'آجل')
})
const payStatusClass = computed(() => {
  if (form.value.paymentType === 'cash') return 'pay-ok'
  if (form.value.paymentType === 'credit') return 'pay-credit'
  return remaining.value <= 0 ? 'pay-ok' : 'pay-partial'
})
const totalSales = computed(() => invoices.value.reduce((s, i) => s + (i.total || 0), 0))

const customerBalanceAfter = computed(() => {
  const isDebit = form.value.paymentType === 'credit' || form.value.paymentType === 'insurance'
  return customerPrevBalance.value + (isDebit ? netTotal.value : 0)
})

const selectedCustomer = computed(() => customers.value.find(c => c.id === form.value.customerId))
const customerPrevBalance = computed(() => {
  const c = selectedCustomer.value
  if (!c) return 0
  return invoices.value
    .filter(i => i.customerId === c.id && (i.status || 'posted') !== 'cancelled' && (i.paymentType || '') !== 'cash')
    .reduce((s, i) => s + ((i.total || 0) - (i.paid || 0)), 0)
})

const insuranceShare = computed(() => Number(netTotal.value) * Number(form.value.insuranceCoverage || 0) / 100)
const patientShare = computed(() => Number(netTotal.value) - insuranceShare.value)

const docNoDisplay = computed(() => {
  if (form.value.docNo) return form.value.docNo
  return 'S-' + new Date(form.value.date).getFullYear().toString().slice(-2) + '-****'
})
const editStatusName = computed(() => {
  if (form.value.docNo) {
    const inv = invoices.value.find(i => i.invoice_no === form.value.docNo)
    return statusName(inv?.status || 'draft')
  }
  return 'مسودة'
})
const editStatusClass = computed(() => {
  if (form.value.docNo) {
    const inv = invoices.value.find(i => i.invoice_no === form.value.docNo)
    return statusName(inv?.status || 'draft')
  }
  return 'مسودة'
})
const currentTime = computed(() => {
  const now = new Date()
  return [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map(n => String(n).padStart(2, '0')).join(':')
})
const dateLabel = computed(() => {
  try {
    return new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(form.value.date + 'T00:00:00'))
  } catch (e) { return form.value.date }
})

/* ---------- الصلاحيات ---------- */
const canEditPrice = computed(() => {
  try { requirePermission('price.override', '') } catch (e) { return false }
  return true
})
const canEditDiscount = computed(() => {
  try { requirePermission('price.override', '') } catch (e) { return false }
  return true
})

/* ---------- التحذيرات السطرية ---------- */
function lineHasWarning(l) {
  if (!l || !l.itemId) return false
  const it = itemOf(l.itemId)
  if (!it) return false
  if (Number(l.qty || 0) > (it._stock || 0)) return true
  if ((it._stock || 0) <= 5) return true
  const lots = lotsOf(l.itemId)
  if (lots.length > 0 && lots[0].expDate) {
    const days = Math.floor((new Date(lots[0].expDate) - new Date()) / 86400000)
    if (days <= 90) return true
  }
  return false
}
const lastWarning = computed(() => {
  const lines = form.value.lines
  if (!lines.length) return ''
  const last = lines[lines.length - 1]
  const it = itemOf(last.itemId)
  if (!it) return ''
  if (Number(last.qty || 0) > (it._stock || 0)) return `الكمية المطلوبة أكبر من المتاح — المتاح: ${it._stock}`
  if ((it._stock || 0) <= 5) return 'رصيد منخفض'
  const lots = lotsOf(last.itemId)
  if (lots.length && lots[0].expDate) {
    const days = Math.floor((new Date(lots[0].expDate) - new Date()) / 86400000)
    if (days <= 90) return 'قرب انتهاء الصلاحية'
  }
  return ''
})

/* ---------- التصفية ---------- */
const visibleInvoices = computed(() => {
  const term = searchText.value.trim().toLowerCase()
  return [...invoices.value].filter(inv => {
    if (listFilter.value && (inv.status || 'posted') !== listFilter.value) return false
    if (term && !(inv.customerName || '').toLowerCase().includes(term) && !(inv.invoice_no || '').toLowerCase().includes(term) && !String(inv.id).includes(term)) return false
    return true
  }).sort((a, b) => b.id - a.id)
})

/* ---------- تحميل البيانات ---------- */
async function loadData() {
  if (isServer()) {
    try {
      const { apiFetch } = await import('../../db/api.js')
      const raw = await apiFetch('/sales', { fallback: [] })
      const users = await apiFetch('/users', { fallback: [] })
      const usersMap = Object.fromEntries((Array.isArray(users) ? users : []).map(u => [u.id, u.full_name || u.fullName]))
      invoices.value = (Array.isArray(raw) ? raw : []).map(inv => ({
        ...inv,
        date: String(inv.invoice_date || '').slice(0, 10),
        customerId: inv.customer_id, paymentType: inv.payment_type, total: inv.total,
        status: inv.status, docType: inv.doc_type,
        linesCount: 0,
        customerName: inv.customer_name || null,
        createdByName: usersMap[inv.created_by || inv.createdBy] || '—',
      }))
      const lines = await apiFetch('/sales/lines', { fallback: [] })
      viewedLinesMap.value = {}
      for (const inv of invoices.value) {
        inv.linesCount = (Array.isArray(lines) ? lines : []).filter(l => l.invoice_id === inv.id).length
        viewedLinesMap.value[inv.id] = (Array.isArray(lines) ? lines : []).filter(l => l.invoice_id === inv.id)
      }
      customers.value = (await apiFetch('/customers', { fallback: [] })).filter(c => c.status !== 'inactive')
      for (const inv of invoices.value) {
        if (inv.customer_id) inv.customerName = customers.value.find(c => c.id === inv.customer_id)?.name || inv.customerName
      }
      const b = await apiFetch('/batches', { fallback: [] })
      const stockMap = {}, batchesMap = {}
      for (const x of (Array.isArray(b) ? b : [])) {
        if (!x.quarantined && x.qty > 0) {
          stockMap[x.item_id] = (stockMap[x.item_id] || 0) + Number(x.qty || 0)
          ;(batchesMap[x.item_id] = batchesMap[x.item_id] || []).push(x)
        }
      }
      const serverItems = (await apiFetch('/items', { fallback: [] })).filter(it => it.status !== 'inactive')
      items.value = serverItems.map(it => ({
        ...it, _stock: stockMap[it.id] || 0,
        _batches: (batchesMap[it.id] || []).sort((a, bb) => (a.exp_date || a.expDate || '9999') < (bb.exp_date || bb.expDate || '9999') ? -1 : 1),
      }))
      for (const inv of invoices.value) {
        if (inv.customerId && (inv.paymentType || '') !== 'cash' && (inv.status || 'posted') !== 'cancelled') {
          const c = customers.value.find(x => x.id === inv.customerId)
          if (c) c._balance = (c._balance || 0) + ((inv.total || 0) - (inv.paid || 0))
        }
      }
      const s = await currentSession()
      currentUserName.value = s?.userName || '—'
      return
    } catch (e) { formError.value = 'فشل تحميل البيانات: ' + (e.message || e); return }
  }

  const raw = await db.salesInvoices.toArray()
  const users = await db.users.toArray()
  const usersMap = Object.fromEntries(users.map(u => [u.id, u.fullName]))
  /* استرجاع الفواتير المعلقة وعرضها في القائمة بحالة on_hold */
  try {
    const held = await db.heldInvoices.toArray()
    const heldIds = new Set(held.map(h => h._heldId || 0))
    for (const h of held) {
      if (!h.customerId && h.lines?.length === 0) continue
      const inv = {
        id: -(h.id || 0), invoice_no: h.docNo || ('HOLD-' + h.id), status: 'on_hold',
        customerId: h.customerId || null, docType: h.docType || 'sale',
        date: h.date || new Date().toISOString().slice(0, 10), storeId: h.storeId || 1,
        paymentType: h.paymentType || 'cash', payMethod: h.payMethod || 'cash', currency: h.currency || 'YER',
        total: h.lines?.reduce((s, l) => s + Number(l.price || 0) * Number(l.qty || 0), 0) || 0,
        paid: h.paidAmount || 0, notes: h.notes || null, linesCount: h.lines?.length || 0,
        createdByName: usersMap[h.heldBy] || '—', _heldForm: h, createdAt: h.heldAt,
      }
      if (!heldIds.has(h._heldId) || h._heldId) inv._heldId = h.id
      raw.push(inv)
    }
  } catch (e) { /* table غير موجود في نسخ قديمة */ }
  invoices.value = raw.map(inv => ({
    ...inv,
    linesCount: 0,
    createdByName: usersMap[inv.createdBy] || '—',
  }))
  const lines = await db.salesLines.toArray()
  for (const inv of invoices.value) {
    inv.linesCount = lines.filter(l => l.invoiceId === inv.id).length
    if (inv.customerId) inv.customerName = customers.value.find(c => c.id === inv.customerId)?.name || inv.customerName
  }
  customers.value = (await activeCustomers()).map(c => ({ ...c, _balance: 0 }))
  const b = await db.batches.toArray()
  const stockMap = {}, batchesMap = {}
  for (const x of b) {
    if (!x.quarantined && x.qty > 0) {
      stockMap[x.itemId] = (stockMap[x.itemId] || 0) + Number(x.qty || 0)
      ;(batchesMap[x.itemId] = batchesMap[x.itemId] || []).push(x)
    }
  }
  items.value = (await activeItems()).map(it => ({
    ...it, _stock: stockMap[it.id] || 0,
    _batches: (batchesMap[it.id] || []).sort((a, bb) => (a.expDate || '9999') < (bb.expDate || '9999') ? -1 : 1),
  }))
  for (const inv of invoices.value) {
    if (inv.customerId && (inv.paymentType || '') !== 'cash' && (inv.status || 'posted') !== 'cancelled') {
      const c = customers.value.find(x => x.id === inv.customerId)
      if (c) c._balance += ((inv.total || 0) - (inv.paid || 0))
    }
  }
  const s = await currentSession()
  currentUserName.value = s?.userName || '—'
}

/* ---------- رسائل الحالة ---------- */
function flash(msg, cls) { formStatusMsg.value = msg; formStatusClass.value = cls || 'cmd-success'; setTimeout(() => { if (formStatusMsg.value === msg) formStatusMsg.value = '' }, 4500) }

/* ---------- البحث الفوري للأصناف ---------- */
function onQuickSearch() {
  const term = quickItem.value.trim().toLowerCase()
  if (!term) { quickDropdown.value = []; dropdownOpen.value = false; return }
  const scored = items.value
    .filter(it => {
      const name = (it.name || '').toLowerCase()
      const barcode = (it.barcode || '').toLowerCase()
      const code = String(it.code || '').toLowerCase()
      const idStr = String(it.id)
      return name.includes(term) || barcode.includes(term) || code.includes(term) || idStr.includes(term)
    })
    .map(it => {
      const name = (it.name || '').toLowerCase()
      const code = String(it.code || '').toLowerCase()
      let score = 1
      if (name === term || code === term) score = 100
      else if (name.startsWith(term) || code.startsWith(term) || (it.barcode || '').toLowerCase().startsWith(term)) score = 50
      if (!it._stock) score -= 0.5
      return { it, score }
    })
    .sort((a, b) => b.score - a.score || a.it.name.localeCompare(b.it.name, 'ar'))
    .map(x => x.it)
    .slice(0, 10)
  quickDropdown.value = scored
  dropdownOpen.value = scored.length > 0
  ddIndex.value = 0
}
function addFoundItem(it) {
  quickItem.value = it.name
  quickDropdown.value = []
  dropdownOpen.value = false
  addQuickItem(it)
}
function onQuickBlur() { setTimeout(() => { dropdownOpen.value = false }, 150) }
function openItemDropdown() { dropdownOpen.value = quickDropdown.value.length > 0; ddIndex.value = 0 }
function ddNav(dir) {
  if (!dropdownOpen.value || !quickDropdown.value.length) return
  ddIndex.value = (ddIndex.value + dir + quickDropdown.value.length) % quickDropdown.value.length
}
function quickItemSubmit() {
  if (dropdownOpen.value && quickDropdown.value.length) {
    addFoundItem(quickDropdown.value[ddIndex.value])
  } else if (quickItem.value.trim()) {
    addQuickItem()
  } else if (!form.value.lines.length) {
    // فاتورة فارغة + حقل صنف فارغ → ركّز على حقل الصنف نفسه
    nextTick(() => quickInput.value?.focus?.())
  }
}

/* ---------- البحث الفوري للعميل ---------- */
function onCustomerSearch() {
  const term = customerSearch.value.trim().toLowerCase()
  if (!term) { customerDropdownList.value = []; customerDropdownOpen.value = false; return }
  customerDropdownOpen.value = true
  const scored = customers.value
    .filter(c =>
      (c.name || '').toLowerCase().includes(term) ||
      String(c.id).includes(term) ||
      String(c.code || '').toLowerCase().includes(term) ||
      (c.phone || '').includes(term))
    .map(c => {
      const name = (c.name || '').toLowerCase()
      const code = String(c.code || '').toLowerCase()
      let score = 1
      if (name === term || code === term || (c.phone || '') === term) score = 100
      else if (name.startsWith(term) || code.startsWith(term) || (c.phone || '').startsWith(term)) score = 50
      return { c, score }
    })
    .sort((a, b) => b.score - a.score || a.c.name.localeCompare(b.c.name, 'ar'))
    .map(x => x.c)
    .slice(0, 8)
  customerDropdownList.value = scored
  cdIndex.value = 0
  // تطابق تام → ربط مباشر
  const exact = scored.find(c =>
    (c.name || '').toLowerCase() === term || String(c.id) === term ||
    String(c.code || '').toLowerCase() === term || (c.phone || '').trim() === term)
  if (exact) linkCustomer(exact)
}
function openCustomerDropdown() { customerDropdownOpen.value = customerDropdownList.value.length > 0; cdIndex.value = 0 }
function cdNav(dir) {
  if (!customerDropdownOpen.value || !customerDropdownList.value.length) return
  cdIndex.value = (cdIndex.value + dir + customerDropdownList.value.length) % customerDropdownList.value.length
}
function linkCustomer(c) {
  form.value.customerId = c.id
  customerSearch.value = c.name
  customerDropdownOpen.value = false
  if (!form.value.dueDate && c.creditLimit) {
    const d = new Date(); d.setDate(d.getDate() + 30)
    form.value.dueDate = d.toISOString().slice(0, 10)
  }
}
function selectFoundCustomer(c) {
  linkCustomer(c)
  nextTick(() => quickInput.value?.focus?.())
}
function addCustomerBySearch() {
  const term = customerSearch.value.trim()
  if (!term) return
  if (form.value.customerId && selectedCustomer.value &&
      (selectedCustomer.value.name || '').toLowerCase().includes(term.toLowerCase())) return
  const c = customers.value.find(x =>
    (x.name || '').toLowerCase().includes(term.toLowerCase()) ||
    String(x.id) === term ||
    String(x.code || '').toLowerCase() === term ||
    (x.phone || '').trim() === term)
  if (c) { linkCustomer(c); return }
  openNewCustomer()
}
function onCustomerBlur() { setTimeout(() => { customerDropdownOpen.value = false }, 150) }

function openNewCustomer() {
  newCustomer.value = { name: customerSearch.value.trim() || '', phone: '', creditLimit: 0 }
  showNewCustomer.value = true
}

async function saveNewCustomer() {
  if (!newCustomer.value.name.trim()) { formError.value = 'أدخل اسم العميل'; return }
  try {
    if (isServer()) {
      const { apiFetch } = await import('../../db/api.js')
      await apiFetch('/customers', {
        method: 'POST',
        body: JSON.stringify({ name: newCustomer.value.name.trim(), phone: newCustomer.value.phone.trim() || null, creditLimit: Number(newCustomer.value.creditLimit || 0) }),
      })
      const cs = await apiFetch('/customers')
      const c = (Array.isArray(cs) ? cs : []).find(x => (x.name || '').trim() === newCustomer.value.name.trim())
      if (c) {
        customers.value.push(c)
        form.value.customerId = c.id
        customerSearch.value = c.name
      }
      showNewCustomer.value = false
      flash('تمت إضافة العميل ' + newCustomer.value.name, 'cmd-success')
      return
    }
    const { nextDocNo } = await import('../../db/sequences.js')
    const code = await nextDocNo('customer')
    const id = await db.customers.add({
      name: newCustomer.value.name.trim(),
      phone: newCustomer.value.phone.trim() || null,
      creditLimit: Number(newCustomer.value.creditLimit || 0),
      code, status: 'active', createdAt: Date.now(),
    })
    customers.value.push({ id, ...newCustomer.value, code, status: 'active' })
    form.value.customerId = id
    customerSearch.value = newCustomer.value.name.trim()
    showNewCustomer.value = false
    flash('تمت إضافة العميل ' + newCustomer.value.name, 'cmd-success')
  } catch (e) { formError.value = e.message }
}

/* ---------- إدارة بنود الفاتورة ---------- */
function addQuickItem(found) {
  const term = (found ? found.name : quickItem.value.trim())
  if (!term && !found) return
  if (!found) {
    const t = quickItem.value.trim().toLowerCase()
    found = items.value.find(it =>
      (it.name || '').toLowerCase().includes(t) ||
      (it.barcode || '').includes(t) ||
      String(it.code || '').includes(t) ||
      String(it.id).includes(t))
  }
  if (!found) {
    formError.value = 'لم يُعثر على الصنف: ' + term
    flash('لم يُعثر على الصنف', 'cmd-error')
    return
  }
  // تكرار الصنف: رفع الكمية بدل إضافة سطر جديد (إعداد النظام)
  const existing = form.value.lines.find(l => l.itemId === found.id)
  if (existing) {
    existing.qty = Number(existing.qty || 0) + Number(quickQty.value || 1)
    flash('رفعنا كمية «' + found.name + '» بدل تكرار السطر', 'cmd-success')
  } else {
    const lots = lotsOf(found.id)
    const lot = lots[0] || null
    editAuditTrail.value.push({ action: 'line_add', detail: 'أُضيف ' + found.name, at: Date.now() })
    form.value.lines.push({
      itemId: found.id, qty: Number(quickQty.value || 1), unit: found.unit || null,
      price: found.sellPrice || 0, discount: 0, tax: 0,
      lotLabel: lot ? (lot.batchNo || null) : null,
      lotBatchId: lot ? lot.id : null,
    })
    activeLine.value = form.value.lines.length - 1
  }
  quickItem.value = ''
  quickQty.value = 1
  quickDropdown.value = []
  dropdownOpen.value = false
  nextTick(() => qtyInput.value?.focus?.())
}

function addLine() { form.value.lines.push({ itemId: null, qty: 1, price: 0, discount: 0, tax: 0 }) }
function removeLine(i) {
  if (form.value.lines.length <= 1) { form.value.lines = []; activeLine.value = 0; return }
  const l = form.value.lines[i]
  const it = itemOf(l.itemId)
  editAuditTrail.value.push({ action: 'line_remove', detail: 'حُذف ' + (it?.name || 'سطر'), at: Date.now() })
  form.value.lines.splice(i, 1)
  activeLine.value = Math.min(activeLine.value, form.value.lines.length - 1)
}

function onItemChange(i, it) {
  if (!it) return
  editAuditTrail.value.push({ action: 'item_change', detail: 'تغيّر الصنف في السطر ' + (i + 1), at: Date.now() })
  form.value.lines[i].price = it.sellPrice || 0
  const lots = lotsOf(it.id)
  if (lots.length) {
    form.value.lines[i].lotLabel = lots[0].batchNo || null
    form.value.lines[i].lotBatchId = lots[0].id
  }
}

function onQtyBlur(i) {
  const l = form.value.lines[i]
  if (!l) return
  const it = itemOf(l.itemId)
  if (!it) return
  if (Number(l.qty || 0) > (it._stock || 0)) {
    flash(`الكمية المطلوبة لـ «${it.name}» أكبر من المتاح (${it._stock})`, 'cmd-error')
    l.qty = it._stock
  }
  l.qty = Math.max(0, Number(l.qty || 0) || 0)
}

function onPriceChange(i, newVal) {
  const l = form.value.lines[i]
  const it = itemOf(l.itemId)
  if (!l || !it) return
  if (Number(newVal) !== (it.sellPrice || 0) && canEditPrice.value) {
    editAuditTrail.value.push({ action: 'price_change', detail: `تغيّر سعر ${it.name} من ${it.sellPrice} إلى ${newVal}`, at: Date.now() })
  }
  l.price = Number(newVal) || 0
}
function onDiscountChange(i, newVal) {
  const l = form.value.lines[i]
  const it = itemOf(l.itemId)
  if (!l) return
  const v = Math.max(0, Math.min(Number(newVal) || 0, lineTotal({ ...l, discount: 0 })))
  if (v !== (l.discount || 0) && canEditDiscount.value) {
    editAuditTrail.value.push({ action: 'discount_change', detail: `خصم ${it?.name || 'سطر'} = ${v}`, at: Date.now() })
  }
  l.discount = v
}
function onTaxChange(i, newVal) {
  const l = form.value.lines[i]
  if (!l) return
  l.tax = Math.max(0, Number(newVal) || 0)
}
function onUnitChange(i) { /* وحدة السطر — حسب إعداد النظام تُحفظ */ }

/* ---------- نافذة LOT ---------- */
function openLotModal(i) {
  const l = form.value.lines[i]
  if (!l.itemId) return
  if (lotsOf(l.itemId).length < 2) return
  lotModalIndex.value = i
  lotModalItem.value = l.itemId
}
function selectLot(i, batch) {
  const l = form.value.lines[i]
  if (l) {
    l.lotLabel = batch.batchNo || String(batch.id)
    l.lotBatchId = batch.id
    editAuditTrail.value.push({ action: 'lot_change', detail: itemOf(l.itemId)?.name, at: Date.now() })
  }
  lotModalIndex.value = -1
}

/* ---------- الخصم السريع (F5/F6) ---------- */
function openDiscountModal() {
  if (!form.value.lines.length) { flash('أضف صنفًا أولًا', 'cmd-error'); return }
  discountKind.value = 'amount'
  discountValue.value = 0
  activeLine.value = 0
  showDiscountModal.value = true
}
function applyDiscount() {
  const v = Number(discountValue.value || 0)
  if (!form.value.lines.length) { showDiscountModal.value = false; return }
  const line = form.value.lines[activeLine.value] || form.value.lines[0]
  const max = lineTotal({ ...line, discount: 0 })
  const val = discountKind.value === 'percent'
    ? Math.max(0, Math.min(max * (v / 100), max))
    : Math.max(0, Math.min(v, max))
  line.discount = val
  editAuditTrail.value.push({ action: 'discount_apply', detail: `${discountKind.value === 'percent' ? v + '%' : fmt(v)} على السطر ${activeLine.value + 1}`, at: Date.now() })
  showDiscountModal.value = false
  flash('حُدّث الخصم', 'cmd-success')
}

/* ---------- نوافذ الدفع ---------- */
function openPayWindow() {
  if (!form.value.lines.length) { flash('أضف صنفًا أولًا', 'cmd-error'); return }
  payForm.value = { method: 'cash', amount: netTotal.value }
  showPayWindow.value = true
}
function applyPay() {
  const amount = Number(payForm.value.amount || 0)
  if (amount <= 0 || amount > netTotal.value) { flash('مبلغ دفع غير صحيح', 'cmd-error'); return }
  if (amount < netTotal.value) {
    // دفعة جزئية → آجل للباقي (يدخل كذمة إن وُجد عميل)
    form.value.paymentType = form.value.customerId ? 'credit' : 'cash'
  } else {
    form.value.paymentType = payForm.value.method === 'credit' ? 'credit' : 'cash'
    form.value.payMethod = payForm.value.method
  }
  form.value.paidAmount = amount
  showPayWindow.value = false
  flash('حُدّث الدفع: ' + fmt(amount), 'cmd-success')
}
async function confirmPay() { applyPay(); await persist(null, false) }
async function confirmPayThenPrint() { applyPay(); await persist('print', false) }

function openMultiPay() {
  if (!form.value.lines.length) { flash('أضف صنفًا أولًا', 'cmd-error'); return }
  multiPayList.value = [
    { method: 'cash', amount: netTotal.value },
    { method: 'card', amount: 0 },
    { method: 'transfer', amount: 0 },
  ]
  showMultiPay.value = true
}
function multiTotal() { return multiPayList.value.reduce((s, m) => s + Number(m.amount || 0), 0) }
function applyMultiPay() {
  const t = multiTotal()
  if (t !== netTotal.value) { flash('مجموع طرق الدفع يجب أن يساوي صافي الفاتورة (' + fmt(netTotal.value) + ')', 'cmd-error'); return }
  form.value.paidAmount = t
  form.value.paymentType = 'cash'
  form.value.payMethod = multiPayList.value.find(m => Number(m.amount || 0) > 0)?.method || 'cash'
  showMultiPay.value = false
  flash('توزيع طرق الدفع محدد', 'cmd-success')
}

/* ---------- التنفيذ: حفظ / ترحيل / تعليق ---------- */
async function persist(inv, isDraft) {
  saving.value = true
  formError.value = ''
  try {
    const session = await requirePermission('sales.write', 'إنشاء فاتورة بيع')
    const f = form.value
    const lines = f.lines.filter(l => l.itemId && l.qty && l.qty > 0)
    if (lines.length === 0) throw new Error('أضف صنفًا واحدًا على الأقل بكمية صحيحة')
    if (!isDraft) {
      for (const l of lines) {
        const it = itemOf(l.itemId)
        if (l.qty > (it?._stock || 0)) throw new Error(`المخزون المتاح للصنف "${it?.name}" أقل من المطلوب (${it?._stock || 0})`)
      }
    }
    if (isServer()) {
      if (isDraft) throw new Error('وضع الخادم لا يدعم المسودات — استخدم الترحيل المباشر')
      await serverPostSale({
        customerId: f.customerId, paymentType: f.paymentType, notes: f.notes || null,
        lines: lines.map(l => ({ itemId: l.itemId, qty: l.qty, price: l.price })),
      })
      const s = await currentSession()
      await db.auditLogs.add({ userId: s?.userId ?? 0, userName: s?.userName ?? 'مجهول', action: 'sale_created', refKind: 'sale', refId: null, detail: null, createdAt: Date.now() })
      editing.value = false
      flash('تم ترحيل الفاتورة بنجاح — المخزون والقيود محدثان', 'cmd-success')
      await loadData()
      if (inv === 'print') printLast()
      return
    }
    const total = netTotal.value
    const paid = f.paymentType === 'credit' ? 0 : Math.max(0, Number(f.paidAmount || 0) || total)
    const { nextDocNo } = await import('../../db/sequences.js')
    const invoiceNo = await nextDocNo('sale', new Date(f.date).getFullYear())
    const status = isDraft ? 'draft' : 'posted'
    if (f.paymentType === 'credit' || f.paymentType === 'insurance') {
      const customer = await db.customers.get(f.customerId)
      if (customer && (customer.creditLimit || 0) > 0) {
        const pending = await db.salesInvoices.where('customerId').equals(f.customerId).and(i => i.status !== 'cancelled').toArray()
        const owed = pending.reduce((s, i) => s + ((i.total || 0) - (i.paid || 0)), 0)
        if (owed + total > customer.creditLimit) {
          throw new Error(`تجاوز الحد الائتماني للعميل "${customer.name}" — المتبقي عليه ${fmt(owed)} + الفاتورة الجديدة ${fmt(total)} > الحد ${fmt(customer.creditLimit)}`)
        }
      }
    }
    const saleId = await db.salesInvoices.add({
      customerId: f.customerId, date: f.date, storeId: f.storeId || 1,
      paymentType: f.paymentType, payMethod: f.payMethod || 'cash', currency: f.currency || 'YER',
      dueDate: f.dueDate || null,
      notes: f.notes || null, internalNotes: f.internalNotes || null,
      docType: f.docType || 'sale',
      insuranceCompany: f.insuranceCompany || null,
      insuranceCard: f.insuranceCard || null,
      insuranceCoverage: f.insuranceCoverage || 0,
      claimNo: f.claimNo || null,
      total, paid, status, createdBy: session.userId, createdAt: Date.now(),
      invoice_no: invoiceNo,
    })
    for (const l of lines) {
      let cogs = 0, consumed = []
      if (!isDraft) {
        ({ cogs } = await computeCOGS(l.itemId, l.qty))
        consumed = await consumeStock(l.itemId, l.qty, { refKind: 'sale', refId: saleId })
      }
      await db.salesLines.add({
        invoiceId: saleId, itemId: l.itemId, unit: l.unit || itemOf(l.itemId)?.unit || null,
        batchIds: consumed.map(c => c.batchId),
        qty: l.qty, price: l.price, discount: l.discount, tax: l.tax, subtotal: lineTotal(l), cogs,
        lotLabel: l.lotLabel || null,
        lotBatchId: l.lotBatchId || consumed[0]?.batchId || null,
      })
    }
    if (!isDraft) {
      await postSaleJournal({ saleId, total, paid, customerPaid: f.paymentType, cogsAmount: lines.reduce((s, l) => s + (l.cogs || 0), 0) })
      // قراءة القيود الناتجة لعرضها في تبويب القيد المحاسبي
      try {
        const j = await db.journalLines.where('refKind').equals('sale').and(j => j.refId === saleId).toArray()
        lastPostedJournal.value = j
      } catch (e) { /* لا مانع */ }
    }
    const s = await currentSession()
    await db.auditLogs.add({ userId: s?.userId ?? 0, userName: s?.userName ?? 'مجهول', action: isDraft ? 'sale_draft_saved' : 'sale_created', refKind: 'sale', refId: saleId, detail: null, createdAt: Date.now() })
    editing.value = false
    flash(isDraft ? 'تم حفظ المسودة بنجاح' : 'تم ترحيل الفاتورة بنجاح — المخزون والقيود محدثان', 'cmd-success')
    await loadData()
    if (inv === 'print') printLast()
  } catch (e) {
    formError.value = e.message
    flash(e.message, 'cmd-error')
  } finally {
    saving.value = false
  }
  /* حذف الفاتورة المعلقة بعد الحفظ/الترحيل بنجاح */
  try {
    if (!isServer() && form.value.docNo && String(form.value.docNo).startsWith('HOLD-')) {
      const hid = Number(String(form.value.docNo).replace('HOLD-', '')) || null
      if (hid) await db.heldInvoices.delete(hid)
    }
  } catch (e) { /* لا مانع */ }
}

function printLast() {
  const last = [...invoices.value].sort((a, b) => b.id - a.id)[0]
  if (last) printInvoice(last)
}

const save = () => persist(null, false)
const saveDraft = () => persist(null, true)
const saveThenPrint = () => persist('print', false)
const saveAndRefresh = () => loadData()

/* ---------- تعليق حقيقي (F4) ---------- */
async function holdInvoice() {
  if (!form.value.lines.length) { flash('لا توجد بنود لتعليقها', 'cmd-error'); return }
  const session = await currentSession()
  try {
    if (isServer()) {
      await db.auditLogs.add({ userId: session?.userId ?? 0, userName: session?.userName ?? 'مجهول', action: 'sale_hold_pending', refKind: 'sale', refId: null, detail: JSON.stringify(form.value), createdAt: Date.now() })
    } else {
      await db.heldInvoices.add({ ...form.value, heldAt: Date.now(), heldBy: session?.userId ?? 0 })
    }
    flash('عُلّقت الفاتورة — استرجعها لاحقًا من زر «الاسترجاع» أو F4 في وضع الفواتير', 'cmd-success')
    clearForm()
  } catch (e) { flash(e.message, 'cmd-error') }
}

/* ---------- إلغاء / مرتجع يعكس الحركة ---------- */
async function cancelInvoice(inv) {
  if (!confirm(`إلغاء فاتورة البيع ${inv.invoice_no}؟ ستُعكس كل حركات المخزون والقيود.`)) return
  try {
    await requirePermission('sales.write', 'إلغاء فاتورة بيع')
    if (isServer()) {
      await serverCancelSale(inv.id)
      await loadData()
      flash('تم إلغاء الفاتورة', 'cmd-success')
      return
    }
    const { cancelSaleLocal } = await import('../../db/engine.js')
    await cancelSaleLocal(inv.id)
    await loadData()
    flash('تم إلغاء الفاتورة وعكس كل حركات المخزون والقيود', 'cmd-success')
  } catch (e) {
    flash(e.message, 'cmd-error')
  }
}

/* ---------- التنقل بين الفواتير ---------- */
function prevInvoice() {
  if (!invoices.value.length) return
  editing.value = false
  const idx = invoices.value.findIndex(i => i.invoice_no === form.value.docNo)
  const sorted = [...invoices.value].sort((a, b) => a.id - b.id)
  const cur = idx >= 0 ? idx : sorted.length - 1
  openInvoiceForEdit(sorted[Math.max(0, cur - 1)])
}
function nextInvoice() {
  if (!invoices.value.length) return
  editing.value = false
  const idx = invoices.value.findIndex(i => i.invoice_no === form.value.docNo)
  const sorted = [...invoices.value].sort((a, b) => a.id - b.id)
  const cur = idx >= 0 ? idx : 0
  openInvoiceForEdit(sorted[Math.min(sorted.length - 1, cur + 1)])
}
async function openInvoiceForEdit(inv) {
  editing.value = true
  listMode.value = false
  await loadData()
  /* فاتورة معلقة: استرجاع كامل البيانات المحفوظة */
  if (inv._heldForm) {
    const h = inv._heldForm
    form.value = { ...h }
    if (!form.value.lines) form.value.lines = []
    form.value.docNo = h.docNo || ('HOLD-' + h.id)
    const c = customers.value.find(x => x.id === h.customerId)
    if (c) customerSearch.value = c.name
    flash('استُرجعت الفاتورة المعلقة كاملة البيانات', 'cmd-success')
    return
  }
  form.value = {
    customerId: inv.customerId || null,
    docType: inv.docType || 'sale',
    date: inv.date || new Date().toISOString().slice(0, 10),
    storeId: inv.storeId || 1,
    warehouseId: 1,
    paymentType: inv.paymentType || 'cash',
    payMethod: inv.payMethod || 'cash',
    currency: inv.currency || 'YER',
    dueDate: inv.dueDate || '',
    notes: inv.notes || '',
    internalNotes: inv.internalNotes || '',
    insuranceCompany: inv.insuranceCompany || '',
    insuranceCard: inv.insuranceCard || '',
    claimNo: inv.claimNo || '',
    insuranceCoverage: inv.insuranceCoverage || 0,
    paidAmount: inv.paid || 0,
    lines: [],
    docNo: inv.invoice_no,
  }
  const lines = await db.salesLines.where('invoiceId').equals(inv.id).toArray()
  for (const l of lines) {
    const it = itemOf(l.itemId)
    form.value.lines.push({
      itemId: l.itemId, qty: l.qty, unit: l.unit || it?.unit || null,
      price: l.price, discount: l.discount || 0, tax: l.tax || 0,
      lotLabel: l.lotLabel || null, lotBatchId: l.lotBatchId || null,
    })
  }
  const c = customers.value.find(x => x.id === inv.customerId)
  if (c) customerSearch.value = c.name
  // قراءة القيد المحاسبي المرتبط
  try {
    const j = await db.journalLines.where('refKind').equals('sale').and(j => j.refId === inv.id).toArray()
    lastPostedJournal.value = j
  } catch (e) { /* لا مانع */ }
  flash('فُتحت الفاتورة ' + inv.invoice_no, 'cmd-success')
}

/* ---------- طباعة ---------- */
function printInvoice(inv) { viewed.value = inv; showView.value = true; setTimeout(() => window.print(), 100) }
function viewInvoice(inv) { viewed.value = inv; showView.value = true }

/* ---------- وضع القائمة / الفاتورة ---------- */
function clearForm() {
  formError.value = ''
  formStatusMsg.value = ''
  quickItem.value = ''
  quickQty.value = 1
  quickDropdown.value = []
  dropdownOpen.value = false
  customerSearch.value = ''
  form.value = {
    customerId: null, docType: 'sale',
    date: new Date().toISOString().slice(0, 10),
    storeId: 1, warehouseId: 1,
    paymentType: 'cash', payMethod: 'cash', currency: 'YER',
    dueDate: '', notes: '', internalNotes: '',
    insuranceCompany: '', insuranceCard: '', claimNo: '', insuranceCoverage: 0,
    paidAmount: 0, lines: [], docNo: '',
  }
  editing.value = false
  listMode.value = false
  lastPostedJournal.value = []
  editAuditTrail.value = []
}
function openNewInvoice() {
  clearForm()
  editing.value = true
  listMode.value = false
  nextTick(() => quickInput.value?.focus())
}
function showInvoiceList() {
  editing.value = false
  listMode.value = true
  searchText.value = ''
  listFilter.value = ''
}
function goList() { showInvoiceList() }
function selectFromList(inv) {
  openInvoiceForEdit(inv)
}
function closeWindow() { emit('close') }

/* ---------- اختصارات لوحة المفاتيح (تعمل فعليًا) ---------- */
const propsDef = defineProps({ windowId: { type: [String, Number], default: null }, active: { type: Boolean, default: false } })
const emit = defineEmits(['close'])
const getActive = inject('docActive', () => propsDef.active)
provide('docActive', () => propsDef.active)

function handleKeydown(e) {
  if (!getActive()) return
  // اختصارات عامة (الوضعين)
  if (e.key === 'F11') { e.preventDefault(); openNewInvoice(); return }
  if (e.key === 'F7') { e.preventDefault(); printList(); return }
  if (e.key === 'F2') { e.preventDefault(); showInvoiceList(); return }
  if (e.key === 'Escape') { e.preventDefault(); if (editing.value) { editing.value = false; listMode.value = true } }
  if (!editing.value) return
  // داخل الفاتورة
  if (e.key === 'F10') { e.preventDefault(); openPayWindow(); return }
  if (e.key === 'F12') { e.preventDefault(); openMultiPay(); return }
  if (e.key === 'F3') { e.preventDefault(); if (form.value.lines.length) { removeLine(activeLine.value); nextTick(() => quickInput.value?.focus()) }; return }
  if (e.key === 'F4') { e.preventDefault(); holdInvoice(); return }
  if (e.key === 'F5') { e.preventDefault(); discountKind.value = 'amount'; openDiscountModal(); return }
  if (e.key === 'F6') { e.preventDefault(); discountKind.value = 'percent'; openDiscountModal(); return }
  if (e.key === 'F8') { e.preventDefault(); save(); return }
  if (e.key === 'F9') { e.preventDefault(); saveDraft(); return }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); save(); return }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); nextTick(() => quickInput.value?.focus()); return }
  if (e.key === 'ArrowLeft') { prevInvoice(); return }
  if (e.key === 'ArrowRight') { nextInvoice(); return }
}
function printList() { window.print() }

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('sharaf-new-doc', onNewDoc)
  loadData()
  // تبدأ مباشرة في وضع فاتورة جديدة (Onyx)
  editing.value = true
  listMode.value = false
  nextTick(() => quickInput.value?.focus())
})
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('sharaf-new-doc', onNewDoc)
})
</script>

<style scoped>
/* ============================================
   شاشة الفاتورة — نمط Onyx Pro (كثافة مكتبية)
   ============================================ */
.page-screen { width: 100%; }
.ox-screen {
  display: flex; flex-direction: column; gap: 6px;
  height: 100%; min-height: 0; overflow: hidden;
}

/* ---------- تخطيط الشاشة الكلي ---------- */
.ox-layout {
  display: flex; flex-direction: column; gap: 6px;
  width: 100%; flex: 1; min-height: 0;
  height: 100%;
}

/* ---------- شريط عنوان الفاتورة ---------- */
.ox-titlebar {
  display: flex; align-items: center; gap: 10px;
  background: #1e2330; color: #e9ecf3; padding: 5px 12px; border-radius: 6px;
  min-height: 34px; box-shadow: 0 1px 3px rgba(10, 20, 40, .25);
}
.ox-title { font-weight: 700; font-size: 13.5px; }
.ox-title-sep { font-size: 12px; color: #b8c1d4; font-family: Consolas, monospace; }
.topbar-status { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; }
.status-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; background: #6b7280; }
.status-name { font-size: 11.5px; }
.pay-ok { color: #7fd4a5; font-weight: 700; }
.pay-credit { color: #ffb3a7; font-weight: 700; }
.pay-partial { color: #ffd966; font-weight: 700; }

/* ---------- صف الحقول الأول: 6 أعمدة ---------- */
.ox-head {
  display: grid; grid-template-columns: repeat(6, 1fr); column-gap: 8px;
  background: #f5f7fa; border: 1px solid #dfe4ec; border-radius: 6px; padding: 6px 10px;
  align-items: stretch;
}

/* ---------- صف الحقول الثاني: العميل ممتد + 3 حقول ---------- */
.ox-head2 {
  display: grid; grid-template-columns: minmax(260px, 2.2fr) 1fr 1fr 96px; column-gap: 8px;
  background: #f5f7fa; border: 1px solid #dfe4ec; border-radius: 6px; padding: 6px 10px;
  align-items: stretch;
}

/* ---------- أزرار الشريط ---------- */
.tb-btn {
  border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.06); color: #e9ecf3;
  border-radius: 6px; padding: 4px 10px; font-size: 12px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 5px; white-space: nowrap;
}
.tb-btn:hover { background: rgba(255,255,255,.14); }
.tb-btn.primary { background: #1f6feb; border-color: #1f6feb; font-weight: 700; }
.tb-btn.primary:hover { background: #1656b8; }
.tb-btn.warn { background: #d97706; border-color: #d97706; }
.tb-btn.danger { background: #b3261e; border-color: #b3261e; }
.tb-btn.ghost { border-color: transparent; background: transparent; color: #b8c1d4; }

/* ---------- رأس الحقول المضغوط ---------- (تعريف واحد صحيح: 6 أعمدة) */
.ox-head {
  display: grid; grid-template-columns: repeat(6, 1fr); column-gap: 8px;
  background: #f5f7fa; border: 1px solid #dfe4ec; border-radius: 8px; padding: 6px 10px;
  align-items: stretch;
}
.inv-co { display: flex; align-items: center; gap: 6px; }
.inv-co-name { font-weight: 700; font-size: 14px; }
.inv-co-sub { font-size: 11px; color: #6b7280; }
.ox-inp {
  width: 100%; border: 1px solid #c7ced9; border-radius: 6px; padding: 5px 8px;
  font-size: 12.5px; background: #fff; color: #1d2433; outline: none;
}
.ox-inp:focus { border-color: #1f6feb; box-shadow: 0 0 0 2px rgba(31,111,235,.15); }
.ox-inp-strong { font-weight: 700; background: #eef3ff; font-size: 13.5px; }
.ox-field { display: flex; flex-direction: column; gap: 2px; justify-content: center; }
.ox-field label { font-size: 10.5px; font-weight: 700; color: #5a6472; white-space: nowrap; }
.ox-field .ox-inp { min-height: 26px; }
.ox-field-focus { position: relative; }
.ox-field-focus .ox-inp { border-color: #1f6feb; }
.ox-date-row { position: relative; display: flex; align-items: center; }
.ox-date-row .ox-inp[readonly] { text-align: center; }

/* ---------- شريط إدخال الصنف ---------- */
.ox-itembar {
  display: flex; gap: 8px; align-items: stretch;
  background: #f5f7fa; border: 1px solid #dfe4ec; border-radius: 6px; padding: 6px 10px;
}
.ox-search-cell { display: flex; gap: 6px; align-items: center; width: 100%; position: relative; flex: 1; }
.ox-search-input {
  flex: 1; border: 1px solid #1f6feb; border-radius: 6px; padding: 7px 12px;
  font-size: 13.5px; font-weight: 700; outline: none; background: #fff; min-height: 32px;
}
.ox-search-input:focus { box-shadow: 0 0 0 2px rgba(31,111,235,.18); }
.ox-qty { width: 84px; border: 1px solid #c7ced9; border-radius: 6px; padding: 0 8px; font-size: 13px; outline: none; min-height: 32px; text-align: center; }
.ox-qty:focus { border-color: #1f6feb; box-shadow: 0 0 0 2px rgba(31,111,235,.15); }
.ox-add-btn { white-space: nowrap; min-height: 32px; }
.tb-search-icon { color: #6b7280; width: 18px; height: 18px; flex: 0 0 18px; display: inline-block; }

/* ---------- القائمة الفورية ---------- */
.dd {
  position: absolute; z-index: 60; top: 100%; left: 0; right: 0; margin-top: 3px;
  background: #fff; border: 1px solid #c7ced9; border-radius: 6px;
  box-shadow: 0 6px 20px rgba(20, 30, 50, .18); overflow: hidden;
}
.dd-item {
  display: flex; align-items: center; gap: 8px; padding: 6px 10px; cursor: pointer;
  border-bottom: 1px solid #f0f2f6; font-size: 12.5px;
}
.dd-item:hover, .dd-active { background: #eef3ff; }
.dd-out { color: #9aa3b2; }
.dd-n { flex: 1; font-weight: 600; }
.dd-code { color: #1f6feb; font-family: Consolas, monospace; font-size: 11px; }
.dd-meta { color: #6b7280; font-size: 11px; }
.dd-nor { color: #6b7280; font-size: 11px; }

/* ---------- بطاقة الصف على الجوال (تُعرض بدل الجدول العريض) ---------- */
td.ox-line-card { display: none; }
.ox-line-card {
  display: none;
  border-bottom: 1px solid #eef1f5; padding: 7px 10px;
}
.ox-line-card:last-child { border-bottom: 0; }
.ox-line-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ox-line-item { font-weight: 700; font-size: 12.5px; flex: 1; }
.ox-line-lot { font-size: 10.5px; color: #1f6feb; white-space: nowrap; }
.ox-line-exp { font-size: 10.5px; color: #6b7280; }
.ox-line-grid {
  display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 6px; margin-top: 5px; align-items: center;
}
.ox-line-cell { display: flex; flex-direction: column; gap: 2px; }
.ox-line-cell label { font-size: 9.5px; color: #6b7280; font-weight: 700; }
.ox-line-total { font-weight: 800; font-size: 13px; color: #0a7d3a; }
.delete-btn-sm {
  border: 0; background: none; color: #dc2626; cursor: pointer; font-size: 14px; padding: 2px 6px;
}
.delete-btn-sm:disabled { opacity: .3; cursor: default; }

/* ---------- جدول البنود (المساحة الأكبر) ---------- */
.ox-lines {
  flex: 1; min-height: 120px; overflow: auto;
  border: 1px solid #dfe4ec; border-radius: 6px; background: #fff;
}
.ox-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.ox-lines table { height: auto; }
.ox-table { overflow: hidden; }
.ox-table th {
  background: #262c3a; color: #e9ecf3; font-size: 11.5px; font-weight: 600;
  padding: 5px 8px; text-align: right; border-left: 1px solid rgba(255,255,255,.08); position: sticky; top: 0; z-index: 2;
}
.ox-table td { border-bottom: 1px solid #eef1f5; padding: 3px 8px; font-size: 12.5px; }
.ox-row { background: #fff; }
.ox-row-active { background: #eef3ff !important; }
.row-warn { background: #fff7e6 !important; }
.row-warn td { color: #7a4a00; }
.ox-qty input {
  width: 60px; border: 1px solid #c7ced9; border-radius: 5px; padding: 4px 6px;
  font-size: 12.5px; text-align: center; outline: none;
}
.ox-qty input:focus { border-color: #1f6feb; }
.lot-cell { display: flex; align-items: center; gap: 5px; font-size: 11.5px; }
.lot-icon { color: #1f6feb; }
.link-cell { color: #1f6feb; cursor: pointer; text-decoration: underline; }
.action-cells { display: flex; gap: 4px; }
.delete-btn-sm { color: #b3261e; cursor: pointer; border: 0; background: none; font-size: 12px; }
.ox-row td:last-child, .ox-table th:last-child { text-align: center; }
.num-cell { font-family: Consolas, monospace; font-size: 12.5px; text-align: center; }
.tiny { font-size: 10.5px; }
.warn-text { color: #b3261e; font-weight: 700; }
.warn-band {
  margin-top: 4px; background: #fff3cd; color: #7a4a00; border: 1px solid #f0d98f;
  border-radius: 6px; padding: 4px 10px; font-size: 11.5px;
}
.mini-actions { display: flex; gap: 5px; align-items: center; }
.btn-plus {
  background: #1f6feb; color: #fff; border: 0; border-radius: 6px; padding: 4px 8px;
  font-size: 13px; font-weight: 700; cursor: pointer;
}

/* ---------- صف الإجماليات الأفقي ---------- */
.ox-summary {
  display: flex; gap: 6px; align-items: stretch;
  background: #1e2330; color: #e9ecf3; border-radius: 6px; padding: 6px 12px;
  flex-wrap: nowrap;
}
.ox-sum-item {
  display: flex; flex-direction: column; gap: 1px; padding: 3px 14px;
  border-left: 1px solid rgba(255,255,255,.14); flex: 1; align-items: center; justify-content: center;
}
.ox-sum-item:last-child { border-left: 0; }
.ox-sum-lbl { font-size: 10px; color: #b8c1d4; font-weight: 600; }
.ox-sum-val { font-size: 13px; font-weight: 700; font-family: Consolas, monospace; color: #fff; }
.ox-sum-net { background: rgba(255,255,255,.07); border-radius: 6px; border-left: 0; }
.ox-sum-net .ox-sum-val { font-size: 16px; color: #ffd966; }
.tn-row { display: flex; align-items: center; gap: 6px; }
.multi-total { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; font-size: 12px; }
.multi-row { display: flex; gap: 14px; }
.pay-partial-row { display: flex; gap: 10px; align-items: center; font-size: 12px; }
.pay-over { color: #ffb3a7; }
.hint-text { color: #9aa3b2; font-size: 11px; }

/* ---------- التبويبات ---------- */
.ox-tabs { display: flex; gap: 4px; border-bottom: 2px solid #dfe4ec; overflow-x: auto; }
.ox-tabs::-webkit-scrollbar { height: 0; }
.ox-tabs-marg { margin-top: 2px; }
.tab-btn {
  background: none; border: 0; padding: 6px 12px; font-size: 12px; cursor: pointer;
  color: #6b7280; border-bottom: 2px solid transparent; margin-bottom: -2px; font-weight: 600;
}
.tab-btn.active { color: #1f6feb; border-bottom-color: #1f6feb; }
.ox-tabpane { padding: 6px 2px; font-size: 12.5px; }

/* ---------- شريط الأوامر السفلي ---------- */
.ox-cmdbar {
  display: flex; gap: 6px; align-items: center; justify-content: space-between;
  background: #262c3a; border-radius: 6px; padding: 6px 10px; min-height: 44px;
  flex-shrink: 0; margin-top: auto;
}
.cm-btn {
  border: 1px solid rgba(255,255,255,.22); background: rgba(255,255,255,.08); color: #e9ecf3;
  border-radius: 6px; padding: 6px 14px; font-size: 12.5px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; font-weight: 600;
}
.cm-btn:hover { background: rgba(255,255,255,.16); }
.cm-btn:disabled { opacity: .5; cursor: not-allowed; }
.cm-btn.primary { background: #0a7d3a; border-color: #0a7d3a; font-weight: 700; }
.cm-btn.primary:hover { background: #096a31; }
.cm-btn.warn { background: #d97706; border-color: #d97706; }
.cm-btn.danger { background: #b3261e; border-color: #b3261e; margin-right: auto; }
.cm-pay { display: flex; gap: 6px; align-items: center; }
.cm-pay-btn { background: #1f6feb; border-color: #1f6feb; font-weight: 800; font-size: 13px; padding: 7px 18px; }
.cm-pay-btn:hover { background: #1656b8; }
.ox-mini-info { color: #6b7280; font-size: 11.5px; }

/* ---------- أزرار عامة ---------- */
.btn { padding: 7px 16px; border-radius: 6px; border: 1px solid #c7ced9; background: #fff; font-size: 13px; cursor: pointer; }
.btn-primary { background: #1f6feb; color: #fff; border-color: #1f6feb; font-weight: 700; }
.btn-outline { background: #fff; }
.bolt-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.bolt-table th, .bolt-table td { border: 1px solid #dfe4ec; padding: 5px 8px; }
.bolt-table th { background: #f0f3f8; font-weight: 700; }
.cell-item-name { font-weight: 600; }
.cur { cursor: pointer; }

/* ---------- النوافذ المنبثقة ---------- */
.form-modal-overlay {
  position: fixed; inset: 0; background: rgba(15, 23, 40, .55);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.mini-form { background: #fff; border-radius: 10px; width: 420px; max-width: 94vw; box-shadow: 0 12px 40px rgba(10,20,40,.3); }
.mini-form.wide { width: 560px; }
.mini-form-title {
  background: #1e2330; color: #e9ecf3; padding: 8px 14px; font-size: 13px; font-weight: 700;
  display: flex; align-items: center; justify-content: space-between; border-radius: 10px 10px 0 0;
}
.close-btn { background: none; border: 0; color: #e9ecf3; font-size: 16px; cursor: pointer; }
.mini-form .mini-field { padding: 10px 14px; display: flex; flex-direction: column; gap: 8px; }
.mini-field label { font-size: 12px; font-weight: 700; color: #374151; }
.mini-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.mini-actions { display: flex; gap: 8px; justify-content: flex-end; padding-top: 4px; }
.form-card-title { font-weight: 700; font-size: 13px; }

/* ---------- رسائل الحالة ---------- */
.form-msg { font-size: 12px; border-radius: 6px; padding: 4px 10px; }
.form-msg-ok { color: #0a7d3a; background: #e6f4ea; }
.form-msg-error { color: #b3261e; background: #fce8e6; }

/* ---------- الشريحة/التبديل ---------- */
.pay-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.pay-chip {
  border: 1px solid #c7ced9; border-radius: 6px; padding: 4px 12px; font-size: 12px;
  background: #fff; cursor: pointer;
}
.pay-chip.active { background: #1f6feb; color: #fff; border-color: #1f6feb; }

/* ---------- حالة الدفع ---------- */
.pay-ok { color: #0a7d3a; font-weight: 700; }
.pay-credit { color: #b3261e; font-weight: 700; }
.pay-partial { color: #d97706; font-weight: 700; }

/* ---------- الفاتورة فارغة / قائمة الفواتير ---------- */
.table-card { background: #fff; border: 1px solid #dfe4ec; border-radius: 8px; padding: 8px; }
.tb-search { flex: 1; }
.empty-box { text-align: center; padding: 30px 16px; color: #6b7280; }
.empty-icon { font-size: 28px; opacity: .5; }
.empty-title { font-weight: 700; font-size: 14px; margin-top: 6px; }
.empty-hint { font-size: 12px; margin-top: 4px; }
.empty-row td { text-align: center; }
.ox-empty-row td { text-align: center; padding: 24px; color: #6b7280; }

/* ---------- قائمة العملاء ---------- */
.ox-cust-row { cursor: pointer; }
.ox-cust-inp { background: #fffbe6 !important; border-color: #f0d98f !important; }
.df-small { font-size: 11px; color: #6b7280; }
.lx { color: #b3261e; }

/* ---------- حالة الحالة (status pill) ---------- */
.editStatusClass { font-size: 11.5px; padding: 2px 8px; border-radius: 10px; }
.topbar-center .status-name { padding: 2px 8px; border-radius: 10px; background: rgba(255,255,255,.12); }

/* ---------- شبكة الفاتورة المطبوعة ---------- */
.print-area { display: none; }
.print-actions { display: flex; gap: 8px; }

@media (max-width: 768px) {
  .ox-head { grid-template-columns: 1fr 1fr; }
  .ox-head2 { grid-template-columns: 1fr; }
  .ox-cmdbar { flex-wrap: wrap; }
  .cm-btn { flex: 1 1 30%; justify-content: center; font-size: 11px; padding: 6px 6px; }
  .cm-btn.danger { flex: 1 1 46%; }
  .cm-pay-btn { flex: 1 1 100%; }
  .ox-summary { flex-wrap: wrap; }
  .ox-sum-item { flex: 1 1 28%; border-left: 0; }
  .mini-grid { grid-template-columns: 1fr; }
  /* على الجوال: بطاقات الصفوف بدل الجدول العريض، وبحث الصنف أكبر */
  .ox-table { display: none; }
  .ox-line-card { display: block; }
  .ox-lines { flex: 1; }
  .ox-search-input { font-size: 14px; min-height: 40px; }
  .ox-field label { white-space: normal; }
  /* شريط إدخال الصنف: بحث يملأ السطر، الكمية والإضافة صفًا واحدًا تحته */
  .ox-itembar { flex-wrap: wrap; }
  .ox-search-cell { flex: 1 1 100%; }
  .ox-qty { flex: 1 1 48%; width: auto; margin-top: 4px; }
  .ox-add-btn { flex: 1 1 48%; margin-top: 4px; }
  /* الشاشة أطول من الشاشة: تمرير داخلي وشريط أوامر مسمّر بالأسفل */
  .ox-layout { overflow-y: auto; }
  .ox-cmdbar { position: sticky; bottom: 0; }
}
</style>
