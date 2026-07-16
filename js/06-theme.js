'use strict';

  /* ================================================================
     SECTION 6: THEME MANAGEMENT
     ================================================================ */

  const Theme = {
    isDark: localStorage.getItem('theme') !== 'light',
    toggle() {
      this.isDark = !this.isDark;
      this.apply();
      localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
    },
    apply() {
      if (this.isDark) {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    }
  };
