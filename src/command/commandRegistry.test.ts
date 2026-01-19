/**
 * Unit tests for CommandRegistry
 * @module command/commandRegistry.test
 */

import { CommandRegistry } from './commandRegistry';
import { ConnectedClient, ClientStateType } from '../types';
import { createMockClient, createMockUser } from '../test/helpers/mockFactories';

// Mock the logger
jest.mock('../utils/logger', () => ({
  createContextLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock socketWriter
jest.mock('../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
  writeFormattedMessageToClient: jest.fn(),
  drawCommandPrompt: jest.fn(),
}));

// Mock colors
jest.mock('../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
  ColorType: {},
}));

// Mock dependencies - must be before imports that use them
jest.mock('../room/roomManager', () => ({
  RoomManager: {
    getInstance: jest.fn().mockReturnValue({
      getRoom: jest.fn(),
      getAllRooms: jest.fn().mockReturnValue([]),
    }),
  },
}));

jest.mock('../user/userManager', () => ({
  UserManager: {
    getInstance: jest.fn().mockReturnValue({
      getUser: jest.fn(),
      getAllUsers: jest.fn().mockReturnValue([]),
    }),
  },
}));

jest.mock('../combat/combatSystem', () => ({
  CombatSystem: {
    getInstance: jest.fn().mockReturnValue({
      isInCombat: jest.fn().mockReturnValue(false),
    }),
  },
}));

jest.mock('../abilities/abilityManager', () => ({
  AbilityManager: {
    getInstance: jest.fn().mockReturnValue({
      getAbility: jest.fn(),
    }),
  },
}));

// Mock all command imports
jest.mock('./commands/say.command', () => ({
  SayCommand: jest.fn().mockImplementation(() => ({
    name: 'say',
    description: 'Say something',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/who.command', () => ({
  WhoCommand: jest.fn().mockImplementation(() => ({
    name: 'who',
    description: 'See who is online',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/stats.command', () => ({
  StatsCommand: jest.fn().mockImplementation(() => ({
    name: 'stats',
    description: 'View your stats',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/heal.command', () => ({
  HealCommand: jest.fn().mockImplementation(() => ({
    name: 'heal',
    description: 'Heal yourself',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/damage.command', () => ({
  DamageCommand: jest.fn().mockImplementation(() => ({
    name: 'damage',
    description: 'Deal damage',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/effect.command', () => ({
  EffectCommand: jest.fn().mockImplementation(() => ({
    name: 'effect',
    description: 'Apply effects',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/help.command', () => ({
  HelpCommand: jest.fn().mockImplementation(() => ({
    name: 'help',
    description: 'Get help',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/quit.command', () => ({
  QuitCommand: jest.fn().mockImplementation(() => ({
    name: 'quit',
    description: 'Quit the game',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/look.command', () => ({
  LookCommand: jest.fn().mockImplementation(() => ({
    name: 'look',
    description: 'Look around',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/move.command', () => ({
  MoveCommand: jest.fn().mockImplementation(() => ({
    name: 'move',
    description: 'Move in a direction',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/inventory.command', () => ({
  InventoryCommand: jest.fn().mockImplementation(() => ({
    name: 'inventory',
    description: 'View inventory',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/pickup.command', () => ({
  PickupCommand: jest.fn().mockImplementation(() => ({
    name: 'pickup',
    description: 'Pick up items',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/drop.command', () => ({
  DropCommand: jest.fn().mockImplementation(() => ({
    name: 'drop',
    description: 'Drop items',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/get.command', () => ({
  GetCommand: jest.fn().mockImplementation(() => ({
    name: 'get',
    description: 'Get items',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/yell.command', () => ({
  YellCommand: jest.fn().mockImplementation(() => ({
    name: 'yell',
    description: 'Yell to everyone',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/history.command', () => ({
  HistoryCommand: jest.fn().mockImplementation(() => ({
    name: 'history',
    description: 'View command history',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/attack.command', () => ({
  AttackCommand: jest.fn().mockImplementation(() => ({
    name: 'attack',
    description: 'Attack a target',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/break.command', () => ({
  BreakCommand: jest.fn().mockImplementation(() => ({
    name: 'break',
    description: 'Break from combat',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/spawn.command', () => ({
  SpawnCommand: jest.fn().mockImplementation(() => ({
    name: 'spawn',
    description: 'Spawn entities',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/equip.command', () => ({
  EquipCommand: jest.fn().mockImplementation(() => ({
    name: 'equip',
    description: 'Equip items',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/unequip.command', () => ({
  UnequipCommand: jest.fn().mockImplementation(() => ({
    name: 'unequip',
    description: 'Unequip items',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/equipment.command', () => ({
  EquipmentCommand: jest.fn().mockImplementation(() => ({
    name: 'equipment',
    description: 'View equipment',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/giveitem.command', () => ({
  GiveItemCommand: jest.fn().mockImplementation(() => ({
    name: 'giveitem',
    description: 'Give items',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/sudo.command', () => ({
  SudoCommand: {
    getInstance: jest.fn().mockReturnValue({
      name: 'sudo',
      description: 'Execute admin commands',
      execute: jest.fn(),
      setCommandRegistry: jest.fn(),
    }),
  },
}));

jest.mock('./commands/adminmanage.command', () => ({
  AdminManageCommand: jest.fn().mockImplementation(() => ({
    name: 'adminmanage',
    description: 'Manage admins',
    execute: jest.fn(),
    setSudoCommand: jest.fn(),
  })),
}));

jest.mock('./commands/snake.command', () => ({
  SnakeCommand: jest.fn().mockImplementation(() => ({
    name: 'snake',
    description: 'Play snake',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/scores.command', () => ({
  ScoresCommand: jest.fn().mockImplementation(() => ({
    name: 'scores',
    description: 'View scores',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/debug.command', () => ({
  DebugCommand: jest.fn().mockImplementation(() => ({
    name: 'debug',
    description: 'Debug commands',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/restrict.command', () => ({
  RestrictCommand: jest.fn().mockImplementation(() => ({
    name: 'restrict',
    description: 'Restrict users',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/root.command', () => ({
  RootCommand: jest.fn().mockImplementation(() => ({
    name: 'root',
    description: 'Root commands',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/addflag.command', () => ({
  AddFlagCommand: jest.fn().mockImplementation(() => ({
    name: 'addflag',
    description: 'Add flag',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/removeflag.command', () => ({
  RemoveFlagCommand: jest.fn().mockImplementation(() => ({
    name: 'removeflag',
    description: 'Remove flag',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/listflags.command', () => ({
  ListFlagsCommand: jest.fn().mockImplementation(() => ({
    name: 'listflags',
    description: 'List flags',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/destroy.command', () => ({
  DestroyCommand: jest.fn().mockImplementation(() => ({
    name: 'destroy',
    description: 'Destroy items',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/rename.command', () => ({
  RenameCommand: jest.fn().mockImplementation(() => ({
    name: 'rename',
    description: 'Rename items',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/resetname.command', () => ({
  ResetNameCommand: jest.fn().mockImplementation(() => ({
    name: 'resetname',
    description: 'Reset name',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/repair.command', () => ({
  RepairCommand: jest.fn().mockImplementation(() => ({
    name: 'repair',
    description: 'Repair items',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/bugreport.command', () => ({
  BugReportCommand: jest.fn().mockImplementation(() => ({
    name: 'bugreport',
    description: 'Report bugs',
    execute: jest.fn(),
    setSudoCommand: jest.fn(),
  })),
}));

jest.mock('./commands/changePassword.command', () => ({
  ChangePasswordCommand: jest.fn().mockImplementation(() => ({
    name: 'changepassword',
    description: 'Change password',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/played.command', () => ({
  PlayedCommand: jest.fn().mockImplementation(() => ({
    name: 'played',
    description: 'Show playtime',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/time.command', () => ({
  TimeCommand: jest.fn().mockImplementation(() => ({
    name: 'time',
    description: 'Show time',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/wave.command', () => ({
  WaveCommand: jest.fn().mockImplementation(() => ({
    name: 'wave',
    description: 'Wave at someone',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/laugh.command', () => ({
  LaughCommand: jest.fn().mockImplementation(() => ({
    name: 'laugh',
    description: 'Laugh',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/cast.command', () => ({
  CastCommand: jest.fn().mockImplementation(() => ({
    name: 'cast',
    description: 'Cast spell',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/abilities.command', () => ({
  AbilitiesCommand: jest.fn().mockImplementation(() => ({
    name: 'abilities',
    description: 'View abilities',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/use.command', () => ({
  UseCommand: jest.fn().mockImplementation(() => ({
    name: 'use',
    description: 'Use item',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/mmis.command', () => ({
  MagicMissileCommand: jest.fn().mockImplementation(() => ({
    name: 'mmis',
    description: 'Magic missile',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/rest.command', () => ({
  RestCommand: jest.fn().mockImplementation(() => ({
    name: 'rest',
    description: 'Rest',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/meditate.command', () => ({
  MeditateCommand: jest.fn().mockImplementation(() => ({
    name: 'meditate',
    description: 'Meditate',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/train.command', () => ({
  TrainCommand: jest.fn().mockImplementation(() => ({
    name: 'train',
    description: 'Train',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/exp.command', () => ({
  ExpCommand: jest.fn().mockImplementation(() => ({
    name: 'exp',
    description: 'View experience',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/buy.command', () => ({
  BuyCommand: jest.fn().mockImplementation(() => ({
    name: 'buy',
    description: 'Buy items',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/sell.command', () => ({
  SellCommand: jest.fn().mockImplementation(() => ({
    name: 'sell',
    description: 'Sell items',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/wares.command', () => ({
  WaresCommand: jest.fn().mockImplementation(() => ({
    name: 'wares',
    description: 'View wares',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/deposit.command', () => ({
  DepositCommand: jest.fn().mockImplementation(() => ({
    name: 'deposit',
    description: 'Deposit money',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/withdraw.command', () => ({
  WithdrawCommand: jest.fn().mockImplementation(() => ({
    name: 'withdraw',
    description: 'Withdraw money',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/balance.command', () => ({
  BalanceCommand: jest.fn().mockImplementation(() => ({
    name: 'balance',
    description: 'Check balance',
    execute: jest.fn(),
  })),
}));

jest.mock('./commands/whisper.command', () => ({
  WhisperCommand: jest.fn().mockImplementation(() => ({
    name: 'whisper',
    description: 'Send a private message',
    isSlashCommand: true,
    execute: jest.fn(),
  })),
}));

import { writeToClient } from '../utils/socketWriter';
import { RoomManager } from '../room/roomManager';
import { UserManager } from '../user/userManager';
import { CombatSystem } from '../combat/combatSystem';
import { AbilityManager } from '../abilities/abilityManager';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('CommandRegistry', () => {
  let commandRegistry: CommandRegistry;
  let mockClients: Map<string, ConnectedClient>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockRoomManager: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockCombatSystem: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockUserManager: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockAbilityManager: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockStateMachine: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the singleton
    CommandRegistry.resetInstance();

    mockClients = new Map();
    mockRoomManager = RoomManager.getInstance(mockClients);
    mockUserManager = UserManager.getInstance();
    mockCombatSystem = CombatSystem.getInstance(mockUserManager, mockRoomManager);
    mockAbilityManager = AbilityManager.getInstance(mockUserManager, mockRoomManager, {} as never);
    mockStateMachine = {
      transitionTo: jest.fn(),
      getState: jest.fn(),
    };

    commandRegistry = CommandRegistry.getInstance(
      mockClients,
      mockRoomManager,
      mockCombatSystem,
      mockUserManager,
      mockStateMachine,
      mockAbilityManager
    );
  });

  afterEach(() => {
    CommandRegistry.resetInstance();
  });

  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = CommandRegistry.getInstance(
        mockClients,
        mockRoomManager,
        mockCombatSystem,
        mockUserManager,
        mockStateMachine,
        mockAbilityManager
      );

      const instance2 = CommandRegistry.getInstance(
        mockClients,
        mockRoomManager,
        mockCombatSystem,
        mockUserManager,
        mockStateMachine,
        mockAbilityManager
      );

      expect(instance1).toBe(instance2);
    });

    it('should create a new instance after resetInstance', () => {
      const instance1 = CommandRegistry.getInstance(
        mockClients,
        mockRoomManager,
        mockCombatSystem,
        mockUserManager,
        mockStateMachine,
        mockAbilityManager
      );

      CommandRegistry.resetInstance();

      const instance2 = CommandRegistry.getInstance(
        mockClients,
        mockRoomManager,
        mockCombatSystem,
        mockUserManager,
        mockStateMachine,
        mockAbilityManager
      );

      // They should both be CommandRegistry instances, just different instances
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('resetInstance', () => {
    it('should reset the singleton instance', () => {
      const instance1 = CommandRegistry.getInstance(
        mockClients,
        mockRoomManager,
        mockCombatSystem,
        mockUserManager,
        mockStateMachine,
        mockAbilityManager
      );

      CommandRegistry.resetInstance();

      const instance2 = CommandRegistry.getInstance(
        mockClients,
        mockRoomManager,
        mockCombatSystem,
        mockUserManager,
        mockStateMachine,
        mockAbilityManager
      );

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('getCommand', () => {
    it('should return undefined for unknown commands', () => {
      const command = commandRegistry.getCommand('unknowncommand12345');
      expect(command).toBeUndefined();
    });

    it('should return command for known command name', () => {
      const command = commandRegistry.getCommand('say');
      expect(command).toBeDefined();
      expect(command?.name).toBe('say');
    });

    it('should return command via alias', () => {
      const command = commandRegistry.getCommand('l');
      expect(command).toBeDefined();
      expect(command?.name).toBe('look');
    });

    it('should handle inventory alias', () => {
      const command = commandRegistry.getCommand('i');
      expect(command).toBeDefined();
      expect(command?.name).toBe('inventory');
    });
  });

  describe('isDirectionCommand', () => {
    it('should return true for full direction names', () => {
      expect(commandRegistry.isDirectionCommand('north')).toBe(true);
      expect(commandRegistry.isDirectionCommand('south')).toBe(true);
      expect(commandRegistry.isDirectionCommand('east')).toBe(true);
      expect(commandRegistry.isDirectionCommand('west')).toBe(true);
      expect(commandRegistry.isDirectionCommand('up')).toBe(true);
      expect(commandRegistry.isDirectionCommand('down')).toBe(true);
    });

    it('should return true for diagonal directions', () => {
      expect(commandRegistry.isDirectionCommand('northeast')).toBe(true);
      expect(commandRegistry.isDirectionCommand('northwest')).toBe(true);
      expect(commandRegistry.isDirectionCommand('southeast')).toBe(true);
      expect(commandRegistry.isDirectionCommand('southwest')).toBe(true);
    });

    it('should return true for short direction names', () => {
      expect(commandRegistry.isDirectionCommand('n')).toBe(true);
      expect(commandRegistry.isDirectionCommand('s')).toBe(true);
      expect(commandRegistry.isDirectionCommand('e')).toBe(true);
      expect(commandRegistry.isDirectionCommand('w')).toBe(true);
      expect(commandRegistry.isDirectionCommand('u')).toBe(true);
      expect(commandRegistry.isDirectionCommand('d')).toBe(true);
    });

    it('should return true for short diagonal directions', () => {
      expect(commandRegistry.isDirectionCommand('ne')).toBe(true);
      expect(commandRegistry.isDirectionCommand('nw')).toBe(true);
      expect(commandRegistry.isDirectionCommand('se')).toBe(true);
      expect(commandRegistry.isDirectionCommand('sw')).toBe(true);
    });

    it('should return false for non-direction commands', () => {
      expect(commandRegistry.isDirectionCommand('look')).toBe(false);
      expect(commandRegistry.isDirectionCommand('attack')).toBe(false);
      expect(commandRegistry.isDirectionCommand('help')).toBe(false);
    });
  });

  describe('executeCommand', () => {
    let mockClient: ConnectedClient;

    beforeEach(() => {
      mockClient = createMockClient({
        user: createMockUser(),
        state: ClientStateType.AUTHENTICATED,
      });
    });

    it('should execute a known command', () => {
      commandRegistry.executeCommand(mockClient, 'say hello');

      const sayCommand = commandRegistry.getCommand('say');
      expect(sayCommand?.execute).toHaveBeenCalledWith(mockClient, 'hello');
    });

    it('should execute command via alias', () => {
      commandRegistry.executeCommand(mockClient, 'l');

      const lookCommand = commandRegistry.getCommand('look');
      expect(lookCommand?.execute).toHaveBeenCalled();
    });

    it('should handle direction commands', () => {
      commandRegistry.executeCommand(mockClient, 'north');

      const moveCommand = commandRegistry.getCommand('move');
      expect(moveCommand?.execute).toHaveBeenCalledWith(mockClient, 'north');
    });

    it('should handle short direction commands', () => {
      commandRegistry.executeCommand(mockClient, 'n');

      const moveCommand = commandRegistry.getCommand('move');
      expect(moveCommand?.execute).toHaveBeenCalledWith(mockClient, 'north');
    });

    it('should show error for unknown command', () => {
      commandRegistry.executeCommand(mockClient, 'unknowncommand12345');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('not recognized')
      );
    });

    it('should suggest similar commands for typos', () => {
      // 'hlep' is close to 'help'
      commandRegistry.executeCommand(mockClient, 'hlep');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('Did you mean')
      );
    });

    it('should handle command with multiple arguments', () => {
      commandRegistry.executeCommand(mockClient, 'say hello world how are you');

      const sayCommand = commandRegistry.getCommand('say');
      expect(sayCommand?.execute).toHaveBeenCalledWith(mockClient, 'hello world how are you');
    });

    it('should convert command to lowercase', () => {
      commandRegistry.executeCommand(mockClient, 'SAY HELLO');

      const sayCommand = commandRegistry.getCommand('say');
      expect(sayCommand?.execute).toHaveBeenCalledWith(mockClient, 'HELLO');
    });
  });

  describe('registerAlias', () => {
    it('should register a new alias', () => {
      commandRegistry.registerAlias('testalias', 'say', 'default message');

      const command = commandRegistry.getCommand('testalias');
      expect(command).toBeDefined();
      expect(command?.name).toBe('say');
    });

    it('should allow alias with args', () => {
      commandRegistry.registerAlias('quicksay', 'say', 'quick message');

      // Verify the alias works
      const command = commandRegistry.getCommand('quicksay');
      expect(command).toBeDefined();
    });
  });

  describe('showAvailableCommands', () => {
    it('should write commands to client', () => {
      const mockClient = createMockClient();

      commandRegistry.showAvailableCommands(mockClient);

      expect(mockWriteToClient).toHaveBeenCalled();
    });

    it('should include header and footer', () => {
      const mockClient = createMockClient();

      commandRegistry.showAvailableCommands(mockClient);

      const calls = mockWriteToClient.mock.calls;
      const allOutput = calls.map((call) => call[1]).join('');

      expect(allOutput).toContain('Available Commands');
    });
  });

  describe('getAllCommands', () => {
    it('should return a map of all commands', () => {
      const commands = commandRegistry.getAllCommands();

      expect(commands).toBeInstanceOf(Map);
      expect(commands.size).toBeGreaterThan(0);
    });

    it('should include say command', () => {
      const commands = commandRegistry.getAllCommands();

      expect(commands.has('say')).toBe(true);
    });
  });

  describe('getSudoCommand', () => {
    // Note: getSudoCommand uses instanceof SudoCommand which can't work
    // with jest mocks since they're plain objects, not class instances.
    // The method is tested via integration tests instead.
    it('should be defined', () => {
      expect(commandRegistry.getSudoCommand).toBeDefined();
    });
  });

  describe('command aliases', () => {
    const aliasTests = [
      { alias: 'l', expectedCommand: 'look' },
      { alias: 'i', expectedCommand: 'inventory' },
      { alias: 'inv', expectedCommand: 'inventory' },
      { alias: 'hist', expectedCommand: 'history' },
      { alias: 'take', expectedCommand: 'pickup' },
      { alias: 'a', expectedCommand: 'attack' },
      { alias: 'br', expectedCommand: 'break' },
      { alias: 'sp', expectedCommand: 'spawn' },
      { alias: 'st', expectedCommand: 'stats' },
      { alias: 'eq', expectedCommand: 'equip' },
      { alias: 'gear', expectedCommand: 'equipment' },
    ];

    test.each(aliasTests)(
      'alias "$alias" should map to "$expectedCommand"',
      ({ alias, expectedCommand }) => {
        const command = commandRegistry.getCommand(alias);
        expect(command).toBeDefined();
        expect(command?.name).toBe(expectedCommand);
      }
    );
  });

  describe('direction command aliases', () => {
    const directionTests = [
      { short: 'n', full: 'north' },
      { short: 's', full: 'south' },
      { short: 'e', full: 'east' },
      { short: 'w', full: 'west' },
      { short: 'u', full: 'up' },
      { short: 'd', full: 'down' },
      { short: 'ne', full: 'northeast' },
      { short: 'nw', full: 'northwest' },
      { short: 'se', full: 'southeast' },
      { short: 'sw', full: 'southwest' },
    ];

    test.each(directionTests)(
      'short direction "$short" should execute as "$full"',
      ({ short, full }) => {
        const mockClient = createMockClient({
          user: createMockUser(),
        });

        commandRegistry.executeCommand(mockClient, short);

        const moveCommand = commandRegistry.getCommand('move');
        expect(moveCommand?.execute).toHaveBeenCalledWith(mockClient, full);
      }
    );
  });

  describe('error handling', () => {
    it('should handle command execution errors gracefully', () => {
      const mockClient = createMockClient({
        user: createMockUser(),
      });

      // Get the say command and make it throw
      const sayCommand = commandRegistry.getCommand('say');
      (sayCommand?.execute as jest.Mock).mockImplementation(() => {
        throw new Error('Test error');
      });

      // Should not throw
      expect(() => commandRegistry.executeCommand(mockClient, 'say hello')).not.toThrow();

      // Should write error message
      expect(mockWriteToClient).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('Error executing command')
      );
    });

    it('should handle unexpected exceptions gracefully', () => {
      const mockClient = createMockClient({
        user: createMockUser(),
      });

      const sayCommand = commandRegistry.getCommand('say');
      (sayCommand?.execute as jest.Mock).mockImplementation(() => {
        throw new Error('unexpected error');
      });

      expect(() => commandRegistry.executeCommand(mockClient, 'say hello')).not.toThrow();

      expect(mockWriteToClient).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining('Error executing command')
      );
    });
  });

  describe('slash command handling', () => {
    let mockClient: ConnectedClient;

    beforeEach(() => {
      mockClient = createMockClient({
        user: createMockUser(),
        state: ClientStateType.AUTHENTICATED,
      });
    });

    it('should execute slash command with "/" prefix', () => {
      commandRegistry.executeCommand(mockClient, '/whisper user hello');

      const whisperCommand = commandRegistry.getCommand('/whisper');
      expect(whisperCommand?.execute).toHaveBeenCalledWith(mockClient, 'user hello');
    });

    it('should suggest "/" prefix when slash command used without it', () => {
      commandRegistry.executeCommand(mockClient, 'whisper user hello');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining("Did you mean '/whisper'")
      );
    });

    it('should suggest "/" prefix for slash command alias used without it', () => {
      // 'w' is an alias for whisper (a slash command), but 'w' without '/'
      // goes to west (direction). So let's test with 'tell' alias instead
      commandRegistry.executeCommand(mockClient, 'tell user hello');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining("Did you mean '/tell'")
      );
    });

    it('should show simple error for invalid slash command without suggestions', () => {
      commandRegistry.executeCommand(mockClient, '/badcommand123');

      // Should show "Invalid command" without "Did you mean"
      expect(mockWriteToClient).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining("Invalid command '/badcommand123'")
      );

      // Should NOT contain "Did you mean" or "Hint:"
      const call = mockWriteToClient.mock.calls.find((c) => c[1].includes('Invalid command'));
      expect(call?.[1]).not.toContain('Did you mean');
      expect(call?.[1]).not.toContain('Hint:');
    });

    it('should not execute slash command without "/" prefix', () => {
      commandRegistry.executeCommand(mockClient, 'whisper user hello');

      const whisperCommand = commandRegistry.getCommand('/whisper');
      // The command should NOT have been executed
      expect(whisperCommand?.execute).not.toHaveBeenCalled();
    });

    it('should not execute regular command with "/" prefix', () => {
      commandRegistry.executeCommand(mockClient, '/say hello');

      // Should show invalid command
      expect(mockWriteToClient).toHaveBeenCalledWith(
        mockClient,
        expect.stringContaining("Invalid command '/say'")
      );

      // The say command should NOT have been executed
      const sayCommand = commandRegistry.getCommand('say');
      expect(sayCommand?.execute).not.toHaveBeenCalled();
    });

    it('should return undefined for slash command without prefix via getCommand', () => {
      const command = commandRegistry.getCommand('whisper');
      expect(command).toBeUndefined();
    });

    it('should return command for slash command with prefix via getCommand', () => {
      const command = commandRegistry.getCommand('/whisper');
      expect(command).toBeDefined();
      expect(command?.name).toBe('whisper');
    });
  });
});
