/**
 * Unit tests for ClassManager
 * Tests class loading, advancement requirements, and stat bonuses
 */

import { ClassManager } from './classManager';
import { CharacterClass, User } from '../types';
import { IAsyncClassRepository } from '../persistence/interfaces';
import { getClassRepository } from '../persistence/RepositoryFactory';

// Mock dependencies
jest.mock('../persistence/RepositoryFactory', () => ({
  getClassRepository: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  createContextLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Sample class data for testing (matches actual classes.json structure)
const mockClasses: CharacterClass[] = [
  {
    id: 'adventurer',
    name: 'Adventurer',
    description: 'A brave soul who has set out to explore the world.',
    tier: 0,
    requirements: {
      level: 1,
      previousClass: null,
      questFlag: null,
      trainerType: null,
    },
    statBonuses: { maxHealth: 0, maxMana: 0, attack: 0, defense: 0 },
    availableAdvancement: ['fighter', 'magic_user', 'thief', 'healer'],
  },
  {
    id: 'fighter',
    name: 'Fighter',
    description: 'A master of martial combat.',
    tier: 1,
    requirements: {
      level: 5,
      previousClass: 'adventurer',
      questFlag: null,
      trainerType: 'fighter_trainer',
    },
    statBonuses: { maxHealth: 20, maxMana: 0, attack: 5, defense: 3 },
    availableAdvancement: ['paladin', 'berserker', 'knight'],
  },
  {
    id: 'magic_user',
    name: 'Magic User',
    description: 'A student of the arcane arts.',
    tier: 1,
    requirements: {
      level: 5,
      previousClass: 'adventurer',
      questFlag: null,
      trainerType: 'mage_trainer',
    },
    statBonuses: { maxHealth: 0, maxMana: 30, attack: 2, defense: 0 },
    availableAdvancement: ['wizard', 'necromancer', 'elementalist'],
  },
  {
    id: 'thief',
    name: 'Thief',
    description: 'A cunning rogue who relies on stealth.',
    tier: 1,
    requirements: {
      level: 5,
      previousClass: 'adventurer',
      questFlag: null,
      trainerType: 'thief_trainer',
    },
    statBonuses: { maxHealth: 5, maxMana: 10, attack: 4, defense: 1 },
    availableAdvancement: ['assassin', 'ranger', 'shadow'],
  },
  {
    id: 'healer',
    name: 'Healer',
    description: 'A devoted servant of the divine.',
    tier: 1,
    requirements: {
      level: 5,
      previousClass: 'adventurer',
      questFlag: null,
      trainerType: 'healer_trainer',
    },
    statBonuses: { maxHealth: 10, maxMana: 25, attack: 1, defense: 2 },
    availableAdvancement: ['cleric', 'druid', 'shaman'],
  },
  {
    id: 'paladin',
    name: 'Paladin',
    description: 'Holy warriors who combine martial prowess with divine magic.',
    tier: 2,
    requirements: {
      level: 15,
      previousClass: 'fighter',
      questFlag: 'paladin_trial',
      trainerType: 'paladin_trainer',
    },
    statBonuses: { maxHealth: 30, maxMana: 15, attack: 7, defense: 8 },
    availableAdvancement: [],
  },
  {
    id: 'berserker',
    name: 'Berserker',
    description: 'Savage warriors who channel their rage.',
    tier: 2,
    requirements: {
      level: 15,
      previousClass: 'fighter',
      questFlag: 'berserker_trial',
      trainerType: 'berserker_trainer',
    },
    statBonuses: { maxHealth: 25, maxMana: 0, attack: 15, defense: 2 },
    availableAdvancement: [],
  },
  {
    id: 'knight',
    name: 'Knight',
    description: 'Noble warriors sworn to a code of honor.',
    tier: 2,
    requirements: {
      level: 15,
      previousClass: 'fighter',
      questFlag: 'knight_trial',
      trainerType: 'knight_trainer',
    },
    statBonuses: { maxHealth: 40, maxMana: 5, attack: 5, defense: 12 },
    availableAdvancement: [],
  },
  {
    id: 'wizard',
    name: 'Wizard',
    description: 'Masters of arcane knowledge.',
    tier: 2,
    requirements: {
      level: 15,
      previousClass: 'magic_user',
      questFlag: 'wizard_trial',
      trainerType: 'wizard_trainer',
    },
    statBonuses: { maxHealth: 5, maxMana: 60, attack: 8, defense: 1 },
    availableAdvancement: [],
  },
  {
    id: 'necromancer',
    name: 'Necromancer',
    description: 'Dark mages who command the powers of death.',
    tier: 2,
    requirements: {
      level: 15,
      previousClass: 'magic_user',
      questFlag: 'necromancer_trial',
      trainerType: 'necromancer_trainer',
    },
    statBonuses: { maxHealth: 15, maxMana: 45, attack: 6, defense: 2 },
    availableAdvancement: [],
  },
  {
    id: 'elementalist',
    name: 'Elementalist',
    description: 'Mages who have mastered the primal elements.',
    tier: 2,
    requirements: {
      level: 15,
      previousClass: 'magic_user',
      questFlag: 'elementalist_trial',
      trainerType: 'elementalist_trainer',
    },
    statBonuses: { maxHealth: 10, maxMana: 50, attack: 10, defense: 1 },
    availableAdvancement: [],
  },
  {
    id: 'assassin',
    name: 'Assassin',
    description: 'Deadly killers who strike from the shadows.',
    tier: 2,
    requirements: {
      level: 15,
      previousClass: 'thief',
      questFlag: 'assassin_trial',
      trainerType: 'assassin_trainer',
    },
    statBonuses: { maxHealth: 10, maxMana: 15, attack: 12, defense: 3 },
    availableAdvancement: [],
  },
  {
    id: 'ranger',
    name: 'Ranger',
    description: 'Skilled hunters and trackers.',
    tier: 2,
    requirements: {
      level: 15,
      previousClass: 'thief',
      questFlag: 'ranger_trial',
      trainerType: 'ranger_trainer',
    },
    statBonuses: { maxHealth: 15, maxMana: 20, attack: 8, defense: 5 },
    availableAdvancement: [],
  },
  {
    id: 'shadow',
    name: 'Shadow',
    description: 'Masters of darkness and deception.',
    tier: 2,
    requirements: {
      level: 15,
      previousClass: 'thief',
      questFlag: 'shadow_trial',
      trainerType: 'shadow_trainer',
    },
    statBonuses: { maxHealth: 5, maxMana: 25, attack: 10, defense: 6 },
    availableAdvancement: [],
  },
  {
    id: 'cleric',
    name: 'Cleric',
    description: 'Devoted servants of the gods.',
    tier: 2,
    requirements: {
      level: 15,
      previousClass: 'healer',
      questFlag: 'cleric_trial',
      trainerType: 'cleric_trainer',
    },
    statBonuses: { maxHealth: 20, maxMana: 50, attack: 3, defense: 6 },
    availableAdvancement: [],
  },
  {
    id: 'druid',
    name: 'Druid',
    description: 'Guardians of nature who draw power from the natural world.',
    tier: 2,
    requirements: {
      level: 15,
      previousClass: 'healer',
      questFlag: 'druid_trial',
      trainerType: 'druid_trainer',
    },
    statBonuses: { maxHealth: 25, maxMana: 40, attack: 5, defense: 4 },
    availableAdvancement: [],
  },
  {
    id: 'shaman',
    name: 'Shaman',
    description: 'Spirit walkers who commune with the ancestors.',
    tier: 2,
    requirements: {
      level: 15,
      previousClass: 'healer',
      questFlag: 'shaman_trial',
      trainerType: 'shaman_trainer',
    },
    statBonuses: { maxHealth: 15, maxMana: 45, attack: 6, defense: 3 },
    availableAdvancement: [],
  },
];

// Create mock repository
const createMockRepository = (): jest.Mocked<IAsyncClassRepository> => ({
  findAll: jest.fn().mockResolvedValue(mockClasses),
  findById: jest
    .fn()
    .mockImplementation((id: string) => Promise.resolve(mockClasses.find((c) => c.id === id))),
  findByTier: jest
    .fn()
    .mockImplementation((tier: number) =>
      Promise.resolve(mockClasses.filter((c) => c.tier === tier))
    ),
  save: jest.fn().mockResolvedValue(undefined),
  saveAll: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
});

// Helper to create mock user
const createMockUser = (overrides: Partial<User> = {}): User => ({
  username: 'testuser',
  password: 'hashed',
  health: 100,
  maxHealth: 100,
  mana: 50,
  maxMana: 50,
  experience: 0,
  level: 1,
  strength: 10,
  dexterity: 10,
  agility: 10,
  constitution: 10,
  wisdom: 10,
  intelligence: 10,
  charisma: 10,
  joinDate: new Date(),
  lastLogin: new Date(),
  currentRoomId: 'town-square',
  inventory: {
    items: [],
    currency: { gold: 0, silver: 0, copper: 0 },
  },
  classId: 'adventurer',
  questFlags: [],
  ...overrides,
});

describe('ClassManager', () => {
  let mockRepository: jest.Mocked<IAsyncClassRepository>;

  beforeEach(() => {
    // Reset singleton
    ClassManager.resetInstance();
    jest.clearAllMocks();

    // Setup mock repository
    mockRepository = createMockRepository();

    // Make getClassRepository return our mock
    (getClassRepository as jest.Mock).mockReturnValue(mockRepository);
  });

  afterEach(() => {
    ClassManager.resetInstance();
  });

  describe('getInstance', () => {
    it('should return a ClassManager instance', async () => {
      const instance = ClassManager.getInstance();
      await instance.ensureInitialized();

      expect(instance).toBeInstanceOf(ClassManager);
    });

    it('should return the same instance on multiple calls (singleton pattern)', async () => {
      const instance1 = ClassManager.getInstance();
      const instance2 = ClassManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should load classes from repository on initialization', async () => {
      const instance = ClassManager.getInstance();
      await instance.ensureInitialized();

      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAllClasses', () => {
    it('should return all 17 classes', async () => {
      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      const classes = manager.getAllClasses();

      expect(classes).toHaveLength(17);
    });

    it('should include adventurer as tier 0', async () => {
      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      const classes = manager.getAllClasses();
      const adventurer = classes.find((c) => c.id === 'adventurer');

      expect(adventurer).toBeDefined();
      expect(adventurer?.tier).toBe(0);
    });

    it('should include all 4 tier 1 classes', async () => {
      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      const classes = manager.getAllClasses();
      const tier1 = classes.filter((c) => c.tier === 1);

      expect(tier1).toHaveLength(4);
      expect(tier1.map((c) => c.id).sort()).toEqual(['fighter', 'healer', 'magic_user', 'thief']);
    });

    it('should include all 12 tier 2 classes', async () => {
      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      const classes = manager.getAllClasses();
      const tier2 = classes.filter((c) => c.tier === 2);

      expect(tier2).toHaveLength(12);
    });

    it('should return empty array when no classes loaded', async () => {
      mockRepository.findAll.mockResolvedValue([]);
      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      const classes = manager.getAllClasses();

      expect(classes).toHaveLength(0);
    });
  });

  describe('getClass', () => {
    it('should return correct class by ID', async () => {
      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      const fighter = manager.getClass('fighter');
      const wizard = manager.getClass('wizard');
      const paladin = manager.getClass('paladin');

      expect(fighter?.name).toBe('Fighter');
      expect(wizard?.name).toBe('Wizard');
      expect(paladin?.name).toBe('Paladin');
    });

    it('should return undefined for invalid ID', async () => {
      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      const result = manager.getClass('invalid-class');

      expect(result).toBeUndefined();
    });

    it('should return undefined for empty string ID', async () => {
      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      const result = manager.getClass('');

      expect(result).toBeUndefined();
    });
  });

  describe('classExists', () => {
    it('should return true for existing class', async () => {
      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      expect(manager.classExists('adventurer')).toBe(true);
      expect(manager.classExists('fighter')).toBe(true);
      expect(manager.classExists('paladin')).toBe(true);
    });

    it('should return false for non-existing class', async () => {
      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      expect(manager.classExists('unknown-class')).toBe(false);
      expect(manager.classExists('')).toBe(false);
    });
  });

  describe('getClassName', () => {
    it('should return class name for valid ID', async () => {
      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      expect(manager.getClassName('adventurer')).toBe('Adventurer');
      expect(manager.getClassName('fighter')).toBe('Fighter');
      expect(manager.getClassName('magic_user')).toBe('Magic User');
      expect(manager.getClassName('paladin')).toBe('Paladin');
    });

    it('should return the ID itself for invalid class ID', async () => {
      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      expect(manager.getClassName('unknown')).toBe('unknown');
      expect(manager.getClassName('invalid-class')).toBe('invalid-class');
    });
  });

  describe('getClassTier', () => {
    it('should return correct tier for each class', async () => {
      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      expect(manager.getClassTier('adventurer')).toBe(0);
      expect(manager.getClassTier('fighter')).toBe(1);
      expect(manager.getClassTier('magic_user')).toBe(1);
      expect(manager.getClassTier('thief')).toBe(1);
      expect(manager.getClassTier('healer')).toBe(1);
      expect(manager.getClassTier('paladin')).toBe(2);
      expect(manager.getClassTier('wizard')).toBe(2);
    });

    it('should return 0 for invalid class ID', async () => {
      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      expect(manager.getClassTier('unknown')).toBe(0);
    });
  });

  describe('getTier1Classes', () => {
    it('should return only tier 1 classes', async () => {
      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      const tier1 = manager.getTier1Classes();

      expect(tier1).toHaveLength(4);
      expect(tier1.every((c) => c.tier === 1)).toBe(true);
    });
  });

  describe('getTier2Classes', () => {
    it('should return only tier 2 classes', async () => {
      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      const tier2 = manager.getTier2Classes();

      expect(tier2).toHaveLength(12);
      expect(tier2.every((c) => c.tier === 2)).toBe(true);
    });
  });

  describe('getAvailableAdvancements', () => {
    it('should return correct options for adventurer', async () => {
      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      const advancements = manager.getAvailableAdvancements('adventurer');

      expect(advancements).toHaveLength(4);
      expect(advancements.map((a) => a.id).sort()).toEqual([
        'fighter',
        'healer',
        'magic_user',
        'thief',
      ]);
    });

    it('should return correct options for fighter', async () => {
      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      const advancements = manager.getAvailableAdvancements('fighter');

      expect(advancements).toHaveLength(3);
      expect(advancements.map((a) => a.id).sort()).toEqual(['berserker', 'knight', 'paladin']);
    });

    it('should return correct options for magic_user', async () => {
      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      const advancements = manager.getAvailableAdvancements('magic_user');

      expect(advancements).toHaveLength(3);
      expect(advancements.map((a) => a.id).sort()).toEqual([
        'elementalist',
        'necromancer',
        'wizard',
      ]);
    });

    it('should return correct options for thief', async () => {
      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      const advancements = manager.getAvailableAdvancements('thief');

      expect(advancements).toHaveLength(3);
      expect(advancements.map((a) => a.id).sort()).toEqual(['assassin', 'ranger', 'shadow']);
    });

    it('should return correct options for healer', async () => {
      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      const advancements = manager.getAvailableAdvancements('healer');

      expect(advancements).toHaveLength(3);
      expect(advancements.map((a) => a.id).sort()).toEqual(['cleric', 'druid', 'shaman']);
    });

    it('should return empty array for tier 2 classes (no further advancement)', async () => {
      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      expect(manager.getAvailableAdvancements('paladin')).toHaveLength(0);
      expect(manager.getAvailableAdvancements('wizard')).toHaveLength(0);
      expect(manager.getAvailableAdvancements('assassin')).toHaveLength(0);
    });

    it('should return empty array for invalid class ID', async () => {
      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      const advancements = manager.getAvailableAdvancements('unknown');

      expect(advancements).toHaveLength(0);
    });
  });

  describe('canAdvanceToClass', () => {
    describe('level requirements', () => {
      it('should reject when level too low for tier 1', async () => {
        const manager = ClassManager.getInstance();
        await manager.ensureInitialized();

        const user = createMockUser({ level: 3, classId: 'adventurer' });
        const result = manager.canAdvanceToClass(user, 'fighter', true, 'fighter_trainer');

        expect(result.canAdvance).toBe(false);
        expect(result.reason).toContain('level 5');
        expect(result.reason).toContain('level 3');
      });

      it('should reject when level too low for tier 2', async () => {
        const manager = ClassManager.getInstance();
        await manager.ensureInitialized();

        const user = createMockUser({
          level: 10,
          classId: 'fighter',
          questFlags: ['paladin_trial'],
        });
        const result = manager.canAdvanceToClass(user, 'paladin', true, 'paladin_trainer');

        expect(result.canAdvance).toBe(false);
        expect(result.reason).toContain('level 15');
      });

      it('should allow advancement when level meets requirement', async () => {
        const manager = ClassManager.getInstance();
        await manager.ensureInitialized();

        const user = createMockUser({ level: 5, classId: 'adventurer' });
        const result = manager.canAdvanceToClass(user, 'fighter', true, 'fighter_trainer');

        expect(result.canAdvance).toBe(true);
      });
    });

    describe('previous class requirements', () => {
      it('should reject when wrong previous class for tier 1', async () => {
        const manager = ClassManager.getInstance();
        await manager.ensureInitialized();

        const user = createMockUser({ level: 5, classId: 'fighter' });
        const result = manager.canAdvanceToClass(user, 'magic_user', true, 'mage_trainer');

        expect(result.canAdvance).toBe(false);
        expect(result.reason).toContain('Adventurer');
      });

      it('should reject when wrong previous class for tier 2', async () => {
        const manager = ClassManager.getInstance();
        await manager.ensureInitialized();

        const user = createMockUser({
          level: 15,
          classId: 'thief',
          questFlags: ['wizard_trial'],
        });
        const result = manager.canAdvanceToClass(user, 'wizard', true, 'wizard_trainer');

        expect(result.canAdvance).toBe(false);
        expect(result.reason).toContain('Magic User');
      });

      it('should reject when current class cannot advance to target', async () => {
        const manager = ClassManager.getInstance();
        await manager.ensureInitialized();

        // Fighter cannot become wizard (needs magic_user first)
        const user = createMockUser({
          level: 15,
          classId: 'fighter',
          questFlags: ['wizard_trial'],
        });
        const result = manager.canAdvanceToClass(user, 'wizard', true, 'wizard_trainer');

        expect(result.canAdvance).toBe(false);
      });

      it('should use adventurer as default when classId is undefined', async () => {
        const manager = ClassManager.getInstance();
        await manager.ensureInitialized();

        const user = createMockUser({ level: 5, classId: undefined });
        const result = manager.canAdvanceToClass(user, 'fighter', true, 'fighter_trainer');

        expect(result.canAdvance).toBe(true);
      });
    });

    describe('trainer requirements', () => {
      it('should reject when no trainer NPC present', async () => {
        const manager = ClassManager.getInstance();
        await manager.ensureInitialized();

        const user = createMockUser({ level: 5, classId: 'adventurer' });
        const result = manager.canAdvanceToClass(user, 'fighter', false); // No trainer

        expect(result.canAdvance).toBe(false);
        expect(result.reason).toContain('trainer');
      });

      it('should reject when wrong trainer type', async () => {
        const manager = ClassManager.getInstance();
        await manager.ensureInitialized();

        const user = createMockUser({ level: 5, classId: 'adventurer' });
        const result = manager.canAdvanceToClass(user, 'fighter', true, 'mage_trainer'); // Wrong trainer

        expect(result.canAdvance).toBe(false);
        expect(result.reason).toContain('cannot teach');
      });

      it('should allow when correct trainer type', async () => {
        const manager = ClassManager.getInstance();
        await manager.ensureInitialized();

        const user = createMockUser({ level: 5, classId: 'adventurer' });
        const result = manager.canAdvanceToClass(user, 'fighter', true, 'fighter_trainer');

        expect(result.canAdvance).toBe(true);
      });
    });

    describe('quest flag requirements (tier 2)', () => {
      it('should reject when missing quest flag', async () => {
        const manager = ClassManager.getInstance();
        await manager.ensureInitialized();

        const user = createMockUser({
          level: 15,
          classId: 'fighter',
          questFlags: [], // No flags
        });
        const result = manager.canAdvanceToClass(user, 'paladin', true, 'paladin_trainer');

        expect(result.canAdvance).toBe(false);
        expect(result.reason).toContain('trial quest');
      });

      it('should allow when quest flag is present', async () => {
        const manager = ClassManager.getInstance();
        await manager.ensureInitialized();

        const user = createMockUser({
          level: 15,
          classId: 'fighter',
          questFlags: ['paladin_trial'],
        });
        const result = manager.canAdvanceToClass(user, 'paladin', true, 'paladin_trainer');

        expect(result.canAdvance).toBe(true);
      });

      it('should handle undefined questFlags array', async () => {
        const manager = ClassManager.getInstance();
        await manager.ensureInitialized();

        const user = createMockUser({
          level: 15,
          classId: 'fighter',
          questFlags: undefined,
        });
        const result = manager.canAdvanceToClass(user, 'paladin', true, 'paladin_trainer');

        expect(result.canAdvance).toBe(false);
        expect(result.reason).toContain('trial quest');
      });
    });

    describe('non-existent class', () => {
      it('should reject advancement to non-existent class', async () => {
        const manager = ClassManager.getInstance();
        await manager.ensureInitialized();

        const user = createMockUser({ level: 15, classId: 'fighter' });
        const result = manager.canAdvanceToClass(user, 'dragon_rider', true, 'dragon_trainer');

        expect(result.canAdvance).toBe(false);
        expect(result.reason).toContain('does not exist');
      });
    });

    describe('successful advancement scenarios', () => {
      it('should allow tier 1 advancement with all requirements met', async () => {
        const manager = ClassManager.getInstance();
        await manager.ensureInitialized();

        const user = createMockUser({ level: 5, classId: 'adventurer' });

        // All tier 1 classes should be accessible
        expect(manager.canAdvanceToClass(user, 'fighter', true, 'fighter_trainer').canAdvance).toBe(
          true
        );
        expect(manager.canAdvanceToClass(user, 'magic_user', true, 'mage_trainer').canAdvance).toBe(
          true
        );
        expect(manager.canAdvanceToClass(user, 'thief', true, 'thief_trainer').canAdvance).toBe(
          true
        );
        expect(manager.canAdvanceToClass(user, 'healer', true, 'healer_trainer').canAdvance).toBe(
          true
        );
      });

      it('should allow tier 2 advancement with all requirements met', async () => {
        const manager = ClassManager.getInstance();
        await manager.ensureInitialized();

        const user = createMockUser({
          level: 15,
          classId: 'fighter',
          questFlags: ['paladin_trial', 'berserker_trial', 'knight_trial'],
        });

        expect(manager.canAdvanceToClass(user, 'paladin', true, 'paladin_trainer').canAdvance).toBe(
          true
        );
        expect(
          manager.canAdvanceToClass(user, 'berserker', true, 'berserker_trainer').canAdvance
        ).toBe(true);
        expect(manager.canAdvanceToClass(user, 'knight', true, 'knight_trainer').canAdvance).toBe(
          true
        );
      });
    });
  });

  describe('getClassStatBonuses', () => {
    it('should return stat bonuses for valid class', async () => {
      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      const fighterBonuses = manager.getClassStatBonuses('fighter');
      const wizardBonuses = manager.getClassStatBonuses('wizard');

      expect(fighterBonuses).toEqual({ maxHealth: 20, maxMana: 0, attack: 5, defense: 3 });
      expect(wizardBonuses).toEqual({ maxHealth: 5, maxMana: 60, attack: 8, defense: 1 });
    });

    it('should return null for invalid class', async () => {
      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      const result = manager.getClassStatBonuses('unknown');

      expect(result).toBeNull();
    });
  });

  describe('getTotalClassBonuses', () => {
    it('should sum bonuses from class history', async () => {
      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      // adventurer -> fighter -> paladin
      const classHistory = ['adventurer', 'fighter', 'paladin'];
      const totals = manager.getTotalClassBonuses(classHistory);

      // adventurer: 0/0/0/0, fighter: 20/0/5/3, paladin: 30/15/7/8
      expect(totals).toEqual({
        maxHealth: 50, // 0 + 20 + 30
        maxMana: 15, // 0 + 0 + 15
        attack: 12, // 0 + 5 + 7
        defense: 11, // 0 + 3 + 8
      });
    });

    it('should return zeros for empty history', async () => {
      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      const totals = manager.getTotalClassBonuses([]);

      expect(totals).toEqual({ maxHealth: 0, maxMana: 0, attack: 0, defense: 0 });
    });

    it('should skip invalid class IDs in history', async () => {
      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      const classHistory = ['adventurer', 'unknown', 'fighter'];
      const totals = manager.getTotalClassBonuses(classHistory);

      // adventurer: 0/0/0/0, unknown: skipped, fighter: 20/0/5/3
      expect(totals).toEqual({ maxHealth: 20, maxMana: 0, attack: 5, defense: 3 });
    });
  });

  describe('error handling', () => {
    it('should handle repository errors gracefully', async () => {
      mockRepository.findAll.mockRejectedValue(new Error('Database connection failed'));

      const manager = ClassManager.getInstance();
      await manager.ensureInitialized();

      const classes = manager.getAllClasses();

      expect(classes).toHaveLength(0);
    });
  });

  describe('ensureInitialized', () => {
    it('should be idempotent - multiple calls do not reload', async () => {
      const manager = ClassManager.getInstance();

      await manager.ensureInitialized();
      await manager.ensureInitialized();
      await manager.ensureInitialized();

      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });
});
