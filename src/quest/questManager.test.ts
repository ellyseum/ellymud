/**
 * Unit tests for Quest Manager
 * @module quest/questManager.test
 */

import { QuestManager, getQuestManager } from './questManager';
import { QuestDefinition, QuestProgressData } from './types';
import { createMockUser } from '../test/helpers/mockFactories';
import { User } from '../types';

// Mock dependencies
jest.mock('../utils/logger', () => ({
  createContextLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Mock quest loader
const mockLoadQuests = jest.fn();
jest.mock('./questLoader', () => ({
  loadQuests: (...args: unknown[]) => mockLoadQuests(...args),
  getDefaultQuestsDir: jest.fn(() => '/data/quests'),
}));

// Mock repository
const mockRepository = {
  findByUsername: jest.fn(),
  save: jest.fn(),
  findAll: jest.fn(),
  delete: jest.fn(),
};
jest.mock('../persistence/RepositoryFactory', () => ({
  getQuestProgressRepository: jest.fn(() => mockRepository),
}));

describe('QuestManager', () => {
  let questManager: QuestManager;
  let mockUser: User;

  // Sample quest definitions for testing
  const sampleQuests: Map<string, QuestDefinition> = new Map([
    [
      'tutorial-quest',
      {
        id: 'tutorial-quest',
        name: 'Getting Started',
        description: 'Learn the basics',
        category: 'tutorial',
        steps: [
          {
            id: 'step-1',
            name: 'Talk to Guide',
            objectives: [{ type: 'talk_to_npc', npcTemplateId: 'guide' }],
          },
          {
            id: 'step-2',
            name: 'Explore Town',
            objectives: [{ type: 'enter_room', roomId: 'town-square' }],
          },
        ],
        rewards: { experience: 100 },
      },
    ],
    [
      'rat-problem',
      {
        id: 'rat-problem',
        name: 'The Rat Problem',
        description: 'Clear the cellar of rats',
        category: 'side',
        prerequisites: { level: 2 },
        steps: [
          {
            id: 'kill-rats',
            name: 'Kill Rats',
            objectives: [{ type: 'kill_mob', npcTemplateId: 'rat', count: 3 }],
          },
        ],
        rewards: { experience: 250, currency: { gold: 10 } },
      },
    ],
    [
      'repeatable-daily',
      {
        id: 'repeatable-daily',
        name: 'Daily Training',
        description: 'Practice combat',
        category: 'daily',
        repeatable: true,
        steps: [
          {
            id: 'fight',
            name: 'Fight Dummy',
            objectives: [{ type: 'kill_mob', npcTemplateId: 'training-dummy', count: 1 }],
          },
        ],
        rewards: { experience: 50 },
      },
    ],
    [
      'class-quest',
      {
        id: 'class-quest',
        name: 'Warrior Trial',
        description: 'Prove your worth',
        category: 'class_trial',
        prerequisites: { level: 10, classId: 'warrior' },
        steps: [
          {
            id: 'trial',
            name: 'Complete Trial',
            objectives: [{ type: 'kill_mob', npcTemplateId: 'trial-boss', count: 1 }],
          },
        ],
        rewards: { questFlags: ['warrior_promoted'] },
      },
    ],
    [
      'chain-quest-1',
      {
        id: 'chain-quest-1',
        name: 'The Beginning',
        description: 'Start of a chain',
        category: 'main',
        chainId: 'main-story',
        chainOrder: 1,
        steps: [
          {
            id: 'start',
            name: 'Begin',
            objectives: [{ type: 'enter_room', roomId: 'castle' }],
          },
        ],
        rewards: { questFlags: ['chain_1_complete'] },
      },
    ],
    [
      'chain-quest-2',
      {
        id: 'chain-quest-2',
        name: 'The Continuation',
        description: 'Continue the story',
        category: 'main',
        chainId: 'main-story',
        chainOrder: 2,
        prerequisites: { questsCompleted: ['chain-quest-1'] },
        steps: [
          {
            id: 'continue',
            name: 'Continue',
            objectives: [{ type: 'talk_to_npc', npcTemplateId: 'king' }],
          },
        ],
      },
    ],
  ]);

  beforeEach(() => {
    jest.clearAllMocks();
    QuestManager.resetInstance();

    // Setup mock returns
    mockLoadQuests.mockResolvedValue(sampleQuests);
    mockRepository.findByUsername.mockResolvedValue(null);
    mockRepository.save.mockResolvedValue(undefined);

    mockUser = createMockUser({
      username: 'testplayer',
      level: 5,
      flags: [],
      questFlags: [],
    });
  });

  afterEach(() => {
    QuestManager.resetInstance();
  });

  describe('getInstance', () => {
    it('should return the same instance when called multiple times', async () => {
      const instance1 = QuestManager.getInstance();
      const instance2 = QuestManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should initialize quests on first call', async () => {
      questManager = QuestManager.getInstance();
      await questManager.ensureInitialized();

      expect(mockLoadQuests).toHaveBeenCalled();
    });
  });

  describe('resetInstance', () => {
    it('should allow creating a new instance after reset', async () => {
      const instance1 = QuestManager.getInstance();
      await instance1.ensureInitialized();

      QuestManager.resetInstance();

      const instance2 = QuestManager.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('getQuest', () => {
    beforeEach(async () => {
      questManager = QuestManager.getInstance();
      await questManager.ensureInitialized();
    });

    it('should return quest definition by ID', () => {
      const quest = questManager.getQuest('tutorial-quest');

      expect(quest).toBeDefined();
      expect(quest?.name).toBe('Getting Started');
    });

    it('should return undefined for non-existent quest', () => {
      const quest = questManager.getQuest('nonexistent');

      expect(quest).toBeUndefined();
    });
  });

  describe('getAllQuests', () => {
    beforeEach(async () => {
      questManager = QuestManager.getInstance();
      await questManager.ensureInitialized();
    });

    it('should return all quest definitions', () => {
      const quests = questManager.getAllQuests();

      expect(quests.length).toBe(sampleQuests.size);
    });
  });

  describe('getQuestsByCategory', () => {
    beforeEach(async () => {
      questManager = QuestManager.getInstance();
      await questManager.ensureInitialized();
    });

    it('should return quests filtered by category', () => {
      const mainQuests = questManager.getQuestsByCategory('main');

      expect(mainQuests.length).toBe(2); // chain-quest-1 and chain-quest-2
      expect(mainQuests.every((q) => q.category === 'main')).toBe(true);
    });

    it('should return empty array for category with no quests', () => {
      const eventQuests = questManager.getQuestsByCategory('event');

      expect(eventQuests.length).toBe(0);
    });
  });

  describe('getAvailableQuests', () => {
    beforeEach(async () => {
      questManager = QuestManager.getInstance();
      await questManager.ensureInitialized();
    });

    it('should return quests that meet prerequisites', async () => {
      const available = await questManager.getAvailableQuests(mockUser);

      // tutorial-quest (no prereqs), rat-problem (level 2, user is 5), repeatable-daily
      // chain-quest-1 (no prereqs)
      expect(available.length).toBeGreaterThan(0);
      expect(available.some((q) => q.id === 'tutorial-quest')).toBe(true);
    });

    it('should exclude quests with unmet level prerequisites', async () => {
      mockUser.level = 1; // Below rat-problem requirement

      const available = await questManager.getAvailableQuests(mockUser);

      expect(available.some((q) => q.id === 'rat-problem')).toBe(false);
    });

    it('should exclude quests with unmet class prerequisites', async () => {
      const available = await questManager.getAvailableQuests(mockUser);

      // class-quest requires classId: 'warrior', user has none
      expect(available.some((q) => q.id === 'class-quest')).toBe(false);
    });

    it('should exclude already active quests', async () => {
      const progress: QuestProgressData = {
        username: mockUser.username,
        activeQuests: [
          {
            questId: 'tutorial-quest',
            currentStepId: 'step-1',
            startedAt: new Date().toISOString(),
            stepProgress: {},
          },
        ],
        completedQuests: [],
        failedQuests: [],
        updatedAt: new Date().toISOString(),
      };
      mockRepository.findByUsername.mockResolvedValue(progress);

      const available = await questManager.getAvailableQuests(mockUser);

      expect(available.some((q) => q.id === 'tutorial-quest')).toBe(false);
    });

    it('should exclude completed non-repeatable quests', async () => {
      const progress: QuestProgressData = {
        username: mockUser.username,
        activeQuests: [],
        completedQuests: [
          {
            questId: 'tutorial-quest',
            completedAt: new Date().toISOString(),
            completionCount: 1,
          },
        ],
        failedQuests: [],
        updatedAt: new Date().toISOString(),
      };
      mockRepository.findByUsername.mockResolvedValue(progress);

      const available = await questManager.getAvailableQuests(mockUser);

      expect(available.some((q) => q.id === 'tutorial-quest')).toBe(false);
    });

    it('should include completed repeatable quests', async () => {
      const progress: QuestProgressData = {
        username: mockUser.username,
        activeQuests: [],
        completedQuests: [
          {
            questId: 'repeatable-daily',
            completedAt: new Date().toISOString(),
            completionCount: 5,
          },
        ],
        failedQuests: [],
        updatedAt: new Date().toISOString(),
      };
      mockRepository.findByUsername.mockResolvedValue(progress);

      const available = await questManager.getAvailableQuests(mockUser);

      expect(available.some((q) => q.id === 'repeatable-daily')).toBe(true);
    });

    it('should check questsCompleted prerequisites', async () => {
      // chain-quest-2 requires chain-quest-1 to be completed
      const progress: QuestProgressData = {
        username: mockUser.username,
        activeQuests: [],
        completedQuests: [],
        failedQuests: [],
        updatedAt: new Date().toISOString(),
      };
      mockRepository.findByUsername.mockResolvedValue(progress);

      let available = await questManager.getAvailableQuests(mockUser);
      expect(available.some((q) => q.id === 'chain-quest-2')).toBe(false);

      // Now complete chain-quest-1
      progress.completedQuests.push({
        questId: 'chain-quest-1',
        completedAt: new Date().toISOString(),
        completionCount: 1,
      });

      available = await questManager.getAvailableQuests(mockUser);
      expect(available.some((q) => q.id === 'chain-quest-2')).toBe(true);
    });
  });

  describe('canStartQuest', () => {
    beforeEach(async () => {
      questManager = QuestManager.getInstance();
      await questManager.ensureInitialized();
    });

    it('should return true for quest with no prerequisites', async () => {
      const result = await questManager.canStartQuest(mockUser, 'tutorial-quest');

      expect(result.can).toBe(true);
    });

    it('should return false for non-existent quest', async () => {
      const result = await questManager.canStartQuest(mockUser, 'nonexistent');

      expect(result.can).toBe(false);
      expect(result.reason).toBe('Quest not found.');
    });

    it('should return false if quest is already active', async () => {
      const progress: QuestProgressData = {
        username: mockUser.username,
        activeQuests: [
          {
            questId: 'tutorial-quest',
            currentStepId: 'step-1',
            startedAt: new Date().toISOString(),
            stepProgress: {},
          },
        ],
        completedQuests: [],
        failedQuests: [],
        updatedAt: new Date().toISOString(),
      };
      mockRepository.findByUsername.mockResolvedValue(progress);

      const result = await questManager.canStartQuest(mockUser, 'tutorial-quest');

      expect(result.can).toBe(false);
      expect(result.reason).toBe('Quest is already active.');
    });

    it('should return false if non-repeatable quest already completed', async () => {
      const progress: QuestProgressData = {
        username: mockUser.username,
        activeQuests: [],
        completedQuests: [
          {
            questId: 'tutorial-quest',
            completedAt: new Date().toISOString(),
            completionCount: 1,
          },
        ],
        failedQuests: [],
        updatedAt: new Date().toISOString(),
      };
      mockRepository.findByUsername.mockResolvedValue(progress);

      const result = await questManager.canStartQuest(mockUser, 'tutorial-quest');

      expect(result.can).toBe(false);
      expect(result.reason).toBe('Quest already completed.');
    });

    it('should return false if prerequisites not met', async () => {
      mockUser.level = 1; // Below level 2 requirement

      const result = await questManager.canStartQuest(mockUser, 'rat-problem');

      expect(result.can).toBe(false);
      expect(result.reason).toBe('Prerequisites not met.');
    });
  });

  describe('startQuest', () => {
    beforeEach(async () => {
      questManager = QuestManager.getInstance();
      await questManager.ensureInitialized();
    });

    it('should start a quest successfully', async () => {
      const result = await questManager.startQuest(mockUser, 'tutorial-quest');

      expect(result.success).toBe(true);
      expect(result.state).toBeDefined();
      expect(result.state?.questId).toBe('tutorial-quest');
      expect(result.state?.currentStepId).toBe('step-1');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should return error if prerequisites not met', async () => {
      mockUser.level = 1;

      const result = await questManager.startQuest(mockUser, 'rat-problem');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Prerequisites not met.');
    });

    it('should start at specified step with startingStep option', async () => {
      const result = await questManager.startQuest(mockUser, 'tutorial-quest', {
        startingStep: 'step-2',
      });

      expect(result.success).toBe(true);
      expect(result.state?.currentStepId).toBe('step-2');
    });

    it('should force start quest ignoring prerequisites', async () => {
      mockUser.level = 1; // Below requirement

      const result = await questManager.startQuest(mockUser, 'rat-problem', { force: true });

      expect(result.success).toBe(true);
    });

    it('should emit quest:started event', async () => {
      const eventHandler = jest.fn();
      questManager.on('quest:started', eventHandler);

      await questManager.startQuest(mockUser, 'tutorial-quest');

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          username: mockUser.username,
          questId: 'tutorial-quest',
          questName: 'Getting Started',
        })
      );
    });

    it('should initialize step progress with objectives', async () => {
      const result = await questManager.startQuest(mockUser, 'rat-problem');

      expect(result.success).toBe(true);
      const stepProgress = result.state?.stepProgress['kill-rats'];
      expect(stepProgress).toBeDefined();
      expect(Object.keys(stepProgress?.objectives || {}).length).toBe(1);
    });
  });

  describe('abandonQuest', () => {
    beforeEach(async () => {
      questManager = QuestManager.getInstance();
      await questManager.ensureInitialized();
    });

    it('should abandon an active quest', async () => {
      // First start a quest
      await questManager.startQuest(mockUser, 'tutorial-quest');

      const result = await questManager.abandonQuest(mockUser.username, 'tutorial-quest');

      expect(result).toBe(true);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should return false for non-active quest', async () => {
      const result = await questManager.abandonQuest(mockUser.username, 'nonexistent');

      expect(result).toBe(false);
    });

    it('should emit quest:abandoned event', async () => {
      await questManager.startQuest(mockUser, 'tutorial-quest');

      const eventHandler = jest.fn();
      questManager.on('quest:abandoned', eventHandler);

      await questManager.abandonQuest(mockUser.username, 'tutorial-quest');

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          username: mockUser.username,
          questId: 'tutorial-quest',
        })
      );
    });
  });

  describe('completeQuest', () => {
    beforeEach(async () => {
      questManager = QuestManager.getInstance();
      await questManager.ensureInitialized();
    });

    it('should complete an active quest and return rewards', async () => {
      await questManager.startQuest(mockUser, 'tutorial-quest');

      const rewards = await questManager.completeQuest(mockUser.username, 'tutorial-quest');

      expect(rewards).toEqual({ experience: 100 });
    });

    it('should move quest from active to completed', async () => {
      await questManager.startQuest(mockUser, 'tutorial-quest');
      await questManager.completeQuest(mockUser.username, 'tutorial-quest');

      const activeQuests = await questManager.getActiveQuests(mockUser.username);
      const completedQuests = await questManager.getCompletedQuests(mockUser.username);

      expect(activeQuests.some((q) => q.questId === 'tutorial-quest')).toBe(false);
      expect(completedQuests.some((q) => q.questId === 'tutorial-quest')).toBe(true);
    });

    it('should increment completion count for repeatable quests', async () => {
      // Complete twice
      await questManager.startQuest(mockUser, 'repeatable-daily');
      await questManager.completeQuest(mockUser.username, 'repeatable-daily');

      await questManager.startQuest(mockUser, 'repeatable-daily', { force: true });
      await questManager.completeQuest(mockUser.username, 'repeatable-daily');

      const completed = await questManager.getCompletedQuests(mockUser.username);
      const daily = completed.find((q) => q.questId === 'repeatable-daily');

      expect(daily?.completionCount).toBe(2);
    });

    it('should return null for non-active quest', async () => {
      const rewards = await questManager.completeQuest(mockUser.username, 'nonexistent');

      expect(rewards).toBeNull();
    });

    it('should emit quest:completed event', async () => {
      await questManager.startQuest(mockUser, 'tutorial-quest');

      const eventHandler = jest.fn();
      questManager.on('quest:completed', eventHandler);

      await questManager.completeQuest(mockUser.username, 'tutorial-quest');

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          username: mockUser.username,
          questId: 'tutorial-quest',
          questName: 'Getting Started',
        })
      );
    });
  });

  describe('failQuest', () => {
    beforeEach(async () => {
      questManager = QuestManager.getInstance();
      await questManager.ensureInitialized();
    });

    it('should fail an active quest', async () => {
      await questManager.startQuest(mockUser, 'tutorial-quest');

      const result = await questManager.failQuest(mockUser.username, 'tutorial-quest', 'Timeout');

      expect(result).toBe(true);
    });

    it('should record failure reason', async () => {
      await questManager.startQuest(mockUser, 'tutorial-quest');
      await questManager.failQuest(mockUser.username, 'tutorial-quest', 'NPC died');

      const progress = await questManager.getProgress(mockUser.username);
      const failed = progress.failedQuests.find((q) => q.questId === 'tutorial-quest');

      expect(failed?.reason).toBe('NPC died');
    });

    it('should emit quest:failed event', async () => {
      await questManager.startQuest(mockUser, 'tutorial-quest');

      const eventHandler = jest.fn();
      questManager.on('quest:failed', eventHandler);

      await questManager.failQuest(mockUser.username, 'tutorial-quest', 'Test reason');

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          username: mockUser.username,
          questId: 'tutorial-quest',
        })
      );
    });
  });

  describe('updateObjective', () => {
    beforeEach(async () => {
      questManager = QuestManager.getInstance();
      await questManager.ensureInitialized();
    });

    it('should update objective progress on matching event', async () => {
      await questManager.startQuest(mockUser, 'rat-problem');

      const results = await questManager.updateObjective(mockUser.username, 'npc:death', {
        npcTemplateId: 'rat',
      });

      expect(results.length).toBe(1);
      expect(results[0].progressMade).toBe(true);
    });

    it('should complete objective when count is reached', async () => {
      await questManager.startQuest(mockUser, 'rat-problem');

      // Kill 3 rats
      await questManager.updateObjective(mockUser.username, 'npc:death', { npcTemplateId: 'rat' });
      await questManager.updateObjective(mockUser.username, 'npc:death', { npcTemplateId: 'rat' });
      const results = await questManager.updateObjective(mockUser.username, 'npc:death', {
        npcTemplateId: 'rat',
      });

      expect(results[0].objectiveCompleted).toBe(true);
      expect(results[0].stepCompleted).toBe(true);
      expect(results[0].questCompleted).toBe(true);
    });

    it('should not make progress on non-matching event', async () => {
      await questManager.startQuest(mockUser, 'rat-problem');

      const results = await questManager.updateObjective(mockUser.username, 'npc:death', {
        npcTemplateId: 'goblin', // Wrong NPC
      });

      expect(results.length).toBe(0);
    });

    it('should emit quest:objective_updated event', async () => {
      await questManager.startQuest(mockUser, 'rat-problem');

      const eventHandler = jest.fn();
      questManager.on('quest:objective_updated', eventHandler);

      await questManager.updateObjective(mockUser.username, 'npc:death', { npcTemplateId: 'rat' });
      await questManager.updateObjective(mockUser.username, 'npc:death', { npcTemplateId: 'rat' });
      await questManager.updateObjective(mockUser.username, 'npc:death', { npcTemplateId: 'rat' });

      expect(eventHandler).toHaveBeenCalled();
    });

    it('should advance to next step when current step completes', async () => {
      await questManager.startQuest(mockUser, 'tutorial-quest');

      // Complete first step (talk to NPC)
      await questManager.updateObjective(mockUser.username, 'npc:talked', {
        npcTemplateId: 'guide',
      });

      const activeQuests = await questManager.getActiveQuests(mockUser.username);
      const quest = activeQuests.find((q) => q.questId === 'tutorial-quest');

      expect(quest?.currentStepId).toBe('step-2');
    });

    it('should handle enter_room objective', async () => {
      await questManager.startQuest(mockUser, 'tutorial-quest');

      // Skip to step 2 first
      await questManager.updateObjective(mockUser.username, 'npc:talked', {
        npcTemplateId: 'guide',
      });

      // Now enter the room
      const results = await questManager.updateObjective(mockUser.username, 'room:enter', {
        roomId: 'town-square',
      });

      expect(results[0].progressMade).toBe(true);
      expect(results[0].questCompleted).toBe(true);
    });

    it('should handle item:pickup objective', async () => {
      // Create a quest with pickup objective
      const pickupQuest: QuestDefinition = {
        id: 'pickup-quest',
        name: 'Pickup Quest',
        description: 'Pick up items',
        category: 'side',
        steps: [
          {
            id: 'pickup-step',
            name: 'Pickup',
            objectives: [{ type: 'pickup_item', itemId: 'gold-coin', count: 5 }],
          },
        ],
      };
      sampleQuests.set('pickup-quest', pickupQuest);
      mockLoadQuests.mockResolvedValue(sampleQuests);
      await questManager.reloadQuests();

      await questManager.startQuest(mockUser, 'pickup-quest');

      for (let i = 0; i < 5; i++) {
        await questManager.updateObjective(mockUser.username, 'item:pickup', {
          itemId: 'gold-coin',
        });
      }

      const results = await questManager.updateObjective(mockUser.username, 'item:pickup', {
        itemId: 'gold-coin',
      });

      // Already completed, no new progress
      expect(results.length).toBe(0);
    });
  });

  describe('getQuestDialogues', () => {
    beforeEach(async () => {
      questManager = QuestManager.getInstance();
      await questManager.ensureInitialized();

      // Add a quest with dialogues
      const dialogueQuest: QuestDefinition = {
        id: 'dialogue-quest',
        name: 'Dialogue Quest',
        description: 'Quest with NPC dialogues',
        category: 'side',
        steps: [
          {
            id: 'talk-step',
            name: 'Talk',
            objectives: [{ type: 'talk_to_npc', npcTemplateId: 'innkeeper' }],
            npcDialogues: {
              innkeeper: {
                greeting: 'Welcome, traveler!',
                options: [
                  { text: 'Tell me about quests', response: 'We have a rat problem...' },
                  { text: 'Goodbye', response: 'Safe travels!' },
                ],
              },
            },
          },
        ],
      };
      sampleQuests.set('dialogue-quest', dialogueQuest);
      mockLoadQuests.mockResolvedValue(sampleQuests);
      await questManager.reloadQuests();
    });

    it('should return dialogues for active quest NPCs', async () => {
      await questManager.startQuest(mockUser, 'dialogue-quest');

      const dialogues = await questManager.getQuestDialogues(mockUser.username, 'innkeeper');

      expect(dialogues.length).toBe(1);
      expect(dialogues[0].questId).toBe('dialogue-quest');
      expect(dialogues[0].dialogue.greeting).toBe('Welcome, traveler!');
      expect(dialogues[0].dialogue.options.length).toBe(2);
    });

    it('should return empty array for NPC with no dialogues', async () => {
      await questManager.startQuest(mockUser, 'dialogue-quest');

      const dialogues = await questManager.getQuestDialogues(mockUser.username, 'blacksmith');

      expect(dialogues.length).toBe(0);
    });

    it('should return empty array when no active quests', async () => {
      const dialogues = await questManager.getQuestDialogues(mockUser.username, 'innkeeper');

      expect(dialogues.length).toBe(0);
    });
  });

  describe('getProgress', () => {
    beforeEach(async () => {
      questManager = QuestManager.getInstance();
      await questManager.ensureInitialized();
    });

    it('should return cached progress if available', async () => {
      // First call loads from repository
      await questManager.getProgress(mockUser.username);

      // Second call should use cache
      await questManager.getProgress(mockUser.username);

      expect(mockRepository.findByUsername).toHaveBeenCalledTimes(1);
    });

    it('should create empty progress for new user', async () => {
      mockRepository.findByUsername.mockResolvedValue(null);

      const progress = await questManager.getProgress('newuser');

      expect(progress.username).toBe('newuser');
      expect(progress.activeQuests).toEqual([]);
      expect(progress.completedQuests).toEqual([]);
      expect(progress.failedQuests).toEqual([]);
    });
  });

  describe('getQuestManager helper', () => {
    it('should return the singleton instance', () => {
      const manager = getQuestManager();

      expect(manager).toBe(QuestManager.getInstance());
    });
  });
});
