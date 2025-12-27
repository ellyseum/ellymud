/**
 * Unit tests for DamageCommand
 * @module command/commands/damage.command.test
 */

import { DamageCommand } from './damage.command';
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

describe('DamageCommand', () => {
  let damageCommand: DamageCommand;
  let mockUserManager: ReturnType<typeof createMockUserManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserManager = createMockUserManager();
    damageCommand = new DamageCommand(mockUserManager);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(damageCommand.name).toBe('damage');
    });

    it('should have a description', () => {
      expect(damageCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      damageCommand.execute(client, '10');

      expect(mockWriteToClient).not.toHaveBeenCalled();
    });

    it('should show error for zero amount', () => {
      const client = createMockClient({
        user: createMockUser({ health: 50, maxHealth: 100 }),
      });

      damageCommand.execute(client, '0');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('positive amount')
      );
    });

    it('should show error for negative amount', () => {
      const client = createMockClient({
        user: createMockUser({ health: 50, maxHealth: 100 }),
      });

      damageCommand.execute(client, '-10');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('positive amount')
      );
    });

    it('should apply damage to the user', () => {
      const user = createMockUser({ username: 'testuser', health: 50, maxHealth: 100 });
      const client = createMockClient({ user });

      damageCommand.execute(client, '20');

      expect(user.health).toBe(30);
      expect(mockUserManager.updateUserStats).toHaveBeenCalledWith('testuser', { health: 30 });
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('taken 20 damage')
      );
    });

    it('should knock player unconscious when health drops to 0', () => {
      const user = createMockUser({
        username: 'testuser',
        health: 10,
        maxHealth: 100,
        isUnconscious: false,
      });
      const client = createMockClient({ user });

      damageCommand.execute(client, '10');

      expect(user.health).toBe(0);
      expect(user.isUnconscious).toBe(true);
      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('unconscious')
      );
    });

    it('should knock player unconscious when health goes below 0 but above -10', () => {
      const user = createMockUser({
        username: 'testuser',
        health: 10,
        maxHealth: 100,
        isUnconscious: false,
      });
      const client = createMockClient({ user });

      damageCommand.execute(client, '15');

      expect(user.health).toBe(-5);
      expect(user.isUnconscious).toBe(true);
    });

    it('should not become unconscious twice', () => {
      const user = createMockUser({
        username: 'testuser',
        health: -5,
        maxHealth: 100,
        isUnconscious: true,
      });
      const client = createMockClient({ user });

      damageCommand.execute(client, '2');

      expect(user.health).toBe(-7);
      // Should not call updateUserStats for isUnconscious since already unconscious
      expect(mockWriteToClient).not.toHaveBeenCalledWith(
        client,
        expect.stringContaining('unconscious')
      );
    });

    it('should kill player when health reaches -10', () => {
      const user = createMockUser({
        username: 'testuser',
        health: 5,
        maxHealth: 100,
      });
      const client = createMockClient({ user });

      damageCommand.execute(client, '20');

      expect(user.health).toBe(-10);
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('died'));
    });

    it('should not go below -10 health', () => {
      const user = createMockUser({
        username: 'testuser',
        health: 5,
        maxHealth: 100,
      });
      const client = createMockClient({ user });

      damageCommand.execute(client, '100');

      expect(user.health).toBe(-10);
    });

    it('should show avoided damage when already at -10', () => {
      const user = createMockUser({
        username: 'testuser',
        health: -10,
        maxHealth: 100,
      });
      const client = createMockClient({ user });

      damageCommand.execute(client, '10');

      expect(user.health).toBe(-10);
      expect(mockWriteToClient).toHaveBeenCalledWith(client, expect.stringContaining('avoided'));
    });
  });
});
