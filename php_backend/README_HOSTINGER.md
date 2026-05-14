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
- You should see JSON: `{ "ok": true, "data": [] }`

4) Point frontend to PHP API
- Set `VITE_BACKEND_URL` to:
  - `https://proposal.bizskilledu.com/api/index.php`

Notes
- This API intentionally matches your existing frontend request format:
  - GET: `?action=list&entity=Properties`
  - POST JSON: `{ "action":"create", "entity":"Properties", "data":{...} }`
- For security, set `cors_origin` in `api/config.php` to your exact domain instead of `*`.

