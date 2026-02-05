/**
 * Quest Manager Singleton
 *
 * Central manager for all quest-related operations.
 * Handles quest loading, progress tracking, and lifecycle management.
 *
 * @module quest/questManager
 */

import { EventEmitter } from 'events';
import {
  QuestDefinition,
  QuestProgressData,
  ActiveQuestState,
  StepProgress,
  ObjectiveProgress,
  CompletedQuestRecord,
  QuestEventData,
  StartQuestOptions,
  StartQuestResult,
  UpdateObjectiveResult,
  QuestObjective,
  QuestRewards,
  NpcDialogue,
} from './types';
import { loadQuests, getDefaultQuestsDir } from './questLoader';
import { getQuestProgressRepository } from '../persistence/RepositoryFactory';
import { IAsyncQuestProgressRepository } from '../persistence/interfaces';
import { createContextLogger } from '../utils/logger';
import { User } from '../types';

const logger = createContextLogger('questManager');

/**
 * Quest Manager Singleton
 *
 * Access via QuestManager.getInstance()
 */
export class QuestManager extends EventEmitter {
  private static instance: QuestManager | null = null;

  private quests: Map<string, QuestDefinition> = new Map();
  private progressCache: Map<string, QuestProgressData> = new Map();
  private repository: IAsyncQuestProgressRepository;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {
    super();
    this.repository = getQuestProgressRepository();
    this.initPromise = this.initialize();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): QuestManager {
    if (!QuestManager.instance) {
      QuestManager.instance = new QuestManager();
    }
    return QuestManager.instance;
  }

  /**
   * Reset the singleton (for testing)
   */
  public static resetInstance(): void {
    QuestManager.instance = null;
  }

  /**
   * Ensure manager is initialized before operations
   */
  public async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  /**
   * Initialize the quest manager
   */
  private async initialize(): Promise<void> {
    try {
      // Load quest definitions
      this.quests = await loadQuests(getDefaultQuestsDir());
      logger.info(`Quest manager initialized with ${this.quests.size} quests`);
      this.initialized = true;
      this.initPromise = null;
    } catch (error) {
      logger.error('Failed to initialize quest manager:', error);
      throw error;
    }
  }

  /**
   * Reload quests from disk (for development)
   */
  public async reloadQuests(): Promise<void> {
    this.quests = await loadQuests(getDefaultQuestsDir());
    logger.info(`Reloaded ${this.quests.size} quests`);
  }

  // ============================================================================
  // Quest Definition Access
  // ============================================================================

  /**
   * Get a quest definition by ID
   */
  public getQuest(questId: string): QuestDefinition | undefined {
    return this.quests.get(questId);
  }

  /**
   * Get all quest definitions
   */
  public getAllQuests(): QuestDefinition[] {
    return Array.from(this.quests.values());
  }

  /**
   * Get quests by category
   */
  public getQuestsByCategory(category: string): QuestDefinition[] {
    return this.getAllQuests().filter((q) => q.category === category);
  }

  /**
   * Get available quests for a user (meeting prerequisites, not already active/completed)
   */
  public async getAvailableQuests(user: User): Promise<QuestDefinition[]> {
    await this.ensureInitialized();
    const progress = await this.getProgress(user.username);
    const available: QuestDefinition[] = [];

    for (const quest of this.quests.values()) {
      // Skip if already active
      if (progress.activeQuests.some((q) => q.questId === quest.id)) {
        continue;
      }

      // Skip if completed and not repeatable
      const completed = progress.completedQuests.find((q) => q.questId === quest.id);
      if (completed && !quest.repeatable) {
        continue;
      }

      // Check prerequisites
      if (this.meetsPrerequisites(user, quest, progress)) {
        available.push(quest);
      }
    }

    return available;
  }

  // ============================================================================
  // Progress Management
  // ============================================================================

  /**
   * Get progress data for a user (creates empty if not exists)
   */
  public async getProgress(username: string): Promise<QuestProgressData> {
    // Check cache first
    const cached = this.progressCache.get(username.toLowerCase());
    if (cached) {
      return cached;
    }

    // Load from repository
    let progress = await this.repository.findByUsername(username);
    if (!progress) {
      progress = this.createEmptyProgress(username);
    }

    // Cache it
    this.progressCache.set(username.toLowerCase(), progress);
    return progress;
  }

  /**
   * Save progress for a user
   */
  public async saveProgress(progress: QuestProgressData): Promise<void> {
    progress.updatedAt = new Date().toISOString();
    this.progressCache.set(progress.username.toLowerCase(), progress);
    await this.repository.save(progress);
  }

  /**
   * Get active quests for a user
   */
  public async getActiveQuests(username: string): Promise<ActiveQuestState[]> {
    const progress = await this.getProgress(username);
    return progress.activeQuests;
  }

  /**
   * Get completed quests for a user
   */
  public async getCompletedQuests(username: string): Promise<CompletedQuestRecord[]> {
    const progress = await this.getProgress(username);
    return progress.completedQuests;
  }

  // ============================================================================
  // Quest Lifecycle
  // ============================================================================

  /**
   * Check if a user can start a quest
   */
  public async canStartQuest(
    user: User,
    questId: string
  ): Promise<{ can: boolean; reason?: string }> {
    await this.ensureInitialized();

    const quest = this.quests.get(questId);
    if (!quest) {
      return { can: false, reason: 'Quest not found.' };
    }

    const progress = await this.getProgress(user.username);

    // Check if already active
    if (progress.activeQuests.some((q) => q.questId === questId)) {
      return { can: false, reason: 'Quest is already active.' };
    }

    // Check if completed and not repeatable
    const completed = progress.completedQuests.find((q) => q.questId === questId);
    if (completed && !quest.repeatable) {
      return { can: false, reason: 'Quest already completed.' };
    }

    // Check prerequisites
    if (!this.meetsPrerequisites(user, quest, progress)) {
      return { can: false, reason: 'Prerequisites not met.' };
    }

    return { can: true };
  }

  /**
   * Start a quest for a user
   */
  public async startQuest(
    user: User,
    questId: string,
    options: StartQuestOptions = {}
  ): Promise<StartQuestResult> {
    await this.ensureInitialized();

    // Check if can start (unless forced)
    if (!options.force) {
      const canStart = await this.canStartQuest(user, questId);
      if (!canStart.can) {
        return { success: false, error: canStart.reason };
      }
    }

    const quest = this.quests.get(questId);
    if (!quest) {
      return { success: false, error: 'Quest not found.' };
    }

    const progress = await this.getProgress(user.username);
    const startingStep = options.startingStep || quest.steps[0].id;
    const firstStep = quest.steps.find((s) => s.id === startingStep);

    if (!firstStep) {
      return { success: false, error: 'Invalid starting step.' };
    }

    // Create active quest state
    const activeState: ActiveQuestState = {
      questId,
      currentStepId: startingStep,
      startedAt: new Date().toISOString(),
      stepProgress: {},
      variables: {},
    };

    // Initialize step progress
    activeState.stepProgress[startingStep] = this.createStepProgress(firstStep, quest);

    // Secondary check to prevent race condition duplicates
    if (progress.activeQuests.some((q) => q.questId === questId)) {
      return { success: false, error: 'Quest is already active.' };
    }

    // Add to active quests
    progress.activeQuests.push(activeState);
    await this.saveProgress(progress);

    // Emit event
    this.emit('quest:started', {
      username: user.username,
      questId,
      questName: quest.name,
    } as QuestEventData);

    logger.info(`User ${user.username} started quest: ${quest.name}`);

    return { success: true, state: activeState };
  }

  /**
   * Abandon a quest
   */
  public async abandonQuest(username: string, questId: string): Promise<boolean> {
    const progress = await this.getProgress(username);
    const index = progress.activeQuests.findIndex((q) => q.questId === questId);

    if (index === -1) {
      return false;
    }

    const quest = this.quests.get(questId);
    progress.activeQuests.splice(index, 1);
    await this.saveProgress(progress);

    this.emit('quest:abandoned', {
      username,
      questId,
      questName: quest?.name,
    } as QuestEventData);

    logger.info(`User ${username} abandoned quest: ${questId}`);
    return true;
  }

  /**
   * Complete a quest and grant rewards
   */
  public async completeQuest(username: string, questId: string): Promise<QuestRewards | null> {
    const progress = await this.getProgress(username);
    const activeIndex = progress.activeQuests.findIndex((q) => q.questId === questId);

    if (activeIndex === -1) {
      return null;
    }

    const quest = this.quests.get(questId);
    if (!quest) {
      return null;
    }

    // Remove from active
    progress.activeQuests.splice(activeIndex, 1);

    // Add to completed
    const existingCompleted = progress.completedQuests.find((q) => q.questId === questId);
    if (existingCompleted) {
      existingCompleted.completionCount++;
      existingCompleted.completedAt = new Date().toISOString();
    } else {
      progress.completedQuests.push({
        questId,
        completedAt: new Date().toISOString(),
        completionCount: 1,
      });
    }

    await this.saveProgress(progress);

    this.emit('quest:completed', {
      username,
      questId,
      questName: quest.name,
    } as QuestEventData);

    logger.info(`User ${username} completed quest: ${quest.name}`);

    return quest.rewards || null;
  }

  /**
   * Fail a quest
   */
  public async failQuest(username: string, questId: string, reason?: string): Promise<boolean> {
    const progress = await this.getProgress(username);
    const activeIndex = progress.activeQuests.findIndex((q) => q.questId === questId);

    if (activeIndex === -1) {
      return false;
    }

    const quest = this.quests.get(questId);

    // Remove from active
    progress.activeQuests.splice(activeIndex, 1);

    // Add to failed
    progress.failedQuests.push({
      questId,
      failedAt: new Date().toISOString(),
      reason,
    });

    await this.saveProgress(progress);

    this.emit('quest:failed', {
      username,
      questId,
      questName: quest?.name,
    } as QuestEventData);

    logger.info(`User ${username} failed quest: ${questId} - ${reason || 'No reason'}`);
    return true;
  }

  // ============================================================================
  // Objective Updates
  // ============================================================================

  /**
   * Update quest objective progress
   * Called by the event handler when game events occur
   */
  public async updateObjective(
    username: string,
    objectiveType: string,
    data: Record<string, unknown>
  ): Promise<UpdateObjectiveResult[]> {
    await this.ensureInitialized();
    const progress = await this.getProgress(username);
    const results: UpdateObjectiveResult[] = [];

    for (const activeQuest of progress.activeQuests) {
      const quest = this.quests.get(activeQuest.questId);
      if (!quest) continue;

      const currentStep = quest.steps.find((s) => s.id === activeQuest.currentStepId);
      if (!currentStep) continue;

      let stepProgress = activeQuest.stepProgress[activeQuest.currentStepId];
      if (!stepProgress) {
        stepProgress = this.createStepProgress(currentStep, quest);
        activeQuest.stepProgress[activeQuest.currentStepId] = stepProgress;
      }

      // Check each objective in the current step
      for (let i = 0; i < currentStep.objectives.length; i++) {
        const objective = currentStep.objectives[i];
        const objId = objective.id || `obj_${i}`;
        let objProgress = stepProgress.objectives[objId];

        if (!objProgress) {
          objProgress = {
            objectiveId: objId,
            current: 0,
            required: this.getObjectiveRequired(objective),
            completed: false,
          };
          stepProgress.objectives[objId] = objProgress;
        }

        if (objProgress.completed) continue;

        // Check if this objective matches the event
        const matches = this.objectiveMatchesEvent(objective, objectiveType, data);
        if (matches) {
          objProgress.current++;

          const result: UpdateObjectiveResult = {
            progressMade: true,
            objectiveCompleted: objProgress.current >= objProgress.required,
            stepCompleted: false,
            questCompleted: false,
          };

          if (result.objectiveCompleted) {
            objProgress.completed = true;

            this.emit('quest:objective_updated', {
              username,
              questId: activeQuest.questId,
              stepId: currentStep.id,
              objectiveId: objId,
              progress: objProgress,
            } as QuestEventData);

            // Check if step is complete
            result.stepCompleted = this.isStepComplete(currentStep, stepProgress);
            if (result.stepCompleted) {
              stepProgress.completed = true;
              stepProgress.completedAt = new Date().toISOString();

              this.emit('quest:step_completed', {
                username,
                questId: activeQuest.questId,
                stepId: currentStep.id,
              } as QuestEventData);

              // Advance to next step or complete quest
              const stepIndex = quest.steps.findIndex((s) => s.id === currentStep.id);
              if (stepIndex < quest.steps.length - 1) {
                const nextStep = quest.steps[stepIndex + 1];
                activeQuest.currentStepId = nextStep.id;
                activeQuest.stepProgress[nextStep.id] = this.createStepProgress(nextStep, quest);
              } else {
                // Last step - quest complete
                result.questCompleted = true;
                result.rewards =
                  (await this.completeQuest(username, activeQuest.questId)) || undefined;
              }
            }
          }

          results.push(result);
        }
      }
    }

    if (results.length > 0) {
      await this.saveProgress(progress);
    }

    return results;
  }

  // ============================================================================
  // NPC Dialogue Integration
  // ============================================================================

  /**
   * Get quest dialogues for an NPC for a specific user
   * Returns dialogues from all active quests that have dialogues for this NPC
   */
  public async getQuestDialogues(
    username: string,
    npcTemplateId: string
  ): Promise<Array<{ questId: string; stepId: string; dialogue: NpcDialogue }>> {
    await this.ensureInitialized();
    const progress = await this.getProgress(username);
    const dialogues: Array<{ questId: string; stepId: string; dialogue: NpcDialogue }> = [];

    for (const activeQuest of progress.activeQuests) {
      const quest = this.quests.get(activeQuest.questId);
      if (!quest) continue;

      const currentStep = quest.steps.find((s) => s.id === activeQuest.currentStepId);
      if (!currentStep || !currentStep.npcDialogues) continue;

      const npcDialogue = currentStep.npcDialogues[npcTemplateId];
      if (npcDialogue) {
        dialogues.push({
          questId: activeQuest.questId,
          stepId: currentStep.id,
          dialogue: npcDialogue,
        });
      }
    }

    return dialogues;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private createEmptyProgress(username: string): QuestProgressData {
    return {
      username,
      activeQuests: [],
      completedQuests: [],
      failedQuests: [],
      updatedAt: new Date().toISOString(),
    };
  }

  private createStepProgress(
    step: { id: string; objectives: QuestObjective[] },
    _quest: QuestDefinition
  ): StepProgress {
    const objectives: Record<string, ObjectiveProgress> = {};

    for (let i = 0; i < step.objectives.length; i++) {
      const obj = step.objectives[i];
      const objId = obj.id || `obj_${i}`;
      objectives[objId] = {
        objectiveId: objId,
        current: 0,
        required: this.getObjectiveRequired(obj),
        completed: false,
      };
    }

    return {
      stepId: step.id,
      completed: false,
      startedAt: new Date().toISOString(),
      objectives,
    };
  }

  private getObjectiveRequired(objective: QuestObjective): number {
    if ('count' in objective && typeof objective.count === 'number') {
      return objective.count;
    }
    if ('level' in objective && typeof objective.level === 'number') {
      return objective.level;
    }
    return 1;
  }

  private meetsPrerequisites(
    user: User,
    quest: QuestDefinition,
    progress: QuestProgressData
  ): boolean {
    const prereqs = quest.prerequisites;
    if (!prereqs) return true;

    // Level check
    if (prereqs.level && user.level < prereqs.level) {
      return false;
    }
    if (prereqs.maxLevel && user.level > prereqs.maxLevel) {
      return false;
    }

    // Class check
    if (prereqs.classId && user.classId !== prereqs.classId) {
      return false;
    }

    // Race check
    if (prereqs.raceId && user.raceId !== prereqs.raceId) {
      return false;
    }

    // Quest flags check
    if (prereqs.questFlags) {
      for (const flag of prereqs.questFlags) {
        if (!user.questFlags?.includes(flag)) {
          return false;
        }
      }
    }

    // User flags check
    if (prereqs.flags) {
      for (const flag of prereqs.flags) {
        if (!user.flags?.includes(flag)) {
          return false;
        }
      }
    }

    // Completed quests check
    if (prereqs.questsCompleted) {
      for (const qId of prereqs.questsCompleted) {
        if (!progress.completedQuests.some((q) => q.questId === qId)) {
          return false;
        }
      }
    }

    // Not completed quests check
    if (prereqs.questsNotCompleted) {
      for (const qId of prereqs.questsNotCompleted) {
        if (progress.completedQuests.some((q) => q.questId === qId)) {
          return false;
        }
      }
    }

    return true;
  }

  private objectiveMatchesEvent(
    objective: QuestObjective,
    eventType: string,
    data: Record<string, unknown>
  ): boolean {
    // Map event types to objective types
    switch (objective.type) {
      case 'use_item':
        return eventType === 'item:used' && data.itemId === objective.itemId;

      case 'pickup_item':
        return eventType === 'item:pickup' && data.itemId === objective.itemId;

      case 'have_item':
        // This is checked differently - on demand, not via events
        return false;

      case 'talk_to_npc':
        return (
          eventType === 'npc:talked' &&
          data.npcTemplateId === objective.npcTemplateId &&
          (!objective.dialogueOption || data.dialogueOption === objective.dialogueOption)
        );

      case 'kill_mob':
        return eventType === 'npc:death' && data.npcTemplateId === objective.npcTemplateId;

      case 'enter_room':
        return eventType === 'room:enter' && data.roomId === objective.roomId;

      case 'have_flag':
        // Checked on demand
        return false;

      case 'deliver_item':
        return (
          eventType === 'item:delivered' &&
          data.itemId === objective.itemId &&
          data.npcTemplateId === objective.npcTemplateId
        );

      case 'reach_level':
        return eventType === 'player:levelup' && (data.level as number) >= objective.level;

      case 'equip_item':
        if (eventType !== 'item:equipped') return false;
        if (objective.itemId && data.itemId !== objective.itemId) return false;
        if (objective.slot && data.slot !== objective.slot) return false;
        return true;

      default:
        return false;
    }
  }

  private isStepComplete(
    step: { objectives: QuestObjective[]; requireAllObjectives?: boolean },
    progress: StepProgress
  ): boolean {
    const requireAll = step.requireAllObjectives !== false; // Default true

    if (requireAll) {
      // All objectives must be complete
      return Object.values(progress.objectives).every((o) => o.completed);
    } else {
      // At least one objective must be complete
      return Object.values(progress.objectives).some((o) => o.completed);
    }
  }
}

// Export singleton getter
export function getQuestManager(): QuestManager {
  return QuestManager.getInstance();
}
