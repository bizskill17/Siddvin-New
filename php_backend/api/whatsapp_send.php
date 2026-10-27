<?php

// Sending Siddvin WhatsApp messages through Red Lava.
//
// Each "event" (e.g. a property was registered) maps to one approved template. The server builds the
// recipients and placeholder values from the saved record, so the browser can't send arbitrary text.
// Every message is logged in wa_messages before it is sent.

function ensure_wa_messages_table(PDO $pdo): void {
  $pdo->exec(
    "CREATE TABLE IF NOT EXISTS wa_messages (
      id VARCHAR(36) NOT NULL,
      request_key VARCHAR(64) NOT NULL,
      event VARCHAR(64) NOT NULL,
      entity_id VARCHAR(36) NOT NULL,
      template VARCHAR(128) NOT NULL,
      to_number VARCHAR(20) NOT NULL,
      recipient_name VARCHAR(255) NULL,
      variables TEXT NOT NULL,
      user_message_id VARCHAR(64) NOT NULL,
      status VARCHAR(20) NOT NULL,
      provider_id VARCHAR(128) NULL,
      error TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by VARCHAR(255) NULL,
      PRIMARY KEY (id),
      KEY idx_wa_messages_request (request_key, to_number),
      KEY idx_wa_messages_entity (entity_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
  );
}

/** Digits with country code (India by default), or '' if it isn't a usable mobile number. */
function wa_normalize_mobile(string $raw): string {
  $d = preg_replace('/\D+/', '', $raw);
  if (strlen($d) === 11 && $d[0] === '0') $d = substr($d, 1);
  if (strlen($d) === 10) $d = '91' . $d;
  return preg_match('/^[1-9]\d{7,14}$/', $d) ? $d : '';
}

/** dd/mm/yyyy for any of the date formats the app stores. */
function wa_format_date($value): string {
  $v = trim((string)$value);
  if ($v === '') return '';
  if (preg_match('/^\d{2}\/\d{2}\/\d{4}$/', $v)) return $v;
  if (preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $v, $m)) return "{$m[3]}/{$m[2]}/{$m[1]}";
  $ts = strtotime($v);
  return $ts ? date('d/m/Y', $ts) : $v;
}

/** A placeholder value Meta will accept: single line, no tabs or long space runs. */
function wa_clean_value($value): string {
  $v = preg_replace('/\s+/', ' ', trim((string)$value));
  return $v;
}

function wa_load_generic(PDO $pdo, string $table, string $id): ?array {
  $stmt = $pdo->prepare("SELECT data FROM {$table} WHERE id = ? LIMIT 1");
  $stmt->execute([$id]);
  $row = $stmt->fetch();
  if (!$row) return null;
  $data = json_decode($row['data'] ?? '{}', true);
  return is_array($data) ? $data : null;
}

/**
 * Builds the messages for an event without sending anything.
 * Returns ['template', 'language', 'recipients' => [['name','mobile','to','variables']], 'missing' => [labels], 'skipped' => [reasons]]
 */
function wa_build_event(PDO $pdo, string $event, string $entityId): array {
  switch ($event) {
    case 'property_registration':
      $p = wa_load_generic($pdo, 'properties', $entityId);
      if (!$p) fail(404, 'Property not found.');
      $vars = [wa_clean_value($p['address'] ?? ''), wa_format_date($p['siteVisitDate'] ?? '')];
      $missing = [];
      if ($vars[0] === '') $missing[] = 'Property address';
      if ($vars[1] === '') $missing[] = 'Site visit date';
      $contacts = $p['contactPersonsJson'] ?? $p['contactPersons'] ?? [];
      $template = 'sidvin_property_registration';
      break;
    default:
      fail(400, 'Unknown WhatsApp event.');
  }

  $recipients = [];
  $skipped = [];
  $seen = [];
  foreach (is_array($contacts) ? $contacts : [] as $c) {
    if (!is_array($c)) continue;
    $name = trim((string)($c['name'] ?? ''));
    $to = wa_normalize_mobile((string)($c['mobile'] ?? ''));
    if ($to === '') { $skipped[] = ($name ?: 'A contact') . ': no valid mobile number'; continue; }
    if (isset($seen[$to])) continue;
    $seen[$to] = true;
    $recipients[] = ['name' => $name, 'mobile' => (string)($c['mobile'] ?? ''), 'to' => $to, 'variables' => $vars];
  }
  return ['template' => $template, 'language' => 'en', 'recipients' => $recipients, 'missing' => $missing, 'skipped' => $skipped];
}

/** Sends an event's messages. Never resends to a number already tried under the same request key. */
function wa_send_event(PDO $pdo, string $event, string $entityId, string $requestKey, string $by): array {
  if (!redlava_configured()) fail(400, 'Red Lava is not connected. Connect it on the WhatsApp Templates page.');
  $built = wa_build_event($pdo, $event, $entityId);
  if ($built['missing']) fail(400, 'Cannot send yet. Missing: ' . implode(', ', $built['missing']) . '.');
  if (!$built['recipients']) fail(400, 'No contact person has a valid mobile number.');

  $list = redlava_list_templates();
  if ($list['error']) fail(502, 'Could not check the template with Red Lava. ' . $list['error']);
  $remote = $list['templates'][$built['template'] . '|' . $built['language']] ?? null;
  if (!$remote || $remote['status'] !== 'APPROVED') {
    fail(400, "The WhatsApp template {$built['template']} is not approved by Meta yet (status: " . ($remote['status'] ?? 'not submitted') . ').');
  }

  ensure_wa_messages_table($pdo);
  $results = [];
  foreach ($built['recipients'] as $r) {
    $dup = $pdo->prepare("SELECT status FROM wa_messages WHERE request_key = ? AND to_number = ? LIMIT 1");
    $dup->execute([$requestKey, $r['to']]);
    if ($prev = $dup->fetch()) {
      $results[] = ['name' => $r['name'], 'to' => $r['to'], 'status' => $prev['status'], 'note' => 'Already sent for this request.'];
      continue;
    }

    $id = uuid_v4();
    $userMessageId = 'sdv-' . bin2hex(random_bytes(12));
    $pdo->prepare(
      "INSERT INTO wa_messages (id, request_key, event, entity_id, template, to_number, recipient_name, variables, user_message_id, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)"
    )->execute([$id, $requestKey, $event, $entityId, $built['template'], $r['to'], $r['name'],
                json_encode($r['variables'], JSON_UNESCAPED_UNICODE), $userMessageId, $by]);

    $res = redlava_request('POST', '/api/v1/whatsapp/sendMessage', [
      'templateName' => $built['template'],
      'language' => $built['language'],
      'to' => $r['to'],
      'templateVariables' => $r['variables'],
      'userMessageId' => $userMessageId,
    ], 25);

    $providerId = null;
    if ($res['status'] === 0) {
      $status = 'unknown';
      $error = $res['error'] . ' The message may still have been sent; check Red Lava reports before resending.';
    } elseif ($res['error']) {
      $status = 'failed';
      $error = $res['error'];
    } else {
      $j = is_array($res['json']) ? $res['json'] : [];
      $providerId = (string)($j['id'] ?? $j['waMessageId'] ?? $j['data']['id'] ?? '');
      $confirmed = $providerId !== '' || isset($j['userMessageId']) || isset($j['waMessageId']);
      $status = $confirmed ? 'accepted' : 'unknown';
      $error = $confirmed ? null : 'Red Lava replied without a message id; check Red Lava reports.';
    }
    $pdo->prepare("UPDATE wa_messages SET status = ?, provider_id = ?, error = ? WHERE id = ?")
        ->execute([$status, $providerId ?: null, $error, $id]);
    $results[] = ['name' => $r['name'], 'to' => $r['to'], 'status' => $status, 'note' => $error];
  }
  return ['template' => $built['template'], 'results' => $results, 'skipped' => $built['skipped']];
}
