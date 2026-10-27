<?php

// Sending Siddvin WhatsApp messages through Red Lava.
//
// Each event (a property registered, a visit scheduled, ...) has a property side and/or a brand side,
// each tied to one approved template. The server builds recipients and placeholder values itself,
// from unsaved form data (preview) or from the saved record (send), with the same code, so the
// browser can never send arbitrary text. Every message is logged in wa_messages before it is sent.

function ensure_wa_messages_table(PDO $pdo): void {
  $pdo->exec(
    "CREATE TABLE IF NOT EXISTS wa_messages (
      id VARCHAR(36) NOT NULL,
      request_key VARCHAR(80) NOT NULL,
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

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

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

/** "16:30" -> "4:30 PM". */
function wa_format_time($value): string {
  $v = trim((string)$value);
  if (!preg_match('/^(\d{1,2}):(\d{2})/', $v, $m)) return $v;
  $h = (int)$m[1];
  return (($h % 12) ?: 12) . ':' . $m[2] . ($h < 12 ? ' AM' : ' PM');
}

/** A placeholder value Meta will accept: one line, no tabs or long runs of spaces. */
function wa_clean($value): string {
  return trim(preg_replace('/\s+/', ' ', (string)$value));
}

/** "Mr. Rajesh Kumar" / "Ms. ..." from a contact's Sir/Madam salutation. */
function wa_titled_name(array $c): string {
  $name = wa_clean($c['name'] ?? '');
  if ($name === '') return '';
  $sal = strtolower(trim((string)($c['salutation'] ?? '')));
  if ($sal === 'sir') return 'Mr. ' . $name;
  if ($sal === 'madam') return 'Ms. ' . $name;
  return $name;
}

function wa_contacts(?array $rec): array {
  if (!$rec) return [];
  $list = $rec['contactPersons'] ?? $rec['contactPersonsJson'] ?? [];
  return array_values(array_filter(is_array($list) ? $list : [], 'is_array'));
}

function wa_load(PDO $pdo, string $table, string $id): ?array {
  if ($id === '') return null;
  $stmt = $pdo->prepare("SELECT data FROM {$table} WHERE id = ? LIMIT 1");
  $stmt->execute([$id]);
  $row = $stmt->fetch();
  if (!$row) return null;
  $data = json_decode($row['data'] ?? '{}', true);
  if (!is_array($data)) return null;
  $data['id'] = $data['id'] ?? $id;
  return $data;
}

function wa_portal_link(): string {
  $host = preg_replace('/[^A-Za-z0-9.:-]/', '', (string)($_SERVER['HTTP_HOST'] ?? 'proposal.bizskilledu.com'));
  return 'https://' . $host;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** Where each event's saved record lives (used when sending). */
function wa_event_table(string $event): array {
  $map = [
    'property_registration' => ['properties', 'id'],
    'brand_registration' => ['brands', 'id'],
    'proposal_sent' => ['proposals', 'id'],
    'visit_scheduled' => ['visits', 'id'],
    'visit_completed' => ['visits', 'id'],
    'follow_up_meeting' => ['follow_ups', 'id'],
    'terms_meeting' => ['term_sheets', 'proposal_id'],
    'deal_closed' => ['proposals', 'id'],
  ];
  if (!isset($map[$event])) fail(400, 'Unknown WhatsApp event.');
  return $map[$event];
}

function wa_load_record(PDO $pdo, string $event, string $entityId): array {
  [$table, $key] = wa_event_table($event);
  if ($key === 'proposal_id') {
    $stmt = $pdo->prepare("SELECT data FROM {$table} WHERE proposal_id = ? LIMIT 1");
    $stmt->execute([$entityId]);
    $row = $stmt->fetch();
    $rec = $row ? json_decode($row['data'] ?? '{}', true) : null;
    if (is_array($rec)) $rec['proposalId'] = $rec['proposalId'] ?? $entityId;
  } else {
    $rec = wa_load($pdo, $table, $entityId);
  }
  if (!is_array($rec)) fail(404, 'Record not found.');
  return $rec;
}

/**
 * Builds the sides of an event from a record (saved or still being entered).
 * Each side: ['side','label','template','recipients' => [['name','mobile','to','variables']],'missing','skipped']
 */
function wa_build_sides(PDO $pdo, string $event, array $rec): array {
  // Resolve the property, brand and proposal involved.
  $proposal = null;
  if (in_array($event, ['visit_scheduled', 'visit_completed', 'follow_up_meeting', 'terms_meeting'], true)) {
    $proposal = wa_load($pdo, 'proposals', (string)($rec['proposalId'] ?? ''));
    if (!$proposal) fail(404, 'Proposal not found.');
  } elseif (in_array($event, ['proposal_sent', 'deal_closed'], true)) {
    $proposal = $rec;
  }
  $property = $event === 'property_registration' ? $rec : ($proposal ? wa_load($pdo, 'properties', (string)($proposal['propertyId'] ?? '')) : null);
  $brand = $event === 'brand_registration' ? $rec : ($proposal ? wa_load($pdo, 'brands', (string)($proposal['brandId'] ?? '')) : null);

  $address = wa_clean($property['address'] ?? '');
  $brandName = wa_clean($brand['name'] ?? '');
  $company = wa_clean($brand['companyName'] ?? '');
  $propContacts = wa_contacts($property);
  $brandContacts = wa_contacts($brand);
  $owner = $propContacts[0] ?? [];
  $ownerTitled = wa_titled_name($owner);
  $ownerPlain = wa_clean($owner['name'] ?? '');
  $brandPerson = wa_clean(($brandContacts[0] ?? [])['name'] ?? '');

  // Per-side placeholder values: [label => value]; a closure for brand sides, which differ per contact.
  $P = 'property';
  $B = 'brand';
  $sides = [];
  $brandDear = fn(array $c) => ['Brand contact name' => wa_titled_name($c), 'Brand name' => $brandName, 'Company name' => $company];

  switch ($event) {
    case 'property_registration':
      $sides[] = [$P, 'sidvin_property_registration', fn($c) => ['Property address' => $address, 'Site visit date' => wa_format_date($rec['siteVisitDate'] ?? '')]];
      break;

    case 'brand_registration':
      $sides[] = [$B, 'sidvin_brand_registration', fn($c) => $brandDear($c) + ['Contact designation' => wa_clean($c['designation'] ?? '')]];
      break;

    case 'proposal_sent':
      $date = wa_format_date($rec['proposalDate'] ?? '');
      $sides[] = [$P, 'sidvin_proposal_property', fn($c) => ['Property address' => $address, 'Brand name' => $brandName, 'Company name' => $company,
        'Proposal date' => $date, 'Brand name ' => $brandName, 'Company name ' => $company, 'Tracking link' => wa_portal_link()]];
      $sides[] = [$B, 'sidvin_proposal_brand', fn($c) => $brandDear($c) + ['Contact designation' => wa_clean($c['designation'] ?? ''),
        'Property address' => $address, 'Property owner name' => $ownerTitled]];
      break;

    case 'visit_scheduled':
      $date = wa_format_date($rec['scheduledDate'] ?? '');
      $time = wa_format_time($rec['scheduledTime'] ?? '');
      if (($rec['meetingType'] ?? '') === 'Virtual') {
        $link = wa_clean($rec['meetingLink'] ?? '');
        $sides[] = [$P, 'sidvin_virtual_meeting_property', fn($c) => ['Property address' => $address, 'Brand contact name' => $brandPerson,
          'Brand name' => $brandName, 'Meeting date' => $date, 'Meeting time' => $time, 'Meeting link' => $link]];
        $sides[] = [$B, 'sidvin_virtual_meeting_brand', fn($c) => $brandDear($c) + ['Property owner name' => $ownerPlain,
          'Property address' => $address, 'Meeting date' => $date, 'Meeting time' => $time, 'Meeting link' => $link]];
      } else {
        $when = trim($date . ($time !== '' ? ' ' . $time : ''));
        $sides[] = [$P, 'sidvin_visit_scheduled_property', fn($c) => ['Property address' => $address, 'Visit date' => $when,
          'Brand name' => $brandName, 'Company name' => $company]];
        $sides[] = [$B, 'sidvin_visit_scheduled_brand', fn($c) => $brandDear($c) + ['Property address' => $address,
          'Property owner name' => $ownerTitled, 'Visit date' => $when]];
      }
      break;

    case 'visit_completed':
      $date = wa_format_date($rec['visitDate'] ?? '');
      $sides[] = [$P, 'sidvin_visit_completed_property', fn($c) => ['Property address' => $address, 'Brand name' => $brandName,
        'Company name' => $company, 'Visit date' => $date, 'Developer attendees' => wa_clean($rec['developerAttendees'] ?? '')]];
      $sides[] = [$B, 'sidvin_visit_completed_brand', fn($c) => $brandDear($c) + ['Property address' => $address, 'Property owner name' => $ownerTitled]];
      break;

    case 'follow_up_meeting':
      $date = wa_format_date($rec['nextFollowUpDate'] ?? '');
      $time = wa_format_time($rec['nextFollowUpTime'] ?? '');
      $sides[] = [$P, 'sidvin_meeting_property', fn($c) => ['Property address' => $address, 'Brand contact name' => $brandPerson,
        'Brand name' => $brandName, 'Company name' => $company, 'Meeting date' => $date, 'Meeting time' => $time]];
      $sides[] = [$B, 'sidvin_meeting_brand', fn($c) => $brandDear($c) + ['Property owner name' => $ownerPlain,
        'Property address' => $address, 'Meeting date' => $date, 'Meeting time' => $time]];
      break;

    case 'terms_meeting':
      $date = wa_format_date($rec['termsMeetingDate'] ?? '');
      $time = wa_format_time($rec['termsMeetingTime'] ?? '');
      $sides[] = [$P, 'sidvin_terms_meeting_property', fn($c) => ['Property address' => $address, 'Brand contact name' => $brandPerson,
        'Brand name' => $brandName, 'Company name' => $company, 'Meeting date' => $date, 'Meeting time' => $time]];
      $sides[] = [$B, 'sidvin_terms_meeting_brand', fn($c) => $brandDear($c) + ['Property owner name' => $ownerTitled,
        'Property address' => $address, 'Meeting date' => $date, 'Meeting time' => $time]];
      break;

    case 'deal_closed':
      $sides[] = [$P, 'sidvin_deal_closed_property', fn($c) => ['Property address' => $address, 'Brand name' => $brandName, 'Company name' => $company]];
      $sides[] = [$B, 'sidvin_deal_closed_brand', fn($c) => $brandDear($c)];
      break;

    default:
      fail(400, 'Unknown WhatsApp event.');
  }

  $out = [];
  foreach ($sides as [$side, $template, $valuesFor]) {
    $contacts = $side === $P ? $propContacts : $brandContacts;
    $recipients = [];
    $skipped = [];
    $missing = [];
    $seen = [];
    foreach ($contacts as $c) {
      $name = wa_clean($c['name'] ?? '');
      $to = wa_normalize_mobile((string)($c['mobile'] ?? ''));
      if ($to === '') { $skipped[] = ($name ?: 'A contact') . ': no valid mobile number'; continue; }
      if (isset($seen[$to])) continue;
      $seen[$to] = true;
      $values = $valuesFor($c);
      foreach ($values as $label => $v) if ($v === '') $missing[trim($label)] = true;
      $recipients[] = ['name' => $name, 'mobile' => (string)($c['mobile'] ?? ''), 'to' => $to, 'variables' => array_values($values)];
    }
    if (!$contacts) $skipped[] = $side === $P ? 'The property has no contact persons' : 'The brand has no contact persons';
    $out[] = [
      'side' => $side,
      'label' => $side === $P ? 'Property contacts' : 'Brand contacts',
      'template' => $template,
      'recipients' => $recipients,
      'missing' => array_keys($missing),
      'skipped' => $skipped,
    ];
  }
  return $out;
}

/** Approval status of every Siddvin template in Red Lava (one call per request). */
function wa_remote_statuses(): array {
  static $cache = null;
  if ($cache !== null) return $cache;
  if (!redlava_configured()) return $cache = ['error' => 'Red Lava is not connected (Master → WhatsApp Templates).', 'templates' => []];
  $list = redlava_list_templates();
  return $cache = ['error' => $list['error'] ? 'Could not check templates with Red Lava. ' . $list['error'] : null, 'templates' => $list['templates']];
}

function wa_template_body(string $name): string {
  foreach (siddvin_templates() as $t) {
    if (($t['request']['name'] ?? '') !== $name) continue;
    foreach ($t['request']['components'] ?? [] as $c) if (($c['type'] ?? '') === 'BODY') return (string)($c['text'] ?? '');
  }
  return '';
}

/** Why a side can't be sent right now, or '' if it can. */
function wa_side_blocked_reason(array $side): string {
  $remote = wa_remote_statuses();
  if ($remote['error']) return $remote['error'];
  $status = $remote['templates'][$side['template'] . '|en']['status'] ?? '';
  if ($status !== 'APPROVED') return 'The template ' . $side['template'] . ' is not approved by Meta yet (status: ' . ($status !== '' ? strtolower($status) : 'not submitted') . ').';
  if ($side['missing']) return 'Missing: ' . implode(', ', $side['missing']) . '.';
  if (!$side['recipients']) return 'No contact has a valid mobile number.';
  return '';
}

/** Preview for the confirmation popup, from data not yet saved. Nothing is sent. */
function wa_preview(PDO $pdo, string $event, array $record): array {
  wa_event_table($event); // validates the event name
  $out = [];
  foreach (wa_build_sides($pdo, $event, $record) as $side) {
    $body = wa_template_body($side['template']);
    $recipients = array_map(function ($r) use ($body) {
      $text = preg_replace_callback('/\{\{(\d+)\}\}/', fn($m) => $r['variables'][(int)$m[1] - 1] ?? $m[0], $body);
      return ['name' => $r['name'], 'mobile' => $r['mobile'], 'to' => $r['to'], 'text' => $text];
    }, $side['recipients']);
    $reason = wa_side_blocked_reason($side);
    $out[] = [
      'side' => $side['side'],
      'label' => $side['label'],
      'template' => $side['template'],
      'canSend' => $reason === '',
      'blockedReason' => $reason,
      'recipients' => $recipients,
      'skipped' => $side['skipped'],
    ];
  }
  return ['event' => $event, 'sides' => $out];
}

/** Sends the chosen sides of an event for a saved record. Never resends under the same request key. */
function wa_send_event(PDO $pdo, string $event, string $entityId, array $wantSides, string $requestKey, string $by): array {
  $record = wa_load_record($pdo, $event, $entityId);
  ensure_wa_messages_table($pdo);
  $report = [];
  foreach (wa_build_sides($pdo, $event, $record) as $side) {
    if (!in_array($side['side'], $wantSides, true)) continue;
    $reason = wa_side_blocked_reason($side);
    $entry = ['side' => $side['side'], 'label' => $side['label'], 'template' => $side['template'], 'error' => $reason ?: null, 'results' => [], 'skipped' => $side['skipped']];
    if ($reason) { $report[] = $entry; continue; }

    $key = substr($requestKey, 0, 70) . '-' . $side['side'];
    foreach ($side['recipients'] as $r) {
      $dup = $pdo->prepare("SELECT status FROM wa_messages WHERE request_key = ? AND to_number = ? LIMIT 1");
      $dup->execute([$key, $r['to']]);
      if ($prev = $dup->fetch()) {
        $entry['results'][] = ['name' => $r['name'], 'to' => $r['to'], 'status' => $prev['status'], 'note' => 'Already sent for this save.'];
        continue;
      }
      $id = uuid_v4();
      $userMessageId = 'sdv-' . bin2hex(random_bytes(12));
      $pdo->prepare(
        "INSERT INTO wa_messages (id, request_key, event, entity_id, template, to_number, recipient_name, variables, user_message_id, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)"
      )->execute([$id, $key, $event, $entityId, $side['template'], $r['to'], $r['name'],
                  json_encode($r['variables'], JSON_UNESCAPED_UNICODE), $userMessageId, $by]);

      $res = redlava_request('POST', '/api/v1/whatsapp/sendMessage', [
        'templateName' => $side['template'],
        'language' => 'en',
        'to' => $r['to'],
        'templateVariables' => $r['variables'],
        'userMessageId' => $userMessageId,
      ], 25);

      $providerId = null;
      if ($res['status'] === 0) {
        $status = 'unknown';
        $error = $res['error'] . ' It may still have been sent; check Red Lava reports before resending.';
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
      $entry['results'][] = ['name' => $r['name'], 'to' => $r['to'], 'status' => $status, 'note' => $error];
    }
    $report[] = $entry;
  }
  return ['event' => $event, 'sides' => $report];
}
