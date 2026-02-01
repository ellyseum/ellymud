/**
 * Unit tests for Quest Dialogue System
 * @module quest/questDialogue.test
 */

import {
  getQuestDialoguesForNpc,
  displayQuestDialogue,
  handleDialogueResponse,
  setActiveConversation,
  getActiveConversation,
  clearActiveConversation,
  cleanupOldConversations,
  QuestDialogueResult,
} from './questDialogue';
import { createMockClientWithUser } from '../test/helpers/mockFactories';
import { ConnectedClient, User } from '../types';
import { NpcDialogue } from './types';

// Mock dependencies
jest.mock('../utils/logger', () => ({
  createContextLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

const mockWriteMessageToClient = jest.fn();
jest.mock('../utils/socketWriter', () => ({
  writeMessageToClient: (...args: unknown[]) => mockWriteMessageToClient(...args),
}));

jest.mock('../utils/colors', () => ({
  colorize: jest.fn((text: string, color?: string) => `[${color || 'default'}]${text}[/color]`),
}));

// Mock QuestManager
const mockQuestManager = {
  ensureInitialized: jest.fn().mockResolvedValue(undefined),
  getQuestDialogues: jest.fn(),
  getQuest: jest.fn(),
};
jest.mock('./questManager', () => ({
  getQuestManager: jest.fn(() => mockQuestManager),
}));

// Mock questEventHandler
const mockExecuteDialogueActions = jest.fn();
const mockMeetsDialogueRequirements = jest.fn().mockReturnValue(true);
jest.mock('./questEventHandler', () => ({
  executeDialogueActions: (...args: unknown[]) => mockExecuteDialogueActions(...args),
  meetsDialogueRequirements: (...args: unknown[]) => mockMeetsDialogueRequirements(...args),
}));

describe('questDialogue', () => {
  let mockClient: ConnectedClient;
  let mockUser: User;

  const sampleDialogue: NpcDialogue = {
    greeting: 'Greetings, adventurer!',
    options: [
      {
        text: 'Tell me about quests',
        response: 'We have a rat problem in the cellar.',
        actions: [{ action: 'setFlag', flag: 'talked_about_rats' }],
      },
      {
        text: 'What do you sell?',
        response: 'I sell various potions and supplies.',
      },
      {
        text: 'Goodbye',
        response: 'Safe travels!',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockClient = createMockClientWithUser({
      username: 'testplayer',
      flags: [],
      questFlags: [],
      level: 5,
    });
    mockUser = mockClient.user!;

    mockQuestManager.getQuestDialogues.mockResolvedValue([]);
    mockQuestManager.getQuest.mockReturnValue({ name: 'Test Quest' });
    mockMeetsDialogueRequirements.mockReturnValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
    // Clean up any active conversations
    clearActiveConversation(mockUser.username);
  });

  describe('getQuestDialoguesForNpc', () => {
    it('should return no dialogues when user has no active quests', async () => {
      mockQuestManager.getQuestDialogues.mockResolvedValue([]);

      const result = await getQuestDialoguesForNpc(mockUser, 'innkeeper');

      expect(result.hasQuestDialogue).toBe(false);
      expect(result.dialogues.length).toBe(0);
    });

    it('should return dialogues for NPCs in active quests', async () => {
      mockQuestManager.getQuestDialogues.mockResolvedValue([
        {
          questId: 'rat-problem',
          stepId: 'step-1',
          dialogue: sampleDialogue,
        },
      ]);

      const result = await getQuestDialoguesForNpc(mockUser, 'innkeeper');

      expect(result.hasQuestDialogue).toBe(true);
      expect(result.dialogues.length).toBe(1);
      expect(result.dialogues[0].questId).toBe('rat-problem');
      expect(result.dialogues[0].dialogue.greeting).toBe('Greetings, adventurer!');
    });

    it('should filter options based on requirements', async () => {
      const dialogueWithRequirements: NpcDialogue = {
        greeting: 'Hello!',
        options: [
          { text: 'Option 1', response: 'Response 1' },
          {
            text: 'Option 2 (requires flag)',
            response: 'Response 2',
            requires: { flags: ['special_flag'] },
          },
          { text: 'Option 3', response: 'Response 3' },
        ],
      };

      mockQuestManager.getQuestDialogues.mockResolvedValue([
        { questId: 'test', stepId: 'step-1', dialogue: dialogueWithRequirements },
      ]);

      // Mock requirements check - second option fails
      mockMeetsDialogueRequirements.mockImplementation((_user, requires) => {
        if (requires?.flags?.includes('special_flag')) return false;
        return true;
      });

      const result = await getQuestDialoguesForNpc(mockUser, 'npc');

      expect(result.hasQuestDialogue).toBe(true);
      expect(result.dialogues[0].availableOptions.length).toBe(2); // Options 1 and 3
      expect(result.dialogues[0].availableOptions[0].option.text).toBe('Option 1');
      expect(result.dialogues[0].availableOptions[1].option.text).toBe('Option 3');
    });

    it('should not include quest if no options are available', async () => {
      const dialogueAllRestricted: NpcDialogue = {
        greeting: 'Hello!',
        options: [{ text: 'Restricted', response: 'Response', requires: { level: 100 } }],
      };

      mockQuestManager.getQuestDialogues.mockResolvedValue([
        { questId: 'test', stepId: 'step-1', dialogue: dialogueAllRestricted },
      ]);

      mockMeetsDialogueRequirements.mockReturnValue(false);

      const result = await getQuestDialoguesForNpc(mockUser, 'npc');

      expect(result.hasQuestDialogue).toBe(false);
      expect(result.dialogues.length).toBe(0);
    });

    it('should include dialogues from multiple quests', async () => {
      mockQuestManager.getQuestDialogues.mockResolvedValue([
        {
          questId: 'quest-1',
          stepId: 'step-1',
          dialogue: { greeting: 'Quest 1 greeting', options: [{ text: 'Q1', response: 'R1' }] },
        },
        {
          questId: 'quest-2',
          stepId: 'step-1',
          dialogue: { greeting: 'Quest 2 greeting', options: [{ text: 'Q2', response: 'R2' }] },
        },
      ]);

      mockQuestManager.getQuest
        .mockReturnValueOnce({ name: 'Quest One' })
        .mockReturnValueOnce({ name: 'Quest Two' });

      const result = await getQuestDialoguesForNpc(mockUser, 'shared-npc');

      expect(result.hasQuestDialogue).toBe(true);
      expect(result.dialogues.length).toBe(2);
    });

    it('should skip quests that are not found', async () => {
      mockQuestManager.getQuestDialogues.mockResolvedValue([
        { questId: 'deleted-quest', stepId: 'step-1', dialogue: sampleDialogue },
      ]);
      mockQuestManager.getQuest.mockReturnValue(undefined);

      const result = await getQuestDialoguesForNpc(mockUser, 'npc');

      expect(result.hasQuestDialogue).toBe(false);
    });
  });

  describe('displayQuestDialogue', () => {
    it('should display nothing if no quest dialogue', () => {
      const result: QuestDialogueResult = {
        hasQuestDialogue: false,
        dialogues: [],
      };

      displayQuestDialogue(mockClient, 'Innkeeper', result);

      expect(mockWriteMessageToClient).not.toHaveBeenCalled();
    });

    it('should display greeting and options', () => {
      const result: QuestDialogueResult = {
        hasQuestDialogue: true,
        dialogues: [
          {
            questId: 'test-quest',
            questName: 'Test Quest',
            stepId: 'step-1',
            dialogue: sampleDialogue,
            availableOptions: [
              { index: 0, option: sampleDialogue.options[0] },
              { index: 1, option: sampleDialogue.options[1] },
              { index: 2, option: sampleDialogue.options[2] },
            ],
          },
        ],
      };

      displayQuestDialogue(mockClient, 'Innkeeper', result);

      expect(mockWriteMessageToClient).toHaveBeenCalled();
      const output = mockWriteMessageToClient.mock.calls[0][1];

      expect(output).toContain('Greetings, adventurer!');
      expect(output).toContain('Test Quest');
      expect(output).toContain('Tell me about quests');
      expect(output).toContain('What do you sell?');
      expect(output).toContain('Goodbye');
      expect(output).toContain('reply <number>');
    });

    it('should display multiple quest dialogues', () => {
      const result: QuestDialogueResult = {
        hasQuestDialogue: true,
        dialogues: [
          {
            questId: 'quest-1',
            questName: 'Quest One',
            stepId: 'step-1',
            dialogue: { greeting: 'First quest', options: [{ text: 'Option A', response: 'RA' }] },
            availableOptions: [{ index: 0, option: { text: 'Option A', response: 'RA' } }],
          },
          {
            questId: 'quest-2',
            questName: 'Quest Two',
            stepId: 'step-1',
            dialogue: { greeting: 'Second quest', options: [{ text: 'Option B', response: 'RB' }] },
            availableOptions: [{ index: 0, option: { text: 'Option B', response: 'RB' } }],
          },
        ],
      };

      displayQuestDialogue(mockClient, 'NPC', result);

      const output = mockWriteMessageToClient.mock.calls[0][1];
      expect(output).toContain('First quest');
      expect(output).toContain('Second quest');
      expect(output).toContain('Quest One');
      expect(output).toContain('Quest Two');
    });
  });

  describe('handleDialogueResponse', () => {
    beforeEach(() => {
      mockQuestManager.getQuestDialogues.mockResolvedValue([
        {
          questId: 'test-quest',
          stepId: 'step-1',
          dialogue: sampleDialogue,
        },
      ]);
    });

    it('should return false if client has no user', async () => {
      mockClient.user = null;

      const result = await handleDialogueResponse(mockClient, 'innkeeper', 1);

      expect(result).toBe(false);
    });

    it('should return false if no quest dialogue available', async () => {
      mockQuestManager.getQuestDialogues.mockResolvedValue([]);

      const result = await handleDialogueResponse(mockClient, 'innkeeper', 1);

      expect(result).toBe(false);
    });

    it('should execute dialogue actions for valid option', async () => {
      mockExecuteDialogueActions.mockResolvedValue(undefined);

      const result = await handleDialogueResponse(mockClient, 'innkeeper', 1);

      expect(result).toBe(true);
      expect(mockExecuteDialogueActions).toHaveBeenCalledWith(
        mockClient,
        'test-quest',
        'step-1',
        'innkeeper',
        0 // Original index
      );
    });

    it('should show error for invalid option number', async () => {
      const result = await handleDialogueResponse(mockClient, 'innkeeper', 99);

      expect(result).toBe(false);
      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('Invalid option')
      );
    });

    it('should show error for zero or negative option number', async () => {
      const result = await handleDialogueResponse(mockClient, 'innkeeper', 0);

      expect(result).toBe(false);
      expect(mockWriteMessageToClient).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('Invalid option')
      );
    });

    it('should handle options from multiple quests', async () => {
      mockQuestManager.getQuestDialogues.mockResolvedValue([
        {
          questId: 'quest-1',
          stepId: 'step-1',
          dialogue: {
            greeting: 'G1',
            options: [{ text: 'Q1 Option', response: 'R1' }],
          },
        },
        {
          questId: 'quest-2',
          stepId: 'step-2',
          dialogue: {
            greeting: 'G2',
            options: [{ text: 'Q2 Option', response: 'R2' }],
          },
        },
      ]);

      // Select second option (from quest-2)
      const result = await handleDialogueResponse(mockClient, 'shared-npc', 2);

      expect(result).toBe(true);
      expect(mockExecuteDialogueActions).toHaveBeenCalledWith(
        mockClient,
        'quest-2',
        'step-2',
        'shared-npc',
        0
      );
    });
  });

  describe('active conversation tracking', () => {
    describe('setActiveConversation', () => {
      it('should store active conversation', () => {
        setActiveConversation('testplayer', 'innkeeper', 'The Innkeeper');

        const conversation = getActiveConversation('testplayer');

        expect(conversation).not.toBeNull();
        expect(conversation?.npcTemplateId).toBe('innkeeper');
        expect(conversation?.npcName).toBe('The Innkeeper');
      });

      it('should be case-insensitive for username', () => {
        setActiveConversation('TestPlayer', 'innkeeper', 'The Innkeeper');

        const conversation = getActiveConversation('testplayer');

        expect(conversation).not.toBeNull();
      });
    });

    describe('getActiveConversation', () => {
      it('should return null for no active conversation', () => {
        const conversation = getActiveConversation('unknownplayer');

        expect(conversation).toBeNull();
      });

      it('should return null for expired conversation', () => {
        setActiveConversation('testplayer', 'innkeeper', 'The Innkeeper');

        // Advance time past timeout (5 minutes)
        jest.advanceTimersByTime(6 * 60 * 1000);

        const conversation = getActiveConversation('testplayer');

        expect(conversation).toBeNull();
      });

      it('should return active conversation within timeout', () => {
        setActiveConversation('testplayer', 'innkeeper', 'The Innkeeper');

        // Advance time within timeout
        jest.advanceTimersByTime(4 * 60 * 1000);

        const conversation = getActiveConversation('testplayer');

        expect(conversation).not.toBeNull();
      });
    });

    describe('clearActiveConversation', () => {
      it('should clear active conversation', () => {
        setActiveConversation('testplayer', 'innkeeper', 'The Innkeeper');
        clearActiveConversation('testplayer');

        const conversation = getActiveConversation('testplayer');

        expect(conversation).toBeNull();
      });

      it('should handle clearing non-existent conversation', () => {
        // Should not throw
        clearActiveConversation('nonexistent');
      });
    });

    describe('cleanupOldConversations', () => {
      it('should remove expired conversations', () => {
        setActiveConversation('player1', 'npc1', 'NPC 1');
        setActiveConversation('player2', 'npc2', 'NPC 2');

        // Advance time past timeout
        jest.advanceTimersByTime(6 * 60 * 1000);

        // Add a fresh conversation
        setActiveConversation('player3', 'npc3', 'NPC 3');

        cleanupOldConversations();

        expect(getActiveConversation('player1')).toBeNull();
        expect(getActiveConversation('player2')).toBeNull();
        expect(getActiveConversation('player3')).not.toBeNull();
      });
    });
  });
});
