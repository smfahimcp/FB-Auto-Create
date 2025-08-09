const axios = require('axios');
const crypto = require('crypto');
const { faker } = require('@faker-js/faker');
const { htmlToText } = require('html-to-text');

const TM_HEADERS = {
  'accept': 'application/json, text/plain, */*',
  'accept-language': 'en-US,en;q=0.9',
  'application-name': 'web',
  'application-version': '3.0.0',
  'content-type': 'application/json',
  'origin': 'https://temp-mail.io',
  'referer': 'https://temp-mail.io/',
  'sec-ch-ua': '"Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
};

function generateRandomString(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/* ---------------- Temp-mail functions ---------------- */
async function createTempMailAccount(min_name_length = 10, max_name_length = 10) {
  const url = 'https://api.internal.temp-mail.io/api/v3/email/new';
  const payload = { min_name_length, max_name_length };
  try {
    const r = await axios.post(url, payload, { headers: TM_HEADERS, timeout: 15000 });
    const data = r.data || {};
    let email = data.email || data.address || null;
    if (!email && data.name && data.domain) email = `${data.name}@${data.domain}`;
    if (!email) {
      const username = generateRandomString(min_name_length).toLowerCase();
      email = `${username}@temp-mail.io`;
    }
    const password = faker.internet.password();
    const birthday = faker.date.birthdate({ min: 18, max: 45, mode: 'age' });
    const firstName = faker.name.firstName();
    const lastName = faker.name.lastName();
    console.log('[√] Email Created:', email);
    return { email, password, firstName, lastName, birthday };
  } catch (e) {
    console.error('[×] createTempMailAccount error:', e.message || e);
    const username = generateRandomString(min_name_length).toLowerCase();
    const email = `${username}@temp-mail.io`;
    return {
      email,
      password: faker.internet.password(),
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      birthday: faker.date.birthdate({ min: 18, max: 45, mode: 'age' })
    };
  }
}

async function fetchEmailMessages(email, pollInterval = 5000, timeout = 180000) {
  const url = `https://api.internal.temp-mail.io/api/v3/email/${encodeURIComponent(email)}/messages`;
  const start = Date.now();
  while (true) {
    try {
      const r = await axios.get(url, { headers: TM_HEADERS, timeout: 15000 });
      if (r.status === 200) {
        const msgs = r.data || [];
        if (Array.isArray(msgs) && msgs.length > 0) {
          return msgs.map(m => {
            const bodyHtml = m.body_html || '';
            const text = htmlToText(bodyHtml, { wordwrap: false, preserveNewlines: true });
            const body_text = (m.body_text || text).replace(/\*+/g, '').trim();
            return { ...m, body_text, body_html_converted: text };
          });
        }
      } else {
        console.warn('[×] Fetch Email Error status', r.status);
      }
    } catch (e) {
      console.warn('[×] Error while fetching messages:', e.message || e);
    }
    if (Date.now() - start > timeout) return []; 
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
}
/**
 * Main Scripts *
 * Facebook Account Register & Login
 * Temp-mail Email Creation & Message Fetching
 */
/* ---------------- Facebook functions ---------------- */

function sortedQueryString(obj) {
  const keys = Object.keys(obj).sort();
  return keys.map(k => `${k}=${obj[k]}`).join('');
}

async function _call(url, params = {}, post = true) {
  try {
    if (post) {
      const searchParams = new URLSearchParams();
      for (const k in params) searchParams.append(k, params[k]);
      const r = await axios.post(url, searchParams.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': '[FBAN/FB4A;FBAV/35.0.0.48.273;]' },
        timeout: 15000
      });
      return r.data;
    } else {
      const r = await axios.get(url, { params, headers: { 'User-Agent': '[FBAN/FB4A;FBAV/35.0.0.48.273;]' }, timeout: 15000 });
      return r.data;
    }
  } catch (e) {
    console.error('[×] _call error:', e.message || e);
    return {};
  }
}

async function registerFacebookAccount(email, password, firstName, lastName, birthday) {
  const api_key = '882a8490361da98702bf97a021ddc14d';
  const secret = '62f8ce9f74b12f84c123cc23437a4a32';
  const gender = Math.random() < 0.5 ? 'M' : 'F';
  const req = {
    api_key,
    attempt_login: true,
    birthday: birthday.toISOString().split('T')[0],
    client_country_code: 'EN',
    fb_api_caller_class: 'com.facebook.registration.protocol.RegisterAccountMethod',
    fb_api_req_friendly_name: 'registerAccount',
    firstname: firstName,
    format: 'json',
    gender,
    lastname: lastName,
    email,
    locale: 'en_US',
    method: 'user.register',
    password,
    reg_instance: generateRandomString(32),
    return_multiple_errors: true
  };
  const sigBase = sortedQueryString(req);
  const sig = crypto.createHash('md5').update(sigBase + secret).digest('hex');
  req.sig = sig;
  const api_url = 'https://b-api.facebook.com/method/user.register';
  const reg = await _call(api_url, req, true);
  // try to extract id & token safely
  const id = reg && (reg.new_user_id || reg.id) ? (reg.new_user_id || reg.id) : null;
  let token = null;
  if (reg && reg.session_info && typeof reg.session_info === 'object') token = reg.session_info.access_token || null;
  console.log('===================================');
  console.log('Email :', email);
  console.log('ID    :', id);
  console.log('Token :', token);
  console.log('Pass  :', password);
  console.log('Name  :', firstName, lastName);
  console.log('BDay  :', birthday.toISOString().split('T')[0]);
  console.log('Gender:', gender);
  console.log('===================================');
  return { id, token };
}

async function loginFacebookAccount(email, password) {
  const api_key = '882a8490361da98702bf97a021ddc14d';
  const secret = '62f8ce9f74b12f84c123cc23437a4a32';
  const req = {
    api_key,
    email,
    format: 'json',
    locale: 'en_US',
    method: 'auth.login',
    password,
    return_ssl_resources: 0,
    v: '1.0'
  };
  const sigBase = sortedQueryString(req);
  const sig = crypto.createHash('md5').update(sigBase + secret).digest('hex');
  req.sig = sig;
  const api_url = 'https://api.facebook.com/restserver.php';
  const response = await _call(api_url, req, true);
  console.log('[+] Logged in with Email :', email);
  return response;
}

// ---------------- Main ----------------
async function main() {
  const arg = process.argv[2] || '1';
  let count = parseInt(arg, 10);
  if (isNaN(count) || count <= 0) count = 1;

  for (let i = 0; i < count; i++) {
    console.log(`\n--- Starting account ${i + 1} ---`);
    const { email, password, firstName, lastName, birthday } = await createTempMailAccount();
    try {
      await registerFacebookAccount(email, password, firstName, lastName, birthday);
    } catch (e) {
      console.error('[×] Facebook register error:', e.message || e);
      continue;
    }

    try {
      await loginFacebookAccount(email, password);
    } catch (e) {
      console.warn('[×] Facebook login error:', e.message || e);
    }

    console.log(`Fetching email messages for ${email} (timeout=180s)...`);
    const messages = await fetchEmailMessages(email, 5000, 180000);
    if (messages && messages.length > 0) {
      console.log(`[√] ${messages.length} messages for ${email}:`);
      for (const m of messages) {
        const fromAddr = m.from || '';
        const subject = m.subject || '';
        const date = m.date || '';
        console.log('From:   ', fromAddr);
        console.log('Subject:', subject);
        console.log('Date:   ', date);
        const snippet = (m.body_text || '').slice(0, 400);
        console.log('Snippet:', snippet);
        console.log('-'.repeat(40));
      }
    } else {
      console.log('[i] No messages received within timeout.');
    }
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
});
