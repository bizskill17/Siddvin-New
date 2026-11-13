<?php
/**
 * Plugin Name: Sidvin Proposal Workflow
 * Description: Proposal, property, deposit, team and master-data management for Sidvin.
 * Version: 1.0.51
 * Requires PHP: 8.0
 * Text Domain: sidvin-proposal-workflow
 */

if (!defined('ABSPATH')) { exit; }

define('SIDVIN_PLUGIN_FILE', __FILE__);
define('SIDVIN_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('SIDVIN_PLUGIN_URL', plugin_dir_url(__FILE__));

function sidvin_wp_table_prefix(): string {
  global $wpdb;
  return $wpdb->prefix . 'sidvin_';
}
if (!defined('SIDVIN_WP_TABLE_PREFIX')) {
  define('SIDVIN_WP_TABLE_PREFIX', sidvin_wp_table_prefix());
}

function sidvin_app_pages(): array {
  return [
    'dashboard' => ['Dashboard', 'sidvin-dashboard', 'dashboard', ''],
    'proposals' => ['All Proposals', 'sidvin-proposals', 'proposals', ''],
    'properties' => ['Properties', 'sidvin-properties', 'properties', ''],
    'visits' => ['Site Visits', 'sidvin-visits', 'visits', ''],
    'terms' => ['Terms and Agreements', 'sidvin-terms', 'termSheets', ''],
    'deposits' => ['Deposit', 'sidvin-deposits', 'pendingDeposit', ''],
    'training' => ['Training', 'sidvin-training', 'training', ''],
    'company_master' => ['Company Master', 'sidvin-company-master', 'companyMaster', ''],
    'category_master' => ['Brand Category Master', 'sidvin-category-master', 'categoryMaster', ''],
    'brands' => ['Brands', 'sidvin-brands', 'brands', ''],
    'team' => ['Sidvin Team', 'sidvin-team', 'sidvinTeam', ''],
    'settings' => ['Organization Settings', 'sidvin-settings', 'viewSettings', ''],
    'whatsapp_templates' => ['WhatsApp Templates', 'sidvin-whatsapp-templates', 'whatsappTemplates', ''],
    'property_followups' => ['Property Follow-ups', 'sidvin-property-followups', 'propertyFeeFollowUp', ''],
    'team_login' => ['Team Login', 'sidvin-team-login', 'dashboard', 'team'],
    'property_login' => ['Property Login', 'sidvin-property-login', 'dashboard', 'property'],
  ];
}

function sidvin_create_pages(): void {
  $saved = get_option('sidvin_app_pages', []);
  if (!is_array($saved)) $saved = [];
  foreach (sidvin_app_pages() as $key => [$title, $slug, $view, $mode]) {
    $existingId = absint($saved[$key] ?? 0);
    if ($existingId && get_post_status($existingId)) continue;
    $postId = wp_insert_post([
      'post_type' => 'page',
      'post_status' => 'publish',
      'post_title' => $title,
      'post_name' => $slug,
      'post_content' => '',
      'comment_status' => 'closed',
      'ping_status' => 'closed',
    ], true);
    if (is_wp_error($postId)) continue;
    update_post_meta($postId, '_sidvin_app_page', $key);
    update_post_meta($postId, '_sidvin_app_view', $view);
    update_post_meta($postId, '_sidvin_login_mode', $mode);
    $saved[$key] = (int)$postId;
  }
  update_option('sidvin_app_pages', $saved, false);
}

function sidvin_install_tables(): void {
  global $wpdb;
  $schemaPath = SIDVIN_PLUGIN_DIR . 'includes/schema.sql';
  if (!is_readable($schemaPath)) throw new RuntimeException('The plugin database schema is missing.');
  $schema = file_get_contents($schemaPath);
  $tableNames = ['properties', 'brands', 'proposals', 'visits', 'follow_ups', 'sidvin_team', 'company_master', 'category_master', 'term_sheets', 'auth_sessions', 'app_settings', 'wa_messages'];
  foreach ($tableNames as $name) {
    $schema = preg_replace('/\b' . preg_quote($name, '/') . '\b/', SIDVIN_WP_TABLE_PREFIX . $name, $schema);
  }
  $statements = preg_split('/;\s*(?=\n|$)/', $schema);
  foreach ($statements as $statement) {
    if (trim($statement) === '') continue;
    $wpdb->query($statement);
    if ($wpdb->last_error) throw new RuntimeException('Could not prepare the Sidvin data tables. Check that the WordPress database user can create tables.');
  }
}

function sidvin_register_rewrites(): void {
  add_rewrite_tag('%sidvin_api%', '([0-1])');
  add_rewrite_rule('^api/index\.php$', 'index.php?sidvin_api=1', 'top');
}

function sidvin_activate(): void {
  if (!class_exists('PDO') || !in_array('mysql', PDO::getAvailableDrivers(), true)) {
    wp_die('Sidvin Proposal Workflow needs the PHP PDO MySQL extension enabled on this hosting account.');
  }
  sidvin_install_tables();
  sidvin_create_pages();
  sidvin_register_rewrites();
  flush_rewrite_rules();
}
register_activation_hook(__FILE__, 'sidvin_activate');

add_action('init', 'sidvin_register_rewrites');
// Pages added in later versions (such as Training) are created once after an update.
add_action('init', function (): void {
  if (get_option('sidvin_pages_version') === '2') return;
  sidvin_create_pages();
  update_option('sidvin_pages_version', '2', false);
}, 20);
add_filter('query_vars', function (array $vars): array { $vars[] = 'sidvin_api'; return $vars; });

/**
 * The saved logo, organization name and colour theme, sent with the page so the first paint
 * already uses them (otherwise the default theme flashes until the app asks the API).
 */
function sidvin_initial_view_settings(): array {
  global $wpdb;
  $themes = ['terracotta', 'ocean', 'forest', 'plum'];
  $out = ['theme' => 'terracotta', 'orgName' => 'Sidvin', 'logoDataUrl' => ''];
  $table = SIDVIN_WP_TABLE_PREFIX . 'app_settings';
  $suppress = $wpdb->suppress_errors(true);
  $value = $wpdb->get_var($wpdb->prepare("SELECT value FROM {$table} WHERE name = %s", 'view_settings'));
  $wpdb->suppress_errors($suppress);
  $saved = is_string($value) ? json_decode($value, true) : null;
  if (!is_array($saved)) return $out;
  if (in_array($saved['theme'] ?? '', $themes, true)) $out['theme'] = $saved['theme'];
  $org = trim((string)($saved['orgName'] ?? ''));
  if ($org !== '' && strlen($org) <= 240) $out['orgName'] = $org;
  $logo = (string)($saved['logoDataUrl'] ?? '');
  if ($logo !== '' && strlen($logo) <= 48000 && preg_match('/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+\/=]+$/', $logo)) $out['logoDataUrl'] = $logo;
  return $out;
}

function sidvin_render_app_shell(): void {
  $pageId = get_queried_object_id();
  $key = (string)get_post_meta($pageId, '_sidvin_app_page', true);
  $startView = (string)get_post_meta($pageId, '_sidvin_app_view', true) ?: 'dashboard';
  $loginMode = (string)get_post_meta($pageId, '_sidvin_login_mode', true);
  $pages = get_option('sidvin_app_pages', []);
  $url = static function (string $pageKey) use ($pages): string {
    $id = absint($pages[$pageKey] ?? 0);
    return $id ? get_permalink($id) : home_url('/');
  };
  $config = [
    'apiUrl' => home_url('/api/index.php'),
    'startView' => $startView,
    'loginMode' => $loginMode,
    'teamLoginUrl' => $url('team_login'),
    'propertyLoginUrl' => $url('property_login'),
    'appUrl' => $url('dashboard'),
    'pageUrls' => (static function () use ($url): array {
      $out = [];
      foreach (sidvin_app_pages() as $pageKey => [, , $view, $mode]) {
        if ($mode !== '' || isset($out[$view])) continue;
        $out[$view] = $url($pageKey);
      }
      return $out;
    })(),
    'viewSettings' => sidvin_initial_view_settings(),
  ];
  $cssFiles = glob(SIDVIN_PLUGIN_DIR . 'assets/app/assets/*.css') ?: [];
  $jsFiles = glob(SIDVIN_PLUGIN_DIR . 'assets/app/assets/*.js') ?: [];
  $lang = get_bloginfo('language') ?: 'en';
  status_header(200);
  nocache_headers();
  ?><!doctype html>
  <html lang="<?php echo esc_attr($lang); ?>">
  <head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo esc_html(get_bloginfo('name') ?: 'Sidvin'); ?></title>
    <?php if (has_site_icon()) { wp_site_icon(); } ?>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <?php foreach ($cssFiles as $file): ?>
      <link rel="stylesheet" href="<?php echo esc_url(SIDVIN_PLUGIN_URL . 'assets/app/assets/' . basename($file) . '?v=1.0.51-' . filemtime($file)); ?>">
    <?php endforeach; ?>
    <script>window.sidvinWPConfig=<?php echo wp_json_encode($config, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>;</script>
  </head>
  <?php $sidvinBg = ['terracotta' => '#fbf7f1', 'ocean' => '#f3f7fa', 'forest' => '#f3f8f4', 'plum' => '#faf6fa'][$config['viewSettings']['theme']] ?? '#fbf7f1'; ?>
  <body class="text-gray-900" style="font-family:Manrope,sans-serif;background:<?php echo esc_attr($sidvinBg); ?>">
    <div id="root"></div>
    <?php foreach ($jsFiles as $file): ?>
      <script type="module" crossorigin src="<?php echo esc_url(SIDVIN_PLUGIN_URL . 'assets/app/assets/' . basename($file) . '?v=1.0.51-' . filemtime($file)); ?>"></script>
    <?php endforeach; ?>
  </body>
  </html><?php
  exit;
}

add_action('template_redirect', function (): void {
  if (get_query_var('sidvin_api')) {
    require SIDVIN_PLUGIN_DIR . 'includes/index.php';
    exit;
  }
  if (!is_page()) return;
  $key = (string)get_post_meta(get_queried_object_id(), '_sidvin_app_page', true);
  if ($key !== '') sidvin_render_app_shell();
}, 0);

function sidvin_add_admin_page(): void {
  add_menu_page('Sidvin Proposal', 'Sidvin Proposal', 'manage_options', 'sidvin-proposal-setup', 'sidvin_render_admin_page', 'dashicons-building', 58);
}
add_action('admin_menu', 'sidvin_add_admin_page');

function sidvin_render_admin_page(): void {
  if (!current_user_can('manage_options')) return;
  // Also repair/create any missing app pages when an existing installation is upgraded.
  sidvin_create_pages();
  require_once SIDVIN_PLUGIN_DIR . 'includes/db.php';
  require_once SIDVIN_PLUGIN_DIR . 'includes/entity_map.php';
  $pdo = null;
  $adminExists = false;
  $error = '';
  try {
    $pdo = db();
    // The first Super Admin is created with the form below; no login is built into the plugin.
    $adminExists = (int)$pdo->query("SELECT COUNT(*) FROM " . sidvin_table_name('sidvin_team'))->fetchColumn() > 0;
  } catch (Throwable $e) { $error = $e->getMessage(); }
  ?>
  <div class="wrap">
    <h1>Sidvin Proposal Workflow</h1>
    <p>Your app pages have been created. They open in a clean, full-screen layout and do not depend on your WordPress theme.</p>
    <?php if (!empty($_GET['setup']) && $_GET['setup'] === 'complete'): ?>
      <div class="notice notice-success"><p>Initial Super Admin created. Open the Team Login page to sign in.</p></div>
    <?php endif; ?>
    <?php if ($error): ?>
      <div class="notice notice-error"><p>Database connection is not ready. Confirm that PHP PDO MySQL is enabled and the WordPress database is working, then reload this page.</p></div>
    <?php elseif ($adminExists): ?>
      <div class="notice notice-success inline"><p>The Sidvin Team has at least one account. Sign in to the app on the Team Login page.</p></div>
    <?php else: ?>
      <h2>Create the first app administrator</h2>
      <p>This is a separate Sidvin app login. It does not change your WordPress administrator account.</p>
      <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="max-width:560px">
        <input type="hidden" name="action" value="sidvin_create_first_admin">
        <?php wp_nonce_field('sidvin_create_first_admin'); ?>
        <table class="form-table"><tbody>
          <tr><th><label for="sidvin-admin-name">Name</label></th><td><input class="regular-text" required id="sidvin-admin-name" name="name" type="text"></td></tr>
          <tr><th><label for="sidvin-admin-email">Email</label></th><td><input class="regular-text" required id="sidvin-admin-email" name="email" type="email"></td></tr>
          <tr><th><label for="sidvin-admin-password">Password</label></th><td><input class="regular-text" required minlength="10" id="sidvin-admin-password" name="password" type="password"><p class="description">Use at least 10 characters.</p></td></tr>
        </tbody></table>
        <?php submit_button('Create Super Admin'); ?>
      </form>
    <?php endif; ?>
    <h2>App pages</h2>
    <ul><?php foreach (sidvin_app_pages() as $key => [$title]): $pages = get_option('sidvin_app_pages', []); $id = absint($pages[$key] ?? 0); if ($id): ?>
      <li><a href="<?php echo esc_url(get_permalink($id)); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html($title); ?></a></li>
    <?php endif; endforeach; ?></ul>
  </div>
  <?php
}

add_action('admin_post_sidvin_create_first_admin', function (): void {
  if (!current_user_can('manage_options')) wp_die('You are not allowed to do this.');
  check_admin_referer('sidvin_create_first_admin');
  require_once SIDVIN_PLUGIN_DIR . 'includes/db.php';
  require_once SIDVIN_PLUGIN_DIR . 'includes/entity_map.php';
  $name = sanitize_text_field(wp_unslash($_POST['name'] ?? ''));
  $email = sanitize_email(wp_unslash($_POST['email'] ?? ''));
  $password = (string)wp_unslash($_POST['password'] ?? '');
  if ($name === '' || !is_email($email) || strlen($password) < 10) wp_die('Enter a name, valid email address, and password of at least 10 characters.');
  $pdo = db();
  $table = sidvin_table_name('sidvin_team');
  if ((int)$pdo->query("SELECT COUNT(*) FROM {$table}")->fetchColumn() > 0) wp_die('An app team account already exists.');
  $id = wp_generate_uuid4();
  $data = ['id' => $id, 'name' => $name, 'designation' => 'Administrator', 'mobile' => '', 'email' => $email, 'role' => 'Super Admin', 'password' => password_hash($password, PASSWORD_DEFAULT), 'photoDataUrl' => '', 'updatedBy' => $name];
  $stmt = $pdo->prepare("INSERT INTO {$table} (id, data, updated_by) VALUES (?, ?, ?)");
  $stmt->execute([$id, wp_json_encode($data), $name]);
  wp_safe_redirect(add_query_arg('setup', 'complete', admin_url('admin.php?page=sidvin-proposal-setup')));
  exit;
});

