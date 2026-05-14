<?php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/entity_map.php';

function json_out(int $status, $payload): void {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($payload, JSON_UNESCAPED_UNICODE);
  exit;
}

function ok($data): void { json_out(200, ['ok' => true, 'data' => $data]); }
function fail(int $status, string $msg): void { json_out($status, ['ok' => false, 'error' => $msg]); }

// Basic CORS for frontend usage
$cfgPath = __DIR__ . '/config.php';
$corsOrigin = '*';
if (file_exists($cfgPath)) {
  $cfg = require $cfgPath;
  $corsOrigin = $cfg['cors_origin'] ?? '*';
}
header('Access-Control-Allow-Origin: ' . $corsOrigin);
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') json_out(200, ['ok' => true]);

function unpack_generic_row(array $row): array {
  $data = json_decode($row['data'] ?? '{}', true);
  if (!is_array($data)) $data = [];
  $data['id'] = $data['id'] ?? ($row['id'] ?? '');
  if (!isset($data['serialNo']) && isset($row['serial_no'])) $data['serialNo'] = (int)$row['serial_no'];
  if (!isset($data['createdAt']) && isset($row['created_at'])) $data['createdAt'] = gmdate('c', strtotime($row['created_at']));
  if (!isset($data['updatedAt']) && isset($row['updated_at'])) $data['updatedAt'] = gmdate('c', strtotime($row['updated_at']));
  if (!isset($data['updatedBy']) && isset($row['updated_by'])) $data['updatedBy'] = $row['updated_by'];
  return $data;
}

function now_iso(): string { return gmdate('c'); }

try {
  $pdo = db();

  if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = trim($_GET['action'] ?? '');
    $entityRaw = (string)($_GET['entity'] ?? '');
    if ($action === '') fail(400, 'Missing action');

    $entity = resolve_entity($entityRaw);
    if ($entity['kind'] === 'unknown') fail(400, 'Unknown entity');

    if ($entity['kind'] === 'term') {
      if ($action === 'list') {
        $stmt = $pdo->query("SELECT proposal_id, data, created_at, updated_at, updated_by FROM {$entity['table']} ORDER BY updated_at DESC");
        $rows = $stmt->fetchAll();
        $out = [];
        foreach ($rows as $r) {
          $data = json_decode($r['data'] ?? '{}', true);
          if (!is_array($data)) $data = [];
          $data['proposalId'] = $data['proposalId'] ?? $r['proposal_id'];
          $data['createdAt'] = $data['createdAt'] ?? gmdate('c', strtotime($r['created_at']));
          $data['updatedAt'] = $data['updatedAt'] ?? gmdate('c', strtotime($r['updated_at']));
          $data['updatedBy'] = $data['updatedBy'] ?? ($r['updated_by'] ?? null);
          $out[] = $data;
        }
        ok($out);
      }
      if ($action === 'getByProposalId') {
        $proposalId = trim($_GET['proposalId'] ?? '');
        if ($proposalId === '') fail(400, 'Missing proposalId');
        $stmt = $pdo->prepare("SELECT proposal_id, data, created_at, updated_at, updated_by FROM {$entity['table']} WHERE proposal_id = ? LIMIT 1");
        $stmt->execute([$proposalId]);
        $r = $stmt->fetch();
        if (!$r) ok([]);
        $data = json_decode($r['data'] ?? '{}', true);
        if (!is_array($data)) $data = [];
        $data['proposalId'] = $data['proposalId'] ?? $r['proposal_id'];
        $data['createdAt'] = $data['createdAt'] ?? gmdate('c', strtotime($r['created_at']));
        $data['updatedAt'] = $data['updatedAt'] ?? gmdate('c', strtotime($r['updated_at']));
        $data['updatedBy'] = $data['updatedBy'] ?? ($r['updated_by'] ?? null);
        ok([$data]);
      }
      fail(400, "Unsupported action for TermSheets: {$action}");
    }

    if ($action === 'list') {
      $stmt = $pdo->query("SELECT id, serial_no, data, created_at, updated_at, updated_by FROM {$entity['table']} ORDER BY updated_at DESC");
      $rows = $stmt->fetchAll();
      $out = array_map('unpack_generic_row', $rows);
      ok($out);
    }

    if ($action === 'getById') {
      $id = trim($_GET['id'] ?? '');
      if ($id === '') fail(400, 'Missing id');
      $stmt = $pdo->prepare("SELECT id, serial_no, data, created_at, updated_at, updated_by FROM {$entity['table']} WHERE id = ? LIMIT 1");
      $stmt->execute([$id]);
      $r = $stmt->fetch();
      ok($r ? unpack_generic_row($r) : null);
    }

    if ($action === 'getByProposalId') {
      $proposalId = trim($_GET['proposalId'] ?? '');
      if ($proposalId === '') fail(400, 'Missing proposalId');
      $stmt = $pdo->prepare(
        "SELECT id, serial_no, data, created_at, updated_at, updated_by
         FROM {$entity['table']}
         WHERE JSON_UNQUOTE(JSON_EXTRACT(data,'$.proposalId')) = ?
         ORDER BY updated_at DESC"
      );
      $stmt->execute([$proposalId]);
      $rows = $stmt->fetchAll();
      $out = array_map('unpack_generic_row', $rows);
      ok($out);
    }

    fail(400, "Unsupported action: {$action}");
  }

  if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $body = json_decode($raw, true);
    if (!is_array($body)) fail(400, 'Invalid JSON body');

    $action = trim((string)($body['action'] ?? ''));
    $entityRaw = (string)($body['entity'] ?? '');
    $updatedBy = isset($body['updatedBy']) ? (string)$body['updatedBy'] : null;
    if ($action === '') fail(400, 'Missing action');

    $entity = resolve_entity($entityRaw);
    if ($entity['kind'] === 'unknown') fail(400, 'Unknown entity');

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
        "INSERT INTO {$entity['table']} (proposal_id, data, updated_by)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE data = VALUES(data), updated_by = VALUES(updated_by), updated_at = CURRENT_TIMESTAMP"
      );
      $stmt->execute([$proposalId, json_encode($data, JSON_UNESCAPED_UNICODE), $updatedBy]);

      $stmt2 = $pdo->prepare("SELECT proposal_id, data, created_at, updated_at, updated_by FROM {$entity['table']} WHERE proposal_id = ? LIMIT 1");
      $stmt2->execute([$proposalId]);
      $r = $stmt2->fetch();
      $out = json_decode($r['data'] ?? '{}', true);
      if (!is_array($out)) $out = [];
      $out['proposalId'] = $out['proposalId'] ?? $proposalId;
      $out['createdAt'] = $out['createdAt'] ?? gmdate('c', strtotime($r['created_at']));
      $out['updatedAt'] = $out['updatedAt'] ?? gmdate('c', strtotime($r['updated_at']));
      $out['updatedBy'] = $out['updatedBy'] ?? ($r['updated_by'] ?? null);
      ok($out);
    }

    if ($action === 'create') {
      $id = uuid_v4();
      $data = $body['data'] ?? [];
      if (!is_array($data)) $data = [];
      $data['id'] = $id;
      $data['updatedBy'] = $updatedBy;
      $data['updatedAt'] = now_iso();

      $stmt = $pdo->prepare("INSERT INTO {$entity['table']} (id, data, updated_by) VALUES (?, ?, ?)");
      $stmt->execute([$id, json_encode($data, JSON_UNESCAPED_UNICODE), $updatedBy]);

      $stmt2 = $pdo->prepare("SELECT id, serial_no, data, created_at, updated_at, updated_by FROM {$entity['table']} WHERE id = ? LIMIT 1");
      $stmt2->execute([$id]);
      $r = $stmt2->fetch();
      ok($r ? unpack_generic_row($r) : $data);
    }

    if ($action === 'update') {
      $id = trim((string)($body['id'] ?? ''));
      if ($id === '') fail(400, 'Missing id');
      $patch = $body['data'] ?? [];
      if (!is_array($patch)) $patch = [];

      $stmt = $pdo->prepare("SELECT id, serial_no, data, created_at, updated_at, updated_by FROM {$entity['table']} WHERE id = ? LIMIT 1");
      $stmt->execute([$id]);
      $r = $stmt->fetch();
      if (!$r) fail(404, 'Not found');

      $existing = json_decode($r['data'] ?? '{}', true);
      if (!is_array($existing)) $existing = [];
      $merged = array_merge($existing, $patch);
      $merged['id'] = $id;
      if (!isset($merged['serialNo']) && isset($r['serial_no'])) $merged['serialNo'] = (int)$r['serial_no'];
      $merged['updatedBy'] = $updatedBy ?? ($merged['updatedBy'] ?? null);
      $merged['updatedAt'] = now_iso();

      $stmt2 = $pdo->prepare("UPDATE {$entity['table']} SET data = ?, updated_by = ? WHERE id = ?");
      $stmt2->execute([json_encode($merged, JSON_UNESCAPED_UNICODE), $updatedBy, $id]);

      $stmt3 = $pdo->prepare("SELECT id, serial_no, data, created_at, updated_at, updated_by FROM {$entity['table']} WHERE id = ? LIMIT 1");
      $stmt3->execute([$id]);
      $r2 = $stmt3->fetch();
      ok($r2 ? unpack_generic_row($r2) : $merged);
    }

    if ($action === 'delete') {
      $id = trim((string)($body['id'] ?? ''));
      if ($id === '') fail(400, 'Missing id');
      $stmt = $pdo->prepare("DELETE FROM {$entity['table']} WHERE id = ?");
      $stmt->execute([$id]);
      json_out(200, ['ok' => ($stmt->rowCount() > 0)]);
    }

    fail(400, "Unsupported action: {$action}");
  }

  fail(405, 'Method not allowed');
} catch (Throwable $e) {
  fail(500, $e->getMessage());
}

