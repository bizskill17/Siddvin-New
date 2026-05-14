<?php

function db(): PDO {
  static $pdo = null;
  if ($pdo instanceof PDO) return $pdo;

  $configPath = __DIR__ . '/config.php';
  if (!file_exists($configPath)) {
    throw new RuntimeException('Missing api/config.php. Copy api/config.php.example to api/config.php and fill DB credentials.');
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
  $pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);

  return $pdo;
}

