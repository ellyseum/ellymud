/**
 * Unit tests for BreakCommand
 * @module command/commands/break.command.test
 */

import { BreakCommand } from './break.command';
import { CombatSystem } from '../../combat/combatSystem';
import { UserManager } from '../../user/userManager';
import {
  createMockUser,
  createMockClient,
  createMockUserManager,
} from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  getPlayerLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.mock('../../utils/stateInterruption', () => ({
  clearRestingMeditating: jest.fn(),
}));

import { writeToClient } from '../../utils/socketWriter';
import { clearRestingMeditating } from '../../utils/stateInterruption';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;
const mockClearRestingMeditating = clearRestingMeditating as jest.MockedFunction<
  typeof clearRestingMeditating
>;

// Mock managers
const createMockCombatSystem = (): CombatSystem =>
  ({
    breakCombat: jest.fn(),
  }) as unknown as CombatSystem;

describe('BreakCommand', () => {
  let breakCommand: BreakCommand;
  let mockCombatSystem: CombatSystem;
  let mockUserManager: UserManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCombatSystem = createMockCombatSystem();
    mockUserManager = createMockUserManager();
    breakCommand = new BreakCommand(mockCombatSystem, mockUserManager);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(breakCommand.name).toBe('break');
    });

    it('should have a description', () => {
      expect(breakCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      breakCommand.execute(client, '');

      expect(mockCombatSystem.breakCombat).not.toHaveBeenCalled();
    });

    it('should break combat if in combat', () => {
      const client = createMockClient({
        user: createMockUser({ inCombat: true }),
      });

      breakCommand.execute(client, '');

      expect(mockCombatSystem.breakCombat).toHaveBeenCalledWith(client);
    });

    it('should stop resting if resting', () => {
      const client = createMockClient({
        user: createMockUser({ isResting: true }),
      });

      breakCommand.execute(client, '');

      expect(mockClearRestingMeditating).toHaveBeenCalledWith(client, 'movement', true);
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('stop resting')
      );
    });

    it('should stop meditating if meditating', () => {
      const client = createMockClient({
        user: createMockUser({ isMeditating: true }),
      });

      breakCommand.execute(client, '');

      expect(mockClearRestingMeditating).toHaveBeenCalledWith(client, 'movement', true);
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('stop meditating')
      );
    });

    it('should handle both resting and meditating', () => {
      const client = createMockClient({
        user: createMockUser({ isResting: true, isMeditating: true }),
      });

      breakCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledTimes(2);
    });

    it('should silently succeed if nothing to break', () => {
      const client = createMockClient({
        user: createMockUser({ inCombat: false, isResting: false, isMeditating: false }),
      });

      breakCommand.execute(client, '');

      expect(mockCombatSystem.breakCombat).not.toHaveBeenCalled();
      expect(mockClearRestingMeditating).not.toHaveBeenCalled();
    });
  });
});
