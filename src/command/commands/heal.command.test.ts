/**
 * Unit tests for HealCommand
 * @module command/commands/heal.command.test
 */

import { HealCommand } from './heal.command';
import {
  createMockClient,
  createMockUser,
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
  getPlayerLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { writeToClient } from '../../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('HealCommand', () => {
  let healCommand: HealCommand;
  let mockUserManager: ReturnType<typeof createMockUserManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserManager = createMockUserManager();
    healCommand = new HealCommand(mockUserManager);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(healCommand.name).toBe('heal');
    });

    it('should have a description', () => {
      expect(healCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      healCommand.execute(client, '10');

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should show error for zero amount', () => {
      const client = createMockClient({
        user: createMockUser({ health: 50, maxHealth: 100 }),
      });

      healCommand.execute(client, '0');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('positive amount')
      );
    });

    it('should show error for negative amount', () => {
      const client = createMockClient({
        user: createMockUser({ health: 50, maxHealth: 100 }),
      });

      healCommand.execute(client, '-10');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('positive amount')
      );
    });

    it('should show error for non-numeric amount', () => {
      const client = createMockClient({
        user: createMockUser({ health: 50, maxHealth: 100 }),
      });

      healCommand.execute(client, 'abc');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('positive amount')
      );
    });

    it('should heal the user', () => {
      const user = createMockUser({ username: 'testuser', health: 50, maxHealth: 100 });
      const client = createMockClient({ user });

      healCommand.execute(client, '20');

      expect(user.health).toBe(70);
      expect(mockUserManager.updateUserStats).toHaveBeenCalledWith('testuser', { health: 70 });
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('healed for 20 hitpoints')
      );
    });

    it('should not heal beyond max health', () => {
      const user = createMockUser({ username: 'testuser', health: 90, maxHealth: 100 });
      const client = createMockClient({ user });

      healCommand.execute(client, '50');

      expect(user.health).toBe(100);
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('healed for 10 hitpoints')
      );
    });

    it('should show message when already at full health', () => {
      const user = createMockUser({ username: 'testuser', health: 100, maxHealth: 100 });
      const client = createMockClient({ user });

      healCommand.execute(client, '20');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('already at full health')
      );
    });

    it('should revive unconscious player', () => {
      const user = createMockUser({
        username: 'testuser',
        health: 0,
        maxHealth: 100,
        isUnconscious: true,
      });
      const client = createMockClient({ user });

      healCommand.execute(client, '50');

      expect(user.health).toBe(50);
      expect(user.isUnconscious).toBe(false);
      expect(mockUserManager.updateUserStats).toHaveBeenCalledWith('testuser', {
        health: 50,
        isUnconscious: false,
      });
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('regained consciousness')
      );
    });
  });
});
