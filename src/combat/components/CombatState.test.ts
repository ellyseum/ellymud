import {
  CombatState,
  ActiveCombatState,
  FleeingCombatState,
  UnconsciousCombatState,
} from './CombatState';
import { CombatEntity } from '../combatEntity.interface';
import { ConnectedClient } from '../../types';
import { createMockCombatEntity, createMockClient } from '../../test/helpers/mockFactories';

describe('CombatState', () => {
  // Callback mocks
  let mockAttackCallback: jest.Mock;
  let mockMovementCallback: jest.Mock;
  let mockDisconnectCallback: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAttackCallback = jest.fn().mockReturnValue(true);
    mockMovementCallback = jest.fn();
    mockDisconnectCallback = jest.fn();
  });

  describe('ActiveCombatState', () => {
    let state: ActiveCombatState;

    beforeEach(() => {
      state = new ActiveCombatState(
        mockAttackCallback,
        mockMovementCallback,
        mockDisconnectCallback
      );
    });

    describe('getName', () => {
      it('should return "active"', () => {
        expect(state.getName()).toBe('active');
      });
    });

    describe('handleAttack', () => {
      it('should delegate to onAttackCallback', () => {
        const attacker = createMockCombatEntity({ name: 'Attacker' });
        const target = createMockCombatEntity({ name: 'Target' });

        const result = state.handleAttack(attacker, target);

        expect(mockAttackCallback).toHaveBeenCalledWith(attacker, target);
        expect(mockAttackCallback).toHaveBeenCalledTimes(1);
        expect(result).toBe(true);
      });

      it('should return false when callback returns false', () => {
        mockAttackCallback.mockReturnValue(false);
        const attacker = createMockCombatEntity();
        const target = createMockCombatEntity();

        const result = state.handleAttack(attacker, target);

        expect(result).toBe(false);
      });

      it('should pass correct attacker and target to callback', () => {
        const attacker = createMockCombatEntity({ name: 'Hero' });
        const target = createMockCombatEntity({ name: 'Goblin' });

        state.handleAttack(attacker, target);

        expect(mockAttackCallback).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Hero' }),
          expect.objectContaining({ name: 'Goblin' })
        );
      });
    });

    describe('handleMovement', () => {
      it('should delegate to onMovementCallback', () => {
        const client = createMockClient();

        state.handleMovement(client);

        expect(mockMovementCallback).toHaveBeenCalledWith(client);
        expect(mockMovementCallback).toHaveBeenCalledTimes(1);
      });

      it('should pass the correct client to callback', () => {
        const client = createMockClient({ id: 'unique-client-123' });

        state.handleMovement(client);

        expect(mockMovementCallback).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'unique-client-123' })
        );
      });
    });

    describe('handleDisconnect', () => {
      it('should delegate to onDisconnectCallback', () => {
        const client = createMockClient();

        state.handleDisconnect(client);

        expect(mockDisconnectCallback).toHaveBeenCalledWith(client);
        expect(mockDisconnectCallback).toHaveBeenCalledTimes(1);
      });

      it('should pass the correct client to callback', () => {
        const client = createMockClient({ id: 'disconnect-client' });

        state.handleDisconnect(client);

        expect(mockDisconnectCallback).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'disconnect-client' })
        );
      });
    });

    describe('interface compliance', () => {
      it('should implement CombatState interface', () => {
        const combatState: CombatState = state;
        expect(combatState.handleAttack).toBeDefined();
        expect(combatState.handleMovement).toBeDefined();
        expect(combatState.handleDisconnect).toBeDefined();
        expect(combatState.getName).toBeDefined();
      });
    });
  });

  describe('FleeingCombatState', () => {
    let state: FleeingCombatState;

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-01T00:00:00Z'));

      state = new FleeingCombatState(
        mockAttackCallback,
        mockMovementCallback,
        mockDisconnectCallback
      );
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('getName', () => {
      it('should return "fleeing"', () => {
        expect(state.getName()).toBe('fleeing');
      });
    });

    describe('handleAttack', () => {
      describe('when callback returns false', () => {
        it('should return false regardless of random roll', () => {
          mockAttackCallback.mockReturnValue(false);
          jest.spyOn(Math, 'random').mockReturnValue(0.99);
          const attacker = createMockCombatEntity();
          const target = createMockCombatEntity();

          const result = state.handleAttack(attacker, target);

          expect(result).toBe(false);
        });
      });

      describe('when callback returns true', () => {
        beforeEach(() => {
          mockAttackCallback.mockReturnValue(true);
        });

        describe('at time 0 (flee chance = 20%)', () => {
          it('should hit when random > 0.2', () => {
            jest.spyOn(Math, 'random').mockReturnValue(0.3);
            const attacker = createMockCombatEntity();
            const target = createMockCombatEntity();

            const result = state.handleAttack(attacker, target);

            expect(result).toBe(true);
          });

          it('should miss when random <= 0.2', () => {
            jest.spyOn(Math, 'random').mockReturnValue(0.1);
            const attacker = createMockCombatEntity();
            const target = createMockCombatEntity();

            const result = state.handleAttack(attacker, target);

            expect(result).toBe(false);
          });

          it('should miss when random = 0.2 (boundary)', () => {
            jest.spyOn(Math, 'random').mockReturnValue(0.2);
            const attacker = createMockCombatEntity();
            const target = createMockCombatEntity();

            const result = state.handleAttack(attacker, target);

            expect(result).toBe(false);
          });
        });

        describe('after 3 seconds (flee chance = 30%)', () => {
          beforeEach(() => {
            jest.advanceTimersByTime(3000);
          });

          it('should hit when random > 0.3', () => {
            jest.spyOn(Math, 'random').mockReturnValue(0.4);
            const attacker = createMockCombatEntity();
            const target = createMockCombatEntity();

            const result = state.handleAttack(attacker, target);

            expect(result).toBe(true);
          });

          it('should miss when random <= 0.3', () => {
            jest.spyOn(Math, 'random').mockReturnValue(0.25);
            const attacker = createMockCombatEntity();
            const target = createMockCombatEntity();

            const result = state.handleAttack(attacker, target);

            expect(result).toBe(false);
          });
        });

        describe('after 6 seconds (flee chance = 40%)', () => {
          beforeEach(() => {
            jest.advanceTimersByTime(6000);
          });

          it('should hit when random > 0.4', () => {
            jest.spyOn(Math, 'random').mockReturnValue(0.5);
            const attacker = createMockCombatEntity();
            const target = createMockCombatEntity();

            const result = state.handleAttack(attacker, target);

            expect(result).toBe(true);
          });

          it('should miss when random <= 0.4', () => {
            jest.spyOn(Math, 'random').mockReturnValue(0.35);
            const attacker = createMockCombatEntity();
            const target = createMockCombatEntity();

            const result = state.handleAttack(attacker, target);

            expect(result).toBe(false);
          });
        });

        describe('after 18 seconds (flee chance = 80% cap)', () => {
          beforeEach(() => {
            jest.advanceTimersByTime(18000);
          });

          it('should hit when random > 0.8', () => {
            jest.spyOn(Math, 'random').mockReturnValue(0.9);
            const attacker = createMockCombatEntity();
            const target = createMockCombatEntity();

            const result = state.handleAttack(attacker, target);

            expect(result).toBe(true);
          });

          it('should miss when random <= 0.8', () => {
            jest.spyOn(Math, 'random').mockReturnValue(0.75);
            const attacker = createMockCombatEntity();
            const target = createMockCombatEntity();

            const result = state.handleAttack(attacker, target);

            expect(result).toBe(false);
          });
        });

        describe('after 60 seconds (flee chance remains capped at 80%)', () => {
          beforeEach(() => {
            jest.advanceTimersByTime(60000);
          });

          it('should still cap at 80% flee chance', () => {
            // At 60 seconds, uncapped formula would give: 0.2 + (60/3) * 0.1 = 2.2
            // But it should be capped at 0.8
            jest.spyOn(Math, 'random').mockReturnValue(0.85);
            const attacker = createMockCombatEntity();
            const target = createMockCombatEntity();

            const result = state.handleAttack(attacker, target);

            expect(result).toBe(true);
          });

          it('should miss when random <= 0.8', () => {
            jest.spyOn(Math, 'random').mockReturnValue(0.7);
            const attacker = createMockCombatEntity();
            const target = createMockCombatEntity();

            const result = state.handleAttack(attacker, target);

            expect(result).toBe(false);
          });
        });

        it('should call onAttackCallback with correct parameters', () => {
          jest.spyOn(Math, 'random').mockReturnValue(0.99);
          const attacker = createMockCombatEntity({ name: 'FleeingAttacker' });
          const target = createMockCombatEntity({ name: 'FleeingTarget' });

          state.handleAttack(attacker, target);

          expect(mockAttackCallback).toHaveBeenCalledWith(attacker, target);
        });
      });
    });

    describe('handleMovement', () => {
      it('should delegate to onMovementCallback', () => {
        const client = createMockClient();

        state.handleMovement(client);

        expect(mockMovementCallback).toHaveBeenCalledWith(client);
        expect(mockMovementCallback).toHaveBeenCalledTimes(1);
      });

      it('should always call movement callback (guaranteed break chance)', () => {
        const client = createMockClient({ id: 'fleeing-mover' });

        state.handleMovement(client);

        expect(mockMovementCallback).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'fleeing-mover' })
        );
      });
    });

    describe('handleDisconnect', () => {
      it('should delegate to onDisconnectCallback', () => {
        const client = createMockClient();

        state.handleDisconnect(client);

        expect(mockDisconnectCallback).toHaveBeenCalledWith(client);
        expect(mockDisconnectCallback).toHaveBeenCalledTimes(1);
      });
    });

    describe('interface compliance', () => {
      it('should implement CombatState interface', () => {
        const combatState: CombatState = state;
        expect(combatState.handleAttack).toBeDefined();
        expect(combatState.handleMovement).toBeDefined();
        expect(combatState.handleDisconnect).toBeDefined();
        expect(combatState.getName).toBeDefined();
      });
    });
  });

  describe('UnconsciousCombatState', () => {
    let state: UnconsciousCombatState;

    beforeEach(() => {
      state = new UnconsciousCombatState(
        mockAttackCallback,
        mockMovementCallback,
        mockDisconnectCallback
      );
    });

    describe('getName', () => {
      it('should return "unconscious"', () => {
        expect(state.getName()).toBe('unconscious');
      });
    });

    describe('handleAttack', () => {
      describe('when attacker is the same as target (self-attack)', () => {
        it('should return false (unconscious targets cannot attack themselves)', () => {
          const entity = createMockCombatEntity({ name: 'SelfAttacker' });

          const result = state.handleAttack(entity, entity);

          expect(result).toBe(false);
        });

        it('should not call onAttackCallback for self-attack', () => {
          const entity = createMockCombatEntity();

          state.handleAttack(entity, entity);

          expect(mockAttackCallback).not.toHaveBeenCalled();
        });
      });

      describe('when attacker is different from target', () => {
        it('should return true (attacks always hit unconscious targets)', () => {
          const attacker = createMockCombatEntity({ name: 'Attacker' });
          const target = createMockCombatEntity({ name: 'UnconsciousTarget' });

          const result = state.handleAttack(attacker, target);

          expect(result).toBe(true);
        });

        it('should return true even when callback would return false', () => {
          mockAttackCallback.mockReturnValue(false);
          const attacker = createMockCombatEntity({ name: 'Attacker' });
          const target = createMockCombatEntity({ name: 'Target' });

          const result = state.handleAttack(attacker, target);

          expect(result).toBe(true);
        });

        it('should not call onAttackCallback (bypasses normal logic)', () => {
          const attacker = createMockCombatEntity();
          const target = createMockCombatEntity();

          state.handleAttack(attacker, target);

          expect(mockAttackCallback).not.toHaveBeenCalled();
        });
      });
    });

    describe('handleMovement', () => {
      it('should not call onMovementCallback (cannot move while unconscious)', () => {
        const client = createMockClient();

        state.handleMovement(client);

        expect(mockMovementCallback).not.toHaveBeenCalled();
      });

      it('should be a no-op for any client', () => {
        const client1 = createMockClient({ id: 'client1' });
        const client2 = createMockClient({ id: 'client2' });

        state.handleMovement(client1);
        state.handleMovement(client2);

        expect(mockMovementCallback).not.toHaveBeenCalled();
      });
    });

    describe('handleDisconnect', () => {
      it('should delegate to onDisconnectCallback', () => {
        const client = createMockClient();

        state.handleDisconnect(client);

        expect(mockDisconnectCallback).toHaveBeenCalledWith(client);
        expect(mockDisconnectCallback).toHaveBeenCalledTimes(1);
      });

      it('should allow disconnect even while unconscious', () => {
        const client = createMockClient({ id: 'unconscious-disconnect' });

        state.handleDisconnect(client);

        expect(mockDisconnectCallback).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'unconscious-disconnect' })
        );
      });
    });

    describe('interface compliance', () => {
      it('should implement CombatState interface', () => {
        const combatState: CombatState = state;
        expect(combatState.handleAttack).toBeDefined();
        expect(combatState.handleMovement).toBeDefined();
        expect(combatState.handleDisconnect).toBeDefined();
        expect(combatState.getName).toBeDefined();
      });
    });
  });

  describe('State Comparison', () => {
    it('should have unique state names', () => {
      const activeState = new ActiveCombatState(
        mockAttackCallback,
        mockMovementCallback,
        mockDisconnectCallback
      );
      const fleeingState = new FleeingCombatState(
        mockAttackCallback,
        mockMovementCallback,
        mockDisconnectCallback
      );
      const unconsciousState = new UnconsciousCombatState(
        mockAttackCallback,
        mockMovementCallback,
        mockDisconnectCallback
      );

      const names = [activeState.getName(), fleeingState.getName(), unconsciousState.getName()];

      expect(new Set(names).size).toBe(3);
      expect(names).toContain('active');
      expect(names).toContain('fleeing');
      expect(names).toContain('unconscious');
    });

    describe('movement behavior differences', () => {
      let client: ConnectedClient;

      beforeEach(() => {
        client = createMockClient();
      });

      it('ActiveCombatState should allow movement', () => {
        const state = new ActiveCombatState(
          mockAttackCallback,
          mockMovementCallback,
          mockDisconnectCallback
        );

        state.handleMovement(client);

        expect(mockMovementCallback).toHaveBeenCalled();
      });

      it('FleeingCombatState should allow movement', () => {
        const state = new FleeingCombatState(
          mockAttackCallback,
          mockMovementCallback,
          mockDisconnectCallback
        );

        state.handleMovement(client);

        expect(mockMovementCallback).toHaveBeenCalled();
      });

      it('UnconsciousCombatState should block movement', () => {
        const state = new UnconsciousCombatState(
          mockAttackCallback,
          mockMovementCallback,
          mockDisconnectCallback
        );

        state.handleMovement(client);

        expect(mockMovementCallback).not.toHaveBeenCalled();
      });
    });

    describe('attack behavior differences', () => {
      let attacker: CombatEntity;
      let target: CombatEntity;

      beforeEach(() => {
        attacker = createMockCombatEntity({ name: 'Attacker' });
        target = createMockCombatEntity({ name: 'Target' });
        mockAttackCallback.mockReturnValue(true);
      });

      it('ActiveCombatState should use callback result directly', () => {
        const state = new ActiveCombatState(
          mockAttackCallback,
          mockMovementCallback,
          mockDisconnectCallback
        );

        mockAttackCallback.mockReturnValue(true);
        expect(state.handleAttack(attacker, target)).toBe(true);

        mockAttackCallback.mockReturnValue(false);
        expect(state.handleAttack(attacker, target)).toBe(false);
      });

      it('FleeingCombatState should modify callback result based on flee chance', () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2025-01-01T00:00:00Z'));

        const state = new FleeingCombatState(
          mockAttackCallback,
          mockMovementCallback,
          mockDisconnectCallback
        );

        // At time 0, flee chance is 20%. Random = 0.1 means attack misses
        jest.spyOn(Math, 'random').mockReturnValue(0.1);
        expect(state.handleAttack(attacker, target)).toBe(false);

        jest.useRealTimers();
      });

      it('UnconsciousCombatState should always hit (ignore callback)', () => {
        const state = new UnconsciousCombatState(
          mockAttackCallback,
          mockMovementCallback,
          mockDisconnectCallback
        );

        mockAttackCallback.mockReturnValue(false);
        expect(state.handleAttack(attacker, target)).toBe(true);
        expect(mockAttackCallback).not.toHaveBeenCalled();
      });
    });
  });
});
