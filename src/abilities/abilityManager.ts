import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import {
  AbilityTemplate,
  AbilityType,
  CooldownType,
  PlayerCooldowns,
  AbilityCooldownState,
} from './types';
import { EffectManager } from '../effects/effectManager';
import { UserManager } from '../user/userManager';
import { RoomManager } from '../room/roomManager';
import { ConnectedClient } from '../types';
import { createMechanicsLogger } from '../utils/logger';
import { writeFormattedMessageToClient } from '../utils/socketWriter';
import { colorize } from '../utils/colors';
import { ItemManager } from '../utils/itemManager';

const abilityLogger = createMechanicsLogger('AbilityManager');

export interface CanUseResult {
  ok: boolean;
  reason?: string;
}

export class AbilityManager extends EventEmitter {
  private static instance: AbilityManager | null = null;

  private abilities: Map<string, AbilityTemplate> = new Map();
  private playerCooldowns: Map<string, PlayerCooldowns> = new Map();
  private activeCombatAbilities: Map<string, { abilityId: string; remainingRounds: number }> =
    new Map();
  private currentRound: number = 0;

  private userManager: UserManager;
  private roomManager: RoomManager;
  private effectManager: EffectManager;

  private constructor(
    userManager: UserManager,
    roomManager: RoomManager,
    effectManager: EffectManager
  ) {
    super();
    this.userManager = userManager;
    this.roomManager = roomManager;
    this.effectManager = effectManager;
    this.loadAbilities();
    abilityLogger.info('AbilityManager initialized');
  }

  public static getInstance(
    userManager: UserManager,
    roomManager: RoomManager,
    effectManager: EffectManager
  ): AbilityManager {
    if (!AbilityManager.instance) {
      AbilityManager.instance = new AbilityManager(userManager, roomManager, effectManager);
    } else {
      AbilityManager.instance.userManager = userManager;
      AbilityManager.instance.roomManager = roomManager;
      AbilityManager.instance.effectManager = effectManager;
    }
    return AbilityManager.instance;
  }

  public static resetInstance(): void {
    AbilityManager.instance = null;
  }

  private loadAbilities(): void {
    try {
      const filePath = path.join(process.cwd(), 'data', 'abilities.json');
      const data = fs.readFileSync(filePath, 'utf-8');
      const abilities: AbilityTemplate[] = JSON.parse(data);

      abilities.forEach((ability) => {
        this.abilities.set(ability.id, ability);
        abilityLogger.debug(`Loaded ability: ${ability.id}`);
      });

      abilityLogger.info(`Loaded ${this.abilities.size} abilities`);
    } catch (error) {
      abilityLogger.error('Failed to load abilities:', error);
    }
  }

  public getAbility(id: string): AbilityTemplate | undefined {
    return this.abilities.get(id.toLowerCase());
  }

  public getAllAbilities(): AbilityTemplate[] {
    return Array.from(this.abilities.values());
  }

  public getAbilitiesByType(type: AbilityType): AbilityTemplate[] {
    return this.getAllAbilities().filter((a) => a.type === type);
  }

  public setCurrentRound(round: number): void {
    this.currentRound = round;
  }

  public getCurrentRound(): number {
    return this.currentRound;
  }

  public canUseAbility(username: string, abilityId: string): CanUseResult {
    const ability = this.getAbility(abilityId);
    if (!ability) {
      return { ok: false, reason: 'Unknown ability.' };
    }

    const user = this.userManager.getUser(username);
    if (!user) {
      return { ok: false, reason: 'User not found.' };
    }

    if (user.mana < ability.mpCost) {
      return { ok: false, reason: `Not enough mana. Need ${ability.mpCost}, have ${user.mana}.` };
    }

    const cooldownRemaining = this.getCooldownRemaining(username, abilityId);
    if (cooldownRemaining > 0) {
      if (ability.cooldownType === CooldownType.ROUNDS) {
        return { ok: false, reason: `On cooldown for ${cooldownRemaining} more round(s).` };
      } else {
        return { ok: false, reason: `On cooldown for ${cooldownRemaining} more second(s).` };
      }
    }

    if (ability.requirements) {
      if (ability.requirements.level && user.level < ability.requirements.level) {
        return { ok: false, reason: `Requires level ${ability.requirements.level}.` };
      }
      if (ability.requirements.stats) {
        for (const [stat, required] of Object.entries(ability.requirements.stats)) {
          const userStat = (user as unknown as Record<string, unknown>)[stat] ?? 0;
          if (typeof userStat === 'number' && userStat < required) {
            return { ok: false, reason: `Requires ${stat} ${required}.` };
          }
        }
      }
    }

    return { ok: true };
  }

  public isOnCooldown(username: string, abilityId: string): boolean {
    return this.getCooldownRemaining(username, abilityId) > 0;
  }

  public getCooldownRemaining(username: string, abilityId: string): number {
    const ability = this.getAbility(abilityId);
    if (!ability) return 0;

    const cooldowns = this.playerCooldowns.get(username);
    if (!cooldowns) return 0;

    const state = cooldowns[abilityId];
    if (!state) return 0;

    switch (ability.cooldownType) {
      case CooldownType.ROUNDS: {
        if (state.lastUsedRound === undefined) return 0;
        const roundsPassed = this.currentRound - state.lastUsedRound;
        return Math.max(0, ability.cooldownValue - roundsPassed);
      }

      case CooldownType.SECONDS: {
        if (state.lastUsedTimestamp === undefined) return 0;
        const secondsPassed = Math.floor((Date.now() - state.lastUsedTimestamp) / 1000);
        return Math.max(0, ability.cooldownValue - secondsPassed);
      }

      case CooldownType.USES:
        if (state.usesRemaining === undefined) return 0;
        return state.usesRemaining <= 0 ? Infinity : 0;

      default:
        return 0;
    }
  }

  private startCooldown(username: string, abilityId: string): void {
    const ability = this.getAbility(abilityId);
    if (!ability) return;

    let cooldowns = this.playerCooldowns.get(username);
    if (!cooldowns) {
      cooldowns = {};
      this.playerCooldowns.set(username, cooldowns);
    }

    const state: AbilityCooldownState = {};

    switch (ability.cooldownType) {
      case CooldownType.ROUNDS:
        state.lastUsedRound = this.currentRound;
        break;
      case CooldownType.SECONDS:
        state.lastUsedTimestamp = Date.now();
        break;
      case CooldownType.USES: {
        const existing = cooldowns[abilityId];
        state.usesRemaining = (existing?.usesRemaining ?? ability.cooldownValue) - 1;
        break;
      }
    }

    cooldowns[abilityId] = state;
  }

  public useMana(username: string, amount: number): boolean {
    const user = this.userManager.getUser(username);
    if (!user || user.mana < amount) return false;

    return this.userManager.updateUserStats(username, {
      mana: user.mana - amount,
    });
  }

  public hasMana(username: string, amount: number): boolean {
    const user = this.userManager.getUser(username);
    return user !== undefined && user.mana >= amount;
  }

  public onGameTick(): void {
    this.currentRound++;
    abilityLogger.debug(`Round advanced to ${this.currentRound}`);
  }

  public clearCooldowns(username: string): void {
    this.playerCooldowns.delete(username);
    abilityLogger.debug(`Cleared cooldowns for ${username}`);
  }

  public getPlayerCooldowns(username: string): PlayerCooldowns {
    return this.playerCooldowns.get(username) ?? {};
  }

  public activateCombatAbility(username: string, abilityId: string, rounds: number): boolean {
    const ability = this.getAbility(abilityId);
    if (!ability || ability.type !== AbilityType.COMBAT) return false;

    this.activeCombatAbilities.set(username, { abilityId, remainingRounds: rounds });
    abilityLogger.info(
      `${username} activated combat ability: ${ability.name} for ${rounds} rounds`
    );
    return true;
  }

  public hasActiveCombatAbility(username: string): boolean {
    const active = this.activeCombatAbilities.get(username);
    return active !== undefined && active.remainingRounds > 0;
  }

  public getActiveCombatAbility(username: string): AbilityTemplate | undefined {
    const active = this.activeCombatAbilities.get(username);
    if (!active || active.remainingRounds <= 0) return undefined;
    return this.getAbility(active.abilityId);
  }

  public decrementCombatAbility(username: string): void {
    const active = this.activeCombatAbilities.get(username);
    if (!active) return;

    active.remainingRounds--;
    if (active.remainingRounds <= 0) {
      this.activeCombatAbilities.delete(username);
      abilityLogger.debug(`${username} combat ability expired`);
    }
  }

  public deactivateCombatAbility(username: string): void {
    if (this.activeCombatAbilities.has(username)) {
      this.activeCombatAbilities.delete(username);
      abilityLogger.info(`${username} combat ability deactivated`);
    }
  }

  public executeCombatAbilityAttack(
    client: ConnectedClient,
    targetId: string,
    isNpc: boolean
  ): { hit: boolean; damage: number; message: string } {
    if (!client.user) {
      return { hit: false, damage: 0, message: 'Not logged in' };
    }

    const ability = this.getActiveCombatAbility(client.user.username);
    if (!ability) {
      return { hit: false, damage: 0, message: 'No active combat ability' };
    }

    const hit = Math.random() < 0.65;

    if (!hit) {
      return { hit: false, damage: 0, message: `Your ${ability.name} misses!` };
    }

    for (const effect of ability.effects) {
      this.effectManager.addEffect(targetId, !isNpc, {
        type: effect.effectType as import('../types/effects').EffectType,
        name: effect.name ?? ability.name,
        description: effect.description ?? ability.description,
        durationTicks: effect.durationTicks,
        tickInterval: effect.tickInterval,
        payload: effect.payload,
        targetId: targetId,
        isPlayerEffect: !isNpc,
        sourceId: client.user.username,
        stackingBehavior: effect.stackingBehavior,
        isTimeBased: false,
      });
    }

    const damage = ability.effects.reduce((total, e) => {
      return total + (e.payload.damageAmount ?? e.payload.damagePerTick ?? 0);
    }, 0);

    return {
      hit: true,
      damage,
      message: `Your ${ability.name} strikes for ${damage} damage!`,
    };
  }

  public checkWeaponProc(
    client: ConnectedClient,
    weaponId: string,
    targetId: string,
    isNpcTarget: boolean
  ): { triggered: boolean; abilityName?: string } {
    if (!client.user) return { triggered: false };

    const itemManager = ItemManager.getInstance();
    const instance = itemManager.getItemInstance(weaponId);
    const template = instance
      ? itemManager.getItem(instance.templateId)
      : itemManager.getItem(weaponId);

    if (!template) return { triggered: false };

    const procAbilityId = (template as unknown as Record<string, unknown>).procAbility as
      | string
      | undefined;
    if (!procAbilityId) return { triggered: false };

    const ability = this.getAbility(procAbilityId);
    if (!ability || ability.type !== AbilityType.PROC) return { triggered: false };

    const procChance = ability.procChance ?? 0.1;
    if (Math.random() >= procChance) return { triggered: false };

    for (const effect of ability.effects) {
      this.effectManager.addEffect(targetId, !isNpcTarget, {
        type: effect.effectType as import('../types/effects').EffectType,
        name: effect.name ?? ability.name,
        description: effect.description ?? ability.description,
        durationTicks: effect.durationTicks,
        tickInterval: effect.tickInterval,
        payload: effect.payload,
        targetId: targetId,
        isPlayerEffect: !isNpcTarget,
        sourceId: client.user.username,
        stackingBehavior: effect.stackingBehavior,
        isTimeBased: false,
      });
    }

    abilityLogger.info(`${client.user.username} triggered weapon proc: ${ability.name}`);
    return { triggered: true, abilityName: ability.name };
  }

  public executeItemAbility(client: ConnectedClient, itemId: string, targetId?: string): boolean {
    if (!client.user) {
      writeFormattedMessageToClient(
        client,
        colorize('You must be logged in to use items.\r\n', 'red')
      );
      return false;
    }

    const username = client.user.username;
    const itemManager = ItemManager.getInstance();

    const instance = itemManager.getItemInstance(itemId);
    const template = instance
      ? itemManager.getItem(instance.templateId)
      : itemManager.getItem(itemId);

    if (!template) {
      writeFormattedMessageToClient(client, colorize(`Item not found: ${itemId}\r\n`, 'red'));
      return false;
    }

    const abilityId = (template as unknown as Record<string, unknown>).ability as
      | string
      | undefined;
    if (!abilityId) {
      writeFormattedMessageToClient(
        client,
        colorize(`${template.name} has no usable ability.\r\n`, 'yellow')
      );
      return false;
    }

    const ability = this.getAbility(abilityId);
    if (!ability || ability.type !== AbilityType.ITEM) {
      writeFormattedMessageToClient(
        client,
        colorize(`Invalid ability on ${template.name}.\r\n`, 'red')
      );
      return false;
    }

    const cooldownKey = `item:${itemId}`;
    const cooldownRemaining = this.getCooldownRemaining(username, cooldownKey);
    if (cooldownRemaining > 0) {
      writeFormattedMessageToClient(
        client,
        colorize(
          `${template.name} is on cooldown for ${cooldownRemaining} more seconds.\r\n`,
          'yellow'
        )
      );
      return false;
    }

    const user = this.userManager.getUser(username);
    if (!user || user.mana < ability.mpCost) {
      writeFormattedMessageToClient(
        client,
        colorize(`Not enough mana to use ${template.name}.\r\n`, 'red')
      );
      return false;
    }

    const resolvedTarget = this.resolveTarget(client, ability, targetId);
    if (!resolvedTarget) return false;

    if (ability.mpCost > 0 && !this.useMana(username, ability.mpCost)) {
      writeFormattedMessageToClient(client, colorize('Failed to use mana.\r\n', 'red'));
      return false;
    }

    this.startItemCooldown(username, cooldownKey, ability.cooldownValue);

    if (ability.consumesItem && client.user.inventory?.items) {
      const itemIndex = client.user.inventory.items.indexOf(itemId);
      if (itemIndex !== -1) {
        client.user.inventory.items.splice(itemIndex, 1);
        this.userManager.updateUserInventory(username, client.user.inventory);
        writeFormattedMessageToClient(
          client,
          colorize(`The ${template.name} is consumed.\r\n`, 'gray')
        );
      }
    }

    this.applyAbilityEffects(client, ability, resolvedTarget);

    writeFormattedMessageToClient(client, colorize(`You use ${template.name}!\r\n`, 'green'));

    abilityLogger.info(`${username} used item ${template.name} (${ability.name})`);
    return true;
  }

  private startItemCooldown(username: string, cooldownKey: string, _seconds: number): void {
    let cooldowns = this.playerCooldowns.get(username);
    if (!cooldowns) {
      cooldowns = {};
      this.playerCooldowns.set(username, cooldowns);
    }
    cooldowns[cooldownKey] = { lastUsedTimestamp: Date.now() };
  }

  public executeAbility(client: ConnectedClient, abilityId: string, targetId?: string): boolean {
    if (!client.user) {
      writeFormattedMessageToClient(
        client,
        colorize('You must be logged in to use abilities.\r\n', 'red')
      );
      return false;
    }

    const username = client.user.username;
    const ability = this.getAbility(abilityId);

    if (!ability) {
      writeFormattedMessageToClient(client, colorize(`Unknown ability: ${abilityId}\r\n`, 'red'));
      return false;
    }

    const canUse = this.canUseAbility(username, abilityId);
    if (!canUse.ok) {
      writeFormattedMessageToClient(
        client,
        colorize(`Cannot use ${ability.name}: ${canUse.reason}\r\n`, 'red')
      );
      return false;
    }

    const resolvedTarget = this.resolveTarget(client, ability, targetId);
    if (!resolvedTarget) {
      return false;
    }

    if (!this.useMana(username, ability.mpCost)) {
      writeFormattedMessageToClient(client, colorize('Failed to use mana.\r\n', 'red'));
      return false;
    }

    this.startCooldown(username, abilityId);
    this.applyAbilityEffects(client, ability, resolvedTarget);

    writeFormattedMessageToClient(client, colorize(`You cast ${ability.name}!\r\n`, 'cyan'));

    abilityLogger.info(
      `${username} cast ${ability.name} on ${resolvedTarget.id} (${resolvedTarget.type})`
    );

    return true;
  }

  private resolveTarget(
    client: ConnectedClient,
    ability: AbilityTemplate,
    targetId?: string
  ): { id: string; type: 'player' | 'npc' } | null {
    const user = client.user!;
    const roomId = user.currentRoomId;
    const room = this.roomManager.getRoom(roomId);

    switch (ability.targetType) {
      case 'self':
        return { id: user.username, type: 'player' };

      case 'enemy':
        if (!targetId) {
          writeFormattedMessageToClient(
            client,
            colorize(`${ability.name} requires a target.\r\n`, 'yellow')
          );
          return null;
        }
        if (room) {
          const npc = Array.from(room.npcs.values()).find(
            (n) =>
              n.instanceId.toLowerCase() === targetId.toLowerCase() ||
              n.templateId.toLowerCase() === targetId.toLowerCase()
          );
          if (npc) {
            return { id: npc.instanceId, type: 'npc' };
          }
        }
        writeFormattedMessageToClient(
          client,
          colorize(`Target '${targetId}' not found.\r\n`, 'red')
        );
        return null;

      case 'ally': {
        if (!targetId) {
          return { id: user.username, type: 'player' };
        }
        const allyUser = this.userManager.getUser(targetId);
        if (allyUser) {
          return { id: allyUser.username, type: 'player' };
        }
        writeFormattedMessageToClient(client, colorize(`Ally '${targetId}' not found.\r\n`, 'red'));
        return null;
      }

      case 'room':
        return { id: user.username, type: 'player' };

      default:
        return null;
    }
  }

  private applyAbilityEffects(
    client: ConnectedClient,
    ability: AbilityTemplate,
    target: { id: string; type: 'player' | 'npc' }
  ): void {
    const isPlayer = target.type === 'player';

    for (const effect of ability.effects) {
      this.effectManager.addEffect(target.id, isPlayer, {
        type: effect.effectType as import('../types/effects').EffectType,
        name: effect.name ?? ability.name,
        description: effect.description ?? ability.description,
        durationTicks: effect.durationTicks,
        tickInterval: effect.tickInterval,
        payload: effect.payload,
        targetId: target.id,
        isPlayerEffect: isPlayer,
        sourceId: client.user!.username,
        stackingBehavior: effect.stackingBehavior,
        isTimeBased: false,
      });
    }
  }
}
