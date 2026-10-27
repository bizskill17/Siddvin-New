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

