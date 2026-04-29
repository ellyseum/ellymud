/**
 * Quest Loader
 *
 * Loads quest definitions from data/quests/ directory.
 * Supports TOML, YAML, and JSON formats.
 *
 * @module quest/questLoader
 */

import * as path from 'path';
import { loadDataDirectory } from '../data/dataLoader';
import { validateQuest } from '../schemas';
import { QuestDefinition } from './types';
import { createContextLogger } from '../utils/logger';
import { validateQuestReferences } from './questValidator';

const logger = createContextLogger('questLoader');

export interface LoadQuestsOptions {
  /** NPC template ids the validator should treat as valid references. */
  npcIds?: Set<string>;
  /** Room ids the validator should treat as valid references. */
  roomIds?: Set<string>;
  /** Item template ids — when supplied, item refs are checked too. */
  itemIds?: Set<string>;
}

const DEFAULT_QUESTS_DIR = path.join(__dirname, '..', '..', 'data', 'quests');

/**
 * Validation result for a quest definition
 */
export interface QuestValidationResult {
  valid: boolean;
  quest?: QuestDefinition;
  errors?: string[];
  filePath: string;
}

/**
 * Load all quest definitions from the quests directory
 *
 * @param questsDir - Optional custom directory path
 * @returns Map of quest ID to quest definition
 */
export async function loadQuests(
  questsDir: string = DEFAULT_QUESTS_DIR,
  opts: LoadQuestsOptions = {}
): Promise<Map<string, QuestDefinition>> {
  const quests = new Map<string, QuestDefinition>();
  const refs =
    opts.npcIds && opts.roomIds
      ? { npcIds: opts.npcIds, roomIds: opts.roomIds, itemIds: opts.itemIds }
      : undefined;
  let warningCount = 0;

  logger.info(`Loading quests from ${questsDir}`);
  if (refs) {
    const itemPart = refs.itemIds ? `, ${refs.itemIds.size} item ids` : '';
    logger.info(
      `Quest validator armed (${refs.npcIds.size} NPC ids, ${refs.roomIds.size} room ids${itemPart})`
    );
  } else {
    logger.info(`Quest validator skipped — no reference sets supplied`);
  }

  try {
    const results = await loadDataDirectory<QuestDefinition>(questsDir, { recursive: true });

    for (const { data, filePath } of results) {
      const validation = validateQuestDefinition(data, filePath);

      if (validation.valid && validation.quest) {
        if (quests.has(validation.quest.id)) {
          logger.warn(
            `Duplicate quest ID "${validation.quest.id}" found in ${filePath}, ` +
              `already loaded from another file. Skipping.`
          );
          continue;
        }

        // Cross-reference validation. Warnings only — a quest with bad refs
        // still loads so hot-reload can fix it; failing the boot for a typo
        // would be worse.
        if (refs) {
          const issues = validateQuestReferences(validation.quest, refs, filePath);
          for (const issue of issues) {
            warningCount++;
            logger.warn(
              `[validator] ${issue.questId} (${issue.filePath ?? '?'}): ` +
                `${issue.field} — ${issue.message}`
            );
          }
        }

        quests.set(validation.quest.id, validation.quest);
        logger.debug(`Loaded quest: ${validation.quest.id} (${validation.quest.name})`);
      } else {
        // Spell out each schema error inline — winston's metadata arg is
        // visible only at debug level, so a multi-error array gets dropped.
        const errors = validation.errors ?? ['unknown validation error'];
        logger.error(
          `Invalid quest in ${filePath} (${errors.length} schema error${errors.length === 1 ? '' : 's'}):`
        );
        for (const err of errors) {
          logger.error(`  - ${err}`);
        }
      }
    }

    if (refs && warningCount > 0) {
      logger.warn(
        `Quest validator emitted ${warningCount} warning(s) — quests still loaded; fix YAMLs and hot-reload.`
      );
    }
    logger.info(`Loaded ${quests.size} quest(s)`);
  } catch (error) {
    logger.error(`Failed to load quests from ${questsDir}:`, error);
  }

  return quests;
}

/**
 * Validate a quest definition against the schema
 *
 * @param data - Parsed quest data
 * @param filePath - Source file path for error reporting
 * @returns Validation result
 */
export function validateQuestDefinition(data: unknown, filePath: string): QuestValidationResult {
  const valid = validateQuest(data);

  if (!valid) {
    const errors = validateQuest.errors?.map((err) => {
      const path = err.instancePath || '(root)';
      return `${path}: ${err.message}`;
    }) || ['Unknown validation error'];

    return { valid: false, errors, filePath };
  }

  const quest = data as unknown as QuestDefinition;

  // Additional validation beyond JSON schema
  const additionalErrors: string[] = [];

  // Validate step IDs are unique within the quest
  const stepIds = new Set<string>();
  for (const step of quest.steps) {
    if (stepIds.has(step.id)) {
      additionalErrors.push(`Duplicate step ID: ${step.id}`);
    }
    stepIds.add(step.id);
  }

  // Validate advanceStep actions reference valid step IDs
  for (const step of quest.steps) {
    const allActions = [...(step.onStart || []), ...(step.onComplete || [])];
    for (const action of allActions) {
      if (action.action === 'advanceStep' && 'stepId' in action) {
        if (!stepIds.has(action.stepId)) {
          additionalErrors.push(
            `Step "${step.id}" references unknown step ID in advanceStep action: ${action.stepId}`
          );
        }
      }
    }

    // Also check dialogue actions
    if (step.npcDialogues) {
      for (const [npcId, dialogue] of Object.entries(step.npcDialogues)) {
        for (const option of dialogue.options) {
          if (option.actions) {
            for (const action of option.actions) {
              if (action.action === 'advanceStep' && 'stepId' in action) {
                if (!stepIds.has(action.stepId)) {
                  additionalErrors.push(
                    `NPC dialogue for "${npcId}" in step "${step.id}" ` +
                      `references unknown step ID: ${action.stepId}`
                  );
                }
              }
            }
          }
        }
      }
    }
  }

  // Validate objective types have required fields
  for (const step of quest.steps) {
    for (let i = 0; i < step.objectives.length; i++) {
      const obj = step.objectives[i];
      const objPath = `step "${step.id}" objective ${i}`;

      switch (obj.type) {
        case 'use_item':
        case 'pickup_item':
        case 'have_item':
          if (!('itemId' in obj) || !obj.itemId) {
            additionalErrors.push(`${objPath}: ${obj.type} requires itemId`);
          }
          break;
        case 'talk_to_npc':
        case 'kill_mob':
          if (!('npcTemplateId' in obj) || !obj.npcTemplateId) {
            additionalErrors.push(`${objPath}: ${obj.type} requires npcTemplateId`);
          }
          break;
        case 'enter_room':
          if (!('roomId' in obj) || !obj.roomId) {
            additionalErrors.push(`${objPath}: enter_room requires roomId`);
          }
          break;
        case 'have_flag':
          if (!('flag' in obj) || !obj.flag) {
            additionalErrors.push(`${objPath}: have_flag requires flag`);
          }
          break;
        case 'deliver_item':
          if (!('itemId' in obj) || !obj.itemId) {
            additionalErrors.push(`${objPath}: deliver_item requires itemId`);
          }
          if (!('npcTemplateId' in obj) || !obj.npcTemplateId) {
            additionalErrors.push(`${objPath}: deliver_item requires npcTemplateId`);
          }
          break;
        case 'reach_level':
          if (!('level' in obj) || typeof obj.level !== 'number') {
            additionalErrors.push(`${objPath}: reach_level requires level`);
          }
          break;
      }
    }
  }

  if (additionalErrors.length > 0) {
    return { valid: false, errors: additionalErrors, filePath };
  }

  return { valid: true, quest, filePath };
}

/**
 * Reload quests from disk
 * Useful for hot-reloading quest changes during development
 *
 * @param questsDir - Optional custom directory path
 * @returns Newly loaded quests map
 */
export async function reloadQuests(
  questsDir: string = DEFAULT_QUESTS_DIR
): Promise<Map<string, QuestDefinition>> {
  logger.info('Reloading quests...');
  return loadQuests(questsDir);
}

/**
 * Get the default quests directory path
 */
export function getDefaultQuestsDir(): string {
  return DEFAULT_QUESTS_DIR;
}
