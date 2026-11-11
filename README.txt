Sidvin Proposal Workflow for WordPress (v1.0.2)
======================================

INSTALL
1. In WordPress, open Plugins > Add New Plugin > Upload Plugin.
2. Choose the Sidvin-Proposal-Workflow-WordPress-Plugin.zip file and select Install Now.
3. Select Activate Plugin.
4. Open the new Sidvin Proposal item in the WordPress admin menu.
5. Create the first app administrator there, then open the Team Login page.

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
