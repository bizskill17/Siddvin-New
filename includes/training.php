<?php
// Training course: lessons with text and a video (an outside link, or a file uploaded to this website).

const SIDVIN_TRAINING_MEDIA_BASE = 'https://raw.githubusercontent.com/bizskill17/Siddvin-New/training-media/';
const SIDVIN_TRAINING_EXTS = ['mp4', 'webm', 'm4v', 'mov'];

function training_table(PDO $pdo): string {
  static $ready = false;
  $table = sidvin_table_name('training_lessons');
  if (!$ready) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS {$table} (
      id VARCHAR(36) NOT NULL,
      serial_no INT NOT NULL AUTO_INCREMENT,
      data JSON NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      updated_by VARCHAR(255) NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_training_serial_no (serial_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $ready = true;
  }
  return $table;
}

function training_can_edit(array $session): bool {
  return $session['kind'] === 'team' && in_array($session['role'], ['Admin', 'Super Admin'], true);
}

/** Where uploaded training videos are stored: [directory, public URL]. */
function training_upload_dir(): array {
  if (function_exists('wp_upload_dir')) {
    $u = wp_upload_dir(null, false);
    if (empty($u['error'])) return [rtrim($u['basedir'], '/') . '/sidvin-training', rtrim($u['baseurl'], '/') . '/sidvin-training'];
  }
  return [dirname(__DIR__) . '/uploads/sidvin-training', ''];
}

function training_ini_bytes(string $v): int {
  $v = trim($v);
  if ($v === '') return 0;
  $n = (int)$v;
  switch (strtolower(substr($v, -1))) {
    case 'g': $n *= 1024;
    case 'm': $n *= 1024;
    case 'k': $n *= 1024;
  }
  return $n;
}

function training_max_upload(): int {
  $a = training_ini_bytes((string)ini_get('upload_max_filesize'));
  $b = training_ini_bytes((string)ini_get('post_max_size'));
  if ($a <= 0) return $b;
  if ($b <= 0) return $a;
  return min($a, $b);
}

function training_clean_lesson(array $in): array {
  $str = fn($k, $max) => mb_substr(trim((string)($in[$k] ?? '')), 0, $max);
  $out = [
    'module' => $str('module', 120),
    'title' => $str('title', 200),
    'order' => (int)($in['order'] ?? 0),
    'videoUrl' => $str('videoUrl', 600),
    'videoFile' => $str('videoFile', 600),
    'videoFileName' => $str('videoFileName', 200),
    'body' => mb_substr((string)($in['body'] ?? ''), 0, 20000),
  ];
  if ($out['videoUrl'] !== '' && !preg_match('#^https://#i', $out['videoUrl'])) $out['videoUrl'] = '';
  return $out;
}

function training_lessons(PDO $pdo): array {
  $table = training_table($pdo);
  $rows = $pdo->query("SELECT " . GENERIC_COLUMNS . " FROM {$table}")->fetchAll();
  $items = array_map('unpack_generic_row', $rows);
  usort($items, fn($a, $b) => [(int)($a['order'] ?? 0), (int)($a['serialNo'] ?? 0)] <=> [(int)($b['order'] ?? 0), (int)($b['serialNo'] ?? 0)]);
  return $items;
}

/** Deletes a video file only if it is one of ours. */
function training_delete_file(string $url): void {
  [$dir, $base] = training_upload_dir();
  if ($url === '' || $base === '' || strpos($url, $base . '/') !== 0) return;
  $name = basename(substr($url, strlen($base) + 1));
  $path = $dir . '/' . $name;
  if ($name !== '' && is_file($path)) @unlink($path);
}

function training_store_file(string $tmpPath, string $originalName, bool $isUpload): string {
  [$dir, $base] = training_upload_dir();
  if ($base === '') throw new RuntimeException('Uploads are only available inside WordPress.');
  if (!is_dir($dir) && !wp_mkdir_p($dir)) throw new RuntimeException('Could not create the training upload folder.');
  $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
  $stem = preg_replace('/[^A-Za-z0-9_-]+/', '-', pathinfo($originalName, PATHINFO_FILENAME));
  $stem = trim(substr($stem, 0, 60), '-') ?: 'video';
  $name = $stem . '-' . substr(bin2hex(random_bytes(6)), 0, 8) . '.' . $ext;
  $ok = $isUpload ? move_uploaded_file($tmpPath, $dir . '/' . $name) : rename($tmpPath, $dir . '/' . $name);
  if (!$ok) throw new RuntimeException('Could not save the video file.');
  @chmod($dir . '/' . $name, 0644);
  return $base . '/' . $name;
}

function training_handle(PDO $pdo, string $method, string $action, array $body, array $session): void {
  if ($session['kind'] !== 'team') fail(403, 'Not allowed');
  $table = training_table($pdo);
  $canEdit = training_can_edit($session);

  if ($method === 'GET' && $action === 'trainingList') {
    ok(['lessons' => training_lessons($pdo), 'canEdit' => $canEdit, 'maxUpload' => training_max_upload()]);
  }
  if ($method !== 'POST') fail(405, 'Method not allowed');
  if (!$canEdit) fail(403, 'Only Admin or Super Admin can change training lessons.');
  $by = $session['name'];

  if ($action === 'trainingSave') {
    $data = training_clean_lesson((array)($body['data'] ?? []));
    if ($data['title'] === '') fail(400, 'Lesson title is required.');
    $id = trim((string)($body['id'] ?? ''));
    if ($id !== '') {
      $r = fetch_generic($pdo, $table, $id);
      if (!$r) fail(404, 'Lesson not found.');
      $old = json_decode($r['data'] ?? '{}', true) ?: [];
      if (($old['videoFile'] ?? '') !== '' && ($old['videoFile'] ?? '') !== $data['videoFile']) training_delete_file((string)$old['videoFile']);
      $merged = array_merge($old, $data, ['id' => $id, 'updatedBy' => $by, 'updatedAt' => now_iso()]);
      $pdo->prepare("UPDATE {$table} SET data = ?, updated_by = ? WHERE id = ?")->execute([json_encode($merged, JSON_UNESCAPED_UNICODE), $by, $id]);
    } else {
      $id = uuid_v4();
      $data += ['id' => $id, 'updatedBy' => $by, 'updatedAt' => now_iso()];
      $pdo->prepare("INSERT INTO {$table} (id, data, updated_by) VALUES (?, ?, ?)")->execute([$id, json_encode($data, JSON_UNESCAPED_UNICODE), $by]);
    }
    $r = fetch_generic($pdo, $table, $id);
    ok(unpack_generic_row($r));
  }

  if ($action === 'trainingDelete') {
    $id = trim((string)($body['id'] ?? ''));
    $r = $id !== '' ? fetch_generic($pdo, $table, $id) : null;
    if (!$r) fail(404, 'Lesson not found.');
    $old = json_decode($r['data'] ?? '{}', true) ?: [];
    training_delete_file((string)($old['videoFile'] ?? ''));
    $pdo->prepare("DELETE FROM {$table} WHERE id = ?")->execute([$id]);
    ok(true);
  }

  if ($action === 'trainingUpload') {
    $f = $_FILES['video'] ?? null;
    if (!$f || ($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
      $code = $f['error'] ?? UPLOAD_ERR_NO_FILE;
      fail(400, in_array($code, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true) ? 'The video is larger than this website allows (' . round(training_max_upload() / 1048576) . ' MB).' : 'No video was received. Please try again.');
    }
    $ext = strtolower(pathinfo((string)$f['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, SIDVIN_TRAINING_EXTS, true)) fail(400, 'Please upload an MP4, WebM, M4V or MOV video.');
    $url = training_store_file((string)$f['tmp_name'], (string)$f['name'], true);
    ok(['url' => $url, 'name' => (string)$f['name']]);
  }

  // Creates the standard Siddvin course (lesson text only). Videos are then fetched one by one with trainingImportVideo.
  if ($action === 'trainingSeed') {
    if (training_lessons($pdo)) fail(400, 'The course already has lessons.');
    $seed = json_decode((string)@file_get_contents(__DIR__ . '/training_seed.json'), true);
    if (!is_array($seed)) fail(500, 'The standard course file is missing.');
    foreach ($seed as $s) {
      $data = training_clean_lesson($s) + ['videoSource' => (string)($s['videoSource'] ?? '')];
      $id = uuid_v4();
      $data += ['id' => $id, 'updatedBy' => $by, 'updatedAt' => now_iso()];
      $pdo->prepare("INSERT INTO {$table} (id, data, updated_by) VALUES (?, ?, ?)")->execute([$id, json_encode($data, JSON_UNESCAPED_UNICODE), $by]);
    }
    ok(['lessons' => training_lessons($pdo)]);
  }

  if ($action === 'trainingImportVideo') {
    $id = trim((string)($body['id'] ?? ''));
    $r = $id !== '' ? fetch_generic($pdo, $table, $id) : null;
    if (!$r) fail(404, 'Lesson not found.');
    $data = json_decode($r['data'] ?? '{}', true) ?: [];
    $src = (string)($data['videoSource'] ?? '');
    if (!preg_match('/^[0-9A-Za-z_-]+\.mp4$/', $src)) fail(400, 'This lesson has no standard video.');
    if (!function_exists('curl_init')) fail(500, 'This server cannot download files (cURL is missing).');
    [$dir] = training_upload_dir();
    if (!is_dir($dir) && !wp_mkdir_p($dir)) fail(500, 'Could not create the training upload folder.');
    $tmp = $dir . '/.import-' . bin2hex(random_bytes(6));
    $fh = fopen($tmp, 'wb');
    $ch = curl_init(SIDVIN_TRAINING_MEDIA_BASE . rawurlencode($src));
    curl_setopt_array($ch, [CURLOPT_FILE => $fh, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 240, CURLOPT_CONNECTTIMEOUT => 20, CURLOPT_FAILONERROR => true]);
    $okDl = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);
    fclose($fh);
    if (!$okDl || filesize($tmp) < 10000) { @unlink($tmp); fail(502, 'Could not download the video' . ($err ? ": {$err}" : '.')); }
    $url = training_store_file($tmp, $src, false);
    if (($data['videoFile'] ?? '') !== '') training_delete_file((string)$data['videoFile']);
    $data['videoFile'] = $url;
    $data['videoFileName'] = $src;
    $data['updatedBy'] = $by;
    $data['updatedAt'] = now_iso();
    $pdo->prepare("UPDATE {$table} SET data = ?, updated_by = ? WHERE id = ?")->execute([json_encode($data, JSON_UNESCAPED_UNICODE), $by, $id]);
    ok(unpack_generic_row(fetch_generic($pdo, $table, $id)));
  }

  fail(400, "Unsupported action: {$action}");
}
