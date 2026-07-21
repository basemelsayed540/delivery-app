'use strict';

  /* ================================================================
     SECTION 3: TOAST SYSTEM
     ================================================================ */

  const Toast = {
    _container: null,
    _init() {
      if (this._container) return;
      this._container = document.createElement('div');
      this._container.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;';
      document.body.appendChild(this._container);
    },
    _show(message, type) {
      this._init();
      const el = document.createElement('div');
      const bgColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#2a2a2a';
      const borderColor = type === 'success' ? 'rgba(16,185,129,0.3)' : type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)';
      el.style.cssText = 'background:' + bgColor + ';color:#fff;border:1px solid ' + borderColor + ';padding:10px 20px;border-radius:12px;font-size:14px;font-weight:600;font-family:Cairo,sans-serif;box-shadow:0 10px 25px rgba(0,0,0,0.3);pointer-events:auto;animation:fadeIn 0.3s ease-out;max-width:90vw;text-align:center;';
      el.textContent = message;
      this._container.appendChild(el);
      setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 300); }, 3000);
    },
    success(msg) { this._show(msg, 'success'); },
    error(msg) { this._show(msg, 'error'); },
    info(msg) { this._show(msg, 'info'); },
  };
