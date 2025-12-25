import { ConnectedClient } from '../../types';
import { colorize } from '../../utils/colors';
import { writeFormattedMessageToClient } from '../../utils/socketWriter';
import { Command } from '../command.interface';
import { AbilityManager } from '../../abilities/abilityManager';
import { CombatSystem } from '../../combat/combatSystem';
import { RoomManager } from '../../room/roomManager';
import { getPlayerLogger } from '../../utils/logger';

export class MagicMissileCommand implements Command {
  name = 'mmis';
  description = 'Channel magic missiles to attack your target (replaces weapon attacks)';

  constructor(
    private abilityManager: AbilityManager,
    private combatSystem: CombatSystem,
    private roomManager: RoomManager
  ) {}

  execute(client: ConnectedClient, args: string): void {
    if (!client.user) {
      writeFormattedMessageToClient(
        client,
        colorize('You must be logged in to use magic missile.\r\n', 'red')
      );
      return;
    }

    const username = client.user.username;
    const playerLogger = getPlayerLogger(username);
    const targetName = args.trim().toLowerCase();

    const ability = this.abilityManager.getAbility('magic-missile');
    if (!ability) {
      writeFormattedMessageToClient(
        client,
        colorize('Magic Missile ability not found.\r\n', 'red')
      );
      return;
    }

    // Check if already using a combat ability
    if (this.abilityManager.hasActiveCombatAbility(username)) {
      const active = this.abilityManager.getActiveCombatAbility(username);
      writeFormattedMessageToClient(
        client,
        colorize(`You are already channeling ${active?.name ?? 'a combat ability'}.\r\n`, 'yellow')
      );
      return;
    }

    // Check MP
    if (!this.abilityManager.hasMana(username, ability.mpCost)) {
      writeFormattedMessageToClient(
        client,
        colorize(`Not enough mana! Magic Missile requires ${ability.mpCost} MP.\r\n`, 'red')
      );
      return;
    }

    // Check cooldown
    const canUse = this.abilityManager.canUseAbility(username, 'magic-missile');
    if (!canUse.ok) {
      writeFormattedMessageToClient(
        client,
        colorize(`Cannot use Magic Missile: ${canUse.reason}\r\n`, 'red')
      );
      return;
    }

    // Find target if specified, or check if already in combat
    const isInCombat = client.user.inCombat;

    if (!targetName && !isInCombat) {
      writeFormattedMessageToClient(
        client,
        colorize('Usage: mmis <target>\r\n', 'yellow') +
          colorize('Channels magic missiles at a target, replacing weapon attacks.\r\n', 'gray')
      );
      return;
    }

    // Note: Mana is NOT deducted on engage - it's deducted per round when the spell lands in combat.ts
    // This prevents wasting mana if the player disengages before landing any hits

    // Activate the combat ability
    const duration = (ability as unknown as { combatDuration?: number }).combatDuration ?? 99;
    this.abilityManager.activateCombatAbility(username, 'magic-missile', duration);

    // Only show the channeling message if already in combat (switching modes)
    // When engaging combat, let the combat system handle the *Combat Engaged* message
    if (isInCombat) {
      writeFormattedMessageToClient(
        client,
        colorize('Your attacks are now Magic Missiles!\r\n', 'magenta') +
          colorize(
            `(Costs ${(ability as unknown as { mpCostPerRound?: number }).mpCostPerRound ?? 3} MP per round)\r\n`,
            'gray'
          )
      );
    }

    playerLogger.info('Activated Magic Missile combat ability');

    // If target specified and not in combat, initiate combat
    if (targetName && !isInCombat) {
      const room = this.roomManager.getRoom(client.user.currentRoomId);
      if (!room) {
        writeFormattedMessageToClient(client, colorize('You are not in a valid room.\r\n', 'red'));
        return;
      }

      // Find the NPC
      const npc = Array.from(room.npcs.values()).find(
        (n) =>
          n.name.toLowerCase().includes(targetName) ||
          n.templateId.toLowerCase().includes(targetName) ||
          n.instanceId.toLowerCase().includes(targetName)
      );

      if (!npc) {
        writeFormattedMessageToClient(
          client,
          colorize(`Target '${targetName}' not found.\r\n`, 'red')
        );
        return;
      }

      // Initiate combat - combat system will show *Combat Engaged*
      // Mana will be deducted on first spell landing, not on engage
      this.combatSystem.engageCombat(client, npc);
      playerLogger.info(`Initiated combat with ${npc.name} using Magic Missile`);
    }
  }
}
