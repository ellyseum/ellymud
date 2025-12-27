/**
 * Unit tests for CommandHandler
 * @module utils/commandHandler.test
 */

import { CommandHandler } from './commandHandler';
import { ConnectedClient } from '../types';
import { RoomManager } from '../room/roomManager';
import { UserManager } from '../user/userManager';
import { CombatSystem } from '../combat/combatSystem';
import { CommandRegistry } from '../command/commandRegistry';
import { SudoCommand } from '../command/commands/sudo.command';
import { Room } from '../room/room';
import { createMockUser, createMockClient } from '../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../room/roomManager');
jest.mock('../user/userManager');
jest.mock('../combat/combatSystem');
jest.mock('../command/commandRegistry');
jest.mock('../command/commands/sudo.command');

jest.mock('./socketWriter', () => ({
  writeToClient: jest.fn(),
  writeFormattedMessageToClient: jest.fn(),
}));

jest.mock('./colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

import { writeToClient, writeFormattedMessageToClient } from './socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;
const mockWriteFormattedMessageToClient = writeFormattedMessageToClient as jest.MockedFunction<
  typeof writeFormattedMessageToClient
>;

describe('CommandHandler', () => {
  let commandHandler: CommandHandler;
  let mockRoomManager: jest.Mocked<RoomManager>;
  let mockUserManager: jest.Mocked<UserManager>;
  let mockCombatSystem: jest.Mocked<CombatSystem>;
  let mockCommandRegistry: jest.Mocked<CommandRegistry>;
  let mockSudoCommand: jest.Mocked<SudoCommand>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocked dependencies
    mockRoomManager = {
      getRoom: jest.fn(),
    } as unknown as jest.Mocked<RoomManager>;

    mockUserManager = {
      getUser: jest.fn(),
      updateUserStats: jest.fn(),
    } as unknown as jest.Mocked<UserManager>;

    // Mock CombatSystem singleton
    mockCombatSystem = {
      getInstance: jest.fn(),
      isInCombat: jest.fn().mockReturnValue(false),
      engageCombat: jest.fn().mockReturnValue(true),
      createTestNPC: jest.fn(),
    } as unknown as jest.Mocked<CombatSystem>;

    (CombatSystem.getInstance as jest.Mock).mockReturnValue(mockCombatSystem);

    // Mock CommandRegistry
    mockCommandRegistry = {
      executeCommand: jest.fn(),
      getCommand: jest.fn(),
    } as unknown as jest.Mocked<CommandRegistry>;

    // Mock SudoCommand
    mockSudoCommand = {
      isAuthorized: jest.fn(),
    } as unknown as jest.Mocked<SudoCommand>;

    commandHandler = new CommandHandler(mockRoomManager, mockUserManager);
  });

  describe('constructor', () => {
    it('should create a new CommandHandler instance', () => {
      expect(commandHandler).toBeInstanceOf(CommandHandler);
    });
  });

  describe('setCommandRegistry', () => {
    it('should set the command registry', () => {
      mockCommandRegistry.getCommand.mockReturnValue(mockSudoCommand);

      commandHandler.setCommandRegistry(mockCommandRegistry);

      // Verify we can use the registry
      const client = createMockClient({ stateData: {} });
      commandHandler.handleCommand(client, 'test');
      expect(mockCommandRegistry.executeCommand).toHaveBeenCalled();
    });

    it('should get sudo command from registry', () => {
      mockCommandRegistry.getCommand.mockReturnValue(mockSudoCommand);

      commandHandler.setCommandRegistry(mockCommandRegistry);

      expect(mockCommandRegistry.getCommand).toHaveBeenCalledWith('sudo');
    });

    it('should handle missing sudo command gracefully', () => {
      mockCommandRegistry.getCommand.mockReturnValue(undefined);

      // Should not throw
      expect(() => commandHandler.setCommandRegistry(mockCommandRegistry)).not.toThrow();
    });
  });

  describe('handleCommand', () => {
    describe('when command registry is not set', () => {
      it('should write error message to client', () => {
        const client = createMockClient();

        commandHandler.handleCommand(client, 'test');

        expect(mockWriteToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('Command registry not initialized')
        );
      });
    });

    describe('when command registry is set', () => {
      beforeEach(() => {
        mockCommandRegistry.getCommand.mockReturnValue(mockSudoCommand);
        commandHandler.setCommandRegistry(mockCommandRegistry);
      });

      it('should store command handler in client stateData', () => {
        const client = createMockClient({ stateData: {} });

        commandHandler.handleCommand(client, 'test');

        expect(client.stateData.commandHandler).toBe(commandHandler);
      });

      it('should initialize stateData if undefined', () => {
        const client = createMockClient();
        // @ts-expect-error - Testing undefined stateData
        client.stateData = undefined;

        commandHandler.handleCommand(client, 'test');

        expect(client.stateData).toBeDefined();
      });

      it('should execute command through registry', () => {
        const client = createMockClient({ stateData: {} });

        commandHandler.handleCommand(client, 'test');

        expect(mockCommandRegistry.executeCommand).toHaveBeenCalledWith(client, 'test');
      });

      it('should execute the command via registry', () => {
        const client = createMockClient({ stateData: {} });

        commandHandler.handleCommand(client, 'look around');

        expect(mockCommandRegistry.executeCommand).toHaveBeenCalledWith(client, 'look around');
      });
    });
  });

  describe('hasAdminPrivileges', () => {
    describe('when sudo command is not available', () => {
      it('should return true only for admin user', () => {
        expect(commandHandler.hasAdminPrivileges('admin')).toBe(true);
        expect(commandHandler.hasAdminPrivileges('otheruser')).toBe(false);
      });
    });

    describe('when sudo command is not returned (instanceof check fails)', () => {
      beforeEach(() => {
        // Note: Because mocks don't pass instanceof SudoCommand check,
        // the sudoCommand field won't be set, so fallback to admin check
        mockCommandRegistry.getCommand.mockReturnValue(undefined);
        commandHandler.setCommandRegistry(mockCommandRegistry);
      });

      it('should fall back to admin-only check when sudoCommand not set', () => {
        expect(commandHandler.hasAdminPrivileges('admin')).toBe(true);
        expect(commandHandler.hasAdminPrivileges('testuser')).toBe(false);
      });
    });
  });

  describe('handleAttackCommand', () => {
    let client: ConnectedClient;

    beforeEach(() => {
      client = createMockClient({
        user: createMockUser({ currentRoomId: 'town-square' }),
      });
    });

    describe('client validation', () => {
      it('should return early when client has no user', () => {
        const noUserClient = createMockClient({ user: null });

        commandHandler.handleAttackCommand(noUserClient, ['goblin']);

        expect(mockWriteFormattedMessageToClient).not.toHaveBeenCalled();
      });

      it('should return early when user has no currentRoomId', () => {
        const noRoomClient = createMockClient({
          user: createMockUser({ currentRoomId: '' }),
        });

        commandHandler.handleAttackCommand(noRoomClient, ['goblin']);

        expect(mockWriteFormattedMessageToClient).not.toHaveBeenCalled();
      });
    });

    describe('when already in combat', () => {
      it('should show already in combat message', () => {
        const combatClient = createMockClient({
          user: createMockUser({ inCombat: true }),
        });
        mockCombatSystem.isInCombat.mockReturnValue(true);

        commandHandler.handleAttackCommand(combatClient, ['goblin']);

        expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
          combatClient,
          expect.stringContaining('already in combat')
        );
      });
    });

    describe('when no target specified', () => {
      it('should ask what to attack', () => {
        commandHandler.handleAttackCommand(client, []);

        expect(mockWriteToClient).toHaveBeenCalledWith(client, 'Attack what?\r\n');
      });
    });

    describe('when room not found', () => {
      it('should show void message', () => {
        mockRoomManager.getRoom.mockReturnValue(undefined);

        commandHandler.handleAttackCommand(client, ['goblin']);

        expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining('void')
        );
      });
    });

    describe('when target not found in room', () => {
      it('should show not found message', () => {
        mockRoomManager.getRoom.mockReturnValue({
          id: 'town-square',
          name: 'Town Square',
          npcs: new Map(),
        } as unknown as Room);

        commandHandler.handleAttackCommand(client, ['goblin']);

        expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining("don't see")
        );
      });
    });

    describe('when target found in room', () => {
      it('should engage combat with valid NPC', () => {
        const mockNpc = { templateId: 'goblin-warrior' };
        const mockRoom = {
          id: 'town-square',
          name: 'Town Square',
          npcs: new Map([['goblin-instance-1', mockNpc]]),
        };
        mockRoomManager.getRoom.mockReturnValue(mockRoom as unknown as Room);
        mockCombatSystem.engageCombat.mockReturnValue(true);

        commandHandler.handleAttackCommand(client, ['goblin-instance-1']);

        expect(mockCombatSystem.engageCombat).toHaveBeenCalled();
      });

      it('should handle multiple word target names', () => {
        const mockNpc = { templateId: 'orc-warrior' };
        const mockRoom = {
          id: 'town-square',
          name: 'Town Square',
          npcs: new Map([['orc warrior', mockNpc]]),
        };
        mockRoomManager.getRoom.mockReturnValue(mockRoom as unknown as Room);
        mockCombatSystem.engageCombat.mockReturnValue(true);

        commandHandler.handleAttackCommand(client, ['orc', 'warrior']);

        expect(mockCombatSystem.engageCombat).toHaveBeenCalled();
      });

      it('should clear session transfer state after successful combat', () => {
        client.stateData.isSessionTransfer = true;
        const mockNpc = { templateId: 'goblin' };
        const mockRoom = {
          id: 'town-square',
          name: 'Town Square',
          npcs: new Map([['goblin', mockNpc]]),
        };
        mockRoomManager.getRoom.mockReturnValue(mockRoom as unknown as Room);
        mockCombatSystem.engageCombat.mockReturnValue(true);

        commandHandler.handleAttackCommand(client, ['goblin']);

        expect(client.stateData.isSessionTransfer).toBeUndefined();
      });

      it('should show cannot attack message when combat fails to start', () => {
        const mockNpc = { templateId: 'peaceful-npc' };
        const mockRoom = {
          id: 'town-square',
          name: 'Town Square',
          npcs: new Map([['peaceful-npc', mockNpc]]),
        };
        mockRoomManager.getRoom.mockReturnValue(mockRoom as unknown as Room);
        mockCombatSystem.engageCombat.mockReturnValue(false);

        commandHandler.handleAttackCommand(client, ['peaceful-npc']);

        expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
          client,
          expect.stringContaining("can't attack")
        );
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle full command flow with registry', () => {
      mockCommandRegistry.getCommand.mockReturnValue(mockSudoCommand);
      commandHandler.setCommandRegistry(mockCommandRegistry);

      const client = createMockClient({
        user: createMockUser(),
        stateData: {},
      });

      commandHandler.handleCommand(client, 'help');

      expect(mockCommandRegistry.executeCommand).toHaveBeenCalledWith(client, 'help');
      expect(client.stateData.commandHandler).toBeDefined();
    });

    it('should handle rapid command execution', () => {
      mockCommandRegistry.getCommand.mockReturnValue(mockSudoCommand);
      commandHandler.setCommandRegistry(mockCommandRegistry);

      const client = createMockClient({ stateData: {} });

      for (let i = 0; i < 10; i++) {
        commandHandler.handleCommand(client, `command${i}`);
      }

      expect(mockCommandRegistry.executeCommand).toHaveBeenCalledTimes(10);
    });
  });
});
