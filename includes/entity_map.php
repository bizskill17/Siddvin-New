<?php

function sidvin_table_name(string $name): string {
  return defined('SIDVIN_WP_TABLE_PREFIX') ? SIDVIN_WP_TABLE_PREFIX . $name : $name;
}

function resolve_entity(string $entity): array {
  $e = trim($entity);
  switch ($e) {
    case 'Properties': return ['kind' => 'generic', 'table' => sidvin_table_name('properties')];
    case 'Brands': return ['kind' => 'generic', 'table' => sidvin_table_name('brands')];
    case 'Proposals': return ['kind' => 'generic', 'table' => sidvin_table_name('proposals')];
    case 'Visits': return ['kind' => 'generic', 'table' => sidvin_table_name('visits')];
    case 'FollowUps': return ['kind' => 'generic', 'table' => sidvin_table_name('follow_ups')];
    case 'SidvinTeam':
    case 'SidvinTeamMembers':
    case 'Sidvin Team Members':
      return ['kind' => 'generic', 'table' => sidvin_table_name('sidvin_team')];
    case 'CompanyMaster': return ['kind' => 'generic', 'table' => sidvin_table_name('company_master')];
    case 'CategoryMaster': return ['kind' => 'generic', 'table' => sidvin_table_name('category_master')];
    case 'TermSheets': return ['kind' => 'term', 'table' => sidvin_table_name('term_sheets')];
    default: return ['kind' => 'unknown', 'table' => ''];
  }
}

function uuid_v4(): string {
  $data = random_bytes(16);
  $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
  $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
  return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

