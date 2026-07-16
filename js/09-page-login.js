'use strict';

  /* ================================================================
     SECTION 9: PAGE — LOGIN
     ================================================================ */

  function renderLogin() {
    const isDark = Theme.isDark;
    const savedPhone = localStorage.getItem('loginPhone') || '';
    const savedPassword = localStorage.getItem('loginPassword') || '';
    const savedRemember = localStorage.getItem('loginRemember');

    root.innerHTML = `
    <div class="min-h-screen flex flex-col justify-center items-center p-6 relative overflow-hidden bg-bg-main transition-colors duration-200">
      <button id="login-theme-toggle" class="absolute top-4 left-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-text-muted hover:text-text-main transition-colors z-20 cursor-pointer" title="${isDark ? 'الوضع العادي' : 'الوضع الليلي'}">
        ${isDark ? icon('sun', 'w-5 h-5 text-amber-400') : icon('moon', 'w-5 h-5 text-slate-600')}
      </button>
      <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[100px] rounded-full pointer-events-none"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[100px] rounded-full pointer-events-none"></div>

      <div class="w-full max-w-md bg-bg-surface p-8 rounded-2xl shadow-xl shadow-black/50 border border-border-subtle relative z-10">
        <div class="flex flex-col items-center mb-8">
          <div class="bg-primary/20 p-4 rounded-full mb-4">
            ${icon('truck', 'w-10 h-10 text-primary')}
          </div>
          <h1 class="text-2xl font-bold text-text-main mb-1">إدارة الشحنات</h1>
          <p id="login-subtitle" class="text-text-muted text-sm">سجل دخولك لمتابعة شحناتك</p>
        </div>

        <form id="login-form" class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1.5" for="login-phone">رقم الموبايل</label>
            <input id="login-phone" type="text" dir="auto" value="${escHtml(savedPhone)}" class="w-full bg-bg-main text-text-main border border-border-strong rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" placeholder="">
          </div>
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1.5" for="login-password">كلمة المرور</label>
            <div class="relative">
              <input id="login-password" type="password" dir="ltr" value="${escHtml(savedPassword)}" class="w-full bg-bg-main text-text-main border border-border-strong rounded-xl px-4 py-3 pl-11 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" placeholder="">
              <button type="button" id="login-toggle-pw" class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors cursor-pointer">
                ${icon('eye', 'w-5 h-5')}
              </button>
            </div>
          </div>
          <div class="flex items-center">
            <input id="login-remember" type="checkbox" ${savedRemember === null || savedRemember === 'true' ? 'checked' : ''} class="w-4 h-4 rounded border-border-strong bg-bg-main text-primary focus:ring-primary focus:ring-offset-bg-main">
            <label for="login-remember" class="mr-2 text-sm text-text-muted select-none">تذكر تسجيل الدخول</label>
          </div>
          <div class="space-y-3">
            <button type="submit" id="login-submit" class="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer">
              ${icon('log-in', 'w-5 h-5')}
              <span>تسجيل الدخول</span>
            </button>
          </div>
        </form>

        <form id="register-form" class="space-y-4 hidden">
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1.5" for="reg-name">اسم صاحب الحساب</label>
            <div class="relative">
              <span class="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted pointer-events-none">${icon('user', 'w-5 h-5')}</span>
              <input id="reg-name" type="text" dir="auto" class="w-full bg-bg-main text-text-main border border-border-strong rounded-xl pr-10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" placeholder="">
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1.5" for="reg-phone">رقم الموبايل</label>
            <div class="relative">
              <span class="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted pointer-events-none">${icon('phone', 'w-5 h-5')}</span>
              <input id="reg-phone" type="tel" dir="ltr" class="w-full bg-bg-main text-text-main border border-border-strong rounded-xl pr-10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" placeholder="">
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1.5" for="reg-email">البريد الإلكتروني</label>
            <div class="relative">
              <span class="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted pointer-events-none">${icon('mail', 'w-5 h-5')}</span>
              <input id="reg-email" type="email" dir="ltr" class="w-full bg-bg-main text-text-main border border-border-strong rounded-xl pr-10 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" placeholder="">
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1.5" for="reg-password">كلمة المرور</label>
            <div class="relative">
              <span class="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted pointer-events-none">${icon('lock', 'w-5 h-5')}</span>
              <input id="reg-password" type="password" dir="ltr" class="w-full bg-bg-main text-text-main border border-border-strong rounded-xl pr-10 px-4 py-3 pl-11 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" placeholder="">
              <button type="button" id="reg-toggle-pw" class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors cursor-pointer">${icon('eye', 'w-5 h-5')}</button>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1.5" for="reg-confirm">تأكيد كلمة المرور</label>
            <div class="relative">
              <span class="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted pointer-events-none">${icon('check-circle', 'w-5 h-5')}</span>
              <input id="reg-confirm" type="password" dir="ltr" class="w-full bg-bg-main text-text-main border border-border-strong rounded-xl pr-10 px-4 py-3 pl-11 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all" placeholder="">
              <button type="button" id="reg-toggle-confirm" class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors cursor-pointer">${icon('eye', 'w-5 h-5')}</button>
            </div>
          </div>
          <div class="space-y-3 pt-2">
            <button type="submit" id="reg-submit" class="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer">
              ${icon('user-plus', 'w-5 h-5')}
              <span>إنشاء حساب جديد</span>
            </button>
          </div>
        </form>

        <div class="mt-6 text-center">
          <button id="login-toggle-mode" class="text-sm text-primary hover:text-primary-hover transition-colors cursor-pointer">
            ليس لديك حساب؟ إنشاء حساب جديد
          </button>
        </div>
      </div>
    </div>`;

    bindLoginEvents();
  }

  function bindLoginEvents() {
    let showRegister = false;
    let showPassword = false;
    let showRegPassword = false;
    let showRegConfirm = false;

    const phoneInput = document.getElementById('login-phone');
    const passwordInput = document.getElementById('login-password');
    const rememberCheck = document.getElementById('login-remember');

    // Auto-save to localStorage (replicate React useEffect)
    function saveLoginRemember() {
      localStorage.setItem('loginRemember', String(rememberCheck.checked));
      if (rememberCheck.checked) {
        localStorage.setItem('loginPhone', phoneInput.value);
        localStorage.setItem('loginPassword', passwordInput.value);
      } else {
        localStorage.removeItem('loginPhone');
        localStorage.removeItem('loginPassword');
      }
    }
    phoneInput.addEventListener('input', saveLoginRemember);
    passwordInput.addEventListener('input', saveLoginRemember);
    rememberCheck.addEventListener('change', saveLoginRemember);

    // Theme toggle
    document.getElementById('login-theme-toggle').addEventListener('click', function() {
      Theme.toggle();
      renderLogin();
    });

    // Show/hide password
    document.getElementById('login-toggle-pw').addEventListener('click', function() {
      showPassword = !showPassword;
      passwordInput.type = showPassword ? 'text' : 'password';
      this.innerHTML = showPassword ? icon('eye-off', 'w-5 h-5') : icon('eye', 'w-5 h-5');
    });

    // Toggle mode
    document.getElementById('login-toggle-mode').addEventListener('click', function() {
      showRegister = !showRegister;
      document.getElementById('login-form').classList.toggle('hidden', showRegister);
      document.getElementById('register-form').classList.toggle('hidden', !showRegister);
      document.getElementById('login-subtitle').textContent = showRegister ? 'إنشاء حساب جديد لمتابعة شحناتك' : 'سجل دخولك لمتابعة شحناتك';
      this.textContent = showRegister ? 'لديك حساب بالفعل؟ تسجيل الدخول' : 'ليس لديك حساب؟ إنشاء حساب جديد';
      // Clear all fields (match React toggleMode)
      phoneInput.value = '';
      passwordInput.value = '';
      ['reg-name','reg-phone','reg-email','reg-password','reg-confirm'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
    });

    // Register show/hide passwords
    document.getElementById('reg-toggle-pw').addEventListener('click', function() {
      showRegPassword = !showRegPassword;
      document.getElementById('reg-password').type = showRegPassword ? 'text' : 'password';
      this.innerHTML = showRegPassword ? icon('eye-off', 'w-5 h-5') : icon('eye', 'w-5 h-5');
    });
    document.getElementById('reg-toggle-confirm').addEventListener('click', function() {
      showRegConfirm = !showRegConfirm;
      document.getElementById('reg-confirm').type = showRegConfirm ? 'text' : 'password';
      this.innerHTML = showRegConfirm ? icon('eye-off', 'w-5 h-5') : icon('eye', 'w-5 h-5');
    });

    // Login form submit
    document.getElementById('login-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      const phone = phoneInput.value.trim();
      const password = passwordInput.value.trim();

      if (!phone || !password) {
        Toast.error('الرجاء إدخال رقم الهاتف وكلمة المرور');
        return;
      }

      // Check dev credentials
      const storedDevPhone = localStorage.getItem('dev_phone');
      const storedDevPass = localStorage.getItem('dev_pass');
      const expectedPhone = storedDevPhone ? atob(storedDevPhone).replace('__dev__', '') : DEV_PHONE_DEFAULT;
      const expectedPass = storedDevPass ? atob(storedDevPass).replace('__dev__', '') : DEV_PASS_DEFAULT;

      if (phone === expectedPhone && password === expectedPass) {
        const devUser = {
          id: 'dev-account',
          username: 'المطور',
          email: 'dev@system.local',
          phone: expectedPhone,
          role: 'admin',
          approved: true,
          parent_id: null,
          created_at: new Date().toISOString(),
        };
        Auth.loginAsDev(devUser);
        Toast.success('مرحباً أيها المطور');
        navigate('/dev');
        return;
      }

      const btn = document.getElementById('login-submit');
      btn.disabled = true;
      btn.innerHTML = '<svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="31.42" stroke-dashoffset="10" /></svg>';

      const res = await Auth.login(phone, password, rememberCheck.checked);

      if (res.success) {
        Toast.success('تم تسجيل الدخول بنجاح');
        navigate('/');
      } else {
        Toast.error(res.error || 'فشل تسجيل الدخول');
        btn.disabled = false;
        btn.innerHTML = icon('log-in', 'w-5 h-5') + '<span>تسجيل الدخول</span>';
      }
    });

    // Register form submit
    document.getElementById('register-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      const name = document.getElementById('reg-name').value.trim();
      const phone = document.getElementById('reg-phone').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const pw = document.getElementById('reg-password').value.trim();
      const confirm = document.getElementById('reg-confirm').value.trim();

      if (!name || !phone || !email || !pw || !confirm) {
        Toast.error('الرجاء ملء جميع الحقول');
        return;
      }
      if (pw !== confirm) {
        Toast.error('كلمة المرور وتأكيدها غير متطابقين');
        return;
      }
      if (pw.length < 6) {
        Toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
        return;
      }

      const btn = document.getElementById('reg-submit');
      btn.disabled = true;
      btn.innerHTML = '<svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="31.42" stroke-dashoffset="10" /></svg>';

      try {
        const tables = getTableNames();
        const { error } = await supabaseClient.from(tables.users).insert([{
          username: name,
          phone: phone,
          email: email,
          password: pw,
          role: 'rep',
          approved: false,
        }]);

        if (error) {
          if (error.message.includes('duplicate')) {
            Toast.error('رقم الموبايل أو البريد الإلكتروني مسجل بالفعل');
          } else {
            Toast.error('حدث خطأ أثناء إنشاء الحساب: ' + error.message);
          }
          btn.disabled = false;
          btn.innerHTML = icon('user-plus', 'w-5 h-5') + '<span>إنشاء حساب جديد</span>';
          return;
        }

        Toast.success('تم إنشاء الحساب بنجاح، يرجى انتظار موافقة المدير');
        // Switch back to login mode
        showRegister = false;
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('register-form').classList.add('hidden');
        document.getElementById('login-subtitle').textContent = 'سجل دخولك لمتابعة شحناتك';
        document.getElementById('login-toggle-mode').textContent = 'ليس لديك حساب؟ إنشاء حساب جديد';
        phoneInput.value = phone;
        ['reg-name','reg-phone','reg-email','reg-password','reg-confirm'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
        btn.disabled = false;
        btn.innerHTML = icon('user-plus', 'w-5 h-5') + '<span>إنشاء حساب جديد</span>';
      } catch(err) {
        Toast.error('فشل الاتصال بالخادم');
        btn.disabled = false;
        btn.innerHTML = icon('user-plus', 'w-5 h-5') + '<span>إنشاء حساب جديد</span>';
      }
    });
  }
