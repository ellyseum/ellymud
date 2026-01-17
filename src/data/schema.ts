/**
 * Kysely database schema definitions for EllyMUD
 * 
 * Note: The 'Generated' type from Kysely is used for auto-increment columns.
 */

import { Generated } from 'kysely';

export interface UsersTable {
  username: string;
  password_hash: string;
  salt: string;
  health: number;
  max_health: number;
  mana: number;
  max_mana: number;
  experience: number;
  level: number;
  strength: number;
  dexterity: number;
  agility: number;
  constitution: number;
  wisdom: number;
  intelligence: number;
  charisma: number;
  equipment: string | null;
  join_date: string;
  last_login: string;
  total_play_time: number;
  current_room_id: string;
  inventory_items: string | null;
  inventory_gold: number;
  inventory_silver: number;
  inventory_copper: number;
  bank_gold: number;
  bank_silver: number;
  bank_copper: number;
  in_combat: number;
  is_unconscious: number;
  is_resting: number;
  is_meditating: number;
  flags: string | null;
  pending_admin_messages: string | null;
  email: string | null;
  description: string | null;
}

export interface RoomsTable {
  id: string;
  name: string;
  description: string;
  exits: string;
  currency_gold: number;
  currency_silver: number;
  currency_copper: number;
  flags: string | null;
  npc_template_ids: string | null;
  item_instances: string | null;
}

export interface ItemTemplatesTable {
  id: string;
  name: string;
  description: string;
  type: string;
  slot: string | null;
  value: number;
  weight: number | null;
  global_limit: number | null;
  stats: string | null;
  requirements: string | null;
}

export interface ItemInstancesTable {
  instance_id: string;
  template_id: string;
  created: string;
  created_by: string;
  properties: string | null;
  history: string | null;
}

export interface NpcTemplatesTable {
  id: string;
  name: string;
  description: string;
  health: number;
  max_health: number;
  damage_min: number;
  damage_max: number;
  is_hostile: number; // SQLite boolean (0/1)
  is_passive: number; // SQLite boolean (0/1)
  experience_value: number;
  attack_texts: string; // JSON array of strings
  death_messages: string; // JSON array of strings
  merchant: number | null; // SQLite boolean (0/1)
  inventory: string | null; // JSON array of NPCInventoryItem
  stock_config: string | null; // JSON array of MerchantStockConfig
}

export interface AreasTable {
  id: string;
  name: string;
  description: string;
  level_range: string;
  flags: string | null;
  combat_config: string | null;
  spawn_config: string;
  default_room_flags: string | null;
  created: string;
  modified: string;
}

export interface RoomStatesTable {
  room_id: string;
  item_instances: string; // JSON array of SerializedItemInstance
  npc_template_ids: string; // JSON array
  currency_gold: number;
  currency_silver: number;
  currency_copper: number;
  items: string | null; // Legacy field
}

export interface AdminsTable {
  username: string;
  level: string;
  added_by: string;
  added_on: string;
}

export interface BugReportsTable {
  id: string;
  user: string;
  datetime: string;
  report: string;
  logs_raw: string | null;
  logs_user: string | null;
  solved: number; // SQLite boolean
  solved_on: string | null;
  solved_by: string | null;
  solved_reason: string | null;
}

export interface MerchantStatesTable {
  npc_template_id: string;
  npc_instance_id: string;
  actual_inventory: string; // JSON array
  stock_config: string; // JSON array
}

export interface AbilitiesTable {
  id: string;
  name: string;
  description: string;
  type: string;
  mp_cost: number;
  cooldown_type: string;
  cooldown_value: number;
  target_type: string;
  effects: string; // JSON
  requirements: string | null;
  proc_chance: number | null;
  consumes_item: number | null;
}

export interface SnakeScoresTable {
  id: Generated<number>; // Auto-increment
  username: string;
  score: number;
  date: string;
}

export interface Database {
  users: UsersTable;
  rooms: RoomsTable;
  item_templates: ItemTemplatesTable;
  item_instances: ItemInstancesTable;
  npc_templates: NpcTemplatesTable;
  areas: AreasTable;
  room_states: RoomStatesTable;
  admins: AdminsTable;
  bug_reports: BugReportsTable;
  merchant_states: MerchantStatesTable;
  abilities: AbilitiesTable;
  snake_scores: SnakeScoresTable;
}
