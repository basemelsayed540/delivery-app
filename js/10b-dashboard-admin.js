'use strict';

/* ================================================================
   SECTION 10b: PAGE — DASHBOARD (ADMIN)
   ================================================================ */

  var _dailySummaryCache = { data: null, timestamp: 0 };
  var _DAILY_SUMMARY_CACHE_TTL = 60000;

  function _isDelivered(status) {
    if (!status) return false;
    return ['تم', 'تم التسليم', 'تعديل سعر', 'شحن', 'استلم جزئي'].includes(status.trim());
  }

  function _resetUserForm() {
    D.formUsername = ''; D.formPhone = ''; D.formEmail = ''; D.formPassword = '';
    D.formRole = 'rep'; D.formApproved = true; D.editingUser = null; D.showUserForm = false;
  }

  async function _fetchDailyOptions() {
    var user = Auth.user;
    if (!user || user.role !== 'admin') return;
    var now = Date.now();
    if (_dailySummaryCache.data && (now - _dailySummaryCache.timestamp) < _DAILY_SUMMARY_CACHE_TTL) {
      D.adminDailyCounts = _dailySummaryCache.data.countMap;
      D.archivedDailies = _dailySummaryCache.data.archived;
      D.dailyOptions = _dailySummaryCache.data.dailies;
      return;
    }
    try {
      var result = await supabaseClient.rpc('get_daily_summary');
      if (result.error || !result.data) {
        await _fetchDailyOptionsLegacy();
        return;
      }
      var countMap = {};
      var archived = new Set();
      result.data.forEach(function(row) {
        var d = (row['اليومية'] || '').trim();
        if (!d) return;
        countMap[d] = Number(row.total) || 0;
        if (row.is_archived) archived.add(d);
      });
      D.adminDailyCounts = countMap;
      D.archivedDailies = archived;
      var dailies = Object.keys(countMap);
      D.dailyOptions = dailies.sort(function(a, b) {
        var aA = archived.has(a) ? 1 : 0, bA = archived.has(b) ? 1 : 0;
        if (aA !== bA) return aA - bA;
        var dA = a.match(/(\d+)-(\d+)/), dB = b.match(/(\d+)-(\d+)/);
        if (dA && dB) return (parseInt(dB[2]) * 100 + parseInt(dB[1])) - (parseInt(dA[2]) * 100 + parseInt(dA[1]));
        return _dailyToSortVal(b) - _dailyToSortVal(a);
      });
      _dailySummaryCache = { data: { countMap: countMap, archived: archived, dailies: D.dailyOptions }, timestamp: now };
    } catch(e) {
      console.error('RPC get_daily_summary failed, falling back to legacy', e);
      await _fetchDailyOptionsLegacy();
    }
  }

  async function _fetchDailyOptionsLegacy() {
    try {
      var tables = getTableNames();
      var pageSize = 1000;
      var dailyMap = new Map();
      var countMap = {};
      for (var start = 0; ; start += pageSize) {
        var result = await supabaseClient.from(tables.invoices).select('اليومية, ارشيف').not('اليومية', 'is', null).range(start, start + pageSize - 1);
        if (!result.data || result.data.length === 0) break;
        result.data.forEach(function(r) {
          var d = (r['اليومية'] || '').trim();
          if (!d) return;
          countMap[d] = (countMap[d] || 0) + 1;
          var v = (r['ارشيف'] || '').toString().trim();
          var isArch = v && v !== 'false' && v !== '0';
          if (isArch) dailyMap.set(d, true);
          if (!dailyMap.has(d)) dailyMap.set(d, false);
        });
        if (result.data.length < pageSize) break;
      }
      D.adminDailyCounts = countMap;
      var archived = new Set();
      var dailies = [];
      dailyMap.forEach(function(isArch, d) { dailies.push(d); if (isArch) archived.add(d); });
      D.archivedDailies = archived;
      D.dailyOptions = dailies.sort(function(a, b) {
        var aA = archived.has(a) ? 1 : 0, bA = archived.has(b) ? 1 : 0;
        if (aA !== bA) return aA - bA;
        var dA = a.match(/(\d+)-(\d+)/), dB = b.match(/(\d+)-(\d+)/);
        if (dA && dB) return (parseInt(dB[2]) * 100 + parseInt(dB[1])) - (parseInt(dA[2]) * 100 + parseInt(dA[1]));
        return _dailyToSortVal(b) - _dailyToSortVal(a);
      });
    } catch(e) { console.error('Failed to fetch daily options', e); }
  }

  async function _fetchUsers() {
    var user = Auth.user;
    if (!user || user.role !== 'admin') return;
    D.isUsersLoading = true;
    try {
      var tables = getTableNames();
      var result = await supabaseClient.from(tables.users).select('*').order('created_at', { ascending: false });
      if (result.error) { Toast.error('حدث خطأ أثناء جلب حسابات المناديب'); }
      else { D.usersList = result.data || []; }
    } catch(e) { Toast.error('أخفق الاتصال بالخادم لجلب المناديب'); }
    finally { D.isUsersLoading = false; }
  }

  async function _handleSaveUser(e) {
    e.preventDefault();
    if (!D.formUsername.trim() || !D.formPhone.trim() || !D.formEmail.trim()) { Toast.error('يرجى ملء جميع الخانات الأساسية'); return; }
    if (!D.formEmail.includes('@')) { Toast.error('يرجى إدخال بريد إلكتروني صحيح'); return; }
    if (!D.editingUser && !D.formPassword) { Toast.error('يرجى تعيين كلمة مرور للحساب الجديد'); return; }
    try {
      D.isUsersLoading = true; _renderDashboardMain();
      var tables = getTableNames();
      if (D.editingUser) {
        var upd = { username: D.formUsername.trim(), phone: D.formPhone.trim(), email: D.formEmail.trim(), role: D.formRole, approved: D.formApproved };
        if (D.formPassword.trim()) upd.password = D.formPassword.trim();
        var r = await supabaseClient.from(tables.users).update(upd).eq('id', D.editingUser.id);
        if (r.error) throw r.error;
        Toast.success('تم تعديل حساب المندوب بنجاح');
      } else {
        var newUser = { username: D.formUsername.trim(), phone: D.formPhone.trim(), email: D.formEmail.trim(), password: D.formPassword.trim(), role: D.formRole, approved: D.formApproved };
        var r = await supabaseClient.from(tables.users).insert([newUser]);
        if (r.error) throw r.error;
        Toast.success('تم إنشاء حساب المندوب الجديد بنجاح');
      }
      _resetUserForm();
      await _fetchUsers();
      _renderDashboardMain();
    } catch(e) { Toast.error('فشلت العملية: ' + (e.message || 'خطأ غير معروف')); }
    finally { D.isUsersLoading = false; }
  }

  async function _handleDeleteUser(userId, username) {
    if (!confirm('هل أنت متأكد من حذف حساب المندوب "' + username + '" نهائياً؟')) return;
    try {
      D.isUsersLoading = true; _renderDashboardMain();
      var tables = getTableNames();
      var r = await supabaseClient.from(tables.users).delete().eq('id', userId);
      if (r.error) throw r.error;
      Toast.success('تم حذف حساب المندوب بنجاح');
      await _fetchUsers();
      _renderDashboardMain();
    } catch(e) { Toast.error('حدث خطأ أثناء الحذف: ' + (e.message || '')); }
    finally { D.isUsersLoading = false; }
  }

  async function _handleToggleApproved(u) {
    var newVal = !u.approved;
    D.usersList = D.usersList.map(function(x) { return x.id === u.id ? Object.assign({}, x, { approved: newVal }) : x; });
    _renderDashboardMain();
    try {
      var tables = getTableNames();
      var r = await supabaseClient.from(tables.users).update({ approved: newVal }).eq('id', u.id);
      if (r.error) throw r.error;
      Toast.success(newVal ? 'تم تفعيل الحساب بنجاح' : 'تم إيقاف الحساب بنجاح');
    } catch(e) {
      Toast.error('فشل تغيير حالة الحساب: ' + (e.message || ''));
      D.usersList = D.usersList.map(function(x) { return x.id === u.id ? Object.assign({}, x, { approved: !newVal }) : x; });
      _renderDashboardMain();
    }
  }

  function _startEditUser(u) {
    D.editingUser = u;
    D.formUsername = u.username || '';
    D.formPhone = u.phone || '';
    D.formEmail = u.email || '';
    D.formPassword = '';
    D.formRole = u.role || 'rep';
    D.formApproved = u.approved !== false;
    D.showUserForm = true;
    _renderDashboardMain();
  }

  function _renderAdminView() {
    var h = '<div class="space-y-6 animate-fadeIn">';
    h += '<div class="flex border border-border-subtle p-1 bg-bg-surface rounded-2xl shadow-sm">';
    h += '<button data-admin-tab="stats" class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ' + (D.adminTab === 'stats' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-text-main') + '">' + icon('trending', 'w-4 h-4') + ' لوحة الإحصائيات العامة</button>';
    h += '<button data-admin-tab="users" class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ' + (D.adminTab === 'users' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-text-main') + '">' + icon('users', 'w-4 h-4') + ' إدارة الحسابات</button>';
    h += '<button data-admin-tab="archive" class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ' + (D.adminTab === 'archive' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-text-main') + '">' + icon('box', 'w-4 h-4') + ' تحليل المؤرشفة</button>';
    h += '</div>';

    if (D.adminTab === 'stats') { h += _renderAdminStats(); }
    else if (D.adminTab === 'archive') { h += _renderArchiveStats(); }
    else { h += _renderAdminUsers(); }
    h += '</div>';
    return h;
  }

  function _renderAdminStats() {
    var filtered = D.selectedDaily === 'الكل' ? D.shipments : D.shipments.filter(function(s) { return (s['اليومية'] || '').trim() === D.selectedDaily; });
    var sc = { 'تم': 0, 'قيد التوصيل': 0, 'مؤجل': 0, 'الغاء': 0, 'شحن': 0, 'تعديل سعر': 0 };
    var paidDone = 0, paidPA = 0, paidShip = 0, totalPaid = 0, totalComm = 0, other = 0;
    filtered.forEach(function(s) {
      var st = (s['الحالة'] || '').trim();
      if (st === 'إلغاء') st = 'الغاء';
      if (st in sc) { sc[st]++; var p = Number(s['المدفوع'] || 0); if (st === 'تم') paidDone += p; else if (st === 'تعديل سعر') paidPA += p; else if (st === 'شحن') paidShip += p; }
      else other++;
      if (_isEligible(st)) { totalPaid += Number(s['المدفوع'] || 0); totalComm += Number(s['عمولة المندوب'] || 0); }
    });

    var filtered2 = D.courierStatusFilter ? filtered.filter(function(s) { return (s['الحالة'] || '').trim() === D.courierStatusFilter; }) : filtered;
    var cmap = {};
    filtered2.forEach(function(s) {
      var cn = s['المندوب'] || 'غير محدد';
      if (!cmap[cn]) cmap[cn] = { total: 0, delivered: 0, 'تم': 0, 'قيد التوصيل': 0, 'تعديل سعر': 0, 'شحن': 0, 'مؤجل': 0, 'الغاء': 0, paidForDone: 0, paidForPA: 0, paidForShip: 0, paid: 0, commission: 0 };
      cmap[cn].total++;
      var st = (s['الحالة'] || '').trim();
      if (st in cmap[cn]) cmap[cn][st]++;
      var p = Number(s['المدفوع'] || 0);
      if (st === 'تم') cmap[cn].paidForDone += p;
      else if (st === 'تعديل سعر') cmap[cn].paidForPA += p;
      else if (st === 'شحن') cmap[cn].paidForShip += p;
      if (_isEligible(st)) { cmap[cn].paid += p; cmap[cn].commission += Number(s['عمولة المندوب'] || 0); }
      if (_isDelivered(st)) cmap[cn].delivered++;
    });
    var couriers = Object.entries(cmap).map(function(e) {
      var d = e[1], rate = d.total > 0 ? Math.round((d.delivered / d.total) * 100) : 0;
      return { name: e[0], total: d.total, rate: rate, 'تم': d['تم'], 'قيد التوصيل': d['قيد التوصيل'], 'تعديل سعر': d['تعديل سعر'], 'شحن': d['شحن'], 'مؤجل': d['مؤجل'], 'الغاء': d['الغاء'], paidForDone: d.paidForDone, paidForPA: d.paidForPA, paidForShip: d.paidForShip, paid: d.paid, commission: d.commission, remittance: d.paid - d.commission };
    }).sort(function(a, b) { return b.total - a.total; });

    var fc = D.adminRepSearch.trim() ? couriers.filter(function(c) { return c.name.toLowerCase().includes(D.adminRepSearch.toLowerCase()); }) : couriers;

    var dailyList = D.dailyOptions;
    var archiveSet = D.archivedDailies;
    var activeDays = dailyList.filter(function(d) { return !archiveSet.has(d); });
    var archivedDays = dailyList.filter(function(d) { return archiveSet.has(d); });

    var h = '<div class="space-y-6">';
    h += '<div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border-subtle pb-3 gap-3">';
    h += '<div><h2 class="text-lg font-bold text-text-main flex items-center gap-2">' + icon('trending', 'w-5 h-5 text-primary') + ' إحصائيات النظام العامة</h2></div>';
    h += '<div class="flex items-center gap-2 self-start sm:self-auto bg-bg-surface border border-border-subtle rounded-xl px-3 py-1.5 shadow-sm">';
    h += '<span class="text-xs font-bold text-text-muted">اليومية:</span>';
    h += '<select data-admin-daily class="bg-transparent text-xs sm:text-sm text-text-main font-bold focus:outline-none cursor-pointer min-w-[120px]" dir="rtl">';
    h += '<option value="الكل" class="bg-bg-surface text-text-main"' + (D.selectedDaily === 'الكل' ? ' selected' : '') + '>كل اليوميات</option>';
    dailyList.filter(function(day) { return (D.archiveFilter === 'نشطة' && !archiveSet.has(day)) || (D.archiveFilter === 'مؤرشفة' && archiveSet.has(day)); }).forEach(function(day) {
      var cnt = D.adminDailyCounts[day] || 0;
      var sty = archiveSet.has(day) ? ' style="color:#ef4444"' : '';
      h += '<option value="' + day + '"' + (D.selectedDaily === day ? ' selected' : '') + ' class="bg-bg-surface text-text-main"' + sty + '>' + day + ' (' + cnt + ')</option>';
    });
    h += '</select>';
    var archActiveAdmin = D.archiveFilter === 'نشطة';
    var archLabelAdmin = archActiveAdmin ? 'نشطة' : 'مؤرشفة';
    var archCountAdmin = archActiveAdmin ? activeDays.length : archivedDays.length;
    var archColorAdmin = archActiveAdmin ? 'bg-primary/20 border-primary text-primary' : 'bg-red-500/10 border-red-500/30 text-red-500';
    h += '<button data-admin-archive class="text-center px-2.5 py-1.5 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer ' + archColorAdmin + '">' + archLabelAdmin + ' (' + archCountAdmin + ')</button></div></div>';

    var totalAll = D.selectedDaily === 'الكل' ? null : filtered.length;
    var noRepCount = (D.selectedDaily === 'الكل' ? D.shipments : filtered).filter(function(s) { return !(s['المندوب'] || '').trim(); }).length;

    h += '<div class="bg-bg-surface border border-border-subtle rounded-2xl p-3 shadow-sm">';
    h += '<h3 class="text-xs font-bold text-text-main mb-2 flex items-center gap-2">' + icon('box', 'w-3.5 h-3.5 text-primary') + ' توزيع حالات الشحنات</h3>';
    h += '<div class="grid grid-cols-2 gap-2 mb-2">';
    h += '<div class="p-2 rounded-lg bg-gradient-to-l from-primary/15 to-primary/5 border border-primary/20 text-center"><span class="text-[10px] font-bold text-primary/80 flex items-center justify-center gap-1 mb-0.5">' + icon('bar-chart', 'w-3 h-3') + ' الشحنات</span><span class="text-sm font-black text-primary">' + (totalAll === null ? '—' : totalAll) + '</span></div>';
    h += '<div class="p-2 rounded-lg bg-gradient-to-l from-red-500/15 to-red-500/5 border border-red-500/20 text-center"><span class="text-[10px] font-bold text-red-500/80 flex items-center justify-center gap-1 mb-0.5">بدون مندوب</span><span class="text-sm font-black text-red-500">' + noRepCount + '</span></div>';
    h += '</div>';
    h += '<div class="grid grid-cols-3 gap-2 mb-2">';
    h += '<div class="p-2 rounded-lg border border-blue-500/10 bg-blue-500/5 text-center"><span class="text-[10px] block mb-0.5 font-bold text-blue-500">المدفوع</span><span class="text-xs font-extrabold text-blue-500">' + (totalPaid || 0).toLocaleString() + '</span></div>';
    h += '<div class="p-2 rounded-lg border border-amber-500/10 bg-amber-500/5 text-center"><span class="text-[10px] block mb-0.5 font-bold text-amber-500">عمولة المندوب</span><span class="text-xs font-extrabold text-amber-500">' + (totalComm || 0).toLocaleString() + '</span></div>';
    h += '<div class="p-2 rounded-lg border border-sky-500/10 bg-sky-500/5 text-center"><span class="text-[10px] block mb-0.5 font-bold text-sky-500">التوريد</span><span class="text-xs font-extrabold text-sky-500">' + ((totalPaid - totalComm) || 0).toLocaleString() + '</span></div>';
    h += '</div>';

    var statusItems = [
      { label: 'قيد التوصيل', key: 'قيد التوصيل', count: sc['قيد التوصيل'], tc: 'text-amber-500', bc: 'border-amber-500/10', bg: 'bg-amber-500/5' },
      { label: 'تم', key: 'تم', count: sc['تم'], paid: paidDone, tc: 'text-emerald-500', bc: 'border-emerald-500/10', bg: 'bg-emerald-500/5' },
      { label: 'تعديل سعر', key: 'تعديل سعر', count: sc['تعديل سعر'], paid: paidPA, tc: 'text-gray-400', bc: 'border-gray-500/10', bg: 'bg-gray-500/5' },
      { label: 'شحن', key: 'شحن', count: sc['شحن'], paid: paidShip, tc: 'text-blue-500', bc: 'border-blue-500/10', bg: 'bg-blue-500/5' },
      { label: 'الغاء', key: 'الغاء', count: sc['الغاء'], tc: 'text-red-500', bc: 'border-red-500/10', bg: 'bg-red-500/5' },
      { label: 'مؤجل', key: 'مؤجل', count: sc['مؤجل'], tc: 'text-orange-500', bc: 'border-orange-500/10', bg: 'bg-orange-500/5' },
    ];
    h += '<div class="grid grid-cols-2 sm:grid-cols-3 gap-2">';
    statusItems.forEach(function(item) {
      var ring = D.courierStatusFilter === item.key ? ' ring-2 ring-offset-1 ring-offset-bg-surface animate-pulse ' + item.tc.replace('text-', 'ring-') : '';
      h += '<div data-status-filter="' + item.key + '" class="p-2 rounded-lg border text-center cursor-pointer transition-all duration-300' + ring + ' ' + item.bc + ' ' + item.bg + '">';
      h += '<span class="text-[10px] block mb-0.5 font-bold ' + item.tc + '">' + item.label + '</span>';
      h += '<span class="text-xs font-extrabold ' + item.tc + '">' + item.count + '</span>';
      if (item.paid !== undefined) h += '<span class="text-[9px] block mt-0.5 font-bold ' + item.tc + '">' + (item.paid || 0).toLocaleString() + '</span>';
      h += '</div>';
    });
    h += '</div></div>';

    h += '<div class="bg-bg-surface border border-border-subtle rounded-2xl p-5 shadow-sm">';
    h += '<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">';
    h += '<h3 class="text-sm font-bold text-text-main flex items-center gap-2">' + icon('users', 'w-4 h-4 text-primary') + ' إحصائيات المناديب بالتفصيل (' + fc.length + ')' + (D.courierStatusFilter ? '<span class="text-xs text-text-muted font-normal">— فلتر: ' + D.courierStatusFilter + ' <button data-clear-cfilter class="text-red-400 hover:text-red-300 mr-1 text-sm">✕</button></span>' : '') + '</h3>';
    h += '<div class="flex items-center gap-2 w-full sm:w-auto">';
    h += '<select data-courier-sort class="bg-bg-main text-xs text-text-main border border-gray-700 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">';
    h += '<option value="نسبة-تنازلي"' + (D.courierSortBy === 'نسبة-تنازلي' ? ' selected' : '') + '>الأعلى نسبة</option>';
    h += '<option value="نسبة-تصاعدي"' + (D.courierSortBy === 'نسبة-تصاعدي' ? ' selected' : '') + '>الأقل نسبة</option>';
    h += '<option value="شحنات-تنازلي"' + (D.courierSortBy === 'شحنات-تنازلي' ? ' selected' : '') + '>الأعلى شحنات</option>';
    h += '<option value="شحنات-تصاعدي"' + (D.courierSortBy === 'شحنات-تصاعدي' ? ' selected' : '') + '>الأقل شحنات</option>';
    h += '</select>';
    h += '<input type="text" data-admin-rep-search value="' + escHtml(D.adminRepSearch) + '" placeholder="البحث باسم المندوب..." class="w-full sm:w-48 bg-bg-main text-sm text-text-main border border-gray-700 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all" />';
    h += '</div></div>';

    h += '<div class="space-y-4">';
    var sorted = fc.slice().sort(function(a, b) {
      if (D.courierSortBy === 'نسبة-تنازلي') return b.rate - a.rate;
      if (D.courierSortBy === 'نسبة-تصاعدي') return a.rate - b.rate;
      if (D.courierSortBy === 'شحنات-تصاعدي') return a.total - b.total;
      return b.total - a.total;
    });
    if (sorted.length > 0) {
      sorted.forEach(function(c) {
        h += '<div class="border border-border-subtle rounded-xl p-4 bg-bg-main/20 hover:border-border-strong transition-all">';
        h += '<div class="flex justify-between items-start mb-3"><div><h4 class="font-bold text-text-main text-sm">' + escHtml(c.name) + '</h4>';
        h += '<span class="text-xs text-text-muted cursor-pointer hover:text-primary transition-colors" data-toggle-courier="' + escHtml(c.name) + '">' + (D.expandedCouriers.has(c.name) ? icon('chevron-down', 'w-3 h-3 inline') : icon('chevron-left', 'w-3 h-3 inline')) + ' معدل التسليم: ' + c.rate + '%</span></div>';
        h += '<div class="text-left"><span class="text-xs font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-lg">' + c.total + ' شحنة</span></div></div>';
        h += '<div class="w-full bg-black/10 dark:bg-white/5 rounded-full h-1.5 mb-4 overflow-hidden"><div class="bg-emerald-500 h-1.5 rounded-full transition-all duration-300" style="width:' + c.rate + '%"></div></div>';

        if (D.expandedCouriers.has(c.name)) {
          var items = [
            { label: 'قيد التوصيل', key: 'قيد التوصيل', tc: 'text-amber-500', bc: 'border-amber-500/10', bg: 'bg-amber-500/5' },
            { label: 'تم', key: 'تم', tc: 'text-emerald-500', bc: 'border-emerald-500/10', bg: 'bg-emerald-500/5', pk: 'paidForDone' },
            { label: 'تعديل سعر', key: 'تعديل سعر', tc: 'text-gray-400', bc: 'border-gray-500/10', bg: 'bg-gray-500/5', pk: 'paidForPA' },
            { label: 'شحن', key: 'شحن', tc: 'text-blue-500', bc: 'border-blue-500/10', bg: 'bg-blue-500/5', pk: 'paidForShip' },
            { label: 'الغاء', key: 'الغاء', tc: 'text-red-500', bc: 'border-red-500/10', bg: 'bg-red-500/5' },
            { label: 'مؤجل', key: 'مؤجل', tc: 'text-orange-500', bc: 'border-orange-500/10', bg: 'bg-orange-500/5' },
          ];
          h += '<div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">';
          items.forEach(function(it) {
            h += '<div class="p-2 rounded-lg border ' + it.bc + ' ' + it.bg + '"><span class="text-[10px] block mb-0.5 font-bold ' + it.tc + '">' + it.label + '</span><span class="text-xs font-extrabold ' + it.tc + '">' + (c[it.key] || 0) + '</span>';
            if (it.pk) h += '<span class="text-[9px] block mt-0.5 font-bold ' + it.tc + '">' + (c[it.pk] || 0).toLocaleString() + '</span>';
            h += '</div>';
          });
          h += '<div class="col-span-full h-px bg-border-subtle my-1"></div>';
          h += '<div class="bg-blue-500/5 p-2 rounded-lg border border-blue-500/10"><span class="text-[10px] text-blue-500 block mb-0.5 font-bold">المدفوع</span><span class="text-xs font-extrabold text-blue-500">' + (c.paid || 0).toLocaleString() + '</span></div>';
          h += '<div class="bg-amber-500/5 p-2 rounded-lg border border-amber-500/10"><span class="text-[10px] text-amber-500 block mb-0.5 font-bold">عمولة المندوب</span><span class="text-xs font-extrabold text-amber-500">' + (c.commission || 0).toLocaleString() + '</span></div>';
          h += '<div class="bg-sky-500/5 p-2 rounded-lg border border-sky-500/10"><span class="text-[10px] text-sky-500 block mb-0.5 font-bold">التوريد</span><span class="text-xs font-extrabold text-sky-500">' + (c.remittance || 0).toLocaleString() + '</span></div>';
          h += '</div>';
        }
        h += '</div>';
      });
    } else {
      h += '<div class="text-center py-6 text-text-muted text-sm">لا يوجد مناديب مطابقين للبحث</div>';
    }
    h += '</div></div></div>';
    return h;
  }

  function _renderAdminUsers() {
    var h = '<div class="space-y-6 animate-fadeIn">';
    h += '<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border-subtle pb-3 gap-3">';
    h += '<div><h2 class="text-lg font-bold text-text-main flex items-center gap-2">' + icon('users', 'w-5 h-5 text-primary') + ' إدارة الحسابات</h2></div>';
    h += '<button data-show-user-form class="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer">' + icon('user-plus', 'w-4 h-4') + ' إضافة حساب جديد</button>';
    h += '</div>';

    if (D.showUserForm) {
      h += '<div class="bg-bg-surface border-2 border-primary/30 rounded-2xl p-5 shadow-lg space-y-4 animate-fadeIn">';
      h += '<div class="flex items-center justify-between border-b border-border-subtle pb-2"><h3 class="text-sm font-bold text-text-main flex items-center gap-2">' + (D.editingUser ? icon('edit-2', 'w-4 h-4 text-primary') + ' تعديل حساب: ' + escHtml(D.editingUser.username) : icon('user-plus', 'w-4 h-4 text-primary') + ' إنشاء حساب مندوب جديد') + '</h3><button data-cancel-user-form class="text-text-muted hover:text-text-main text-xs p-1">الغاء</button></div>';
      h += '<form data-user-form class="space-y-4">';
      h += '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">';
      h += '<div><label class="block text-xs font-bold text-text-muted mb-1">اسم المندوب (الكامل)</label><div class="relative"><span class="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted pointer-events-none">' + icon('users', 'w-4 h-4') + '</span><input type="text" data-form-username value="' + escHtml(D.formUsername) + '" class="w-full bg-bg-main text-sm text-text-main border border-gray-700 rounded-xl pr-10 pl-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all" placeholder="أحمد علي محمد" required /></div></div>';
      h += '<div><label class="block text-xs font-bold text-text-muted mb-1">رقم الموبايل</label><div class="relative"><span class="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted pointer-events-none">' + icon('phone', 'w-4 h-4') + '</span><input type="tel" data-form-phone value="' + escHtml(D.formPhone) + '" class="w-full bg-bg-main text-sm text-text-main border border-gray-700 rounded-xl pr-10 pl-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all" placeholder="01xxxxxxxxx" required /></div></div>';
      h += '<div><label class="block text-xs font-bold text-text-muted mb-1">البريد الإلكتروني</label><div class="relative"><span class="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted pointer-events-none">' + icon('mail', 'w-4 h-4') + '</span><input type="email" data-form-email value="' + escHtml(D.formEmail) + '" class="w-full bg-bg-main text-sm text-text-main border border-gray-700 rounded-xl pr-10 pl-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all" placeholder="rep@apklite.com" required /></div></div>';
      h += '<div><label class="block text-xs font-bold text-text-muted mb-1">' + (D.editingUser ? 'كلمة المرور الجديدة (اتركه فارغاً بعدم التعديل)' : 'كلمة المرور') + '</label><div class="relative"><span class="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted pointer-events-none">' + icon('lock', 'w-4 h-4') + '</span><input type="password" data-form-password value="' + escHtml(D.formPassword) + '" class="w-full bg-bg-main text-sm text-text-main border border-gray-700 rounded-xl pr-10 pl-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all" placeholder="' + (D.editingUser ? 'بلا تغيير' : '••••••••') + '"' + (!D.editingUser ? ' required' : '') + ' /></div></div>';
      h += '<div><label class="block text-xs font-bold text-text-muted mb-1">صلاحية الحساب</label><div class="relative"><span class="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted pointer-events-none">' + icon('shield', 'w-4 h-4') + '</span><select data-form-role class="w-full bg-bg-main text-sm text-text-main border border-gray-700 rounded-xl pr-10 pl-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all appearance-none"><option value="rep"' + (D.formRole === 'rep' ? ' selected' : '') + '>مندوب توصيل (rep)</option><option value="follower"' + (D.formRole === 'follower' ? ' selected' : '') + '>متابعة (follower)</option><option value="admin"' + (D.formRole === 'admin' ? ' selected' : '') + '>مدير النظام (admin)</option></select></div></div>';
      h += '<div class="flex items-center justify-start gap-3 h-full pt-5"><label class="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" data-form-approved' + (D.formApproved ? ' checked' : '') + ' class="w-4 h-4 rounded border-gray-600 text-primary bg-bg-main focus:ring-primary" /><span class="text-xs font-bold text-text-main">تفعيل الحساب مباشرة</span></label></div>';
      h += '</div>';
      h += '<div class="flex justify-end gap-2 pt-2"><button type="button" data-cancel-user-form class="bg-bg-main border border-gray-700 hover:bg-black/20 text-text-main font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer">الغاء</button><button type="submit" class="bg-primary hover:bg-primary/90 text-white font-bold py-2 px-5 rounded-xl text-xs transition-all shadow-md cursor-pointer">' + (D.editingUser ? 'تحديث البيانات' : 'إنشاء الحساب') + '</button></div>';
      h += '</form></div>';
    }

    var filteredUsers = D.usersList
      .filter(function(u) { return D.userRoleTab === 'الكل' || u.role === (D.userRoleTab === 'مدراء' ? 'admin' : D.userRoleTab === 'متابعة' ? 'follower' : 'rep'); })
      .filter(function(u) {
        if (!D.usersSearchQuery.trim()) return true;
        var q = D.usersSearchQuery.toLowerCase();
        return (u.username || '').toLowerCase().includes(q) || (u.phone || '').includes(q) || (u.email || '').toLowerCase().includes(q);
      });

    h += '<div class="bg-bg-surface border border-border-subtle rounded-2xl p-5 shadow-sm space-y-4">';
    h += '<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">';
    h += '<h3 class="text-sm font-bold text-text-main flex items-center gap-2">' + icon('users', 'w-4 h-4 text-primary') + ' قائمة الحسابات (' + filteredUsers.length + ')</h3>';
    h += '<input type="text" data-users-search value="' + escHtml(D.usersSearchQuery) + '" placeholder="البحث باسم أو هاتف أو بريد..." class="w-full sm:w-64 bg-bg-main text-sm text-text-main border border-gray-700 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all" />';
    h += '</div>';

    h += '<div class="flex gap-1 p-0.5 bg-bg-main/50 rounded-lg border border-border-subtle w-fit">';
    ['الكل', 'مدراء', 'مناديب', 'متابعة'].forEach(function(role) {
      h += '<button data-role-tab="' + role + '" class="px-4 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ' + (D.userRoleTab === role ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text-main') + '">' + role + '</button>';
    });
    h += '</div>';

    if (D.isUsersLoading && D.usersList.length === 0) {
      h += '<div class="text-center py-8"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div><p class="text-xs text-text-muted">جاري تحميل الحسابات...</p></div>';
    } else {
      h += '<div class="space-y-3">';
      var user = Auth.user;
      filteredUsers.forEach(function(u) {
        var isSelf = u.id === user.id;
        var borderCls = !u.approved ? 'opacity-70 border-dashed border-red-500/30 bg-red-500/5' : 'border-border-subtle';
        h += '<div class="border rounded-xl p-4 bg-bg-main/10 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all hover:border-border-strong ' + borderCls + '">';
        h += '<div class="space-y-1"><div class="flex items-center gap-2"><h4 class="font-bold text-text-main text-sm">' + escHtml(u.username) + '</h4>';
        if (isSelf) h += '<span class="text-[10px] bg-primary/20 text-primary font-bold px-1.5 py-0.5 rounded">أنت</span>';
        var roleColor = u.role === 'admin' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : u.role === 'follower' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
        var roleLabel = u.role === 'admin' ? 'مدير' : u.role === 'follower' ? 'متابعة' : 'مندوب';
        h += '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full ' + roleColor + '">' + roleLabel + '</span></div>';
        h += '<div class="text-[10px] text-text-muted pt-1">تاريخ الإنشاء: ' + new Date(u.created_at).toLocaleDateString('en-GB') + '</div></div>';
        h += '<div class="flex items-center justify-end gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-border-subtle">';
        h += '<button data-toggle-approve="' + u.id + '"' + (isSelf ? ' disabled' : '') + ' class="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ' + (u.approved ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/20') + '" title="' + (u.approved ? 'إيقاف الحساب' : 'تفعيل الحساب') + '">' + (u.approved ? icon('user-x', 'w-3.5 h-3.5') + ' إيقاف الحساب' : icon('user-check', 'w-3.5 h-3.5') + ' تفعيل الحساب') + '</button>';
        h += '<button data-edit-user="' + u.id + '" class="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border-subtle bg-bg-surface hover:bg-black/5 dark:hover:bg-white/5 text-text-main font-bold transition-all cursor-pointer" title="تعديل الحساب">' + icon('edit-2', 'w-3.5 h-3.5') + ' تعديل</button>';
        h += '<button data-delete-user="' + u.id + '" data-username="' + escHtml(u.username) + '"' + (isSelf ? ' disabled' : '') + ' class="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-red-500 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer" title="حذف الحساب نهائياً">' + icon('trash', 'w-3.5 h-3.5') + '</button>';
        h += '</div></div>';
      });
      h += '</div>';
    }
    h += '</div></div>';
    return h;
  }

  var _archiveStatsCache = { data: null, timestamp: 0 };
  var _ARCHIVE_STATS_CACHE_TTL = 60000;

  async function _fetchArchiveStats() {
    var user = Auth.user;
    if (!user || user.role !== 'admin') return;
    var now = Date.now();
    if (_archiveStatsCache.data && (now - _archiveStatsCache.timestamp) < _ARCHIVE_STATS_CACHE_TTL) {
      D.archiveStats = _archiveStatsCache.data;
      return;
    }
    try {
      var results = await Promise.all([
        supabaseClient.rpc('get_archive_summary'),
        supabaseClient.rpc('get_archive_daily_summary'),
        supabaseClient.rpc('get_archive_rep_summary')
      ]);
      if (results[0].error || results[1].error || results[2].error) throw (results[0].error || results[1].error || results[2].error);
      var data = { summary: results[0].data || [], daily: results[1].data || [], reps: results[2].data || [] };
      D.archiveStats = data;
      _archiveStatsCache = { data: data, timestamp: now };
    } catch (e) {
      console.warn('RPC get_archive_* failed, falling back to client-side computation', e);
      await _fetchArchiveStatsLegacy();
    }
  }

  async function _fetchArchiveStatsLegacy() {
    try {
      var tables = getTableNames();
      var pageSize = 1000;
      var allArchived = [];
      for (var start = 0; ; start += pageSize) {
        var result = await supabaseClient.from(tables.invoices).select('اليومية, ارشيف, الحالة, المدفوع, "عمولة المندوب", المندوب').not('ارشيف', 'is', null).range(start, start + pageSize - 1);
        if (!result.data || result.data.length === 0) break;
        result.data.forEach(function(s) {
          var v = (s['ارشيف'] || '').toString().trim();
          if (v && v !== 'false' && v !== '0') allArchived.push(s);
        });
        if (result.data.length < pageSize) break;
      }
      var statusCounts = {};
      var totalPaid = 0, totalComm = 0;
      allArchived.forEach(function(s) {
        var st = (s['الحالة'] || '').trim();
        if (st === 'إلغاء') st = 'الغاء';
        statusCounts[st] = (statusCounts[st] || 0) + 1;
        var eligible = st === 'تم' || st === 'تعديل سعر' || st === 'شحن';
        if (eligible) { totalPaid += Number(s['المدفوع'] || 0); totalComm += Number(s['عمولة المندوب'] || 0); }
      });
      var summary = Object.keys(statusCounts).map(function(st) {
        var paid = 0, comm = 0;
        allArchived.forEach(function(s) { var ss = (s['الحالة'] || '').trim(); if (ss === 'إلغاء') ss = 'الغاء'; if (ss === st && (ss === 'تم' || ss === 'تعديل سعر' || ss === 'شحن')) { paid += Number(s['المدفوع'] || 0); comm += Number(s['عمولة المندوب'] || 0); } });
        return { status: st, cnt: statusCounts[st], paid_sum: paid, commission_sum: comm };
      });
      var dailyMap = {};
      allArchived.forEach(function(s) {
        var d = (s['اليومية'] || '').trim(); if (!d) return;
        if (!dailyMap[d]) dailyMap[d] = { cnt: 0, paid: 0, comm: 0 };
        dailyMap[d].cnt++;
        var st = (s['الحالة'] || '').trim(); if (st === 'إلغاء') st = 'الغاء';
        if (st === 'تم' || st === 'تعديل سعر' || st === 'شحن') { dailyMap[d].paid += Number(s['المدفوع'] || 0); dailyMap[d].comm += Number(s['عمولة المندوب'] || 0); }
      });
      var daily = Object.keys(dailyMap).map(function(d) { return { 'اليومية': d, cnt: dailyMap[d].cnt, remittance: dailyMap[d].paid - dailyMap[d].comm }; });
      var repMap = {};
      allArchived.forEach(function(s) {
        var r = (s['المندوب'] || '').trim() || 'غير محدد';
        if (!repMap[r]) repMap[r] = { cnt: 0, comm: 0, paid: 0 };
        repMap[r].cnt++;
        var st = (s['الحالة'] || '').trim(); if (st === 'إلغاء') st = 'الغاء';
        if (st === 'تم' || st === 'تعديل سعر' || st === 'شحن') { repMap[r].comm += Number(s['عمولة المندوب'] || 0); repMap[r].paid += Number(s['المدفوع'] || 0); }
      });
      var reps = Object.keys(repMap).map(function(r) { return { 'المندوب': r, cnt: repMap[r].cnt, commission: repMap[r].comm, remittance: repMap[r].paid - repMap[r].comm }; }).sort(function(a, b) { return b.cnt - a.cnt; });
      var data = { summary: summary, daily: daily, reps: reps };
      D.archiveStats = data;
    } catch (e) { console.error('Legacy archive stats fetch failed', e); }
  }

  function _renderArchiveDonutChart(statusCounts) {
    var colors = { 'تم': '#10b981', 'تعديل سعر': '#9ca3af', 'شحن': '#3b82f6', 'الغاء': '#ef4444' };
    var total = Object.values(statusCounts).reduce(function(a, b) { return a + b; }, 0) || 1;
    var r = 60, cx = 70, cy = 70, circumference = 2 * Math.PI * r;
    var offset = 0, svg = '<svg viewBox="0 0 140 140" class="w-32 h-32 mx-auto">';
    Object.keys(statusCounts).forEach(function(key) {
      var val = statusCounts[key];
      if (!val) return;
      var frac = val / total;
      var dash = frac * circumference;
      svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + colors[key] + '" stroke-width="18" stroke-dasharray="' + dash + ' ' + circumference + '" stroke-dashoffset="' + (-offset) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')"/>';
      offset += dash;
    });
    svg += '</svg>';
    return svg;
  }

  function _renderArchiveStatusRings(statusCounts, totalCount) {
    var total = totalCount || 1;
    var r = 28, cx = 34, cy = 34, circumference = 2 * Math.PI * r;
    var groups = [
      { label: 'تم', val: (statusCounts['تم'] || 0) + (statusCounts['تعديل سعر'] || 0), color: '#10b981' },
      { label: 'شحن', val: statusCounts['شحن'] || 0, color: '#3b82f6' },
      { label: 'الغاء', val: statusCounts['الغاء'] || 0, color: '#ef4444' }
    ];
    var h = '<div class="grid grid-cols-3 gap-2">';
    groups.forEach(function(g) {
      var pct = Math.round((g.val / total) * 100);
      var dash = (g.val / total) * circumference;
      h += '<div class="text-center">';
      h += '<svg viewBox="0 0 68 68" class="w-16 h-16 mx-auto">';
      h += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--border-subtle, #e5e7eb)" stroke-width="7"/>';
      h += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + g.color + '" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + dash + ' ' + circumference + '" transform="rotate(-90 ' + cx + ' ' + cy + ')"/>';
      h += '<text x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">' + pct + '%</text>';
      h += '</svg>';
      h += '<span class="text-[10px] font-bold text-text-muted block mt-1">' + g.label + ' (' + g.val + ')</span>';
      h += '</div>';
    });
    h += '</div>';
    return h;
  }

  function _renderArchiveDailyBars(dailyData) {
    var monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    var groups = {};
    dailyData.forEach(function(row) {
      var parts = (row['اليومية'] || '').split('/');
      if (parts.length !== 3) return;
      var day = parseInt(parts[0], 10) || 0;
      var month = parseInt(parts[1], 10) || 1;
      var year = parseInt(parts[2], 10) || 0;
      var key = year + '-' + month;
      if (!groups[key]) groups[key] = { year: year, month: month, items: [] };
      groups[key].items.push({ day: day, cnt: Number(row.cnt || 0), full: row['اليومية'] });
    });
    var keys = Object.keys(groups).sort(function(a, b) { return groups[b].year * 100 + groups[b].month - (groups[a].year * 100 + groups[a].month); });
    var h = '';
    keys.forEach(function(key) {
      var g = groups[key];
      var maxCnt = Math.max.apply(null, g.items.map(function(it) { return it.cnt; })) || 1;
      h += '<div class="mb-4">';
      h += '<div class="text-xs font-bold text-text-muted mb-2">' + monthNames[g.month - 1] + ' ' + g.year + '</div>';
      h += '<div class="flex items-end gap-2 overflow-x-auto" style="height:100px">';
      g.items.sort(function(a, b) { return a.day - b.day; }).forEach(function(it) {
        var pct = Math.max(8, Math.round((it.cnt / maxCnt) * 100));
        h += '<div class="flex flex-col items-center flex-shrink-0" style="width:28px">';
        h += '<span class="text-[9px] font-bold text-primary mb-1">' + it.cnt + '</span>';
        h += '<div class="w-full rounded-t-md bg-primary/70" style="height:' + pct + '%"></div>';
        h += '<span class="text-[9px] text-text-muted mt-1">' + it.day + '</span>';
        h += '</div>';
      });
      h += '</div></div>';
    });
    return h || '<p class="text-xs text-text-muted text-center py-4">لا توجد يوميات مؤرشفة</p>';
  }

  function _renderArchiveStats() {
    var data = D.archiveStats;
    if (!data) {
      return '<div class="text-center py-8"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div><p class="text-xs text-text-muted">جاري تحميل إحصائيات المؤرشفة...</p></div>';
    }

    var statusCounts = { 'تم': 0, 'تعديل سعر': 0, 'شحن': 0, 'الغاء': 0 };
    var totalPaid = 0, totalComm = 0;
    (data.summary || []).forEach(function(row) {
      var st = (row.status || '').trim();
      if (st === 'إلغاء') st = 'الغاء';
      if (st in statusCounts) statusCounts[st] = Number(row.cnt || 0);
      totalPaid += Number(row.paid_sum || 0);
      totalComm += Number(row.commission_sum || 0);
    });
    var totalRemittance = totalPaid - totalComm;
    var totalCount = Object.values(statusCounts).reduce(function(a, b) { return a + b; }, 0);

    var statusItems = [
      { label: 'تم', key: 'تم', tc: 'text-emerald-500', bc: 'border-emerald-500/10', bg: 'bg-emerald-500/5' },
      { label: 'تعديل سعر', key: 'تعديل سعر', tc: 'text-gray-400', bc: 'border-gray-500/10', bg: 'bg-gray-500/5' },
      { label: 'شحن', key: 'شحن', tc: 'text-blue-500', bc: 'border-blue-500/10', bg: 'bg-blue-500/5' },
      { label: 'الغاء', key: 'الغاء', tc: 'text-red-500', bc: 'border-red-500/10', bg: 'bg-red-500/5' },
    ];

    var h = '<div class="space-y-6 animate-fadeIn">';
    h += '<div class="flex items-center border-b border-border-subtle pb-3 gap-2">';
    h += icon('box', 'w-5 h-5 text-primary');
    h += '<h2 class="text-lg font-bold text-text-main">تحليل المؤرشفة</h2>';
    h += '</div>';

    h += '<div class="bg-bg-surface border border-border-subtle rounded-2xl p-5 shadow-sm">';
    h += '<h3 class="text-xs font-bold text-text-main mb-3 flex items-center gap-2">' + icon('box', 'w-3.5 h-3.5 text-primary') + ' ملخص عام</h3>';
    h += _renderArchiveStatusRings(statusCounts, totalCount);
    h += '</div>';

    h += '<div class="bg-bg-surface border border-border-subtle rounded-2xl p-5 shadow-sm">';
    h += '<h3 class="text-xs font-bold text-text-main mb-3 flex items-center gap-2">' + icon('box', 'w-3.5 h-3.5 text-primary') + ' تفصيل حسب اليومية المؤرشفة</h3>';
    h += _renderArchiveDailyBars(data.daily);
    h += '</div>';

    h += '<div class="bg-bg-surface border border-border-subtle rounded-2xl p-5 shadow-sm">';
    h += '<h3 class="text-xs font-bold text-text-main mb-3 flex items-center gap-2">' + icon('users', 'w-3.5 h-3.5 text-primary') + ' أداء المناديب في المؤرشف</h3>';
    if (data.reps && data.reps.length) {
      h += '<div class="overflow-x-auto"><table class="w-full text-xs"><thead><tr class="border-b border-border-subtle">';
      h += '<th class="text-right py-2 px-3 font-bold text-text-muted">المندوب</th>';
      h += '<th class="text-center py-2 px-3 font-bold text-text-muted">الشحنات</th>';
      h += '<th class="text-center py-2 px-3 font-bold text-text-muted">عمولة المندوب</th>';
      h += '<th class="text-center py-2 px-3 font-bold text-text-muted">التوريد</th>';
      h += '</tr></thead><tbody>';
      data.reps.forEach(function(row) {
        h += '<tr class="border-b border-border-subtle/50 hover:bg-black/5 dark:hover:bg-white/5">';
        h += '<td class="py-2 px-3 font-bold text-text-main">' + escHtml(row['المندوب'] || '') + '</td>';
        h += '<td class="py-2 px-3 text-center font-bold text-primary">' + Number(row.cnt || 0) + '</td>';
        h += '<td class="py-2 px-3 text-center font-bold text-amber-500">' + Number(row.commission || 0).toLocaleString() + '</td>';
        h += '<td class="py-2 px-3 text-center font-bold text-sky-500">' + Number(row.remittance || 0).toLocaleString() + '</td>';
        h += '</tr>';
      });
      h += '</tbody></table></div>';
    } else {
      h += '<p class="text-xs text-text-muted text-center py-4">لا توجد بيانات مناديب مؤرشفة</p>';
    }
    h += '</div>';

    h += '</div>';
    return h;
  }
