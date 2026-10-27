<?php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/entity_map.php';
require_once __DIR__ . '/auth.php';

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
$corsOrigin = '*';
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

const PROPERTY_READABLE_ENTITIES = ['properties', 'proposals', 'visits', 'follow_ups', 'term_sheets', 'brands'];

function property_proposal_ids(PDO $pdo, string $propertyId): array {
  $stmt = $pdo->prepare("SELECT id FROM proposals WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.propertyId')) = ?");
  $stmt->execute([$propertyId]);
  return array_column($stmt->fetchAll(), 'id');
}

function property_brand_ids(PDO $pdo, array $proposalIds): array {
  if (!$proposalIds) return [];
  $in = implode(',', array_fill(0, count($proposalIds), '?'));
  $stmt = $pdo->prepare("SELECT DISTINCT JSON_UNQUOTE(JSON_EXTRACT(data, '$.brandId')) AS brand_id FROM proposals WHERE id IN ({$in})");
  $stmt->execute($proposalIds);
  return array_values(array_filter(array_column($stmt->fetchAll(), 'brand_id')));
}

/** Filters already-unpacked rows down to what a property session may see. */
function scope_rows_for_property(PDO $pdo, string $table, string $propertyId, array $items): array {
  static $proposalIds = null;
  if ($proposalIds === null) $proposalIds = property_proposal_ids($pdo, $propertyId);

  switch ($table) {
    case 'properties':
      $items = array_filter($items, fn($i) => ($i['id'] ?? '') === $propertyId);
      break;
    case 'proposals':
      $items = array_filter($items, fn($i) => in_array($i['id'] ?? '', $proposalIds, true));
      break;
    case 'visits':
    case 'follow_ups':
    case 'term_sheets':
      $items = array_filter($items, fn($i) => in_array($i['proposalId'] ?? '', $proposalIds, true));
      break;
    case 'brands':
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
  if ($method === 'POST') {
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

  // ---- Everything below requires a valid session ----
  $session = current_session($pdo);
  if (!$session) fail(401, 'Please sign in again.');

  if ($action === 'me') ok(session_public($session));

  $entity = resolve_entity((string)($method === 'POST' ? ($body['entity'] ?? '') : ($_GET['entity'] ?? '')));
  if ($entity['kind'] === 'unknown') fail(400, 'Unknown entity');
  $table = $entity['table'];

  $isProperty = $session['kind'] === 'property';
  if ($isProperty) {
    if ($method !== 'GET' || !in_array($table, PROPERTY_READABLE_ENTITIES, true)) fail(403, 'Not allowed');
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
    if ($table === 'sidvin_team' && $id === $session['id']) fail(400, 'You cannot delete your own account.');
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
