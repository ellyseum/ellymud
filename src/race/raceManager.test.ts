/**
 * Unit tests for RaceManager
 * Tests race loading, stat modifiers, and bonus calculations
 */

import { RaceManager } from './raceManager';
import { Race } from '../types';
import { IAsyncRaceRepository } from '../persistence/interfaces';
import { getRaceRepository } from '../persistence/RepositoryFactory';

// Mock dependencies
jest.mock('../persistence/RepositoryFactory', () => ({
  getRaceRepository: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  createContextLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Sample race data for testing (matches actual races.json structure)
const mockRaces: Race[] = [
  {
    id: 'human',
    name: 'Human',
    description: 'Humans are the most versatile of all races.',
    statModifiers: {
      strength: 0,
      dexterity: 0,
      agility: 0,
      constitution: 0,
      wisdom: 0,
      intelligence: 0,
      charisma: 0,
    },
    bonuses: {
      xpGain: 0.05,
    },
    bonusDescription: '+5% XP gain',
  },
  {
    id: 'elf',
    name: 'Elf',
    description: 'Elves are graceful beings with an innate connection to magic.',
    statModifiers: {
      strength: -1,
      dexterity: 2,
      agility: 0,
      constitution: -2,
      wisdom: 1,
      intelligence: 2,
      charisma: 0,
    },
    bonuses: {
      maxMana: 0.1,
    },
    bonusDescription: '+10% max mana',
  },
  {
    id: 'dwarf',
    name: 'Dwarf',
    description: 'Dwarves are stout and hardy folk.',
    statModifiers: {
      strength: 2,
      dexterity: -1,
      agility: -1,
      constitution: 3,
      wisdom: 1,
      intelligence: 0,
      charisma: -1,
    },
    bonuses: {
      maxHealth: 0.1,
    },
    bonusDescription: '+10% max health',
  },
  {
    id: 'halfling',
    name: 'Halfling',
    description: 'Halflings are small but nimble folk.',
    statModifiers: {
      strength: -2,
      dexterity: 3,
      agility: 2,
      constitution: -1,
      wisdom: 0,
      intelligence: 0,
      charisma: 2,
    },
    bonuses: {
      critChance: 0.05,
    },
    bonusDescription: '+5% critical hit chance',
  },
  {
    id: 'orc',
    name: 'Orc',
    description: 'Orcs are powerful and fierce warriors.',
    statModifiers: {
      strength: 3,
      dexterity: 0,
      agility: -1,
      constitution: 2,
      wisdom: -2,
      intelligence: -2,
      charisma: -1,
    },
    bonuses: {
      attack: 0.05,
    },
    bonusDescription: '+5% attack damage',
  },
];

// Create mock repository
const createMockRepository = (): jest.Mocked<IAsyncRaceRepository> => ({
  findAll: jest.fn().mockResolvedValue(mockRaces),
  findById: jest
    .fn()
    .mockImplementation((id: string) => Promise.resolve(mockRaces.find((r) => r.id === id))),
  save: jest.fn().mockResolvedValue(undefined),
  saveAll: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
});

describe('RaceManager', () => {
  let mockRepository: jest.Mocked<IAsyncRaceRepository>;

  beforeEach(() => {
    // Reset singleton
    RaceManager.resetInstance();
    jest.clearAllMocks();

    // Setup mock repository
    mockRepository = createMockRepository();

    // Make getRaceRepository return our mock
    (getRaceRepository as jest.Mock).mockReturnValue(mockRepository);
  });

  afterEach(() => {
    RaceManager.resetInstance();
  });

  describe('getInstance', () => {
    it('should return a RaceManager instance', async () => {
      const instance = RaceManager.getInstance();
      await instance.ensureInitialized();

      expect(instance).toBeInstanceOf(RaceManager);
    });

    it('should return the same instance on multiple calls (singleton pattern)', async () => {
      const instance1 = RaceManager.getInstance();
      const instance2 = RaceManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should load races from repository on initialization', async () => {
      const instance = RaceManager.getInstance();
      await instance.ensureInitialized();

      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAllRaces', () => {
    it('should return all 5 races', async () => {
      const manager = RaceManager.getInstance();
      await manager.ensureInitialized();

      const races = manager.getAllRaces();

      expect(races).toHaveLength(5);
      expect(races.map((r) => r.id)).toEqual(['human', 'elf', 'dwarf', 'halfling', 'orc']);
    });

    it('should return empty array when no races loaded', async () => {
      mockRepository.findAll.mockResolvedValue([]);
      const manager = RaceManager.getInstance();
      await manager.ensureInitialized();

      const races = manager.getAllRaces();

      expect(races).toHaveLength(0);
    });
  });

  describe('getRace', () => {
    it('should return correct race by ID', async () => {
      const manager = RaceManager.getInstance();
      await manager.ensureInitialized();

      const human = manager.getRace('human');
      const elf = manager.getRace('elf');
      const dwarf = manager.getRace('dwarf');

      expect(human?.name).toBe('Human');
      expect(elf?.name).toBe('Elf');
      expect(dwarf?.name).toBe('Dwarf');
    });

    it('should return undefined for invalid ID', async () => {
      const manager = RaceManager.getInstance();
      await manager.ensureInitialized();

      const result = manager.getRace('invalid-race');

      expect(result).toBeUndefined();
    });

    it('should return undefined for empty string ID', async () => {
      const manager = RaceManager.getInstance();
      await manager.ensureInitialized();

      const result = manager.getRace('');

      expect(result).toBeUndefined();
    });
  });

  describe('raceExists', () => {
    it('should return true for existing race', async () => {
      const manager = RaceManager.getInstance();
      await manager.ensureInitialized();

      expect(manager.raceExists('human')).toBe(true);
      expect(manager.raceExists('elf')).toBe(true);
      expect(manager.raceExists('orc')).toBe(true);
    });

    it('should return false for non-existing race', async () => {
      const manager = RaceManager.getInstance();
      await manager.ensureInitialized();

      expect(manager.raceExists('goblin')).toBe(false);
      expect(manager.raceExists('')).toBe(false);
    });
  });

  describe('getRaceName', () => {
    it('should return race name for valid ID', async () => {
      const manager = RaceManager.getInstance();
      await manager.ensureInitialized();

      expect(manager.getRaceName('human')).toBe('Human');
      expect(manager.getRaceName('elf')).toBe('Elf');
      expect(manager.getRaceName('dwarf')).toBe('Dwarf');
      expect(manager.getRaceName('halfling')).toBe('Halfling');
      expect(manager.getRaceName('orc')).toBe('Orc');
    });

    it('should return the ID itself for invalid race ID', async () => {
      const manager = RaceManager.getInstance();
      await manager.ensureInitialized();

      // When race doesn't exist, getRaceName returns the ID itself
      expect(manager.getRaceName('unknown')).toBe('unknown');
      expect(manager.getRaceName('invalid-race')).toBe('invalid-race');
    });
  });

  describe('getStatModifiers', () => {
    it('should return stat modifiers for valid race', async () => {
      const manager = RaceManager.getInstance();
      await manager.ensureInitialized();

      const humanMods = manager.getStatModifiers('human');
      const elfMods = manager.getStatModifiers('elf');
      const dwarfMods = manager.getStatModifiers('dwarf');

      // Human has all zeros
      expect(humanMods).toEqual({
        strength: 0,
        dexterity: 0,
        agility: 0,
        constitution: 0,
        wisdom: 0,
        intelligence: 0,
        charisma: 0,
      });

      // Elf has specific modifiers
      expect(elfMods).toEqual({
        strength: -1,
        dexterity: 2,
        agility: 0,
        constitution: -2,
        wisdom: 1,
        intelligence: 2,
        charisma: 0,
      });

      // Dwarf has specific modifiers
      expect(dwarfMods).toEqual({
        strength: 2,
        dexterity: -1,
        agility: -1,
        constitution: 3,
        wisdom: 1,
        intelligence: 0,
        charisma: -1,
      });
    });

    it('should return null for invalid race ID', async () => {
      const manager = RaceManager.getInstance();
      await manager.ensureInitialized();

      const result = manager.getStatModifiers('invalid-race');

      expect(result).toBeNull();
    });
  });

  describe('getRaceBonuses', () => {
    it('should return bonuses object for valid race', async () => {
      const manager = RaceManager.getInstance();
      await manager.ensureInitialized();

      const humanBonuses = manager.getRaceBonuses('human');
      const elfBonuses = manager.getRaceBonuses('elf');
      const dwarfBonuses = manager.getRaceBonuses('dwarf');
      const halflingBonuses = manager.getRaceBonuses('halfling');
      const orcBonuses = manager.getRaceBonuses('orc');

      expect(humanBonuses).toEqual({ xpGain: 0.05 });
      expect(elfBonuses).toEqual({ maxMana: 0.1 });
      expect(dwarfBonuses).toEqual({ maxHealth: 0.1 });
      expect(halflingBonuses).toEqual({ critChance: 0.05 });
      expect(orcBonuses).toEqual({ attack: 0.05 });
    });

    it('should return null for invalid race ID', async () => {
      const manager = RaceManager.getInstance();
      await manager.ensureInitialized();

      const result = manager.getRaceBonuses('invalid-race');

      expect(result).toBeNull();
    });
  });

  describe('applyStatModifiers', () => {
    const baseStats = {
      strength: 10,
      dexterity: 10,
      agility: 10,
      constitution: 10,
      wisdom: 10,
      intelligence: 10,
      charisma: 10,
    };

    it('should correctly modify user stats for human (no changes)', async () => {
      const manager = RaceManager.getInstance();
      await manager.ensureInitialized();

      const result = manager.applyStatModifiers(baseStats, 'human');

      expect(result).toEqual(baseStats);
    });

    it('should correctly modify user stats for elf', async () => {
      const manager = RaceManager.getInstance();
      await manager.ensureInitialized();

      const result = manager.applyStatModifiers(baseStats, 'elf');

      expect(result).toEqual({
        strength: 9, // -1
        dexterity: 12, // +2
        agility: 10, // +0
        constitution: 8, // -2
        wisdom: 11, // +1
        intelligence: 12, // +2
        charisma: 10, // +0
      });
    });

    it('should correctly modify user stats for dwarf', async () => {
      const manager = RaceManager.getInstance();
      await manager.ensureInitialized();

      const result = manager.applyStatModifiers(baseStats, 'dwarf');

      expect(result).toEqual({
        strength: 12, // +2
        dexterity: 9, // -1
        agility: 9, // -1
        constitution: 13, // +3
        wisdom: 11, // +1
        intelligence: 10, // +0
        charisma: 9, // -1
      });
    });

    it('should correctly modify user stats for orc', async () => {
      const manager = RaceManager.getInstance();
      await manager.ensureInitialized();

      const result = manager.applyStatModifiers(baseStats, 'orc');

      expect(result).toEqual({
        strength: 13, // +3
        dexterity: 10, // +0
        agility: 9, // -1
        constitution: 12, // +2
        wisdom: 8, // -2
        intelligence: 8, // -2
        charisma: 9, // -1
      });
    });

    it('should return unchanged stats for invalid race ID', async () => {
      const manager = RaceManager.getInstance();
      await manager.ensureInitialized();

      const result = manager.applyStatModifiers(baseStats, 'invalid-race');

      expect(result).toEqual(baseStats);
    });
  });

  describe('applyXpBonus', () => {
    it('should apply XP bonus for human (+5%)', async () => {
      const manager = RaceManager.getInstance();
      await manager.ensureInitialized();

      const baseXp = 100;
      const result = manager.applyXpBonus(baseXp, 'human');

      expect(result).toBe(105); // 100 * 1.05 = 105
    });

    it('should return base XP for race without XP bonus', async () => {
      const manager = RaceManager.getInstance();
      await manager.ensureInitialized();

      const baseXp = 100;
      const result = manager.applyXpBonus(baseXp, 'elf');

      expect(result).toBe(100); // Elf has maxMana bonus, not xpGain
    });

    it('should return base XP for invalid race', async () => {
      const manager = RaceManager.getInstance();
      await manager.ensureInitialized();

      const baseXp = 100;
      const result = manager.applyXpBonus(baseXp, 'invalid-race');

      expect(result).toBe(100);
    });
  });

  describe('applyHealthBonus', () => {
    it('should apply health bonus for dwarf (+10%)', async () => {
      const manager = RaceManager.getInstance();
      await manager.ensureInitialized();

      const baseHealth = 100;
      const result = manager.applyHealthBonus(baseHealth, 'dwarf');

      expect(result).toBe(110); // 100 * 1.10 = 110
    });

    it('should return base health for race without health bonus', async () => {
      const manager = RaceManager.getInstance();
      await manager.ensureInitialized();

      const baseHealth = 100;
      const result = manager.applyHealthBonus(baseHealth, 'human');

      expect(result).toBe(100); // Human has xpGain bonus, not maxHealth
    });

    it('should return base health for invalid race', async () => {
      const manager = RaceManager.getInstance();
      await manager.ensureInitialized();

      const baseHealth = 100;
      const result = manager.applyHealthBonus(baseHealth, 'invalid-race');

      expect(result).toBe(100);
    });
  });

  describe('applyManaBonus', () => {
    it('should apply mana bonus for elf (+10%)', async () => {
      const manager = RaceManager.getInstance();
      await manager.ensureInitialized();

      const baseMana = 100;
      const result = manager.applyManaBonus(baseMana, 'elf');

      expect(result).toBe(110); // 100 * 1.10 = 110
    });

    it('should return base mana for race without mana bonus', async () => {
      const manager = RaceManager.getInstance();
      await manager.ensureInitialized();

      const baseMana = 100;
      const result = manager.applyManaBonus(baseMana, 'dwarf');

      expect(result).toBe(100); // Dwarf has maxHealth bonus, not maxMana
    });

    it('should return base mana for invalid race', async () => {
      const manager = RaceManager.getInstance();
      await manager.ensureInitialized();

      const baseMana = 100;
      const result = manager.applyManaBonus(baseMana, 'invalid-race');

      expect(result).toBe(100);
    });
  });

  describe('error handling', () => {
    it('should handle repository errors gracefully', async () => {
      mockRepository.findAll.mockRejectedValue(new Error('Database connection failed'));

      const manager = RaceManager.getInstance();
      await manager.ensureInitialized();

      const races = manager.getAllRaces();

      expect(races).toHaveLength(0);
    });
  });

  describe('ensureInitialized', () => {
    it('should be idempotent - multiple calls do not reload', async () => {
      const manager = RaceManager.getInstance();

      await manager.ensureInitialized();
      await manager.ensureInitialized();
      await manager.ensureInitialized();

      // Repository should only be called once during initialization
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });
});
