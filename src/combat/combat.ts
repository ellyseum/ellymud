// Combat class manages individual combat sessions between a player and NPCs
import { ConnectedClient, GameItem } from '../types';
import { CombatEntity } from './combatEntity.interface';
import { colorize, ColorType } from '../utils/colors';
import {
  writeFormattedMessageToClient,
  drawCommandPrompt,
  writeToClient,
} from '../utils/socketWriter';
import { UserManager } from '../user/userManager';
import { RoomManager } from '../room/roomManager';
import { Room } from '../room/room';
import { formatUsername } from '../utils/formatters';
import { CombatSystem } from './combatSystem';
import { ItemManager } from '../utils/itemManager';
import { createMechanicsLogger } from '../utils/logger';
import { AbilityManager } from '../abilities/abilityManager';
import { clearRestingMeditating } from '../utils/stateInterruption';
import { handleNpcDrops } from './npcDeathHandler';
import { NPC } from './npc';
import { secureRandomIndex } from '../utils/secureRandom';
import { questEventBus } from '../quest/questEventHandler';
import { ResourceManager } from '../resource/resourceManager';
import { ClassManager } from '../class/classManager';
import { RaceManager } from '../race/raceManager';
import { ComboManager } from './comboManager';
import {
  calculateHitChance,
  calculateUserDodgeChance,
  calculateUserCritChance,
  calculatePhysicalDamage,
  calculateDamageReduction,
  rollToHit,
  rollToDodge,
  rollToCrit,
} from './combatFormulas';

// Create a context-specific logger for Combat
const combatLogger = createMechanicsLogger('Combat');

export class Combat {
  rounds: number = 0;
  activeCombatants: CombatEntity[] = [];
  brokenByPlayer: boolean = false;
  currentRound: number = 0; // Track the current global combat round
  // Add timestamp to track last activity
  lastActivityTime: number = Date.now();
  private itemManager: ItemManager;
  private abilityManager: AbilityManager | null = null;

  constructor(
    public player: ConnectedClient,
    private userManager: UserManager,
    private roomManager: RoomManager,
    private combatSystem: CombatSystem
  ) {
    this.itemManager = ItemManager.getInstance();
  }

  public setAbilityManager(abilityManager: AbilityManager): void {
    this.abilityManager = abilityManager;
  }

  addTarget(target: CombatEntity): void {
    if (!this.activeCombatants.includes(target)) {
      this.activeCombatants.push(target);
    }
  }

  processRound(): void {
    // First check if the player is still connected and authenticated
    if (!this.isPlayerValid()) {
      combatLogger.info(
        `Player ${this.player.user?.username || 'unknown'} is no longer valid, ending combat`
      );
      this.activeCombatants = []; // Clear combatants to end combat
      return;
    }

    if (!this.player.user || this.isDone()) {
      combatLogger.debug(
        `Cannot process round: player user is ${this.player.user ? 'valid' : 'invalid'}, isDone=${this.isDone()}`
      );
      return;
    }

    // Check if player is still in the correct room with the NPCs
    const playerRoomId = this.player.user.currentRoomId;
    if (!playerRoomId) {
      combatLogger.info(`Player ${this.player.user.username} has no room, ending combat`);
      this.activeCombatants = []; // End combat
      return;
    }

    // Check if any combatants are in a different room
    const invalidCombatants: CombatEntity[] = [];

    // Get the room to check for NPCs directly
    const room = this.roomManager.getRoom(playerRoomId);
    if (!room) {
      combatLogger.warn(
        `Player ${this.player.user.username} is in non-existent room ${playerRoomId}, ending combat`
      );
      this.activeCombatants = []; // End combat
      return;
    }

    for (const combatant of this.activeCombatants) {
      // Check if the NPC is still in the room
      // For NPCs, check by instanceId first (room.npcs is keyed by instanceId)
      let isInRoom = false;

      // Debug: Log what we're checking
      const combatantInstanceId = combatant instanceof NPC ? combatant.instanceId : null;
      combatLogger.debug(
        `Checking combatant: name=${combatant.name}, instanceof NPC=${combatant instanceof NPC}, instanceId=${combatantInstanceId}`
      );
      combatLogger.debug(`Room NPCs: ${Array.from(room.npcs.keys()).join(', ')}`);

      if (combatant instanceof NPC && combatant.instanceId) {
        // Check directly by instance ID - this is the correct lookup for room.npcs Map
        isInRoom = room.npcs.has(combatant.instanceId);
        combatLogger.debug(
          `NPC ${combatant.name} instanceId=${combatant.instanceId}, room.npcs.has=${isInRoom}`
        );
      } else {
        // Fallback for non-NPC entities - this should rarely happen
        combatLogger.warn(
          `Combatant ${combatant.name} is not an NPC or has no instanceId, cannot verify room presence`
        );
        // Since we can't verify, assume it's valid to avoid breaking combat
        isInRoom = true;
      }

      if (!isInRoom) {
        combatLogger.debug(`Combatant ${combatant.name} is no longer in room ${playerRoomId}`);
        invalidCombatants.push(combatant);
      }
    }

    // Remove combatants that are in a different room
    if (invalidCombatants.length > 0) {
      combatLogger.info(
        `Removing ${invalidCombatants.length} combatants not in the same room as player`
      );
      this.activeCombatants = this.activeCombatants.filter((c) => !invalidCombatants.includes(c));

      // If no valid combatants remain, end combat
      if (this.activeCombatants.length === 0) {
        combatLogger.info(`No valid combatants remain in player's room, ending combat`);
        return;
      }
    }

    this.rounds++;
    combatLogger.info(
      `Processing round ${this.rounds} for ${this.player.user.username} against ${this.activeCombatants.length} combatants`
    );

    // Process each combatant
    for (let i = 0; i < this.activeCombatants.length; i++) {
      const target = this.activeCombatants[i];

      // Check if target is already dead (killed by another player)
      if (!target.isAlive()) {
        // Don't process death again, just remove from active combatants
        this.activeCombatants = this.activeCombatants.filter((c) => c !== target);
        continue;
      }

      // Player attacks target
      if (this.player.user.inCombat) {
        this.processAttack(this.player, target);

        // If target dies from the attack, process death
        if (!target.isAlive()) {
          this.handleNpcDeath(target);
          continue;
        }
      }

      // Target counterattacks if not passive - but chooses target randomly among all attackers
      if (!target.isPassive) {
        this.processCounterAttack(target);
      }
    }

    // Remove dead combatants
    this.activeCombatants = this.activeCombatants.filter((c) => c.isAlive());

    // Update the activity timestamp whenever a round is processed
    this.lastActivityTime = Date.now();
  }

  private processAttack(player: ConnectedClient, target: CombatEntity): void {
    if (!player.user || !player.user.currentRoomId) return;

    const roomId = player.user.currentRoomId;
    const username = player.user.username;

    if (this.abilityManager?.hasActiveCombatAbility(username)) {
      this.processCombatAbilityAttack(player, target, roomId);
      this.abilityManager.decrementCombatAbility(username);
      return;
    }

    this.processWeaponAttack(player, target, roomId);
  }

  private processCombatAbilityAttack(
    player: ConnectedClient,
    target: CombatEntity,
    roomId: string
  ): void {
    if (!player.user || !this.abilityManager) return;

    const username = player.user.username;
    const ability = this.abilityManager.getActiveCombatAbility(username);

    // Check and deduct per-round MP cost
    if (ability) {
      const mpCostPerRound =
        (ability as unknown as { mpCostPerRound?: number }).mpCostPerRound ?? 0;
      if (mpCostPerRound > 0) {
        if (!this.abilityManager.hasMana(username, mpCostPerRound)) {
          // Out of mana - cancel combat ability
          writeFormattedMessageToClient(
            player,
            colorize('You run out of mana! Your spell fades...\r\n', 'yellow')
          );
          this.abilityManager.deactivateCombatAbility(username);
          // Fall back to weapon attack
          this.processWeaponAttack(player, target, roomId);
          return;
        }
        this.abilityManager.useMana(username, mpCostPerRound);
      }
    }

    const result = this.abilityManager.executeCombatAbilityAttack(player, target.name, true);

    if (result.hit) {
      const actualDamage = target.takeDamage(result.damage);
      target.addAggression(player.user.username, actualDamage);

      writeFormattedMessageToClient(player, colorize(`${result.message}\r\n`, 'magenta'));

      const username = formatUsername(player.user.username);
      this.combatSystem.broadcastRoomCombatMessage(
        roomId,
        `${username}'s spell strikes the ${target.name} for ${result.damage} damage!\r\n`,
        'magenta' as ColorType,
        player.user.username
      );
    } else {
      writeFormattedMessageToClient(player, colorize(`${result.message}\r\n`, 'cyan'));

      const username = formatUsername(player.user.username);
      this.combatSystem.broadcastRoomCombatMessage(
        roomId,
        `${username}'s spell fizzles!\r\n`,
        'cyan' as ColorType,
        player.user.username
      );
    }
  }

  private processWeaponAttack(player: ConnectedClient, target: CombatEntity, roomId: string): void {
    const user = player.user!;
    const itemManager = this.itemManager;

    // Get weapon info
    const weaponId = user.equipment?.weapon;
    let weaponName = 'fists';
    let weaponMinDamage = 1;
    let weaponMaxDamage = 3;

    if (weaponId) {
      const displayName = itemManager.getItemDisplayName(weaponId);
      if (displayName) {
        weaponName = displayName;
        const instance = itemManager.getItemInstance(weaponId);
        const template = instance
          ? itemManager.getItem(instance.templateId)
          : itemManager.getItem(weaponId);
        if (template?.damage && Array.isArray(template.damage)) {
          [weaponMinDamage, weaponMaxDamage] = template.damage;
        } else if (template?.stats?.attack) {
          // Fallback for old format: use attack as max damage
          weaponMinDamage = Math.floor(template.stats.attack / 2);
          weaponMaxDamage = template.stats.attack;
        }
      }
    }

    // Get target stats for defense calculations
    // NPCs don't have explicit levels yet, use experience value as a proxy
    const targetLevel =
      target instanceof NPC ? Math.max(1, Math.floor(target.experienceValue / 50)) : 1;
    const targetDodge = this.calculateTargetDodge(target);
    const targetDr = this.calculateTargetDR(target);

    // Get race data for combat bonuses
    const raceManager = RaceManager.getInstance();
    const raceData = raceManager.getRace(user.raceId ?? 'human');

    // Calculate hit chance
    const hitChance = calculateHitChance(user.dexterity, user.level, targetDodge, targetLevel);

    // Roll to hit
    if (!rollToHit(hitChance)) {
      // Miss
      target.addAggression(user.username, 0);

      writeFormattedMessageToClient(
        player,
        colorize(`You swing at the ${target.name} with your ${weaponName}, and miss!\r\n`, 'cyan')
      );

      const username = formatUsername(user.username);
      this.combatSystem.broadcastRoomCombatMessage(
        roomId,
        `${username} swings at the ${target.name} with their ${weaponName}, and misses!\r\n`,
        'cyan' as ColorType,
        user.username
      );
      return;
    }

    // Check if target dodges
    if (rollToDodge(targetDodge)) {
      target.addAggression(user.username, 0);

      writeFormattedMessageToClient(
        player,
        colorize(`The ${target.name} dodges your attack!\r\n`, 'cyan')
      );

      const username = formatUsername(user.username);
      this.combatSystem.broadcastRoomCombatMessage(
        roomId,
        `The ${target.name} dodges ${username}'s attack!\r\n`,
        'cyan' as ColorType,
        user.username
      );
      return;
    }

    // Check for critical hit
    const critChance = calculateUserCritChance(user, raceData, false);
    const isCrit = rollToCrit(critChance, false);

    // Calculate damage
    const totalDamage = calculatePhysicalDamage(
      user.strength,
      weaponMinDamage,
      weaponMaxDamage,
      targetDr,
      isCrit,
      false
    );

    const actualDamage = target.takeDamage(totalDamage);
    target.addAggression(user.username, actualDamage);

    // Trigger rage building for the attacker
    const resourceManager = ResourceManager.getInstance();
    resourceManager.onDamageDealt(user, actualDamage);

    // Build the hit message
    let hitMessage: string;
    let broadcastMessage: string;
    const username = formatUsername(user.username);

    if (isCrit) {
      hitMessage = `CRITICAL! You hit the ${target.name} with your ${weaponName} for ${actualDamage} damage!\r\n`;
      broadcastMessage = `CRITICAL! ${username} hits the ${target.name} with their ${weaponName} for ${actualDamage} damage!\r\n`;
    } else {
      hitMessage = `You hit the ${target.name} with your ${weaponName} for ${actualDamage} damage.\r\n`;
      broadcastMessage = `${username} hits the ${target.name} with their ${weaponName} for ${actualDamage} damage.\r\n`;
    }

    writeFormattedMessageToClient(player, colorize(hitMessage, isCrit ? 'boldRed' : 'red'));

    this.combatSystem.broadcastRoomCombatMessage(
      roomId,
      broadcastMessage,
      (isCrit ? 'boldRed' : 'red') as ColorType,
      user.username
    );

    this.triggerWeaponProc(player, target, roomId);
    this.reduceWeaponDurability(player);
    this.reduceArmorDurability(target);
  }

  /**
   * Calculate target's dodge chance
   */
  private calculateTargetDodge(target: CombatEntity): number {
    if (target instanceof NPC) {
      // NPCs don't have explicit stats yet, calculate dodge from experience value
      // Higher level NPCs are harder to hit (base 5 + exp/100)
      const estimatedAgility = Math.min(50, 10 + Math.floor(target.experienceValue / 25));
      return Math.floor(estimatedAgility / 5);
    }

    // For player targets, use full calculation
    if (target.isUser()) {
      const targetUser = this.userManager.getUser(target.getName());
      if (targetUser) {
        const raceManager = RaceManager.getInstance();
        const classManager = ClassManager.getInstance();
        const raceData = raceManager.getRace(targetUser.raceId ?? 'human');
        const classData = classManager.getClass(targetUser.classId ?? 'adventurer');
        return calculateUserDodgeChance(targetUser, raceData, classData);
      }
    }

    return 5; // Base dodge
  }

  /**
   * Calculate target's damage reduction
   */
  private calculateTargetDR(target: CombatEntity): number {
    if (target instanceof NPC) {
      // NPCs don't have explicit armor, estimate DR from experience value
      // Higher level NPCs have more natural armor
      return Math.floor(target.experienceValue / 50);
    }

    // For player targets, calculate from equipped armor
    if (target.isUser()) {
      const targetUser = this.userManager.getUser(target.getName());
      if (targetUser && targetUser.equipment) {
        const equippedArmor = this.getEquippedArmorItems(targetUser.equipment);
        return calculateDamageReduction(equippedArmor);
      }
    }

    return 0;
  }

  /**
   * Get equipped armor items as GameItem array
   */
  private getEquippedArmorItems(equipment: Record<string, string | undefined>): GameItem[] {
    const armorSlots = ['head', 'chest', 'arms', 'hands', 'legs', 'feet', 'offhand'];
    const items: GameItem[] = [];

    for (const slot of armorSlots) {
      const instanceId = equipment[slot];
      if (instanceId) {
        const instance = this.itemManager.getItemInstance(instanceId);
        if (instance) {
          const template = this.itemManager.getItem(instance.templateId);
          if (template) {
            items.push(template as GameItem);
          }
        }
      }
    }

    return items;
  }

  private triggerWeaponProc(player: ConnectedClient, target: CombatEntity, roomId: string): void {
    if (!player.user || !this.abilityManager) return;

    const weaponId = player.user.equipment?.weapon;
    if (!weaponId) return;

    const result = this.abilityManager.checkWeaponProc(player, weaponId, target.name, true);

    if (result.triggered && result.abilityName) {
      writeFormattedMessageToClient(
        player,
        colorize(`Your weapon's ${result.abilityName} triggers!\r\n`, 'yellow')
      );

      const username = formatUsername(player.user.username);
      this.combatSystem.broadcastRoomCombatMessage(
        roomId,
        `${username}'s weapon glows with ${result.abilityName}!\r\n`,
        'yellow' as ColorType,
        player.user.username
      );
    }
  }

  private reduceWeaponDurability(player: ConnectedClient): void {
    if (!player.user || !player.user.equipment) return;

    const weaponInstanceId = player.user.equipment.weapon;
    if (!weaponInstanceId) return;

    const weaponIntact = this.itemManager.updateDurability(weaponInstanceId, -1);

    if (!weaponIntact) {
      const weaponName = this.itemManager.getItemDisplayName(weaponInstanceId);
      player.user.equipment.weapon = undefined as unknown as string;

      writeFormattedMessageToClient(
        player,
        colorize(`Your ${weaponName} breaks from excessive use!\r\n`, 'red')
      );
    }
  }

  private reduceArmorDurability(target: CombatEntity): void {
    if (!target.isUser()) return;

    const user = this.userManager.getUser(target.getName());
    if (!user || !user.equipment) return;

    const armorSlots = ['head', 'chest', 'arms', 'hands', 'legs', 'feet'];
    const equippedArmorSlots = armorSlots.filter((slot) => user.equipment && user.equipment[slot]);

    if (equippedArmorSlots.length === 0) return;

    const randomSlot = equippedArmorSlots[secureRandomIndex(equippedArmorSlots.length)];
    const armorInstanceId = user.equipment[randomSlot];

    if (!armorInstanceId) return;

    const armorIntact = this.itemManager.updateDurability(armorInstanceId, -1);

    if (!armorIntact) {
      const armorName = this.itemManager.getItemDisplayName(armorInstanceId);
      user.equipment[randomSlot] = undefined as unknown as string;

      writeFormattedMessageToClient(
        this.player,
        colorize(`The ${target.name}'s ${armorName} breaks from taking damage!\r\n`, 'red')
      );
    }
  }

  private processCounterAttack(npc: CombatEntity): void {
    if (!this.player.user || !this.player.user.currentRoomId) return;

    // Get the entity ID
    const entityId = this.combatSystem.getEntityId(this.player.user.currentRoomId, npc.name);

    // Check if this entity has already attacked in this round
    if (this.combatSystem.hasEntityAttackedThisRound(entityId)) {
      return; // Skip attack if entity already attacked this round
    }

    // Get all players targeting this entity
    const targetingPlayers = this.combatSystem.getEntityTargeters(entityId);
    if (targetingPlayers.length === 0) return;

    // Choose a random player to attack
    let validTarget = false;
    let targetPlayer: ConnectedClient | undefined;
    let attempts = 0;
    const maxAttempts = targetingPlayers.length;

    // Try to find a valid target, attempting each player once
    while (!validTarget && attempts < maxAttempts) {
      attempts++;
      const randomIdx = secureRandomIndex(targetingPlayers.length);
      const randomPlayerName = targetingPlayers[randomIdx];
      targetPlayer = this.combatSystem.findClientByUsername(randomPlayerName);

      if (targetPlayer && targetPlayer.user && targetPlayer.authenticated) {
        validTarget = true;
      } else if (targetPlayer === undefined || !targetPlayer.authenticated) {
        // If player no longer exists or not authenticated, remove from targeters
        this.combatSystem.removeEntityTargeter(entityId, randomPlayerName);
        // Remove player from the array too to avoid selecting again
        targetingPlayers.splice(randomIdx, 1);
      }
    }

    // If no valid target found after checking all players, return
    if (!validTarget || !targetPlayer || !targetPlayer.user) return;

    // Mark that this entity has attacked in this round
    this.combatSystem.markEntityAttacked(entityId);

    // Any aggressive action from an NPC interrupts resting/meditating (silently)
    clearRestingMeditating(targetPlayer, 'damage', true);

    // Get the room for broadcasting
    const roomId = this.player.user.currentRoomId;

    // Get NPC stats for attack calculations
    // NPCs don't have explicit stats, estimate from experience value
    const npcExpValue = npc instanceof NPC ? npc.experienceValue : 50;
    const npcLevel = Math.max(1, Math.floor(npcExpValue / 50));
    const npcDex = Math.min(50, 10 + Math.floor(npcExpValue / 25));
    const npcStr = Math.min(50, 10 + Math.floor(npcExpValue / 25));

    // Get target player's dodge and DR
    const targetUser = targetPlayer.user;
    const raceManager = RaceManager.getInstance();
    const classManager = ClassManager.getInstance();
    const raceData = raceManager.getRace(targetUser.raceId ?? 'human');
    const classData = classManager.getClass(targetUser.classId ?? 'adventurer');
    const targetDodge = calculateUserDodgeChance(targetUser, raceData, classData);
    const equippedArmor = this.getEquippedArmorItems(targetUser.equipment ?? {});
    const targetDr = calculateDamageReduction(equippedArmor);

    // Calculate hit chance
    const hitChance = calculateHitChance(npcDex, npcLevel, targetDodge, targetUser.level);

    // Format the target name for messages
    const targetNameFormatted = formatUsername(targetUser.username);

    // Roll to hit
    if (!rollToHit(hitChance)) {
      // Miss
      writeFormattedMessageToClient(
        targetPlayer,
        colorize(`The ${npc.name} ${npc.getAttackText('you')} and misses!\r\n`, 'cyan')
      );

      this.combatSystem.broadcastRoomCombatMessage(
        roomId,
        `The ${npc.name} ${npc.getAttackText(targetNameFormatted)} and misses!\r\n`,
        'cyan' as ColorType,
        targetUser.username
      );
      return;
    }

    // Check if player dodges
    if (rollToDodge(targetDodge)) {
      writeFormattedMessageToClient(
        targetPlayer,
        colorize(`You dodge the ${npc.name}'s attack!\r\n`, 'cyan')
      );

      this.combatSystem.broadcastRoomCombatMessage(
        roomId,
        `${targetNameFormatted} dodges the ${npc.name}'s attack!\r\n`,
        'cyan' as ColorType,
        targetUser.username
      );
      return;
    }

    // Get NPC weapon damage range (or use base damage)
    let npcMinDamage = 2;
    let npcMaxDamage = 6;
    if (npc instanceof NPC && npc.damage) {
      [npcMinDamage, npcMaxDamage] = npc.damage;
    }

    // Calculate damage (NPCs don't crit by default)
    const rawDamage = calculatePhysicalDamage(
      npcStr,
      npcMinDamage,
      npcMaxDamage,
      targetDr,
      false,
      false
    );

    // Apply damage
    targetUser.health -= rawDamage;

    // Ensure health doesn't go below 0
    if (targetUser.health < 0) targetUser.health = 0;

    // Update the player's health
    this.userManager.updateUserStats(targetUser.username, {
      health: targetUser.health,
    });

    // Trigger rage building for the target if applicable
    const resourceManager = ResourceManager.getInstance();
    resourceManager.onDamageTaken(targetUser, rawDamage);

    // Send message to the targeted player
    writeFormattedMessageToClient(
      targetPlayer,
      colorize(`The ${npc.name} ${npc.getAttackText('you')} for ${rawDamage} damage.\r\n`, 'red')
    );

    // Broadcast to ALL players in room except the target
    this.combatSystem.broadcastRoomCombatMessage(
      roomId,
      `The ${npc.name} ${npc.getAttackText(targetNameFormatted)} for ${rawDamage} damage.\r\n`,
      'red' as ColorType,
      targetUser.username
    );

    // Check if player died
    if (targetUser.health <= 0) {
      this.handlePlayerDeath(targetPlayer);
    }
  }

  private handleNpcDeath(npc: CombatEntity): void {
    if (!this.player.user || !this.player.user.currentRoomId) return;

    const roomId = this.player.user.currentRoomId;

    // Get the entity ID
    const entityId = this.combatSystem.getEntityId(roomId, npc.name);

    // Get all players targeting this entity
    const targetingPlayers = [...this.combatSystem.getEntityTargeters(entityId)];

    // Ensure at least the player who killed the NPC gets experience
    // by adding them to the list if they're not already included
    if (!targetingPlayers.includes(this.player.user.username)) {
      targetingPlayers.push(this.player.user.username);
    }

    // Calculate experience per player - divide the total experience by number of participants
    // Ensure we always have at least 1 participant to avoid dividing by zero
    const numParticipants = Math.max(1, targetingPlayers.length);
    const experiencePerPlayer = Math.floor(npc.experienceValue / numParticipants);

    // Award experience to all participating players
    for (const playerName of targetingPlayers) {
      const client = this.combatSystem.findClientByUsername(playerName);
      if (client && client.user) {
        // Award experience to this player
        client.user.experience += experiencePerPlayer;

        // Update the player's experience
        this.userManager.updateUserStats(client.user.username, {
          experience: client.user.experience,
        });

        // Notify the player about experience gained
        writeFormattedMessageToClient(
          client,
          colorize(`You gain ${experiencePerPlayer} experience from the ${npc.name}!\r\n`, 'bright')
        );
      }
    }

    // Get a custom death message from the NPC
    const deathMessage = `The ${npc.name} ${npc instanceof NPC ? npc.getDeathMessage() : 'collapses to the ground and dies'}.\r\n`;

    // For main killer (the one whose combat instance is processing this death)
    writeFormattedMessageToClient(this.player, colorize(deathMessage, 'magenta'));

    // Broadcast to everyone else in the room
    if (this.player.user) {
      const killerUsername = formatUsername(this.player.user.username);
      const broadcastDeathMessage =
        npc instanceof NPC ? npc.getDeathMessage() : 'collapses to the ground and dies';
      this.combatSystem.broadcastRoomCombatMessage(
        roomId,
        `The ${npc.name} fighting ${killerUsername} ${broadcastDeathMessage}.\r\n`,
        'magenta',
        this.player.user.username
      );
    }

    // NEW: Remove the entity from active combat in the room
    this.combatSystem['removeEntityFromCombatForRoom'](roomId, npc.name);

    // Clear aggression from the dead entity
    npc.clearAllAggression();

    // End combat for all players who were targeting this entity
    // This ensures all players receive the Combat Off message
    for (const playerName of targetingPlayers) {
      // Skip processing for invalid players (already disconnected)
      const client = this.combatSystem.findClientByUsername(playerName);
      if (!client || !client.user) continue;

      // Only process combat end for players other than the one who landed the killing blow
      // (the player who killed it has their combat ended separately)
      if (playerName !== this.player.user.username) {
        // Set inCombat to false
        client.user.inCombat = false;
        this.userManager.updateUserStats(client.user.username, { inCombat: false });

        // Clear the line first
        const clearLineSequence = '\r\x1B[K';
        writeToClient(client, clearLineSequence);

        // Send Combat Off message
        writeToClient(client, colorize(`*Combat Off*\r\n`, 'boldYellow'));

        // Draw the prompt explicitly once
        drawCommandPrompt(client);

        // Remove from combat system
        this.combatSystem.removeCombatForPlayer(playerName);
      }
    }

    // Remove the NPC from the room
    // FIXED: Use instanceId instead of name for removing NPC from room
    if (npc instanceof NPC && npc.instanceId) {
      combatLogger.info(`Removing NPC with instanceId ${npc.instanceId} from room ${roomId}`);
      this.roomManager.removeNPCFromRoom(roomId, npc.instanceId);
    } else {
      combatLogger.warn(`Cannot remove NPC ${npc.name} from room: no instanceId available`);
      // Fallback to using name, though this likely won't work with the new Map implementation
      this.roomManager.removeNPCFromRoom(roomId, npc.name);
    }

    // Generate and drop items from NPC inventory using shared handler
    if (npc instanceof NPC) {
      const drops = handleNpcDrops(npc, roomId, this.roomManager, this.itemManager);

      // Notify players about dropped items
      for (const drop of drops) {
        writeFormattedMessageToClient(
          this.player,
          colorize(`The ${npc.name} dropped ${drop.itemName}!\r\n`, 'yellow')
        );
        if (this.player.user) {
          this.combatSystem.broadcastRoomCombatMessage(
            roomId,
            `The ${npc.name} dropped ${drop.itemName}!\r\n`,
            'yellow',
            this.player.user.username
          );
        }
      }

      // Emit quest event for NPC death
      questEventBus.emit('npc:death', {
        killer: this.player,
        npcTemplateId: npc.templateId,
      });
    }

    // Clean up the shared entity reference
    this.combatSystem.cleanupDeadEntity(roomId, npc.name);

    // Remove all players from targeting this entity
    for (const playerName of targetingPlayers) {
      this.combatSystem.removeEntityTargeter(entityId, playerName);
    }

    // Clear combo points for all players who had combos built on this target
    // Use the NPC's instanceId (which is used as the combo target)
    if (npc instanceof NPC && npc.instanceId) {
      const comboManager = ComboManager.getInstance();
      const usersWithCombo: import('../types').User[] = [];

      // Collect users who may have combo points on this target
      for (const playerName of targetingPlayers) {
        const user = this.userManager.getUser(playerName);
        if (user) {
          usersWithCombo.push(user);
        }
      }

      // Clear combo points for all players targeting this NPC
      comboManager.onTargetDeath(npc.instanceId, usersWithCombo);
    }

    // Remove the NPC from active combatants
    this.activeCombatants = this.activeCombatants.filter((c) => c !== npc);
  }

  private handlePlayerDeath(targetPlayer: ConnectedClient): void {
    if (!targetPlayer.user) return;

    // Send death message to player
    writeFormattedMessageToClient(
      targetPlayer,
      colorize(`You have been defeated! Use "heal" to recover.\r\n`, 'red')
    );

    // Broadcast to others using the default boldYellow for status messages
    const username = formatUsername(targetPlayer.user.username);
    const message = `${username} has been defeated in combat!\r\n`;

    // If this player died, end combat for them
    if (targetPlayer === this.player) {
      this.activeCombatants = [];
    }

    // Broadcast to all other players in the room
    if (targetPlayer.user.currentRoomId) {
      const room = this.roomManager.getRoom(targetPlayer.user.currentRoomId);
      if (room) {
        for (const playerName of room.players) {
          if (playerName !== targetPlayer.user.username) {
            const client = this.combatSystem.findClientByUsername(playerName);
            if (client) {
              writeFormattedMessageToClient(client, colorize(message, 'boldYellow'));
            }
          }
        }
      }
    }
  }

  public isDone(): boolean {
    const allDead = this.activeCombatants.every((c) => !c.isAlive());
    return allDead || !this.player.user || this.player.user.health <= 0;
  }

  endCombat(playerFled: boolean = false): void {
    if (!this.player.user) return;

    // Check if the player is already out of combat
    const wasInCombat = this.player.user.inCombat;

    // Update the player's combat status
    this.player.user.inCombat = false;
    this.userManager.updateUserStats(this.player.user.username, { inCombat: false });

    // Only show combat off message if the player was actually in combat
    if (wasInCombat && (this.activeCombatants.length === 0 || playerFled)) {
      // Clear the line first
      const clearLineSequence = '\r\x1B[K';
      writeToClient(this.player, clearLineSequence);

      // Send message to player without drawing prompt yet
      writeToClient(this.player, colorize(`*Combat Off*\r\n`, 'boldYellow'));

      // Now draw the prompt explicitly once
      drawCommandPrompt(this.player);

      // Broadcast to ALL players in the room
      if (this.player.user && this.player.user.currentRoomId) {
        const username = formatUsername(this.player.user.username);
        this.combatSystem.broadcastRoomCombatMessage(
          this.player.user.currentRoomId,
          `${username} is no longer in combat.\r\n`,
          'boldYellow' as ColorType,
          this.player.user.username
        );
      }
    } else if (this.brokenByPlayer) {
      // Clear the line first
      const clearLineSequence = '\r\x1B[K';
      writeToClient(this.player, clearLineSequence);

      // Send message to player without drawing prompt yet
      writeToClient(
        this.player,
        colorize(`You try to break combat, but the enemies are still hostile!\r\n`, 'boldYellow')
      );

      // Now draw the prompt explicitly once
      drawCommandPrompt(this.player);

      // Broadcast to others using the default boldYellow for status messages
      if (this.player.user) {
        const username = formatUsername(this.player.user.username);
        this.combatSystem.broadcastRoomCombatMessage(
          this.player.user.currentRoomId,
          `${username} tries to flee from combat!\r\n`,
          'boldYellow' as ColorType,
          this.player.user.username
        );
      }
    }
  }

  /**
   * Check if the player is still valid (connected and authenticated)
   */
  private isPlayerValid(): boolean {
    // Special case: Consider valid during transfers regardless of other checks
    // CRITICAL FIX: More aggressive client reference updating
    if (
      this.player &&
      this.player.stateData &&
      (this.player.stateData.transferInProgress || this.player.stateData.isSessionTransfer)
    ) {
      combatLogger.debug(`Session transfer in progress for player, considering valid`);
      return true;
    }

    // Case where player reference is completely broken
    if (!this.player || !this.player.user) {
      combatLogger.debug(`Player is invalid: null player or user`);

      // Add an additional 5-second grace period for lost references during transfers
      const currentTime = Date.now();
      if (this.lastActivityTime && currentTime - this.lastActivityTime < 5000) {
        combatLogger.debug(
          `Within grace period (${currentTime - this.lastActivityTime}ms), temporarily considering valid`
        );
        return true;
      }

      return false;
    }

    const username = this.player.user.username;
    // Find by username - more reliable than checking specific client
    // This handles the case where client reference changed but username is the same
    const allClients = this.combatSystem.findAllClientsByUsername(username);
    if (allClients.length > 0) {
      // Use the first connected client with this username
      const newClient = allClients[0];
      // Don't log if it's the same client to reduce noise
      if (newClient !== this.player) {
        combatLogger.info(
          `Updating player reference from ${this.player.id || 'unknown'} to ${newClient.id || 'unknown'}`
        );
        this.player = newClient;
      }
      return true;
    }

    combatLogger.warn(`No valid clients found for ${username}, marking invalid`);
    return false;
  }

  /**
   * Update the client reference when a session transfer happens
   * This ensures combat continues with the new client
   */
  public updateClientReference(newClient: ConnectedClient): void {
    if (!newClient.user) return;

    // Only update if this is the same user
    if (this.player.user && newClient.user.username === this.player.user.username) {
      const oldClientId = this.player.id || 'unknown';
      const newClientId = newClient.id || 'unknown';
      combatLogger.info(
        `Updating client reference for ${newClient.user.username} from ${oldClientId} to ${newClientId}`
      );

      // CRITICAL: Make sure we preserve the combat state if needed
      const hadActiveCombatants = this.activeCombatants.length > 0;
      const activeCombatantsCopy = [...this.activeCombatants];

      // Add a stronger reference binding to prevent GC issues
      newClient.stateData.combatInstance = this;

      // Simply update the reference
      this.player = newClient;

      // Make sure the combat flag is set
      if (newClient.user) {
        newClient.user.inCombat = true;
      }

      // Handle case where active combatants might be lost during transfer
      if (hadActiveCombatants && this.activeCombatants.length === 0) {
        combatLogger.info(
          `Restoring ${activeCombatantsCopy.length} combatants that were lost in transfer`
        );
        this.activeCombatants = activeCombatantsCopy;
      }

      // Update the activity timestamp
      this.lastActivityTime = Date.now();

      // Log combat status
      combatLogger.debug(`After update, player.user.inCombat = ${newClient.user.inCombat}`);
      combatLogger.debug(`Active combatants after update: ${this.activeCombatants.length}`);
    } else {
      if (!this.player.user) {
        combatLogger.warn(`Cannot update client reference: player has no user property`);
      } else {
        combatLogger.warn(
          `Username mismatch: expected ${this.player.user.username}, got ${newClient.user.username}`
        );
      }
    }
  }

  /**
   * Helper method to check if an NPC with a specific template ID exists in a room
   */
  private isNpcInRoomByTemplateId(room: Room, templateId: string): boolean {
    const npcs = Array.from(room.npcs.values());
    return npcs.some((npc) => npc.templateId === templateId);
  }
}
