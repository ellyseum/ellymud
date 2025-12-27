/**
 * Unit tests for State Interruption Utilities
 * @module utils/stateInterruption.test
 */

import {
  clearRestingMeditating,
  isRestingOrMeditating,
  InterruptionReason,
} from './stateInterruption';
import { createMockUser, createMockClient } from '../test/helpers/mockFactories';

// Mock the dependencies
jest.mock('./colors', () => ({
  colorize: jest.fn((text: string, color: string) => `[${color}]${text}[/${color}]`),
}));

jest.mock('./socketWriter', () => ({
  writeFormattedMessageToClient: jest.fn(),
}));

import { colorize } from './colors';
import { writeFormattedMessageToClient } from './socketWriter';

describe('stateInterruption', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('clearRestingMeditating', () => {
    describe('client with no user', () => {
      it('should return false when client has no user', () => {
        const client = createMockClient({ user: null });

        const result = clearRestingMeditating(client, 'damage');

        expect(result).toBe(false);
        expect(writeFormattedMessageToClient).not.toHaveBeenCalled();
      });
    });

    describe('client resting only', () => {
      it('should clear resting state and return true', () => {
        const user = createMockUser({ isResting: true, restingTicks: 5 });
        const client = createMockClient({ user });

        const result = clearRestingMeditating(client, 'damage');

        expect(result).toBe(true);
        expect(client.user!.isResting).toBe(false);
        expect(client.user!.restingTicks).toBe(0);
      });

      it('should send rest interruption message when not silent', () => {
        const user = createMockUser({ isResting: true, restingTicks: 5 });
        const client = createMockClient({ user });

        clearRestingMeditating(client, 'damage', false);

        expect(writeFormattedMessageToClient).toHaveBeenCalledTimes(1);
        expect(colorize).toHaveBeenCalledWith(
          expect.stringContaining('jolted from your rest'),
          'yellow'
        );
      });

      it('should not send message when silent is true', () => {
        const user = createMockUser({ isResting: true, restingTicks: 5 });
        const client = createMockClient({ user });

        clearRestingMeditating(client, 'damage', true);

        expect(writeFormattedMessageToClient).not.toHaveBeenCalled();
      });
    });

    describe('client meditating only', () => {
      it('should clear meditating state and return true', () => {
        const user = createMockUser({ isMeditating: true, meditatingTicks: 10 });
        const client = createMockClient({ user });

        const result = clearRestingMeditating(client, 'damage');

        expect(result).toBe(true);
        expect(client.user!.isMeditating).toBe(false);
        expect(client.user!.meditatingTicks).toBe(0);
      });

      it('should send meditate interruption message when not silent', () => {
        const user = createMockUser({ isMeditating: true, meditatingTicks: 10 });
        const client = createMockClient({ user });

        clearRestingMeditating(client, 'damage', false);

        expect(writeFormattedMessageToClient).toHaveBeenCalledTimes(1);
        expect(colorize).toHaveBeenCalledWith(
          expect.stringContaining('meditation is broken'),
          'yellow'
        );
      });

      it('should not send message when silent is true', () => {
        const user = createMockUser({ isMeditating: true, meditatingTicks: 10 });
        const client = createMockClient({ user });

        clearRestingMeditating(client, 'damage', true);

        expect(writeFormattedMessageToClient).not.toHaveBeenCalled();
      });
    });

    describe('client both resting and meditating', () => {
      it('should clear both states and return true', () => {
        const user = createMockUser({
          isResting: true,
          restingTicks: 5,
          isMeditating: true,
          meditatingTicks: 10,
        });
        const client = createMockClient({ user });

        const result = clearRestingMeditating(client, 'damage');

        expect(result).toBe(true);
        expect(client.user!.isResting).toBe(false);
        expect(client.user!.restingTicks).toBe(0);
        expect(client.user!.isMeditating).toBe(false);
        expect(client.user!.meditatingTicks).toBe(0);
      });

      it('should send both messages when not silent', () => {
        const user = createMockUser({
          isResting: true,
          restingTicks: 5,
          isMeditating: true,
          meditatingTicks: 10,
        });
        const client = createMockClient({ user });

        clearRestingMeditating(client, 'damage', false);

        expect(writeFormattedMessageToClient).toHaveBeenCalledTimes(2);
      });

      it('should not send any messages when silent is true', () => {
        const user = createMockUser({
          isResting: true,
          restingTicks: 5,
          isMeditating: true,
          meditatingTicks: 10,
        });
        const client = createMockClient({ user });

        clearRestingMeditating(client, 'damage', true);

        expect(writeFormattedMessageToClient).not.toHaveBeenCalled();
      });
    });

    describe('client neither resting nor meditating', () => {
      it('should return false when not resting or meditating', () => {
        const user = createMockUser({ isResting: false, isMeditating: false });
        const client = createMockClient({ user });

        const result = clearRestingMeditating(client, 'damage');

        expect(result).toBe(false);
        expect(writeFormattedMessageToClient).not.toHaveBeenCalled();
      });
    });

    describe('interruption reasons', () => {
      const testInterruptionReason = (
        reason: InterruptionReason,
        restMessage: string,
        meditateMessage: string
      ) => {
        describe(`reason: ${reason}`, () => {
          it(`should display correct rest message for ${reason}`, () => {
            const user = createMockUser({ isResting: true, restingTicks: 5 });
            const client = createMockClient({ user });

            clearRestingMeditating(client, reason);

            expect(colorize).toHaveBeenCalledWith(expect.stringContaining(restMessage), 'yellow');
          });

          it(`should display correct meditate message for ${reason}`, () => {
            const user = createMockUser({ isMeditating: true, meditatingTicks: 10 });
            const client = createMockClient({ user });

            clearRestingMeditating(client, reason);

            expect(colorize).toHaveBeenCalledWith(
              expect.stringContaining(meditateMessage),
              'yellow'
            );
          });
        });
      };

      testInterruptionReason('damage', 'jolted from your rest', 'meditation is broken');
      testInterruptionReason(
        'movement',
        'stand up and stop resting',
        'stand up, breaking your meditation'
      );
      testInterruptionReason(
        'combat',
        'cannot rest while in combat',
        'cannot meditate while in combat'
      );
      testInterruptionReason(
        'aggression',
        'stand up and prepare for battle',
        'break your meditation to attack'
      );
    });

    describe('tick reset verification', () => {
      it('should reset restingTicks to 0 when resting', () => {
        const user = createMockUser({ isResting: true, restingTicks: 100 });
        const client = createMockClient({ user });

        clearRestingMeditating(client, 'damage');

        expect(client.user!.restingTicks).toBe(0);
      });

      it('should reset meditatingTicks to 0 when meditating', () => {
        const user = createMockUser({ isMeditating: true, meditatingTicks: 200 });
        const client = createMockClient({ user });

        clearRestingMeditating(client, 'damage');

        expect(client.user!.meditatingTicks).toBe(0);
      });

      it('should reset both ticks when both resting and meditating', () => {
        const user = createMockUser({
          isResting: true,
          restingTicks: 100,
          isMeditating: true,
          meditatingTicks: 200,
        });
        const client = createMockClient({ user });

        clearRestingMeditating(client, 'damage');

        expect(client.user!.restingTicks).toBe(0);
        expect(client.user!.meditatingTicks).toBe(0);
      });
    });

    describe('default silent parameter', () => {
      it('should default to non-silent (sends message)', () => {
        const user = createMockUser({ isResting: true, restingTicks: 5 });
        const client = createMockClient({ user });

        clearRestingMeditating(client, 'damage');

        expect(writeFormattedMessageToClient).toHaveBeenCalled();
      });
    });

    describe('message formatting', () => {
      it('should include line breaks in messages', () => {
        const user = createMockUser({ isResting: true, restingTicks: 5 });
        const client = createMockClient({ user });

        clearRestingMeditating(client, 'damage');

        expect(colorize).toHaveBeenCalledWith(expect.stringMatching(/^\r\n.*\r\n$/), 'yellow');
      });
    });
  });

  describe('isRestingOrMeditating', () => {
    describe('client with no user', () => {
      it('should return false when client has no user', () => {
        const client = createMockClient({ user: null });

        const result = isRestingOrMeditating(client);

        expect(result).toBe(false);
      });
    });

    describe('client resting only', () => {
      it('should return true when resting', () => {
        const user = createMockUser({ isResting: true, isMeditating: false });
        const client = createMockClient({ user });

        const result = isRestingOrMeditating(client);

        expect(result).toBe(true);
      });
    });

    describe('client meditating only', () => {
      it('should return true when meditating', () => {
        const user = createMockUser({ isResting: false, isMeditating: true });
        const client = createMockClient({ user });

        const result = isRestingOrMeditating(client);

        expect(result).toBe(true);
      });
    });

    describe('client both resting and meditating', () => {
      it('should return true when both resting and meditating', () => {
        const user = createMockUser({ isResting: true, isMeditating: true });
        const client = createMockClient({ user });

        const result = isRestingOrMeditating(client);

        expect(result).toBe(true);
      });
    });

    describe('client neither resting nor meditating', () => {
      it('should return false when neither resting nor meditating', () => {
        const user = createMockUser({ isResting: false, isMeditating: false });
        const client = createMockClient({ user });

        const result = isRestingOrMeditating(client);

        expect(result).toBe(false);
      });
    });

    describe('edge cases with undefined values', () => {
      it('should return false when isResting is undefined', () => {
        // Use partial user cast to simulate undefined isResting
        const user = createMockUser({ isMeditating: false });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (user as any).isResting;
        const client = createMockClient({ user });

        const result = isRestingOrMeditating(client);

        expect(result).toBe(false);
      });

      it('should return false when isMeditating is undefined', () => {
        // Use partial user cast to simulate undefined isMeditating
        const user = createMockUser({ isResting: false });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (user as any).isMeditating;
        const client = createMockClient({ user });

        const result = isRestingOrMeditating(client);

        expect(result).toBe(false);
      });

      it('should return true when only isResting is true (isMeditating undefined)', () => {
        // Use partial user cast to simulate undefined isMeditating
        const user = createMockUser({ isResting: true });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (user as any).isMeditating;
        const client = createMockClient({ user });

        const result = isRestingOrMeditating(client);

        expect(result).toBe(true);
      });

      it('should return true when only isMeditating is true (isResting undefined)', () => {
        // Use partial user cast to simulate undefined isResting
        const user = createMockUser({ isMeditating: true });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (user as any).isResting;
        const client = createMockClient({ user });

        const result = isRestingOrMeditating(client);

        expect(result).toBe(true);
      });
    });
  });
});
