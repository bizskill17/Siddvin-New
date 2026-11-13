<?php
// File uploads for properties and brands (photos, drawings, CAD files, presentations, logos).

const SIDVIN_FILE_KINDS = [
  'photo' => ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  'logo' => ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'],
  'drawing' => ['pdf'],
  'cad' => ['dwg', 'dxf', 'dwf', 'pdf', 'zip'],
  'presentation' => ['pdf', 'ppt', 'pptx', 'key'],
];

/** [directory, public URL] for uploaded property/brand files. */
function files_upload_dir(): array {
  if (function_exists('wp_upload_dir')) {
    $u = wp_upload_dir(null, false);
    if (empty($u['error'])) return [rtrim($u['basedir'], '/') . '/sidvin-files', rtrim($u['baseurl'], '/') . '/sidvin-files'];
  }
  return ['', ''];
}

/** If $url is one of our uploaded files, returns its path on disk. */
function files_local_path(string $url): string {
  foreach ([files_upload_dir(), function_exists('training_upload_dir') ? training_upload_dir() : ['', '']] as [$dir, $base]) {
    if ($dir === '' || $base === '') continue;
    $tail = '';
    if (strpos($url, $base . '/') === 0) $tail = substr($url, strlen($base) + 1);
    else {
      $p = (string)parse_url($url, PHP_URL_PATH);
      $bp = (string)parse_url($base, PHP_URL_PATH);
      if ($bp !== '' && strpos($p, $bp . '/') === 0) $tail = substr($p, strlen($bp) + 1);
    }
    $name = basename(rawurldecode($tail));
    if ($name !== '' && is_file($dir . '/' . $name)) return $dir . '/' . $name;
  }
  return '';
}

function files_handle_upload(array $session): void {
  if ($session['kind'] !== 'team') fail(403, 'Not allowed');
  $kind = (string)($_POST['kind'] ?? '');
  if (!isset(SIDVIN_FILE_KINDS[$kind])) fail(400, 'Unknown file type.');
  $f = $_FILES['file'] ?? null;
  if (!$f || ($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    $code = $f['error'] ?? UPLOAD_ERR_NO_FILE;
    $max = function_exists('training_max_upload') ? round(training_max_upload() / 1048576) : 0;
    fail(400, in_array($code, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true) ? "The file is larger than this website allows ({$max} MB)." : 'No file was received. Please try again.');
  }
  $ext = strtolower(pathinfo((string)$f['name'], PATHINFO_EXTENSION));
  $allowed = SIDVIN_FILE_KINDS[$kind];
  if (!in_array($ext, $allowed, true)) fail(400, 'Please upload a ' . strtoupper(implode(', ', $allowed)) . ' file.');
  if (in_array($kind, ['photo', 'logo'], true) && $ext !== 'svg' && !@getimagesize((string)$f['tmp_name'])) fail(400, 'This file is not a valid image.');
  if ($ext === 'svg') {
    $svg = (string)@file_get_contents((string)$f['tmp_name']);
    if (preg_match('/<script|on\w+\s*=|javascript:/i', $svg)) fail(400, 'This SVG file is not allowed.');
  }
  [$dir, $base] = files_upload_dir();
  if ($dir === '') fail(500, 'Uploads are only available inside WordPress.');
  if (!is_dir($dir) && !wp_mkdir_p($dir)) fail(500, 'Could not create the upload folder.');
  if (!is_file($dir . '/.htaccess')) {
    @file_put_contents($dir . '/.htaccess', "Options -Indexes\n<FilesMatch \"\\.(php[0-9]?|phtml|phar|cgi|pl|py|sh)$\">\n  Require all denied\n</FilesMatch>\n");
  }
  if (!is_file($dir . '/index.html')) @file_put_contents($dir . '/index.html', '');
  $stem = preg_replace('/[^A-Za-z0-9_-]+/', '-', pathinfo((string)$f['name'], PATHINFO_FILENAME));
  $stem = trim(substr((string)$stem, 0, 60), '-') ?: $kind;
  $name = $kind . '-' . $stem . '-' . substr(bin2hex(random_bytes(6)), 0, 10) . '.' . $ext;
  if (!move_uploaded_file((string)$f['tmp_name'], $dir . '/' . $name)) fail(500, 'Could not save the file.');
  @chmod($dir . '/' . $name, 0644);
  ok(['url' => $base . '/' . rawurlencode($name), 'name' => (string)$f['name'], 'size' => (int)$f['size']]);
}
