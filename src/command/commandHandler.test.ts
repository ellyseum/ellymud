/**
 * Unit tests for CommandHandler
 * @module command/commandHandler.test
 */

import { CommandHandler } from './commandHandler';
import { ConnectedClient } from '../types';
import {
  createMockClient,
  createMockUser,
  createMockUserManager,
  createMockRoomManager,
} from '../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
  drawCommandPrompt: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  systemLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  getPlayerLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('../room/roomManager', () => ({
  RoomManager: {
    getInstance: jest.fn().mockReturnValue({
      briefLookRoom: jest.fn(),
    }),
  },
}));

jest.mock('../combat/combatSystem', () => ({
  CombatSystem: {
    getInstance: jest.fn().mockReturnValue({
      setAbilityManager: jest.fn(),
    }),
  },
}));

jest.mock('../timer/gameTimerManager', () => ({
  GameTimerManager: {
    getInstance: jest.fn().mockReturnValue({
      getCombatSystem: jest.fn().mockReturnValue({
        setAbilityManager: jest.fn(),
      }),
    }),
  },
}));

jest.mock('../effects/effectManager', () => ({
  EffectManager: {
    getInstance: jest.fn().mockReturnValue({}),
  },
}));

jest.mock('../abilities/abilityManager', () => ({
  AbilityManager: {
    getInstance: jest.fn().mockReturnValue({}),
  },
}));

// Mock the CommandRegistry
jest.mock('./commandRegistry', () => ({
  CommandRegistry: {
    getInstance: jest.fn().mockReturnValue({
      getCommand: jest.fn(),
      isDirectionCommand: jest.fn().mockReturnValue(false),
      executeCommand: jest.fn(),
    }),
  },
}));

// Mock the commands index
jest.mock('./commands', () => ({}));

import { writeToClient, drawCommandPrompt } from '../utils/socketWriter';
import { CommandRegistry } from './commandRegistry';

describe('CommandHandler', () => {
  let commandHandler: CommandHandler;
  let mockClients: Map<string, ConnectedClient>;
  let mockUserManager: ReturnType<typeof createMockUserManager>;
  let mockRoomManager: ReturnType<typeof createMockRoomManager>;
  let mockRegistry: jest.Mocked<{
    getCommand: jest.Mock;
    isDirectionCommand: jest.Mock;
    executeCommand: jest.Mock;
  }>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockClients = new Map<string, ConnectedClient>();
    mockUserManager = createMockUserManager();
    mockRoomManager = createMockRoomManager();
    (mockRoomManager as unknown as { briefLookRoom: jest.Mock }).briefLookRoom = jest.fn();

    // Get reference to the mock registry
    mockRegistry = (CommandRegistry.getInstance as jest.Mock).mock.results[0]?.value || {
      getCommand: jest.fn(),
      isDirectionCommand: jest.fn().mockReturnValue(false),
      executeCommand: jest.fn(),
    };
    (CommandRegistry.getInstance as jest.Mock).mockReturnValue(mockRegistry);

    commandHandler = new CommandHandler(
      mockClients,
      mockUserManager,
      mockRoomManager as never,
      undefined,
      undefined
    );
  });

  describe('handleCommand', () => {
    describe('basic command handling', () => {
      it('should return early if client has no user', () => {
        const client = createMockClient({ user: null });

        commandHandler.handleCommand(client, 'look');

        expect(mockRegistry.getCommand).not.toHaveBeenCalled();
      });

      it('should do brief look when empty command is entered', () => {
        const client = createMockClient({
          user: createMockUser(),
        });

        commandHandler.handleCommand(client, '');

        expect(drawCommandPrompt).toHaveBeenCalledWith(client);
      });

      it('should trim input before processing', () => {
        const client = createMockClient({
          user: createMockUser(),
        });
        const mockCommand = { execute: jest.fn() };
        mockRegistry.getCommand.mockReturnValue(mockCommand);

        commandHandler.handleCommand(client, '  look  ');

        expect(mockRegistry.getCommand).toHaveBeenCalledWith('look');
      });
    });

    describe('command history', () => {
      it('should add command to history', () => {
        const user = createMockUser();
        user.commandHistory = [];
        const client = createMockClient({ user });
        const mockCommand = { execute: jest.fn() };
        mockRegistry.getCommand.mockReturnValue(mockCommand);

        commandHandler.handleCommand(client, 'look');

        expect(user.commandHistory).toContain('look');
      });

      it('should not add commands with password to history', () => {
        const user = createMockUser();
        user.commandHistory = [];
        const client = createMockClient({ user });
        const mockCommand = { execute: jest.fn() };
        mockRegistry.getCommand.mockReturnValue(mockCommand);

        commandHandler.handleCommand(client, 'password secret123');

        expect(user.commandHistory).not.toContain('password secret123');
      });

      it('should limit history to 30 commands', () => {
        const user = createMockUser();
        user.commandHistory = Array(30).fill('old-command');
        const client = createMockClient({ user });
        const mockCommand = { execute: jest.fn() };
        mockRegistry.getCommand.mockReturnValue(mockCommand);

        commandHandler.handleCommand(client, 'new-command');

        expect(user.commandHistory.length).toBe(30);
        expect(user.commandHistory).toContain('new-command');
        expect(user.commandHistory[0]).toBe('old-command');
      });

      it('should reset history browsing state after command', () => {
        const user = createMockUser();
        user.commandHistory = ['old'];
        user.currentHistoryIndex = 2;
        user.savedCurrentCommand = 'saved';
        const client = createMockClient({ user });
        const mockCommand = { execute: jest.fn() };
        mockRegistry.getCommand.mockReturnValue(mockCommand);

        commandHandler.handleCommand(client, 'new');

        expect(user.currentHistoryIndex).toBe(-1);
        expect(user.savedCurrentCommand).toBe('');
      });
    });

    describe('repeat command (dot shortcut)', () => {
      it('should repeat the last command when . is entered', () => {
        const user = createMockUser();
        user.commandHistory = ['look'];
        const client = createMockClient({ user });
        const mockCommand = { execute: jest.fn() };
        mockRegistry.getCommand.mockReturnValue(mockCommand);

        commandHandler.handleCommand(client, '.');

        expect(writeToClient).toHaveBeenCalledWith(client, expect.stringContaining('Repeating:'));
        expect(mockRegistry.getCommand).toHaveBeenCalledWith('look');
      });

      it('should show error if no previous command exists', () => {
        const user = createMockUser();
        user.commandHistory = [];
        const client = createMockClient({ user });

        commandHandler.handleCommand(client, '.');

        expect(writeToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('No previous command')
        );
      });
    });

    describe('shortcuts', () => {
      it('should convert single quote to say command', () => {
        const user = createMockUser();
        const client = createMockClient({ user });
        const mockCommand = { execute: jest.fn() };
        mockRegistry.getCommand.mockReturnValue(mockCommand);

        commandHandler.handleCommand(client, "'hello world");

        expect(mockRegistry.getCommand).toHaveBeenCalledWith('say');
        expect(mockCommand.execute).toHaveBeenCalledWith(client, 'hello world');
      });

      it('should convert double quote to yell command', () => {
        const user = createMockUser();
        const client = createMockClient({ user });
        const mockCommand = { execute: jest.fn() };
        mockRegistry.getCommand.mockReturnValue(mockCommand);

        commandHandler.handleCommand(client, '"hello world');

        expect(mockRegistry.getCommand).toHaveBeenCalledWith('yell');
        expect(mockCommand.execute).toHaveBeenCalledWith(client, 'hello world');
      });

      it('should not convert single quote without text', () => {
        const user = createMockUser();
        const client = createMockClient({ user });

        commandHandler.handleCommand(client, "'");

        // Single quote alone should be treated as a command, not a shortcut
        expect(mockRegistry.getCommand).toHaveBeenCalledWith("'");
      });
    });

    describe('unconscious player restrictions', () => {
      it('should block movement commands for unconscious players', () => {
        const user = createMockUser();
        user.isUnconscious = true;
        const client = createMockClient({ user });

        commandHandler.handleCommand(client, 'north');

        expect(writeToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('unconscious and cannot perform')
        );
        expect(mockRegistry.getCommand).not.toHaveBeenCalled();
      });

      it('should allow non-restricted commands for unconscious players', () => {
        const user = createMockUser();
        user.isUnconscious = true;
        const client = createMockClient({ user });
        const mockCommand = { execute: jest.fn() };
        mockRegistry.getCommand.mockReturnValue(mockCommand);

        commandHandler.handleCommand(client, 'look');

        expect(mockCommand.execute).toHaveBeenCalled();
      });
    });

    describe('direction commands', () => {
      it('should handle direction commands via registry', () => {
        const user = createMockUser();
        const client = createMockClient({ user });
        mockRegistry.isDirectionCommand.mockReturnValue(true);

        commandHandler.handleCommand(client, 'n');

        expect(mockRegistry.executeCommand).toHaveBeenCalledWith(client, 'n');
        expect(drawCommandPrompt).toHaveBeenCalledWith(client);
      });
    });

    describe('command execution', () => {
      it('should execute found command', () => {
        const user = createMockUser({ username: 'testuser' });
        const client = createMockClient({ user });
        const mockCommand = { execute: jest.fn() };
        mockRegistry.getCommand.mockReturnValue(mockCommand);

        commandHandler.handleCommand(client, 'look');

        expect(mockCommand.execute).toHaveBeenCalledWith(client, '');
        expect(drawCommandPrompt).toHaveBeenCalledWith(client);
      });

      it('should pass arguments to command', () => {
        const user = createMockUser({ username: 'testuser' });
        const client = createMockClient({ user });
        const mockCommand = { execute: jest.fn() };
        mockRegistry.getCommand.mockReturnValue(mockCommand);

        commandHandler.handleCommand(client, 'say hello world');

        expect(mockCommand.execute).toHaveBeenCalledWith(client, 'hello world');
      });

      it('should handle command errors gracefully', () => {
        const user = createMockUser({ username: 'testuser' });
        const client = createMockClient({ user });
        const mockCommand = {
          execute: jest.fn().mockImplementation(() => {
            throw new Error('Test error');
          }),
        };
        mockRegistry.getCommand.mockReturnValue(mockCommand);

        // Should not throw
        expect(() => commandHandler.handleCommand(client, 'broken')).not.toThrow();
        expect(drawCommandPrompt).toHaveBeenCalledWith(client);
      });

      it('should delegate unknown commands to registry', () => {
        const user = createMockUser({ username: 'testuser' });
        const client = createMockClient({ user });
        mockRegistry.getCommand.mockReturnValue(null);

        commandHandler.handleCommand(client, 'unknowncommand');

        expect(mockRegistry.executeCommand).toHaveBeenCalledWith(client, 'unknowncommand');
        expect(drawCommandPrompt).toHaveBeenCalledWith(client);
      });
    });
  });

  describe('getCommandRegistry', () => {
    it('should return the command registry instance', () => {
      const registry = commandHandler.getCommandRegistry();

      expect(registry).toBe(mockRegistry);
    });
  });
});
