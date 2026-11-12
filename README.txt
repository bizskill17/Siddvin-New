Sidvin Proposal Workflow for WordPress (v1.0.3)
======================================

INSTALL
1. In WordPress, open Plugins > Add New Plugin > Upload Plugin.
2. Choose the Sidvin-Proposal-Workflow-WordPress-Plugin.zip file and select Install Now.
3. Select Activate Plugin.
4. Open the new Sidvin Proposal item in the WordPress admin menu.
5. On that page, create the first Sidvin Team Super Admin (name, email and a password of at least 10 characters).
   Then open the Team Login page to sign in. (This is separate from WordPress users.)

The plugin creates these WordPress pages on activation:
- Dashboard, All Proposals, Properties, Site Visits, Terms and Agreements, Deposit
- Company Master, Category Master, Brands, Sidvin Team, Company Settings, WhatsApp Templates
- Property Follow-ups, Team Login, Property Login

Opening the Sidvin Proposal setup page in WordPress also repairs/creates any missing app pages after an update.

App pages render in a standalone full-screen layout, so the active WordPress theme does not need special templates. The app uses the WordPress site's database and creates its own prefixed tables. It does not import data from the currently running test app.

INCLUDED APP AREAS
Dashboard, proposals and proposal stages, properties and property-owner access, visits, follow-ups, term sheets, deposits, master data (companies, categories, brands, team), organization settings (logo and theme), and WhatsApp template/message integration supported by the source app.

BEFORE INSTALLING
- Use a current WordPress hosting plan with PHP 8.0 or newer and PHP PDO MySQL enabled.
- Keep the site's internet access available for the app's Tailwind styling and web fonts.
- The WordPress database user must be allowed to create tables.
- Set up HTTPS before using the app with real accounts.
- WhatsApp sending needs a valid RedLava provider configuration. The screens can be used without sending messages until configured.
- This first package is a fresh install. It does not migrate existing app records or credentials.

SUPPORT / TROUBLESHOOTING
If the app pages are not found immediately after activation, visit Settings > Permalinks and select Save Changes once. If activation reports a missing PDO MySQL extension, ask the hosting provider to enable pdo_mysql for the site's PHP version.

FIRST ACCOUNT
The plugin contains no built-in login. After activation, an administrator creates the first Sidvin Team Super Admin from WordPress admin > Sidvin Proposal. The form is only shown while the team has no accounts. Further team members are added inside the app.

Version 1.0.4: One-time existing-account credential recovery for requested Team Super Admin on activation or first WordPress dashboard visit after plugin upgrade. Subsequent visits do not reset password.

Version 1.0.5: dashboard KPI cards arranged in two columns, reference-aligned styling and teal proposal stage histogram. Existing data, user accounts and workflows unchanged.

Version 1.0.6: force dashboard cache refresh through renamed JavaScript/CSS assets and asset version parameters. Dashboard data and accounts unchanged.

Version 1.0.7: Masters interface uses consistent teal theme instead of bright blue.

Version 1.0.8: Logout has a permanent red background; removed redundant sidebar header collapse icon, retaining page header menu toggle.

Version 1.0.11: removed the built-in Super Admin login and the one-time password reset. The first Super Admin is created from WordPress admin > Sidvin Proposal. Existing accounts and passwords are not changed.

Version 1.0.12: the sidebar user card (name, role, Log out) uses the selected theme colour.

Version 1.0.13: app pages use the WordPress Site Icon (Appearance > Customize > Site Identity) as the browser tab icon instead of the WordPress logo.

Version 1.0.14: property login form says "Login" (heading and button); removed the "Back to Sidvin Team Login" link.

Version 1.0.15: pages other than Property Login always open the team login form (the last-used portal is no longer remembered).

Version 1.0.16: property login field label is "Property ID *".

Version 1.0.17: the saved colour theme, logo and name are sent with each page, so the login and app open in your theme straight away (no brief flash of the default colours).

Version 1.0.18: browser tab title is just the WordPress site name (no " — Sidvin").

Version 1.0.19: read-only and disabled form fields have a grey background.

Version 1.0.20: "Download PDF" button on the property view (summary, contacts, photos, documents; A4, theme colour).

Version 1.0.21: property PDF loads photos the same way as the screen (Google Drive backups), waits for them, and shows a link when a photo cannot load.

Version 1.0.22: property "Download PDF" saves the PDF file directly (no print window); photos are shown uncropped at full page width; photos are fetched by the server (propertyPhoto API action). Falls back to the print window if the PDF tool cannot load.

Version 1.0.23: property PDF shows photos two per row, reduced to fit while keeping each photo's proportions.

Version 1.0.24: property PDF photo rows alternate 3 then 2 photos (3, 2, 3, 2 ...), each scaled to fit with its proportions kept.

Version 1.0.25: property PDF photos in a row are aligned at the bottom, with captions on one line.

Version 1.0.26: Download PDF icon next to Delete on each row of the Properties list.
