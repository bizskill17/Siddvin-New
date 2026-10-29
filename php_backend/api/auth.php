<?php

// Server-side authentication for the Sidvin API.
//
// Two kinds of sessions exist:
//   - 'team'     : a Sidvin team member (full access to all entities)
//   - 'property' : a property owner using the Property Portal (read-only, scoped to one property)
//
// Tokens are random 64-char hex strings sent by the browser in the X-Auth-Token header.
// Only a SHA-256 hash of each token is stored in the database.

const TEAM_SESSION_TTL_SECONDS = 7 * 24 * 3600;
const PROPERTY_SESSION_TTL_SECONDS = 24 * 3600;

function ensure_auth_table(PDO $pdo): void {
  $pdo->exec(
    "CREATE TABLE IF NOT EXISTS auth_sessions (
      token_hash CHAR(64) NOT NULL,
      kind VARCHAR(16) NOT NULL,
      subject_id VARCHAR(36) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      PRIMARY KEY (token_hash),
      KEY idx_auth_sessions_expires (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  );
}

function is_password_hash(string $stored): bool {
  $info = password_get_info($stored);
  return ($info['algo'] ?? null) !== null && ($info['algo'] ?? 0) !== 0;
}

/**
 * Checks a password against what is stored. Accepts legacy plain-text values so existing
 * accounts keep working; the caller upgrades them to a hash after a successful login.
 */
function verify_password(string $input, string $stored): bool {
  $input = trim($input);
  if ($input === '' || $stored === '') return false;
  if (is_password_hash($stored)) return password_verify($input, $stored);
  return hash_equals(trim($stored), $input);
}

function hash_new_password(string $plain): string {
  return password_hash(trim($plain), PASSWORD_DEFAULT);
}

/** Replaces a stored password with a hash if it is still plain text (or uses an outdated hash). */
function upgrade_password_if_needed(PDO $pdo, string $table, string $id, array $data, string $plain): void {
  $stored = (string)($data['password'] ?? '');
  if (is_password_hash($stored) && !password_needs_rehash($stored, PASSWORD_DEFAULT)) return;
  $data['password'] = hash_new_password($plain);
  $stmt = $pdo->prepare("UPDATE {$table} SET data = ? WHERE id = ?");
  $stmt->execute([json_encode($data, JSON_UNESCAPED_UNICODE), $id]);
}

function create_session(PDO $pdo, string $kind, string $subjectId): string {
  ensure_auth_table($pdo);
  $pdo->exec("DELETE FROM auth_sessions WHERE expires_at < UTC_TIMESTAMP()");
  $token = bin2hex(random_bytes(32));
  $ttl = $kind === 'team' ? TEAM_SESSION_TTL_SECONDS : PROPERTY_SESSION_TTL_SECONDS;
  $expires = gmdate('Y-m-d H:i:s', time() + $ttl);
  $stmt = $pdo->prepare("INSERT INTO auth_sessions (token_hash, kind, subject_id, expires_at) VALUES (?, ?, ?, ?)");
  $stmt->execute([hash('sha256', $token), $kind, $subjectId, $expires]);
  return $token;
}

function request_token(): string {
  $token = $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';
  return is_string($token) ? trim($token) : '';
}

function delete_session(PDO $pdo, string $token): void {
  if ($token === '') return;
  try {
    $stmt = $pdo->prepare("DELETE FROM auth_sessions WHERE token_hash = ?");
    $stmt->execute([hash('sha256', $token)]);
  } catch (PDOException $e) {
    // Table may not exist yet; nothing to delete.
  }
}

/**
 * Returns the current session, or null if the token is missing, unknown, expired,
 * or the user/property it belongs to no longer exists.
 * Shape: ['kind' => 'team'|'property', 'id' => string, 'name' => string, 'role' => string|null]
 */
function current_session(PDO $pdo): ?array {
  $token = request_token();
  if ($token === '' || !preg_match('/^[a-f0-9]{64}$/', $token)) return null;

  try {
    $stmt = $pdo->prepare("SELECT kind, subject_id FROM auth_sessions WHERE token_hash = ? AND expires_at > UTC_TIMESTAMP() LIMIT 1");
    $stmt->execute([hash('sha256', $token)]);
    $s = $stmt->fetch();
  } catch (PDOException $e) {
    return null; // auth table not created yet => nobody is logged in
  }
  if (!$s) return null;

  $table = $s['kind'] === 'team' ? 'sidvin_team' : 'properties';
  $stmt = $pdo->prepare("SELECT data FROM {$table} WHERE id = ? LIMIT 1");
  $stmt->execute([$s['subject_id']]);
  $row = $stmt->fetch();
  if (!$row) return null;
  $data = json_decode($row['data'] ?? '{}', true);
  if (!is_array($data)) $data = [];

  if ($s['kind'] === 'team') {
    return [
      'kind' => 'team',
      'id' => $s['subject_id'],
      'name' => trim((string)($data['name'] ?? '')) ?: 'Unknown',
      'role' => trim((string)($data['role'] ?? '')) ?: 'Employee',
      'email' => trim((string)($data['email'] ?? '')),
      'photoDataUrl' => trim((string)($data['photoDataUrl'] ?? '')),
    ];
  }
  return [
    'kind' => 'property',
    'id' => $s['subject_id'],
    'name' => trim((string)($data['address'] ?? '')) ?: 'Property',
    'role' => null,
  ];
}

function session_public(array $session): array {
  if ($session['kind'] === 'team') {
    return ['kind' => 'team', 'user' => ['id' => $session['id'], 'name' => $session['name'], 'role' => $session['role'], 'email' => $session['email'] ?? '', 'photoDataUrl' => $session['photoDataUrl'] ?? '']];
  }
  return ['kind' => 'property', 'property' => ['id' => $session['id'], 'name' => $session['name']]];
}

function login_team(PDO $pdo, string $email, string $password): ?array {
  $email = strtolower(trim($email));
  if ($email === '' || trim($password) === '') return null;
  $stmt = $pdo->prepare("SELECT id, data FROM sidvin_team WHERE LOWER(TRIM(JSON_UNQUOTE(JSON_EXTRACT(data, '$.email')))) = ?");
  $stmt->execute([$email]);
  foreach ($stmt->fetchAll() as $row) {
    $data = json_decode($row['data'] ?? '{}', true);
    if (!is_array($data)) continue;
    if (verify_password($password, (string)($data['password'] ?? ''))) {
      upgrade_password_if_needed($pdo, 'sidvin_team', $row['id'], $data, $password);
      return ['kind' => 'team', 'id' => $row['id']];
    }
  }
  return null;
}

/** Property login accepts the property id, its serial code (e.g. "P-9"), or part of its address. */
function login_property(PDO $pdo, string $identifier, string $password): ?array {
  $value = strtolower(trim($identifier));
  if ($value === '' || trim($password) === '') return null;

  $rows = $pdo->query("SELECT id, serial_no, data FROM properties")->fetchAll();
  $candidates = [];
  foreach ($rows as $r) {
    if (strtolower($r['id']) === $value) { $candidates = [$r]; break; }
  }
  if (!$candidates && preg_match('/(\d+)$/', $value, $m)) {
    foreach ($rows as $r) {
      $data = json_decode($r['data'] ?? '{}', true) ?: [];
      $serial = isset($data['serialNo']) && preg_match('/(\d+)$/', (string)$data['serialNo'], $sm) ? (int)$sm[1] : (int)$r['serial_no'];
      if ($serial === (int)$m[1]) { $candidates = [$r]; break; }
    }
  }
  if (!$candidates) {
    foreach ($rows as $r) {
      $data = json_decode($r['data'] ?? '{}', true) ?: [];
      if ($value !== '' && strpos(strtolower((string)($data['address'] ?? '')), $value) !== false) $candidates[] = $r;
    }
  }

  foreach ($candidates as $r) {
    $data = json_decode($r['data'] ?? '{}', true);
    if (!is_array($data)) continue;
    if (verify_password($password, (string)($data['password'] ?? ''))) {
      upgrade_password_if_needed($pdo, 'properties', $r['id'], $data, $password);
      return ['kind' => 'property', 'id' => $r['id']];
    }
  }
  return null;
}

/** Never send stored passwords (hashed or not) to the browser. */
function strip_secrets(array $data): array {
  unset($data['password']);
  return $data;
}

/**
 * Handles the password field of a create/update payload for tables that hold logins.
 * A non-empty password is hashed; an empty or missing one keeps the existing value.
 */
function prepare_password_field(array $incoming, ?array $existing): array {
  if (array_key_exists('password', $incoming)) {
    $plain = is_string($incoming['password']) ? trim($incoming['password']) : '';
    if ($plain !== '') {
      $incoming['password'] = hash_new_password($plain);
    } else {
      unset($incoming['password']);
    }
  }
  if ($existing !== null && !array_key_exists('password', $incoming) && isset($existing['password'])) {
    $incoming['password'] = $existing['password'];
  }
  return $incoming;
}
