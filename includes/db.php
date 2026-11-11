<?php

function db(): PDO {
  static $pdo = null;
  if ($pdo instanceof PDO) return $pdo;

  $configPath = __DIR__ . '/config.php';
  if (defined('ABSPATH') && defined('DB_NAME') && defined('DB_USER')) {
    $name = DB_NAME;
    $user = DB_USER;
    $pass = DB_PASSWORD;
    $dbHost = DB_HOST;
    if (strpos($dbHost, ':/') !== false) {
      [$host, $socket] = explode(':', $dbHost, 2);
      $dsn = 'mysql:unix_socket=' . $socket . ';dbname=' . $name . ';charset=utf8mb4';
    } else {
      [$host, $port] = array_pad(explode(':', $dbHost, 2), 2, '3306');
      $dsn = 'mysql:host=' . $host . ';port=' . (int)$port . ';dbname=' . $name . ';charset=utf8mb4';
    }
  } else {
    if (!file_exists($configPath)) {
      throw new RuntimeException('Missing api/config.php. Configure WordPress database credentials or add api/config.php.');
    }
    $cfg = require $configPath;
    $db = $cfg['db'] ?? [];
    $host = $db['host'] ?? '';
    $port = (int)($db['port'] ?? 3306);
    $name = $db['name'] ?? '';
    $user = $db['user'] ?? '';
    $pass = $db['pass'] ?? '';
    if ($host === '' || $name === '' || $user === '') {
      throw new RuntimeException('Invalid DB config in api/config.php');
    }
    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
  }
  $pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);

  return $pdo;
}

