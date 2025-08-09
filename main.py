import requests
import random
import string
import json
import hashlib
from faker import Faker
import asyncio
import time
from bs4 import BeautifulSoup

# ---------------------------
# Config / Headers
# ---------------------------
TM_HEADERS = {
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
}

fake = Faker()

# ---------------------------
# Utilities
# ---------------------------
def generate_random_string(length):
    letters_and_digits = string.ascii_letters + string.digits
    return ''.join(random.choice(letters_and_digits) for i in range(length))

# ---------------------------
# Temp-mail functions
# ---------------------------
def create_tempmail_account(min_name_length=10, max_name_length=10, headers=None):
    """
    Call temp-mail internal API to create a new disposable email.
    Returns: (email, password, first_name, last_name, birthday)
    """
    hdrs = headers or TM_HEADERS
    url = 'https://api.internal.temp-mail.io/api/v3/email/new'
    payload = {'min_name_length': min_name_length, 'max_name_length': max_name_length}
    try:
        r = requests.post(url, json=payload, headers=hdrs, timeout=15)
        r.raise_for_status()
        data = r.json()
        # debug print entire response if needed:
        # print("[DBG] create response:", json.dumps(data, indent=2))
        email = data.get('email') or data.get('address') or None
        if not email and data.get('name') and data.get('domain'):
            email = f"{data['name']}@{data['domain']}"
        if not email:
            # fallback generation
            username = generate_random_string(min_name_length).lower()
            email = f"{username}@temp-mail.io"
    except Exception as e:
        print('[×] create_tempmail_account error:', e)
        username = generate_random_string(min_name_length).lower()
        email = f"{username}@temp-mail.io"

    password = fake.password()
    birthday = fake.date_of_birth(minimum_age=18, maximum_age=45)
    first_name = fake.first_name()
    last_name = fake.last_name()

    print(f'[√] Email Created: {email}')
    return email, password, first_name, last_name, birthday

async def fetch_email_messages(email, poll_interval=5, timeout=180, headers=None):
    """
    Poll temp-mail messages endpoint until messages appear or timeout.
    Returns processed messages list (with body_text cleaned and body_html_converted).
    """
    hdrs = headers or TM_HEADERS
    start = time.time()
    url = f'https://api.internal.temp-mail.io/api/v3/email/{email}/messages'
    while True:
        try:
            r = requests.get(url, headers=hdrs, timeout=15)
            if r.status_code == 200:
                msgs = r.json()
                if msgs:
                    processed = []
                    for m in msgs:
                        body_html = m.get('body_html') or ''
                        soup = BeautifulSoup(body_html, 'html.parser')
                        text = soup.get_text(separator='\n')
                        body_text = (m.get('body_text') or text).replace('*', '').strip()
                        processed.append({**m, 'body_text': body_text, 'body_html_converted': text})
                    return processed
                # else empty -> continue polling
            else:
                print(f'[×] Fetch Email Error : status {r.status_code} - {r.text[:200]}')
        except Exception as e:
            print(f'[×] Error while fetching messages : {e}')
        # timeout check
        if (time.time() - start) > timeout:
            return []  # timed out with no messages
        await asyncio.sleep(poll_interval)

# ---------------------------
# Facebook-related functions (unchanged)
# ---------------------------
def register_facebook_account(email, password, first_name, last_name, birthday):
    api_key = '882a8490361da98702bf97a021ddc14d'
    secret = '62f8ce9f74b12f84c123cc23437a4a32'
    gender = random.choice(['M', 'F'])
    req = {
        'api_key': api_key,
        'attempt_login': True,
        'birthday': birthday.strftime('%Y-%m-%d'),
        'client_country_code': 'EN',
        'fb_api_caller_class': 'com.facebook.registration.protocol.RegisterAccountMethod',
        'fb_api_req_friendly_name': 'registerAccount',
        'firstname': first_name,
        'format': 'json',
        'gender': gender,
        'lastname': last_name,
        'email': email,
        'locale': 'en_US',
        'method': 'user.register',
        'password': password,
        'reg_instance': generate_random_string(32),
        'return_multiple_errors': True
    }
    sorted_req = sorted(req.items(), key=lambda x: x[0])
    sig = ''.join(f'{k}={v}' for k, v in sorted_req)
    ensig = hashlib.md5((sig + secret).encode()).hexdigest()
    req['sig'] = ensig
    api_url = 'https://b-api.facebook.com/method/user.register'
    reg = _call(api_url, req)
    # guard against unexpected structures
    id = reg.get('new_user_id') or reg.get('id') or None
    token = None
    if isinstance(reg.get('session_info'), dict):
        token = reg['session_info'].get('access_token')
    print("===================================")
    print("Email :", email)
    print("ID    :", id)
    print("Token :", token)
    print("Pass  :", password)
    print("Name  :", first_name, last_name)
    print("BDay  :", birthday)
    print("Gender:", gender)
    print("===================================")
    return id, token

def login_facebook_account(email, password):
    api_key = '882a8490361da98702bf97a021ddc14d'
    secret = '62f8ce9f74b12f84c123cc23437a4a32'
    req = {
        'api_key': api_key,
        'email': email,
        'format': 'json',
        'locale': 'en_US',
        'method': 'auth.login',
        'password': password,
        'return_ssl_resources': 0,
        'v': '1.0'
    }
    sorted_req = sorted(req.items(), key=lambda x: x[0])
    sig = ''.join(f'{k}={v}' for k, v in sorted_req)
    ensig = hashlib.md5((sig + secret).encode()).hexdigest()
    req['sig'] = ensig
    api_url = 'https://api.facebook.com/restserver.php'
    response = _call(api_url, req)
    print(f'[+] Logged in with Email : {email}')
    return response

def _call(url, params, post=True):
    headers = {'User-Agent': '[FBAN/FB4A;FBAV/35.0.0.48.273;FBDM/{density=1.33125,width=800,height=1205};FBLC/en_US;FBCR/;FBPN/com.facebook.katana;FBDV/Nexus 7;FBSV/4.1.1;FBBK/0;]'}
    try:
        if post:
            response = requests.post(url, data=params, headers=headers, timeout=15)
        else:
            response = requests.get(url, params=params, headers=headers, timeout=15)
        return response.json()
    except Exception as e:
        print('[×] _call error:', e)
        return {}

# ---------------------------
# Main flow (process mode)
# ---------------------------
async def main():
    try:
        count = int(input('[+] How Many Accounts : '))
    except Exception:
        print('[×] Invalid number, using 1')
        count = 1

    for i in range(count):
        print(f'\n--- Starting account {i+1} ---')
        # create temp-mail account (from API)
        email, password, first_name, last_name, birthday = create_tempmail_account()
        # register on FB using that email
        try:
            id, token = register_facebook_account(email, password, first_name, last_name, birthday)
        except Exception as e:
            print('[×] Facebook register error (exception):', e)
            continue

        # attempt login (optional)
        try:
            login_response = login_facebook_account(email, password)
        except Exception as e:
            print('[×] Facebook login error (exception):', e)
            login_response = None

        # poll inbox for messages (activation etc.)
        print(f"Fetching email messages for {email} (timeout=180s)...")
        messages = await fetch_email_messages(email)
        if messages:
            print(f"[√] {len(messages)} messages for {email}:")
            for message in messages:
                from_addr = message.get('from', '')
                subject = message.get('subject', '')
                date = message.get('date', '')
                print("From: ", from_addr)
                print("Subject:", subject)
                print("Date:   ", date)
                # optional: print snippet or full text
                snippet = (message.get('body_text') or '')[:400]
                print("Snippet:", snippet)
                print("-" * 40)
        else:
            print('[i] No messages received within timeout.')

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('\nExiting...')
