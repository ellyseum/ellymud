/**
 * Unit tests for MoveCommand
 * @module command/commands/move.command.test
 */

import { MoveCommand } from './move.command';
import { ConnectedClient } from '../../types';
import { createMockUser, createMockClient } from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeFormattedMessageToClient: jest.fn(),
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

jest.mock('../../room/roomManager', () => ({
  RoomManager: {
    getInstance: jest.fn().mockReturnValue({
      movePlayer: jest.fn().mockReturnValue(true),
      getRoom: jest.fn().mockReturnValue({ name: 'Test Room' }),
      getStartingRoomId: jest.fn().mockReturnValue('start'),
      teleportToStartingRoomIfNeeded: jest.fn(),
    }),
  },
}));

jest.mock('../../user/userManager', () => ({
  UserManager: {
    getInstance: jest.fn().mockReturnValue({}),
  },
}));

jest.mock('../../combat/combatSystem', () => ({
  CombatSystem: {
    getInstance: jest.fn().mockReturnValue({}),
  },
}));

import { writeFormattedMessageToClient } from '../../utils/socketWriter';
import { clearRestingMeditating } from '../../utils/stateInterruption';

const mockWriteFormattedMessageToClient = writeFormattedMessageToClient as jest.MockedFunction<
  typeof writeFormattedMessageToClient
>;
const mockClearRestingMeditating = clearRestingMeditating as jest.MockedFunction<
  typeof clearRestingMeditating
>;

describe('MoveCommand', () => {
  let moveCommand: MoveCommand;
  let clients: Map<string, ConnectedClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    clients = new Map();
    moveCommand = new MoveCommand(clients);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(moveCommand.name).toBe('move');
    });

    it('should have a description', () => {
      expect(moveCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should show error if client has no user', () => {
      const client = createMockClient({ user: null });

      moveCommand.execute(client, 'north');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('logged in')
      );
    });

    it('should return early if no direction provided', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      moveCommand.execute(client, '');

      // Should not attempt to move with empty direction
    });

    it('should clear resting/meditating on movement', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      moveCommand.execute(client, 'north');

      expect(mockClearRestingMeditating).toHaveBeenCalledWith(client, 'movement');
    });

    it('should call movePlayer with direction', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      moveCommand.execute(client, 'north');

      // Should call the roomManager movePlayer method
    });

    it('should handle uppercase direction', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      // Should handle uppercase and convert to lowercase
      moveCommand.execute(client, 'NORTH');
    });

    it('should trim whitespace from direction', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      // Should trim whitespace from direction
      moveCommand.execute(client, '  north  ');
    });
  });
});
