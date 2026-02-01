/**
 * Unit tests for Quest Loader
 * @module quest/questLoader.test
 */

import { validateQuestDefinition, loadQuests, getDefaultQuestsDir } from './questLoader';
import { QuestDefinition } from './types';

// Mock dependencies
jest.mock('../utils/logger', () => ({
  createContextLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.mock('../data/dataLoader', () => ({
  loadDataDirectory: jest.fn(),
}));

jest.mock('../schemas', () => ({
  validateQuest: Object.assign(jest.fn().mockReturnValue(true), {
    errors: null,
  }),
}));

// Get mock references
import { loadDataDirectory } from '../data/dataLoader';
import { validateQuest } from '../schemas';

const mockLoadDataDirectory = loadDataDirectory as jest.MockedFunction<typeof loadDataDirectory>;
const mockValidateQuest = validateQuest as jest.MockedFunction<typeof validateQuest> & {
  errors: unknown[] | null;
};

describe('questLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateQuest.mockReturnValue(true);
    mockValidateQuest.errors = null;
  });

  describe('validateQuestDefinition', () => {
    const createValidQuest = (overrides: Partial<QuestDefinition> = {}): QuestDefinition => ({
      id: 'test-quest',
      name: 'Test Quest',
      description: 'A test quest',
      category: 'side',
      steps: [
        {
          id: 'step-1',
          name: 'First Step',
          objectives: [
            {
              type: 'talk_to_npc',
              npcTemplateId: 'innkeeper',
            },
          ],
        },
      ],
      ...overrides,
    });

    it('should validate a correct quest definition', () => {
      const quest = createValidQuest();
      const result = validateQuestDefinition(quest, 'test.yaml');

      expect(result.valid).toBe(true);
      expect(result.quest).toEqual(quest);
      expect(result.filePath).toBe('test.yaml');
    });

    it('should return errors when JSON schema validation fails', () => {
      mockValidateQuest.mockReturnValue(false);
      mockValidateQuest.errors = [
        {
          instancePath: '/id',
          message: 'is required',
          keyword: 'required',
          schemaPath: '',
          params: {},
        },
        {
          instancePath: '',
          message: 'missing required field',
          keyword: 'required',
          schemaPath: '',
          params: {},
        },
      ];

      const result = validateQuestDefinition({}, 'invalid.yaml');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('/id: is required');
      expect(result.errors).toContain('(root): missing required field');
    });

    it('should detect duplicate step IDs', () => {
      const quest = createValidQuest({
        steps: [
          {
            id: 'step-1',
            name: 'First Step',
            objectives: [{ type: 'enter_room', roomId: 'room-1' }],
          },
          {
            id: 'step-1', // Duplicate!
            name: 'Second Step',
            objectives: [{ type: 'enter_room', roomId: 'room-2' }],
          },
        ],
      });

      const result = validateQuestDefinition(quest, 'dupe-steps.yaml');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Duplicate step ID: step-1');
    });

    it('should detect invalid advanceStep references in onComplete actions', () => {
      const quest = createValidQuest({
        steps: [
          {
            id: 'step-1',
            name: 'First Step',
            objectives: [{ type: 'enter_room', roomId: 'room-1' }],
            onComplete: [{ action: 'advanceStep', stepId: 'nonexistent-step' }],
          },
        ],
      });

      const result = validateQuestDefinition(quest, 'bad-ref.yaml');

      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('references unknown step ID');
      expect(result.errors?.[0]).toContain('nonexistent-step');
    });

    it('should detect invalid advanceStep references in onStart actions', () => {
      const quest = createValidQuest({
        steps: [
          {
            id: 'step-1',
            name: 'First Step',
            objectives: [{ type: 'enter_room', roomId: 'room-1' }],
            onStart: [{ action: 'advanceStep', stepId: 'missing-step' }],
          },
        ],
      });

      const result = validateQuestDefinition(quest, 'bad-onstart-ref.yaml');

      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('references unknown step ID');
    });

    it('should detect invalid advanceStep references in dialogue actions', () => {
      const quest = createValidQuest({
        steps: [
          {
            id: 'step-1',
            name: 'First Step',
            objectives: [{ type: 'talk_to_npc', npcTemplateId: 'innkeeper' }],
            npcDialogues: {
              innkeeper: {
                greeting: 'Hello!',
                options: [
                  {
                    text: 'Hi',
                    response: 'Welcome',
                    actions: [{ action: 'advanceStep', stepId: 'missing-step' }],
                  },
                ],
              },
            },
          },
        ],
      });

      const result = validateQuestDefinition(quest, 'bad-dialogue-ref.yaml');

      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('references unknown step ID');
      expect(result.errors?.[0]).toContain('missing-step');
    });

    it('should allow valid advanceStep references', () => {
      const quest = createValidQuest({
        steps: [
          {
            id: 'step-1',
            name: 'First Step',
            objectives: [{ type: 'enter_room', roomId: 'room-1' }],
            onComplete: [{ action: 'advanceStep', stepId: 'step-2' }],
          },
          {
            id: 'step-2',
            name: 'Second Step',
            objectives: [{ type: 'enter_room', roomId: 'room-2' }],
          },
        ],
      });

      const result = validateQuestDefinition(quest, 'valid-ref.yaml');

      expect(result.valid).toBe(true);
    });

    // Objective type validation tests
    describe('objective type validation', () => {
      it('should require itemId for use_item objectives', () => {
        const quest = createValidQuest({
          steps: [
            {
              id: 'step-1',
              name: 'Step 1',
              objectives: [{ type: 'use_item' } as unknown as { type: 'use_item'; itemId: string }],
            },
          ],
        });

        const result = validateQuestDefinition(quest, 'test.yaml');

        expect(result.valid).toBe(false);
        expect(result.errors?.[0]).toContain('use_item requires itemId');
      });

      it('should require itemId for pickup_item objectives', () => {
        const quest = createValidQuest({
          steps: [
            {
              id: 'step-1',
              name: 'Step 1',
              objectives: [
                { type: 'pickup_item' } as unknown as { type: 'pickup_item'; itemId: string },
              ],
            },
          ],
        });

        const result = validateQuestDefinition(quest, 'test.yaml');

        expect(result.valid).toBe(false);
        expect(result.errors?.[0]).toContain('pickup_item requires itemId');
      });

      it('should require itemId for have_item objectives', () => {
        const quest = createValidQuest({
          steps: [
            {
              id: 'step-1',
              name: 'Step 1',
              objectives: [
                { type: 'have_item' } as unknown as { type: 'have_item'; itemId: string },
              ],
            },
          ],
        });

        const result = validateQuestDefinition(quest, 'test.yaml');

        expect(result.valid).toBe(false);
        expect(result.errors?.[0]).toContain('have_item requires itemId');
      });

      it('should require npcTemplateId for talk_to_npc objectives', () => {
        const quest = createValidQuest({
          steps: [
            {
              id: 'step-1',
              name: 'Step 1',
              objectives: [
                { type: 'talk_to_npc' } as unknown as {
                  type: 'talk_to_npc';
                  npcTemplateId: string;
                },
              ],
            },
          ],
        });

        const result = validateQuestDefinition(quest, 'test.yaml');

        expect(result.valid).toBe(false);
        expect(result.errors?.[0]).toContain('talk_to_npc requires npcTemplateId');
      });

      it('should require npcTemplateId for kill_mob objectives', () => {
        const quest = createValidQuest({
          steps: [
            {
              id: 'step-1',
              name: 'Step 1',
              objectives: [
                { type: 'kill_mob' } as unknown as { type: 'kill_mob'; npcTemplateId: string },
              ],
            },
          ],
        });

        const result = validateQuestDefinition(quest, 'test.yaml');

        expect(result.valid).toBe(false);
        expect(result.errors?.[0]).toContain('kill_mob requires npcTemplateId');
      });

      it('should allow kill_mob without count (defaults to 1)', () => {
        const quest = createValidQuest({
          steps: [
            {
              id: 'step-1',
              name: 'Step 1',
              objectives: [{ type: 'kill_mob', npcTemplateId: 'rat' }],
            },
          ],
        });

        const result = validateQuestDefinition(quest, 'test.yaml');

        expect(result.valid).toBe(true);
      });

      it('should require roomId for enter_room objectives', () => {
        const quest = createValidQuest({
          steps: [
            {
              id: 'step-1',
              name: 'Step 1',
              objectives: [
                { type: 'enter_room' } as unknown as { type: 'enter_room'; roomId: string },
              ],
            },
          ],
        });

        const result = validateQuestDefinition(quest, 'test.yaml');

        expect(result.valid).toBe(false);
        expect(result.errors?.[0]).toContain('enter_room requires roomId');
      });

      it('should require flag for have_flag objectives', () => {
        const quest = createValidQuest({
          steps: [
            {
              id: 'step-1',
              name: 'Step 1',
              objectives: [{ type: 'have_flag' } as unknown as { type: 'have_flag'; flag: string }],
            },
          ],
        });

        const result = validateQuestDefinition(quest, 'test.yaml');

        expect(result.valid).toBe(false);
        expect(result.errors?.[0]).toContain('have_flag requires flag');
      });

      it('should require both itemId and npcTemplateId for deliver_item objectives', () => {
        const quest = createValidQuest({
          steps: [
            {
              id: 'step-1',
              name: 'Step 1',
              objectives: [
                { type: 'deliver_item' } as unknown as {
                  type: 'deliver_item';
                  itemId: string;
                  npcTemplateId: string;
                },
              ],
            },
          ],
        });

        const result = validateQuestDefinition(quest, 'test.yaml');

        expect(result.valid).toBe(false);
        expect(result.errors?.some((e) => e.includes('deliver_item requires itemId'))).toBe(true);
        expect(result.errors?.some((e) => e.includes('deliver_item requires npcTemplateId'))).toBe(
          true
        );
      });

      it('should require level for reach_level objectives', () => {
        const quest = createValidQuest({
          steps: [
            {
              id: 'step-1',
              name: 'Step 1',
              objectives: [
                { type: 'reach_level' } as unknown as { type: 'reach_level'; level: number },
              ],
            },
          ],
        });

        const result = validateQuestDefinition(quest, 'test.yaml');

        expect(result.valid).toBe(false);
        expect(result.errors?.[0]).toContain('reach_level requires level');
      });

      it('should accept valid objectives with all required fields', () => {
        const quest = createValidQuest({
          steps: [
            {
              id: 'step-1',
              name: 'Step 1',
              objectives: [
                { type: 'kill_mob', npcTemplateId: 'goblin', count: 3 },
                { type: 'enter_room', roomId: 'dungeon-entrance' },
                { type: 'reach_level', level: 5 },
                { type: 'deliver_item', itemId: 'key', npcTemplateId: 'guard' },
              ],
            },
          ],
        });

        const result = validateQuestDefinition(quest, 'test.yaml');

        expect(result.valid).toBe(true);
      });

      it('should accept equip_item objectives without itemId or slot', () => {
        const quest = createValidQuest({
          steps: [
            {
              id: 'step-1',
              name: 'Step 1',
              objectives: [{ type: 'equip_item' }],
            },
          ],
        });

        const result = validateQuestDefinition(quest, 'test.yaml');

        expect(result.valid).toBe(true);
      });
    });
  });

  describe('loadQuests', () => {
    it('should load and validate quests from directory', async () => {
      const mockQuestData: QuestDefinition = {
        id: 'rat-problem',
        name: 'The Rat Problem',
        description: 'Clear the cellar of rats',
        category: 'side',
        steps: [
          {
            id: 'kill-rats',
            name: 'Kill Rats',
            objectives: [{ type: 'kill_mob', npcTemplateId: 'rat', count: 3 }],
          },
        ],
      };

      mockLoadDataDirectory.mockResolvedValue([
        { data: mockQuestData, filePath: 'rat-problem.yaml' },
      ]);

      const quests = await loadQuests('/test/quests');

      expect(quests.size).toBe(1);
      expect(quests.get('rat-problem')).toEqual(mockQuestData);
    });

    it('should skip duplicate quest IDs and keep first occurrence', async () => {
      const quest1: QuestDefinition = {
        id: 'dupe-quest',
        name: 'First Quest',
        description: 'First',
        category: 'side',
        steps: [
          {
            id: 'step-1',
            name: 'Step',
            objectives: [{ type: 'enter_room', roomId: 'room-1' }],
          },
        ],
      };

      const quest2: QuestDefinition = {
        id: 'dupe-quest', // Same ID!
        name: 'Second Quest',
        description: 'Second',
        category: 'side',
        steps: [
          {
            id: 'step-1',
            name: 'Step',
            objectives: [{ type: 'enter_room', roomId: 'room-2' }],
          },
        ],
      };

      mockLoadDataDirectory.mockResolvedValue([
        { data: quest1, filePath: 'first.yaml' },
        { data: quest2, filePath: 'second.yaml' },
      ]);

      const quests = await loadQuests('/test/quests');

      expect(quests.size).toBe(1);
      expect(quests.get('dupe-quest')?.name).toBe('First Quest');
    });

    it('should skip invalid quests but load valid ones', async () => {
      const validQuest: QuestDefinition = {
        id: 'valid-quest',
        name: 'Valid Quest',
        description: 'Valid',
        category: 'side',
        steps: [
          {
            id: 'step-1',
            name: 'Step',
            objectives: [{ type: 'enter_room', roomId: 'room-1' }],
          },
        ],
      };

      const invalidQuest = {
        id: 'invalid-quest',
        // Missing required fields
      };

      // Make validateQuest return false for the invalid quest
      mockValidateQuest.mockImplementation((data: unknown) => {
        const quest = data as { id?: string };
        if (quest.id === 'invalid-quest') {
          mockValidateQuest.errors = [
            {
              instancePath: '/name',
              message: 'is required',
              keyword: 'required',
              schemaPath: '',
              params: {},
            },
          ];
          return false;
        }
        mockValidateQuest.errors = null;
        return true;
      });

      mockLoadDataDirectory.mockResolvedValue([
        { data: validQuest, filePath: 'valid.yaml' },
        { data: invalidQuest, filePath: 'invalid.yaml' },
      ]);

      const quests = await loadQuests('/test/quests');

      expect(quests.size).toBe(1);
      expect(quests.has('valid-quest')).toBe(true);
      expect(quests.has('invalid-quest')).toBe(false);
    });

    it('should handle directory loading errors gracefully', async () => {
      mockLoadDataDirectory.mockRejectedValue(new Error('Directory not found'));

      const quests = await loadQuests('/nonexistent');

      expect(quests.size).toBe(0);
    });

    it('should return empty map for empty directory', async () => {
      mockLoadDataDirectory.mockResolvedValue([]);

      const quests = await loadQuests('/empty');

      expect(quests.size).toBe(0);
    });

    it('should load multiple valid quests', async () => {
      const quests: QuestDefinition[] = [
        {
          id: 'quest-1',
          name: 'Quest One',
          description: 'First',
          category: 'main',
          steps: [{ id: 's1', name: 'S', objectives: [{ type: 'enter_room', roomId: 'r1' }] }],
        },
        {
          id: 'quest-2',
          name: 'Quest Two',
          description: 'Second',
          category: 'side',
          steps: [{ id: 's1', name: 'S', objectives: [{ type: 'enter_room', roomId: 'r2' }] }],
        },
        {
          id: 'quest-3',
          name: 'Quest Three',
          description: 'Third',
          category: 'daily',
          repeatable: true,
          steps: [
            {
              id: 's1',
              name: 'S',
              objectives: [{ type: 'kill_mob', npcTemplateId: 'goblin', count: 5 }],
            },
          ],
        },
      ];

      mockLoadDataDirectory.mockResolvedValue(
        quests.map((q, i) => ({ data: q, filePath: `quest-${i}.yaml` }))
      );

      const loadedQuests = await loadQuests('/test/quests');

      expect(loadedQuests.size).toBe(3);
      expect(loadedQuests.has('quest-1')).toBe(true);
      expect(loadedQuests.has('quest-2')).toBe(true);
      expect(loadedQuests.has('quest-3')).toBe(true);
    });
  });

  describe('getDefaultQuestsDir', () => {
    it('should return a path ending with data/quests', () => {
      const dir = getDefaultQuestsDir();
      expect(dir).toMatch(/data[/\\]quests$/);
    });
  });
});
