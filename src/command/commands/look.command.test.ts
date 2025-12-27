/**
 * Unit tests for LookCommand
 * @module command/commands/look.command.test
 */

import { LookCommand } from './look.command';
import { ConnectedClient } from '../../types';
import { createMockUser, createMockClient } from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
  writeFormattedMessageToClient: jest.fn(),
}));

jest.mock('../../utils/formatters', () => ({
  formatUsername: jest.fn(
    (username: string) => username.charAt(0).toUpperCase() + username.slice(1)
  ),
}));

jest.mock('../../utils/logger', () => ({
  getPlayerLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

jest.mock('../../room/roomManager', () => ({
  RoomManager: {
    getInstance: jest.fn().mockReturnValue({
      getRoom: jest.fn().mockReturnValue({
        id: 'test-room',
        name: 'Test Room',
        getExit: jest.fn(),
        getDescriptionForPeeking: jest.fn().mockReturnValue('You peek into the room.\r\n'),
        players: [],
      }),
      getStartingRoomId: jest.fn().mockReturnValue('start'),
      lookRoom: jest.fn(),
      lookAtEntity: jest.fn(),
    }),
  },
}));

import { writeToClient } from '../../utils/socketWriter';
import { RoomManager as MockedRoomManager } from '../../room/roomManager';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('LookCommand', () => {
  let lookCommand: LookCommand;
  let clients: Map<string, ConnectedClient>;
  let mockRoomManager: ReturnType<typeof MockedRoomManager.getInstance>;

  beforeEach(() => {
    jest.clearAllMocks();
    clients = new Map();
    mockRoomManager = MockedRoomManager.getInstance(clients);
    lookCommand = new LookCommand(clients);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(lookCommand.name).toBe('look');
    });

    it('should have aliases', () => {
      expect(lookCommand.aliases).toContain('l');
      expect(lookCommand.aliases).toContain('examine');
    });

    it('should have a description', () => {
      expect(lookCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should return early if client has no user', () => {
      const client = createMockClient({ user: null });

      lookCommand.execute(client, '');

      expect(mockRoomManager.lookRoom).not.toHaveBeenCalled();
    });

    it('should call lookRoom when no args', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      lookCommand.execute(client, '');

      expect(mockRoomManager.lookRoom).toHaveBeenCalledWith(client);
    });

    it('should look in direction when given direction', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      lookCommand.execute(client, 'north');

      // When no exit exists, should show "don't see anything"
      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should handle abbreviated directions', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      lookCommand.execute(client, 'n');

      // When no exit exists, should show a message
      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should look at entity when given non-direction arg', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      lookCommand.execute(client, 'sword');

      expect(mockRoomManager.lookAtEntity).toHaveBeenCalledWith(client, 'sword');
    });

    it('should parse "look at entity" patterns', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      lookCommand.execute(client, 'at sword');

      expect(mockRoomManager.lookAtEntity).toHaveBeenCalledWith(client, 'sword');
    });

    it('should parse "look in container" patterns', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      lookCommand.execute(client, 'in chest');

      expect(mockRoomManager.lookAtEntity).toHaveBeenCalledWith(client, 'chest');
    });

    it('should handle invalid direction gracefully', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      lookCommand.execute(client, 'north');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining("don't see anything")
      );
    });
  });
});
