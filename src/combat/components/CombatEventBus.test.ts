import { CombatEventBus } from './CombatEventBus';

describe('CombatEventBus', () => {
  let eventBus: CombatEventBus;

  beforeEach(() => {
    eventBus = new CombatEventBus();
  });

  describe('on()', () => {
    it('should register a listener for an event', () => {
      const callback = jest.fn();

      eventBus.on('test-event', callback);

      expect(eventBus.hasListeners('test-event')).toBe(true);
    });

    it('should register multiple listeners for the same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();

      eventBus.on('test-event', callback1);
      eventBus.on('test-event', callback2);
      eventBus.on('test-event', callback3);

      expect(eventBus.hasListeners('test-event')).toBe(true);

      // Verify all are registered by emitting
      eventBus.emit('test-event');
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback3).toHaveBeenCalledTimes(1);
    });

    it('should register listeners for different events', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      eventBus.on('event-a', callback1);
      eventBus.on('event-b', callback2);

      expect(eventBus.hasListeners('event-a')).toBe(true);
      expect(eventBus.hasListeners('event-b')).toBe(true);
    });

    it('should allow registering the same callback multiple times for the same event', () => {
      const callback = jest.fn();

      eventBus.on('test-event', callback);
      eventBus.on('test-event', callback);

      eventBus.emit('test-event');
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe('emit()', () => {
    it('should call registered listener when event is emitted', () => {
      const callback = jest.fn();

      eventBus.on('test-event', callback);
      eventBus.emit('test-event');

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should pass data to the listener callback', () => {
      const callback = jest.fn();
      const testData = { damage: 10, attacker: 'player1' };

      eventBus.on('damage-dealt', callback);
      eventBus.emit('damage-dealt', testData);

      expect(callback).toHaveBeenCalledWith(testData);
    });

    it('should call listener with undefined when no data is provided', () => {
      const callback = jest.fn();

      eventBus.on('test-event', callback);
      eventBus.emit('test-event');

      expect(callback).toHaveBeenCalledWith(undefined);
    });

    it('should call all registered listeners for an event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();
      const testData = { value: 42 };

      eventBus.on('multi-listener-event', callback1);
      eventBus.on('multi-listener-event', callback2);
      eventBus.on('multi-listener-event', callback3);

      eventBus.emit('multi-listener-event', testData);

      expect(callback1).toHaveBeenCalledWith(testData);
      expect(callback2).toHaveBeenCalledWith(testData);
      expect(callback3).toHaveBeenCalledWith(testData);
    });

    it('should not throw when emitting event with no listeners', () => {
      expect(() => {
        eventBus.emit('non-existent-event');
      }).not.toThrow();
    });

    it('should not throw when emitting event with data but no listeners', () => {
      expect(() => {
        eventBus.emit('non-existent-event', { some: 'data' });
      }).not.toThrow();
    });

    it('should only call listeners for the specific event emitted', () => {
      const callbackA = jest.fn();
      const callbackB = jest.fn();

      eventBus.on('event-a', callbackA);
      eventBus.on('event-b', callbackB);

      eventBus.emit('event-a');

      expect(callbackA).toHaveBeenCalledTimes(1);
      expect(callbackB).not.toHaveBeenCalled();
    });

    it('should call listeners in order of registration', () => {
      const order: number[] = [];
      const callback1 = jest.fn(() => order.push(1));
      const callback2 = jest.fn(() => order.push(2));
      const callback3 = jest.fn(() => order.push(3));

      eventBus.on('ordered-event', callback1);
      eventBus.on('ordered-event', callback2);
      eventBus.on('ordered-event', callback3);

      eventBus.emit('ordered-event');

      expect(order).toEqual([1, 2, 3]);
    });

    it('should handle various data types', () => {
      const callback = jest.fn();
      eventBus.on('test-event', callback);

      // String
      eventBus.emit('test-event', 'string data');
      expect(callback).toHaveBeenLastCalledWith('string data');

      // Number
      eventBus.emit('test-event', 42);
      expect(callback).toHaveBeenLastCalledWith(42);

      // Array
      eventBus.emit('test-event', [1, 2, 3]);
      expect(callback).toHaveBeenLastCalledWith([1, 2, 3]);

      // Boolean
      eventBus.emit('test-event', true);
      expect(callback).toHaveBeenLastCalledWith(true);

      // Null
      eventBus.emit('test-event', null);
      expect(callback).toHaveBeenLastCalledWith(null);
    });
  });

  describe('off()', () => {
    it('should remove a specific listener from an event', () => {
      const callback = jest.fn();

      eventBus.on('test-event', callback);
      eventBus.off('test-event', callback);
      eventBus.emit('test-event');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should only remove the specified listener, leaving others intact', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();

      eventBus.on('test-event', callback1);
      eventBus.on('test-event', callback2);
      eventBus.on('test-event', callback3);

      eventBus.off('test-event', callback2);
      eventBus.emit('test-event');

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();
      expect(callback3).toHaveBeenCalledTimes(1);
    });

    it('should clean up empty listener arrays after removing last listener', () => {
      const callback = jest.fn();

      eventBus.on('test-event', callback);
      expect(eventBus.hasListeners('test-event')).toBe(true);

      eventBus.off('test-event', callback);
      expect(eventBus.hasListeners('test-event')).toBe(false);
    });

    it('should not throw when removing non-existent callback', () => {
      const registeredCallback = jest.fn();
      const unregisteredCallback = jest.fn();

      eventBus.on('test-event', registeredCallback);

      expect(() => {
        eventBus.off('test-event', unregisteredCallback);
      }).not.toThrow();

      // Original listener should still work
      eventBus.emit('test-event');
      expect(registeredCallback).toHaveBeenCalledTimes(1);
    });

    it('should not throw when removing from non-existent event', () => {
      const callback = jest.fn();

      expect(() => {
        eventBus.off('non-existent-event', callback);
      }).not.toThrow();
    });

    it('should remove only one instance when same callback registered multiple times', () => {
      const callback = jest.fn();

      eventBus.on('test-event', callback);
      eventBus.on('test-event', callback);
      eventBus.on('test-event', callback);

      eventBus.off('test-event', callback);
      eventBus.emit('test-event');

      // Should have removed only one, so 2 remain
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should not affect listeners on other events', () => {
      const callbackA = jest.fn();
      const callbackB = jest.fn();

      eventBus.on('event-a', callbackA);
      eventBus.on('event-b', callbackB);

      eventBus.off('event-a', callbackA);

      eventBus.emit('event-a');
      eventBus.emit('event-b');

      expect(callbackA).not.toHaveBeenCalled();
      expect(callbackB).toHaveBeenCalledTimes(1);
    });
  });

  describe('offAll()', () => {
    it('should remove all listeners for a specific event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();

      eventBus.on('test-event', callback1);
      eventBus.on('test-event', callback2);
      eventBus.on('test-event', callback3);

      eventBus.offAll('test-event');
      eventBus.emit('test-event');

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
      expect(callback3).not.toHaveBeenCalled();
    });

    it('should return false for hasListeners after offAll', () => {
      const callback = jest.fn();

      eventBus.on('test-event', callback);
      expect(eventBus.hasListeners('test-event')).toBe(true);

      eventBus.offAll('test-event');
      expect(eventBus.hasListeners('test-event')).toBe(false);
    });

    it('should not throw when called on non-existent event', () => {
      expect(() => {
        eventBus.offAll('non-existent-event');
      }).not.toThrow();
    });

    it('should not affect listeners on other events', () => {
      const callbackA = jest.fn();
      const callbackB = jest.fn();

      eventBus.on('event-a', callbackA);
      eventBus.on('event-b', callbackB);

      eventBus.offAll('event-a');

      eventBus.emit('event-a');
      eventBus.emit('event-b');

      expect(callbackA).not.toHaveBeenCalled();
      expect(callbackB).toHaveBeenCalledTimes(1);
    });
  });

  describe('hasListeners()', () => {
    it('should return true when event has listeners', () => {
      const callback = jest.fn();

      eventBus.on('test-event', callback);

      expect(eventBus.hasListeners('test-event')).toBe(true);
    });

    it('should return false when event has no listeners', () => {
      expect(eventBus.hasListeners('non-existent-event')).toBe(false);
    });

    it('should return false after all listeners are removed with off()', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      eventBus.on('test-event', callback1);
      eventBus.on('test-event', callback2);

      eventBus.off('test-event', callback1);
      expect(eventBus.hasListeners('test-event')).toBe(true);

      eventBus.off('test-event', callback2);
      expect(eventBus.hasListeners('test-event')).toBe(false);
    });

    it('should return false after offAll() is called', () => {
      const callback = jest.fn();

      eventBus.on('test-event', callback);
      eventBus.offAll('test-event');

      expect(eventBus.hasListeners('test-event')).toBe(false);
    });

    it('should correctly report status for multiple different events', () => {
      const callback = jest.fn();

      eventBus.on('event-a', callback);

      expect(eventBus.hasListeners('event-a')).toBe(true);
      expect(eventBus.hasListeners('event-b')).toBe(false);
      expect(eventBus.hasListeners('event-c')).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should handle a typical combat scenario', () => {
      const onDamageDealt = jest.fn();
      const onCombatEnd = jest.fn();
      const onTurnStart = jest.fn();

      // Register combat event handlers
      eventBus.on('damage-dealt', onDamageDealt);
      eventBus.on('combat-end', onCombatEnd);
      eventBus.on('turn-start', onTurnStart);

      // Simulate combat
      eventBus.emit('turn-start', { combatant: 'player' });
      eventBus.emit('damage-dealt', { target: 'goblin', amount: 15 });
      eventBus.emit('damage-dealt', { target: 'player', amount: 5 });
      eventBus.emit('combat-end', { winner: 'player', xp: 100 });

      expect(onTurnStart).toHaveBeenCalledTimes(1);
      expect(onDamageDealt).toHaveBeenCalledTimes(2);
      expect(onCombatEnd).toHaveBeenCalledTimes(1);
      expect(onCombatEnd).toHaveBeenCalledWith({ winner: 'player', xp: 100 });
    });

    it('should allow dynamic subscription and unsubscription during combat', () => {
      const permanentListener = jest.fn();
      const temporaryListener = jest.fn();

      eventBus.on('attack', permanentListener);
      eventBus.on('attack', temporaryListener);

      // First attack - both listeners active
      eventBus.emit('attack', { type: 'slash' });
      expect(permanentListener).toHaveBeenCalledTimes(1);
      expect(temporaryListener).toHaveBeenCalledTimes(1);

      // Remove temporary listener
      eventBus.off('attack', temporaryListener);

      // Second attack - only permanent listener
      eventBus.emit('attack', { type: 'thrust' });
      expect(permanentListener).toHaveBeenCalledTimes(2);
      expect(temporaryListener).toHaveBeenCalledTimes(1);
    });

    it('should support multiple independent event buses', () => {
      const eventBus2 = new CombatEventBus();
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      eventBus.on('test-event', callback1);
      eventBus2.on('test-event', callback2);

      eventBus.emit('test-event', 'bus1');

      expect(callback1).toHaveBeenCalledWith('bus1');
      expect(callback2).not.toHaveBeenCalled();

      eventBus2.emit('test-event', 'bus2');

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledWith('bus2');
    });
  });
});
