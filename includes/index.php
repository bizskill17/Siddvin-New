<?php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/entity_map.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/redlava.php';
require_once __DIR__ . '/whatsapp_send.php';
require_once __DIR__ . '/training.php';
require_once __DIR__ . '/files.php';

function json_out(int $status, $payload): void {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($payload, JSON_UNESCAPED_UNICODE);
  exit;
}

function ok($data): void { json_out(200, ['ok' => true, 'data' => $data]); }
function fail(int $status, string $msg): void { json_out($status, ['ok' => false, 'error' => $msg]); }

// CORS. In production the frontend and API share a domain, so this only matters for local development.
$cfgPath = __DIR__ . '/config.php';
$corsOrigin = defined('ABSPATH') ? home_url() : '*';
if (file_exists($cfgPath)) {
  $cfg = require $cfgPath;
  $corsOrigin = $cfg['cors_origin'] ?? '*';
}
header('Access-Control-Allow-Origin: ' . $corsOrigin);
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Auth-Token');
header('Cache-Control: no-store');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') json_out(200, ['ok' => true]);

function iso_or_null($value): ?string {
  return $value ? gmdate('c', strtotime($value)) : null;
}

function unpack_generic_row(array $row): array {
  $data = json_decode($row['data'] ?? '{}', true);
  if (!is_array($data)) $data = [];
  $data['id'] = $data['id'] ?? ($row['id'] ?? '');
  if (!isset($data['serialNo']) && isset($row['serial_no'])) $data['serialNo'] = (int)$row['serial_no'];
  if (!isset($data['createdAt']) && isset($row['created_at'])) $data['createdAt'] = iso_or_null($row['created_at']);
  if (!isset($data['updatedAt']) && isset($row['updated_at'])) $data['updatedAt'] = iso_or_null($row['updated_at']);
  if (!isset($data['updatedBy']) && isset($row['updated_by'])) $data['updatedBy'] = $row['updated_by'];
  return strip_secrets($data);
}

function unpack_term_row(array $row): array {
  $data = json_decode($row['data'] ?? '{}', true);
  if (!is_array($data)) $data = [];
  $data['proposalId'] = $data['proposalId'] ?? $row['proposal_id'];
  $data['createdAt'] = $data['createdAt'] ?? iso_or_null($row['created_at'] ?? null);
  $data['updatedAt'] = $data['updatedAt'] ?? iso_or_null($row['updated_at'] ?? null);
  $data['updatedBy'] = $data['updatedBy'] ?? ($row['updated_by'] ?? null);
  return $data;
}

function now_iso(): string { return gmdate('c'); }

const GENERIC_COLUMNS = 'id, serial_no, data, created_at, updated_at, updated_by';
const TERM_COLUMNS = 'proposal_id, data, created_at, updated_at, updated_by';

function fetch_generic(PDO $pdo, string $table, string $id): ?array {
  $stmt = $pdo->prepare("SELECT " . GENERIC_COLUMNS . " FROM {$table} WHERE id = ? LIMIT 1");
  $stmt->execute([$id]);
  $r = $stmt->fetch();
  return $r ?: null;
}

function fetch_term(PDO $pdo, string $table, string $proposalId): ?array {
  $stmt = $pdo->prepare("SELECT " . TERM_COLUMNS . " FROM {$table} WHERE proposal_id = ? LIMIT 1");
  $stmt->execute([$proposalId]);
  $r = $stmt->fetch();
  return $r ?: null;
}

// ---------------------------------------------------------------------------
// Property Portal scoping: a property session may only read data about its own property.
// ---------------------------------------------------------------------------

function property_readable_entities(): array {
  return [sidvin_table_name('properties'), sidvin_table_name('proposals'), sidvin_table_name('visits'), sidvin_table_name('follow_ups'), sidvin_table_name('term_sheets'), sidvin_table_name('brands')];
}

function property_proposal_ids(PDO $pdo, string $propertyId): array {
  $stmt = $pdo->prepare("SELECT id FROM " . sidvin_table_name('proposals') . " WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.propertyId')) = ?");
  $stmt->execute([$propertyId]);
  return array_column($stmt->fetchAll(), 'id');
}

function property_brand_ids(PDO $pdo, array $proposalIds): array {
  if (!$proposalIds) return [];
  $in = implode(',', array_fill(0, count($proposalIds), '?'));
  $stmt = $pdo->prepare("SELECT DISTINCT JSON_UNQUOTE(JSON_EXTRACT(data, '$.brandId')) AS brand_id FROM " . sidvin_table_name('proposals') . " WHERE id IN ({$in})");
  $stmt->execute($proposalIds);
  return array_values(array_filter(array_column($stmt->fetchAll(), 'brand_id')));
}

/** Filters already-unpacked rows down to what a property session may see. */
function scope_rows_for_property(PDO $pdo, string $table, string $propertyId, array $items): array {
  static $proposalIds = null;
  if ($proposalIds === null) $proposalIds = property_proposal_ids($pdo, $propertyId);

  switch ($table) {
    case sidvin_table_name('properties'):
      $items = array_filter($items, fn($i) => ($i['id'] ?? '') === $propertyId);
      break;
    case sidvin_table_name('proposals'):
      $items = array_filter($items, fn($i) => in_array($i['id'] ?? '', $proposalIds, true));
      break;
    case sidvin_table_name('visits'):
    case sidvin_table_name('follow_ups'):
    case sidvin_table_name('term_sheets'):
      $items = array_filter($items, fn($i) => in_array($i['proposalId'] ?? '', $proposalIds, true));
      break;
    case sidvin_table_name('brands'):
      // The portal only shows brand names, so don't expose contacts or fees.
      $brandIds = property_brand_ids($pdo, $proposalIds);
      $items = array_filter($items, fn($i) => in_array($i['id'] ?? '', $brandIds, true));
      $items = array_map(fn($i) => ['id' => $i['id'], 'name' => $i['name'] ?? '', 'serialNo' => $i['serialNo'] ?? null], $items);
      break;
    default:
      $items = [];
  }
  return array_values($items);
}

try {
  $pdo = db();
  $method = $_SERVER['REQUEST_METHOD'];

  $body = [];
  if ($method === 'POST' && stripos((string)($_SERVER['CONTENT_TYPE'] ?? ''), 'multipart/form-data') === 0) {
    // File uploads (training videos) arrive as a form, not JSON.
    $body = $_POST;
    $action = trim((string)($body['action'] ?? ''));
    if ($action === '' && empty($_FILES) && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) fail(413, 'The video is larger than this website allows (' . round(training_max_upload() / 1048576) . ' MB).');
  } elseif ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) fail(400, 'Invalid JSON body');
    $action = trim((string)($body['action'] ?? ''));
  } elseif ($method === 'GET') {
    $action = trim((string)($_GET['action'] ?? ''));
  } else {
    fail(405, 'Method not allowed');
  }
  if ($action === '') fail(400, 'Missing action');

  // ---- Auth actions (no session required) ----
  if ($method === 'POST' && $action === 'login') {
    $kind = (string)($body['kind'] ?? 'team');
    $password = (string)($body['password'] ?? '');
    $result = $kind === 'property'
      ? login_property($pdo, (string)($body['identifier'] ?? ''), $password)
      : login_team($pdo, (string)($body['email'] ?? ''), $password);
    if (!$result) {
      usleep(400000); // slow down password guessing
      fail(401, $kind === 'property' ? 'Incorrect Property ID or password.' : 'Invalid email or password.');
    }
    $token = create_session($pdo, $result['kind'], $result['id']);
    $_SERVER['HTTP_X_AUTH_TOKEN'] = $token;
    $session = current_session($pdo);
    ok(['token' => $token] + session_public($session));
  }

  if ($method === 'POST' && $action === 'logout') {
    delete_session($pdo, request_token());
    ok(true);
  }

  // Branding is public so both login screens can use the saved organization theme.
  if ($method === 'GET' && $action === 'viewSettings') {
    $stored = read_settings($pdo, ['view_settings'])['view_settings'] ?? null;
    $saved = is_array($stored) ? json_decode((string)($stored['value'] ?? ''), true) : [];
    if (!is_array($saved)) $saved = [];
    $theme = (string)($saved['theme'] ?? 'terracotta');
    $allowedThemes = ['terracotta', 'ocean', 'forest', 'plum'];
    if (!in_array($theme, $allowedThemes, true)) $theme = 'terracotta';
    $logoDataUrl = (string)($saved['logoDataUrl'] ?? '');
    if (strlen($logoDataUrl) > 48000 || ($logoDataUrl !== '' && !preg_match('/^data:image\\/(?:png|jpeg|webp);base64,[A-Za-z0-9+\\/=]+$/', $logoDataUrl))) $logoDataUrl = '';
    $orgName = trim((string)($saved['orgName'] ?? 'Sidvin'));
    if ($orgName === '' || strlen($orgName) > 240) $orgName = 'Sidvin';
    ok(['settings' => ['logoDataUrl' => $logoDataUrl, 'orgName' => $orgName, 'theme' => $theme, 'updatedAt' => $stored['updated_at'] ?? null, 'updatedBy' => $stored['updated_by'] ?? null], 'canEditSettings' => false]);
  }

  // ---- Everything below requires a valid session ----
  $session = current_session($pdo);
  if (!$session) fail(401, 'Please sign in again.');

  if ($action === 'me') ok(session_public($session));

  if (strpos($action, 'training') === 0) training_handle($pdo, $method, $action, $body, $session);

  if ($action === 'fileUpload') {
    if ($method !== 'POST') fail(405, 'Method not allowed');
    files_handle_upload($session);
  }

  // ---- A property photo as base64, for building PDFs in the browser ----
  // Only photos saved on the property are fetched (no arbitrary URLs), only for team members.
  if ($method === 'GET' && $action === 'propertyPhoto') {
    if ($session['kind'] !== 'team') fail(403, 'Not allowed');
    $propertyId = trim((string)($_GET['propertyId'] ?? ''));
    $index = (int)($_GET['index'] ?? -1);
    $stmt = $pdo->prepare("SELECT data FROM " . sidvin_table_name('properties') . " WHERE id = ? LIMIT 1");
    $stmt->execute([$propertyId]);
    $row = $stmt->fetch();
    if (!$row) fail(404, 'Property not found.');
    $data = json_decode((string)($row['data'] ?? '{}'), true) ?: [];
    $photos = array_values(array_filter(array_map('strval', (array)($data['propertyPhotos'] ?? [])), fn($u) => trim($u) !== ''));
    if ($index < 0 || $index >= count($photos)) fail(404, 'Photo not found.');
    $url = trim($photos[$index]);
    if (!preg_match('#^https?://#i', $url)) fail(400, 'Not a web link.');

    // Photos uploaded to this website are read straight from disk.
    $local = files_local_path($url);
    if ($local !== '') {
      $bytes = (string)@file_get_contents($local);
      $info = @getimagesizefromstring($bytes);
      $mime = is_array($info) ? (string)($info['mime'] ?? '') : '';
      if (in_array($mime, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], true)) ok(['mime' => $mime, 'width' => (int)$info[0], 'height' => (int)$info[1], 'base64' => base64_encode($bytes)]);
    }

    $candidates = [$url];
    $parts = parse_url($url);
    $host = strtolower((string)($parts['host'] ?? ''));
    if ($host === 'drive.google.com' || substr($host, -17) === '.drive.google.com') {
      $id = '';
      if (preg_match('#/file/d/([^/]+)#', (string)($parts['path'] ?? ''), $m)) $id = $m[1];
      if ($id === '') { parse_str((string)($parts['query'] ?? ''), $q); $id = (string)($q['id'] ?? ''); }
      if ($id !== '') {
        $e = rawurlencode($id);
        $candidates = ["https://drive.google.com/thumbnail?id={$e}&sz=w2000", "https://drive.google.com/uc?export=view&id={$e}", $url];
      }
    }

    @set_time_limit(60);
    foreach ($candidates as $c) {
      $ch = curl_init($c);
      curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 5,
        CURLOPT_CONNECTTIMEOUT => 8, CURLOPT_TIMEOUT => 20, CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
        CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS, CURLOPT_USERAGENT => 'Mozilla/5.0 (Sidvin PDF)',
      ]);
      $bytes = curl_exec($ch);
      $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
      curl_close($ch);
      if ($bytes === false || $code < 200 || $code >= 300 || strlen($bytes) < 100 || strlen($bytes) > 12 * 1024 * 1024) continue;
      $info = @getimagesizefromstring($bytes);
      $mime = is_array($info) ? (string)($info['mime'] ?? '') : '';
      if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], true)) continue;
      ok(['mime' => $mime, 'width' => (int)$info[0], 'height' => (int)$info[1], 'base64' => base64_encode($bytes)]);
    }
    fail(404, 'Photo could not be loaded. Check that it is shared as "Anyone with the link".');
  }

  // ---- Shared branding and color theme for the team workspace ----
  if ($action === 'viewSettings' || $action === 'saveViewSettings') {
    if ($session['kind'] !== 'team') fail(403, 'Not allowed');
    $isAdmin = in_array($session['role'], ['Admin', 'Super Admin'], true);

    if ($method !== 'POST') fail(405, 'Method not allowed');
    if (!$isAdmin) fail(403, 'Only Admin or Super Admin can change view settings.');
    $theme = trim((string)($body['theme'] ?? ''));
    if (!in_array($theme, ['terracotta', 'ocean', 'forest', 'plum'], true)) fail(400, 'Choose a valid color theme.');
    $logoDataUrl = trim((string)($body['logoDataUrl'] ?? ''));
    $orgName = trim((string)($body['orgName'] ?? ''));
    if ($orgName === '') fail(400, 'Enter an organization name.');
    if (strlen($orgName) > 240) fail(400, 'Organization name must be 80 characters or fewer.');
    if (strlen($logoDataUrl) > 48000) fail(400, 'The logo is too large after compression. Choose a smaller image.');
    if ($logoDataUrl !== '' && !preg_match('/^data:image\\/(?:png|jpeg|webp);base64,[A-Za-z0-9+\\/=]+$/', $logoDataUrl)) {
      fail(400, 'Upload a PNG, JPEG, or WebP logo image.');
    }
    $saved = ['logoDataUrl' => $logoDataUrl, 'orgName' => $orgName, 'theme' => $theme];
    write_setting($pdo, 'view_settings', json_encode($saved, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $session['name']);
    ok([
      'settings' => [
        'logoDataUrl' => $logoDataUrl,
        'orgName' => $orgName,
        'theme' => $theme,
        'updatedAt' => gmdate('c'),
        'updatedBy' => $session['name'],
      ],
      'canEditSettings' => true,
    ]);
  }

  // ---- Clear all data except Sidvin Team users and Organization Settings (Super Admin only) ----
  if ($action === 'clearAllData') {
    if ($method !== 'POST') fail(405, 'Method not allowed');
    if ($session['kind'] !== 'team' || $session['role'] !== 'Super Admin') fail(403, 'Only Super Admin can clear data.');
    if (trim((string)($body['confirm'] ?? '')) !== 'CLEAR') fail(400, 'Type CLEAR to confirm.');
    $tables = ['term_sheets', 'follow_ups', 'visits', 'proposals', 'brands', 'properties', 'company_master', 'category_master', 'wa_messages'];
    $counts = [];
    $pdo->beginTransaction();
    try {
      foreach ($tables as $t) {
        $name = sidvin_table_name($t);
        $exists = $pdo->prepare('SHOW TABLES LIKE ?');
        $exists->execute([$name]);
        if (!$exists->fetchColumn()) continue;
        $counts[$t] = $pdo->exec("DELETE FROM `{$name}`");
      }
      // Property Portal logins belonged to the deleted properties.
      $pdo->exec("DELETE FROM " . sidvin_table_name('auth_sessions') . " WHERE kind = 'property'");
      $pdo->commit();
    } catch (Throwable $e) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      error_log('[sidvin-api] clearAllData failed: ' . $e->getMessage());
      fail(500, 'Could not clear data. Nothing was deleted.');
    }
    error_log("[sidvin-api] All data cleared by {$session['name']}: " . json_encode($counts));
    ok(['deleted' => $counts]);
  }

  // ---- WhatsApp messages for an event (any team member) ----
  // waPreview: build the messages from form data that isn't saved yet (nothing is sent).
  // waSend: send the chosen sides for a saved record.
  if ($action === 'waPreview' || $action === 'waSend') {
    if ($method !== 'POST') fail(405, 'Method not allowed');
    if ($session['kind'] !== 'team') fail(403, 'Not allowed');
    @set_time_limit(180);
    $event = trim((string)($body['event'] ?? ''));
    if ($action === 'waPreview') {
      $record = $body['record'] ?? null;
      if (!is_array($record)) fail(400, 'Missing record.');
      ok(wa_preview($pdo, $event, $record));
    }
    $entityId = trim((string)($body['entityId'] ?? ''));
    $requestKey = trim((string)($body['requestKey'] ?? ''));
    $sides = array_values(array_intersect((array)($body['sides'] ?? []), ['property', 'brand']));
    if ($entityId === '') fail(400, 'Missing record.');
    if (!$sides) fail(400, 'Choose who to send to.');
    if (!preg_match('/^[A-Za-z0-9_-]{8,64}$/', $requestKey)) fail(400, 'Missing request key.');
    ok(wa_send_event($pdo, $event, $entityId, $sides, $requestKey, $session['name']));
  }

  // ---- Red Lava connection settings (saved in the app, encrypted) ----
  if ($action === 'waSaveSettings') {
    if ($method !== 'POST') fail(405, 'Method not allowed');
    if ($session['kind'] !== 'team' || !in_array($session['role'], ['Admin', 'Super Admin'], true)) {
      fail(403, 'Only Admin or Super Admin can change the Red Lava connection.');
    }
    if (redlava_config()['source'] === 'config') fail(400, 'The Red Lava key is set in api/config.php on the server. Remove it there to manage it from the app.');
    $apiKey = trim((string)($body['apiKey'] ?? ''));
    $phoneId = trim((string)($body['phoneId'] ?? ''));
    if ($apiKey === '' && !redlava_configured()) fail(400, 'Enter the Red Lava API key.');
    if ($phoneId !== '' && !preg_match('/^\d{5,30}$/', $phoneId)) fail(400, 'Phone ID should be digits only.');
    if (strlen($apiKey) > 500) fail(400, 'That API key looks too long.');
    redlava_save_settings($pdo, $apiKey, $phoneId, $session['name']);
    error_log("[sidvin-api] Red Lava connection updated by {$session['name']}");
    // Check the new details work, so the user knows straight away.
    $check = redlava_list_templates();
    ok(['settings' => redlava_public_settings(), 'checkError' => $check['error'], 'templateCount' => count($check['templates'])]);
  }

  // ---- WhatsApp templates (Red Lava) ----
  if ($action === 'waTemplates' || $action === 'waSubmitTemplate') {
    if ($session['kind'] !== 'team') fail(403, 'Not allowed');
    $isAdmin = in_array($session['role'], ['Admin', 'Super Admin'], true);
    @set_time_limit(180);

    $local = siddvin_templates();
    $configured = redlava_configured();
    $remote = ['templates' => [], 'error' => null];
    if ($configured) $remote = redlava_list_templates();

    $describe = function (array $t) use ($remote): array {
      $req = $t['request'] ?? [];
      $body = '';
      $examples = [];
      foreach (($req['components'] ?? []) as $c) {
        if (($c['type'] ?? '') === 'BODY') {
          $body = (string)($c['text'] ?? '');
          $examples = $c['example']['body_text'][0] ?? [];
        }
      }
      $key = ($req['name'] ?? '') . '|' . ($req['language'] ?? '');
      return [
        'title' => $t['title'] ?? ($req['name'] ?? ''),
        'name' => $req['name'] ?? '',
        'language' => $req['language'] ?? '',
        'category' => $req['category'] ?? '',
        'body' => $body,
        'fields' => $t['fields'] ?? [],
        'examples' => $examples,
        'remote' => $remote['templates'][$key] ?? null,
      ];
    };

    if ($action === 'waTemplates') {
      ok([
        'configured' => $configured,
        'canSubmit' => $isAdmin && $configured,
        'canEditSettings' => $isAdmin,
        'settings' => redlava_public_settings(),
        'remoteError' => $remote['error'],
        'templates' => array_map($describe, $local),
      ]);
    }

    // waSubmitTemplate
    if ($method !== 'POST') fail(405, 'Method not allowed');
    if (!$isAdmin) fail(403, 'Only Admin or Super Admin can submit templates.');
    if (!$configured) fail(400, 'Red Lava is not connected yet: add the API key on this page first.');
    if ($remote['error']) fail(502, 'Could not check existing templates first. ' . $remote['error']);

    $name = trim((string)($body['name'] ?? ''));
    $match = null;
    foreach ($local as $t) if (($t['request']['name'] ?? '') === $name) $match = $t;
    if (!$match) fail(404, 'Unknown template.');
    $info = $describe($match);
    if ($info['remote']) fail(409, "This template is already in Red Lava (status: {$info['remote']['status']}).");

    $res = redlava_create_template($match['request']);
    if ($res['status'] === 0) {
      // No reply: it may still have been submitted. Never resubmit blindly.
      error_log("[sidvin-api] Red Lava create {$name}: {$res['error']}");
      fail(504, $res['error'] . ' It may still have been submitted. Refresh this page in a few minutes before trying again.');
    }
    if ($res['error']) fail(502, $res['error']);
    error_log("[sidvin-api] Submitted WhatsApp template {$name} by {$session['name']}");
    ok([
      'name' => $name,
      'message' => is_array($res['json']) ? (string)($res['json']['message'] ?? 'Submitted to Meta for review.') : 'Submitted to Meta for review.',
    ]);
  }

  $entity = resolve_entity((string)($method === 'POST' ? ($body['entity'] ?? '') : ($_GET['entity'] ?? '')));
  if ($entity['kind'] === 'unknown') fail(400, 'Unknown entity');
  $table = $entity['table'];

  $isProperty = $session['kind'] === 'property';
  if ($isProperty) {
    if ($method !== 'GET' || !in_array($table, property_readable_entities(), true)) fail(403, 'Not allowed');
  }
  $scope = function (array $items) use ($pdo, $table, $session, $isProperty): array {
    return $isProperty ? scope_rows_for_property($pdo, $table, $session['id'], $items) : $items;
  };

  if ($method === 'GET') {
    if ($entity['kind'] === 'term') {
      if ($action === 'list') {
        $rows = $pdo->query("SELECT " . TERM_COLUMNS . " FROM {$table} ORDER BY updated_at DESC")->fetchAll();
        ok($scope(array_map('unpack_term_row', $rows)));
      }
      if ($action === 'getByProposalId') {
        $proposalId = trim((string)($_GET['proposalId'] ?? ''));
        if ($proposalId === '') fail(400, 'Missing proposalId');
        $r = fetch_term($pdo, $table, $proposalId);
        ok($scope($r ? [unpack_term_row($r)] : []));
      }
      fail(400, "Unsupported action for TermSheets: {$action}");
    }

    if ($action === 'list') {
      $rows = $pdo->query("SELECT " . GENERIC_COLUMNS . " FROM {$table} ORDER BY updated_at DESC")->fetchAll();
      ok($scope(array_map('unpack_generic_row', $rows)));
    }

    if ($action === 'getById') {
      $id = trim((string)($_GET['id'] ?? ''));
      if ($id === '') fail(400, 'Missing id');
      $r = fetch_generic($pdo, $table, $id);
      $items = $scope($r ? [unpack_generic_row($r)] : []);
      ok($items[0] ?? null);
    }

    if ($action === 'getByProposalId') {
      $proposalId = trim((string)($_GET['proposalId'] ?? ''));
      if ($proposalId === '') fail(400, 'Missing proposalId');
      $stmt = $pdo->prepare(
        "SELECT " . GENERIC_COLUMNS . " FROM {$table}
         WHERE JSON_UNQUOTE(JSON_EXTRACT(data,'$.proposalId')) = ?
         ORDER BY updated_at DESC"
      );
      $stmt->execute([$proposalId]);
      ok($scope(array_map('unpack_generic_row', $stmt->fetchAll())));
    }

    fail(400, "Unsupported action: {$action}");
  }

  // ---- POST (writes): team sessions only, enforced above ----
  // "updatedBy" always comes from the signed-in user, never from the request body.
  $updatedBy = $session['name'];

  if ($entity['kind'] === 'term') {
    if ($action !== 'upsertByProposalId') fail(400, "Unsupported action for TermSheets: {$action}");
    $proposalId = trim((string)($body['proposalId'] ?? ''));
    if ($proposalId === '') fail(400, 'Missing proposalId');
    $data = $body['data'] ?? [];
    if (!is_array($data)) $data = [];

    $data['proposalId'] = $proposalId;
    $data['updatedBy'] = $updatedBy;
    $data['updatedAt'] = now_iso();

    $stmt = $pdo->prepare(
      "INSERT INTO {$table} (proposal_id, data, updated_by)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE data = VALUES(data), updated_by = VALUES(updated_by), updated_at = CURRENT_TIMESTAMP"
    );
    $stmt->execute([$proposalId, json_encode($data, JSON_UNESCAPED_UNICODE), $updatedBy]);

    $r = fetch_term($pdo, $table, $proposalId);
    ok($r ? unpack_term_row($r) : $data);
  }

  if ($action === 'create') {
    $id = uuid_v4();
    $data = $body['data'] ?? [];
    if (!is_array($data)) $data = [];
    $data = prepare_password_field($data, null);
    $data['id'] = $id;
    $data['updatedBy'] = $updatedBy;
    $data['updatedAt'] = now_iso();

    $stmt = $pdo->prepare("INSERT INTO {$table} (id, data, updated_by) VALUES (?, ?, ?)");
    $stmt->execute([$id, json_encode($data, JSON_UNESCAPED_UNICODE), $updatedBy]);

    $r = fetch_generic($pdo, $table, $id);
    ok($r ? unpack_generic_row($r) : strip_secrets($data));
  }

  if ($action === 'update') {
    $id = trim((string)($body['id'] ?? ''));
    if ($id === '') fail(400, 'Missing id');
    $patch = $body['data'] ?? [];
    if (!is_array($patch)) $patch = [];

    $r = fetch_generic($pdo, $table, $id);
    if (!$r) fail(404, 'Not found');

    $existing = json_decode($r['data'] ?? '{}', true);
    if (!is_array($existing)) $existing = [];
    $patch = prepare_password_field($patch, $existing);
    $merged = array_merge($existing, $patch);
    $merged['id'] = $id;
    if (!isset($merged['serialNo']) && isset($r['serial_no'])) $merged['serialNo'] = (int)$r['serial_no'];
    $merged['updatedBy'] = $updatedBy;
    $merged['updatedAt'] = now_iso();

    $stmt = $pdo->prepare("UPDATE {$table} SET data = ?, updated_by = ? WHERE id = ?");
    $stmt->execute([json_encode($merged, JSON_UNESCAPED_UNICODE), $updatedBy, $id]);

    $r2 = fetch_generic($pdo, $table, $id);
    ok($r2 ? unpack_generic_row($r2) : strip_secrets($merged));
  }

  if ($action === 'delete') {
    $id = trim((string)($body['id'] ?? ''));
    if ($id === '') fail(400, 'Missing id');
    if ($table === sidvin_table_name('sidvin_team') && $id === $session['id']) fail(400, 'You cannot delete your own account.');
    $stmt = $pdo->prepare("DELETE FROM {$table} WHERE id = ?");
    $stmt->execute([$id]);
    json_out(200, ['ok' => ($stmt->rowCount() > 0)]);
  }

  fail(400, "Unsupported action: {$action}");
} catch (Throwable $e) {
  // Log the real error on the server; don't expose database details to the browser.
  error_log('[sidvin-api] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
  fail(500, 'Server error. Please try again.');
}
