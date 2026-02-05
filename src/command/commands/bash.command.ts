/**
 * Bash Command
 *
 * A powerful attack mode that trades precision for raw damage.
 * - Deals 2x normal weapon damage
 * - Costs 2x weapon energy (fewer attacks per round)
 * - Cannot critical hit
 * - Normal hit chance (no penalty)
 *
 * Usage: bash <target>
 * Usage: bash (to toggle bash mode on/off while in combat)
 */

import { ConnectedClient } from '../../types';
import { colorize } from '../../utils/colors';
import { writeFormattedMessageToClient } from '../../utils/socketWriter';
import { Command } from '../command.interface';
import { CombatSystem } from '../../combat/combatSystem';
import { RoomManager } from '../../room/roomManager';
import { getPlayerLogger } from '../../utils/logger';
import { clearRestingMeditating } from '../../utils/stateInterruption';

export class BashCommand implements Command {
  name = 'bash';
  description = 'Perform a powerful bash attack (2x damage, 2x energy cost, no crits)';

  constructor(
    private combatSystem: CombatSystem,
    private roomManager: RoomManager
  ) {}

  execute(client: ConnectedClient, args: string): void {
    // Early return if user is not defined
    if (!client.user) {
      writeFormattedMessageToClient(client, colorize(`You must be logged in to bash.\r\n`, 'red'));
      return;
    }

    const playerLogger = getPlayerLogger(client.user.username);

    // Check if in safe zone
    const room = this.roomManager.getRoom(client.user.currentRoomId);
    if (room && room.flags.includes('safe')) {
      writeFormattedMessageToClient(
        client,
        colorize(`You cannot fight here. This is a safe zone.\r\n`, 'yellow')
      );
      return;
    }

    // Check if player is unconscious
    if (client.user.isUnconscious) {
      playerLogger.info(`Bash command rejected: Player is unconscious`);
      writeFormattedMessageToClient(
        client,
        colorize(`You are unconscious and cannot attack.\r\n`, 'red')
      );
      return;
    }

    // Interrupt resting/meditating
    clearRestingMeditating(client, 'aggression');

    // If already in combat, toggle bash mode
    if (client.user.inCombat) {
      const tracker = this.combatSystem.getEnergyTracker(client.user.username);
      if (tracker) {
        const newBashState = !tracker.getIsBashing();
        tracker.setBashing(newBashState);

        if (newBashState) {
          writeFormattedMessageToClient(
            client,
            colorize(`You prepare to bash your enemies with brutal force!\r\n`, 'yellow')
          );
          playerLogger.info('Bash mode enabled');
        } else {
          writeFormattedMessageToClient(
            client,
            colorize(`You return to normal combat attacks.\r\n`, 'cyan')
          );
          playerLogger.info('Bash mode disabled');
        }
        return;
      }
    }

    // If no target specified and not in combat
    if (!args.trim()) {
      if (!client.user.inCombat) {
        writeFormattedMessageToClient(
          client,
          colorize(`Bash what? Specify a target to attack.\r\n`, 'yellow')
        );
        return;
      }
    }

    // Find target in the room
    const roomId = client.user.currentRoomId || this.roomManager.getStartingRoomId();
    const targetRoom = this.roomManager.getRoom(roomId);

    if (!targetRoom) {
      writeFormattedMessageToClient(
        client,
        colorize(`You are not in a valid location to attack from.\r\n`, 'red')
      );
      return;
    }

    let target = null;
    const targetName = args.trim().toLowerCase();

    // Find target by various matching strategies
    if (targetRoom.npcs.has(targetName)) {
      target = targetRoom.npcs.get(targetName);
    } else {
      const npcsInRoom = Array.from(targetRoom.npcs.values());

      // Try instance ID partial match
      target = npcsInRoom.find((npc) => npc.instanceId.toLowerCase().includes(targetName));

      // Try template ID match
      if (!target) {
        target = npcsInRoom.find(
          (npc) =>
            npc.templateId.toLowerCase() === targetName ||
            npc.templateId.toLowerCase().includes(targetName)
        );
      }

      // Try name match
      if (!target) {
        target = npcsInRoom.find(
          (npc) =>
            npc.name.toLowerCase() === targetName || npc.name.toLowerCase().includes(targetName)
        );
      }
    }

    if (!target) {
      writeFormattedMessageToClient(
        client,
        colorize(`You don't see a '${args.trim()}' here to bash.\r\n`, 'yellow')
      );
      return;
    }

    // Engage combat with bash mode enabled
    playerLogger.info(
      `Bash command: Initiating combat with ${target.name} (bash mode) in room ${roomId}`
    );

    // Start combat (or join existing)
    const success = this.combatSystem.engageCombat(client, target);

    if (success) {
      // Enable bash mode for this combat
      const tracker = this.combatSystem.getEnergyTracker(client.user.username);
      if (tracker) {
        tracker.setBashing(true);
        writeFormattedMessageToClient(
          client,
          colorize(`You charge at the ${target.name} with brutal force!\r\n`, 'red')
        );
      }
    } else {
      writeFormattedMessageToClient(
        client,
        colorize(`Unable to engage combat with ${target.name}.\r\n`, 'red')
      );
    }
  }
}
