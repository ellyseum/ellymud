/**
 * Kysely database schema definitions for EllyMUD
 * 
 * Note: The 'Generated' type from Kysely is available for auto-increment columns
 * if needed in the future. Import it with: import { Generated } from 'kysely';
 */

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

export interface Database {
  users: UsersTable;
  rooms: RoomsTable;
}
