<template>
  <!--
    سند الصرف — نمط Onyx Pro تشغيلي (كثافة مكتبية / RTL)
    • قيد مزدوج آلي: مدين (المستفيد: ذمم الموردين / مصروف تشغيلي) ← دائن الصندوق أو البنك
    • رأس سند + جدول تفاصيل — الشرط الذهبي: الفارق = 0
    • صرف نقدي / بنكي / شيك — رقم الشيك + تاريخ الاستحقاق
    • اختصارات: F9 دليل الحسابات، F10 ترحيل، F7 رصيد المستفيد، F11 جديد
    • أيقونة «اليومية» لعرض القيد المحاسبي — طباعة — سجل كامل (مرحّل/معلّق/ملغى)
  -->
  <div class="ox-screen" tabindex="-1" @keydown="handleKeydown" ref="screenRoot">

    <!-- ==========================================================
         قائمة السندات — "السجل"؛ الدخول المباشر = سند جديد
         ========================================================== -->
    <template v-if="listMode">
      <div class="page-screen">
        <div class="topbar">
          <div class="topbar-right">
            <h1 class="topbar-title">سجل سندات الصرف</h1>
            <span class="topbar-status">العدد: {{ payments.length }} · إجمالي المصروف: {{ fmt(totalAmount) }} <span class="cur">ريال</span></span>
          </div>
          <div class="topbar-center">
            <button class="tb-btn primary" @click="openNewVoucher">سند جديد (F11)</button>
            <button class="tb-btn" @click="loadData" title="إعادة تحميل">↻ تحديث</button>
          </div>
          <div class="topbar-left">
            <div class="tb-search">
              <span class="tb-search-icon">🔍</span>
              <input v-model="searchText" placeholder="بحث رقم/مستفيد..." />
            </div>
            <select class="df-small" v-model="listFilter">
              <option value="">كل الحالات</option>
              <option value="posted">المرحّلة</option>
              <option value="draft">المعلّقة</option>
              <option value="cancelled">الملغاة</option>
            </select>
            <select class="df-small" v-model="listMethod">
              <option value="">كل الطرق</option>
              <option value="cash">نقداً</option>
              <option value="bank">بنكي</option>
              <option value="check">شيك</option>
            </select>
          </div>
        </div>
        <div class="table-card" style="flex:1">
          <table class="bolt-table">
            <thead>
              <tr>
                <th style="width:120px">رقم السند</th>
                <th style="width:95px">التاريخ</th>
                <th>المستفيد / البيان</th>
                <th style="width:80px">الطريقة</th>
                <th style="width:100px">الخزانة</th>
                <th style="width:90px">المبلغ</th>
                <th style="width:80px">الحالة</th>
                <th style="width:190px">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in visiblePayments" :key="v.id"
                  :class="{ selected: selectedRow === v.id }"
                  @click="selectedRow = v.id">
                <td><span class="link-cell">{{ v.voucher_no }}</span></td>
                <td>{{ v.date }}</td>
                <td style="font-weight:600">{{ v.beneficiaryName }}<span v-if="v.statement" class="hint-text"> · {{ v.statement }}</span></td>
                <td>{{ methodLabel(v.method) }}</td>
                <td>{{ treasuryLabel(v) }}</td>
                <td class="num-cell"><b>{{ fmt(v.amount) }}</b></td>
                <td><span class="status-dot" :class="v.status || 'posted'"></span><span class="status-name" :class="v.status || 'posted'">{{ statusName(v.status) }}</span></td>
                <td class="action-cells">
                  <button class="act" title="فتح للتعديل" @click.stop="openVoucherForEdit(v)">فتح</button>
                  <button class="act" title="عرض القيد المحاسبي" @click.stop="viewJournal(v)">📒</button>
                  <button class="act" title="طباعة" @click.stop="printVoucher(v)">🖨</button>
                  <button v-if="(v.status || 'draft') === 'posted'" class="act danger" title="إلغاء (عكس القيد المحاسبي)" @click.stop="cancelVoucher(v)">✕</button>
                </td>
              </tr>
              <tr v-if="visiblePayments.length === 0">
                <td colspan="8" class="empty-row">
                  <div class="empty-box">
                    <span class="empty-icon">💸</span>
                    <p class="empty-title">لا توجد سندات صرف</p>
                    <p class="empty-hint">اضغط «سند جديد» أو F11 — مدين المستفيد ← دائن الصندوق أو البنك</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="pv-cards" v-if="isMobile && visiblePayments.length > 0">
            <div v-for="v in visiblePayments" :key="'m' + v.id" class="pv-card">
              <div class="pv-card-row"><label>رقم السند</label><span class="pv-no">{{ v.voucher_no }}</span></div>
              <div class="pv-card-row"><label>التاريخ</label><span>{{ v.date }}</span></div>
              <div class="pv-card-row full"><label>المستفيد / البيان</label><span><b>{{ v.beneficiaryName }}</b><span v-if="v.statement" class="hint-text"> · {{ v.statement }}</span></span></div>
              <div class="pv-card-row"><label>الطريقة</label><span>{{ methodLabel(v.method) }}</span></div>
              <div class="pv-card-row"><label>الخزانة</label><span>{{ treasuryLabel(v) }}</span></div>
              <div class="pv-card-row"><label>المبلغ</label><span class="pv-amt">{{ fmt(v.amount) }} ريال</span></div>
              <div class="pv-card-row"><label>الحالة</label><span><span class="status-dot" :class="v.status || 'posted'"></span><span class="status-name" :class="v.status || 'posted'">{{ statusName(v.status) }}</span></span></div>
              <div class="pv-card-acts">
                <button class="act" @click.stop="openVoucherForEdit(v)">فتح</button>
                <button class="act" title="عرض القيد المحاسبي" @click.stop="viewJournal(v)">📒 اليومية</button>
                <button class="act" title="طباعة" @click.stop="printVoucher(v)">🖨 طباعة</button>
                <button v-if="(v.status || 'draft') === 'posted'" class="act danger" title="إلغاء (عكس القيد المحاسبي)" @click.stop="cancelVoucher(v)">✕ إلغاء</button>
              </div>
            </div>
          </div>
          <div class="pv-cards" v-if="isMobile && visiblePayments.length === 0">
                <div class="pv-card"><div class="pv-card-row full"><span class="empty-icon">💸</span><p class="empty-title">لا توجد سندات صرف</p><p class="empty-hint">اضغط «سند جديد» أو F11 — مدين المستفيد ← دائن الصندوق أو البنك</p></div></div>
          </div>
        </div>
      </div>
    </template>

    <!-- ==========================================================
         شاشة السند — نمط Onyx Pro (كثافة مكتبية)
         ========================================================== -->
    <template v-else>
      <div class="ox-layout">
        <!-- 1. شريط عنوان السند -->
        <div class="ox-titlebar">
          <span class="ox-title">سند صرف</span>
          <span class="status-name" :class="editStatusClass">{{ editStatusName }}</span>
          <span class="ox-title-sep" v-if="form.voucher_no">· {{ form.voucher_no }}</span>
          <div class="topbar-center">
            <button class="tb-btn" @click="openJournalModal" title="عرض القيد المحاسبي">📒 اليومية</button>
            <button class="tb-btn" @click="printVoucher()" :disabled="!form.id" title="طباعة">🖨 طباعة</button>
          </div>
        </div>

        <!-- 2. الصف الأول: رقم السند | التاريخ | الوقت | الفرع | الخزانة | طريقة الصرف -->
        <div class="ox-head">
          <div class="ox-field"><label>رقم السند</label><input class="ox-inp" :value="docNoDisplay" readonly tabindex="-1"/></div>
          <div class="ox-field"><label>التاريخ</label>
            <div class="ox-date-row">
              <input type="date" class="ox-date-hidden" v-model="form.date" aria-label="تاريخ السند" />
              <input class="ox-inp" :value="dateLabel" readonly tabindex="-1" />
            </div>
          </div>
          <div class="ox-field"><label>الوقت</label><input class="ox-inp" :value="currentTime" readonly tabindex="-1"/></div>
          <div class="ox-field"><label>الفرع</label><select class="ox-inp" v-model.number="form.branchId"><option :value="1">الفرع الرئيسي</option></select></div>
          <div class="ox-field"><label>الخزانة</label>
            <select class="ox-inp" v-model="form.treasury">
              <option value="cash">الصندوق الرئيسي (1-1-1)</option>
              <option value="bank">البنك — حساب جاري (1-1-2)</option>
            </select>
          </div>
          <div class="ox-field"><label>طريقة الصرف</label>
            <select class="ox-inp" v-model="form.method">
              <option value="cash">نقداً</option>
              <option value="bank">بنكي (تحويل)</option>
              <option value="check">شيك</option>
            </select>
          </div>
        </div>

        <!-- 3. الصف الثاني: المستفيد (بحث فوري F9) | العملة | سعر التحويل | مركز التكلفة | المستخدم -->
        <div class="ox-head2">
          <div class="ox-field ox-field-focus">
            <label>المستفيد (من حـ/) * — F9</label>
            <div class="ox-cust-row">
              <input class="ox-inp ox-cust-inp" v-model="beneficiarySearch" placeholder="بحث: مورد أو حساب مصروف..."
                     ref="beneficiaryInput"
                     @input="onBeneficiarySearch" @focus="openBeneficiaryDropdown"
                     @keydown.enter.prevent="selectBeneficiaryBySearch"
                     @keydown.arrow-down.prevent="benNav(1)" @keydown.arrow-up.prevent="benNav(-1)"
                     @keydown.escape.prevent="closeDropdowns" @blur="onBeneficiaryBlur" />
              <button class="btn-plus" @click="openExpenseTypeModal" title="مصروف تشغيلي">+</button>
              <div class="dd" v-if="beneficiaryDropdownOpen && beneficiaryDropdownList.length">
                <div v-for="(b, bi) in beneficiaryDropdownList" :key="b.key" class="dd-item" :class="{ 'dd-active': bi === benIndex }"
                     @mousedown.prevent="selectFoundBeneficiary(b)">
                  <span class="dd-n">{{ b.label }}</span>
                  <span class="dd-code">{{ b.kind === 'supplier' ? 'مورد' : 'مصروف' }}</span>
                  <span class="dd-meta" v-if="b.kind === 'supplier'">عليه {{ fmt(b.balance) }}</span>
                </div>
              </div>
              <div class="dd" v-else-if="beneficiaryDropdownOpen && beneficiarySearch.trim() && !beneficiaryDropdownList.length">
                <div class="dd-nor">F9 — لا يوجد «{{ beneficiarySearch.trim() }}»</div>
              </div>
            </div>
          </div>
          <div class="ox-field"><label>العملة</label><select class="ox-inp" v-model="form.currency"><option value="YER">YER — ريال</option></select></div>
          <div class="ox-field"><label>سعر التحويل</label><input class="ox-inp" :value="form.exchangeRate || 1" readonly tabindex="-1" title="عملة محلية"/></div>
          <div class="ox-field"><label>مركز التكلفة</label><input class="ox-inp" v-model="form.costCenter" placeholder="مركز تكلفة..."/></div>
          <div class="ox-field"><label>المستخدم</label><input class="ox-inp" :value="currentUserName" readonly tabindex="-1"/></div>
        </div>

        <!-- 4. حقول الشيك (تظهر عند طريقة الصرف = شيك) -->
        <div class="ox-head" v-if="form.method === 'check'">
          <div class="ox-field"><label>رقم الشيك (F9)</label><input class="ox-inp" v-model="form.checkNo" placeholder="اضغط F9" @keydown="onCheckKeydown"/></div>
          <div class="ox-field"><label>تاريخ الاستحقاق</label><input type="date" class="ox-inp" v-model="form.checkDueDate"/></div>
          <div class="ox-field"><label>حالة الشيك</label><input class="ox-inp" :value="checkStatusName" readonly tabindex="-1"/></div>
          <div class="ox-field"><label>البنك</label><input class="ox-inp" :value="form.checkBank || '—'" placeholder="اسم البنك"/></div>
          <div class="ox-field"></div>
          <div class="ox-field"></div>
        </div>

        <!-- 5. حقل البيان + المستلم -->
        <div class="ox-itembar">
          <div class="ox-field ox-statement-field">
            <label>البيان</label>
            <input class="ox-search-input" v-model="form.statement" placeholder="اكتب بيان الصرف... (F3 في بيان السطر = تكرار بيان الرأس)" />
          </div>
          <div class="ox-field" style="flex:1">
            <label>المستلم</label>
            <input class="ox-inp" v-model="form.recipient" placeholder="من استلم المبلغ" style="min-height:32px"/>
          </div>
        </div>

        <!-- 6. جدول تفاصيل السند (البنود المدينة) -->
        <div class="ox-lines" style="flex:1">
          <table class="ox-table">
            <thead>
              <tr>
                <th style="width:38px">#</th>
                <th style="width:26%">الحساب المدين (F9)</th>
                <th>الحساب التحليلي</th>
                <th style="width:24%">البيان</th>
                <th style="width:110px">المبلغ</th>
                <th style="width:42px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(line, li) in form.lines" :key="li" :class="{ 'ox-row-active': activeLine === li }" @click="activeLine = li">
                <td class="num-cell">{{ li + 1 }}</td>
                <td>
                  <span v-if="line.kind === 'supplier'" class="cell-item-name">ذمم الموردين (2-1-1)</span>
                  <span v-else class="cell-item-name">{{ line.expenseName }} ({{ line.expenseCode }})</span>
                  <span v-if="line.kind === 'supplier'" class="dd-meta">· {{ supplierOf(line.supplierId)?.name }}</span>
                </td>
                <td>{{ line.detailName }}</td>
                <td>
                  <input class="ox-line-statement" v-model="line.statement" placeholder="F3 = بيان الرأس"
                         @keydown.f3.prevent="copyHeaderStatement(li)" />
                </td>
                <td class="num-cell"><input type="number" class="ox-qty" v-model.number="line.amount" min="0" step="0.01" @input="recompute"/></td>
                <td><button class="delete-btn-sm" @click="removeLine(li)" title="حذف السطر">🗑</button></td>
              </tr>
              <!-- صف الإضافة -->
              <tr>
                <td class="num-cell">+</td>
                <td>
                  <input class="ox-inp" v-model="addSearch" placeholder="F9 — اختر حسابًا مدينًا..."
                         @input="onAddSearch" @focus="openAddDropdown"
                         @keydown.enter.prevent="addFoundBeneficiary"
                         @keydown.arrow-down.prevent="addNav(1)" @keydown.arrow-up.prevent="addNav(-1)"
                         @keydown.escape.prevent="closeAddDropdown" @blur="closeAddDropdown" />
                  <div class="dd dd-bottom" v-if="addDropdownOpen && addDropdownList.length">
                    <div v-for="(b, ai) in addDropdownList" :key="b.key" class="dd-item" :class="{ 'dd-active': ai === addIndex }"
                         @mousedown.prevent="addFoundByIndex(ai)">
                      <span class="dd-n">{{ b.label }}</span>
                      <span class="dd-code">{{ b.kind === 'supplier' ? 'مورد' : 'مصروف' }}</span>
                    </div>
                  </div>
                </td>
                <td class="hint-text">اختر المستفيد أولًا ثم أضف السطر</td>
                <td></td>
                <td class="num-cell"><input type="number" class="ox-qty" v-model.number="addAmount" min="0" step="0.01" placeholder="0.00"/></td>
                <td><button class="btn-plus" @click="addLine" title="إضافة السطر (Enter)">+</button></td>
              </tr>
            </tbody>
          </table>
          <!-- بطاقات الصفوف على الجوال -->
          <div class="ox-lines-mobile">
            <div v-for="(line, li) in form.lines" :key="'c' + li" class="ox-line-card">
              <div class="ox-line-card-top">
                <span class="ox-line-item">{{ li + 1 }}. {{ line.kind === 'supplier' ? 'ذمم الموردين — ' + supplierOf(line.supplierId)?.name : line.expenseName }}</span>
                <button class="delete-btn-sm" @click="removeLine(li)">🗑</button>
              </div>
              <div class="ox-line-grid">
                <div class="ox-line-cell"><label>البيان</label><input class="ox-inp" v-model="line.statement" style="min-height:26px" @keydown.f3.prevent="copyHeaderStatement(li)"/></div>
                <div class="ox-line-cell"><label>المبلغ</label><input type="number" class="ox-inp" v-model.number="line.amount" style="min-height:26px" @input="recompute"/></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 7. شريط الفارق (الشرط الذهبي: الفارق = 0) -->
        <div class="ox-summary">
          <div class="ox-sum-item"><span class="ox-sum-lbl">إجمالي التفاصيل</span><span class="ox-sum-val">{{ fmt(detailTotal) }}</span></div>
          <div class="ox-sum-item"><span class="ox-sum-lbl">مبلغ الرأس</span><span class="ox-sum-val">{{ fmt(form.amount || 0) }}</span></div>
          <div class="ox-sum-item ox-sum-net" :class="diffClass">
            <span class="ox-sum-lbl">الفارق</span><span class="ox-sum-val">{{ fmt(difference) }}</span>
          </div>
          <div class="ox-sum-item"><span class="ox-sum-lbl">عدد البنود</span><span class="ox-sum-val">{{ form.lines.length }}</span></div>
          <div class="ox-sum-item" v-if="form.beneficiaryKind === 'supplier'"><span class="ox-sum-lbl">رصيد المورد الدائن</span><span class="ox-sum-val">{{ fmt(remainingCredit) }}</span></div>
          <div class="ox-sum-item" v-if="form.beneficiaryKind === 'supplier'"><span class="ox-sum-lbl">الرصيد بعد السند</span><span class="ox-sum-val">{{ fmt(creditAfter) }}</span></div>
        </div>
        <!-- حقل مبلغ الرأس -->
        <div class="ox-head ox-amount-row">
          <div class="ox-field ox-amount-field">
            <label>مبلغ السند (الرأس) * — F7 للرصيد</label>
            <input type="number" class="ox-inp ox-inp-strong" v-model.number="form.amount" min="0" step="0.01"
                   placeholder="أدخل المبلغ الإجمالي..." ref="amountInput"
                   @keydown.f7.prevent="showSupplierBalance" @input="recompute" />
          </div>
          <div class="ox-field ox-amount-btns">
            <button class="tb-btn tb-light" @click="autoSplit">⚖ توزيع متساوٍ</button>
            <button class="tb-btn tb-light" @click="autoFill" :disabled="!form.amount">◀ تعبئة من الرأس</button>
          </div>
        </div>

        <!-- 8. شريط الأوامر السفلي الواحد -->
        <div class="ox-cmdbar">
          <button class="cm-btn" @click="openNewVoucher" title="F11">➕ جديد</button>
          <button class="cm-btn" @click="saveDraft" :disabled="saving" title="F2">💾 حفظ مسودة</button>
          <button class="cm-btn primary" @click="save" :disabled="saving" title="F10">✔ ترحيل (F10)</button>
          <button class="cm-btn" @click="printVoucher()" :disabled="!form.id">🖨 طباعة</button>
          <button class="cm-btn" @click="openJournalModal" :disabled="!form.id">📒 القيد</button>
          <button class="cm-btn danger" @click="closeWindow">✕ إلغاء</button>
        </div>
      </div>

      <!-- رسائل الحالة -->
      <div v-if="formError" class="form-msg form-msg-error">{{ formError }}</div>
      <div v-if="formStatusMsg" class="form-msg" :class="formStatusClass === 'cmd-error' ? 'form-msg-error' : 'form-msg-ok'">{{ formStatusMsg }}</div>
    </template>

    <!-- ==========================================================
         نوافذ عامة (خارج listMode/v-else لتعمل من السجل والنموذج)
         ========================================================== -->
    <!-- نافذة عرض القيد المحاسبي (اليومية) -->
    <div v-if="journalModalOpen" class="form-modal-overlay" @click.self="journalModalOpen = false">
      <div class="mini-form wide">
        <div class="mini-form-title"><span>📒 القيد المحاسبي — سند صرف {{ form.voucher_no }}</span><button class="close-btn" @click="journalModalOpen = false">✕</button></div>
        <div class="mini-field" style="max-height:340px; overflow:auto">
          <div v-if="journalEntry">
            <p class="hint-text">رقم القيد: {{ journalEntry.entry_no || '#' + journalEntry.id }} · التاريخ: {{ journalEntry.date }}</p>
            <table class="bolt-table">
              <thead><tr><th>الحساب</th><th>مدين</th><th>دائن</th></tr></thead>
              <tbody>
                <tr v-for="l in journalLines" :key="l.id">
                  <td>{{ acctName(l.accountId) }}</td>
                  <td class="num-cell"><b>{{ l.debit ? fmt(l.debit) : '—' }}</b></td>
                  <td class="num-cell"><b>{{ l.credit ? fmt(l.credit) : '—' }}</b></td>
                </tr>
              </tbody>
            </table>
            <p class="hint-text">قيد مزدوج متوازن — يُرحَّل إلى اليومية العامة تلقائيًا عند ترحيل السند.</p>
          </div>
          <div v-else class="hint-text">لا يوجد قيد بعد — ارحّل السند أولًا (F10).</div>
        </div>
      </div>
    </div>

    <!-- مودال تأكيد الإلغاء -->
    <div v-if="pendingCancel" class="form-modal-overlay" @click.self="rejectCancel">
      <div class="mini-form">
        <div class="mini-form-title"><span>⚠ تأكيد الإلغاء</span><button class="close-btn" @click="rejectCancel">✕</button></div>
        <div class="mini-field">
          <p style="margin:8px 0;line-height:1.7">{{ cancelModalText }}</p>
          <div style="display:flex;gap:10px;justify-content:center;margin-top:14px">
            <button class="cm-btn danger" @click="confirmCancel">نعم، إلغاء</button>
            <button class="cm-btn" @click="rejectCancel">إلغاء الإجراء</button>
          </div>
        </div>
      </div>
    </div>

    <!-- نافذة اختيار حساب مصروف (زر +) -->
    <div v-if="expenseModalOpen" class="form-modal-overlay" @click.self="expenseModalOpen = false">
      <div class="mini-form">
        <div class="mini-form-title"><span>اختيار حساب مصروف</span><button class="close-btn" @click="expenseModalOpen = false">✕</button></div>
        <div class="mini-field">
          <select class="ox-inp" v-model.number="pickedExpenseId">
            <option :value="null">— اختر حسابًا —</option>
            <option v-for="a in expenseAccounts" :key="a.id" :value="a.id">{{ a.name }} ({{ a.code }})</option>
          </select>
        </div>
        <div class="mini-actions">
          <button class="tb-btn" @click="expenseModalOpen = false">إلغاء</button>
          <button class="tb-btn primary" @click="addExpenseLine" :disabled="pickedExpenseId == null">إضافة للسند</button>
        </div>
      </div>
    </div>

    <!-- تنبيه الرصيد (F7) -->
    <div v-if="balanceToast" class="balance-toast" :class="balanceToast.ok ? 'toast-ok' : 'toast-err'">
      {{ balanceToast.text }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, provide, inject } from 'vue'
import { db, activeSuppliers, getStorageMode, sysAccountsList, audit } from '../../db/database.js'
import { fmt, sysAccounts } from '../../db/engine.js'
import { requirePermission, currentSession } from '../../db/session.js'
import { serverPostSupplierPayment } from '../../db/serverOps.js'

/* ---------- الحالة العامة ---------- */
const listMode = ref(true)
const payments = ref([])
/* عرض الجوال: يتحكم بإظهار بطاقات السجل بدل الجدول العريض */
const windowW = ref(window.innerWidth)
let __rwTimer = null
const onWinResize = () => { clearTimeout(__rwTimer); __rwTimer = setTimeout(() => { windowW.value = window.innerWidth }, 80) }
const isMobile = computed(() => windowW.value <= 768)
const suppliers = ref([])
const saving = ref(false)
const formError = ref('')
const formStatusMsg = ref('')
const formStatusClass = ref('')
const searchText = ref('')
const listFilter = ref('')
const listMethod = ref('')
const selectedRow = ref(null)
const currentUserName = ref('—')
const activeLine = ref(0)
const amountInput = ref(null)
const screenRoot = ref(null)
const serverSupplierCredits = ref({})

/* ---------- نموذج السند ---------- */
const initialForm = () => ({
  id: null, voucher_no: null, date: new Date().toISOString().slice(0, 10),
  branchId: 1, treasury: 'cash', method: 'cash', currency: 'YER', exchangeRate: 1,
  beneficiaryId: null, beneficiaryName: '', beneficiaryKind: '',
  checkNo: '', checkDueDate: '', checkBank: '', costCenter: '',
  statement: '', recipient: '', amount: 0, notes: '',
  status: 'draft', lines: [], createdAt: Date.now(),
})
const form = ref(initialForm())

/* ---------- بحث المستفيد (F9) ---------- */
const beneficiarySearch = ref('')
const beneficiaryDropdownOpen = ref(false)
const beneficiaryDropdownList = ref([])
const benIndex = ref(0)
const beneficiaryInput = ref(null)

/* ---------- البحث في صف الإضافة ---------- */
const addSearch = ref('')
const addDropdownOpen = ref(false)
const addDropdownList = ref([])
const addIndex = ref(0)
const addAmount = ref(0)

/* ---------- أدوات ---------- */
const propsDef = defineProps({ windowId: { type: [String, Number], default: null }, active: { type: Boolean, default: false } })
provide('docActive', () => propsDef.active)
const getActive = inject('docActive', () => propsDef.active)
const emit = defineEmits(['window-close'])

function isServer() { return getStorageMode() === 'server' }
function supplierOf(id) { return suppliers.value.find(s => s.id === id) }
function supplierName(id) {
  if (id === -1 || id <= 0) return 'مصاريف تشغيلية'
  return suppliers.value.find(s => s.id === id)?.name || '—'
}
function methodLabel(m) { return { cash: 'نقداً', bank: 'بنكي', check: 'شيك' }[m] || m }
function treasuryLabel(v) { return v.method === 'check' ? 'دفتر شيكات' : (v.method === 'bank' ? 'البنك' : 'الصندوق الرئيسي') }
function statusName(s) { return { posted: 'مرحّل', draft: 'معلّق', cancelled: 'ملغى' }[s || 'draft'] }
const totalAmount = computed(() => payments.value.filter(v => (v.status || 'draft') !== 'cancelled').reduce((s, v) => s + (v.amount || 0), 0))

/* ---------- حساب رصيد المورد الدائن ---------- */
async function supplierCredit(id) {
  if (id <= 0) return 0
  if (isServer()) return serverSupplierCredits.value[id] || 0
  const invoices = await db.purchaseInvoices.where('supplierId').equals(id).and(i => i.paymentType === 'credit').toArray()
  const paid = payments.value.filter(p => p.beneficiaryId === id && (p.status || 'draft') !== 'cancelled').reduce((s, p) => s + (p.amount || 0), 0)
  return Math.max(0, invoices.reduce((s, i) => s + (i.total || 0), 0) - paid)
}

/* ---------- حسابات المصاريف ---------- */
const expenseAccounts = ref([])
async function loadExpenseAccounts() {
  try {
    allSysAccounts.value = await sysAccountsList()
    expenseAccounts.value = allSysAccounts.value.filter(a => a.type === 'Expense' && a.active)
  } catch { expenseAccounts.value = [] }
}
const pickedExpenseId = ref(null)

/* ---------- القيد ---------- */
const journalModalOpen = ref(false)
const pendingCancel = ref(null)
const cancelModalText = ref('')
const journalEntry = ref(null)
const journalLines = ref([])
const expenseModalOpen = ref(false)
const balanceToast = ref(null)

const allSysAccounts = ref([])
async function loadAllSysAccounts() {
  try { allSysAccounts.value = await sysAccountsList() } catch { allSysAccounts.value = [] }
}
function acctName(id) {
  const a = allSysAccounts.value.find(x => x.id === id)
  if (a) return `${a.name} (${a.code})`
  const fb = expenseAccounts.value.find(x => x.id === id)
  return fb ? `${fb.name} (${fb.code})` : '—'
}

/* ---------- التاريخ والوقت ---------- */
const dateLabel = computed(() => {
  const d = new Date(form.value.date)
  if (isNaN(d)) return '—'
  const pad = n => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
})
const currentTime = computed(() => {
  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
})

/* ---------- الفارق (الشرط الذهبي) ---------- */
const detailTotal = computed(() => form.value.lines.reduce((s, l) => s + (Number(l.amount) || 0), 0))
const difference = computed(() => (Number(form.value.amount) || 0) - detailTotal.value)
const diffClass = computed(() => Math.abs(difference.value) <= 0.005 ? 'diff-ok' : 'diff-bad')

/* ---------- أرصدة المورد ---------- */
const remainingCredit = computed(() => (form.value.beneficiaryKind === 'supplier' && form.value.beneficiaryId > 0) ? (serverSupplierCredits.value[form.value.beneficiaryId] ?? 0) : 0)
const creditAfter = computed(() => Math.max(0, remainingCredit.value - (Number(form.value.amount) || 0)))

/* ---------- عرض رقم السند ---------- */
const docNoDisplay = computed(() => {
  if (form.value.voucher_no) return form.value.voucher_no
  const y = new Date(form.value.date).getFullYear().toString().slice(-2)
  return form.value.id ? `PAY-${y}-${String(form.value.id).padStart(6, '0')}` : `PAY-${y}-******`
})

const editStatusName = computed(() => ({ draft: 'مسودة', posted: 'مرحّل', cancelled: 'ملغى' }[form.value.status || 'draft']))
const editStatusClass = computed(() => ({ draft: 'pay-partial', posted: 'pay-ok', cancelled: 'pay-credit' }[form.value.status || 'draft']))

/* ---------- الشيك ---------- */
const checkStatusName = computed(() => form.value.method === 'check' ? (form.value.checkNo ? 'صادر' : 'لم يُحدد') : '—')
function onCheckKeydown(e) { if (e.key === 'F9') { e.preventDefault(); fillNextCheckNo() } }
function fillNextCheckNo() {
  const n = payments.value.filter(v => v.method === 'check' && (v.status || 'draft') !== 'cancelled').length + 1
  form.value.checkNo = 'CHQ-' + String(n).padStart(5, '0')
  flash(`تم اقتراح رقم الشيك: ${form.value.checkNo} — أدخل تاريخ الاستحقاق واسم البنك`, 'cmd-hint')
}

/* ---------- التحميل ---------- */
async function loadData() {
  suppliers.value = await activeSuppliers()
  await loadExpenseAccounts()
  if (isServer()) {
    try {
      const { apiFetch } = await import('../../db/api.js')
      const p = await apiFetch('/supplier-payments', { fallback: [] })
      payments.value = (Array.isArray(p) ? p : []).map(v => ({
        ...v,
        voucher_no: v.voucher_no || `PAY-${v.id}`,
        beneficiaryId: v.operation_type === 'expense' ? -1 : (v.supplier_id || null),
        beneficiaryKind: v.operation_type === 'expense' ? 'expense' : 'supplier',
        beneficiaryName: v.operation_type === 'expense' ? 'مصاريف تشغيلية' : supplierName(v.supplier_id),
        date: String(v.payment_date || v.date || '').slice(0, 10),
        branchId: v.branch_id || 1,
        lines: v.lines || [],
      }))
      serverSupplierCredits.value = {}
      for (const s of suppliers.value) {
        try {
          const bal = await apiFetch('/suppliers/' + s.id + '/balance')
          serverSupplierCredits.value[s.id] = bal?.balance || 0
        } catch { serverSupplierCredits.value[s.id] = 0 }
      }
      const s = await currentSession()
      currentUserName.value = s?.userName || '—'
      return
    } catch (e) { formError.value = 'فشل تحميل البيانات: ' + (e.message || e); return }
  }
  payments.value = await db.supplierPayments.toArray()
  const s = await currentSession()
  currentUserName.value = s?.userName || '—'
}

function flash(msg, cls) { formStatusMsg.value = msg; formStatusClass.value = cls; setTimeout(() => { if (formStatusMsg.value === msg) formStatusMsg.value = '' }, 4000) }

/* ---------- القوائم ---------- */
const visiblePayments = computed(() => {
  const term = searchText.value.trim().toLowerCase()
  return [...payments.value].filter(v => {
    if (listFilter.value && (v.status || 'draft') !== listFilter.value) return false
    if (listMethod.value && v.method !== listMethod.value) return false
    if (term && !(v.beneficiaryName || '').toLowerCase().includes(term) && !String(v.voucher_no || '').includes(term) && !String(v.id).includes(term)) return false
    return true
  }).sort((a, b) => b.id - a.id)
})

/* ---------- فتح / جديد / إغلاق ---------- */
function openNewVoucher() {
  formError.value = ''
  flash('')
  form.value = initialForm()
  activeLine.value = 0
  beneficiarySearch.value = ''
  addSearch.value = ''
  addAmount.value = 0
  listMode.value = false
  journalEntry.value = null
  journalLines.value = []
  journalModalOpen.value = false
  nextTickFocus()
}
function nextTickFocus() {
  setTimeout(() => {
    if (beneficiaryInput.value) beneficiaryInput.value.focus()
    else if (amountInput.value) amountInput.value.focus()
  }, 150)
}

async function openVoucherForEdit(v) {
  if ((v.status || 'draft') === 'posted') {
    flash('السند المرحَّل لا يُعدَّل — ألغه أولًا إذا أردت التغيير', 'cmd-hint')
    return
  }
  if ((v.status || 'draft') === 'cancelled') { flash('السند ملغى ولا يمكن تعديله', 'cmd-hint'); return }
  form.value = { ...v, lines: Array.isArray(v.lines) ? v.lines.map(l => ({ ...l })) : [] }
  beneficiarySearch.value = v.beneficiaryName || ''
  listMode.value = false
  journalEntry.value = null
  journalLines.value = []
  nextTickFocus()
}
function closeForm() { if (!saving.value) listMode.value = true }

async function cancelVoucher(v) {
  pendingCancel.value = v
  cancelModalText.value = `إلغاء سند الصرف ${v.voucher_no}؟ سيتم عكس القيد المحاسبي في اليومية العامة.`
}
async function confirmCancel() {
  const v = pendingCancel.value
  pendingCancel.value = null
  if (!v) return
  try {
    if (isServer()) {
      const { apiFetch } = await import('../../db/api.js')
      await apiFetch('/supplier-payments/' + v.id + '/cancel', { method: 'POST' })
    } else {
      const entry = await db.journalEntries.get(v.journalEntryId)
      if (entry) {
        const lines = await db.journalLines.where('entryId').equals(entry.id).toArray()
        for (const l of lines) await db.journalLines.delete(l.id)
        await db.journalEntries.delete(entry.id)
      }
      await db.supplierPayments.update(v.id, { status: 'cancelled', cancelledAt: Date.now() })
      await audit('payment_voucher_cancelled', 'supplierPayment', v.id, `إلغاء سند الصرف ${v.voucher_no}`)
    }
    await loadData()
    flash('تم إلغاء السند وعكس قيده المحاسبي', 'cmd-hint')
  } catch (e) { flash('فشل الإلغاء: ' + e.message, 'cmd-error') }
}
function rejectCancel() { pendingCancel.value = null }
function closeWindow() { emit('window-close', propsDef.windowId) }

/* ---------- بحث المستفيد F9 ---------- */
async function buildBeneficiaryList(term) {
  const t = (term || '').trim().toLowerCase()
  const result = []
  for (const s of suppliers.value) {
    const bal = serverSupplierCredits.value[s.id] ?? (await supplierCredit(s.id))
    if (!serverSupplierCredits.value[s.id] && !isServer()) serverSupplierCredits.value[s.id] = bal
    if (!t || s.name.toLowerCase().includes(t) || String(s.id).includes(t)) {
      result.push({ key: 'sup-' + s.id, kind: 'supplier', id: s.id, label: s.name, balance: bal })
    }
  }
  for (const a of expenseAccounts.value) {
    if (!t || a.name.toLowerCase().includes(t) || a.code.includes(t)) {
      result.push({ key: 'exp-' + a.id, kind: 'expense', id: a.id, label: `${a.name} (${a.code})`, expenseName: a.name, expenseCode: a.code })
    }
  }
  return result
}
function onBeneficiarySearch() { beneficiaryDropdownOpen.value = true; benIndex.value = 0; refreshBeneficiaryDropdown() }
function openBeneficiaryDropdown() { refreshBeneficiaryDropdown(); beneficiaryDropdownOpen.value = true }
async function refreshBeneficiaryDropdown() { beneficiaryDropdownList.value = await buildBeneficiaryList(beneficiarySearch.value) }
function benNav(dir) { if (!beneficiaryDropdownOpen.value || !beneficiaryDropdownList.value.length) return; benIndex.value = Math.max(0, Math.min(beneficiaryDropdownList.value.length - 1, benIndex.value + dir)) }
function selectFoundBeneficiary(b) { beneficiarySearch.value = b.label; beneficiaryDropdownOpen.value = false; applyBeneficiary(b) }
async function selectBeneficiaryBySearch() {
  /* تحميل القائمة إن كانت فارغة (في حال ضغط Enter قبل اكتمال التحميل) */
  if (!beneficiaryDropdownList.value.length && beneficiarySearch.value.trim()) {
    await refreshBeneficiaryDropdown()
  }
  const b = beneficiaryDropdownList.value[benIndex.value] || beneficiaryDropdownList.value[0]
  if (b) { beneficiarySearch.value = b.label; beneficiaryDropdownOpen.value = false; applyBeneficiary(b) }
  else { beneficiaryDropdownOpen.value = false }
}
function onBeneficiaryBlur() { setTimeout(() => { beneficiaryDropdownOpen.value = false }, 180) }
function applyBeneficiary(b) {
  if (b.kind === 'supplier') {
    form.value.beneficiaryId = b.id
    form.value.beneficiaryName = b.label
    form.value.beneficiaryKind = 'supplier'
  } else {
    form.value.beneficiaryId = -b.id
    form.value.beneficiaryName = b.expenseName
    form.value.beneficiaryKind = 'expense'
  }
  if (form.value.lines.length === 0) {
    form.value.lines.push({
      kind: b.kind,
      supplierId: b.kind === 'supplier' ? b.id : null,
      expenseId: b.kind === 'expense' ? b.id : null,
      expenseName: b.expenseName || '',
      expenseCode: b.expenseCode || '',
      detailName: '',
      statement: form.value.statement,
      amount: Number(form.value.amount) || 0,
    })
  }
  recompute()
}
function closeDropdowns() { beneficiaryDropdownOpen.value = false; addDropdownOpen.value = false }

/* ---------- البحث في صف الإضافة ---------- */
function onAddSearch() { addDropdownOpen.value = true; addIndex.value = 0; refreshAddDropdown() }
function openAddDropdown() { refreshAddDropdown(); addDropdownOpen.value = true }
async function refreshAddDropdown() { addDropdownList.value = await buildBeneficiaryList(addSearch.value) }
function addNav(dir) { if (!addDropdownOpen.value || !addDropdownList.value.length) return; addIndex.value = Math.max(0, Math.min(addDropdownList.value.length - 1, addIndex.value + dir)) }
function addFoundBeneficiary() { const b = addDropdownList.value[addIndex.value] || addDropdownList.value[0]; if (b) addLineFrom(b); closeAddDropdown() }
function addFoundByIndex(i) { const b = addDropdownList.value[i]; if (b) addLineFrom(b); closeAddDropdown() }
function closeAddDropdown() { setTimeout(() => { addDropdownOpen.value = false }, 150) }
function addLineFrom(b) {
  form.value.lines.push({
    kind: b.kind,
    supplierId: b.kind === 'supplier' ? b.id : null,
    expenseId: b.kind === 'expense' ? b.id : null,
    expenseName: b.expenseName || '',
    expenseCode: b.expenseCode || '',
    detailName: '',
    statement: form.value.statement,
    amount: Number(addAmount.value) || 0,
  })
  addSearch.value = ''; addAmount.value = 0
  recompute()
}
function addLine() {
  if (form.value.beneficiaryKind === 'supplier') addLineFrom({ kind: 'supplier', id: form.value.beneficiaryId, label: form.value.beneficiaryName })
  else if (form.value.beneficiaryKind === 'expense') addLineFrom({ kind: 'expense', id: -form.value.beneficiaryId, expenseName: form.value.beneficiaryName })
  else flash('اختر المستفيد أولًا (F9) ثم أضف السطر', 'cmd-hint')
}
function removeLine(li) { form.value.lines.splice(li, 1); recompute() }
function copyHeaderStatement(li) { form.value.lines[li].statement = form.value.statement }
function recompute() { /* تحديث فوري للفارق عبر الـcomputed */ }

/* ---------- التوزيع والتعبئة ---------- */
function autoFill() {
  if (!form.value.amount || form.value.lines.length === 0) return
  form.value.lines[0].amount = Number(form.value.amount)
  for (let i = 1; i < form.value.lines.length; i++) form.value.lines[i].amount = 0
  recompute()
}
/* عند كتابة مبلغ الرأس ووجود سطر واحد فقط، يُعبَّأ تلقائيًا في السطر (تزامن فوري) */
watch(() => Number(form.value.amount), v => {
  if (form.value.lines.length === 1 && form.value.lines[0].amount !== v) {
    form.value.lines[0].amount = v
  }
})
function autoSplit() {
  if (form.value.lines.length === 0 || !form.value.amount) return
  const n = form.value.lines.length
  const each = Math.floor((Number(form.value.amount) * 100) / n) / 100
  form.value.lines.forEach((l, i) => { l.amount = i === n - 1 ? (Number(form.value.amount) - each * (n - 1)) : each })
  recompute()
}

/* ---------- نافذة المصاريف ---------- */
function openExpenseTypeModal() { expenseModalOpen.value = true; pickedExpenseId.value = null }
function addExpenseLine() {
  const a = expenseAccounts.value.find(x => x.id === pickedExpenseId.value)
  if (!a) return
  form.value.beneficiaryId = -a.id
  form.value.beneficiaryName = a.name
  form.value.beneficiaryKind = 'expense'
  beneficiarySearch.value = `${a.name} (${a.code})`
  form.value.lines.push({
    kind: 'expense', supplierId: null, expenseId: a.id,
    expenseName: a.name, expenseCode: a.code, detailName: '',
    statement: form.value.statement, amount: Number(form.value.amount) || 0,
  })
  expenseModalOpen.value = false
  recompute()
}

/* ---------- عرض القيد ---------- */
function openJournalModal() { journalModalOpen.value = true; loadJournalOf(form.value) }
function viewJournal(v) {
  if (v && v.id) { form.value = { ...v, lines: Array.isArray(v.lines) ? v.lines.map(l => ({ ...l })) : [] } }
  journalModalOpen.value = true
  loadJournalOf(form.value)
}
async function loadJournalOf(v) {
  journalEntry.value = null; journalLines.value = []
  if (!v || !v.journalEntryId) return
  if (isServer()) {
    try {
      const { apiFetch } = await import('../../db/api.js')
      const all = await apiFetch('/journals')
      const entry = (Array.isArray(all) ? all : []).find(e => e.id === v.journalEntryId)
      if (entry) {
        journalEntry.value = entry
        const lines = await apiFetch('/journals-lines')
        journalLines.value = (Array.isArray(lines) ? lines : []).filter(l => l.entryId === entry.id)
        if (journalLines.value.length === 0 && entry.lines) journalLines.value = entry.lines
      }
    } catch { /* تجاهل */ }
  } else {
    const entry = await db.journalEntries.get(v.journalEntryId)
    if (entry) {
      journalEntry.value = entry
      journalLines.value = await db.journalLines.where('entryId').equals(entry.id).toArray()
    }
  }
}

/* ---------- رصيد المستفيد F7 ---------- */
function showSupplierBalance() {
  if (form.value.beneficiaryKind !== 'supplier' || !form.value.beneficiaryId) {
    balanceToast.value = { ok: false, text: 'F7: اختر مستفيدًا (موردًا) أولًا لعرض رصيده' }
    setTimeout(() => { balanceToast.value = null }, 3000)
    return
  }
  const c = remainingCredit.value
  balanceToast.value = { ok: true, text: `رصيد ${form.value.beneficiaryName} الدائن: ${fmt(c)} ريال — بعد السند: ${fmt(creditAfter.value)} ريال` }
  setTimeout(() => { balanceToast.value = null }, 3500)
}

/* ---------- الطباعة ---------- */
async function printVoucher(v) {
  const data = v || form.value
  if (!data) return
  const w = window.open('', '_blank')
  if (!w) { flash('افتح النوافذ المنبثقة للطباعة', 'cmd-error'); return }
  const rows = (Array.isArray(data.lines) ? data.lines : []).map(l => {
    const name = l.kind === 'supplier' ? `ذمم الموردين — ${supplierName(l.supplierId)}` : `${l.expenseName || '—'} (${l.expenseCode || ''})`
    return `<tr><td>${name}</td><td class="num">${l.statement || data.statement || '—'}</td><td class="num">${fmt(l.amount || 0)}</td></tr>`
  }).join('')
  const dt = (Array.isArray(data.lines) ? data.lines : []).reduce((s, l) => s + (Number(l.amount) || 0), 0)
  w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>سند صرف ${data.voucher_no || ''}</title>
    <style>body{font-family:Tahoma,Arial,sans-serif;max-width:660px;margin:24px auto;color:#1d2433}
    .hdr{display:flex;justify-content:space-between;border-bottom:3px double #1e2330;padding-bottom:8px}
    .co{font-weight:800;font-size:15px}table{width:100%;border-collapse:collapse;margin-top:12px}
    th{background:#1e2330;color:#fff;padding:6px 10px;text-align:right;font-size:13px}
    td{border:1px solid #dfe4ec;padding:6px 10px;font-size:13px}.num{text-align:left;direction:ltr;font-weight:700}
    .totals{margin-top:10px;display:flex;justify-content:space-between;font-weight:800;font-size:15px;border-top:2px solid #1e2330;padding-top:8px}
    .sig{margin-top:40px;display:flex;justify-content:space-between;font-size:13px}
    @media print{.noprint{display:none}}</style></head><body>
    <div class="hdr"><div class="co">شرف ERP — سند صرف</div><div>رقم السند: <b>${data.voucher_no || '—'}</b></div></div>
    <p>التاريخ: ${data.date} · الطريقة: ${methodLabel(data.method)} · الخزانة: ${treasuryLabel(data)} · المستلم: ${data.recipient || '—'}${data.checkNo ? ` · الشيك رقم ${data.checkNo}` : ''}${data.checkDueDate ? ` · الاستحقاق: ${data.checkDueDate}` : ''}</p>
    <table><thead><tr><th style="width:40%">الحساب المدين</th><th>البيان</th><th style="width:25%">المبلغ</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="totals"><span>إجمالي التفاصيل: ${fmt(dt)}</span><span>مبلغ الرأس: ${fmt(data.amount || 0)}</span></div>
    <div class="sig"><span>المحرر: ${currentUserName.value}</span><span>المستلم: ......................</span><span>المعتمد: ......................</span></div>
    <p class="noprint" style="margin-top:20px"><button onclick="window.print()">🖨 طباعة</button></p>
    </body></html>`)
  w.document.close()
}

/* ---------- بناء Payload ---------- */
function buildLinesPayload(f) {
  const isExpense = f.beneficiaryKind === 'expense'
  if (f.lines.length === 0) {
    if (isExpense) {
      const a = expenseAccounts.value.find(x => x.id === -f.beneficiaryId)
      return [{ kind: 'expense', expenseId: -f.beneficiaryId, expenseName: a?.name || 'مصاريف تشغيلية', expenseCode: a?.code || '5-2', statement: f.statement, amount: Number(f.amount) || 0 }]
    }
    return [{ kind: 'supplier', supplierId: f.beneficiaryId, statement: f.statement, amount: Number(f.amount) || 0 }]
  }
  return f.lines.map(l => ({
    kind: l.kind || 'supplier', supplierId: l.supplierId ?? (isExpense ? null : f.beneficiaryId),
    expenseId: l.expenseId, expenseName: l.expenseName, expenseCode: l.expenseCode,
    detailName: l.detailName, statement: l.statement || f.statement, amount: Number(l.amount) || 0,
  }))
}

async function validateForm(f) {
  if (f.beneficiaryId == null || !f.beneficiaryName) throw new Error('اختر المستفيد (من حـ/) أولًا — F9 لفتح دليل الحسابات')
  if (!f.amount || f.amount <= 0) throw new Error('أدخل مبلغ السند في الرأس')
  const dt = detailTotalOf(f)
  if (Math.abs(dt - (Number(f.amount) || 0)) > 0.005) throw new Error(`الفارق غير صفري (${fmt(Math.abs((Number(f.amount) || 0) - dt))}): مجموع تفاصيل السند يجب أن يساوي مبلغ الرأس — الشرط الذهبي لسند الصرف`)
  if (f.beneficiaryKind === 'supplier' && f.beneficiaryId > 0) {
    const credit = serverSupplierCredits.value[f.beneficiaryId] ?? (await supplierCredit(f.beneficiaryId))
    if (f.amount > credit + 0.005) throw new Error(`المبلغ أكبر من رصيد المورد الدائن (${fmt(credit)})`)
  }
  if (f.method === 'check' && !f.checkNo.trim()) throw new Error('في الصرف بالشيك: أدخل رقم الشيك — اضغط F9 لاقتراح رقم تلقائي')
}
function detailTotalOf(f) { return (Array.isArray(f.lines) ? f.lines : []).reduce((s, l) => s + (Number(l.amount) || 0), 0) }

/* ---------- الحفظ / الترحيل ---------- */
async function save() {
  saving.value = true
  formError.value = ''
  try {
    await requirePermission('supplier-payments', 'ترحيل سند صرف')
    const f = { ...form.value }
    await validateForm(f)
    const lines = buildLinesPayload(f)
    const isExpense = f.beneficiaryKind === 'expense'

    if (isServer()) {
      // وضع الخادم المركزي: القيد المزدوج يُنشأ على الخادم عبر بوابة ترحيل السندات
      await serverPostSupplierPayment({
        supplierId: isExpense ? null : f.beneficiaryId,
        operationType: isExpense ? 'expense' : 'supplier',
        amount: f.amount, method: f.method, date: f.date, branchId: f.branchId,
        treasury: f.treasury, currency: f.currency, exchangeRate: f.exchangeRate || 1,
        checkNo: f.checkNo || null, checkDueDate: f.checkDueDate || null, checkBank: f.checkBank || null,
        costCenter: f.costCenter || null, statement: f.statement || null, recipient: f.recipient || null,
        notes: f.notes || null, lines, posted: true,
      })
      await audit('payment_voucher_posted', 'supplierPayment', null, `ترحيل سند صرف${f.statement ? ': ' + f.statement : ''}`)
      editingDone()
      flash('تم ترحيل سند الصرف والقيد المحاسبي', 'cmd-hint')
      await loadData()
      return
    }

    const { nextDocNo } = await import('../../db/sequences.js')
    const voucherNo = await nextDocNo('payment', new Date(f.date).getFullYear())
    const id = await db.supplierPayments.add({
      voucher_no: voucherNo,
      supplierId: isExpense ? null : f.beneficiaryId,
      operationType: isExpense ? 'expense' : 'supplier',
      date: f.date, method: f.method, amount: f.amount,
      branchId: f.branchId, treasury: f.treasury, currency: f.currency,
      exchangeRate: f.exchangeRate || 1,
      checkNo: f.checkNo || null, checkDueDate: f.checkDueDate || null, checkBank: f.checkBank || null,
      costCenter: f.costCenter || null, statement: f.statement || null, recipient: f.recipient || null,
      notes: f.notes, status: 'posted', createdAt: Date.now(),
      beneficiaryId: f.beneficiaryId, beneficiaryName: f.beneficiaryName, beneficiaryKind: f.beneficiaryKind,
    })
    // القيد المزدوج الآلي: مدين المستفيد (ذمم الموردين / حساب المصروف) ← دائن الصندوق أو البنك
    const expenseAccountKey = isExpense ? (lines[0]?.expenseCode || '5-2') : null
    const sys = await sysAccounts()
    const creditAccountId = f.method === 'bank' ? sys.bank : sys.cash
    let journalLines
    if (isExpense && expenseAccountKey) {
      const accs = await sysAccountsList()
      const acc = accs.find(a => a.code === expenseAccountKey && a.active)
      if (!acc) throw new Error(`حساب المصاريف ${expenseAccountKey} غير موجود في دليل الحسابات`)
      journalLines = [
        { accountId: acc.id, debit: f.amount, credit: 0 },
        { accountId: creditAccountId, debit: 0, credit: f.amount },
      ]
    } else {
      journalLines = [
        { accountId: sys.payables, debit: f.amount, credit: 0 },
        { accountId: creditAccountId, debit: 0, credit: f.amount },
      ]
    }
    const jeId = await db.journalEntries.add({
      date: f.date,
      description: isExpense ? `سند صرف مصروف — ${voucherNo}${f.statement ? ' · ' + f.statement : ''}` : `سند صرف مورد — ${voucherNo}${f.statement ? ' · ' + f.statement : ''}`,
      refKind: 'supplierPayment', refId: id, posted: true,
      createdAt: Date.now(),
    })
    await db.journalLines.bulkAdd(journalLines.map(l => ({ entryId: jeId, ...l })))
    await db.supplierPayments.update(id, { journalEntryId: jeId, lines })
    await audit('payment_voucher_posted', 'supplierPayment', id, `ترحيل سند الصرف ${voucherNo}${f.statement ? ': ' + f.statement : ''}`)
    editingDone()
    flash('تم ترحيل سند الصرف والقيد المحاسبي (اليومية العامة)', 'cmd-hint')
    await loadData()
  } catch (e) {
    formError.value = e.message
    setTimeout(() => { formError.value = '' }, 6000)
  } finally {
    saving.value = false
  }
}

/* ---------- حفظ مسودة ---------- */
async function saveDraft() {
  try {
    const f = { ...form.value }
    if (!f.beneficiaryId || !f.beneficiaryName) throw new Error('اختر المستفيد أولًا')
    if (!f.amount || f.amount <= 0) throw new Error('أدخل المبلغ')
    const lines = buildLinesPayload(f)
    if (isServer()) {
      await serverPostSupplierPayment({
        supplierId: f.beneficiaryKind === 'expense' ? null : f.beneficiaryId,
        operationType: f.beneficiaryKind === 'expense' ? 'expense' : 'supplier',
        amount: f.amount, method: f.method, date: f.date, branchId: f.branchId,
        treasury: f.treasury, statement: f.statement || null, recipient: f.recipient || null,
        notes: f.notes || null, lines, posted: false,
      })
    } else {
      const { nextDocNo } = await import('../../db/sequences.js')
      const voucherNo = await nextDocNo('payment', new Date(f.date).getFullYear())
      await db.supplierPayments.add({
        voucher_no: voucherNo,
        supplierId: f.beneficiaryKind === 'expense' ? null : f.beneficiaryId,
        operationType: f.beneficiaryKind === 'expense' ? 'expense' : 'supplier',
        date: f.date, method: f.method, amount: f.amount,
        branchId: f.branchId, treasury: f.treasury, currency: f.currency,
        checkNo: f.checkNo || null, checkDueDate: f.checkDueDate || null,
        statement: f.statement || null, recipient: f.recipient || null, notes: f.notes,
        status: 'draft', createdAt: Date.now(),
        beneficiaryId: f.beneficiaryId, beneficiaryName: f.beneficiaryName, beneficiaryKind: f.beneficiaryKind,
        lines,
      })
    }
    editingDone()
    flash('تم حفظ السند كمسودة (معلّق) — لن يؤثر ماليًا حتى الترحيل', 'cmd-hint')
    await loadData()
  } catch (e) { flash('فشل الحفظ: ' + e.message, 'cmd-error') }
}

function editingDone() {
  form.value = initialForm()
  listMode.value = true
  journalModalOpen.value = false
}

/* ---------- اختصارات ---------- */
const onNewDoc = () => { if (getActive()) openNewVoucher() }
function handleKeydown(e) {
  if (!getActive()) return
  if (e.key === 'F11' || e.key === 'F2') { e.preventDefault(); openNewVoucher() }
  if (e.key === 'F5' || e.key === 'F7') { e.preventDefault(); showSupplierBalance() }
  if (e.key === 'F9') { e.preventDefault(); openBeneficiaryDropdown(); refreshBeneficiaryDropdown() }
  if (e.key === 'F10') { e.preventDefault(); if (!listMode.value) save() }
  if (e.key === 'Escape') {
    e.preventDefault()
    if (journalModalOpen.value) journalModalOpen.value = false
    else if (expenseModalOpen.value) expenseModalOpen.value = false
    else if (!listMode.value) closeForm()
  }
  if (e.key === 'F3') { /* F3 يعمل داخل حقل بيان السطر فقط عبر @keydown.f3 */ }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('sharaf-new-doc', onNewDoc)
  window.addEventListener('resize', onWinResize)
  onWinResize()
  loadData()
})
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('sharaf-new-doc', onNewDoc)
  window.removeEventListener('resize', onWinResize)
  clearTimeout(__rwTimer)
})
</script>

<style scoped>
/* ============================================
   سند الصرف — نمط Onyx Pro (كثافة مكتبية / RTL)
   ============================================ */
.ox-screen { display: flex; flex-direction: column; height: 100%; min-height: 0; outline: none; overflow: hidden; }
.ox-layout { display: flex; flex-direction: column; gap: 6px; width: 100%; flex: 1; min-height: 0; height: 100%; overflow-y: auto; padding: 6px; }
.page-screen { padding: 16px; display: flex; flex-direction: column; gap: 10px; height: 100%; min-height: 0; overflow: auto; }
.hint-text { color: #6b7280; font-size: 10.5px; }

/* ---------- شريط القائمة ---------- */
.topbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.topbar-right { display: flex; flex-direction: column; gap: 2px; }
.topbar-title { font-size: 21px; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.2; }
.topbar-status { font-size: 12px; color: #64748b; }
.topbar-center { display: flex; gap: 6px; margin-right: auto; }
.topbar-left { display: flex; gap: 8px; align-items: center; }
.tb-search { display: flex; align-items: center; gap: 6px; height: 32px; padding: 0 10px; background: #fff; border: 1px solid #dfe4ec; border-radius: 6px; }
.tb-search input { border: none; outline: none; font-size: 12.5px; width: 140px; background: transparent; font-family: inherit; }
.tb-search-icon { font-size: 11px; }
.df-small { height: 32px; padding: 0 8px; border: 1px solid #dfe4ec; border-radius: 6px; font-size: 12.5px; background: #fff; font-family: inherit; }
.tb-btn { border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.06); color: #e9ecf3; border-radius: 6px; padding: 4px 10px; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
.tb-btn:hover { background: rgba(255,255,255,.14); }
.tb-btn.primary { background: #1f6feb; border-color: #1f6feb; font-weight: 700; }
.tb-btn.primary:hover { background: #1656b8; }
.tb-btn.tb-light { border: 1px solid #c7ced9; background: #fff; color: #1d2433; }
.tb-btn.tb-light:hover { background: #eef3ff; border-color: #1f6feb; }
.table-card { background: #fff; border: 1px solid #dfe4ec; border-radius: 8px; padding: 8px; flex: 1; min-height: 0; overflow: auto; }
.bolt-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.bolt-table th, .bolt-table td { border: 1px solid #dfe4ec; padding: 6px 10px; text-align: right; }
.bolt-table th { background: #f0f3f8; font-weight: 700; font-size: 12px; }
.bolt-table tbody tr.selected td { background: #eef3ff; }
.bolt-table tbody tr:hover td { background: #f8fafc; }
.link-cell { color: #1f6feb; font-weight: 600; cursor: pointer; }
.num-cell { font-family: Consolas, monospace; font-size: 12.5px; text-align: center; }
.action-cells { white-space: nowrap; }
.act { height: 26px; padding: 0 8px; border: 1px solid #dfe4ec; background: #fff; border-radius: 5px; cursor: pointer; font-size: 11.5px; display: inline-flex; align-items: center; justify-content: center; gap: 3px; white-space: nowrap; margin: 0 1px; }
.act:hover { background: #eef3ff; border-color: #1f6feb; }
.act.danger { color: #b3261e; border-color: #f5c2b8; }
.act.danger:hover { background: #fce8e6; }
.status-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; background: #6b7280; }
.status-name { font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 600; }
.status-name.posted { color: #0a7d3a; background: #e6f4ea; }
.status-name.draft { color: #d97706; background: #fff7e6; }
.status-name.cancelled { color: #b3261e; background: #fce8e6; }
.empty-row td { text-align: center; }
.empty-box { text-align: center; padding: 28px 16px; color: #6b7280; }
.empty-icon { font-size: 28px; opacity: .5; }
.empty-title { font-weight: 700; font-size: 14px; margin-top: 6px; }
.empty-hint { font-size: 12px; margin-top: 4px; }

/* ---------- تخطيط شاشة السند ---------- */
.ox-titlebar { display: flex; align-items: center; gap: 10px; background: #1e2330; color: #e9ecf3; padding: 5px 12px; border-radius: 6px; min-height: 34px; box-shadow: 0 1px 3px rgba(10, 20, 40, .25); }
.ox-title { font-weight: 700; font-size: 13.5px; }
.ox-title-sep { font-size: 12px; color: #b8c1d4; font-family: Consolas, monospace; }
.ox-head { display: grid; grid-template-columns: repeat(6, 1fr); column-gap: 8px; background: #f5f7fa; border: 1px solid #dfe4ec; border-radius: 6px; padding: 6px 10px; align-items: stretch; }
.ox-head2 { display: grid; grid-template-columns: minmax(220px, 2fr) 1fr 1fr 1fr 1fr; column-gap: 8px; background: #f5f7fa; border: 1px solid #dfe4ec; border-radius: 6px; padding: 6px 10px; align-items: stretch; }
.ox-field { display: flex; flex-direction: column; gap: 2px; justify-content: center; }
.ox-field label { font-size: 10.5px; font-weight: 700; color: #5a6472; white-space: nowrap; }
.ox-inp { width: 100%; border: 1px solid #c7ced9; border-radius: 6px; padding: 5px 8px; font-size: 12.5px; background: #fff; color: #1d2433; outline: none; min-height: 26px; box-sizing: border-box; }
.ox-inp:focus { border-color: #1f6feb; box-shadow: 0 0 0 2px rgba(31,111,235,.15); }
.ox-inp-strong { font-weight: 700; background: #eef3ff; font-size: 13.5px; }
.ox-field-focus { position: relative; }
.ox-date-row { position: relative; display: flex; align-items: center; }
.ox-date-row .ox-date-hidden { position: absolute; inset: 0; opacity: 0; width: 100%; cursor: pointer; z-index: 2; }
.ox-date-row .ox-inp[readonly] { text-align: center; }

/* ---------- المستفيد + قائمة منسدلة ---------- */
.ox-cust-row { display: flex; gap: 6px; align-items: center; width: 100%; position: relative; }
.ox-cust-inp { background: #fffbe6 !important; border-color: #f0d98f !important; }
.btn-plus { background: #1f6feb; color: #fff; border: 0; border-radius: 6px; padding: 4px 8px; font-size: 13px; font-weight: 700; cursor: pointer; min-height: 26px; box-sizing: border-box; }
.dd { position: absolute; z-index: 70; top: 100%; left: 0; right: 0; margin-top: 3px; background: #fff; border: 1px solid #c7ced9; border-radius: 6px; box-shadow: 0 6px 20px rgba(20, 30, 50, .18); overflow: hidden; }
.dd-bottom { margin-top: 0; top: calc(100% + 3px); }
.dd-item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; cursor: pointer; border-bottom: 1px solid #f0f2f6; font-size: 12.5px; }
.dd-item:hover, .dd-active { background: #eef3ff; }
.dd-n { flex: 1; font-weight: 600; }
.dd-code { color: #1f6feb; font-family: Consolas, monospace; font-size: 11px; }
.dd-meta { color: #6b7280; font-size: 11px; }
.dd-nor { color: #6b7280; font-size: 11.5px; padding: 6px 10px; }

/* ---------- شريط البيان ---------- */
.ox-itembar { display: flex; gap: 8px; align-items: stretch; background: #f5f7fa; border: 1px solid #dfe4ec; border-radius: 6px; padding: 6px 10px; }
.ox-statement-field { flex: 1.6; }
.ox-search-input { flex: 1; border: 1px solid #1f6feb; border-radius: 6px; padding: 6px 12px; font-size: 13px; font-weight: 700; outline: none; background: #fff; min-height: 32px; box-sizing: border-box; }
.ox-search-input:focus { box-shadow: 0 0 0 2px rgba(31,111,235,.18); }

/* ---------- جدول التفاصيل ---------- */
.ox-lines { flex: 1; min-height: 110px; overflow: auto; border: 1px solid #dfe4ec; border-radius: 6px; background: #fff; }
.ox-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.ox-table th { background: #262c3a; color: #e9ecf3; font-size: 11.5px; font-weight: 600; padding: 5px 8px; text-align: right; border-left: 1px solid rgba(255,255,255,.08); position: sticky; top: 0; z-index: 2; }
.ox-table td { border-bottom: 1px solid #eef1f5; padding: 4px 8px; font-size: 12.5px; }
.ox-row-active { background: #eef3ff !important; }
.ox-line-statement { width: 100%; border: 1px solid transparent; border-radius: 5px; padding: 3px 6px; font-size: 12px; outline: none; background: transparent; box-sizing: border-box; }
.ox-line-statement:focus { border-color: #1f6feb; background: #fff; }
.ox-qty { width: 100%; border: 1px solid #c7ced9; border-radius: 5px; padding: 4px 6px; font-size: 12.5px; text-align: center; outline: none; min-height: 24px; box-sizing: border-box; }
.ox-qty:focus { border-color: #1f6feb; box-shadow: 0 0 0 2px rgba(31,111,235,.15); }
.delete-btn-sm { border: 0; background: none; color: #dc2626; cursor: pointer; font-size: 13px; padding: 2px 6px; }
.cell-item-name { font-weight: 600; }

/* ---------- بطاقات الصفوف على الجوال ---------- */
.ox-lines-mobile { display: none; }

/* ---------- شريط الإجماليات + مبلغ الرأس ---------- */
.ox-summary { display: flex; gap: 6px; align-items: stretch; background: #1e2330; color: #e9ecf3; border-radius: 6px; padding: 6px 12px; flex-wrap: nowrap; }
.ox-sum-item { display: flex; flex-direction: column; gap: 1px; padding: 3px 14px; border-left: 1px solid rgba(255,255,255,.14); flex: 1; align-items: center; justify-content: center; }
.ox-sum-item:last-child { border-left: 0; }
.ox-sum-lbl { font-size: 10px; color: #b8c1d4; font-weight: 600; }
.ox-sum-val { font-size: 13px; font-weight: 700; font-family: Consolas, monospace; color: #fff; }
.ox-sum-net { background: rgba(255,255,255,.07); border-radius: 6px; }
.ox-sum-net.diff-ok .ox-sum-val { color: #7fd4a5; }
.ox-sum-net.diff-bad .ox-sum-val { color: #ffb3a7; }
.ox-amount-row { grid-template-columns: 1fr 1fr; }
.ox-amount-field label { white-space: normal; }
.ox-amount-btns { display: flex; flex-direction: row; align-items: center; gap: 6px; }

/* ---------- شريط الأوامر ---------- */
.ox-cmdbar { display: flex; gap: 6px; align-items: center; justify-content: space-between; background: #262c3a; border-radius: 6px; padding: 6px 10px; min-height: 44px; flex-shrink: 0; margin-top: auto; position: sticky; bottom: 0; }
.cm-btn { border: 1px solid rgba(255,255,255,.22); background: rgba(255,255,255,.08); color: #e9ecf3; border-radius: 6px; padding: 6px 14px; font-size: 12.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; font-weight: 600; }
.cm-btn:hover { background: rgba(255,255,255,.16); }
.cm-btn:disabled { opacity: .5; cursor: not-allowed; }
.cm-btn.primary { background: #0a7d3a; border-color: #0a7d3a; font-weight: 700; }
.cm-btn.primary:hover { background: #096a31; }
.cm-btn.danger { background: #b3261e; border-color: #b3261e; margin-right: auto; }

/* ---------- رسائل ---------- */
.form-msg { font-size: 12px; border-radius: 6px; padding: 4px 10px; margin: 0 6px; }
.form-msg-ok { color: #0a7d3a; background: #e6f4ea; }
.form-msg-error { color: #b3261e; background: #fce8e6; }

/* ---------- النوافذ المنبثقة ---------- */
.form-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 40, .55); display: flex; align-items: center; justify-content: center; z-index: 100; }
.mini-form { background: #fff; border-radius: 10px; width: 420px; max-width: 94vw; box-shadow: 0 12px 40px rgba(10,20,40,.3); }
.mini-form.wide { width: 540px; }
.mini-form-title { background: #1e2330; color: #e9ecf3; padding: 8px 14px; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: space-between; border-radius: 10px 10px 0 0; }
.close-btn { background: none; border: 0; color: #e9ecf3; font-size: 16px; cursor: pointer; }
.mini-form .mini-field { padding: 10px 14px; display: flex; flex-direction: column; gap: 8px; }
.mini-actions { display: flex; gap: 8px; justify-content: flex-end; padding: 0 14px 12px; }

/* ---------- تنبيه الرصيد (F7) ---------- */
.balance-toast { position: fixed; bottom: 70px; right: 20px; z-index: 200; padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 700; box-shadow: 0 6px 20px rgba(10,20,40,.25); }
.balance-toast.toast-ok { background: #0a7d3a; color: #fff; }
.balance-toast.toast-err { background: #b3261e; color: #fff; }

/* ============================================
   الجوال — تجاوب كامل بدون كسر
   ============================================ */
@media (max-width: 768px) {
  .ox-head { grid-template-columns: 1fr 1fr; }
  .ox-head2 { grid-template-columns: 1fr; }
  .ox-amount-row { grid-template-columns: 1fr; }
  .ox-cmdbar { flex-wrap: wrap; }
  .cm-btn { flex: 1 1 28%; justify-content: center; font-size: 11px; padding: 6px 4px; }
  .cm-btn.danger { flex: 1 1 40%; }
  .ox-summary { flex-wrap: wrap; }
  .ox-sum-item { flex: 1 1 28%; border-left: 0; }
  /* الجدول العريض يختفي على الجوال وتظهر بطاقات مقروءة */
  .ox-table { display: none; }
  .ox-lines-mobile { display: block; }
  .ox-line-card { border-bottom: 1px solid #eef1f5; padding: 7px 10px; }
  .ox-line-card:last-child { border-bottom: 0; }
  .ox-line-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .ox-line-item { font-weight: 700; font-size: 12.5px; flex: 1; }
  .ox-line-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 5px; align-items: center; }
  .ox-line-cell { display: flex; flex-direction: column; gap: 2px; }
  .ox-line-cell label { font-size: 9.5px; color: #6b7280; font-weight: 700; }
  .ox-field label { white-space: normal; }
  .ox-search-input { font-size: 13.5px; min-height: 38px; }
  /* قائمة السجل: الجدول العريض يقبل التمرير الأفقي، والبطاقات مخفية على الكمبيوتر */
  .bolt-table { min-width: 780px; }
  .table-card { overflow-x: auto; }
  .pv-cards { display: none; }
  .pv-card-row { display: flex; flex-direction: column; gap: 1px; }
  .pv-card-row.full { grid-column: 1 / -1; }
  .pv-card-row label { font-size: 10px; font-weight: 700; color: #64748b; }
  .pv-card-row span { font-size: 13px; color: #0f172a; }
  .pv-card-row .pv-no { font-weight: 800; color: #1f6feb; font-size: 13.5px; }
  .pv-card-row .pv-amt { font-weight: 800; font-size: 14px; }
  .pv-card-acts { grid-column: 1 / -1; display: flex; gap: 6px; margin-top: 4px; border-top: 1px dashed #e2e8f0; padding-top: 8px; }
  .pv-card-acts .act { flex: 1; height: 34px; font-size: 12.5px; }
  .topbar-right { width: 100%; }
  .topbar-center { width: 100%; justify-content: flex-start; }
  .topbar-left { width: 100%; justify-content: flex-start; flex-wrap: wrap; }
  .tb-search { flex: 1; min-width: 0; }
  .tb-search input { width: 100%; }
  .df-small { flex: 1; min-width: 0; }
  .ox-qty, .ox-inp { min-height: 32px; }
  /* على الجوال: إخفاء الجدول العريض (مع الحفاظ على صفوفه في DOM للترقيم)، وإظهار البطاقات فقط */
  .bolt-table thead, .bolt-table tbody { display: none; }
  .bolt-table { border: 0; }
  .pv-cards { display: block; }
  .topbar { flex-direction: column; align-items: stretch; gap: 8px; }
  .topbar-left { justify-content: flex-start; flex-wrap: wrap; }
  .tb-search input { width: 120px; }
  .ox-layout { overflow-y: auto; padding: 4px; }
  .pv-card { border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; padding: 10px 12px; margin-bottom: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 14px; }
  .ox-cmdbar { position: sticky; bottom: 0; z-index: 50; }
}
</style>
