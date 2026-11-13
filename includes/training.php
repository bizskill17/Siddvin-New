<?php
// Training course: lessons with text and a video (an outside link, or a file uploaded to this website).

const SIDVIN_TRAINING_MEDIA_BASE = 'https://raw.githubusercontent.com/bizskill17/Siddvin-New/training-media/';
const SIDVIN_TRAINING_EXTS = ['mp4', 'webm', 'm4v', 'mov'];
const SIDVIN_TRAINING_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp'];

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

function training_progress_table(PDO $pdo): string {
  static $ready = false;
  $table = sidvin_table_name('training_progress');
  if (!$ready) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS {$table} (
      user_id VARCHAR(36) NOT NULL,
      lesson_id VARCHAR(36) NOT NULL,
      data JSON NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, lesson_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $ready = true;
  }
  return $table;
}

/** Progress rows for one user (or everyone), keyed [userId][lessonId]. */
function training_progress_rows(PDO $pdo, ?string $userId = null): array {
  $table = training_progress_table($pdo);
  if ($userId !== null) {
    $stmt = $pdo->prepare("SELECT user_id, lesson_id, data FROM {$table} WHERE user_id = ?");
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();
  } else {
    $rows = $pdo->query("SELECT user_id, lesson_id, data FROM {$table}")->fetchAll();
  }
  $out = [];
  foreach ($rows as $r) {
    $d = json_decode((string)$r['data'], true) ?: [];
    unset($d['ranges']);
    $out[$r['user_id']][$r['lesson_id']] = $d;
  }
  return $out;
}

/** Merges [start, end] second ranges and returns [merged, total seconds]. */
function training_merge_ranges(array $ranges, float $duration): array {
  $clean = [];
  foreach (array_slice($ranges, 0, 400) as $r) {
    if (!is_array($r) || count($r) < 2) continue;
    $a = max(0.0, (float)$r[0]);
    $b = (float)$r[1];
    if ($duration > 0) $b = min($b, $duration);
    if ($b - $a > 0.05) $clean[] = [$a, $b];
  }
  usort($clean, fn($x, $y) => $x[0] <=> $y[0]);
  $merged = [];
  foreach ($clean as $r) {
    $n = count($merged);
    if ($n && $r[0] <= $merged[$n - 1][1] + 1.0) $merged[$n - 1][1] = max($merged[$n - 1][1], $r[1]);
    else $merged[] = $r;
  }
  $total = 0.0;
  foreach ($merged as $r) $total += $r[1] - $r[0];
  return [array_map(fn($r) => [round($r[0], 2), round($r[1], 2)], $merged), round($total, 2)];
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
    'thumbnail' => $str('thumbnail', 600),
    'thumbnailName' => $str('thumbnailName', 200),
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

/** Downloads one file from the training-media branch into the upload folder and returns its URL. */
function training_fetch_media(string $src): string {
  if (!preg_match('/^[0-9A-Za-z_-]+\.(mp4|jpg)$/', $src)) throw new RuntimeException('Not a standard training file.');
  if (!function_exists('curl_init')) throw new RuntimeException('This server cannot download files (cURL is missing).');
  [$dir] = training_upload_dir();
  if (!is_dir($dir) && !wp_mkdir_p($dir)) throw new RuntimeException('Could not create the training upload folder.');
  $tmp = $dir . '/.import-' . bin2hex(random_bytes(6));
  $fh = fopen($tmp, 'wb');
  $ch = curl_init(SIDVIN_TRAINING_MEDIA_BASE . rawurlencode($src));
  curl_setopt_array($ch, [CURLOPT_FILE => $fh, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 240, CURLOPT_CONNECTTIMEOUT => 20, CURLOPT_FAILONERROR => true]);
  $okDl = curl_exec($ch);
  $err = curl_error($ch);
  curl_close($ch);
  fclose($fh);
  if (!$okDl || filesize($tmp) < 2000) { @unlink($tmp); throw new RuntimeException('Could not download ' . $src . ($err ? ": {$err}" : '.')); }
  return training_store_file($tmp, $src, false);
}

function training_handle(PDO $pdo, string $method, string $action, array $body, array $session): void {
  if ($session['kind'] !== 'team') fail(403, 'Not allowed');
  $table = training_table($pdo);
  $canEdit = training_can_edit($session);

  if ($method === 'GET' && $action === 'trainingList') {
    ok(['lessons' => training_lessons($pdo), 'canEdit' => $canEdit, 'maxUpload' => training_max_upload(), 'progress' => (object)(training_progress_rows($pdo, $session['id'])[$session['id']] ?? [])]);
  }

  // ---- Training scoreboard (Admin / Super Admin) ----
  if ($method === 'GET' && $action === 'trainingScoreboard') {
    if (!$canEdit) fail(403, 'Only Admin or Super Admin can see the training scoreboard.');
    $lessons = array_map(fn($l) => ['id' => $l['id'], 'title' => $l['title'] ?? '', 'module' => $l['module'] ?? '', 'tracked' => (($l['videoUrl'] ?? '') === '' && ($l['videoFile'] ?? '') !== '')], training_lessons($pdo));
    $team = array_map('unpack_generic_row', $pdo->query("SELECT " . GENERIC_COLUMNS . " FROM " . sidvin_table_name('sidvin_team'))->fetchAll());
    $progress = training_progress_rows($pdo);
    $users = [];
    foreach ($team as $m) {
      $users[] = ['id' => $m['id'], 'name' => $m['name'] ?? '', 'role' => $m['role'] ?? '', 'designation' => $m['designation'] ?? '', 'email' => $m['email'] ?? '', 'progress' => (object)($progress[$m['id']] ?? [])];
    }
    usort($users, fn($a, $b) => strcasecmp($a['name'], $b['name']));
    ok(['lessons' => $lessons, 'users' => $users]);
  }

  // ---- Watching progress (every team member, for themselves only) ----
  if ($method === 'POST' && ($action === 'trainingProgress' || $action === 'trainingMark')) {
    $lessonId = trim((string)($body['lessonId'] ?? ''));
    $lr = $lessonId !== '' ? fetch_generic($pdo, $table, $lessonId) : null;
    if (!$lr) fail(404, 'Lesson not found.');
    $lesson = json_decode($lr['data'] ?? '{}', true) ?: [];
    $tracked = ($lesson['videoUrl'] ?? '') === '' && ($lesson['videoFile'] ?? '') !== '';
    $ptable = training_progress_table($pdo);
    $stmt = $pdo->prepare("SELECT data FROM {$ptable} WHERE user_id = ? AND lesson_id = ?");
    $stmt->execute([$session['id'], $lessonId]);
    $cur = json_decode((string)($stmt->fetchColumn() ?: '{}'), true) ?: [];
    $now = now_iso();
    if ($action === 'trainingMark') {
      if ($tracked) fail(400, 'This lesson is completed by watching the full video.');
      $doneNow = !empty($body['done']);
      $cur['completed'] = $doneNow;
      $cur['manual'] = true;
      $cur['completedAt'] = $doneNow ? ($cur['completedAt'] ?? $now) : null;
    } else {
      $duration = max((float)($cur['duration'] ?? 0), min(36000.0, (float)($body['duration'] ?? 0)));
      [$merged, $watched] = training_merge_ranges(array_merge((array)($cur['ranges'] ?? []), (array)($body['ranges'] ?? [])), $duration);
      $cur['ranges'] = $merged;
      $cur['duration'] = round($duration, 2);
      $cur['watched'] = $watched;
      $cur['furthest'] = round(max((float)($cur['furthest'] ?? 0), min($duration ?: 36000.0, (float)($body['furthest'] ?? 0))), 2);
      if ($tracked && $duration > 0 && $watched >= $duration * 0.95 && empty($cur['completed'])) {
        $cur['completed'] = true;
        $cur['completedAt'] = $now;
      }
      $cur['firstAt'] = $cur['firstAt'] ?? $now;
    }
    $cur['lastAt'] = $now;
    $pdo->prepare("INSERT INTO {$ptable} (user_id, lesson_id, data) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)")
      ->execute([$session['id'], $lessonId, json_encode($cur, JSON_UNESCAPED_UNICODE)]);
    unset($cur['ranges']);
    ok($cur);
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
      if (($old['thumbnail'] ?? '') !== '' && ($old['thumbnail'] ?? '') !== $data['thumbnail']) training_delete_file((string)$old['thumbnail']);
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
    training_delete_file((string)($old['thumbnail'] ?? ''));
    $pdo->prepare("DELETE FROM {$table} WHERE id = ?")->execute([$id]);
    $pdo->prepare("DELETE FROM " . training_progress_table($pdo) . " WHERE lesson_id = ?")->execute([$id]);
    ok(true);
  }

  if ($action === 'trainingUpload') {
    $isImage = isset($_FILES['image']);
    $f = $_FILES[$isImage ? 'image' : 'video'] ?? null;
    if (!$f || ($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
      $code = $f['error'] ?? UPLOAD_ERR_NO_FILE;
      fail(400, in_array($code, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true) ? 'The video is larger than this website allows (' . round(training_max_upload() / 1048576) . ' MB).' : 'No video was received. Please try again.');
    }
    $ext = strtolower(pathinfo((string)$f['name'], PATHINFO_EXTENSION));
    if ($isImage) {
      if (!in_array($ext, SIDVIN_TRAINING_IMAGE_EXTS, true) || !@getimagesize((string)$f['tmp_name'])) fail(400, 'Please upload a JPG, PNG or WebP image.');
    } elseif (!in_array($ext, SIDVIN_TRAINING_EXTS, true)) fail(400, 'Please upload an MP4, WebM, M4V or MOV video.');
    $url = training_store_file((string)$f['tmp_name'], (string)$f['name'], true);
    ok(['url' => $url, 'name' => (string)$f['name']]);
  }

  // Creates the standard Siddvin course (lesson text only). Videos are then fetched one by one with trainingImportVideo.
  if ($action === 'trainingSeed') {
    if (training_lessons($pdo)) fail(400, 'The course already has lessons.');
    $seed = json_decode((string)@file_get_contents(__DIR__ . '/training_seed.json'), true);
    if (!is_array($seed)) fail(500, 'The standard course file is missing.');
    foreach ($seed as $s) {
      $data = training_clean_lesson($s) + ['videoSource' => (string)($s['videoSource'] ?? ''), 'thumbSource' => (string)($s['thumbSource'] ?? '')];
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
    $thumb = (string)($data['thumbSource'] ?? ($src !== '' ? preg_replace('/\.mp4$/', '.jpg', $src) : ''));
    try {
      if ($src !== '' && ($data['videoFile'] ?? '') === '') {
        $data['videoFile'] = training_fetch_media($src);
        $data['videoFileName'] = $src;
      }
      if ($thumb !== '' && ($data['thumbnail'] ?? '') === '') {
        $data['thumbnail'] = training_fetch_media($thumb);
        $data['thumbnailName'] = $thumb;
      }
    } catch (Throwable $e) {
      fail(502, $e->getMessage());
    }
    $data['updatedBy'] = $by;
    $data['updatedAt'] = now_iso();
    $pdo->prepare("UPDATE {$table} SET data = ?, updated_by = ? WHERE id = ?")->execute([json_encode($data, JSON_UNESCAPED_UNICODE), $by, $id]);
    ok(unpack_generic_row(fetch_generic($pdo, $table, $id)));
  }

  fail(400, "Unsupported action: {$action}");
}
