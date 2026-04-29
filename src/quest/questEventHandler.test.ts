import { meetsDialogueRequirements } from './questEventHandler';
import { ItemManager } from '../utils/itemManager';
import { User } from '../types';

jest.mock('../utils/logger', () => ({
  createContextLogger: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('../utils/itemManager');
jest.mock('./questManager', () => ({
  getQuestManager: jest.fn(),
}));
jest.mock('./questActions', () => ({
  executeActions: jest.fn(),
  applyRewards: jest.fn(),
}));
jest.mock('../utils/socketWriter', () => ({
  writeMessageToClient: jest.fn(),
}));

const mockUser = (overrides: Partial<User> = {}): User =>
  ({
    username: 'tester',
    level: 5,
    classId: undefined,
    raceId: undefined,
    flags: [],
    questFlags: [],
    inventory: { items: [], currency: { gold: 0, silver: 0, copper: 0 } },
    ...overrides,
  }) as unknown as User;

describe('meetsDialogueRequirements', () => {
  let mockCount: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCount = jest.fn();
    (ItemManager.getInstance as jest.Mock).mockReturnValue({
      countUserItemsByTemplate: mockCount,
    });
  });

  it('passes when no requirements set', () => {
    expect(meetsDialogueRequirements(mockUser(), undefined)).toBe(true);
    expect(meetsDialogueRequirements(mockUser(), {})).toBe(true);
  });

  it('checks user flags', () => {
    expect(
      meetsDialogueRequirements(mockUser({ flags: ['accepted_quest'] }), {
        flags: ['accepted_quest'],
      })
    ).toBe(true);
    expect(meetsDialogueRequirements(mockUser({ flags: [] }), { flags: ['accepted_quest'] })).toBe(
      false
    );
  });

  it('checks level', () => {
    expect(meetsDialogueRequirements(mockUser({ level: 10 }), { level: 5 })).toBe(true);
    expect(meetsDialogueRequirements(mockUser({ level: 3 }), { level: 5 })).toBe(false);
  });

  describe('item requirements', () => {
    it('passes when user has at least one of the required template', () => {
      mockCount.mockImplementation((_user, id) => (id === 'goblin-ear' ? 3 : 0));
      expect(
        meetsDialogueRequirements(mockUser(), {
          items: ['goblin-ear'],
        })
      ).toBe(true);
    });

    it('rejects when user has none of the required template', () => {
      mockCount.mockReturnValue(0);
      expect(
        meetsDialogueRequirements(mockUser(), {
          items: ['goblin-ear'],
        })
      ).toBe(false);
    });

    it('honors minCount on the first item', () => {
      mockCount.mockImplementation((_user, id) => (id === 'goblin-ear' ? 5 : 0));
      // 5 is below minCount 8 → reject
      expect(
        meetsDialogueRequirements(mockUser(), {
          items: ['goblin-ear'],
          minCount: 8,
        })
      ).toBe(false);
      // 5 ≥ minCount 5 → accept
      expect(
        meetsDialogueRequirements(mockUser(), {
          items: ['goblin-ear'],
          minCount: 5,
        })
      ).toBe(true);
    });

    it('treats subsequent items as count-1 (only first uses minCount)', () => {
      mockCount.mockImplementation((_user, id) => {
        if (id === 'goblin-ear') return 8;
        if (id === 'goblin-tooth') return 1; // just one — passes the 1-each rule
        return 0;
      });
      expect(
        meetsDialogueRequirements(mockUser(), {
          items: ['goblin-ear', 'goblin-tooth'],
          minCount: 8,
        })
      ).toBe(true);
    });

    it('rejects when a non-first item is missing entirely', () => {
      mockCount.mockImplementation((_user, id) => {
        if (id === 'goblin-ear') return 8;
        return 0; // tooth missing
      });
      expect(
        meetsDialogueRequirements(mockUser(), {
          items: ['goblin-ear', 'goblin-tooth'],
          minCount: 8,
        })
      ).toBe(false);
    });
  });

  it('checks activeStep', () => {
    expect(meetsDialogueRequirements(mockUser(), { activeStep: 'kill_rats' }, 'kill_rats')).toBe(
      true
    );
    expect(meetsDialogueRequirements(mockUser(), { activeStep: 'kill_rats' }, 'other_step')).toBe(
      false
    );
  });
});
