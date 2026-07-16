'use strict';

  /* ================================================================
     SECTION 7: ROUTER
     ================================================================ */

  const root = document.getElementById('root');

  function navigate(path) {
    window.location.hash = '#' + path;
  }

  function handleRoute() {
    Theme.apply();
    const hash = window.location.hash || '#/';

    if (hash === '#/login') {
      renderLogin();
    } else if (hash === '#/dev') {
      if (Auth.user && Auth.user.id === 'dev-account') {
        renderDevSettings();
      } else {
        navigate('/');
      }
    } else {
      if (Auth.user) {
        renderDashboard();
      } else {
        navigate('/login');
      }
    }
  }

  window.addEventListener('hashchange', handleRoute);
