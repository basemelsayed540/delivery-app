'use strict';

  /* ================================================================
     SECTION 4: SUPABASE SERVICE
     ================================================================ */

  function decode(encoded) {
    try {
      const raw = atob(encoded);
      if (raw.startsWith(SALT)) return raw.slice(SALT.length);
      return raw;
    } catch(e) { return encoded; }
  }

  function encode(raw) { return btoa(SALT + raw); }

  function getConfig() {
    const storedUrl = localStorage.getItem('dev_supabase_url');
    const storedKey = localStorage.getItem('dev_supabase_key');
    const envUrl = 'https://iodyohssotttmbrapgbk.supabase.co';
    const envKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvZHlvaHNzb3R0dG1icmFwZ2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMDQ0NTUsImV4cCI6MjA5OTc4MDQ1NX0.ShnO651T3bZeov86r1XsymT-Q5JE454SX_yD01WQvZ4';
    return {
      url: storedUrl ? decode(storedUrl) : envUrl,
      key: storedKey ? decode(storedKey) : envKey,
    };
  }

  let currentConfig = getConfig();
  let supabaseClient = window.supabase.createClient(currentConfig.url, currentConfig.key);

  function recreateClient() {
    const newConfig = getConfig();
    if (newConfig.url !== currentConfig.url || newConfig.key !== currentConfig.key) {
      currentConfig = newConfig;
      supabaseClient = window.supabase.createClient(currentConfig.url, currentConfig.key);
    }
  }

  function getSupabaseConfig() { return { ...currentConfig }; }

  function getTableNames() {
    return {
      invoices: decode(localStorage.getItem('dev_invoices_table') || ENC_INVOICES_TABLE),
      users: decode(localStorage.getItem('dev_users_table') || ENC_USERS_TABLE),
    };
  }

  function encryptConfig(rawUrl, rawKey) {
    return { url: encode(rawUrl), key: encode(rawKey) };
  }
