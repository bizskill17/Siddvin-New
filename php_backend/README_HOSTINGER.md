Hostinger PHP + MySQL Setup (No Google Sheets)

1) Create tables in phpMyAdmin
- Open Hostinger hPanel -> Databases -> phpMyAdmin -> select database `u380752258_sidvin`
- Open the `SQL` tab
- Paste and run: `php_backend/schema.sql`

2) Upload PHP API files
- Upload folder `php_backend/api/` into your site:
  - Example location: `public_html/api/`
- Copy `public_html/api/config.php.example` to `public_html/api/config.php`
- Fill DB password in `config.php`

3) Test API in browser
- Open:
  - `https://proposal.bizskilledu.com/api/index.php?action=list&entity=Properties`
- You should see: `{ "ok": false, "error": "Please sign in again." }`
  That means the API is running and correctly refusing requests without a login.
- Then sign in to the app. The first login creates the `auth_sessions` table automatically.

4) Frontend URL
- The app calls `/api/index.php` on the same domain by default, so no setting is needed.
- Only set `VITE_BACKEND_URL` if the API is on a different domain.

Notes
- This API intentionally matches your existing frontend request format:
  - GET: `?action=list&entity=Properties`
  - POST JSON: `{ "action":"create", "entity":"Properties", "data":{...} }`
- Every request except `login` needs the `X-Auth-Token` header returned by `login`.
- Auth actions: POST `{ "action":"login", "kind":"team", "email":"...", "password":"..." }`,
  POST `{ "action":"login", "kind":"property", "identifier":"P-9", "password":"..." }`,
  POST `{ "action":"logout" }`, GET `?action=me`.
- Set `cors_origin` in `api/config.php` to your exact domain instead of `*`.
- Server errors are written to the PHP error log; the browser only sees a generic message.


WhatsApp templates (Red Lava)
- In the app: menu -> Master -> WhatsApp Templates (Admin / Super Admin).
- Connect Red Lava there: paste the API key and Phone ID and press "Save & test".
  The key is stored encrypted in the `app_settings` table (key derived from the DB password in config.php)
  and is never shown again; only its last 4 characters appear.
  The Phone ID is shown under your number in Red Lava -> Connected Accounts.
- Optional: putting 'redlava' => ['api_key' => ..., 'phone_id' => ...] in api/config.php overrides the app setting.
- Preview each template, then press "Submit to Meta". "Refresh status" shows Pending / Approved / Rejected.
- Template wording lives in `tools/whatsapp_templates.py`; run it to regenerate `api/whatsapp_templates.json`.
- If the database password in config.php changes, re-enter the Red Lava key in the app.
