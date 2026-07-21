'use strict';

  /* ================================================================
     SECTION 1: CONFIGURATION & CONSTANTS
     ================================================================ */

  const SALT = '__supa__';
  const ENC_URL = 'X19zdXBhX19odHRwczovL2lvZHlvaHNzb3R0dG1icmFwZ2JrLnN1cGFiYXNlLmNv';
  const ENC_KEY = 'X19zdXBhX19leUpoYkdjaU9pSklVekkxTmlJc0luUjVjQ0k2SWtwWFZDSjkuZXlKcGMzTWlPaUp6ZFhCaFltRnpaU0lzSW5KbFppSTZJbWx2WkhsdmFITnpiM1IwZEcxaWNtRndaMkpySWl3aWNtOXNaU0k2SW1GdWIyNGlMQ0pwWVhRaU9qRTNPRFF5TURRME5UVXNJbVY0Y0NJNk1qQTVPVGM0TURRMU5YMC5TaG5PNjUxVDNiWmVvdjg2cjFYc3ltVC1RNUpFNDU0U1hfeUQwMVdRdlo0';
  const ENC_INVOICES_TABLE = btoa(SALT + 'invoices');
  const ENC_USERS_TABLE = btoa(SALT + 'users');

  const DEV_PHONE_DEFAULT = atob('X19kZXZfXzAxMTQyOTc3Nzkw').replace('__dev__', '');
  const DEV_PASS_DEFAULT = atob('X19kZXZfXzAxNDI5Nzc3OTA=').replace('__dev__', '');
