/* ============================================
   Sharaf ERP - Complete Application Logic
   نظام شرف - المنطق البرمجي الكامل
   ============================================ */

let invoiceCounter = 1;
let rowCounter = 1;
let sidebarOpen = true;
let currentLookupType =   ;
let currentLookupCallback = null;

// ============================================
// قاعدة بيانات الأدوية التجريبية
// ============================================
const drugsDatabase = [
  { code:  DRG-001 , name:  بنادول 500mg , scientific:  Paracetamol , barcode:  6281234567890 , category:  مسكنات , unit:  علبة , buyPrice: 800, sellPrice: 1500, stock: 150, minStock: 20, expiry:  2025-08-15 , prescription: false, status:  active  },
  { code:  DRG-002 , name:  أموكسيسيلين 500mg , scientific:  Amoxicillin , barcode:  6281234567891 , category:  مضادات حيوية , unit:  علبة , buyPrice: 1500, sellPrice: 2500, stock: 80, minStock: 15, expiry:  2025-06-20 , prescription: true, status:  active  },
  { code:  DRG-003 , name:  بروفين 400mg , scientific:  Ibuprofen , barcode:  6281234567892 , category:  مسكنات , unit:  علبة , buyPrice: 1200, sellPrice: 2000, stock: 200, minStock: 25, expiry:  2025-12-01 , prescription: false, status:  active  },
  { code:  DRG-004 , name:  فلاجيل 500mg , scientific:  Metronidazole , barcode:  6281234567893 , category:  مضادات حيوية , unit:  علبة , buyPrice: 1000, sellPrice: 1800, stock: 60, minStock: 10, expiry:  2025-04-10 , prescription: true, status:  active  },
  { code:  DRG-005 , name:  زيرتك 10mg , scientific:  Cetirizine , barcode:  6281234567894 , category:  أخرى , unit:  علبة , buyPrice: 1800, sellPrice: 3000, stock: 45, minStock: 10, expiry:  2025-09-30 , prescription: false, status:  active  },
  { code:  DRG-006 , name:  كونكور 5mg , scientific:  Bisoprolol , barcode:  6281234567895 , category:  أمراض مزمنة , unit:  علبة , buyPrice: 2500, sellPrice: 4500, stock: 30, minStock: 10, expiry:  2025-11-15 , prescription: true, status:  active  },
  { code:  DRG-007 , name:  جلوكوفاج 850mg , scientific:  Metformin , barcode:  6281234567896 , category:  أمراض مزمنة , unit:  علبة , buyPrice: 2000, sellPrice: 3500, stock: 90, minStock: 15, expiry:  2025-10-20 , prescription: true, status:  active  },
  { code:  DRG-008 , name:  أوميبرازول 20mg , scientific:  Omeprazole , barcode:  6281234567897 , category:  أخرى , unit:  علبة , buyPrice: 1300, sellPrice: 2200, stock: 120, minStock: 20, expiry:  2025-07-25 , prescription: false, status:  active  },
  { code:  DRG-009 , name:  فيتامين D3 1000IU , scientific:  Cholecalciferol , barcode:  6281234567898 , category:  فيتامينات , unit:  علبة , buyPrice: 3000, sellPrice: 5000, stock: 55, minStock: 10, expiry:  2026-03-15 , prescription: false, status:  active  },
  { code:  DRG-010 , name:  سيتال 500mg , scientific:  Paracetamol , barcode:  6281234567899 , category:  مسكنات , unit:  شريط , buyPrice: 200, sellPrice: 500, stock: 300, minStock: 50, expiry:  2025-08-30 , prescription: false, status:  active  },
  { code:  DRG-011 , name:  أوجمنتين 625mg , scientific:  Amoxicillin+Clavulanate , barcode:  6281234567900 , category:  مضادات حيوية , unit:  علبة , buyPrice: 3500, sellPrice: 5500, stock: 25, minStock: 10, expiry:  2025-05-18 , prescription: true, status:  active  },
  { code:  DRG-012 , name:  ليبيتر 20mg , scientific:  Atorvastatin , barcode:  6281234567901 , category:  أمراض مزمنة , unit:  علبة , buyPrice: 4000, sellPrice: 6500, stock: 8, minStock: 10, expiry:  2025-09-10 , prescription: true, status:  active  },
  { code:  DRG-013 , name:  نكسيوم 40mg , scientific:  Esomeprazole , barcode:  6281234567902 , category:  أخرى , unit:  علبة , buyPrice: 5000, sellPrice: 8000, stock: 15, minStock: 5, expiry:  2025-12-20 , prescription: true, status:  active  },
  { code:  DRG-014 , name:  فولتارين 50mg , scientific:  Diclofenac , barcode:  6281234567903 , category:  مسكنات , unit:  علبة , buyPrice: 1500, sellPrice: 2800, stock: 0, minStock: 15, expiry:  2025-06-30 , prescription: false, status:  active  },
  { code:  DRG-015 , name:  شراب برونكikum , scientific:  Bronchicum Syrup , barcode:  6281234567904 , category:  أخرى , unit:  علبة , buyPrice: 2500, sellPrice: 4000, stock: 3, minStock: 8, expiry:  2025-03-25 , prescription: false, status:  active  },
  { code:  DRG-016 , name:  أسبرين 100mg , scientific:  Acetylsalicylic Acid , barcode:  6281234567905 , category:  أمراض مزمنة , unit:  علبة , buyPrice: 500, sellPrice: 1000, stock: 250, minStock: 30, expiry:  2026-01-15 , prescription: false, status:  active  },
  { code:  DRG-017 , name:  زنك 50mg , scientific:  Zinc Sulfate , barcode:  6281234567906 , category:  فيتامينات , unit:  علبة , buyPrice: 800, sellPrice: 1500, stock: 70, minStock: 15, expiry:  2026-06-20 , prescription: false, status:  active  },
  { code:  DRG-018 , name:  سبراكس 200mg , scientific:  Cefixime , barcode:  6281234567907 , category:  مضادات حيوية , unit:  علبة , buyPrice: 2800, sellPrice: 4500, stock: 12, minStock: 8, expiry:  2025-07-10 , prescription: true, status:  active  },
  { code:  DRG-019 , name:  إندرال 40mg , scientific:  Propranolol , barcode:  6281234567908 , category:  أمراض مزمنة , unit:  علبة , buyPrice: 600, sellPrice: 1200, stock: 180, minStock: 20, expiry:  2025-11-30 , prescription: true, status:  active  },
  { code:  DRG-020 , name:  マルチ فيتامين , scientific:  Multivitamin , barcode:  6281234567909 , category:  فيتامينات , unit:  علبة , buyPrice: 4500, sellPrice: 7500, stock: 5, minStock: 10, expiry:  2025-04-05 , prescription: false, status:  active  }
];

const patientsDatabase = [
  { code:  PAT-001 , name:  أحمد محمد علي , phone:  777123456 , insurance:  بدون تأمين , balance: 0, visits: 12 },
  { code:  PAT-002 , name:  فاطمة عبدالله حسن , phone:  777234567 , insurance:  شركة التأمين الوطنية , balance: 5000, visits: 8 },
  { code:  PAT-003 , name:  محمد سالم أحمد , phone:  777345678 , insurance:  بدون تأمين , balance: 0, visits: 25 },
  { code:  PAT-004 , name:  عائشة يوسف إبراهيم , phone:  777456789 , insurance:  شركة سبأ للتأمين , balance: 12000, visits: 5 },
  { code:  PAT-005 , name:  علي حسين محمد , phone:  777567890 , insurance:  بدون تأمين , balance: 3000, visits: 15 },
  { code:  PAT-006 , name:  مريم عبدالرحمن , phone:  777678901 , insurance:  شركة التأمين الوطنية , balance: 0, visits: 3 },
  { code:  PAT-007 , name:  خالد عمر سعيد , phone:  777789012 , insurance:  بدون تأمين , balance: 8500, visits: 20 },
  { code:  PAT-008 , name:  نورة أحمد صالح , phone:  777890123 , insurance:  شركة سبأ للتأمين , balance: 0, visits: 7 }
];

const doctorsDatabase = [
  { code:  DOC-001 , name:  د. عبدالكريم الشميري , specialty:  باطنية , phone:  771111111 , license:  MED-2019-001  },
  { code:  DOC-002 , name:  د. سمية المقطري , specialty:  أطفال , phone:  771222222 , license:  MED-2020-045  },
  { code:  DOC-003 , name:  د. فيصل الحيمي , specialty:  قلب , phone:  771333333 , license:  MED-2018-012  },
  { code:  DOC-004 , name:  د. منى السعيدي , specialty:  نساء وولادة , phone:  771444444 , license:  MED-2021-078  },
  { code:  DOC-005 , name:  د. ياسر النعماني , specialty:  عظام , phone:  771555555 , license:  MED-2017-034  },
  { code:  DOC-006 , name:  د. ريم الجنيد , specialty:  جلدية , phone:  771666666 , license:  MED-2022-091  }
];

// ============================================
// اختصارات لوحة المفاتيح
// ============================================
document.addEventListener( keydown , function(e) {
  if (e.key ===  F2 ) { e.preventDefault(); handleNew(); }
  if (e.key ===  F3 ) { e.preventDefault(); handleSearch(); }
  if (e.key ===  F4 ) { e.preventDefault(); addNewRow(); }
  if (e.key ===  F8 ) { e.preventDefault(); handleSave(); }
  if (e.key ===  F10 ) { e.preventDefault(); handlePost(); }
  if (e.key ===  Escape ) {
    e.preventDefault();
    var lookup = document.getElementById( lookupOverlay );
    if (lookup && lookup.style.display !==  none ) {
      closeLookupModal();
    } else {
      handleClose();
    }
  }
  if (e.ctrlKey && e.key ===  p ) { e.preventDefault(); handlePrint(); }
  if (e.ctrlKey && e.shiftKey && (e.key ===  L  || e.key ===  l )) {
    e.preventDefault();
    openLookupModal( item );
  }
});

// ===== القائمة العلوية =====
function switchMenu(btn) {
  document.querySelectorAll( .menu-item ).forEach(function(b) { b.classList.remove( active ); });
  btn.classList.add( active );
}

document.querySelectorAll( .menu-item ).forEach(function(btn) {
  btn.addEventListener( click , function() { switchMenu(this); });
});

// ===== القائمة الجانبية =====
function toggleSidebar() {
  var sidebar = document.getElementById( sidebar );
  sidebarOpen = !sidebarOpen;
  sidebar.classList.toggle( collapsed );
}

function showPage(page, el) {
  document.querySelectorAll( .sidebar-item ).forEach(function(item) { item.classList.remove( active ); });
  if (el) el.classList.add( active );

  if (page ===  items ) {
    openItemsScreen();
  }
}

// ============================================
// إجراءات شريط الأدوات
// ============================================
function handleNew() {
  invoiceCounter++;
  var num = String(invoiceCounter).padStart(3,  0 );
  var title =  فاتورة مبيعات #INV-2024-  + num;

  var titleBar = document.getElementById( salesWindowTitle );
  if (titleBar) titleBar.textContent = title;

  var statusBadge = document.getElementById( invoiceStatus );
  if (statusBadge) {
    statusBadge.textContent =  مسودة ;
    statusBadge.className =  badge badge-draft ;
  }

  var tbody = document.getElementById( itemsBody );
  if (tbody) {
    tbody.innerHTML =   ;
    rowCounter = 0;
    addNewRow();
  }

  resetTotals();
  activateWindow( window-sales );
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
  showNotification( تم الترحيل بنجاح - تم إنشاء القيد المحاسبي وحركة المخزون (F10) ,  success );
}

function handlePrint() { window.print(); }

function handleSearch() {
  var firstInput = document.querySelector( .table-input );
  if (firstInput) { firstInput.focus(); firstInput.select(); }
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
     <td><button class="delete-btn" onclick="deleteRow(this)">\u2715</button></td> ;

  tbody.appendChild(tr);
  var newInput = tr.querySelector( .drug-search );
  if (newInput) newInput.focus();
  calculateTotals();
}

function deleteRow(btn) {
  var row = btn.closest( tr );
  if (row) { row.remove(); renumberRows(); calculateTotals(); }
}

function renumberRows() {
  var rows = document.querySelectorAll( #itemsBody tr );
  rows.forEach(function(row, index) { row.cells[0].textContent = index + 1; });
  rowCounter = rows.length;
}

// ============================================
// البحث عن الأدوية (Live Search)
// ============================================
function searchDrug(input) {
  var query = input.value.toLowerCase().trim();
  if (query.length < 1) { removeDropdown(); return; }

  var results = drugsDatabase.filter(function(drug) {
    return drug.name.toLowerCase().includes(query) ||
           drug.scientific.toLowerCase().includes(query) ||
           drug.barcode.includes(query) ||
           drug.code.toLowerCase().includes(query);
  });

  removeDropdown();
  if (results.length > 0) showDropdown(input, results);
}

function searchByBarcode(input) {
  var barcode = input.value.trim();
  if (barcode.length < 3) return;

  var drug = drugsDatabase.find(function(d) { return d.barcode === barcode; });
  if (drug) { fillDrugInRow(input.closest( tr ), drug); removeDropdown(); }
}

function showDropdown(input, results) {
  var dropdown = document.createElement( div );
  dropdown.className =  search-dropdown ;
  dropdown.id =  searchDropdown ;

  results.slice(0, 8).forEach(function(drug) {
    var item = document.createElement( div );
    item.className =  dropdown-item ;
    var stockClass = drug.stock <= drug.minStock ?  status-low  : (drug.stock === 0 ?  status-out  :   );
    item.innerHTML =
       <span class="drug-name">  + drug.name +  </span>  +
       <span class="drug-barcode">  + drug.code +   |   + drug.barcode +  </span>  +
       <span class="drug-price">  + formatNumber(drug.sellPrice) +  </span>  +
       <span class="  + stockClass +  " style="font-size:11px;">الرصيد:   + drug.stock +  </span> ;
    item.addEventListener( click , function() {
      fillDrugInRow(input.closest( tr ), drug);
      removeDropdown();
    });
    dropdown.appendChild(item);
  });

  if (results.length > 8) {
    var more = document.createElement( div );
    more.className =  dropdown-item dropdown-create ;
    more.textContent =  ... و   + (results.length - 8) +   نتائج أخرى - اضغط Ctrl+Shift+L للبحث المتقدم ;
    dropdown.appendChild(more);
  }

  var createNew = document.createElement( div );
  createNew.className =  dropdown-item dropdown-create ;
  createNew.textContent =  + إنشاء صنف جديد ;
  createNew.addEventListener( click , function() { alert( فتح نموذج إنشاء صنف جديد... ); removeDropdown(); });
  dropdown.appendChild(createNew);

  var rect = input.getBoundingClientRect();
  dropdown.style.position =  fixed ;
  dropdown.style.top = (rect.bottom + 2) +  px ;
  dropdown.style.right = (window.innerWidth - rect.right) +  px ;
  dropdown.style.width = Math.max(rect.width, 350) +  px ;
  document.body.appendChild(dropdown);
}

function removeDropdown() {
  var existing = document.getElementById( searchDropdown );
  if (existing) existing.remove();
}

function fillDrugInRow(row, drug) {
  if (!row) return;
  var inputs = row.querySelectorAll( .table-input );
  inputs[0].value = drug.name;
  inputs[1].value = drug.barcode;
  inputs[2].value = drug.unit;
  inputs[3].value =  LOT-  + String(Math.floor(Math.random() * 9000) + 1000);
  inputs[4].value = drug.expiry;
  inputs[6].value = drug.sellPrice;
  inputs[5].focus();
  inputs[5].select();
  calculateRow(inputs[5]);
}

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
  var totalQty = 0, subtotal = 0, totalDiscount = 0, totalTax = 0;

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

  var generalDiscount = parseFloat(document.getElementById( generalDiscount )?.value) || 0;
  var generalDiscountAmount = (subtotal - totalDiscount) * (generalDiscount / 100);
  totalDiscount += generalDiscountAmount;
  var netTotal = subtotal - totalDiscount + totalTax;

  setText( totalItems , totalItems);
  setText( totalQty , totalQty);
  setText( subtotal , formatNumber(Math.round(subtotal)));
  setText( totalDiscount , formatNumber(Math.round(totalDiscount)));
  setText( totalTax , formatNumber(Math.round(totalTax)));
  setText( netTotal , formatNumber(Math.round(netTotal)));
  setText( jDebit , formatNumber(Math.round(netTotal)));
  setText( jCreditSales , formatNumber(Math.round(netTotal - totalTax)));
  setText( jCreditTax , formatNumber(Math.round(totalTax)));
  calculateRemaining();
}

function calculateRemaining() {
  var netTotal = parseFormattedNumber(document.getElementById( netTotal )?.textContent ||  0 );
  var paid = parseFloat(document.getElementById( paidAmount )?.value) || 0;
  var remaining = netTotal - paid;
  var remainingEl = document.getElementById( remaining );
  if (remainingEl) {
    remainingEl.textContent = formatNumber(Math.round(remaining));
    remainingEl.style.color = remaining > 0 ?  #B71C1C  :  #1B5E20 ;
  }
}

function resetTotals() {
  [ totalItems , totalQty , subtotal , totalDiscount , totalTax , netTotal , remaining ].forEach(function(id) { setText(id,  0 ); });
  var paidInput = document.getElementById( paidAmount );
  if (paidInput) paidInput.value = 0;
}

// ============================================
// التبويبات
// ============================================
function switchTab(tabBtn, tabName) {
  document.querySelectorAll( .tab ).forEach(function(t) { t.classList.remove( active ); });
  tabBtn.classList.add( active );
  document.querySelectorAll( .tab-panel ).forEach(function(p) { p.style.display =  none ; });
  var panel = document.getElementById( panel-  + tabName);
  if (panel) panel.style.display =  block ;
}

// ============================================
// Lookup Modal - نافذة البحث الموحدة
// ============================================
function openLookupModal(type) {
  currentLookupType = type;
  var overlay = document.getElementById( lookupOverlay );
  var title = document.getElementById( lookupTitle );
  var thead = document.getElementById( lookupThead );
  var searchInput = document.getElementById( lookupSearchInput );

  var configs = {
     item : {
      title:  اختيار الصنف / الدواء ,
      headers: [ الكود ,  الاسم التجاري ,  الاسم العلمي ,  الباركود ,  المجموعة ,  سعر البيع ,  الرصيد ,  الصلاحية ],
      data: drugsDatabase,
      map: function(d) {
        var stockClass = d.stock === 0 ?  status-out  : (d.stock <= d.minStock ?  status-low  :   );
        var expiryClass = getExpiryClass(d.expiry);
        return [d.code, d.name, d.scientific, d.barcode, d.category, formatNumber(d.sellPrice),  <span class="  + stockClass +  ">  + d.stock +  </span> ,  <span class="  + expiryClass +  ">  + d.expiry +  </span> ];
      }
    },
     patient : {
      title:  اختيار المريض ,
      headers: [ الكود ,  الاسم ,  الهاتف ,  التأمين ,  الرصيد ,  عدد الزيارات ],
      data: patientsDatabase,
      map: function(d) { return [d.code, d.name, d.phone, d.insurance, formatNumber(d.balance), d.visits]; }
    },
     doctor : {
      title:  اختيار الطبيب ,
      headers: [ الكود ,  الاسم ,  التخصص ,  الهاتف ,  رقم الترخيص ],
      data: doctorsDatabase,
      map: function(d) { return [d.code, d.name, d.specialty, d.phone, d.license]; }
    }
  };

  var config = configs[type] || configs[ item ];
  title.textContent = config.title;

  var headerHtml =  <tr> ;
  config.headers.forEach(function(h) { headerHtml +=  <th>  + h +  </th> ; });
  headerHtml +=  </tr> ;
  thead.innerHTML = headerHtml;

  renderLookupResults(config.data, config.map);

  overlay.style.display =  flex ;
  searchInput.value =   ;
  setTimeout(function() { searchInput.focus(); }, 100);
}

function renderLookupResults(data, mapFn) {
  var tbody = document.getElementById( lookupTbody );
  var countEl = document.getElementById( lookupCount );
  tbody.innerHTML =   ;

  data.forEach(function(item, index) {
    var tr = document.createElement( tr );
    var cells = mapFn(item);
    cells.forEach(function(cell) { tr.innerHTML +=  <td>  + cell +  </td> ; });
    tr.addEventListener( dblclick , function() { selectLookupItem(item); });
    tr.addEventListener( keydown , function(e) { if (e.key ===  Enter ) selectLookupItem(item); });
    tr.tabIndex = 0;
    tbody.appendChild(tr);
  });

  countEl.textContent = data.length +   نتيجة ;
}

function filterLookupResults() {
  var query = document.getElementById( lookupSearchInput ).value.toLowerCase().trim();
  var configs = {
     item : {
      data: drugsDatabase,
      filter: function(d) { return d.name.toLowerCase().includes(query) || d.scientific.toLowerCase().includes(query) || d.barcode.includes(query) || d.code.toLowerCase().includes(query) || d.category.toLowerCase().includes(query); },
      map: function(d) {
        var stockClass = d.stock === 0 ?  status-out  : (d.stock <= d.minStock ?  status-low  :   );
        var expiryClass = getExpiryClass(d.expiry);
        return [d.code, d.name, d.scientific, d.barcode, d.category, formatNumber(d.sellPrice),  <span class="  + stockClass +  ">  + d.stock +  </span> ,  <span class="  + expiryClass +  ">  + d.expiry +  </span> ];
      }
    },
     patient : {
      data: patientsDatabase,
      filter: function(d) { return d.name.toLowerCase().includes(query) || d.phone.includes(query) || d.code.toLowerCase().includes(query); },
      map: function(d) { return [d.code, d.name, d.phone, d.insurance, formatNumber(d.balance), d.visits]; }
    },
     doctor : {
      data: doctorsDatabase,
      filter: function(d) { return d.name.toLowerCase().includes(query) || d.specialty.toLowerCase().includes(query) || d.phone.includes(query); },
      map: function(d) { return [d.code, d.name, d.specialty, d.phone, d.license]; }
    }
  };

  var config = configs[currentLookupType] || configs[ item ];
  var filtered = query ? config.data.filter(config.filter) : config.data;
  renderLookupResults(filtered, config.map);
}

function selectLookupItem(item) {
  if (currentLookupType ===  patient ) {
    var patientInput = document.getElementById( patientSearch );
    var phoneInput = document.getElementById( patientPhone );
    if (patientInput) patientInput.value = item.name;
    if (phoneInput) phoneInput.value = item.phone;
  } else if (currentLookupType ===  doctor ) {
    var doctorInput = document.getElementById( doctorSearch );
    if (doctorInput) doctorInput.value = item.name;
  } else if (currentLookupType ===  item ) {
    var activeInput = document.activeElement;
    if (activeInput && activeInput.closest( tr )) {
      fillDrugInRow(activeInput.closest( tr ), item);
    }
  }
  closeLookupModal();
  showNotification( تم الاختيار:   + item.name,  success );
}

function closeLookupModal(event) {
  if (event && event.target !== event.currentTarget) return;
  document.getElementById( lookupOverlay ).style.display =  none ;
}

function createNewFromLookup() {
  alert( فتح نموذج إنشاء   + (currentLookupType ===  patient  ?  مريض  : currentLookupType ===  doctor  ?  طبيب  :  صنف ) +   جديد...\n\nسيظهر نموذج كامل داخل هذه النافذة. );
}

// ============================================
// شاشة الأصناف
// ============================================
function openItemsScreen() {
  var win = document.getElementById( window-items );
  if (win) {
    win.style.display =  flex ;
    renderItemsTable();
  }
  var taskbarItem = document.getElementById( taskbar-items );
  if (taskbarItem) taskbarItem.style.display =  block ;
  activateWindow( window-items );
}

function renderItemsTable(filteredList) {
  var data = filteredList || drugsDatabase;
  var tbody = document.getElementById( itemsMasterBody );
  if (!tbody) return;
  tbody.innerHTML =   ;

  var lowCount = 0, outCount = 0, totalValue = 0;

  data.forEach(function(drug, index) {
    var stockClass = drug.stock === 0 ?  status-out  : (drug.stock <= drug.minStock ?  status-low  :  status-active );
    var stockText = drug.stock === 0 ?  نفذ  : drug.stock;
    var expiryClass = getExpiryClass(drug.expiry);
    var rxIcon = drug.prescription ?  ✅  :  — ;

    if (drug.stock === 0) outCount++;
    else if (drug.stock <= drug.minStock) lowCount++;
    totalValue += drug.stock * drug.buyPrice;

    var tr = document.createElement( tr );
    tr.innerHTML =
       <td>  + (index + 1) +  </td>  +
       <td>  + drug.code +  </td>  +
       <td style="font-weight:bold;">  + drug.name +  </td>  +
       <td style="color:var(--color-text-secondary);">  + drug.scientific +  </td>  +
       <td>  + drug.barcode +  </td>  +
       <td>  + drug.category +  </td>  +
       <td>  + drug.unit +  </td>  +
       <td>  + formatNumber(drug.buyPrice) +  </td>  +
       <td style="font-weight:bold;color:var(--color-primary);">  + formatNumber(drug.sellPrice) +  </td>  +
       <td class="  + stockClass +  ">  + stockText +  </td>  +
       <td>  + drug.minStock +  </td>  +
       <td class="  + expiryClass +  ">  + drug.expiry +  </td>  +
       <td style="text-align:center;">  + rxIcon +  </td>  +
       <td class="status-active">نشط</td> ;
    tbody.appendChild(tr);
  });

  setText( totalProducts , data.length);
  setText( lowStockCount , lowCount);
  setText( outOfStockCount , outCount);
  setText( inventoryValue , formatNumber(totalValue));
  setText( itemsCount , data.length +   صنف );
}

function filterItemsTable() {
  var search = document.getElementById( itemsGlobalSearch ).value.toLowerCase().trim();
  var category = document.getElementById( itemsCategoryFilter ).value;
  var stockFilter = document.getElementById( itemsStockFilter ).value;

  var filtered = drugsDatabase.filter(function(drug) {
    var matchSearch = !search || drug.name.toLowerCase().includes(search) || drug.scientific.toLowerCase().includes(search) || drug.barcode.includes(search) || drug.code.toLowerCase().includes(search);
    var matchCategory = !category || drug.category === category;
    var matchStock = true;
    if (stockFilter ===  low ) matchStock = drug.stock > 0 && drug.stock <= drug.minStock;
    else if (stockFilter ===  out ) matchStock = drug.stock === 0;
    else if (stockFilter ===  expiring ) matchStock = isExpiringSoon(drug.expiry);
    return matchSearch && matchCategory && matchStock;
  });

  renderItemsTable(filtered);
}

function addNewItem() {
  alert( فتح نموذج إضافة صنف جديد...\n\nالحقول: الاسم التجاري، الاسم العلمي، الباركود، المجموعة، الوحدة، سعر الشراء، سعر البيع، الحد الأدنى، يحتاج وصفة؟ );
}

// ============================================
// إدارة النوافذ
// ============================================
function minimizeWindow(id) {
  var win = document.getElementById(id);
  if (win) win.style.display =  none ;
}

function maximizeWindow(id) {
  var win = document.getElementById(id);
  if (win) win.classList.toggle( maximized );
}

function closeWindow(id) {
  var win = document.getElementById(id);
  if (win) win.style.display =  none ;
  var taskbarId = id.replace( window- ,  taskbar- );
  var taskbarItem = document.getElementById(taskbarId);
  if (taskbarItem && id !==  window-sales ) taskbarItem.style.display =  none ;
}

function activateWindow(id) {
  var win = document.getElementById(id);
  if (win) {
    win.style.display =  flex ;
    win.style.zIndex = 100;
  }
  document.querySelectorAll( .window-frame ).forEach(function(w) {
    if (w.id !== id) w.style.zIndex = 1;
  });
  document.querySelectorAll( .taskbar-item ).forEach(function(t) { t.classList.remove( active ); });
  var taskbarId = id.replace( window- ,  taskbar- );
  var taskbarItem = document.getElementById(taskbarId);
  if (taskbarItem) taskbarItem.classList.add( active );
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

function getExpiryClass(dateStr) {
  if (!dateStr) return   ;
  var expiry = new Date(dateStr);
  var now = new Date();
  var days = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  if (days < 0) return  expiry-red ;
  if (days < 30) return  expiry-red ;
  if (days < 90) return  expiry-orange ;
  if (days < 180) return  expiry-yellow ;
  return  expiry-green ;
}

function isExpiringSoon(dateStr) {
  if (!dateStr) return false;
  var expiry = new Date(dateStr);
  var now = new Date();
  var days = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  return days < 90 && days >= 0;
}

// ============================================
// الإشعارات
// ============================================
function showNotification(message, type) {
  var existing = document.querySelector( .notification );
  if (existing) existing.remove();

  var colors = {  success :  #1B5E20 ,  error :  #B71C1C ,  warning :  #E65100 ,  info :  #0D5AA7  };

  var notification = document.createElement( div );
  notification.className =  notification ;
  notification.style.cssText =
     position:fixed;top:50px;left:50%;transform:translateX(-50%);  +
     background:  + (colors[type] || colors.info) +  ;  +
     color:white;padding:10px 24px;border-radius:3px;  +
     font-family:Arial,sans-serif;font-size:13px;z-index:99999;  +
     box-shadow:0 4px 12px rgba(0,0,0,0.3);direction:rtl; ;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(function() {
    notification.style.opacity =  0 ;
    notification.style.transition =  opacity 0.3s ;
    setTimeout(function() { notification.remove(); }, 300);
  }, 3000);
}

// ============================================
// الساعة
// ============================================
function updateClock() {
  var now = new Date();
  var timeStr = now.toLocaleTimeString( ar-EG , { hour:  2-digit , minute:  2-digit  });
  var dateStr = now.toLocaleDateString( ar-EG , { year:  numeric , month:  2-digit , day:  2-digit  });
  var clockEl = document.getElementById( currentTime );
  if (clockEl) clockEl.textContent =  \uD83D\uDD50   + timeStr +   |   + dateStr;
}

setInterval(updateClock, 1000);
updateClock();

// ============================================
// عند التحميل
// ============================================
document.addEventListener( DOMContentLoaded , function() {
  var firstInput = document.querySelector( .table-input );
  if (firstInput) setTimeout(function() { firstInput.focus(); }, 500);
});
