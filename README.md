# Sidvin Proposal Workflow

Internal app for tracking property proposals from first contact through visits, term sheets, agreements, store opening and fees. It also has a read-only **Property Portal** where a property owner can sign in and see activity for their own property.

- **Frontend:** React + TypeScript, built with Vite (`App.tsx`, `components/`, `services/dataService.ts`)
- **Backend:** PHP + MySQL API in `php_backend/api/`, hosted on Hostinger
- **Deploy:** pushing to `main` runs `.github/workflows/deploy.yml`, which builds the app and uploads it plus the PHP API over FTP

## Sign-in and security

- Passwords are checked by the API, never in the browser, and are stored as hashes.
  Existing plain-text passwords still work and are upgraded to a hash the first time each person signs in.
- After signing in, the browser holds a session token (sent as `X-Auth-Token`). Every API call requires it.
- Team members can read and change everything. A property session can only read data about its own property and cannot change anything.
- The API never returns passwords. When editing a team member or property, leave the password blank to keep the current one.

## Run locally

Prerequisites: Node.js 20+, PHP 8 with `pdo_mysql`, and access to a MySQL database.

1. Install dependencies: `npm install`
2. Create the API config: copy `php_backend/api/config.php.example` to `php_backend/api/config.php` and fill in your database details. (This file is git-ignored.)
3. If the database is new, run `php_backend/schema.sql` against it.
4. Start the API: `npm run api` (serves on http://localhost:8000)
5. In another terminal, start the app: `npm run dev` (http://localhost:3000; `/api` is proxied to the PHP server)

## Deploy

See `php_backend/README_HOSTINGER.md` for first-time server setup. After that, pushing to `main` deploys automatically. `api/config.php` on the server is never overwritten by a deploy.

## Other files

- `tools/generate_sidvin_template_messages_docx.py` builds `Sidvin_Template_Messages.docx`
- `create_doc.py` and `sidvin_message_plan.md.resolved` hold the owner-notification plan
