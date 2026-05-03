/**
 * Level-up hint helpers
 *
 * Players advance via the `train` command at a training room — XP itself
 * doesn't auto-level. This module emits a one-time hint when an XP grant
 * pushes the player from "below threshold" to "at or above threshold" so
 * they know to seek out a trainer.
 *
 * The XP curve is duplicated here on purpose to avoid a circular import
 * with train.command (which is the canonical source). Keep them in sync.
 *
 * @module utils/levelUpHint
 */

import { ConnectedClient } from '../types';
import { writeMessageToClient } from './socketWriter';
import { colorize } from './colors';
import { totalExpForLevel } from '../ruleset/progressionAccess';

/**
 * If awarding `gainedAmount` XP just pushed the user past the threshold for
 * their next level (i.e., they were below it before, at-or-above now), send
 * a one-shot "find a trainer" message.
 *
 * Stateless — the caller computes prev/current themselves. Repeated XP gains
 * after the threshold has already been crossed don't re-fire (since the
 * `previous` value would already be past).
 */
export function maybeAnnounceReadyToTrain(
  client: ConnectedClient,
  previousExp: number,
  newExp: number
): void {
  if (!client.user) return;
  const threshold = totalExpForLevel(client.user.level + 1);
  if (previousExp < threshold && newExp >= threshold) {
    writeMessageToClient(
      client,
      colorize(
        '\r\nYou feel ready to advance — visit a training room and use `train` to level up.\r\n',
        'brightYellow'
      )
    );
  }
}
