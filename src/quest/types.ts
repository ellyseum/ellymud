/**
 * Quest System Type Definitions
 *
 * This module defines all types for the declarative quest system.
 * Quests are defined in YAML/TOML/JSON files and loaded at runtime.
 *
 * @module quest/types
 */

// ============================================================================
// Objective Types
// ============================================================================

/**
 * Base interface for all objective types
 */
interface BaseObjective {
  /** Unique ID for this objective within the step (optional, auto-generated if missing) */
  id?: string;
  /** Human-readable description shown in quest log */
  description?: string;
  /** Whether this objective is hidden from the player */
  hidden?: boolean;
}

/**
 * Use a specific item
 */
export interface UseItemObjective extends BaseObjective {
  type: 'use_item';
  itemId: string;
  /** Number of times to use (default: 1) */
  count?: number;
}

/**
 * Pick up items from the ground
 */
export interface PickupItemObjective extends BaseObjective {
  type: 'pickup_item';
  itemId: string;
  count?: number;
}

/**
 * Have items in inventory (doesn't consume)
 */
export interface HaveItemObjective extends BaseObjective {
  type: 'have_item';
  itemId: string;
  count?: number;
}

/**
 * Talk to a specific NPC
 */
export interface TalkToNpcObjective extends BaseObjective {
  type: 'talk_to_npc';
  npcTemplateId: string;
  /** Specific dialogue option that must be selected (optional) */
  dialogueOption?: string;
}

/**
 * Kill NPCs of a specific type
 */
export interface KillMobObjective extends BaseObjective {
  type: 'kill_mob';
  npcTemplateId: string;
  count?: number;
}

/**
 * Enter a specific room
 */
export interface EnterRoomObjective extends BaseObjective {
  type: 'enter_room';
  roomId: string;
}

/**
 * Check if user has a specific flag
 */
export interface HaveFlagObjective extends BaseObjective {
  type: 'have_flag';
  flag: string;
}

/**
 * Deliver an item to an NPC
 */
export interface DeliverItemObjective extends BaseObjective {
  type: 'deliver_item';
  itemId: string;
  npcTemplateId: string;
  count?: number;
}

/**
 * Reach a certain level
 */
export interface ReachLevelObjective extends BaseObjective {
  type: 'reach_level';
  level: number;
}

/**
 * Equip a specific item type or item
 */
export interface EquipItemObjective extends BaseObjective {
  type: 'equip_item';
  itemId?: string;
  slot?: string;
}

/**
 * Union type of all objective types
 */
export type QuestObjective =
  | UseItemObjective
  | PickupItemObjective
  | HaveItemObjective
  | TalkToNpcObjective
  | KillMobObjective
  | EnterRoomObjective
  | HaveFlagObjective
  | DeliverItemObjective
  | ReachLevelObjective
  | EquipItemObjective;

// ============================================================================
// Action Types
// ============================================================================

/**
 * Base interface for all action types
 */
interface BaseAction {
  /** Delay before executing in milliseconds (optional) */
  delay?: number;
}

/**
 * Set a flag on the user
 */
export interface SetFlagAction extends BaseAction {
  action: 'setFlag';
  flag: string;
}

/**
 * Remove a flag from the user
 */
export interface RemoveFlagAction extends BaseAction {
  action: 'removeFlag';
  flag: string;
}

/**
 * Set a quest flag on the user
 */
export interface SetQuestFlagAction extends BaseAction {
  action: 'setQuestFlag';
  flag: string;
}

/**
 * Remove a quest flag from the user
 */
export interface RemoveQuestFlagAction extends BaseAction {
  action: 'removeQuestFlag';
  flag: string;
}

/**
 * Show a message to the player
 */
export interface MessageAction extends BaseAction {
  action: 'message';
  text: string;
  /** Color for the message (optional) */
  color?: string;
}

/**
 * Give an item to the player
 */
export interface GiveItemAction extends BaseAction {
  action: 'giveItem';
  itemId: string;
  count?: number;
}

/**
 * Remove an item from the player's inventory
 */
export interface RemoveItemAction extends BaseAction {
  action: 'removeItem';
  itemId: string;
  count?: number;
}

/**
 * Award experience to the player
 */
export interface GiveXpAction extends BaseAction {
  action: 'giveXP';
  amount: number;
}

/**
 * Give currency to the player
 */
export interface GiveCurrencyAction extends BaseAction {
  action: 'giveCurrency';
  gold?: number;
  silver?: number;
  copper?: number;
}

/**
 * Teleport the player to a room
 */
export interface TeleportAction extends BaseAction {
  action: 'teleport';
  roomId: string;
}

/**
 * Spawn an NPC in a room
 */
export interface SpawnNpcAction extends BaseAction {
  action: 'spawnNPC';
  npcTemplateId: string;
  roomId?: string; // Defaults to player's current room
}

/**
 * Advance to a specific step (skip intermediate steps)
 */
export interface AdvanceStepAction extends BaseAction {
  action: 'advanceStep';
  stepId: string;
}

/**
 * Complete the quest immediately
 */
export interface CompleteQuestAction extends BaseAction {
  action: 'completeQuest';
}

/**
 * Fail the quest immediately
 */
export interface FailQuestAction extends BaseAction {
  action: 'failQuest';
  reason?: string;
}

/**
 * Start another quest
 */
export interface StartQuestAction extends BaseAction {
  action: 'startQuest';
  questId: string;
}

/**
 * Play a sound effect (for web clients)
 */
export interface PlaySoundAction extends BaseAction {
  action: 'playSound';
  sound: string;
}

/**
 * Union type of all action types
 */
export type QuestAction =
  | SetFlagAction
  | RemoveFlagAction
  | SetQuestFlagAction
  | RemoveQuestFlagAction
  | MessageAction
  | GiveItemAction
  | RemoveItemAction
  | GiveXpAction
  | GiveCurrencyAction
  | TeleportAction
  | SpawnNpcAction
  | AdvanceStepAction
  | CompleteQuestAction
  | FailQuestAction
  | StartQuestAction
  | PlaySoundAction;

// ============================================================================
// Dialogue Types
// ============================================================================

/**
 * Requirements for a dialogue option to be visible/selectable
 */
export interface DialogueRequirements {
  /** Required user flags */
  flags?: string[];
  /** Required quest flags */
  questFlags?: string[];
  /** Required minimum level */
  level?: number;
  /** Required class ID */
  classId?: string;
  /** Required race ID */
  raceId?: string;
  /** Required items in inventory */
  items?: string[];
  /** Step must be active for this option to show */
  activeStep?: string;
}

/**
 * A single dialogue option the player can select
 */
export interface DialogueOption {
  /** Text shown to the player for this choice */
  text: string;
  /** NPC's response when this option is selected */
  response: string;
  /** Requirements to see/select this option */
  requires?: DialogueRequirements;
  /** Actions to execute when selected */
  actions?: QuestAction[];
  /** Next dialogue node ID (for branching dialogues) */
  nextNode?: string;
}

/**
 * NPC dialogue configuration for a quest step
 */
export interface NpcDialogue {
  /** Initial greeting from the NPC */
  greeting: string;
  /** Available dialogue options */
  options: DialogueOption[];
}

// ============================================================================
// Quest Step Types
// ============================================================================

/**
 * A single step in a quest
 */
export interface QuestStep {
  /** Unique identifier for this step */
  id: string;
  /** Display name shown in quest log */
  name: string;
  /** Optional detailed description */
  description?: string;
  /** Objectives to complete this step */
  objectives: QuestObjective[];
  /** NPC dialogues available during this step, keyed by NPC template ID */
  npcDialogues?: Record<string, NpcDialogue>;
  /** Actions to execute when step starts */
  onStart?: QuestAction[];
  /** Actions to execute when step completes */
  onComplete?: QuestAction[];
  /** Whether all objectives must be complete (true) or just one (false) */
  requireAllObjectives?: boolean;
  /** Optional hint text */
  hint?: string;
  /** Time limit in seconds (0 = no limit) */
  timeLimit?: number;
}

// ============================================================================
// Quest Prerequisites Types
// ============================================================================

/**
 * Requirements to start a quest
 */
export interface QuestPrerequisites {
  /** Minimum level required */
  level?: number;
  /** Maximum level allowed (for beginner quests) */
  maxLevel?: number;
  /** Required class ID */
  classId?: string;
  /** Required race ID */
  raceId?: string;
  /** Required quest flags (from other quests) */
  questFlags?: string[];
  /** Required user flags */
  flags?: string[];
  /** Quest IDs that must be completed first */
  questsCompleted?: string[];
  /** Quest IDs that must NOT be completed */
  questsNotCompleted?: string[];
  /** Required items in inventory */
  requiredItems?: string[];
}

// ============================================================================
// Quest Rewards Types
// ============================================================================

/**
 * Rewards given when quest is completed
 */
export interface QuestRewards {
  /** Experience points awarded */
  experience?: number;
  /** Quest flags to set (for class unlocks, etc.) */
  questFlags?: string[];
  /** User flags to set */
  flags?: string[];
  /** Items to give (by template ID) */
  items?: Array<{ itemId: string; count?: number }>;
  /** Currency to give */
  currency?: {
    gold?: number;
    silver?: number;
    copper?: number;
  };
  /** Completion message shown to player */
  message?: string;
  /** Title awarded (if title system exists) */
  title?: string;
}

// ============================================================================
// Quest Definition Types
// ============================================================================

/**
 * Quest category for organization
 */
export type QuestCategory =
  | 'main' // Main story quests
  | 'side' // Side quests
  | 'class_trial' // Class advancement quests
  | 'tutorial' // Tutorial/introduction quests
  | 'daily' // Daily repeatable quests
  | 'event'; // Limited-time event quests

/**
 * Complete quest definition as loaded from data files
 */
export interface QuestDefinition {
  /** Unique identifier for this quest */
  id: string;
  /** Display name */
  name: string;
  /** Brief description shown in quest log */
  description: string;
  /** Detailed description shown when viewing quest details */
  longDescription?: string;
  /** Quest category */
  category: QuestCategory;
  /** Whether quest can be repeated after completion */
  repeatable?: boolean;
  /** Cooldown between repeats in seconds (for repeatable quests) */
  repeatCooldown?: number;
  /** Prerequisites to start this quest */
  prerequisites?: QuestPrerequisites;
  /** Ordered list of quest steps */
  steps: QuestStep[];
  /** Rewards for completing the quest */
  rewards?: QuestRewards;
  /** NPC who gives this quest (for quest giver dialogues) */
  questGiver?: string;
  /** NPC who the quest is turned in to (defaults to questGiver) */
  turnInNpc?: string;
  /** Whether quest auto-starts when prerequisites are met */
  autoStart?: boolean;
  /** Level range recommendation (display only) */
  recommendedLevel?: {
    min: number;
    max: number;
  };
  /** Quest chain ID if part of a series */
  chainId?: string;
  /** Order in chain (1, 2, 3...) */
  chainOrder?: number;
}

// ============================================================================
// Quest State/Progress Types
// ============================================================================

/**
 * Progress on a single objective
 */
export interface ObjectiveProgress {
  /** Objective ID or index */
  objectiveId: string;
  /** Current progress count */
  current: number;
  /** Required count to complete */
  required: number;
  /** Whether objective is complete */
  completed: boolean;
}

/**
 * Progress on a single quest step
 */
export interface StepProgress {
  /** Step ID */
  stepId: string;
  /** Whether step is complete */
  completed: boolean;
  /** Started timestamp */
  startedAt: string;
  /** Completed timestamp (if complete) */
  completedAt?: string;
  /** Progress on each objective */
  objectives: Record<string, ObjectiveProgress>;
}

/**
 * Active quest state for a player
 */
export interface ActiveQuestState {
  /** Quest ID */
  questId: string;
  /** Current step ID */
  currentStepId: string;
  /** When quest was started */
  startedAt: string;
  /** Progress for each step (keyed by step ID) */
  stepProgress: Record<string, StepProgress>;
  /** Quest-specific variables/data */
  variables?: Record<string, unknown>;
}

/**
 * Completed quest record
 */
export interface CompletedQuestRecord {
  /** Quest ID */
  questId: string;
  /** When completed */
  completedAt: string;
  /** Number of times completed (for repeatable quests) */
  completionCount: number;
}

/**
 * Failed quest record
 */
export interface FailedQuestRecord {
  /** Quest ID */
  questId: string;
  /** When failed */
  failedAt: string;
  /** Reason for failure */
  reason?: string;
}

/**
 * Complete quest progress data for a player
 */
export interface QuestProgressData {
  /** Player username */
  username: string;
  /** Currently active quests */
  activeQuests: ActiveQuestState[];
  /** Completed quests */
  completedQuests: CompletedQuestRecord[];
  /** Failed quests */
  failedQuests: FailedQuestRecord[];
  /** Last updated timestamp */
  updatedAt: string;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Quest-related events emitted for integration
 */
export type QuestEventType =
  | 'quest:started'
  | 'quest:step_completed'
  | 'quest:objective_updated'
  | 'quest:completed'
  | 'quest:failed'
  | 'quest:abandoned';

/**
 * Data included in quest events
 */
export interface QuestEventData {
  username: string;
  questId: string;
  questName?: string;
  stepId?: string;
  objectiveId?: string;
  progress?: ObjectiveProgress;
}

// ============================================================================
// Manager Types
// ============================================================================

/**
 * Options for starting a quest
 */
export interface StartQuestOptions {
  /** Skip prerequisite checks */
  force?: boolean;
  /** Starting step (for resuming) */
  startingStep?: string;
}

/**
 * Result of attempting to start a quest
 */
export interface StartQuestResult {
  success: boolean;
  error?: string;
  state?: ActiveQuestState;
}

/**
 * Result of updating quest objective
 */
export interface UpdateObjectiveResult {
  /** Whether any progress was made */
  progressMade: boolean;
  /** Whether objective was completed */
  objectiveCompleted: boolean;
  /** Whether step was completed */
  stepCompleted: boolean;
  /** Whether quest was completed */
  questCompleted: boolean;
  /** Rewards if quest completed */
  rewards?: QuestRewards;
}
