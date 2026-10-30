<?php
// Fetch public Drive photos through the same origin so PDF canvas capture can include them.
$id = $_GET['id'] ?? '';
if (!is_string($id) || !preg_match('/^[A-Za-z0-9_-]{10,200}$/', $id)) { http_response_code(400); exit; }
if (!function_exists('curl_init')) { http_response_code(503); exit; }
$url = 'https://drive.google.com/thumbnail?id=' . rawurlencode($id) . '&sz=w1600';
for ($hop = 0; $hop < 5; $hop++) {
    $parts = parse_url($url);
    $host = strtolower($parts['host'] ?? '');
    if (($parts['scheme'] ?? '') !== 'https' || isset($parts['user']) || isset($parts['pass']) || (isset($parts['port']) && $parts['port'] !== 443) ||
        !($host === 'drive.google.com' || $host === 'lh3.google.com' || $host === 'googleusercontent.com' || str_ends_with($host, '.googleusercontent.com'))) {
        http_response_code(502); exit;
    }
    $body = ''; $location = '';
    $curl = curl_init($url);
    curl_setopt_array($curl, [CURLOPT_FOLLOWLOCATION => false, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 15,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
        CURLOPT_HEADERFUNCTION => function ($ch, $line) use (&$location) { if (stripos($line, 'Location:') === 0) $location = trim(substr($line, 9)); return strlen($line); },
        CURLOPT_WRITEFUNCTION => function ($ch, $chunk) use (&$body) { if (strlen($body) + strlen($chunk) > 8 * 1024 * 1024) return 0; $body .= $chunk; return strlen($chunk); }
    ]);
    $ok = curl_exec($curl); $status = curl_getinfo($curl, CURLINFO_HTTP_CODE); curl_close($curl);
    if ($ok === false) { http_response_code(502); exit; }
    if ($status >= 300 && $status < 400 && $location) { $url = $location; continue; }
    $image = @getimagesizefromstring($body);
    if ($status !== 200 || !$image || !in_array($image['mime'], ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], true)) { http_response_code(404); exit; }
    header('Content-Type: ' . $image['mime']); header('X-Content-Type-Options: nosniff'); header('Cache-Control: private, max-age=300'); echo $body; exit;
}
http_response_code(502);
