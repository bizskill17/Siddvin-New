<?php

// Minimal Red Lava (wa.redlava.in) WhatsApp API client.
//
// Credentials come from one of two places:
//   1. api/config.php  ('redlava' => ['api_key' => '...', 'phone_id' => '...'])  - takes priority
//   2. Saved in the app (WhatsApp Templates page), stored encrypted in the app_settings table.
// The API key is never sent back to the browser; only its last 4 characters are shown.

function app_config_all(): array {
  static $all = null;
  if ($all !== null) return $all;
  $path = __DIR__ . '/config.php';
  $all = file_exists($path) ? (require $path) : [];
  if (!is_array($all)) $all = [];
  return $all;
}

function ensure_settings_table(PDO $pdo): void {
  $pdo->exec(
    "CREATE TABLE IF NOT EXISTS app_settings (
      name VARCHAR(64) NOT NULL,
      value TEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_by VARCHAR(255) NULL,
      PRIMARY KEY (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  );
}

/** Encryption key for stored secrets, derived from the server-only database password in config.php. */
function settings_secret(): string {
  $db = app_config_all()['db'] ?? [];
  return hash('sha256', 'sidvin-app-settings|' . ($db['pass'] ?? '') . '|' . ($db['name'] ?? ''), true);
}

function encrypt_setting(string $plain): string {
  $iv = random_bytes(12);
  $tag = '';
  $cipher = openssl_encrypt($plain, 'aes-256-gcm', settings_secret(), OPENSSL_RAW_DATA, $iv, $tag);
  return 'v1:' . base64_encode($iv . $tag . $cipher);
}

function decrypt_setting(string $stored): string {
  if (strpos($stored, 'v1:') !== 0) return '';
  $raw = base64_decode(substr($stored, 3), true);
  if ($raw === false || strlen($raw) < 29) return '';
  $plain = openssl_decrypt(substr($raw, 28), 'aes-256-gcm', settings_secret(), OPENSSL_RAW_DATA, substr($raw, 0, 12), substr($raw, 12, 16));
  return $plain === false ? '' : $plain;
}

function read_settings(PDO $pdo, array $names): array {
  try {
    $in = implode(',', array_fill(0, count($names), '?'));
    $stmt = $pdo->prepare("SELECT name, value, updated_at, updated_by FROM app_settings WHERE name IN ({$in})");
    $stmt->execute($names);
    $out = [];
    foreach ($stmt->fetchAll() as $r) $out[$r['name']] = $r;
    return $out;
  } catch (PDOException $e) {
    return []; // table not created yet
  }
}

function write_setting(PDO $pdo, string $name, string $value, string $by): void {
  ensure_settings_table($pdo);
  $stmt = $pdo->prepare("REPLACE INTO app_settings (name, value, updated_by) VALUES (?, ?, ?)");
  $stmt->execute([$name, $value, $by]);
}

function redlava_config(bool $reload = false): array {
  static $cfg = null;
  if ($cfg !== null && !$reload) return $cfg;
  $rl = app_config_all()['redlava'] ?? [];
  if (!is_array($rl)) $rl = [];
  $cfg = [
    'api_key' => trim((string)($rl['api_key'] ?? '')),
    'phone_id' => trim((string)($rl['phone_id'] ?? '')),
    'base_url' => rtrim(trim((string)($rl['base_url'] ?? 'https://wa.redlava.in')), '/'),
    'source' => 'config',
    'updated_at' => null,
    'updated_by' => null,
  ];
  if ($cfg['api_key'] === '') {
    $saved = read_settings(db(), ['redlava_api_key', 'redlava_phone_id']);
    $cfg['api_key'] = isset($saved['redlava_api_key']) ? decrypt_setting($saved['redlava_api_key']['value']) : '';
    $cfg['phone_id'] = trim((string)($saved['redlava_phone_id']['value'] ?? ''));
    $cfg['source'] = $cfg['api_key'] !== '' ? 'app' : 'none';
    $cfg['updated_at'] = $saved['redlava_api_key']['updated_at'] ?? null;
    $cfg['updated_by'] = $saved['redlava_api_key']['updated_by'] ?? null;
  }
  return $cfg;
}

/** What the browser may see about the connection: never the key itself. */
function redlava_public_settings(): array {
  $cfg = redlava_config();
  $key = $cfg['api_key'];
  return [
    'source' => $cfg['source'],
    'keyHint' => $key !== '' ? '••••' . substr($key, -4) : '',
    'phoneId' => $cfg['phone_id'],
    'updatedAt' => $cfg['updated_at'] ? gmdate('c', strtotime($cfg['updated_at'])) : null,
    'updatedBy' => $cfg['updated_by'],
  ];
}

function redlava_save_settings(PDO $pdo, string $apiKey, string $phoneId, string $by): void {
  $apiKey = trim($apiKey);
  $phoneId = trim($phoneId);
  if ($apiKey !== '') write_setting($pdo, 'redlava_api_key', encrypt_setting($apiKey), $by);
  write_setting($pdo, 'redlava_phone_id', $phoneId, $by);
  redlava_config(true);
}

function redlava_configured(): bool {
  return redlava_config()['api_key'] !== '';
}

/**
 * Calls Red Lava. Returns ['status' => int, 'json' => mixed|null, 'error' => string|null].
 * status 0 means no HTTP response (network error or timeout); the request may still have reached Red Lava.
 */
function redlava_request(string $method, string $path, ?array $body = null, int $timeout = 25): array {
  $cfg = redlava_config();
  $headers = [
    'Accept: application/json',
    'Content-Type: application/json',
    'x-api-key: ' . $cfg['api_key'],
  ];
  if ($cfg['phone_id'] !== '') $headers[] = 'x-phone-id: ' . $cfg['phone_id'];

  $ch = curl_init($cfg['base_url'] . $path);
  curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => $timeout,
  ]);
  if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

  $raw = curl_exec($ch);
  $errno = curl_errno($ch);
  $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
  curl_close($ch);

  if ($raw === false || $errno) {
    $why = [6 => 'could not find the Red Lava server (DNS)', 7 => 'connection refused', 28 => 'timed out waiting for Red Lava',
            35 => 'secure connection failed', 52 => 'Red Lava closed the connection without replying', 56 => 'connection dropped', 60 => 'secure connection failed'];
    return ['status' => 0, 'json' => null, 'error' => 'Network error: ' . ($why[$errno] ?? "cURL error {$errno}") . '.'];
  }

  $json = json_decode((string)$raw, true);
  $error = null;
  if ($status < 200 || $status >= 300) {
    $error = redlava_error_text($status, $json, (string)$raw);
  } elseif (is_array($json) && ($json['success'] ?? null) === false) {
    $error = redlava_error_text($status, $json, (string)$raw);
  }
  return ['status' => $status, 'json' => $json, 'error' => $error];
}

/** Builds a readable error from Red Lava's various error shapes, without echoing credentials. */
function redlava_error_text(int $status, $json, string $raw): string {
  if ($status === 401 || $status === 403) return "Red Lava refused the request ({$status}): check the Red Lava API key and Phone ID.";
  $parts = [];
  if (is_array($json)) {
    $err = is_array($json['error'] ?? null) ? $json['error'] : $json;
    foreach (['title', 'message', 'detail', 'details'] as $k) {
      if (isset($err[$k]) && is_scalar($err[$k]) && trim((string)$err[$k]) !== '') $parts[] = trim((string)$err[$k]);
    }
    if (isset($err['errorData']['details']) && is_scalar($err['errorData']['details'])) $parts[] = (string)$err['errorData']['details'];
    if (isset($json['errors']) && is_array($json['errors'])) $parts[] = json_encode($json['errors'], JSON_UNESCAPED_UNICODE);
  }
  if (!$parts) $parts[] = substr(preg_replace('/\s+/', ' ', strip_tags($raw)), 0, 200) ?: 'No details given';
  $text = "Red Lava error ({$status}): " . implode(' - ', array_unique($parts));
  $key = redlava_config()['api_key'];
  return $key !== '' ? str_replace($key, '[api key]', $text) : $text;
}

/** Pulls template records out of a getTemplates response, whatever wrapper it uses. */
function redlava_extract_templates($json): array {
  if (!is_array($json)) return [];
  $candidates = [$json['results'] ?? null, $json['data']['results'] ?? null, $json['data'] ?? null, $json];
  foreach ($candidates as $c) {
    if (is_array($c) && array_is_list_compat($c)) {
      return array_values(array_filter(array_map(
        fn($r) => is_array($r) && is_array($r['template'] ?? null) ? $r['template'] : $r,
        $c
      ), 'is_array'));
    }
  }
  return [];
}

function array_is_list_compat(array $a): bool {
  return $a === [] || array_keys($a) === range(0, count($a) - 1);
}

/**
 * Lists all templates in the Red Lava account.
 * Returns ['templates' => [ "name|lang" => ['name','language','status','category','reason'] ], 'error' => string|null]
 */
function redlava_list_templates(): array {
  $out = [];
  $seenFirstNames = [];
  $pageSize = 10;
  for ($page = 1; $page <= 50; $page++) {
    $res = redlava_request('POST', '/api/v1/messageTemplate/getTemplates', [
      'pagination' => ['current' => $page, 'pageSize' => $pageSize],
      'order' => [['fieldName' => 'creationTime', 'dir' => 'desc']],
      'search' => [],
    ], 55);
    if ($res['error']) return ['templates' => $out, 'error' => $res['error']];

    $rows = redlava_extract_templates($res['json']);
    $first = $rows ? (string)($rows[0]['name'] ?? '') . '|' . (string)($rows[0]['id'] ?? '') : '';
    if ($first !== '' && isset($seenFirstNames[$first])) break; // page repeated: stop
    $seenFirstNames[$first] = true;

    foreach ($rows as $r) {
      $name = (string)($r['name'] ?? '');
      if ($name === '') continue;
      $lang = $r['language'] ?? '';
      $lang = is_array($lang) ? (string)($lang['code'] ?? '') : (string)$lang;
      $out[$name . '|' . $lang] = [
        'name' => $name,
        'language' => $lang,
        'status' => strtoupper((string)($r['status'] ?? '')),
        'category' => strtoupper((string)($r['category'] ?? '')),
        'reason' => (string)($r['rejectedReason'] ?? $r['rejected_reason'] ?? $r['reason'] ?? ''),
      ];
    }

    $total = $res['json']['total'] ?? $res['json']['metadata']['totalRecords'] ?? null;
    if (count($rows) < $pageSize) break;
    if (is_numeric($total) && $page * $pageSize >= (int)$total) break;
  }
  return ['templates' => $out, 'error' => null];
}

function redlava_create_template(array $requestBody): array {
  return redlava_request('POST', '/api/v1/messageTemplate/create', $requestBody, 25);
}

/** The Siddvin templates (generated by tools/whatsapp_templates.py). */
function siddvin_templates(): array {
  $path = __DIR__ . '/whatsapp_templates.json';
  if (!file_exists($path)) return [];
  $data = json_decode((string)file_get_contents($path), true);
  return is_array($data) ? $data : [];
}
