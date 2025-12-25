/**
 * State Interruption Utilities
 * @module utils/stateInterruption
 */

import { ConnectedClient } from '../types';
import { colorize } from './colors';
import { writeFormattedMessageToClient } from './socketWriter';

export type InterruptionReason = 'damage' | 'movement' | 'combat' | 'aggression';

const INTERRUPTION_MESSAGES: Record<InterruptionReason, { rest: string; meditate: string }> = {
  damage: {
    rest: 'You are jolted from your rest by the attack!',
    meditate: 'Your meditation is broken by the attack!',
  },
  movement: {
    rest: 'You stand up and stop resting.',
    meditate: 'You stand up, breaking your meditation.',
  },
  combat: {
    rest: 'You cannot rest while in combat!',
    meditate: 'You cannot meditate while in combat!',
  },
  aggression: {
    rest: 'You stand up and prepare for battle.',
    meditate: 'You break your meditation to attack.',
  },
};

export function clearRestingMeditating(
  client: ConnectedClient,
  reason: InterruptionReason,
  silent: boolean = false
): boolean {
  if (!client.user) return false;

  const wasResting = !!client.user.isResting;
  const wasMeditating = !!client.user.isMeditating;

  if (wasResting) {
    client.user.isResting = false;
    client.user.restingTicks = 0;
    if (!silent) {
      writeFormattedMessageToClient(
        client,
        colorize(`\r\n${INTERRUPTION_MESSAGES[reason].rest}\r\n`, 'yellow')
      );
    }
  }

  if (wasMeditating) {
    client.user.isMeditating = false;
    client.user.meditatingTicks = 0;
    if (!silent) {
      writeFormattedMessageToClient(
        client,
        colorize(`\r\n${INTERRUPTION_MESSAGES[reason].meditate}\r\n`, 'yellow')
      );
    }
  }

  return wasResting || wasMeditating;
}

export function isRestingOrMeditating(client: ConnectedClient): boolean {
  return !!(client.user?.isResting || client.user?.isMeditating);
}
