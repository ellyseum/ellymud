// Authenticated state uses any for NPC room checking
import { ClientState, ClientStateType, ConnectedClient, User } from '../types';
import { colorize } from '../utils/colors';
import {
  writeToClient,
  writeFormattedMessageToClient,
  drawCommandPrompt,
} from '../utils/socketWriter';
import { formatUsername } from '../utils/formatters';
import { RoomManager, EMERGENCY_ROOM_ID } from '../room/roomManager';
import { Room } from '../room/room';
import { UserManager } from '../user/userManager';
import { CombatSystem } from '../combat/combatSystem';
import { CommandHandler } from '../utils/commandHandler';
import { ItemManager } from '../utils/itemManager';
import { CommandRegistry } from '../command/commandRegistry';
import { StateMachine } from '../state/stateMachine'; // Add StateMachine import
import { createContextLogger } from '../utils/logger';
import { EffectManager } from '../effects/effectManager';
import { AbilityManager } from '../abilities/abilityManager';

// Create context-specific logger for authenticated state
const authStateLogger = createContextLogger('AuthenticatedState');

export class AuthenticatedState implements ClientState {
  name = ClientStateType.AUTHENTICATED;
  private roomManager: RoomManager;
  private userManager: UserManager;
  private combatSystem: CombatSystem;
  private commandHandler: CommandHandler;
  private commandRegistry: CommandRegistry;
  private abilityManager: AbilityManager;

  constructor(
    private clients: Map<string, ConnectedClient>,
    private stateMachine?: StateMachine
  ) {
    // Get singleton instances
    this.roomManager = RoomManager.getInstance(clients);
    this.userManager = UserManager.getInstance();
    this.combatSystem = CombatSystem.getInstance(this.userManager, this.roomManager);
    this.commandHandler = new CommandHandler(this.roomManager, this.userManager);

    // Get effect manager for ability system
    const effectManager = EffectManager.getInstance(this.userManager, this.roomManager);
    this.abilityManager = AbilityManager.getInstance(
      this.userManager,
      this.roomManager,
      effectManager
    );

    // Wire AbilityManager to CombatSystem for combat abilities
    this.combatSystem.setAbilityManager(this.abilityManager);

    // StateMachine is required for CommandRegistry
    if (!this.stateMachine) {
      throw new Error('AuthenticatedState requires a StateMachine instance');
    }

    // Use the singleton instance of CommandRegistry
    this.commandRegistry = CommandRegistry.getInstance(
      clients,
      this.roomManager,
      this.combatSystem,
      this.userManager,
      this.stateMachine,
      this.abilityManager
    );

    // Connect the command registry to the command handler
    this.commandHandler.setCommandRegistry(this.commandRegistry);
  }

  public enter(client: ConnectedClient): void {
    if (!client.user) {
      client.stateData.transitionTo = ClientStateType.LOGIN;
      return;
    }

    // Reset state data for fresh state
    client.stateData = client.stateData || {};

    // Disable password masking (fixes the direct admin login bug)
    client.stateData.maskInput = false;
    client.connection.setMaskInput(false);

    // Initialize ItemManager for equipment calculations
    const itemManager = ItemManager.getInstance();

    // Check for undefined character statistics and initialize them if needed
    if (
      client.user &&
      (client.user.strength === undefined ||
        client.user.dexterity === undefined ||
        client.user.agility === undefined ||
        client.user.constitution === undefined ||
        client.user.wisdom === undefined ||
        client.user.intelligence === undefined ||
        client.user.charisma === undefined)
    ) {
      authStateLogger.info(`Initializing missing statistics for ${client.user.username}`);

      // Create default stats object with only the missing properties
      const defaultStats: Partial<User> = {};

      if (client.user.strength === undefined) defaultStats.strength = 10;
      if (client.user.dexterity === undefined) defaultStats.dexterity = 10;
      if (client.user.agility === undefined) defaultStats.agility = 10;
      if (client.user.constitution === undefined) defaultStats.constitution = 10;
      if (client.user.wisdom === undefined) defaultStats.wisdom = 10;
      if (client.user.intelligence === undefined) defaultStats.intelligence = 10;
      if (client.user.charisma === undefined) defaultStats.charisma = 10;

      // Update only the missing stats
      Object.assign(client.user, defaultStats);

      // Save the updated user stats to persistence
      this.userManager.updateUserStats(client.user.username, defaultStats);

      writeToClient(
        client,
        colorize(`Your character statistics have been initialized!\r\n`, 'green')
      );
    }

    // Check for undefined combat stats and equipment
    if (
      client.user &&
      (client.user.attack === undefined ||
        client.user.defense === undefined ||
        client.user.equipment === undefined)
    ) {
      authStateLogger.info(
        `Initializing missing combat stats and equipment for ${client.user.username}`
      );

      // Create default values for missing properties
      const defaultCombatStats: Partial<User> = {};

      // Initialize combat stats based on character attributes
      if (client.user.attack === undefined) {
        defaultCombatStats.attack = Math.floor(client.user.strength / 2);
      }

      if (client.user.defense === undefined) {
        defaultCombatStats.defense = Math.floor(client.user.constitution / 2);
      }

      if (client.user.equipment === undefined) {
        defaultCombatStats.equipment = {};
      }

      // Update user with defaults
      Object.assign(client.user, defaultCombatStats);

      // Save the updated stats to persistence
      this.userManager.updateUserStats(client.user.username, defaultCombatStats);

      writeToClient(client, colorize(`Your combat statistics have been initialized!\r\n`, 'green'));
    }

    // Recalculate and update attack and defense values based on equipment
    if (client.user.equipment) {
      client.user.attack = itemManager.calculateAttack(client.user);
      client.user.defense = itemManager.calculateDefense(client.user);

      // We don't need to notify the user about this - it happens every login
      this.userManager.updateUserStats(client.user.username, {
        attack: client.user.attack,
        defense: client.user.defense,
      });
    }

    // Clean up orphaned item instances from inventory
    if (client.user.inventory?.items && client.user.inventory.items.length > 0) {
      const validItems: string[] = [];
      const orphanedItems: string[] = [];

      for (const instanceId of client.user.inventory.items) {
        const instance = itemManager.getItemInstance(instanceId);
        if (instance) {
          validItems.push(instanceId);
        } else {
          orphanedItems.push(instanceId);
        }
      }

      if (orphanedItems.length > 0) {
        client.user.inventory.items = validItems;
        this.userManager.updateUserInventory(client.user.username, client.user.inventory);
        authStateLogger.warn(
          `Cleaned up ${orphanedItems.length} orphaned item(s) from ${client.user.username}'s inventory: ${orphanedItems.join(', ')}`
        );
        writeToClient(
          client,
          colorize(
            `${orphanedItems.length} corrupted item(s) were removed from your inventory.\r\n`,
            'yellow'
          )
        );
      }
    }

    // Check and fix inconsistent unconscious state
    if (client.user.isUnconscious && client.user.health > 0) {
      authStateLogger.info(
        `Fixing inconsistent unconscious state for ${client.user.username}. HP: ${client.user.health}, but marked as unconscious`
      );
      client.user.isUnconscious = false;
      this.userManager.updateUserStats(client.user.username, { isUnconscious: false });
      writeToClient(
        client,
        colorize(`You regain consciousness as your health has been restored above 0.\r\n`, 'green')
      );
    }

    // Auto-heal when session transfer happens to avoid issues if player was low health
    if (client.stateData && client.stateData.isSessionTransfer) {
      // Check if health is low in a session transfer and auto-heal partially if needed
      // This prevents player from getting killed immediately after transfer
      if (client.user.health < client.user.maxHealth * 0.3) {
        // Heal to at least 30% of max health to give a fighting chance
        client.user.health = Math.max(client.user.health, Math.floor(client.user.maxHealth * 0.3));
        this.userManager.updateUserStats(client.user.username, { health: client.user.health });
      }
    }

    // Check if returning from editor state
    const returningFromEditor = client.stateData.previousState === ClientStateType.EDITOR;

    // If returning from editor, restore the room from previousRoomId
    if (returningFromEditor && client.stateData.previousRoomId) {
      client.user.currentRoomId = client.stateData.previousRoomId;
      delete client.stateData.previousRoomId;
      delete client.stateData.previousState;
    }

    // Ensure player has a valid room - treat empty or emergency room as "needs assignment"
    const savedRoomId = client.user.currentRoomId;
    const needsRoomAssignment = !savedRoomId || savedRoomId === EMERGENCY_ROOM_ID;

    if (needsRoomAssignment) {
      // Assign player to the starting room
      const startingRoomId = this.roomManager.getStartingRoomId();
      if (startingRoomId !== EMERGENCY_ROOM_ID) {
        client.user.currentRoomId = startingRoomId;
        authStateLogger.info(
          `Assigned ${client.user.username} to starting room: ${startingRoomId}`
        );
      }
    }

    // Ensure client is in the room
    if (client.user.currentRoomId) {
      // Try to use the most likely method - let's use the direct Room approach
      const room = this.roomManager.getRoom(client.user.currentRoomId);

      // Ensure player is added to the room's player list so NPCs can target them
      if (room) {
        room.addPlayer(client.user.username);

        if (room.npcs.size > 0) {
          const npcsArray = Array.from(room.npcs.values());
          if (npcsArray.length > 0) {
            const firstNpc = npcsArray[0];
            authStateLogger.debug(`Room has NPCs. First NPC: ${firstNpc.name}`);
          }
          this.checkForHostileNPCs(client, room);
        }
      }
    }

    // If returning from editor, broadcast re-entry message and show room
    if (returningFromEditor) {
      const username = formatUsername(client.user.username);
      // Broadcast to all players
      this.broadcastToAllPlayers(`${username} has entered the game.\r\n`, client);
      // Show room and prompt
      this.roomManager.lookRoom(client);
      drawCommandPrompt(client);
      return; // Skip the banner since this is a re-entry
    }

    // Draw banner and show room description
    this.drawBanner(client);
    this.roomManager.lookRoom(client);

    // FIX: Explicitly draw the command prompt after room description
    // This ensures there's no extra line between room description and prompt
    drawCommandPrompt(client);

    // If player is in combat, make sure the prompt shows the correct state
    if (client.user.inCombat) {
      authStateLogger.info(`User ${client.user.username} entered with inCombat flag set`);

      // Fix for combat after session transfer: ensure combat system knows about this client
      if (!this.combatSystem.isInCombat(client)) {
        authStateLogger.info(`Combat flag mismatch - fixing`);

        // Get the current room to find potential targets
        const room = this.roomManager.getRoom(client.user.currentRoomId);
        if (room && room.npcs.size > 0) {
          const npcsArray = Array.from(room.npcs.values());
          if (npcsArray.length > 0) {
            const firstNpc = npcsArray[0];
            authStateLogger.debug(`Room has NPCs. First NPC: ${firstNpc.name}`);
          }
          this.commandHandler.handleAttackCommand(client, [npcsArray[0].instanceId]);
        } else {
          // No valid targets, clear combat flag
          client.user.inCombat = false;
          this.userManager.updateUserStats(client.user.username, { inCombat: false });
        }
      }
    }

    // Broadcast login notification to other players
    this.broadcastLogin(client);

    // Update user's last login time and calculate total play time
    if (client.user.lastLoginTime) {
      const now = new Date();
      const sessionTime = Math.floor(
        (now.getTime() - new Date(client.user.lastLoginTime).getTime()) / 1000
      );
      client.user.totalPlayTime = (client.user.totalPlayTime || 0) + sessionTime;
      this.userManager.updateUserStats(client.user.username, {
        totalPlayTime: client.user.totalPlayTime,
      });
    }
    client.user.lastLoginTime = new Date();
    this.userManager.updateUserStats(client.user.username, {
      lastLoginTime: client.user.lastLoginTime,
    });
  }

  handle(client: ConnectedClient, input: string): void {
    // Make sure we have a valid authenticated user
    if (!client.user) {
      client.stateData.transitionTo = ClientStateType.LOGIN;
      return;
    }

    // Use the CommandHandler to process the command
    this.commandHandler.handleCommand(client, input);
  }

  /**
   * Draw welcome banner for the player
   */
  private drawBanner(client: ConnectedClient): void {
    if (!client.user) return;

    const user = client.user;
    const className = user.classId || 'adventurer';
    const raceName = user.raceId || 'unknown';

    writeToClient(client, '\r\n');
    writeToClient(
      client,
      colorize('    ═══════════════════════════════════════════════════════\r\n', 'cyan')
    );
    writeToClient(
      client,
      colorize('      Welcome back, ', 'white') +
        colorize(formatUsername(user.username), 'yellow') +
        colorize('!\r\n', 'white')
    );
    writeToClient(
      client,
      colorize('    ═══════════════════════════════════════════════════════\r\n', 'cyan')
    );
    writeToClient(client, '\r\n');

    // Format race and class names nicely
    const raceDisplay = raceName.charAt(0).toUpperCase() + raceName.slice(1);
    const classDisplay = className.charAt(0).toUpperCase() + className.slice(1).replace(/_/g, ' ');
    const gold = user.inventory?.currency?.gold ?? 0;

    // Character quick stats
    writeToClient(
      client,
      colorize('    ', 'white') +
        colorize(`${raceDisplay} ${classDisplay}`, 'green') +
        colorize(' | ', 'gray') +
        colorize(`Level ${user.level}`, 'yellow') +
        colorize(' | ', 'gray') +
        colorize(`${user.experience} XP`, 'cyan') +
        '\r\n'
    );
    writeToClient(
      client,
      colorize('    HP: ', 'white') +
        colorize(`${user.health}/${user.maxHealth}`, 'green') +
        colorize(' | MP: ', 'white') +
        colorize(`${user.mana ?? 0}/${user.maxMana ?? 0}`, 'blue') +
        colorize(' | Gold: ', 'white') +
        colorize(`${gold}`, 'yellow') +
        '\r\n'
    );

    writeToClient(client, '\r\n');

    // If this is a new session (not a transfer), show helpful tips
    if (!client.stateData.isSessionTransfer) {
      writeToClient(
        client,
        colorize('    Quick commands: ', 'gray') +
          colorize('look', 'cyan') +
          colorize(', ', 'gray') +
          colorize('inventory', 'cyan') +
          colorize(', ', 'gray') +
          colorize('help', 'cyan') +
          colorize(', ', 'gray') +
          colorize('quest', 'cyan') +
          '\r\n'
      );
    }

    writeToClient(
      client,
      colorize('    ───────────────────────────────────────────────────────\r\n', 'gray')
    );
    writeToClient(client, '\r\n');
  }

  // Broadcast login notification to all authenticated users except the one logging in
  private broadcastLogin(joiningClient: ConnectedClient): void {
    if (!joiningClient.user) return;

    const username = formatUsername(joiningClient.user.username);
    const message = `${username} has entered the game.\r\n`;

    for (const client of this.clients.values()) {
      // Only send to authenticated users who are not the joining client
      if (client.authenticated && client !== joiningClient) {
        writeFormattedMessageToClient(client, colorize(message, 'bright'));
      }
    }
  }

  /**
   * Check for hostile NPCs in the room and add them to combat entities list
   * so they can attack players automatically
   */
  private checkForHostileNPCs(client: ConnectedClient, room: Room): void {
    if (!client.user || !room || !room.npcs || !room.npcs.size) return;

    authStateLogger.debug(
      `Checking for hostile NPCs in room ${room.id} for player ${client.user.username}`
    );

    for (const npc of room.npcs.values()) {
      // Create a temporary entity to check if it's hostile
      const npcEntity = this.combatSystem['getSharedEntity'](room.id, npc.instanceId);

      if (npcEntity && npcEntity.isHostile) {
        authStateLogger.info(`Found hostile NPC ${npc.instanceId} in room ${room.id}`);

        // Add the entity to active combat entities for this room
        this.combatSystem['addEntityToCombatForRoom'](room.id, npc.instanceId);

        // Generate an entity ID for tracking
        const entityId = this.combatSystem.getEntityId(room.id, npc.instanceId);

        // Reset attack status to ensure it can attack in the next round
        this.combatSystem['resetEntityAttackStatus'](entityId);
      }
    }
  }

  exit(client: ConnectedClient): void {
    // Clean up any authenticated state specific resources
    // This is crucial for ensuring the state doesn't continue processing commands after transitioning away
    if (client.user && client.authenticated) {
      const username = client.user.username;
      const nextState = client.stateData?.transitionTo;

      // If transitioning to EDITOR, handle game exit
      if (nextState === ClientStateType.EDITOR) {
        // Save current room for return
        client.stateData.previousRoomId = client.user.currentRoomId;

        authStateLogger.debug(
          `User ${username} leaving authenticated state for EDITOR from room ${client.user.currentRoomId}`
        );
      } else {
        authStateLogger.debug(`User ${username} leaving authenticated state for ${nextState}`);
      }
    }
  }

  /**
   * Broadcasts a message to all authenticated players in the game
   */
  private broadcastToAllPlayers(message: string, excludeClient?: ConnectedClient): void {
    this.clients.forEach((c) => {
      if (c !== excludeClient && c.authenticated && c.user && c.user.currentRoomId) {
        writeFormattedMessageToClient(c, colorize(message, 'yellow'));
      }
    });
  }
}
