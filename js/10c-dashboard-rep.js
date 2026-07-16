'use strict';

/* ================================================================
   SECTION 10c: PAGE — DASHBOARD (REP / FOLLOWER)
   ================================================================ */

  function _formatPhoneCall(p) {
    var d = p.replace(/[^0-9]/g, '');
    if (d.startsWith('20')) return '+' + d;
    if (d.startsWith('0')) return '+20' + d.slice(1);
    return '+20' + d;
  }

  function _formatPhoneWA(p) {
    var d = p.replace(/[^0-9]/g, '');
    if (d.startsWith('20')) return d;
    if (d.startsWith('0')) return '20' + d.slice(1);
    return '20' + d;
  }

  function _dailyToSortVal(d) {
    var parts = d.split('/');
    if (parts.length !== 3) return 0;
    var day = parseInt(parts[0], 10) || 0;
    var month = parseInt(parts[1], 10) || 0;
    var year = parseInt(parts[2], 10) || 0;
    return year * 10000 + month * 100 + day;
  }

  function _isFav(id) {
    var raw = localStorage.getItem('repFavorites');
    var favs = raw ? JSON.parse(raw) : {};
    return !!favs[id];
  }

  function _toggleFav(id) {
    var raw = localStorage.getItem('repFavorites');
    var favs = raw ? JSON.parse(raw) : {};
    if (favs[id]) delete favs[id]; else favs[id] = true;
    localStorage.setItem('repFavorites', JSON.stringify(favs));
  }

  function _removeFav(id) {
    var raw = localStorage.getItem('repFavorites');
    if (!raw) return;
    var favs = JSON.parse(raw);
    if (favs[id]) { delete favs[id]; localStorage.setItem('repFavorites', JSON.stringify(favs)); }
  }

  function _getFollowerKey(suffix) {
    var u = localStorage.getItem('user');
    var username = 'unknown';
    if (u) { try { var p = JSON.parse(u); username = p.username || p.id || 'unknown'; } catch(e) {} }
    return 'follower_' + username + '_' + suffix;
  }

  function _buildWAMsg(s) {
    var phoneStr = (s['الهاتف'] || '') + (s['هاتف بديل'] ? ' / ' + s['هاتف بديل'] : '');
    return encodeURIComponent(
      'مساء الخير يافندم حضرتك ليك معايا اوردر \n' +
      '\uD83E\uDE99 كود الشحنة: ' + (s['كود الشحنة'] || '-') + '\n' +
      '\uD83D\uDC64 اسم العميل: ' + (s['اسم العميل'] || '-') + '\n' +
      '\uD83D\uDCCD العنوان: ' + (s['العنوان'] || '-') + '\n' +
      '\uD83D\uDCE6 الزون: ' + (s['الزون'] || '-') + '\n' +
      '\uD83D\uDCE6 المنتج: ' + (s['المنتج'] || '-') + '\n' +
      '\uD83D\uDCDE الهاتف: ' + (phoneStr || '-') + '\n' +
      '\uD83D\uDCB0 المبلغ: ' + enNum(s['المبلغ']) + ' ج\n' +
      '\uD83C\uDFE2 الراسل: ' + (s['الراسل'] || '-') + '\n' +
      '\nبرجاء الاستعداد لاستلام الشحنة اليوم '
    );
  }

  function _copyDetails(s) {
    var details =
      '\uD83E\uDE99 كود الشحنة: ' + enNum(s['كود الشحنة']) + '\n' +
      '\uD83D\uDC64 العميل: ' + enNum(s['اسم العميل']) + '\n' +
      '\uD83D\uDCDE الهاتف: ' + enNum(s['الهاتف']) + (s['هاتف بديل'] ? ' / ' + enNum(s['هاتف بديل']) : '') + '\n' +
      '\uD83D\uDCCD العنوان: ' + enNum(s['العنوان']) + '\n' +
      '\uD83D\uDCE6 الزون: ' + enNum(s['الزون']) + '\n' +
      '\uD83D\uDCB0 المبلغ: ' + enNum(s['المبلغ']) + ' ج\n' +
      '\uD83D\uDCB5 المدفوع: ' + enNum(s['المدفوع']) + '\n' +
      '\uD83D\uDCCB الحالة: ' + enNum(s['الحالة']) + '\n' +
      '\uD83C\uDFE2 الراسل: ' + enNum(s['الراسل']) + '\n' +
      '\uD83D\uDC64 المندوب: ' + enNum(s['المندوب']);
    navigator.clipboard.writeText(details).then(function() { Toast.success('تم نسخ تفاصيل الشحنة'); }).catch(function() { Toast.error('فشل النسخ'); });
  }

  function _normalizeStatus(s) {
    var st = (s['الحالة'] || '').trim();
    if (st === 'إلغاء') st = 'الغاء';
    return st;
  }

  function _checkNotifications(newShipments) {
    if (!newShipments.length) return;
    var saved = localStorage.getItem('repNotifSnapshot');
    var snapshot = saved ? JSON.parse(saved) : {};
    var now = new Date();
    var timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    var newNotifs = [];
    newShipments.forEach(function(s) {
      var id = String(s.id || s.m);
      var oldSt = snapshot[id] || '';
      var newSt = s['الحالة'] || '';
      var cust = s['اسم العميل'] || s['كود الشحنة'] || id;
      if (oldSt && oldSt !== newSt) {
        newNotifs.unshift({ title: 'تحديث حالة: ' + cust, desc: oldSt + ' ← ' + newSt + ' • ' + timeStr });
      } else if (!D.isInitialNotif && !oldSt && newSt) {
        newNotifs.unshift({ title: 'شحنة جديدة: ' + cust, desc: 'الحالة: ' + newSt + ' • ' + timeStr });
      }
    });
    if (newNotifs.length) { D.notifications = newNotifs.concat(D.notifications).slice(0, 50); }
    var newSnap = {};
    newShipments.forEach(function(s) { newSnap[String(s.id || s.m)] = s['الحالة'] || ''; });
    localStorage.setItem('repNotifSnapshot', JSON.stringify(newSnap));
    D.isInitialNotif = false;
  }

  async function _updateStatus(shipment, status, extra) {
    if (_isArchived(shipment)) { Toast.error('لا يمكن تعديل شحنة مؤرشفة'); return; }
    try {
      var payload = Object.assign({ 'الحالة': status }, extra || {});
      if (status === 'تم' && !payload['المدفوع']) payload['المدفوع'] = shipment['المبلغ'] || '0';
      if (Auth.user && Auth.user.id === 'demo-rep') {
        var stored = localStorage.getItem('demo_shipments');
        var list = stored ? JSON.parse(stored) : [];
        var idx = list.findIndex(function(s) { return s.m === shipment.m; });
        if (idx !== -1) {
          Object.assign(list[idx], payload);
          list[idx]['تاريخ التحديث'] = formatDate(new Date());
          list[idx]['اسم الموظف'] = Auth.user.username;
          localStorage.setItem('demo_shipments', JSON.stringify(list));
        }
        Toast.success('تم تحديث الحالة');
        _removeFav(String(shipment.id || shipment.m));
        _refreshDashboard();
        return;
      }
      var tables = getTableNames();
      var result = shipment.id
        ? await supabaseClient.from(tables.invoices).update(payload).eq('id', shipment.id)
        : await supabaseClient.from(tables.invoices).update(payload).eq('m', shipment.m);
      if (result.error) throw result.error;
      Toast.success('تم تحديث الحالة');
      _removeFav(String(shipment.id || shipment.m));
      _refreshDashboard();
    } catch(e) { Toast.error('حدث خطأ أثناء التحديث'); console.error(e); }
  }

  function _showWAAppChoiceFollowup(shipment) {
    var msg = _buildWAMsg(shipment);
    var content = '<div class="grid grid-cols-1 gap-2">';
    content += '<button data-wa-app="regular" class="block w-full p-4 rounded-xl border-2 text-center font-bold text-lg border-emerald-400 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 cursor-pointer">واتساب</button>';
    content += '<button data-wa-app="business" class="block w-full p-4 rounded-xl border-2 text-center font-bold text-lg border-purple-400 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 cursor-pointer">واتساب أعمال</button>';
    content += '</div>';
    _showDialog('اختر تطبيق واتساب', content);
    document.querySelectorAll('[data-wa-app]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var app = btn.getAttribute('data-wa-app');
        _closeDialog();
        _openFollowupWhatsApp(app, msg);
      });
    });
  }

  function _openFollowupWhatsApp(app, msg) {
    navigator.clipboard.writeText(msg).then(function() {
      Toast.success('تم نسخ رسالة المتابعة، الصقها بعد اختيار المحادثة');
    }).catch(function() {});
    var isAndroid = /android/i.test(navigator.userAgent);
    if (isAndroid) {
      var pkg = app === 'business' ? 'com.whatsapp.w4b' : 'com.whatsapp';
      window.location.href = 'intent://send/#Intent;package=' + pkg + ';scheme=whatsapp;end';
    } else {
      window.open('https://api.whatsapp.com/send', '_blank');
    }
  }

  function _doFollowup(shipment) {
    var sid = String(shipment.id || shipment.m);
    var sent = _getFollowupsSent();
    sent[sid] = true;
    var key = (Auth.user && Auth.user.role === 'follower') ? _getFollowerKey('sent') : 'repFollowupsSent';
    localStorage.setItem(key, JSON.stringify(sent));
    var dismissed = _getFollowupsDismissed();
    dismissed[sid] = true;
    var key2 = (Auth.user && Auth.user.role === 'follower') ? _getFollowerKey('dismissed') : 'repFollowupsDismissed';
    localStorage.setItem(key2, JSON.stringify(dismissed));
    _rerenderDashboard();
    var phones = [shipment['الهاتف'] || '', shipment['هاتف بديل'] || ''].filter(Boolean);
    if (!phones.length) { Toast.error('لا يوجد رقم هاتف للمتابعة'); return; }
    _showWAAppChoiceFollowup(shipment);
  }

  function _dismissFollowup(shipment) {
    var sid = String(shipment.id || shipment.m);
    var dismissed = _getFollowupsDismissed();
    dismissed[sid] = true;
    var key = (Auth.user && Auth.user.role === 'follower') ? _getFollowerKey('dismissed') : 'repFollowupsDismissed';
    localStorage.setItem(key, JSON.stringify(dismissed));
    _rerenderDashboard();
  }

  async function _refreshDashboard() {
    await _fetchShipments(true);
    _renderDashboardMain();
  }

  function _rerenderDashboard() {
    _renderDashboardMain();
  }

  function _startPolling() {
    if (D.pollInterval) clearInterval(D.pollInterval);
    if (D.notifPollInterval) clearInterval(D.notifPollInterval);
    var user = Auth.user;
    if (!user || user.role === 'admin') return;
    D.pollInterval = setInterval(async function() {
      try {
        var tables = getTableNames();
        var ors = [];
        if (user.username) ors.push('المندوب.eq."' + user.username.trim() + '"');
        if (user.phone) ors.push('المندوب.eq."' + user.phone.trim() + '"');
        if (user.email) ors.push('المندوب.eq."' + user.email.trim() + '"');
        if (!ors.length) return;
        var result = await supabaseClient.from(tables.invoices).select('*').or(ors.join(','));
        if (result.data) {
          var saved = localStorage.getItem('repNotifSnapshot');
          var snapshot = saved ? JSON.parse(saved) : {};
          var now = new Date();
          var timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
          var newNotifs = [];
          result.data.forEach(function(s) {
            var id = String(s.id);
            var oldSt = snapshot[id] || '';
            var newSt = s['الحالة'] || '';
            var cust = s['اسم العميل'] || s['كود الشحنة'] || id;
            if (oldSt && oldSt !== newSt) newNotifs.unshift({ title: 'تحديث حالة: ' + cust, desc: oldSt + ' ← ' + newSt + ' • ' + timeStr });
          });
          if (newNotifs.length) {
            D.notifications = newNotifs.concat(D.notifications).slice(0, 50);
            var newSnap = {};
            result.data.forEach(function(s) { newSnap[String(s.id)] = s['الحالة'] || ''; });
            localStorage.setItem('repNotifSnapshot', JSON.stringify(newSnap));
            D.shipments = result.data;
          }
        }
      } catch(e) {}
    }, 60000);
  }

  function _renderShipmentCard(s, opts) {
    opts = opts || {};
    var _favs = opts.favs || {};
    var _followupsSent = opts.followupsSent || {};
    var _repFilters = opts.repFilters || {};
    var sid = String(s.id || s.m);
    var st = _normalizeStatus(s);
    var bdrColor = STATUS_COLORS[st] || '';
    var txtColor = STATUS_TEXT_COLORS[st] || 'text-text-muted';
    var isArch = _isArchived(s);
    var hideActs = HIDE_ACTION_STATUSES.includes(st) || isArch || (Auth.user && Auth.user.role === 'follower');
    var canFav = !isArch && ['قيد التوصيل', 'مؤجل'].includes(st);
    var isFollowupFilter = _repFilters.status === 'بحاجة لمتابعة';
    var needsFollowup = isFollowupFilter && FOLLOWUP_STATUSES.includes(st);
    var followupSent = !!_followupsSent[sid];
    var phones = [s['الهاتف'] || '', s['هاتف بديل'] || ''].filter(Boolean);
    var hasMulti = phones.length > 1;
    var showAmt = ['تم', 'تم التسليم', 'تعديل سعر', 'شحن', 'استلم جزئي'].includes(st) && s['المدفوع'] != null && s['المدفوع'] !== '';
    var dispAmt = showAmt ? s['المدفوع'] : (s['المبلغ'] || '0');
    var borderStyle = bdrColor ? 'border-t-2 ' + bdrColor : '';
    var statusStyle = '';
    if (st === 'تم') statusStyle = 'color:#22c55e';
    else if (st === 'قيد التوصيل') statusStyle = 'color:#f59e0b';
    else if (st === 'مؤجل') statusStyle = 'color:#f97316';
    else if (st === 'الغاء') statusStyle = 'color:#ef4444';
    else if (st === 'تعديل سعر' || st === 'شحن') statusStyle = 'color:#3b82f6';

    var html = '<div class="bg-bg-surface rounded-xl p-3 border border-border-subtle shadow-sm flex flex-col gap-2 relative overflow-hidden transition-all hover:border-border-strong duration-200 ' + borderStyle + '" data-shipment-id="' + sid + '">';

    html += '<div class="flex justify-between items-start"><div class="flex items-center gap-1.5">';
    html += '<span class="flex items-center gap-1">';
    html += '<button data-action="copy" class="text-text-muted hover:text-text-main transition-colors p-1 cursor-pointer" title="نسخ التفاصيل">' + icon('copy', 'w-6 h-6') + '</button>';
    if (canFav) {
      var fav = !!_favs[sid];
      html += '<button data-action="fav" class="transition-colors p-1 cursor-pointer ' + (fav ? 'text-red-500' : 'text-text-muted hover:text-red-400') + '" title="' + (fav ? 'إزالة من المفضلة' : 'إضافة للمفضلة') + '">' + icon('heart', 'w-6 h-6') + '</button>';
    }
    html += '</span>';
    if (needsFollowup && !followupSent) {
      html += '<button data-action="followup" class="bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold px-2 py-1 rounded-lg border border-red-500/20 cursor-pointer transition-colors">متابعة</button>';
    }
    if (needsFollowup && followupSent) {
      html += '<button data-action="dismiss-followup" class="bg-emerald-500/10 text-emerald-500 text-xs font-bold px-2 py-1 rounded-lg border border-emerald-500/20 cursor-pointer transition-colors flex items-center gap-1">' + '<svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' + ' تم</button>';
    }
    html += '</div>';
    html += '<div class="text-left"><div class="text-sm font-bold ' + txtColor + '" style="' + statusStyle + '">' + enNum(s['الحالة'] || '-') + '</div></div></div>';

    html += '<div class="space-y-2">';
    html += '<div class="flex items-start gap-2"><div class="bg-black/5 dark:bg-white/5 p-1.5 rounded-lg text-text-muted">' + icon('message-circle', 'w-3.5 h-3.5') + '</div><div><span class="text-[10px] text-text-muted block">العميل</span><span class="font-bold text-sm text-text-main">' + enNum(s['اسم العميل'] || '-') + '</span></div></div>';
    html += '<div class="flex items-start gap-2"><div class="bg-black/5 dark:bg-white/5 p-1.5 rounded-lg text-text-muted">' + icon('map-pin', 'w-3.5 h-3.5') + '</div><div class="flex-1"><span class="text-[10px] text-text-muted block">العنوان</span><span class="text-xs font-medium text-text-main block"><span class="text-primary font-bold">' + enNum(s['الزون']) + '</span> ' + (s['العنوان'] ? '- ' + enNum(s['العنوان']) : '') + '</span></div></div>';
    html += '<div class="flex items-start gap-2"><div class="bg-black/5 dark:bg-white/5 p-1.5 rounded-lg text-text-muted">' + icon('box', 'w-3.5 h-3.5') + '</div><div><span class="text-[10px] text-text-muted block">المنتج</span><span class="font-bold text-sm text-text-main">' + enNum(s['المنتج'] || '-') + '</span></div></div>';

    html += '<div class="grid grid-cols-3 gap-2 mt-1 pt-2 border-t border-border-subtle">';
    html += '<div><span class="text-[10px] text-text-muted flex items-center gap-1 mb-0.5">' + icon('file-text', 'w-3 h-3') + ' الراسل</span><span class="text-xs font-medium text-text-main line-clamp-1">' + enNum(s['الراسل'] || 'غير محدد') + '</span></div>';
    html += '<div><span class="text-[10px] text-text-muted flex items-center gap-1 mb-0.5">' + icon('message-square', 'w-3 h-3') + ' ملاحظات</span><span class="text-[11px] font-medium line-clamp-2 ' + (s['ملاحظات'] ? 'text-amber-500 dark:text-amber-400' : 'text-text-muted/50') + '">' + (s['ملاحظات'] || '—') + '</span></div>';
    html += '<div><span class="text-[10px] text-text-muted flex items-center gap-1 mb-0.5">' + icon('credit-card', 'w-3 h-3') + ' المبلغ المطلوب</span><span class="font-bold text-primary text-base">' + enNum(dispAmt) + '</span></div>';
    html += '</div></div>';

    if (!hideActs) {
      html += '<div class="action-btns space-y-1.5">';
      html += '<div class="grid grid-cols-2 gap-1.5">';
      html += '<button data-action="done" class="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1 transition-colors active:scale-95 cursor-pointer">' + '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' + ' تم</button>';
      html += '<button data-action="price-edit" class="bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1 transition-colors active:scale-95 cursor-pointer">💰 تعديل سعر</button>';
      html += '</div><div class="grid grid-cols-2 gap-1.5">';
      html += '<button data-action="postpone" class="bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-600 dark:text-orange-400 rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1 transition-colors active:scale-95 cursor-pointer">⏰ مؤجل</button>';
      html += '<button data-action="reject" class="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1 transition-colors active:scale-95 cursor-pointer">❌ الغاء</button>';
      html += '</div></div>';
    }

    html += '<div class="action-btns space-y-1.5 mt-1.5' + (D.actionsHidden ? ' hidden-actions' : '') + '">';
    html += '<div class="grid grid-cols-2 gap-1.5">';
    html += '<button data-action="call" class="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1 transition-colors active:scale-95 cursor-pointer relative">' + icon('phone', 'w-3.5 h-3.5') + ' اتصال' + (hasMulti ? '<span class="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">' + phones.length + '</span>' : '') + '</button>';
    html += '<button data-action="whatsapp" class="bg-green-600/10 hover:bg-green-600/20 border border-green-500/20 text-green-600 dark:text-green-400 rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1 transition-colors active:scale-95 cursor-pointer relative">' + icon('message-circle', 'w-3.5 h-3.5') + ' واتساب' + (hasMulti ? '<span class="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">' + phones.length + '</span>' : '') + '</button>';
    html += '</div></div></div>';
    return html;
  }

  function _renderRepFollowerView() {
    var user = Auth.user;
    var isFollower = user && user.role === 'follower';

    var archivedDailiesSet = new Set();
    D.shipments.forEach(function(s) { var v = (s['ارشيف'] || '').toString().trim(); if (v && v !== 'false' && v !== '0' && (s['اليومية'] || '').trim()) archivedDailiesSet.add(s['اليومية'].trim()); });

    var allowedStatuses = new Set(['قيد التوصيل', 'تم', 'تعديل سعر', 'شحن', 'الغاء', 'مؤجل']);
    var allDailySet = new Set();
    D.shipments.forEach(function(s) { var d = (s['اليومية'] || '').trim(); if (d) allDailySet.add(d); });
    var dailyWithAllowed = new Set();
    D.shipments.filter(function(s) { return allowedStatuses.has((s['الحالة'] || '').trim()); }).forEach(function(s) { var d = (s['اليومية'] || '').trim(); if (d) dailyWithAllowed.add(d); });
    var dailies = Array.from(allDailySet).filter(function(d) { return dailyWithAllowed.has(d) && ((D.repArchiveFilter === 'نشطة' && !archivedDailiesSet.has(d)) || (D.repArchiveFilter === 'مؤرشفة' && archivedDailiesSet.has(d))); }).sort(function(a, b) { return _dailyToSortVal(b) - _dailyToSortVal(a); });

    var dailyBase = [];
    if (D.filters.daily) dailyBase = D.shipments.filter(function(s) { return (s['اليومية'] || '').trim() === D.filters.daily; });

    var favsRaw = localStorage.getItem('repFavorites');
    var favs = favsRaw ? JSON.parse(favsRaw) : {};
    var dismissedKey = (user && user.role === 'follower') ? _getFollowerKey('dismissed') : 'repFollowupsDismissed';
    var dismissed = JSON.parse(localStorage.getItem(dismissedKey) || '{}');
    var sentKey = (user && user.role === 'follower') ? _getFollowerKey('sent') : 'repFollowupsSent';
    var followupsSent = JSON.parse(localStorage.getItem(sentKey) || '{}');

    var statusCounts = { 'الكل': dailyBase.length, 'بدون مندوب': 0 };
    dailyBase.forEach(function(s) { var st = (s['الحالة'] || '').trim(); if (st) statusCounts[st] = (statusCounts[st] || 0) + 1; if (!(s['المندوب'] || '').trim()) statusCounts['بدون مندوب'] = (statusCounts['بدون مندوب'] || 0) + 1; });
    statusCounts['المفضلة'] = dailyBase.filter(function(s) { return favs[String(s.id || s.m)]; }).length;
    statusCounts['بحاجة لمتابعة'] = dailyBase.filter(function(s) { return FOLLOWUP_STATUSES.includes((s['الحالة'] || '').trim()) && !dismissed[String(s.id || s.m)]; }).length;

    var followupCount = (statusCounts['تعديل سعر'] || 0) + (statusCounts['شحن'] || 0) + (statusCounts['مؤجل'] || 0) + (statusCounts['الغاء'] || 0) + (statusCounts['قيد التوصيل'] || 0);
    var repPaid = 0, repComm = 0, repDoneCount = 0;
    dailyBase.forEach(function(s) { var st = (s['الحالة'] || '').trim(); if (_isEligible(st)) { repPaid += Number(s['المدفوع'] || 0); repComm += Number(s['عمولة المندوب'] || 0); repDoneCount++; } });
    var repRemittance = repPaid - repComm;

    var totalDone = dailyBase.filter(function(s) { return _isEligible(s['الحالة']); }).length;
    var progressPct = dailyBase.length ? Math.round((totalDone / dailyBase.length) * 100) : 0;

    var followerTotal = dailyBase.length;
    var followerNeedsFollowup = dailyBase.filter(function(s) { return FOLLOWUP_STATUSES.includes((s['الحالة'] || '').trim()) && !dismissed[String(s.id || s.m)]; }).length;
    var followerFollowedUp = dailyBase.filter(function(s) { return !!followupsSent[String(s.id || s.m)]; }).length;

    var filterOpts = { daily: dailies, zone: [], sender: [], rep: [] };
    var baseForOpts = D.filters.daily ? dailyBase : D.shipments.filter(function(s) { return !_isArchived(s); });
    filterOpts.zone = Array.from(new Set(baseForOpts.map(function(s) { return (s['الزون'] || '').trim(); }).filter(Boolean))).sort();
    filterOpts.sender = Array.from(new Set(baseForOpts.map(function(s) { return (s['الراسل'] || '').trim(); }).filter(Boolean))).sort();
    filterOpts.rep = Array.from(new Set(baseForOpts.map(function(s) { return (s['المندوب'] || '').trim(); }).filter(Boolean))).sort();

    var filterCounts = {};
    var dailyC = {};
    D.shipments.forEach(function(s) { var d = (s['اليومية'] || '').trim(); if (!d) return; var isA = archivedDailiesSet.has(d); if (D.repArchiveFilter === 'نشطة' && isA) return; if (D.repArchiveFilter === 'مؤرشفة' && !isA) return; dailyC[d] = (dailyC[d] || 0) + 1; });
    filterCounts.daily = dailyC;
    if (D.filters.daily) {
      var sc2 = {}, zc = {}, sc3 = {}, rc = {};
      dailyBase.forEach(function(s) { var st = (s['الحالة'] || '').trim(); if (st) sc2[st] = (sc2[st] || 0) + 1; var z = (s['الزون'] || '').trim(); if (z) zc[z] = (zc[z] || 0) + 1; var se = (s['الراسل'] || '').trim(); if (se) sc3[se] = (sc3[se] || 0) + 1; var r = (s['المندوب'] || '').trim(); if (r) rc[r] = (rc[r] || 0) + 1; });
      sc2['الكل'] = dailyBase.length;
      sc2['بدون مندوب'] = dailyBase.filter(function(s) { return !(s['المندوب'] || '').trim(); }).length;
      sc2['المفضلة'] = dailyBase.filter(function(s) { return favs[String(s.id || s.m)]; }).length;
      sc2['بحاجة لمتابعة'] = dailyBase.filter(function(s) { return FOLLOWUP_STATUSES.includes((s['الحالة'] || '').trim()) && !dismissed[String(s.id || s.m)]; }).length;
      filterCounts.status = sc2; filterCounts.zone = zc; filterCounts.sender = sc3; filterCounts.rep = rc;
    } else {
      filterCounts.status = {}; filterCounts.zone = {}; filterCounts.sender = {}; filterCounts.rep = {};
    }

    var archiveActive = 0, archiveArchived = 0;
    allDailySet.forEach(function(d) { if (archivedDailiesSet.has(d)) archiveArchived++; else archiveActive++; });

    var filteredShipments = dailyBase.filter(function(s) {
      if (D.filters.status !== 'المفضلة') { if (favs[String(s.id || s.m)]) return false; }
      if (D.filters.status) {
        if (D.filters.status === 'المفضلة') { if (!favs[String(s.id || s.m)]) return false; }
        else if (D.filters.status === 'بحاجة لمتابعة') { if (!FOLLOWUP_STATUSES.includes((s['الحالة'] || '').trim())) return false; }
        else { var ns = (s['الحالة'] || '').trim(); if (ns === 'إلغاء') ns = 'الغاء'; if (ns !== D.filters.status) return false; }
      }
      if (D.filters.zone && (s['الزون'] || '').trim() !== D.filters.zone) return false;
      if (D.filters.sender && (s['الراسل'] || '').trim() !== D.filters.sender) return false;
      if (D.filters.rep && (s['المندوب'] || '').trim() !== D.filters.rep) return false;
      if (D.filterNoRep && (s['المندوب'] || '').trim()) return false;
      if (D.filters.search.trim()) {
        var q = D.filters.search.toLowerCase();
        var ok = (s['اسم العميل'] || '').toLowerCase().includes(q) || (s['الهاتف'] || '').includes(q) || (s['هاتف بديل'] || '').includes(q) || (s['كود الشحنة'] || '').toLowerCase().includes(q) || (s['المندوب'] || '').toLowerCase().includes(q);
        if (!ok) return false;
      }
      return true;
    });
    var displayed = filteredShipments.slice(0, D.displayLimit);

    var h = '';
    if (isFollower) {
      h += '<div class="grid grid-cols-3 gap-2 mb-2">';
      var fsStyle1 = (!D.filters.status && !D.filterNoRep) ? 'style="border-color:rgba(59,130,246,.6);background:rgba(59,130,246,.08)"' : '';
      h += '<div data-follower-stat="total" class="bg-bg-surface border border-blue-500/25 rounded-xl p-3 text-center shadow-sm cursor-pointer transition-all hover:border-blue-500/60" ' + fsStyle1 + '><div class="text-[18px] font-black text-blue-400">' + followerTotal + '</div><div class="text-[10px] font-bold text-text-muted">إجمالي الشحنات</div></div>';
      var fsStyle2 = D.filters.status === 'بحاجة لمتابعة' ? 'style="border-color:rgba(245,158,11,.6);background:rgba(245,158,11,.08)"' : '';
      h += '<div data-follower-stat="followup" class="bg-bg-surface border border-amber-500/25 rounded-xl p-3 text-center shadow-sm cursor-pointer transition-all hover:border-amber-500/60" ' + fsStyle2 + '><div class="text-[18px] font-black text-amber-400">' + followerNeedsFollowup + '</div><div class="text-[10px] font-bold text-text-muted">بحاجة لمتابعة</div></div>';
      var fsStyle3 = D.filters.status === 'تم' ? 'style="border-color:rgba(34,197,94,.6);background:rgba(34,197,94,.08)"' : '';
      h += '<div data-follower-stat="done" class="bg-bg-surface border border-emerald-500/25 rounded-xl p-3 text-center shadow-sm cursor-pointer transition-all hover:border-emerald-500/60" ' + fsStyle3 + '><div class="text-[18px] font-black text-emerald-400">' + followerFollowedUp + '</div><div class="text-[10px] font-bold text-text-muted">تم المتابعة</div></div>';
      h += '</div>';

      var gridStatuses = [
        { key: 'قيد التوصيل', tc: 'text-yellow-500', bc: 'border-yellow-500/20', bg: 'bg-yellow-500/5' },
        { key: 'بدون مندوب', tc: 'text-slate-400', bc: 'border-slate-500/20', bg: 'bg-slate-500/5', noRep: true },
        { key: 'تم', tc: 'text-emerald-500', bc: 'border-emerald-500/20', bg: 'bg-emerald-500/5' },
        { key: 'تعديل سعر', tc: 'text-blue-500', bc: 'border-blue-500/20', bg: 'bg-blue-500/5' },
        { key: 'شحن', tc: 'text-cyan-500', bc: 'border-cyan-500/20', bg: 'bg-cyan-500/5' },
        { key: 'الغاء', tc: 'text-red-500', bc: 'border-red-500/20', bg: 'bg-red-500/5' },
        { key: 'مؤجل', tc: 'text-orange-500', bc: 'border-orange-500/20', bg: 'bg-orange-500/5' },
      ];
      h += '<div class="grid grid-cols-7 gap-1.5 mb-3">';
      gridStatuses.forEach(function(gs) {
        var isActive = gs.noRep ? D.filterNoRep : D.filters.status === gs.key;
        var activeStyle = isActive ? 'style="border-color:currentColor;background:currentColor;background:rgba(var(--tw-ring-color-rgb, 0.5), 0.08)"' : '';
        if (gs.noRep && D.filterNoRep) activeStyle = 'style="border-color:rgba(148,163,184,.5);background:rgba(148,163,184,.08)"';
        if (!gs.noRep && D.filters.status === gs.key) {
          var colors = { 'قيد التوصيل': '234,179,8', 'تم': '34,197,94', 'تعديل سعر': '59,130,246', 'شحن': '6,182,212', 'الغاء': '239,68,68', 'مؤجل': '249,115,22' };
          activeStyle = 'style="border-color:rgba(' + (colors[gs.key] || '128,128,128') + ',.5);background:rgba(' + (colors[gs.key] || '128,128,128') + ',.08)"';
        }
        h += '<div data-grid-status="' + (gs.noRep ? 'noRep' : gs.key) + '" class="bg-bg-surface border ' + gs.bc + ' rounded-xl p-2 text-center shadow-sm cursor-pointer transition-all hover:border-opacity-50" ' + activeStyle + '>';
        h += '<div class="text-[15px] font-black ' + gs.tc + '">' + (statusCounts[gs.key] || 0) + '</div>';
        h += '<div class="text-[9px] font-bold text-text-muted">' + gs.key + '</div></div>';
      });
      h += '</div>';
    } else {
      h += '<div class="grid grid-cols-4 gap-1.5 mb-2">';
      var statsItems = [
        { label: 'المدفوع', value: enNum(repPaid), tc: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500', ibg: 'bg-emerald-100/80 dark:bg-emerald-500/20', bdr: 'border-emerald-200/50 dark:border-emerald-500/25' },
        { label: 'العمولة', value: enNum(repComm), tc: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500', ibg: 'bg-amber-100/80 dark:bg-amber-500/20', bdr: 'border-amber-200/50 dark:border-amber-500/25', extra: enNum(repDoneCount) + ' شحنة' },
        { label: 'التوريد', value: enNum(repRemittance), tc: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500', ibg: 'bg-sky-100/80 dark:bg-sky-500/20', bdr: 'border-sky-200/50 dark:border-sky-500/25', extra: followupCount + ' شحنة' },
        { label: 'الشحنات', value: enNum(dailyBase.length), tc: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500', ibg: 'bg-purple-100/80 dark:bg-purple-500/20', bdr: 'border-purple-200/50 dark:border-purple-500/25' },
      ];
      statsItems.forEach(function(item) {
        h += '<div class="relative overflow-hidden bg-bg-surface border ' + item.bdr + ' rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 dark:backdrop-blur-sm">';
        h += '<div class="h-0.5 w-full ' + item.bg + '"></div>';
        h += '<div class="p-1.5 text-center"><span class="text-[8px] font-bold text-text-muted">' + item.label + '</span>';
        h += '<div class="text-[11px] font-black tracking-tight text-center ' + item.tc + '">' + item.value + '</div>';
        if (item.extra) h += '<div class="text-[7px] font-semibold ' + item.tc + '/70 mt-0.5 leading-tight border-t border-border-subtle pt-0.5 text-center">' + item.extra + '</div>';
        h += '</div></div>';
      });
      h += '</div>';
      h += '<div class="grid grid-cols-4 gap-1.5 mb-2">';
      var _statCards = [
        { key: 'قيد التوصيل', tc: 'text-amber-600 dark:text-amber-400', bc: 'border-amber-200/50 dark:border-amber-500/25', bg: 'bg-amber-500', active: '234,179,8' },
        { key: 'بحاجة لمتابعة', tc: 'text-orange-600 dark:text-orange-400', bc: 'border-orange-200/50 dark:border-orange-500/25', bg: 'bg-orange-500', active: '249,115,22' },
        { key: 'المفضلة', tc: 'text-rose-600 dark:text-rose-400', bc: 'border-rose-200/50 dark:border-rose-500/25', bg: 'bg-rose-500', active: '244,63,94' },
        { key: 'مؤجل', tc: 'text-yellow-600 dark:text-yellow-400', bc: 'border-yellow-200/50 dark:border-yellow-500/25', bg: 'bg-yellow-500', active: '234,179,8' },
      ];
      _statCards.forEach(function(sc) {
        var isAct = D.filters.status === sc.key;
        h += '<div data-grid-status="' + sc.key + '" class="relative overflow-hidden bg-bg-surface border ' + sc.bc + ' rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 dark:backdrop-blur-sm cursor-pointer' + (isAct ? ' ring-1 ring-offset-1 ring-offset-bg-main' : '') + '" style="' + (isAct ? 'border-color:rgba(' + sc.active + ',.6);background:rgba(' + sc.active + ',.08)' : '') + '"><div class="h-0.5 w-full ' + sc.bg + '"></div><div class="p-1.5 text-center"><span class="text-[8px] font-bold text-text-muted">' + sc.key + '</span><div class="text-[11px] font-black tracking-tight text-center ' + sc.tc + ' mt-0.5">' + (statusCounts[sc.key] || 0) + '</div></div></div>';
      });
      h += '</div>';
      h += '<div class="grid grid-cols-4 gap-1.5 mb-2">';
      var _statCards2 = [
        { key: 'تم', tc: 'text-emerald-600 dark:text-emerald-400', bc: 'border-emerald-200/50 dark:border-emerald-500/25', bg: 'bg-emerald-500', active: '34,197,94' },
        { key: 'تعديل سعر', tc: 'text-blue-600 dark:text-blue-400', bc: 'border-blue-200/50 dark:border-blue-500/25', bg: 'bg-blue-500', active: '59,130,246' },
        { key: 'شحن', tc: 'text-sky-600 dark:text-sky-400', bc: 'border-sky-200/50 dark:border-sky-500/25', bg: 'bg-sky-500', active: '6,182,212' },
        { key: 'الغاء', tc: 'text-red-600 dark:text-red-400', bc: 'border-red-200/50 dark:border-red-500/25', bg: 'bg-red-500', active: '239,68,68' },
      ];
      _statCards2.forEach(function(sc) {
        var isAct = D.filters.status === sc.key;
        h += '<div data-grid-status="' + sc.key + '" class="relative overflow-hidden bg-bg-surface border ' + sc.bc + ' rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 dark:backdrop-blur-sm cursor-pointer' + (isAct ? ' ring-1 ring-offset-1 ring-offset-bg-main' : '') + '" style="' + (isAct ? 'border-color:rgba(' + sc.active + ',.6);background:rgba(' + sc.active + ',.08)' : '') + '"><div class="h-0.5 w-full ' + sc.bg + '"></div><div class="p-1.5 text-center"><span class="text-[8px] font-bold text-text-muted">' + sc.key + '</span><div class="text-[11px] font-black tracking-tight text-center ' + sc.tc + ' mt-0.5">' + (statusCounts[sc.key] || 0) + '</div></div></div>';
      });
      h += '</div>';
      h += '<div class="bg-bg-surface border border-border-subtle rounded-xl p-2.5 mb-3 shadow-sm"><div class="flex items-center justify-between mb-1"><span class="text-xs font-bold text-text-main">نسبة الإنجاز</span><span class="text-xs font-extrabold text-primary">' + progressPct + '%</span></div><div class="w-full bg-black/10 dark:bg-white/5 rounded-full h-1.5 overflow-hidden"><div class="bg-primary h-1.5 rounded-full transition-all duration-500" style="width:' + progressPct + '%"></div></div><div class="flex justify-between mt-1 text-[10px] font-semibold text-text-muted"><span>تم <span class="text-text-main font-bold">' + totalDone + '</span></span><span>متبقي <span class="text-text-main font-bold">' + (dailyBase.length - totalDone) + '</span></span></div></div>';
    }

    h += '<div class="sticky top-14 z-30 bg-bg-main border-b border-border-subtle pb-3 pt-2 -mx-4 px-4 mb-3 shadow-sm">';
    h += '<div class="space-y-3 mb-6">';
    h += '<div class="flex gap-1.5 items-center">';
    h += '<div class="relative flex-1"><div class="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">' + icon('search', 'w-5 h-5 text-text-muted') + '</div>';
    h += '<input type="text" data-filter-search value="' + escHtml(D.filters.search) + '" class="w-full bg-bg-surface text-text-main border border-border-strong rounded-xl pr-11 pl-4 py-3.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-right" placeholder="البحث باسم العميل، الهاتف، الهاتف البديل أو كود الشحنة..." />';
    h += '</div>';
    h += '<button data-toggle-actions class="p-3 bg-bg-surface border border-border-strong rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-text-main transition-colors cursor-pointer" title="' + (D.actionsHidden ? 'إظهار الأزرار' : 'إخفاء الأزرار') + '">' + (D.actionsHidden ? icon('eye', 'w-5 h-5') : icon('eye-off', 'w-5 h-5')) + '</button>';
    h += '</div>';

    var filterChips = [
      { key: 'daily', label: 'اليومية', icon: '📅' },
      { key: 'zone', label: 'الزون', icon: '📍' },
      { key: 'sender', label: 'الراسل', icon: '🏢' },
    ];
    h += '<div class="grid grid-cols-4 gap-2">';
    var archActive = D.repArchiveFilter === 'نشطة';
    var archLabel = archActive ? 'نشطة' : 'مؤرشفة';
    var archCount = archActive ? archiveActive : archiveArchived;
    var archColor = archActive ? 'bg-primary/20 border-primary text-primary' : 'bg-red-500/10 border-red-500/30 text-red-500';
    h += '<button data-filter-archive class="min-w-0 text-center px-2.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ' + archColor + '">📁 ' + archLabel + ' (' + archCount + ')</button>';

    filterChips.forEach(function(fc) {
      var opts = filterOpts[fc.key] || [];
      var curVal = D.filters[fc.key];
      var selCls = curVal ? 'bg-primary/20 border-primary text-primary' : 'bg-bg-surface border-border-subtle text-text-muted hover:bg-black/5 dark:hover:bg-white/5';
      h += '<select data-filter="' + fc.key + '" class="min-w-0 text-center px-1 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer appearance-none ' + selCls + '" dir="rtl">';
      h += '<option value="" class="bg-bg-surface text-text-muted">' + fc.icon + ' ' + fc.label + '</option>';
      opts.forEach(function(opt) {
        var cnt = (filterCounts[fc.key] || {})[opt];
        var isArchDaily = fc.key === 'daily' && archivedDailiesSet.has(opt);
        var optColor = isArchDaily ? ' style="color:#ef4444"' : '';
        h += '<option value="' + escHtml(opt) + '"' + (curVal === opt ? ' selected' : '') + ' class="bg-bg-surface text-text-main"' + optColor + '>' + escHtml(opt) + (cnt != null ? ' (' + cnt + ')' : '') + '</option>';
      });
      h += '</select>';
    });
    h += '</div></div></div>';

    h += '<div class="mb-4"><span class="text-text-muted text-sm font-medium">النتائج: <span class="text-text-main font-bold">' + filteredShipments.length + '</span> شحنة</span></div>';
    h += '<div class="flex flex-col gap-4" id="cards-container">';
    if (displayed.length > 0) {
      displayed.forEach(function(s) { h += _renderShipmentCard(s, { favs: favs, followupsSent: followupsSent, repFilters: D.filters }); });
    } else {
      h += '<div class="bg-bg-surface rounded-2xl p-8 border border-border-subtle text-center flex flex-col items-center">' + icon('box', 'w-12 h-12 text-text-muted mb-3') + '<p class="text-text-main font-medium text-lg">' + (!D.filters.daily ? 'اختر اليومية لعرض الشحنات' : 'لا توجد شحنات مطابقة') + '</p><p class="text-text-muted text-sm mt-1">' + (!D.filters.daily ? '' : 'حاول تغيير معايير البحث أو تحديث الصفحة') + '</p></div>';
    }
    h += '</div>';
    if (filteredShipments.length > D.displayLimit) {
      h += '<div class="mt-6 flex justify-center"><button data-show-more class="bg-bg-surface hover:bg-black/5 dark:hover:bg-white/5 border border-border-strong text-text-main px-6 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer">عرض المزيد...</button></div>';
    }
    return h;
  }

  function _renderNotifPanel() {
    var panel = document.getElementById('notif-panel');
    var badge = document.getElementById('notif-badge');
    if (!panel) return;
    if (D.notifications.length === 0) {
      panel.innerHTML = '<div class="text-center py-6 text-text-muted text-sm">لا توجد إشعارات</div>';
    } else {
      var h = '';
      D.notifications.forEach(function(n) {
        h += '<div class="px-4 py-3 border-b border-border-subtle last:border-b-0"><div class="text-sm font-bold text-text-main">' + escHtml(n.title) + '</div><div class="text-xs text-text-muted mt-0.5">' + escHtml(n.desc) + '</div></div>';
      });
      panel.innerHTML = h;
    }
    panel.classList.toggle('hidden', !D.notifOpen);
    if (badge) {
      if (D.notifications.length > 0) {
        badge.textContent = D.notifications.length > 99 ? '99+' : D.notifications.length;
        badge.classList.remove('hidden');
        badge.classList.add('flex');
      } else {
        badge.classList.add('hidden');
        badge.classList.remove('flex');
      }
    }
  }

  function _bindCardEvents() {
    document.querySelectorAll('[data-shipment-id]').forEach(function(card) {
      var sid = card.getAttribute('data-shipment-id');
      var shipment = D.shipments.find(function(s) { return String(s.id || s.m) === sid; });
      if (!shipment) return;

      card.querySelectorAll('[data-action]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var action = this.getAttribute('data-action');
          if (action === 'copy') _copyDetails(shipment);
          else if (action === 'fav') { _toggleFav(sid); _rerenderDashboard(); }
          else if (action === 'done') _updateStatus(shipment, 'تم');
          else if (action === 'followup') _doFollowup(shipment);
          else if (action === 'dismiss-followup') _dismissFollowup(shipment);
          else if (action === 'postpone') _showPostponeDialog(shipment);
          else if (action === 'reject') _showRejectDialog(shipment);
          else if (action === 'price-edit') _showPriceEditDialog(shipment);
          else if (action === 'call') _handleCall(shipment);
          else if (action === 'whatsapp') _handleWA(shipment);
        });
      });
    });
  }

  function _handleCall(shipment) {
    var phones = [shipment['الهاتف'] || '', shipment['هاتف بديل'] || ''].filter(Boolean);
    if (!phones.length) return;
    if (phones.length === 1) { window.location.href = 'tel:' + _formatPhoneCall(phones[0]); return; }
    var content = '<div class="grid grid-cols-1 gap-2">';
    phones.forEach(function(p, i) {
      var cls = i === 0 ? 'border-emerald-400 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20' : 'border-sky-400 bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20';
      content += '<a href="tel:' + _formatPhoneCall(p) + '" class="block p-4 rounded-xl border-2 text-center font-bold text-lg no-underline cursor-pointer transition-colors ' + cls + '">' + icon('phone', 'w-4 h-4 inline ml-2') + p + '</a>';
    });
    content += '</div>';
    _showDialog('اختر رقم للاتصال', content);
  }

  function _handleWA(shipment) {
    var phones = [shipment['الهاتف'] || '', shipment['هاتف بديل'] || ''].filter(Boolean);
    if (!phones.length) return;
    if (phones.length === 1) { window.open('https://api.whatsapp.com/send?phone=' + _formatPhoneWA(phones[0]) + '&text=' + _buildWAMsg(shipment), '_blank'); return; }
    _showWADialog(shipment);
  }

  function _showWADialog(shipment) {
    var phones = [shipment['الهاتف'] || '', shipment['هاتف بديل'] || ''].filter(Boolean);
    var content = '<div class="grid grid-cols-1 gap-2">';
    phones.forEach(function(p, i) {
      var cls = i === 0 ? 'border-emerald-400 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20' : 'border-purple-400 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20';
      content += '<a href="https://api.whatsapp.com/send?phone=' + _formatPhoneWA(p) + '&text=' + _buildWAMsg(shipment) + '" target="_blank" rel="noopener" class="block p-4 rounded-xl border-2 text-center font-bold text-lg no-underline cursor-pointer transition-colors ' + cls + '">' + icon('message-circle', 'w-4 h-4 inline ml-2') + p + '</a>';
    });
    content += '</div>';
    _showDialog('اختر رقم لإرسال الواتساب', content);
  }

  function _showPostponeDialog(shipment) {
    if (_isArchived(shipment)) { Toast.error('لا يمكن تعديل شحنة مؤرشفة'); return; }
    var reasons = ['مؤجل غداً', 'مؤجل الأحد أو الاثنين', 'مؤجل الاربع أو الخميس أو الجمعه'];
    var colors = ['border-amber-400 bg-amber-500/10 text-amber-600 dark:text-amber-400', 'border-orange-400 bg-orange-500/10 text-orange-600 dark:text-orange-400', 'border-yellow-400 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'];
    var content = '<div class="grid grid-cols-1 gap-2" id="pd-reasons-list">';
    reasons.forEach(function(r, i) {
      content += '<button data-postpone-reason="' + escHtml(r) + '" class="p-3 rounded-xl border-2 cursor-pointer text-center font-bold text-sm transition-colors hover:bg-opacity-20 ' + colors[i] + '">⏰ ' + escHtml(r) + '</button>';
    });
    content += '<button data-postpone-other class="p-3 rounded-xl border-2 cursor-pointer text-center font-bold text-sm transition-colors border-slate-400 bg-slate-500/10 text-slate-600 dark:text-slate-400 hover:bg-opacity-20">✏️ سبب آخر</button>';
    content += '</div>';
    content += '<div id="pd-other-box" class="hidden mt-3 text-right">';
    content += '<label class="text-sm font-bold text-text-muted mb-1 block">اكتب السبب</label>';
    content += '<textarea data-postpone-other-text rows="3" class="w-full p-2.5 rounded-xl border border-border-strong bg-bg-main text-text-main text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="اكتب سبب التأجيل هنا..."></textarea>';
    content += '<button data-postpone-other-confirm class="w-full mt-2 bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-xl text-sm cursor-pointer transition-colors">تأكيد</button>';
    content += '</div>';
    _showDialog('اختر سبب التأجيل', content);

    document.querySelectorAll('[data-postpone-reason]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var reason = this.getAttribute('data-postpone-reason');
        _closeDialog();
        _updateStatus(shipment, 'مؤجل', { 'سبب الحالة': reason });
      });
    });

    var otherBtn = document.querySelector('[data-postpone-other]');
    var otherBox = document.getElementById('pd-other-box');
    var reasonsList = document.getElementById('pd-reasons-list');
    if (otherBtn) {
      otherBtn.addEventListener('click', function() {
        reasonsList.classList.add('hidden');
        otherBox.classList.remove('hidden');
        var textEl = document.querySelector('[data-postpone-other-text]');
        if (textEl) textEl.focus();
      });
    }
    var confirmOtherBtn = document.querySelector('[data-postpone-other-confirm]');
    if (confirmOtherBtn) {
      confirmOtherBtn.addEventListener('click', function() {
        var textEl = document.querySelector('[data-postpone-other-text]');
        var reason = textEl ? textEl.value.trim() : '';
        if (!reason) { Toast.error('يرجى كتابة السبب'); return; }
        _closeDialog();
        _updateStatus(shipment, 'مؤجل', { 'سبب الحالة': reason });
      });
    }
  }

  function _showRejectDialog(shipment) {
    if (_isArchived(shipment)) { Toast.error('لا يمكن تعديل شحنة مؤرشفة'); return; }
    var reasons = ['العميل طلب الالغاء', 'العميل مسافر', 'المنطقه خارج نطاق التوصيل', 'العنوان غير صحيح', 'المنتج غير مطابق', 'المنتج تالف', 'تهرب بعد التنسيق', 'رقم الموبيل او الواتساب غير صحيح'];
    var colors = ['border-pink-400 bg-pink-500/10 text-pink-600 dark:text-pink-400', 'border-orange-400 bg-orange-500/10 text-orange-600 dark:text-orange-400', 'border-amber-400 bg-amber-500/10 text-amber-600 dark:text-amber-400', 'border-sky-400 bg-sky-500/10 text-sky-600 dark:text-sky-400', 'border-purple-400 bg-purple-500/10 text-purple-600 dark:text-purple-400', 'border-rose-400 bg-rose-500/10 text-rose-600 dark:text-rose-400', 'border-teal-400 bg-teal-500/10 text-teal-600 dark:text-teal-400', 'border-yellow-400 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'];
    var content = '<div class="grid grid-cols-1 gap-1.5" id="pr-reasons-list">';
    reasons.forEach(function(r, i) {
      content += '<button data-reject-reason="' + escHtml(r) + '" class="p-2.5 rounded-xl border-2 cursor-pointer text-center font-bold text-sm transition-colors hover:bg-opacity-20 ' + colors[i] + '">❌ ' + escHtml(r) + '</button>';
    });
    content += '<button data-reject-other class="p-2.5 rounded-xl border-2 cursor-pointer text-center font-bold text-sm transition-colors border-slate-400 bg-slate-500/10 text-slate-600 dark:text-slate-400 hover:bg-opacity-20">✏️ سبب آخر</button>';
    content += '</div>';
    content += '<div id="pr-other-box" class="hidden mt-3 text-right">';
    content += '<label class="text-sm font-bold text-text-muted mb-1 block">اكتب السبب</label>';
    content += '<textarea data-reject-other-text rows="3" class="w-full p-2.5 rounded-xl border border-border-strong bg-bg-main text-text-main text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-400" placeholder="اكتب سبب الرفض هنا..."></textarea>';
    content += '<button data-reject-other-confirm class="w-full mt-2 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-sm cursor-pointer transition-colors">تأكيد</button>';
    content += '</div>';
    _showDialog('اختر سبب الرفض', content);

    document.querySelectorAll('[data-reject-reason]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var reason = this.getAttribute('data-reject-reason');
        _closeDialog();
        _updateStatus(shipment, 'الغاء', { 'سبب الحالة': reason });
      });
    });

    var otherBtn = document.querySelector('[data-reject-other]');
    var otherBox = document.getElementById('pr-other-box');
    var reasonsList = document.getElementById('pr-reasons-list');
    if (otherBtn) {
      otherBtn.addEventListener('click', function() {
        reasonsList.classList.add('hidden');
        otherBox.classList.remove('hidden');
        var textEl = document.querySelector('[data-reject-other-text]');
        if (textEl) textEl.focus();
      });
    }
    var confirmOtherBtn = document.querySelector('[data-reject-other-confirm]');
    if (confirmOtherBtn) {
      confirmOtherBtn.addEventListener('click', function() {
        var textEl = document.querySelector('[data-reject-other-text]');
        var reason = textEl ? textEl.value.trim() : '';
        if (!reason) { Toast.error('يرجى كتابة السبب'); return; }
        _closeDialog();
        _updateStatus(shipment, 'الغاء', { 'سبب الحالة': reason });
      });
    }
  }

  var _peMode = 'تعديل سعر';

  function _showPriceEditDialog(shipment) {
    if (_isArchived(shipment)) { Toast.error('لا يمكن تعديل شحنة مؤرشفة'); return; }
    _peMode = 'تعديل سعر';
    var content = '';
    content += '<div class="flex gap-2 mb-3">';
    content += '<button data-pe-mode="تعديل سعر" class="flex-1 p-3 rounded-xl border-2 cursor-pointer text-center font-bold text-sm transition-colors border-purple-400 bg-purple-500/20 text-purple-600 dark:text-purple-400">💰 تعديل سعر</button>';
    content += '<button data-pe-mode="شحن" class="flex-1 p-3 rounded-xl border-2 cursor-pointer text-center font-bold text-sm transition-colors border-purple-400/30 bg-purple-500/5 text-purple-500/70">🚚 شحن</button>';
    content += '</div>';
    content += '<div class="text-right"><label class="text-sm font-bold text-text-muted mb-1 block">السعر الجديد <span class="text-red-500">*</span></label>';
    content += '<input type="number" data-pe-price class="w-full p-2.5 rounded-xl border border-border-strong bg-bg-main text-text-main text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="أدخل السعر الجديد" inputMode="decimal" /></div>';
    content += '<div class="flex gap-2 mt-4">';
    content += '<button data-pe-cancel class="flex-1 bg-bg-main border border-border-strong text-text-muted font-bold py-2.5 rounded-xl text-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">الغاء</button>';
    content += '<button data-pe-confirm class="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl text-sm cursor-pointer transition-colors">تحديث</button>';
    content += '</div>';
    _showDialog('تحديث الحالة', content);

    document.querySelectorAll('[data-pe-mode]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        _peMode = this.getAttribute('data-pe-mode');
        document.querySelectorAll('[data-pe-mode]').forEach(function(b) {
          var isActive = b.getAttribute('data-pe-mode') === _peMode;
          b.className = 'flex-1 p-3 rounded-xl border-2 cursor-pointer text-center font-bold text-sm transition-colors ' + (isActive
            ? (_peMode === 'تعديل سعر' ? 'border-purple-400 bg-purple-500/20 text-purple-600 dark:text-purple-400' : 'border-sky-400 bg-sky-500/20 text-sky-600 dark:text-sky-400')
            : (_peMode === 'تعديل سعر' ? 'border-purple-400/30 bg-purple-500/5 text-purple-500/70' : 'border-sky-400/30 bg-sky-500/5 text-sky-500/70'));
        });
      });
    });
    document.querySelector('[data-pe-cancel]') && document.querySelector('[data-pe-cancel]').addEventListener('click', _closeDialog);
    document.querySelector('[data-pe-confirm]') && document.querySelector('[data-pe-confirm]').addEventListener('click', function() {
      var priceEl = document.querySelector('[data-pe-price]');
      var price = priceEl ? priceEl.value : '';
      if (!price || price === '0' || isNaN(parseFloat(price))) { Toast.error('يرجى إدخال سعر صحيح'); return; }
      _closeDialog();
      _updateStatus(shipment, _peMode, { 'المدفوع': price });
    });
  }
