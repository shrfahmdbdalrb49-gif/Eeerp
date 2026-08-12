/* ============================================
   Sharaf ERP - Main Application Logic
   نظام شرف - المنطق البرمجي الرئيسي
   ============================================ */

// ---- الحالة العامة ----
let invoiceCounter = 1;
let rowCounter = 1;
let sidebarOpen = true;

// ---- بيانات تجريبية للأدوية ----
const sampleDrugs = [
  { name:  بنادول 500mg , barcode:  6281234567890 , unit:  علبة , price: 1500 },
  { name:  أموكسيسيلين 500mg , barcode:  6281234567891 , unit:  علبة , price: 2500 },
  { name:  بروفين 400mg , barcode:  6281234567892 , unit:  علبة , price: 2000 },
  { name:  فلاجيل 500mg , barcode:  6281234567893 , unit:  علبة , price: 1800 },
  { name:  زيرتك 10mg , barcode:  6281234567894 , unit:  علبة , price: 3000 },
  { name:  كونكور 5mg , barcode:  6281234567895 , unit:  علبة , price: 4500 },
  { name:  جلوكوفاج 850mg , barcode:  6281234567896 , unit:  علبة , price: 3500 },
  { name:  أوميبرازول 20mg , barcode:  6281234567897 , unit:  علبة , price: 2200 },
  { name:  فيتامين D3 1000IU , barcode:  6281234567898 , unit:  علبة , price: 5000 },
  { name:  سيتال 500mg , barcode:  6281234567899 , unit:  شريط , price: 500 }
];

// ============================================
// اختصارات لوحة المفاتيح
// ============================================
document.addEventListener( keydown , function(e) {
  // F2 - جديد
  if (e.key ===  F2 ) {
    e.preventDefault();
    handleNew();
  }
  // F3 - بحث
  if (e.key ===  F3 ) {
    e.preventDefault();
    handleSearch();
  }
  // F4 - إضافة صف
  if (e.key ===  F4 ) {
    e.preventDefault();
    addNewRow();
  }
  // F8 - حفظ
  if (e.key ===  F8 ) {
    e.preventDefault();
    handleSave();
  }
  // F10 - ترحيل
  if (e.key ===  F10 ) {
    e.preventDefault();
    handlePost();
  }
  // Escape - إغلاق
  if (e.key ===  Escape ) {
    e.preventDefault();
    handleClose();
  }
  // Ctrl+P - طباعة
  if (e.ctrlKey && e.key ===  p ) {
    e.preventDefault();
    handlePrint();
  }
  // Ctrl+Shift+L - Lookup
  if (e.ctrlKey && e.shiftKey && e.key ===  L ) {
    e.preventDefault();
    openLookup( item );
  }
});

// ============================================
// القائمة العلوية (Ribbon Menu)
// ============================================
document.querySelectorAll( .menu-item ).forEach(function(btn) {
  btn.addEventListener( click , function() {
    document.querySelectorAll( .menu-item ).forEach(function(b) {
      b.classList.remove( active );
    });
    this.classList.add( active );
    updateSidebar(this.getAttribute( data-menu ));
  });
});

function updateSidebar(menu) {
  var sectionMap = {
     dashboard :  لوحة التحكم ,
     sales :  المبيعات ,
     purchases :  المشتريات ,
     inventory :  المخزون ,
     insurance :  التأمين ,
     accounting :  الحسابات ,
     reports :  التقارير ,
     admin :  الإدارة 
  };
  // يمكن توسيع هذا لاحقاً لتغيير محتوى القائمة الجانبية
}

// ============================================
// القائمة الجانبية (Sidebar)
// ============================================
function toggleSidebar() {
  var sidebar = document.getElementById( sidebar );
  sidebarOpen = !sidebarOpen;
  if (sidebarOpen) {
    sidebar.classList.remove( collapsed );
  } else {
    sidebar.classList.add( collapsed );
  }
}

function showPage(page) {
  // إزالة التحديد من كل العناصر
  document.querySelectorAll( .sidebar-item ).forEach(function(item) {
    item.classList.remove( active );
  });
  // تحديد العنصر المضغوط
  event.target.classList.add( active );
  // يمكن توسيع هذا لفتح نوافذ مختلفة
}

// ============================================
// إجراءات شريط الأدوات
// ============================================
function handleNew() {
  invoiceCounter++;
  var num = String(invoiceCounter).padStart(3,  0 );
  var title =  فاتورة مبيعات #INV-2024-  + num;

  // تحديث عنوان النافذة
  var titleBar = document.querySelector( .window-title-bar span:first-child );
  if (titleBar) titleBar.textContent = title;

  // إعادة تعيين الحالة
  var statusBadge = document.getElementById( invoiceStatus );
  if (statusBadge) {
    statusBadge.textContent =  مسودة ;
    statusBadge.className =  badge badge-draft ;
  }

  // مسح الجدول
  var tbody = document.getElementById( itemsBody );
  if (tbody) {
    tbody.innerHTML =   ;
    rowCounter = 0;
    addNewRow();
  }

  // إعادة تعيين الإجماليات
  resetTotals();

  // تحديث شريط المهام
  var taskbarItem = document.querySelector( .taskbar-item );
  if (taskbarItem) taskbarItem.textContent =  📄   + title;

  showNotification( تم إنشاء فاتورة جديدة:   + title,  success );
}

function handleSave() {
  showNotification( تم الحفظ كمسودة بنجاح (F8) ,  success );
}

function handlePost() {
  var statusBadge = document.getElementById( invoiceStatus );
  if (statusBadge) {
    statusBadge.textContent =  مرحّلة ;
    statusBadge.className =  badge badge-posted ;
  }
  calculateTotals();
  showNotification( تم الترحيل بنجاح - تم إنشاء القيد المحاسبي (F10) ,  success );
}

function handlePrint() {
  window.print();
}

function handleSearch() {
  var firstInput = document.querySelector( .table-input );
  if (firstInput) {
    firstInput.focus();
    firstInput.select();
  }
  showNotification( وضع البحث السريع (F3) ,  info );
}

function handleClose() {
  if (confirm( هل تريد إغلاق الفاتورة؟ تأكد من حفظ التغييرات. )) {
    showNotification( تم إغلاق النافذة ,  info );
  }
}

// ============================================
// إدارة صفوف الجدول
// ============================================
function addNewRow() {
  rowCounter++;
  var tbody = document.getElementById( itemsBody );
  if (!tbody) return;

  var tr = document.createElement( tr );
  tr.innerHTML =
     <td>  + rowCounter +  </td>  +
     <td><input type="text" class="table-input drug-search" placeholder="ابحث عن دواء..." onfocus="this.select()" oninput="searchDrug(this)" /></td>  +
     <td><input type="text" class="table-input barcode-input" placeholder="باركود" oninput="searchByBarcode(this)" /></td>  +
     <td><input type="text" class="table-input" value="علبة" readonly /></td>  +
     <td><input type="text" class="table-input" placeholder="LOT-001" /></td>  +
     <td><input type="date" class="table-input" /></td>  +
     <td><input type="number" class="table-input qty-input" value="1" min="1" oninput="calculateRow(this)" /></td>  +
     <td><input type="number" class="table-input price-input" value="0" oninput="calculateRow(this)" /></td>  +
     <td><input type="number" class="table-input disc-input" value="0" min="0" max="100" oninput="calculateRow(this)" /></td>  +
     <td><input type="number" class="table-input tax-input" value="0" min="0" max="100" oninput="calculateRow(this)" /></td>  +
     <td class="row-total">0</td>  +
     <td><button class="delete-btn" onclick="deleteRow(this)">✕</button></td> ;

  tbody.appendChild(tr);

  // التركيز على حقل البحث في الصف الجديد
  var newInput = tr.querySelector( .drug-search );
  if (newInput) newInput.focus();

  calculateTotals();
}

function deleteRow(btn) {
  var row = btn.closest( tr );
  if (row) {
    row.remove();
    renumberRows();
    calculateTotals();
  }
}

function renumberRows() {
  var rows = document.querySelectorAll( #itemsBody tr );
  rows.forEach(function(row, index) {
    row.cells[0].textContent = index + 1;
  });
  rowCounter = rows.length;
}

// ============================================
// البحث عن الأدوية
// ============================================
function searchDrug(input) {
  var query = input.value.toLowerCase().trim();
  if (query.length < 1) return;

  var results = sampleDrugs.filter(function(drug) {
    return drug.name.toLowerCase().includes(query) ||
           drug.barcode.includes(query);
  });

  // إزالة أي قائمة منسدلة سابقة
  removeDropdown();

  if (results.length > 0) {
    showDropdown(input, results);
  }
}

function searchByBarcode(input) {
  var barcode = input.value.trim();
  if (barcode.length < 3) return;

  var drug = sampleDrugs.find(function(d) {
    return d.barcode === barcode;
  });

  if (drug) {
    fillDrugInRow(input.closest( tr ), drug);
    removeDropdown();
  }
}

function showDropdown(input, results) {
  var dropdown = document.createElement( div );
  dropdown.className =  search-dropdown ;
  dropdown.id =  searchDropdown ;

  results.forEach(function(drug) {
    var item = document.createElement( div );
    item.className =  dropdown-item ;
    item.innerHTML =
       <span class="drug-name">  + drug.name +  </span>  +
       <span class="drug-barcode">  + drug.barcode +  </span>  +
       <span class="drug-price">  + formatNumber(drug.price) +  </span> ;
    item.addEventListener( click , function() {
      fillDrugInRow(input.closest( tr ), drug);
      removeDropdown();
    });
    dropdown.appendChild(item);
  });

  // خيار إنشاء جديد
  var createNew = document.createElement( div );
  createNew.className =  dropdown-item dropdown-create ;
  createNew.textContent =  + إنشاء صنف جديد ;
  createNew.addEventListener( click , function() {
    alert( فتح نموذج إنشاء صنف جديد... );
    removeDropdown();
  });
  dropdown.appendChild(createNew);

  // وضع القائمة تحت الحقل
  var rect = input.getBoundingClientRect();
  dropdown.style.position =  fixed ;
  dropdown.style.top = (rect.bottom + 2) +  px ;
  dropdown.style.right = (window.innerWidth - rect.right) +  px ;
  dropdown.style.width = Math.max(rect.width, 300) +  px ;

  document.body.appendChild(dropdown);
}

function removeDropdown() {
  var existing = document.getElementById( searchDropdown );
  if (existing) existing.remove();
}

function fillDrugInRow(row, drug) {
  if (!row) return;
  var inputs = row.querySelectorAll( .table-input );
  // inputs[0] = drug name, inputs[1] = barcode, inputs[2] = unit, ... inputs[6] = price
  inputs[0].value = drug.name;
  inputs[1].value = drug.barcode;
  inputs[2].value = drug.unit;
  inputs[6].value = drug.price;

  // توليد تشغيلة وتاريخ صلاحية عشوائي
  inputs[3].value =  LOT-  + String(Math.floor(Math.random() * 9000) + 1000);
  var expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + Math.floor(Math.random() * 18) + 3);
  inputs[4].value = expiryDate.toISOString().split( T )[0];

  // التركيز على الكمية
  inputs[5].focus();
  inputs[5].select();

  calculateRow(inputs[5]);
}

// إغلاق القائمة المنسدلة عند الضغط خارجها
document.addEventListener( click , function(e) {
  if (!e.target.closest( .search-dropdown ) && !e.target.closest( .drug-search )) {
    removeDropdown();
  }
});

// ============================================
// الحسابات
// ============================================
function calculateRow(input) {
  var row = input.closest( tr );
  if (!row) return;

  var qty = parseFloat(row.querySelector( .qty-input ).value) || 0;
  var price = parseFloat(row.querySelector( .price-input ).value) || 0;
  var discount = parseFloat(row.querySelector( .disc-input ).value) || 0;
  var tax = parseFloat(row.querySelector( .tax-input ).value) || 0;

  var subtotal = qty * price;
  var discountAmount = subtotal * (discount / 100);
  var afterDiscount = subtotal - discountAmount;
  var taxAmount = afterDiscount * (tax / 100);
  var total = afterDiscount + taxAmount;

  row.querySelector( .row-total ).textContent = formatNumber(Math.round(total));

  calculateTotals();
}

function calculateTotals() {
  var rows = document.querySelectorAll( #itemsBody tr );
  var totalItems = rows.length;
  var totalQty = 0;
  var subtotal = 0;
  var totalDiscount = 0;
  var totalTax = 0;

  rows.forEach(function(row) {
    var qty = parseFloat(row.querySelector( .qty-input )?.value) || 0;
    var price = parseFloat(row.querySelector( .price-input )?.value) || 0;
    var discount = parseFloat(row.querySelector( .disc-input )?.value) || 0;
    var tax = parseFloat(row.querySelector( .tax-input )?.value) || 0;

    var lineSubtotal = qty * price;
    var lineDiscount = lineSubtotal * (discount / 100);
    var lineAfterDiscount = lineSubtotal - lineDiscount;
    var lineTax = lineAfterDiscount * (tax / 100);

    totalQty += qty;
    subtotal += lineSubtotal;
    totalDiscount += lineDiscount;
    totalTax += lineTax;
  });

  // خصم عام
  var generalDiscount = parseFloat(document.getElementById( generalDiscount )?.value) || 0;
  var generalDiscountAmount = (subtotal - totalDiscount) * (generalDiscount / 100);
  totalDiscount += generalDiscountAmount;

  var netTotal = subtotal - totalDiscount + totalTax;

  // تحديث الواجهة
  setText( totalItems , totalItems);
  setText( totalQty , totalQty);
  setText( subtotal , formatNumber(Math.round(subtotal)));
  setText( totalDiscount , formatNumber(Math.round(totalDiscount)));
  setText( totalTax , formatNumber(Math.round(totalTax)));
  setText( netTotal , formatNumber(Math.round(netTotal)));

  // تحديث القيد المحاسبي
  setText( jDebit , formatNumber(Math.round(netTotal)));
  setText( jCreditSales , formatNumber(Math.round(netTotal - totalTax)));
  setText( jCreditTax , formatNumber(Math.round(totalTax)));

  calculateRemaining();
}

function calculateRemaining() {
  var netText = document.getElementById( netTotal )?.textContent ||  0 ;
  var netTotal = parseFormattedNumber(netText);
  var paid = parseFloat(document.getElementById( paidAmount )?.value) || 0;
  var remaining = netTotal - paid;

  var remainingEl = document.getElementById( remaining );
  if (remainingEl) {
    remainingEl.textContent = formatNumber(Math.round(remaining));
    if (remaining > 0) {
      remainingEl.style.color =  var(--color-error) ;
    } else {
      remainingEl.style.color =  var(--color-success) ;
    }
  }
}

function resetTotals() {
  setText( totalItems , 0);
  setText( totalQty , 0);
  setText( subtotal ,  0 );
  setText( totalDiscount ,  0 );
  setText( totalTax ,  0 );
  setText( netTotal ,  0 );
  setText( remaining ,  0 );
  var paidInput = document.getElementById( paidAmount );
  if (paidInput) paidInput.value = 0;
}

// ============================================
// التبويبات
// ============================================
function switchTab(tabBtn, tabName) {
  // إزالة التحديد من كل التبويبات
  document.querySelectorAll( .tab ).forEach(function(t) {
    t.classList.remove( active );
  });
  tabBtn.classList.add( active );

  // إخفاء كل اللوحات
  document.querySelectorAll( .tab-panel ).forEach(function(p) {
    p.style.display =  none ;
  });

  // إظهار اللوحة المحددة
  var panel = document.getElementById( panel-  + tabName);
  if (panel) panel.style.display =  block ;
}

// ============================================
// Lookup Modal
// ============================================
function openLookup(type) {
  var titles = {
     patient :  اختيار المريض ,
     doctor :  اختيار الطبيب ,
     item :  اختيار الصنف 
  };
  alert( فتح نافذة البحث:   + (titles[type] || type) +  \n\nهذه النافذة ستكون Modal كبير بعرض 80% من الشاشة مع جدول بحث كامل. );
}

// ============================================
// إدارة النوافذ
// ============================================
function minimizeWindow() {
  var win = document.querySelector( .window-frame );
  if (win) {
    win.style.display =  none ;
    showNotification( تم تصغير النافذة - اضغط على شريط المهام لاستعادتها ,  info );
  }
}

function maximizeWindow() {
  var win = document.querySelector( .window-frame );
  if (win) {
    win.classList.toggle( maximized );
  }
}

function activateWindow(id) {
  var win = document.querySelector( .window-frame );
  if (win) {
    win.style.display =  flex ;
  }
}

// ============================================
// أدوات مساعدة
// ============================================
function formatNumber(num) {
  if (num === null || num === undefined) return  0 ;
  return Number(num).toLocaleString( en-US );
}

function parseFormattedNumber(str) {
  if (!str) return 0;
  return parseInt(str.replace(/,/g,   ), 10) || 0;
}

function setText(id, text) {
  var el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ============================================
// الإشعارات
// ============================================
function showNotification(message, type) {
  // إزالة إشعار سابق
  var existing = document.querySelector( .notification );
  if (existing) existing.remove();

  var colors = {
     success :  #1B5E20 ,
     error :  #B71C1C ,
     warning :  #E65100 ,
     info :  #0D5AA7 
  };

  var notification = document.createElement( div );
  notification.className =  notification ;
  notification.style.cssText =
     position:fixed;top:50px;left:50%;transform:translateX(-50%);  +
     background:  + (colors[type] || colors.info) +  ;  +
     color:white;padding:10px 24px;border-radius:3px;  +
     font-family:Arial,sans-serif;font-size:13px;z-index:9999;  +
     box-shadow:0 4px 12px rgba(0,0,0,0.3);direction:rtl;  +
     animation:slideDown 0.3s ease; ;
  notification.textContent = message;

  // إضافة animation
  var style = document.createElement( style );
  style.textContent =  @keyframes slideDown{from{opacity:0;top:30px}to{opacity:1;top:50px}} ;
  document.head.appendChild(style);

  document.body.appendChild(notification);

  setTimeout(function() {
    notification.style.opacity =  0 ;
    notification.style.transition =  opacity 0.3s ;
    setTimeout(function() {
      notification.remove();
      style.remove();
    }, 300);
  }, 3000);
}

// ============================================
// الساعة في شريط المهام
// ============================================
function updateClock() {
  var now = new Date();
  var timeStr = now.toLocaleTimeString( ar-EG , {
    hour:  2-digit ,
    minute:  2-digit 
  });
  var dateStr = now.toLocaleDateString( ar-EG , {
    year:  numeric ,
    month:  2-digit ,
    day:  2-digit 
  });
  var clockEl = document.getElementById( currentTime );
  if (clockEl) {
    clockEl.textContent =  🕐   + timeStr +   |   + dateStr;
  }
}

// تحديث الساعة كل ثانية
setInterval(updateClock, 1000);
updateClock();

// ============================================
// إضافة صف أول تلقائياً عند التحميل
// ============================================
document.addEventListener( DOMContentLoaded , function() {
  // التركيز على أول حقل بحث
  var firstInput = document.querySelector( .table-input );
  if (firstInput) {
    setTimeout(function() {
      firstInput.focus();
    }, 500);
  }
});
