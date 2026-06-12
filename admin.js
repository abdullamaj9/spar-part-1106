// ── AUTH ──────────────────────────────────────────────
function doLogin(){
  var u=document.getElementById('loginUser').value.trim();
  var p=document.getElementById('loginPass').value;
  var al=document.getElementById('loginAlert');
  if(u==='admin'&&p==='carly2025'){
    sessionStorage.setItem('carly_admin','1');
    document.getElementById('loginWrap').style.display='none';
    document.getElementById('dashWrap').style.display='block';
    initDash();
  } else {
    al.innerHTML='<div style="background:var(--danger-light);border:1px solid #fca5a5;color:#991b1b;padding:.65rem .9rem;border-radius:var(--radius-sm);font-size:.85rem;margin-bottom:.875rem"><i class="ti ti-alert-circle"></i> بيانات الدخول غير صحيحة</div>';
  }
}
function doLogout(){ sessionStorage.removeItem('carly_admin'); location.reload(); }

// ── INIT ──────────────────────────────────────────────
function initDash(){
  renderStats(); renderRecentTable(); renderOrdersTable(); renderLive(); updateNavBadge();
  setInterval(function(){ renderStats(); renderRecentTable(); renderOrdersTable(); renderLive(); updateNavBadge(); }, 8000);
}

document.addEventListener('DOMContentLoaded',function(){
  if(sessionStorage.getItem('carly_admin')){ document.getElementById('loginWrap').style.display='none'; document.getElementById('dashWrap').style.display='block'; initDash(); }
});

// ── NAV ───────────────────────────────────────────────
function showPage(name,el){
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('act');});
  document.querySelectorAll('.s-item').forEach(function(s){s.classList.remove('act');});
  var pg=document.getElementById('page-'+name); if(pg) pg.classList.add('act');
  if(el) el.classList.add('act');
  var titles={dashboard:'الرئيسية',orders:'سجل الطلبات',live:'مراقبة مباشرة',suppliers:'الموردون',settings:'الإعدادات'};
  document.getElementById('pageTitle').textContent=titles[name]||'';
  if(name==='orders') renderOrdersTable();
  if(name==='live')   renderLive();
}

// ── STATS ─────────────────────────────────────────────
function renderStats(){
  var orders=getOrders();
  var pending  =orders.filter(function(o){return o.status==='pending';}).length;
  var priced   =orders.filter(function(o){return o.status==='priced';}).length;
  var confirmed=orders.filter(function(o){return o.status==='confirmed';}).length;
  var revenue  =orders.filter(function(o){return o.bestPrice&&o.status==='confirmed';}).reduce(function(s,o){return s+(o.bestPrice||0);},0);
  setEl('sTotal',   orders.length);
  setEl('sPending', pending);
  setEl('sPriced',  priced);
  setEl('sRevenue', revenue>0?revenue.toLocaleString('ar')+' د':'٠ د');
  setEl('sConfirmed',confirmed);
}
function setEl(id,v){var e=document.getElementById(id);if(e)e.textContent=v;}

function updateNavBadge(){
  var n=getOrders().filter(function(o){return o.status==='pending';}).length;
  var b=document.getElementById('navBadge'); if(b) b.textContent=n;
}

// ── STATUS BADGE ──────────────────────────────────────
function statusBadge(status){
  var map={
    pending:  '<span class="badge badge-blue"><i class="ti ti-clock"></i> قيد الانتظار</span>',
    priced:   '<span class="badge badge-amber"><i class="ti ti-currency-dollar"></i> وصل السعر</span>',
    confirmed:'<span class="badge badge-green"><i class="ti ti-check"></i> مؤكد</span>',
    timeout:  '<span class="badge badge-red"><i class="ti ti-clock-x"></i> انتهى الوقت</span>'
  };
  return map[status]||'<span class="badge badge-gray">'+status+'</span>';
}

function fmtDate(iso){
  if(!iso) return '—';
  var d=new Date(iso);
  return d.toLocaleDateString('ar-AE')+' '+d.toLocaleTimeString('ar-AE',{hour:'2-digit',minute:'2-digit'});
}

// ── TABLE ─────────────────────────────────────────────
function ordersTableHTML(orders, limit){
  if(!orders.length) return '<div class="empty-tbl"><i class="ti ti-package-off"></i><p>لا توجد طلبات بعد</p></div>';
  var rows=(limit?orders.slice(0,limit):orders).map(function(o){
    var dp=o.dealerPrices||{};
    var dStr=Object.keys(dp).map(function(k){return 'د'+k+': '+Number(dp[k]).toLocaleString('ar')+'د';}).join(' | ')||'—';
    return '<tr onclick="openModal(\''+o.id+'\')" style="cursor:pointer">'+
      '<td><div style="font-weight:700">'+(o.part||'—')+'</div><div class="td-meta">'+(CAT_NAMES[o.cat]||o.cat||'')+' · '+(TYPE_NAMES[o.type]||o.type||'')+'</div></td>'+
      '<td><div style="font-weight:600">'+(o.clientName||'—')+'</div><div class="td-meta">'+(o.clientPhone||'')+'</div></td>'+
      '<td><div>'+(o.brand||'')+' '+(o.model||'')+'</div><div class="td-meta">'+(o.year||'')+(o.chassis?' · '+o.chassis:'')+'</div></td>'+
      '<td style="font-size:.78rem;color:var(--muted)">'+dStr+'</td>'+
      '<td>'+(o.bestPrice?'<strong style="color:var(--success);font-size:1rem">'+Number(o.bestPrice).toLocaleString('ar')+' د</strong>':'<span style="color:var(--muted)">—</span>')+'</td>'+
      '<td>'+(o.payMethod?'<span class="badge badge-brand">'+(o.payMethod==='online'?'💳 أونلاين':'💵 كاش')+'</span>':'—')+'</td>'+
      '<td>'+statusBadge(o.status)+'</td>'+
      '<td style="color:var(--muted);font-size:.75rem">'+fmtDate(o.createdAt)+'</td>'+
    '</tr>';
  }).join('');
  return '<table><thead><tr><th>القطعة</th><th>العميل</th><th>السيارة</th><th>أسعار الديلرين</th><th>أفضل سعر</th><th>الدفع</th><th>الحالة</th><th>التاريخ</th></tr></thead><tbody>'+rows+'</tbody></table>';
}

function renderRecentTable(){ var e=document.getElementById('recentTableWrap'); if(e) e.innerHTML=ordersTableHTML(getOrders(),5); }
function renderLive(){ var e=document.getElementById('liveWrap'); if(e) e.innerHTML=ordersTableHTML(getOrders().slice(0,20)); }

function renderOrdersTable(){
  var el=document.getElementById('ordersTableWrap'); if(!el)return;
  var orders=getOrders();
  var sf=document.getElementById('statusFilter')?document.getElementById('statusFilter').value:'';
  var tf=document.getElementById('typeFilter')?document.getElementById('typeFilter').value:'';
  var search=(document.querySelector('.filters-bar input')||{}).value||'';
  if(sf) orders=orders.filter(function(o){return o.status===sf;});
  if(tf) orders=orders.filter(function(o){return o.type===tf;});
  if(search) orders=orders.filter(function(o){return (o.clientName||'').includes(search)||(o.part||'').includes(search)||(o.brand||'').includes(search)||(o.clientPhone||'').includes(search);});
  el.innerHTML=ordersTableHTML(orders);
}

function applyFilter(){ renderOrdersTable(); }
function refreshOrders(){ renderStats();renderRecentTable();renderOrdersTable();renderLive();updateNavBadge();showToast('تم التحديث','ok'); }

// ── MODAL ─────────────────────────────────────────────
function openModal(id){
  var orders=getOrders();
  var o=orders.find(function(x){return x.id===id;}); if(!o)return;
  document.getElementById('modalTitle').textContent='تفاصيل الطلب — '+o.id;

  var dp=o.dealerPrices||{};
  var dn=o.dealerNotes||{};

  // بناء قسم أسعار الديلرين
  var dealerHTML='<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:var(--radius);padding:1rem;margin-bottom:1.25rem">'+
    '<div style="font-size:.82rem;font-weight:700;color:#92400e;margin-bottom:.75rem"><i class="ti ti-currency-dollar"></i> أسعار الديلرين — داخلي فقط</div>';

  DEALERS.forEach(function(d){
    var hasPrice=dp[d.id]&&dp[d.id]>0;
    var priceURL=buildDealerPriceURL(o.id, d.id);
    dealerHTML+=
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:.625rem .875rem;background:#fff;border-radius:8px;margin-bottom:.5rem;border:1px solid '+(hasPrice?'var(--success)':'var(--border)')+'">'+
        '<div>'+
          '<div style="font-size:.85rem;font-weight:700">'+d.name+'</div>'+
          (hasPrice?'<div style="font-size:1.1rem;font-weight:700;color:var(--success)">'+Number(dp[d.id]).toLocaleString('ar')+' درهم</div>':'<div style="font-size:.8rem;color:var(--muted)">لم يرسل سعراً بعد</div>')+
          (dn[d.id]?'<div style="font-size:.75rem;color:var(--muted)">'+dn[d.id]+'</div>':'')+
        '</div>'+
        (hasPrice
          ?'<span class="badge badge-green"><i class="ti ti-check"></i> وصل</span>'
          :'<a href="'+priceURL+'" target="_blank" class="btn btn-outline btn-sm"><i class="ti ti-link"></i> رابط التسعير</a>')+
      '</div>';
  });
  dealerHTML+='</div>';

  // أفضل سعر
  var bestHTML=o.bestPrice
    ?'<div style="background:var(--success-light);border:2px solid var(--success);border-radius:var(--radius);padding:1rem;text-align:center;margin-bottom:1.25rem">'+
        '<div style="font-size:.8rem;color:var(--success);font-weight:700;margin-bottom:.25rem">✅ أفضل سعر في السوق</div>'+
        '<div style="font-size:2.2rem;font-weight:700;color:var(--success)">'+Number(o.bestPrice).toLocaleString('ar')+' درهم</div>'+
      '</div>'
    :'';

  var waText=encodeURIComponent('مرحباً '+(o.clientName||'')+'\n\nبخصوص طلبك رقم '+o.id+'\nالقطعة: '+o.part+'\n'+(o.bestPrice?'أفضل سعر: '+o.bestPrice+' درهم':''));
  var waLink='https://wa.me/971'+((o.clientPhone||'').replace(/^0/,'').replace(/\s/g,''))+'?text='+waText;

  document.getElementById('modalBody').innerHTML=
    '<div class="info-grid">'+
      infoItem('رقم الطلب', o.id)+
      infoItem('الحالة', statusBadge(o.status))+
      infoItem('اسم العميل', o.clientName||'—')+
      infoItem('هاتف العميل', o.clientPhone||'—')+
      infoItem('الإمارة', o.clientEmirate||'—')+
      infoItem('القطعة', o.part||'—')+
      infoItem('القسم', CAT_NAMES[o.cat]||o.cat||'—')+
      infoItem('النوع', TYPE_NAMES[o.type]||o.type||'—')+
      infoItem('السيارة', (o.brand||'')+' '+(o.model||'')+' '+(o.year||''))+
      (o.chassis?infoItem('الشاسي','<span style="font-family:monospace">'+o.chassis+'</span>'):'')+
      (o.payMethod?infoItem('طريقة الدفع',o.payMethod==='online'?'💳 أونلاين':'💵 كاش'):'')+
      (o.confirmedAt?infoItem('وقت التأكيد',fmtDate(o.confirmedAt)):'')+
      infoItem('تاريخ الطلب', fmtDate(o.createdAt))+
      (o.notes?'<div class="info-item" style="grid-column:1/-1"><div class="info-label">ملاحظات</div><div class="info-val">'+o.notes+'</div></div>':'')+
    '</div>'+
    dealerHTML+
    bestHTML+
    '<div style="display:flex;gap:.75rem;flex-wrap:wrap">'+
      '<a href="'+waLink+'" target="_blank" style="background:#25D366;color:white;display:inline-flex;align-items:center;gap:.5rem;padding:.65rem 1.25rem;border-radius:var(--radius-sm);font-weight:600;font-size:.875rem;text-decoration:none"><i class="ti ti-brand-whatsapp"></i> تواصل مع العميل</a>'+
      (o.status!=='confirmed'?'<button class="btn btn-brand" onclick="markComplete(\''+o.id+'\')"><i class="ti ti-check"></i> تأكيد الطلب</button>':'')+
      '<button class="btn btn-outline" onclick="deleteOrder(\''+o.id+'\')"><i class="ti ti-trash" style="color:var(--danger)"></i> حذف</button>'+
    '</div>';

  document.getElementById('modalOverlay').classList.remove('hidden');
}

function infoItem(lbl, val){
  return '<div class="info-item"><div class="info-label">'+lbl+'</div><div class="info-val">'+val+'</div></div>';
}

function closeModal(e){
  if(!e||e.target===document.getElementById('modalOverlay'))
    document.getElementById('modalOverlay').classList.add('hidden');
}

function markComplete(id){
  var orders=getOrders();
  var idx=orders.findIndex(function(o){return o.id===id;}); if(idx<0)return;
  orders[idx].status='confirmed'; orders[idx].confirmedAt=new Date().toISOString();
  localStorage.setItem('carly_orders',JSON.stringify(orders));
  closeModal(); refreshOrders(); showToast('تم تأكيد الطلب','ok');
}

function deleteOrder(id){
  if(!confirm('هل تريد حذف هذا الطلب؟')) return;
  localStorage.setItem('carly_orders',JSON.stringify(getOrders().filter(function(o){return o.id!==id;})));
  closeModal(); refreshOrders(); showToast('تم الحذف','ok');
}

// ── EXPORT CSV ────────────────────────────────────────
function exportCSV(){
  var orders=getOrders();
  if(!orders.length){showToast('لا توجد طلبات','err');return;}
  var headers=['رقم الطلب','العميل','الهاتف','الإمارة','القطعة','القسم','النوع','الماركة','الموديل','السنة','الشاسي','سعر ديلر 1','سعر ديلر 2','أفضل سعر','طريقة الدفع','الحالة','التاريخ'];
  var rows=orders.map(function(o){
    var dp=o.dealerPrices||{};
    return [o.id,o.clientName,o.clientPhone,o.clientEmirate,o.part,CAT_NAMES[o.cat]||o.cat,TYPE_NAMES[o.type]||o.type,o.brand,o.model,o.year,o.chassis,dp[1]||'',dp[2]||'',o.bestPrice||'',o.payMethod||'',o.status,fmtDate(o.createdAt)];
  });
  var csv=[headers].concat(rows).map(function(r){return r.map(function(v){return '"'+String(v||'').replace(/"/g,'""')+'"';}).join(',');}).join('\n');
  var blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');a.href=url;a.download='carly-orders-'+new Date().toISOString().slice(0,10)+'.csv';a.click();
  URL.revokeObjectURL(url); showToast('تم التصدير','ok');
}

function saveSettings(){ showToast('تم حفظ الإعدادات','ok'); }

function showToast(msg,type){
  var t=document.getElementById('toast');
  t.textContent=msg; t.className='toast show '+(type||'');
  setTimeout(function(){t.className='toast';},3000);
}

// بناء رابط صفحة التسعير (للاستخدام في المودال)
function buildDealerPriceURL(orderId, dealerId){
  var base=window.location.origin+window.location.pathname.replace(/[^/]*$/,'');
  return base+'price.html?order='+orderId+'&dealer='+dealerId;
}
