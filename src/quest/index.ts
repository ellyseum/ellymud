/**
 * Quest System Module
 *
 * Declarative quest system that loads quest definitions from YAML/TOML/JSON files.
 *
 * @module quest
 */

// Core types
export * from './types';

// Quest loading
export {
  loadQuests,
  validateQuestDefinition,
  reloadQuests,
  getDefaultQuestsDir,
} from './questLoader';

// Quest manager
export { QuestManager, getQuestManager } from './questManager';

// Quest actions
export { executeActions, executeAction, applyRewards, ActionContext } from './questActions';

// Quest events
export {
  questEventBus,
  initQuestEventHandlers,
  emitQuestEvent,
  executeDialogueActions,
  meetsDialogueRequirements,
} from './questEventHandler';

// Quest dialogue
export {
  getQuestDialoguesForNpc,
  displayQuestDialogue,
  handleDialogueResponse,
  setActiveConversation,
  getActiveConversation,
  clearActiveConversation,
  QuestDialogueResult,
} from './questDialogue';
