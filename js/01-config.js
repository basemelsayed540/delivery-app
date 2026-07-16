'use strict';

  /* ================================================================
     SECTION 1: CONFIGURATION & CONSTANTS
     ================================================================ */

  const SALT = '__supa__';
  const ENC_URL = 'X19zdXBhX19odHRwczovL2V2cnF4Z25xd25nb2t1a3FlcnBzLnN1cGFiYXNlLmNv';
  const ENC_KEY = 'X19zdXBhX19wbGFjZWhvbGRlci1rZXk=';
  const ENC_INVOICES_TABLE = btoa(SALT + 'invoices');
  const ENC_USERS_TABLE = btoa(SALT + 'users');

  const DEV_PHONE_DEFAULT = atob('X19kZXZfXzAxMTQyOTc3Nzkw').replace('__dev__', '');
  const DEV_PASS_DEFAULT = atob('X19kZXZfXzAxNDI5Nzc3OTA=').replace('__dev__', '');
