/**
 * Quest Cross-Reference Validator
 *
 * Schema validation (handled by AJV in src/schemas) checks structural
 * correctness — required fields, types, allowed enums. This validator
 * checks *cross-references*: that the NPC and room ids a quest mentions
 * actually exist in the loaded NPC/room data.
 *
 * Issues are returned as warnings, never thrown. The caller decides
 * whether to log, surface in admin UI, or fail-load. Hot-reload is
 * supported, so a partially-broken quest should still load (the player
 * can fix the YAML and trigger reload) rather than failing the boot.
 *
 * Scope is intentionally narrow: NPC and room references only.
 * Semantic issues (a quest's reward sets a flag that doesn't satisfy
 * its own class gate, missing item templates, etc.) are out of scope
 * for this pass.
 *
 * @module quest/questValidator
 */

import { QuestDefinition, QuestObjective, QuestAction } from './types';

export interface ValidationIssue {
  questId: string;
  severity: 'warning' | 'error';
  field: string;
  message: string;
  filePath?: string;
}

interface RefSets {
  npcIds: Set<string>;
  roomIds: Set<string>;
  /** Optional: when supplied, item references are checked too. */
  itemIds?: Set<string>;
}

/**
 * Walk a quest definition and emit a ValidationIssue for every NPC or
 * room id it references that isn't in the supplied id sets.
 */
export function validateQuestReferences(
  quest: QuestDefinition,
  refs: RefSets,
  filePath?: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const checkNpc = (id: string | undefined, field: string): void => {
    if (!id) return;
    if (!refs.npcIds.has(id)) {
      issues.push({
        questId: quest.id,
        severity: 'warning',
        field,
        message: `references NPC templateId "${id}" which is not in npcs.json`,
        filePath,
      });
    }
  };

  const checkRoom = (id: string | undefined, field: string): void => {
    if (!id) return;
    if (!refs.roomIds.has(id)) {
      issues.push({
        questId: quest.id,
        severity: 'warning',
        field,
        message: `references roomId "${id}" which is not in rooms.json`,
        filePath,
      });
    }
  };

  const checkItem = (id: string | undefined, field: string): void => {
    if (!id || !refs.itemIds) return;
    if (!refs.itemIds.has(id)) {
      issues.push({
        questId: quest.id,
        severity: 'warning',
        field,
        message: `references itemId "${id}" which is not in items.json`,
        filePath,
      });
    }
  };

  // Top-level quest refs
  checkNpc(quest.questGiver, 'questGiver');
  checkNpc(quest.turnInNpc, 'turnInNpc');

  for (let i = 0; i < quest.steps.length; i++) {
    const step = quest.steps[i];
    const stepPath = `steps[${i}:${step.id}]`;

    // npcDialogues keys are NPC template ids
    if (step.npcDialogues) {
      for (const npcId of Object.keys(step.npcDialogues)) {
        checkNpc(npcId, `${stepPath}.npcDialogues.${npcId}`);
      }
    }

    for (let j = 0; j < step.objectives.length; j++) {
      checkObjective(
        step.objectives[j],
        `${stepPath}.objectives[${j}]`,
        checkNpc,
        checkRoom,
        checkItem
      );
    }

    if (step.onStart) {
      step.onStart.forEach((action, k) =>
        checkAction(action, `${stepPath}.onStart[${k}]`, checkNpc, checkRoom, checkItem)
      );
    }
    if (step.onComplete) {
      step.onComplete.forEach((action, k) =>
        checkAction(action, `${stepPath}.onComplete[${k}]`, checkNpc, checkRoom, checkItem)
      );
    }

    // npcDialogues option requirements / actions can also reference items.
    if (step.npcDialogues) {
      for (const [npcId, dialogue] of Object.entries(step.npcDialogues)) {
        for (let oi = 0; oi < dialogue.options.length; oi++) {
          const option = dialogue.options[oi];
          const optPath = `${stepPath}.npcDialogues.${npcId}.options[${oi}]`;
          if (option.requires?.items) {
            option.requires.items.forEach((it, k) =>
              checkItem(it, `${optPath}.requires.items[${k}]`)
            );
          }
          if (option.actions) {
            option.actions.forEach((action, k) =>
              checkAction(action, `${optPath}.actions[${k}]`, checkNpc, checkRoom, checkItem)
            );
          }
        }
      }
    }
  }

  // Reward items
  if (quest.rewards?.items) {
    quest.rewards.items.forEach((it, i) => {
      checkItem(it.itemId, `rewards.items[${i}].itemId`);
    });
  }

  return issues;
}

function checkObjective(
  obj: QuestObjective,
  path: string,
  checkNpc: (id: string | undefined, field: string) => void,
  checkRoom: (id: string | undefined, field: string) => void,
  checkItem: (id: string | undefined, field: string) => void
): void {
  switch (obj.type) {
    case 'talk_to_npc':
    case 'kill_mob':
      checkNpc(obj.npcTemplateId, `${path}.npcTemplateId`);
      break;
    case 'deliver_item':
      checkNpc(obj.npcTemplateId, `${path}.npcTemplateId`);
      checkItem(obj.itemId, `${path}.itemId`);
      break;
    case 'enter_room':
      checkRoom(obj.roomId, `${path}.roomId`);
      break;
    case 'use_item':
    case 'pickup_item':
    case 'have_item':
    case 'equip_item':
      checkItem(obj.itemId, `${path}.itemId`);
      break;
    default:
      break;
  }
}

function checkAction(
  action: QuestAction,
  path: string,
  checkNpc: (id: string | undefined, field: string) => void,
  checkRoom: (id: string | undefined, field: string) => void,
  checkItem: (id: string | undefined, field: string) => void
): void {
  switch (action.action) {
    case 'teleport':
      checkRoom(action.roomId, `${path}.roomId`);
      break;
    case 'spawnNPC':
      checkNpc(action.npcTemplateId, `${path}.npcTemplateId`);
      checkRoom(action.roomId, `${path}.roomId`);
      break;
    case 'giveItem':
    case 'removeItem':
      checkItem(action.itemId, `${path}.itemId`);
      break;
    default:
      break;
  }
}
