'use strict';

/* ================================================================
   SECTION 10a: PAGE — DASHBOARD (CORE / SHARED)
   ================================================================ */

  const STATUS_COLORS = {
    'تم': 'border-green-500', 'تم التسليم': 'border-green-500', 'تعديل سعر': 'border-green-500',
    'شحن': 'border-green-500', 'استلم جزئي': 'border-green-500',
    'قيد التوصيل': 'border-amber-500', 'مؤجل': 'border-orange-500', 'الغاء': 'border-red-500',
  };

  const STATUS_TEXT_COLORS = {
    'تم': 'text-emerald-500', 'تم التسليم': 'text-emerald-500', 'قيد التوصيل': 'text-amber-500',
    'مؤجل': 'text-orange-500', 'الغاء': 'text-red-500', 'تعديل سعر': 'text-blue-500',
    'شحن': 'text-blue-500', 'استلم جزئي': 'text-blue-500',
  };

  const HIDE_ACTION_STATUSES = ['تم', 'تم التسليم', 'تعديل سعر', 'شحن', 'الغاء', 'استلم جزئي'];

  const FOLLOWUP_STATUSES = ['الغاء', 'مؤجل', 'تعديل سعر', 'شحن'];


  function _isArchived(s) {
    var v = s['ارشيف'];
    if (!v) return false;
    var t = String(v).trim();
    return t !== '' && t !== 'false' && t !== '0';
  }

  function _isEligible(status) {
    if (!status) return false;
    return ['تم', 'تم التسليم', 'شحن', 'تعديل سعر', 'استلم جزئي'].includes(status.trim());
  }

  function _getFollowupsSent() {
    var u = localStorage.getItem('user');
    var isF = false;
    if (u) { try { isF = JSON.parse(u).role === 'follower'; } catch(e) {} }
    var key = isF ? _getFollowerKey('sent') : 'repFollowupsSent';
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  }

  function _getFollowupsDismissed() {
    var u = localStorage.getItem('user');
    var isF = false;
    if (u) { try { isF = JSON.parse(u).role === 'follower'; } catch(e) {} }
    var key = isF ? _getFollowerKey('dismissed') : 'repFollowupsDismissed';
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  }

  var D = {
    shipments: [], isLoading: true, isRefreshing: false,
    actionsHidden: localStorage.getItem('rep-actions-hidden') === 'true',
    displayLimit: 20, filterNoRep: false,
    notifications: [], notifOpen: false, isInitialNotif: true,
    menuOpen: false, showEditAccount: false, editPhone: '', editPass: '',
    filters: { status: '', search: '', daily: '', zone: '', sender: '', rep: '' },
    repArchiveFilter: (function() { var v = localStorage.getItem('repArchiveFilter'); return (v === 'نشطة' || v === 'مؤرشفة') ? v : 'نشطة'; })(),
    adminTab: 'stats',
    selectedDaily: localStorage.getItem('adminDailyFilter') || 'الكل',
    archiveFilter: (function() { var v = localStorage.getItem('adminArchiveFilter'); return (v === 'نشطة' || v === 'مؤرشفة') ? v : 'نشطة'; })(),
    adminRepSearch: '', courierSortBy: 'نسبة-تنازلي',
    courierStatusFilter: null, expandedCouriers: new Set(),
    dailyOptions: [], archivedDailies: new Set(), adminDailyCounts: {},
    userRoleTab: 'الكل', usersList: [], isUsersLoading: false,
    editingUser: null, showUserForm: false,
    formUsername: '', formPhone: '', formEmail: '', formPassword: '',
    formRole: 'rep', formApproved: true, usersSearchQuery: '',
    archiveStats: null,
    pollInterval: null, notifPollInterval: null,
  };

  function _restoreFilters() {
    var saved = localStorage.getItem('repFilters');
    if (saved) { try { var p = JSON.parse(saved); D.filters = { status: p.status === 'الكل' ? '' : (p.status || ''), search: p.search || '', daily: p.daily || '', zone: p.zone || '', sender: p.sender || '', rep: p.rep || '' }; D.filterNoRep = !!p.filterNoRep; } catch(e) {} }
  }

  function _saveFilters() { localStorage.setItem('repFilters', JSON.stringify(Object.assign({}, D.filters, { filterNoRep: D.filterNoRep }))); }

  function _saveAdminFilters() {
    localStorage.setItem('adminFilters', JSON.stringify({
      courierStatusFilter: D.courierStatusFilter,
      adminRepSearch: D.adminRepSearch
    }));
  }

  function _restoreAdminFilters() {
    var saved = localStorage.getItem('adminFilters');
    if (saved) {
      try {
        var p = JSON.parse(saved);
        D.courierStatusFilter = p.courierStatusFilter || null;
        D.adminRepSearch = p.adminRepSearch || '';
      } catch(e) {}
    }
  }

  async function _fetchShipments(hideLoading, daily) {
    var user = Auth.user;
    if (!user) return;
    if (!hideLoading) D.isLoading = true; else D.isRefreshing = true;

    try {
      if (user.id === 'demo-rep') {
        var stored = localStorage.getItem('demo_shipments');
        D.shipments = stored ? JSON.parse(stored) : [];
        D.isLoading = false; D.isRefreshing = false;
        return;
      }

      var tables = getTableNames();
      var query = supabaseClient.from(tables.invoices).select('*');

      if (user.role !== 'admin' && user.role !== 'follower') {
        var ors = [];
        if (user.username) ors.push('المندوب.eq."' + user.username.trim() + '"');
        if (user.phone) ors.push('المندوب.eq."' + user.phone.trim() + '"');
        if (user.email) ors.push('المندوب.eq."' + user.email.trim() + '"');
        if (ors.length > 0) query = query.or(ors.join(','));
        else query = query.eq('المندوب', 'NOT_FOUND_SECURE_FALLBACK');
      }

      if (daily && daily !== 'الكل') query = query.eq('اليومية', daily);
      if (daily === 'الكل') { D.shipments = []; D.isLoading = false; D.isRefreshing = false; return; }

      query = query.order('id', { ascending: false });
      var allData = [];
      var pageSize = 1000;
      for (var start = 0; ; start += pageSize) {
        var result = await query.range(start, start + pageSize - 1);
        if (result.error) { Toast.error('حدث خطأ أثناء جلب الشحنات'); break; }
        if (!result.data || result.data.length === 0) break;
        allData = allData.concat(result.data);
        if (result.data.length < pageSize) break;
      }
      D.shipments = allData;
    } catch(err) {
      Toast.error('أخفق الاتصال بالخادم');
    } finally {
      D.isLoading = false; D.isRefreshing = false;
    }
  }

  function _renderDialogOverlay(title, content) {
    return '<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" data-dialog="overlay"><div class="bg-bg-surface border border-border-strong rounded-2xl p-5 w-full max-w-sm shadow-2xl animate-fadeIn" data-dialog="content"><div class="flex justify-between items-center mb-4">' + (title ? '<h3 class="text-base font-bold text-text-main">' + title + '</h3>' : '') + '<button data-dialog="close" class="text-text-muted hover:text-text-main p-1 cursor-pointer">' + icon('x', 'w-5 h-5') + '</button></div>' + content + '</div></div>';
  }

  function _renderDashboardMain() {
    var mainEl = document.getElementById('dash-main');
    if (!mainEl) return;
    var user = Auth.user;
    var isAdmin = user && user.role === 'admin';
    var isFollower = user && user.role === 'follower';

    if (D.isLoading) {
      mainEl.innerHTML = '<div class="flex flex-col items-center justify-center h-64 gap-4"><div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div><p class="text-text-muted text-sm">جاري تحميل البيانات...</p></div>';
      return;
    }

    if (isAdmin) {
      mainEl.innerHTML = _renderAdminView();
    } else {
      mainEl.innerHTML = _renderRepFollowerView();
    }
    _bindMainEvents();
  }

  function renderDashboard() {
    var user = Auth.user;
    if (localStorage.getItem('adminArchiveFilter') === 'الكل') localStorage.removeItem('adminArchiveFilter');

    D.notifications = [];
    D.isInitialNotif = true;

    if (D.pollInterval) clearInterval(D.pollInterval);
    if (D.notifPollInterval) clearInterval(D.notifPollInterval);

    var root_html = '<div class="min-h-screen bg-bg-main flex flex-col pb-20 transition-colors duration-200">';

    root_html += '<header class="bg-bg-surface border-b border-border-subtle sticky top-0 z-40 px-4 py-3 flex justify-between items-center shadow-md transition-colors duration-200">';
    root_html += '<div class="flex items-center gap-3"><div class="bg-primary/20 p-2 rounded-lg">' + icon('truck', 'w-5 h-5 text-primary') + '</div><div><h1 class="font-bold text-text-main text-md">APK LITE</h1><p class="text-xs text-text-muted">مرحباً، ' + escHtml(user.username) + '</p></div></div>';
    root_html += '<div class="flex items-center gap-3">';
    root_html += '<div class="relative notif-container"><button id="notif-btn" class="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-text-main transition-colors relative" title="الإشعارات">' + icon('bell', 'w-5 h-5') + '<span id="notif-badge" class="hidden absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-1">0</span></button><div id="notif-panel" class="hidden absolute left-0 top-full mt-2 w-72 max-h-80 overflow-y-auto bg-bg-surface border border-border-subtle rounded-2xl shadow-xl z-50"><div class="text-center py-6 text-text-muted text-sm">لا توجد إشعارات</div></div></div>';
    root_html += '<button id="dash-theme" class="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-text-main transition-colors" title="' + (Theme.isDark ? 'الوضع العادي' : 'الوضع الليلي') + '">' + (Theme.isDark ? icon('sun', 'w-5 h-5 text-amber-400') : icon('moon', 'w-5 h-5 text-slate-700')) + '</button>';
    root_html += '<button id="dash-refresh" class="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-text-main transition-colors" title="تحديث البيانات">' + icon('refresh-cw', 'w-5 h-5') + '</button>';
    root_html += '<div class="relative user-menu-container"><button id="menu-btn" class="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-text-main transition-colors" title="القائمة">' + icon('menu', 'w-5 h-5') + '</button>';
    root_html += '<div id="user-menu" class="hidden absolute left-0 top-full mt-2 w-48 bg-bg-surface border border-border-subtle rounded-2xl shadow-xl z-50 overflow-hidden">';
    if (user.id === 'dev-account') {
      root_html += '<div data-menu-dev class="flex items-center gap-3 px-4 py-3 text-amber-500 hover:bg-amber-500/10 cursor-pointer transition-colors text-sm font-bold">' + icon('settings', 'w-5 h-5') + ' لوحة المطور</div><div class="h-px bg-border-subtle mx-3"></div>';
    }
    root_html += '<div data-menu-edit-account class="flex items-center gap-3 px-4 py-3 text-text-main hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors text-sm font-bold">' + icon('user', 'w-5 h-5 text-primary') + ' تعديل الحساب</div>';
    root_html += '<div class="h-px bg-border-subtle mx-3"></div>';
    root_html += '<div data-menu-logout class="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors text-sm font-bold">' + icon('log-out', 'w-5 h-5') + ' تسجيل الخروج</div>';
    root_html += '</div></div>';
    root_html += '</div></header>';

    root_html += '<main class="flex-1 p-4 max-w-3xl mx-auto w-full" id="dash-main"></main>';
    root_html += '<div id="dialog-container"></div>';
    root_html += '</div>';

    root.innerHTML = root_html;
    _restoreFilters();
    _restoreAdminFilters();
    _renderDashboardMain();

    document.getElementById('dash-theme').addEventListener('click', function() { Theme.toggle(); renderDashboard(); });
    document.getElementById('dash-refresh').addEventListener('click', function() {
      var btn = document.getElementById('dash-refresh');
      if (btn) btn.classList.add('animate-spin', 'text-primary');
      Toast.info('جاري التحديث...');
      _fetchShipments(true, D.selectedDaily).then(function() {
        _checkNotifications(D.shipments);
        _renderDashboardMain();
        if (btn) btn.classList.remove('animate-spin', 'text-primary');
      });
    });
    document.getElementById('dash-logout') && document.getElementById('dash-logout').addEventListener('click', function() { Auth.logout(); navigate('/login'); });
    document.getElementById('menu-btn').addEventListener('click', function(e) {
      e.stopPropagation();
      D.menuOpen = !D.menuOpen;
      document.getElementById('user-menu').classList.toggle('hidden', !D.menuOpen);
    });
    var menuDev = document.querySelector('[data-menu-dev]');
    if (menuDev) menuDev.addEventListener('click', function() { D.menuOpen = false; document.getElementById('user-menu').classList.add('hidden'); window.location.hash = '#/dev'; });
    var menuEdit = document.querySelector('[data-menu-edit-account]');
    if (menuEdit) menuEdit.addEventListener('click', function() {
      D.menuOpen = false; document.getElementById('user-menu').classList.add('hidden');
      D.editPhone = Auth.user.phone || ''; D.editPass = ''; D.showEditAccount = true;
      _showEditAccountDialog();
    });
    var menuLogout = document.querySelector('[data-menu-logout]');
    if (menuLogout) menuLogout.addEventListener('click', function() { Auth.logout(); navigate('/login'); });
    document.getElementById('notif-btn').addEventListener('click', function(e) {
      e.stopPropagation();
      D.notifOpen = !D.notifOpen;
      _renderNotifPanel();
    });

    document.addEventListener('click', function(e) {
      if (D.notifOpen && !e.target.closest('.notif-container')) { D.notifOpen = false; _renderNotifPanel(); }
      if (D.menuOpen && !e.target.closest('.user-menu-container')) { D.menuOpen = false; document.getElementById('user-menu').classList.add('hidden'); }
    });

    var savedScroll = localStorage.getItem('repScrollPos');
    if (savedScroll) setTimeout(function() { window.scrollTo(0, parseInt(savedScroll)); }, 100);

    window.addEventListener('beforeunload', function() { localStorage.setItem('repScrollPos', String(window.scrollY)); });

    (async function() {
      D.isLoading = true; _renderDashboardMain();
      if (user.role === 'admin') {
        await Promise.all([_fetchDailyOptions(), _fetchUsers(), _fetchShipments(false, D.selectedDaily)]);
      } else {
        await _fetchShipments();
      }
      _checkNotifications(D.shipments);
      _renderDashboardMain();
      _startPolling();
    })();
  }

  function _bindMainEvents() {
    var user = Auth.user;
    var isAdmin = user && user.role === 'admin';

    if (isAdmin) {
      document.querySelectorAll('[data-admin-tab]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          D.adminTab = this.getAttribute('data-admin-tab');
          if (D.adminTab === 'archive' && !D.archiveStats) {
            D.isLoading = true; _renderDashboardMain();
            _fetchArchiveStats().then(function() { D.isLoading = false; _renderDashboardMain(); });
          } else {
            _renderDashboardMain();
          }
        });
      });

      var dailySel = document.querySelector('[data-admin-daily]');
      if (dailySel) dailySel.addEventListener('change', function() { D.selectedDaily = this.value; localStorage.setItem('adminDailyFilter', D.selectedDaily); D.isLoading = true; _renderDashboardMain(); _fetchShipments(false, D.selectedDaily).then(function() { D.isLoading = false; _renderDashboardMain(); }); });

      var archSel = document.querySelector('[data-admin-archive]');
      if (archSel) archSel.addEventListener('click', function() { D.archiveFilter = D.archiveFilter === 'نشطة' ? 'مؤرشفة' : 'نشطة'; D.selectedDaily = 'الكل'; localStorage.setItem('adminArchiveFilter', D.archiveFilter); _renderDashboardMain(); });

      document.querySelectorAll('[data-status-filter]').forEach(function(el) {
        el.addEventListener('click', function() {
          var key = this.getAttribute('data-status-filter');
          D.courierStatusFilter = D.courierStatusFilter === key ? null : key;
          _saveAdminFilters();
          _renderDashboardMain();
        });
      });

      var clearBtn = document.querySelector('[data-clear-cfilter]');
      if (clearBtn) clearBtn.addEventListener('click', function(e) { e.stopPropagation(); D.courierStatusFilter = null; _saveAdminFilters(); _renderDashboardMain(); });

      var sortSel = document.querySelector('[data-courier-sort]');
      if (sortSel) sortSel.addEventListener('change', function() { D.courierSortBy = this.value; _renderDashboardMain(); });

      var repSearch = document.querySelector('[data-admin-rep-search]');
      if (repSearch) { var _rST; repSearch.addEventListener('input', function() { var self = this; D.adminRepSearch = self.value; clearTimeout(_rST); _rST = setTimeout(function() { _saveAdminFilters(); _renderDashboardMain(); var el = document.querySelector('[data-admin-rep-search]'); if (el) { el.focus(); el.setSelectionRange(self.value.length, self.value.length); } }, 250); }); }

      document.querySelectorAll('[data-toggle-courier]').forEach(function(el) {
        el.addEventListener('click', function() {
          var name = this.getAttribute('data-toggle-courier');
          if (D.expandedCouriers.has(name)) D.expandedCouriers.delete(name); else D.expandedCouriers.add(name);
          _renderDashboardMain();
        });
      });

      var showFormBtn = document.querySelector('[data-show-user-form]');
      if (showFormBtn) showFormBtn.addEventListener('click', function() { _resetUserForm(); D.showUserForm = true; _renderDashboardMain(); });

      document.querySelectorAll('[data-cancel-user-form]').forEach(function(b) { b.addEventListener('click', function() { _resetUserForm(); _renderDashboardMain(); }); });

      var userForm = document.querySelector('[data-user-form]');
      if (userForm) {
        userForm.addEventListener('submit', function(e) {
          e.preventDefault();
          var uEl = document.querySelector('[data-form-username]');
          var pEl = document.querySelector('[data-form-phone]');
          var eEl = document.querySelector('[data-form-email]');
          var pwEl = document.querySelector('[data-form-password]');
          var rEl = document.querySelector('[data-form-role]');
          var aEl = document.querySelector('[data-form-approved]');
          D.formUsername = uEl ? uEl.value : '';
          D.formPhone = pEl ? pEl.value : '';
          D.formEmail = eEl ? eEl.value : '';
          D.formPassword = pwEl ? pwEl.value : '';
          D.formRole = rEl ? rEl.value : 'rep';
          D.formApproved = aEl ? aEl.checked : true;
          _handleSaveUser(e);
        });
      }

      var usersSearch = document.querySelector('[data-users-search]');
      if (usersSearch) { var _uST; usersSearch.addEventListener('input', function() { var self = this; D.usersSearchQuery = self.value; clearTimeout(_uST); _uST = setTimeout(function() { _renderDashboardMain(); var el = document.querySelector('[data-users-search]'); if (el) { el.focus(); el.setSelectionRange(self.value.length, self.value.length); } }, 250); }); }

      document.querySelectorAll('[data-role-tab]').forEach(function(btn) {
        btn.addEventListener('click', function() { D.userRoleTab = this.getAttribute('data-role-tab'); _renderDashboardMain(); });
      });

      document.querySelectorAll('[data-toggle-approve]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var id = this.getAttribute('data-toggle-approve');
          var u = D.usersList.find(function(x) { return x.id === id; });
          if (u) _handleToggleApproved(u);
        });
      });
      document.querySelectorAll('[data-edit-user]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var id = this.getAttribute('data-edit-user');
          var u = D.usersList.find(function(x) { return x.id === id; });
          if (u) _startEditUser(u);
        });
      });
      document.querySelectorAll('[data-delete-user]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var id = this.getAttribute('data-delete-user');
          var name = this.getAttribute('data-username');
          _handleDeleteUser(id, name);
        });
      });
    }

    document.querySelectorAll('[data-follower-stat]').forEach(function(el) {
      el.addEventListener('click', function() {
        var key = this.getAttribute('data-follower-stat');
        if (key === 'total') { D.filters = Object.assign({}, D.filters, { status: '', zone: '', sender: '', rep: '' }); D.filterNoRep = false; }
        else if (key === 'followup') { D.filters.status = D.filters.status === 'بحاجة لمتابعة' ? '' : 'بحاجة لمتابعة'; D.filterNoRep = false; }
        else if (key === 'done') { D.filters.status = D.filters.status === 'تم' ? '' : 'تم'; D.filterNoRep = false; }
        _saveFilters(); _renderDashboardMain();
      });
    });

    document.querySelectorAll('[data-grid-status]').forEach(function(el) {
      el.addEventListener('click', function() {
        var key = this.getAttribute('data-grid-status');
        if (key === 'noRep') { D.filterNoRep = !D.filterNoRep; D.filters.status = ''; }
        else { D.filters.status = D.filters.status === key ? '' : key; D.filterNoRep = false; }
        _saveFilters(); _renderDashboardMain();
      });
    });

    var searchEl = document.querySelector('[data-filter-search]');
    if (searchEl) { var _sST; searchEl.addEventListener('input', function() { var self = this; D.filters.search = self.value; _saveFilters(); clearTimeout(_sST); _sST = setTimeout(function() { _renderDashboardMain(); var el = document.querySelector('[data-filter-search]'); if (el) { el.focus(); el.setSelectionRange(self.value.length, self.value.length); } }, 250); }); }

    var toggleActions = document.querySelector('[data-toggle-actions]');
    if (toggleActions) toggleActions.addEventListener('click', function() { D.actionsHidden = !D.actionsHidden; localStorage.setItem('rep-actions-hidden', D.actionsHidden ? 'true' : 'false'); _renderDashboardMain(); });

    var archiveFilter = document.querySelector('[data-filter-archive]');
    if (archiveFilter) archiveFilter.addEventListener('click', function() { D.repArchiveFilter = D.repArchiveFilter === 'نشطة' ? 'مؤرشفة' : 'نشطة'; localStorage.setItem('repArchiveFilter', D.repArchiveFilter); D.filters.daily = ''; _saveFilters(); _renderDashboardMain(); });

    ['daily', 'rep', 'zone', 'sender'].forEach(function(key) {
      var sel = document.querySelector('[data-filter="' + key + '"]');
      if (sel) sel.addEventListener('change', function() { D.filters[key] = this.value; _saveFilters(); _renderDashboardMain(); });
    });

    var showMore = document.querySelector('[data-show-more]');
    if (showMore) showMore.addEventListener('click', function() { D.displayLimit += 20; _renderDashboardMain(); });

    _bindCardEvents();
  }

  function _showDialog(title, content) {
    var container = document.getElementById('dialog-container');
    if (!container) return;
    container.innerHTML = _renderDialogOverlay(title, content);
    container.querySelector('[data-dialog="overlay"]').addEventListener('click', function(e) { if (e.target === this) _closeDialog(); });
    container.querySelector('[data-dialog="close"]').addEventListener('click', _closeDialog);
  }

  function _closeDialog() {
    var container = document.getElementById('dialog-container');
    if (container) container.innerHTML = '';
  }

  function _showEditAccountDialog() {
    var content = '<div class="text-right space-y-3">';
    content += '<div><label class="text-xs font-bold text-text-muted mb-1 block">الاسم</label><input type="text" value="' + escHtml(Auth.user.username || '') + '" readonly class="w-full p-2.5 rounded-xl border border-border-strong bg-bg-main/50 text-text-main text-sm font-bold opacity-75 focus:outline-none" /></div>';
    content += '<div><label class="text-xs font-bold text-text-muted mb-1 block">رقم الهاتف</label><input type="tel" data-edit-phone value="' + escHtml(D.editPhone) + '" class="w-full p-2.5 rounded-xl border border-border-strong bg-bg-main text-text-main text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary" /></div>';
    content += '<div><label class="text-xs font-bold text-text-muted mb-1 block">كلمة المرور الجديدة (اترك فارغاً إذا لا تريد التغيير)</label><input type="password" data-edit-pass value="' + escHtml(D.editPass) + '" class="w-full p-2.5 rounded-xl border border-border-strong bg-bg-main text-text-main text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary" placeholder="أدخل كلمة المرور الجديدة" /></div>';
    content += '</div>';
    content += '<div class="flex gap-2 mt-5">';
    content += '<button data-edit-cancel class="flex-1 bg-bg-main border border-border-strong text-text-muted font-bold py-2.5 rounded-xl text-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors">الغاء</button>';
    content += '<button data-edit-save class="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-2.5 rounded-xl text-sm cursor-pointer transition-colors flex items-center justify-center gap-2">' + icon('save', 'w-4 h-4') + ' حفظ</button>';
    content += '</div>';
    _showDialog('تعديل الحساب', content);
    document.querySelector('[data-edit-cancel]').addEventListener('click', function() { D.showEditAccount = false; _closeDialog(); });
    document.querySelector('[data-edit-save]').addEventListener('click', async function() {
      var phoneEl = document.querySelector('[data-edit-phone]');
      var passEl = document.querySelector('[data-edit-pass]');
      var phone = phoneEl ? phoneEl.value.trim() : '';
      var pass = passEl ? passEl.value.trim() : '';
      if (!phone) { Toast.error('يرجى إدخال رقم الهاتف'); return; }
      try {
        var tables = getTableNames();
        var updates = { phone: phone };
        if (pass) updates.password = pass;
        var r = await supabaseClient.from(tables.users).update(updates).eq('id', Auth.user.id);
        if (r.error) throw r.error;
        Auth.user.phone = phone;
        localStorage.setItem('courier_user', JSON.stringify(Auth.user));
        Toast.success('تم تحديث الحساب بنجاح');
        D.showEditAccount = false;
        _closeDialog();
      } catch(e) { Toast.error('فشل التحديث: ' + (e.message || 'خطأ')); }
    });
  }
