'use strict';

  /* ================================================================
     SECTION 11: PAGE — DEV SETTINGS (STUB)
     ================================================================ */

  function renderDevSettings() {
    root.innerHTML = `
    <div class="min-h-screen bg-bg-main p-4 sm:p-6 transition-colors duration-200" dir="rtl">
      <div class="max-w-4xl mx-auto">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-lg font-bold text-text-main flex items-center gap-2">
            ${icon('settings', 'w-5 h-5 text-primary')}
            إعدادات المطور
          </h1>
          <div class="flex items-center gap-2">
            <button id="dev-theme" class="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-main transition-colors cursor-pointer">
              ${Theme.isDark ? icon('sun', 'w-4 h-4 text-amber-400') : icon('moon', 'w-4 h-4 text-slate-600')}
            </button>
            <button id="dev-logout" class="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-red-500 transition-colors cursor-pointer" title="تسجيل الخروج">
              ${icon('log-out', 'w-5 h-5')}
            </button>
          </div>
        </div>
        <div class="bg-bg-surface border border-border-subtle rounded-2xl p-5 shadow-sm text-center">
          <p class="text-text-muted">صفحة إعدادات المطور — قيد الإنشاء</p>
        </div>
      </div>
    </div>`;

    document.getElementById('dev-theme').addEventListener('click', function() {
      Theme.toggle();
      handleRoute();
    });
    document.getElementById('dev-logout').addEventListener('click', function() {
      Auth.logout();
      navigate('/login');
    });
  }
