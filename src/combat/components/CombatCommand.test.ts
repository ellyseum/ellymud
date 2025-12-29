/**
 * Unit tests for CombatCommand classes
 * @module combat/components/CombatCommand.test
 */

import { AttackCommand, FleeCommand, CombatCommandFactory } from './CombatCommand';
import { CombatNotifier } from './CombatNotifier';
import { UserManager } from '../../user/userManager';
import {
  createMockUser,
  createMockClient,
  createMockUserManager,
  createMockCombatEntity,
} from '../../test/helpers/mockFactories';
import * as secureRandomModule from '../../utils/secureRandom';

// Mock secureRandom module for predictable test results
jest.mock('../../utils/secureRandom', () => ({
  secureRandom: jest.fn(() => 0.5),
  secureRandomInt: jest.fn((min, _max) => min),
  secureRandomElement: jest.fn((arr) => arr[0]),
  secureRandomIndex: jest.fn(() => 0),
}));

// Mock dependencies
jest.mock('../../utils/logger', () => ({
  systemLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  getPlayerLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Mock CombatNotifier
const createMockNotifier = (): CombatNotifier =>
  ({
    notifyAttackResult: jest.fn(),
    broadcastRoomMessage: jest.fn(),
    notifyPlayerDeath: jest.fn(),
    broadcastCombatStart: jest.fn(),
  }) as unknown as CombatNotifier;

describe('AttackCommand', () => {
  let mockNotifier: CombatNotifier;
  let mockUserManager: UserManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNotifier = createMockNotifier();
    mockUserManager = createMockUserManager();
  });

  describe('execute', () => {
    it('should deal damage when attack hits', () => {
      // Force hit by setting secureRandom to return 0.5 (exactly at hit threshold)
      (secureRandomModule.secureRandom as jest.Mock).mockReturnValue(0.5);

      const attacker = createMockCombatEntity({ name: 'Goblin' });
      (attacker.getAttackDamage as jest.Mock).mockReturnValue(15);

      const target = createMockCombatEntity({ name: 'Target', health: 100 });
      const targetClient = createMockClient({
        user: createMockUser({ health: 100 }),
      });

      const command = new AttackCommand(
        attacker,
        target,
        mockNotifier,
        'room-1',
        mockUserManager,
        targetClient
      );

      command.execute();

      // Should have taken damage
      expect(targetClient.user!.health).toBe(85); // 100 - 15
      expect(mockUserManager.updateUserStats).toHaveBeenCalled();
      expect(mockNotifier.notifyAttackResult).toHaveBeenCalledWith(
        attacker,
        targetClient,
        'room-1',
        true,
        15
      );
    });

    it('should miss when attack fails', () => {
      // Force miss by setting secureRandom to return 0.4 (below hit threshold)
      (secureRandomModule.secureRandom as jest.Mock).mockReturnValue(0.4);

      const attacker = createMockCombatEntity({ name: 'Goblin' });
      const target = createMockCombatEntity({ name: 'Target' });
      const targetClient = createMockClient({
        user: createMockUser({ health: 100 }),
      });

      const command = new AttackCommand(
        attacker,
        target,
        mockNotifier,
        'room-1',
        mockUserManager,
        targetClient
      );

      command.execute();

      // Should not have taken damage
      expect(targetClient.user!.health).toBe(100);
      expect(mockNotifier.notifyAttackResult).toHaveBeenCalledWith(
        attacker,
        targetClient,
        'room-1',
        false
      );
    });

    it('should call takeDamage on NPC target without client', () => {
      (secureRandomModule.secureRandom as jest.Mock).mockReturnValue(0.5);

      const attacker = createMockCombatEntity({ name: 'Player' });
      (attacker.getAttackDamage as jest.Mock).mockReturnValue(20);
      const target = createMockCombatEntity({ name: 'Goblin' });

      const command = new AttackCommand(attacker, target, mockNotifier, 'room-1');

      command.execute();

      expect(target.takeDamage).toHaveBeenCalledWith(20);
      expect(mockNotifier.broadcastRoomMessage).toHaveBeenCalled();
    });

    it('should not reduce health below -10', () => {
      (secureRandomModule.secureRandom as jest.Mock).mockReturnValue(0.5);

      const attacker = createMockCombatEntity();
      (attacker.getAttackDamage as jest.Mock).mockReturnValue(50);
      const target = createMockCombatEntity();
      const targetClient = createMockClient({
        user: createMockUser({ health: -5 }),
      });

      const command = new AttackCommand(
        attacker,
        target,
        mockNotifier,
        'room-1',
        mockUserManager,
        targetClient
      );

      command.execute();

      // Health should be clamped to -10
      expect(targetClient.user!.health).toBe(-10);
    });
  });
});

describe('FleeCommand', () => {
  let mockNotifier: CombatNotifier;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNotifier = createMockNotifier();
  });

  describe('execute', () => {
    it('should do nothing if player has no user', () => {
      const player = createMockClient({ user: null });

      const command = new FleeCommand(player, mockNotifier);
      command.execute();

      expect(mockNotifier.broadcastRoomMessage).not.toHaveBeenCalled();
    });

    it('should set inCombat to false on successful flee', () => {
      // Force successful flee (secureRandom returns 0.1, which is < 0.3)
      (secureRandomModule.secureRandom as jest.Mock).mockReturnValue(0.1);

      const player = createMockClient({
        user: createMockUser({ inCombat: true, currentRoomId: 'room-1' }),
      });

      const command = new FleeCommand(player, mockNotifier);
      command.execute();

      expect(player.user!.inCombat).toBe(false);
      expect(mockNotifier.broadcastRoomMessage).toHaveBeenCalledWith(
        'room-1',
        expect.stringContaining('breaks away'),
        'green'
      );
    });

    it('should keep inCombat true on failed flee', () => {
      // Force failed flee (secureRandom returns 0.5, which is >= 0.3)
      (secureRandomModule.secureRandom as jest.Mock).mockReturnValue(0.5);

      const player = createMockClient({
        user: createMockUser({ inCombat: true, currentRoomId: 'room-1' }),
      });

      const command = new FleeCommand(player, mockNotifier);
      command.execute();

      expect(player.user!.inCombat).toBe(true);
      expect(mockNotifier.broadcastRoomMessage).toHaveBeenCalledWith(
        'room-1',
        expect.stringContaining('tries to flee'),
        'yellow'
      );
    });
  });
});

describe('CombatCommandFactory', () => {
  let factory: CombatCommandFactory;
  let mockNotifier: CombatNotifier;
  let mockUserManager: UserManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNotifier = createMockNotifier();
    mockUserManager = createMockUserManager();
    factory = new CombatCommandFactory(mockNotifier, mockUserManager);
  });

  describe('createAttackCommand', () => {
    it('should create an AttackCommand', () => {
      const attacker = createMockCombatEntity();
      const target = createMockCombatEntity();

      const command = factory.createAttackCommand(attacker, target, 'room-1');

      expect(command).toBeDefined();
      expect(typeof command.execute).toBe('function');
    });

    it('should create AttackCommand with targetClient', () => {
      const attacker = createMockCombatEntity();
      const target = createMockCombatEntity();
      const targetClient = createMockClient({
        user: createMockUser(),
      });

      const command = factory.createAttackCommand(attacker, target, 'room-1', targetClient);

      expect(command).toBeDefined();
    });
  });

  describe('createFleeCommand', () => {
    it('should create a FleeCommand', () => {
      const player = createMockClient({
        user: createMockUser(),
      });

      const command = factory.createFleeCommand(player);

      expect(command).toBeDefined();
      expect(typeof command.execute).toBe('function');
    });
  });
});
