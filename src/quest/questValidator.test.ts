import { validateQuestReferences } from './questValidator';
import { QuestDefinition } from './types';

const baseQuest = (overrides: Partial<QuestDefinition> = {}): QuestDefinition => ({
  id: 'test',
  name: 'Test',
  description: 'Test quest',
  category: 'side',
  steps: [
    {
      id: 'step1',
      name: 'Step 1',
      objectives: [],
    },
  ],
  ...overrides,
});

const refs = (npc: string[] = [], room: string[] = []) => ({
  npcIds: new Set(npc),
  roomIds: new Set(room),
});

describe('validateQuestReferences', () => {
  it('returns no issues for a quest with no refs', () => {
    expect(validateQuestReferences(baseQuest(), refs())).toEqual([]);
  });

  it('flags unknown questGiver', () => {
    const issues = validateQuestReferences(baseQuest({ questGiver: 'ghost' }), refs(['real-npc']));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      severity: 'warning',
      field: 'questGiver',
      message: expect.stringContaining('"ghost"'),
    });
  });

  it('flags unknown turnInNpc', () => {
    const issues = validateQuestReferences(baseQuest({ turnInNpc: 'phantom' }), refs(['real-npc']));
    expect(issues).toHaveLength(1);
    expect(issues[0].field).toBe('turnInNpc');
  });

  it('passes for valid questGiver and turnInNpc', () => {
    const issues = validateQuestReferences(
      baseQuest({ questGiver: 'real', turnInNpc: 'real' }),
      refs(['real'])
    );
    expect(issues).toEqual([]);
  });

  it('flags unknown npcDialogues key', () => {
    const issues = validateQuestReferences(
      baseQuest({
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            objectives: [],
            npcDialogues: {
              ghost: { greeting: '...', options: [] },
            },
          },
        ],
      }),
      refs(['real-npc'])
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].field).toContain('npcDialogues.ghost');
  });

  it('flags unknown talk_to_npc objective target', () => {
    const issues = validateQuestReferences(
      baseQuest({
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            objectives: [{ type: 'talk_to_npc', npcTemplateId: 'mystery-npc' }],
          },
        ],
      }),
      refs(['real-npc'])
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].field).toContain('npcTemplateId');
  });

  it('flags unknown kill_mob objective target', () => {
    const issues = validateQuestReferences(
      baseQuest({
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            objectives: [{ type: 'kill_mob', npcTemplateId: 'rat', count: 3 }],
          },
        ],
      }),
      refs(['field-rat'])
    );
    expect(issues).toHaveLength(1);
  });

  it('flags unknown enter_room objective target', () => {
    const issues = validateQuestReferences(
      baseQuest({
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            objectives: [{ type: 'enter_room', roomId: 'imaginary-place' }],
          },
        ],
      }),
      refs([], ['real-room'])
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].field).toContain('roomId');
  });

  it('flags unknown teleport action target room', () => {
    const issues = validateQuestReferences(
      baseQuest({
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            objectives: [],
            onComplete: [{ action: 'teleport', roomId: 'gone' }],
          },
        ],
      }),
      refs([], ['here'])
    );
    expect(issues).toHaveLength(1);
    expect(issues[0].field).toContain('roomId');
  });

  it('flags unknown spawnNPC action targets', () => {
    const issues = validateQuestReferences(
      baseQuest({
        steps: [
          {
            id: 'step1',
            name: 'Step 1',
            objectives: [],
            onStart: [{ action: 'spawnNPC', npcTemplateId: 'fake', roomId: 'imaginary' }],
          },
        ],
      }),
      refs([], [])
    );
    expect(issues).toHaveLength(2);
  });

  it('includes filePath when supplied', () => {
    const issues = validateQuestReferences(
      baseQuest({ questGiver: 'ghost' }),
      refs(),
      'data/quests/foo.yaml'
    );
    expect(issues[0].filePath).toBe('data/quests/foo.yaml');
  });

  it('aggregates multiple issues across a complex quest', () => {
    const issues = validateQuestReferences(
      baseQuest({
        questGiver: 'fake-giver',
        turnInNpc: 'fake-turnin',
        steps: [
          {
            id: 's1',
            name: 'S1',
            objectives: [
              { type: 'talk_to_npc', npcTemplateId: 'fake-npc' },
              { type: 'kill_mob', npcTemplateId: 'fake-mob', count: 1 },
              { type: 'enter_room', roomId: 'fake-room' },
            ],
          },
        ],
      }),
      refs([], [])
    );
    expect(issues.length).toBeGreaterThanOrEqual(5);
  });
});
