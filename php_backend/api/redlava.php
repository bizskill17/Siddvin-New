<?php

// Minimal Red Lava (wa.redlava.in) WhatsApp API client.
// Credentials live only in api/config.php on the server:
//   'redlava' => ['api_key' => '...', 'phone_id' => '...'],

function redlava_config(): array {
  static $cfg = null;
  if ($cfg !== null) return $cfg;
  $path = __DIR__ . '/config.php';
  $all = file_exists($path) ? (require $path) : [];
  $rl = is_array($all['redlava'] ?? null) ? $all['redlava'] : [];
  $cfg = [
    'api_key' => trim((string)($rl['api_key'] ?? '')),
    'phone_id' => trim((string)($rl['phone_id'] ?? '')),
    'base_url' => rtrim(trim((string)($rl['base_url'] ?? 'https://wa.redlava.in')), '/'),
  ];
  return $cfg;
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
  if ($status === 401 || $status === 403) return "Red Lava refused the request ({$status}): check the API key and Phone ID in api/config.php.";
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
