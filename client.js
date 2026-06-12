// ── إعدادات API ───────────────────────────────────────
// غيّر هذا الرابط إلى عنوان السيرفر بعد رفعه (مثال: https://api.carly.ae)
var API_BASE = 'https://api.carly.ae';

// ── STATE ─────────────────────────────────────────────
var ORDER = {
  cat: null, type: null, part: null, partOther: '',
  brand: '', model: '', year: '', chassis: '',
  clientName: '', clientPhone: '', clientEmirate: '', notes: '',
  payMethod: ''
};

var CAT_LIST = ['body','engine','brake','electric','ac','tires'];
var EMIRATES = ['دبي','أبوظبي','الشارقة','عجمان','رأس الخيمة','الفجيرة','أم القيوين'];

var waitTimer  = null;
var tipTimer   = null;
var waitSecondsLeft = 90;

// ── INIT ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function(){
  renderCatStep();
  goToStep(1);
});

// ── STEP NAVIGATION ───────────────────────────────────
function goToStep(n){
  document.querySelectorAll('.step').forEach(function(s){ s.classList.remove('act'); });
  var el = document.getElementById('step-'+n);
  if(el) el.classList.add('act');
  updateProgress(n);
  window.scrollTo({top:0, behavior:'smooth'});
}

function updateProgress(n){
  var bar = document.getElementById('progressBar');
  if(!bar) return;
  var totalSteps = 6; // 1 cat, 2 type, 3 part, 4 car, 5 client info, 6 wait/result
  var pct = Math.min(100, Math.round((n/totalSteps)*100));
  bar.style.width = pct+'%';
}

// ── STEP 1: CATEGORY ──────────────────────────────────
function renderCatStep(){
  var wrap = document.getElementById('catGrid');
  wrap.innerHTML = CAT_LIST.map(function(cat){
    return '<div class="opt-card" onclick="selectCat(\''+cat+'\')">'+
      '<div class="opt-icon">'+CAT_DEFAULT_ICON[cat]+'</div>'+
      '<div class="opt-title">'+CAT_NAMES[cat]+'</div>'+
    '</div>';
  }).join('');
}

function selectCat(cat){
  ORDER.cat = cat;
  ORDER.part = null; ORDER.partOther = '';
  goToStep(2);
  renderTypeStep();
}

// ── STEP 2: TYPE (جديد أصلي / جديد تجاري / مستعمل) ────
function renderTypeStep(){
  var wrap = document.getElementById('typeGrid');
  var types = [
    {id:'original',   icon:'ti-certificate', desc:'قطعة وكالة بضمان '+WARRANTY_INFO.original},
    {id:'commercial', icon:'ti-package',     desc:'بديل جديد عالي الجودة، ضمان '+WARRANTY_INFO.commercial},
    {id:'used',       icon:'ti-refresh',     desc:'سعر اقتصادي، ضمان '+WARRANTY_INFO.used}
  ];
  wrap.innerHTML = types.map(function(t){
    return '<div class="opt-card opt-card-row" onclick="selectType(\''+t.id+'\')">'+
      '<div class="opt-icon"><i class="ti '+t.icon+'"></i></div>'+
      '<div>'+
        '<div class="opt-title">'+TYPE_NAMES[t.id]+'</div>'+
        '<div class="opt-desc">'+t.desc+' · التسليم خلال '+DELIVERY_TIME[t.id]+'</div>'+
      '</div>'+
    '</div>';
  }).join('');
}

function selectType(type){
  ORDER.type = type;
  goToStep(3);
  renderPartStep();
}

// ── STEP 3: PART ──────────────────────────────────────
function renderPartStep(){
  document.getElementById('partCatLabel').textContent = CAT_NAMES[ORDER.cat];
  var wrap = document.getElementById('partGrid');
  var icons = PART_ICONS[ORDER.cat] || {};
  var parts = PARTS_DATA[ORDER.cat] || [];

  wrap.innerHTML = parts.map(function(p){
    var icon = icons[p] || CAT_DEFAULT_ICON[ORDER.cat];
    return '<div class="part-chip" data-part="'+p+'" onclick="selectPart(this,\''+p.replace(/'/g,"\\'")+'\')">'+
      '<span class="part-chip-icon">'+icon+'</span>'+
      '<span>'+p+'</span>'+
    '</div>';
  }).join('');

  document.getElementById('partOtherWrap').style.display = 'none';
  document.getElementById('partOtherInp').value = '';
  document.getElementById('btnPartNext').disabled = true;
}

function selectPart(el, part){
  document.querySelectorAll('.part-chip').forEach(function(c){ c.classList.remove('sel'); });
  el.classList.add('sel');
  ORDER.part = part;

  var otherWrap = document.getElementById('partOtherWrap');
  if(part === 'أخرى'){
    otherWrap.style.display = 'block';
    document.getElementById('partOtherInp').focus();
    checkPartOther();
  } else {
    otherWrap.style.display = 'none';
    ORDER.partOther = '';
    document.getElementById('btnPartNext').disabled = false;
  }
}

function checkPartOther(){
  var v = document.getElementById('partOtherInp').value.trim();
  ORDER.partOther = v;
  document.getElementById('btnPartNext').disabled = (ORDER.part === 'أخرى' && !v);
}

function partStepNext(){
  goToStep(4);
  renderCarStep();
}

// ── STEP 4: CAR DETAILS ───────────────────────────────
function renderCarStep(){
  var brandSel = document.getElementById('carBrand');
  brandSel.innerHTML = '<option value="">اختر الماركة</option>' +
    Object.keys(CAR_MODELS).map(function(b){ return '<option value="'+b+'">'+b+'</option>'; }).join('');

  document.getElementById('carModel').innerHTML = '<option value="">اختر الموديل أولاً الماركة</option>';
  document.getElementById('carModel').disabled = true;

  // سنوات: من السنة الحالية إلى ١٩٩٠
  var yearSel = document.getElementById('carYear');
  var thisYear = new Date().getFullYear();
  var yOpts = '<option value="">اختر السنة</option>';
  for(var y = thisYear+1; y >= 1990; y--){ yOpts += '<option value="'+y+'">'+y+'</option>'; }
  yearSel.innerHTML = yOpts;

  // إظهار/إخفاء حقل الشاسي حسب النوع
  var chassisGroup = document.getElementById('chassisGroup');
  if(ORDER.type === 'used'){
    chassisGroup.style.display = 'none';
    document.getElementById('carChassis').value = '';
    document.getElementById('carChassis').removeAttribute('required');
  } else {
    chassisGroup.style.display = 'block';
    document.getElementById('carChassis').setAttribute('required','required');
  }

  // إعادة تعيين القيم
  document.getElementById('carBrand').value = '';
  document.getElementById('carYear').value = '';
  document.getElementById('carChassis').value = '';

  validateCarStep();
}

function onBrandChange(){
  var brand = document.getElementById('carBrand').value;
  var modelSel = document.getElementById('carModel');
  if(!brand){
    modelSel.innerHTML = '<option value="">اختر الماركة أولاً</option>';
    modelSel.disabled = true;
  } else {
    var models = CAR_MODELS[brand] || [];
    modelSel.innerHTML = '<option value="">اختر الموديل</option>' +
      models.map(function(m){ return '<option value="'+m+'">'+m+'</option>'; }).join('');
    modelSel.disabled = false;
  }
  validateCarStep();
}

function validateCarStep(){
  var brand = document.getElementById('carBrand').value;
  var model = document.getElementById('carModel').value;
  var year  = document.getElementById('carYear').value;
  var chassis = document.getElementById('carChassis').value.trim();

  var missing = [];
  if(!brand) missing.push('الماركة');
  if(!model) missing.push('الموديل');
  if(!year)  missing.push('السنة');
  if(ORDER.type !== 'used' && chassis.length < 5) missing.push('رقم الشاسي (٥ أحرف على الأقل)');

  var ok = missing.length === 0;
  document.getElementById('btnCarNext').disabled = !ok;

  var hint = document.getElementById('carStepHint');
  if(hint){
    hint.textContent = ok ? '' : 'أكمل الحقول التالية: '+missing.join('، ');
  }
}

function carStepNext(){
  ORDER.brand   = document.getElementById('carBrand').value;
  ORDER.model   = document.getElementById('carModel').value;
  ORDER.year    = document.getElementById('carYear').value;
  ORDER.chassis = (ORDER.type === 'used') ? '' : document.getElementById('carChassis').value.trim();
  goToStep(5);
}

// ── STEP 5: CLIENT INFO ───────────────────────────────
function renderClientStep(){
  var emSel = document.getElementById('clientEmirate');
  if(emSel.options.length <= 1){
    emSel.innerHTML = '<option value="">اختر الإمارة</option>' +
      EMIRATES.map(function(e){ return '<option value="'+e+'">'+e+'</option>'; }).join('');
  }
}
renderClientStep();

function validateClientStep(){
  var name  = document.getElementById('clientName').value.trim();
  var phone = document.getElementById('clientPhone').value.trim().replace(/\s/g,'');
  var emirate = document.getElementById('clientEmirate').value;

  var missing = [];
  if(name.length < 2) missing.push('الاسم');
  if(!/^0?5\d{8}$/.test(phone)) missing.push('رقم الهاتف (مثال: 050xxxxxxx)');
  if(!emirate) missing.push('الإمارة');

  var ok = missing.length === 0;
  document.getElementById('btnSubmitOrder').disabled = !ok;

  var hint = document.getElementById('clientStepHint');
  if(hint){
    hint.textContent = ok ? '' : 'أكمل الحقول التالية: '+missing.join('، ');
  }
}

function submitOrder(){
  ORDER.clientName    = document.getElementById('clientName').value.trim();
  ORDER.clientPhone   = document.getElementById('clientPhone').value.trim().replace(/\s/g,'');
  ORDER.clientEmirate = document.getElementById('clientEmirate').value;
  ORDER.notes         = document.getElementById('clientNotes').value.trim();
  ORDER.payMethod     = document.querySelector('input[name="payMethod"]:checked').value;

  var partName = (ORDER.part === 'أخرى') ? ORDER.partOther : ORDER.part;

  var payload = {
    cat: ORDER.cat,
    type: ORDER.type,
    part: partName,
    brand: ORDER.brand,
    model: ORDER.model,
    year: ORDER.year,
    chassis: ORDER.chassis,
    clientName: ORDER.clientName,
    clientPhone: ORDER.clientPhone,
    clientEmirate: ORDER.clientEmirate,
    notes: ORDER.notes,
    payMethod: ORDER.payMethod
  };

  var btn = document.getElementById('btnSubmitOrder');
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader-2"></i> جاري الإرسال...';

  fetch(API_BASE + '/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(function(res){ return res.json(); })
  .then(function(data){
    if(data.error){
      btn.disabled = false;
      btn.innerHTML = '<i class="ti ti-send"></i> إرسال الطلب';
      alert('حدث خطأ: '+data.error);
      return;
    }
    ORDER.id = data.order.id;
    goToStep(6);
    startWaitScreen();
  })
  .catch(function(err){
    btn.disabled = false;
    btn.innerHTML = '<i class="ti ti-send"></i> إرسال الطلب';
    alert('تعذّر الاتصال بالسيرفر. تحقق من الإنترنت وحاول مجدداً.');
  });
}

// ── STEP 6: WAIT SCREEN ───────────────────────────────
function startWaitScreen(){
  waitSecondsLeft = 90;
  show6('waiting');

  document.getElementById('waitPartName').textContent =
    (ORDER.part === 'أخرى' ? ORDER.partOther : ORDER.part) || '';
  document.getElementById('waitCarName').textContent =
    (ORDER.brand+' '+ORDER.model+' '+ORDER.year);

  renderTip();
  tipTimer = setInterval(renderTip, 15000);

  updateWaitTimerDisplay();
  waitTimer = setInterval(function(){
    waitSecondsLeft--;
    updateWaitTimerDisplay();

    // تحقق من توفر السعر كل 3 ثواني (وعند آخر ثانية)
    if(waitSecondsLeft % 3 === 0 || waitSecondsLeft <= 0){
      checkOrderStatus();
    }
  }, 1000);
}

function checkOrderStatus(){
  fetch(API_BASE + '/api/orders/' + ORDER.id)
    .then(function(res){ return res.json(); })
    .then(function(order){
      if(!order || order.error) return;

      if(order.status === 'priced' && order.bestPrice){
        clearInterval(waitTimer); clearInterval(tipTimer);
        showResult(order);
        return;
      }

      if(order.status === 'no_price' || waitSecondsLeft <= 0){
        clearInterval(waitTimer); clearInterval(tipTimer);
        if(order.bestPrice){ showResult(order); }
        else { showNoPrice(); }
      }
    })
    .catch(function(){
      // تجاهل أخطاء الشبكة المؤقتة أثناء الاستطلاع
      if(waitSecondsLeft <= 0){
        clearInterval(waitTimer); clearInterval(tipTimer);
        showNoPrice();
      }
    });
}

function updateWaitTimerDisplay(){
  var el = document.getElementById('waitTimerVal');
  if(el) el.textContent = waitSecondsLeft;
  var ring = document.getElementById('waitProgressRing');
  if(ring){
    var pct = (waitSecondsLeft/90);
    var circumference = 2*Math.PI*54;
    ring.style.strokeDashoffset = circumference * (1-pct);
  }
}

var TIP_IDX = 0;
function renderTip(){
  var tips = TIPS_DATA[ORDER.cat] || [];
  if(!tips.length) return;
  var tipEl = document.getElementById('tipText');
  tipEl.style.opacity = 0;
  setTimeout(function(){
    tipEl.textContent = tips[TIP_IDX % tips.length];
    tipEl.style.opacity = 1;
    TIP_IDX++;
  }, 250);
}

function showNoPrice(){
  show6('noPrice');
  var msg = encodeURIComponent('مرحباً، طلبت قطعة "'+(ORDER.part==='أخرى'?ORDER.partOther:ORDER.part)+'" برقم طلب '+ORDER.id+' ولم يصلني السعر بعد.');
  document.getElementById('resultWaLinkLate').href = 'https://wa.me/971'+CARLY_PHONE.replace(/^0/,'')+'?text='+msg;
}

function showResult(order){
  show6('result');
  document.getElementById('resultPrice').textContent = Number(order.bestPrice).toLocaleString('ar')+' درهم';
  document.getElementById('resultPartName').textContent = order.part || '';

  // واتساب كارلي فقط — بدون أي ذكر للموردين
  var msg = encodeURIComponent(
    'مرحباً، طلبت قطعة "'+order.part+'" برقم طلب '+order.id+'\n'+
    'أفضل سعر: '+order.bestPrice+' درهم\n'+
    'أرغب في إتمام الطلب.'
  );
  document.getElementById('resultWaLink').href = 'https://wa.me/971'+CARLY_PHONE.replace(/^0/,'')+'?text='+msg;

  // زر الدفع
  var payBtn = document.getElementById('resultPayBtn');
  if(order.payMethod === 'online'){
    payBtn.style.display = 'inline-flex';
    payBtn.href = PAY_LINK_BASE+order.id;
  } else {
    payBtn.style.display = 'none';
  }
}

function show6(which){
  ['waiting','noPrice','result'].forEach(function(s){
    var el = document.getElementById('sub6-'+s);
    if(el) el.style.display = (s===which) ? 'block' : 'none';
  });
}

// ── BACK BUTTONS ──────────────────────────────────────
function goBack(step){ goToStep(step); }

function startOver(){
  ORDER = {
    cat: null, type: null, part: null, partOther: '',
    brand: '', model: '', year: '', chassis: '',
    clientName: '', clientPhone: '', clientEmirate: '', notes: '',
    payMethod: ''
  };
  document.getElementById('clientName').value = '';
  document.getElementById('clientPhone').value = '';
  document.getElementById('clientEmirate').value = '';
  document.getElementById('clientNotes').value = '';
  goToStep(1);
}
