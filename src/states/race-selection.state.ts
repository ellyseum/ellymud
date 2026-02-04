/**
 * Race Selection State - Handles race selection during character creation
 * @module states/race-selection.state
 */

import { ClientState, ClientStateType, ConnectedClient, Race } from '../types';
import { UserManager } from '../user/userManager';
import { RaceManager } from '../race/raceManager';
import { colorize } from '../utils/colors';
import { writeToClient } from '../utils/socketWriter';

export class RaceSelectionState implements ClientState {
  name = ClientStateType.RACE_SELECTION;
  private raceManager: RaceManager;

  constructor(private userManager: UserManager) {
    this.raceManager = RaceManager.getInstance();
  }

  enter(client: ConnectedClient): void {
    // Ensure race manager is initialized
    void this.raceManager.ensureInitialized().then(() => {
      this.displayRaceSelection(client);
    });
  }

  private displayRaceSelection(client: ConnectedClient): void {
    const races = this.raceManager.getAllRaces();

    // Race selection header
    writeToClient(client, '\r\n');
    writeToClient(
      client,
      colorize('    ╔═══════════════════════════════════════════════════════╗\r\n', 'magenta')
    );
    writeToClient(
      client,
      colorize('    ║', 'magenta') +
        colorize('                CHOOSE YOUR HERITAGE                   ', 'bright') +
        colorize('║\r\n', 'magenta')
    );
    writeToClient(
      client,
      colorize('    ╚═══════════════════════════════════════════════════════╝\r\n', 'magenta')
    );
    writeToClient(client, '\r\n');

    writeToClient(
      client,
      colorize('    The blood that flows through your veins will shape your\r\n', 'gray')
    );
    writeToClient(
      client,
      colorize('    destiny. Choose wisely, for this choice is ', 'gray') +
        colorize('permanent', 'yellow') +
        colorize('.\r\n\r\n', 'gray')
    );

    // Display each race with its stats in a formatted box
    races.forEach((race, index) => {
      const raceIcon = this.getRaceIcon(race.id);
      writeToClient(
        client,
        colorize(`    ┌─── `, 'gray') +
          colorize(`${raceIcon} `, 'white') +
          colorize(`[${index + 1}] `, 'yellow') +
          colorize(race.name.toUpperCase(), 'cyan') +
          colorize(` ${'─'.repeat(Math.max(0, 40 - race.name.length))}┐\r\n`, 'gray')
      );
      writeToClient(
        client,
        colorize('    │ ', 'gray') +
          colorize(race.description.substring(0, 52).padEnd(52), 'white') +
          colorize(' │\r\n', 'gray')
      );
      writeToClient(
        client,
        colorize('    │ ', 'gray') +
          colorize(this.formatStatModifiers(race).padEnd(52), 'cyan') +
          colorize(' │\r\n', 'gray')
      );
      writeToClient(
        client,
        colorize('    │ ', 'gray') +
          colorize('★ ', 'yellow') +
          colorize(race.bonusDescription.substring(0, 50).padEnd(50), 'green') +
          colorize(' │\r\n', 'gray')
      );
      writeToClient(client, colorize('    └' + '─'.repeat(54) + '┘\r\n', 'gray'));
      writeToClient(client, '\r\n');
    });

    writeToClient(
      client,
      colorize('    Enter a ', 'white') +
        colorize('number', 'yellow') +
        colorize(' (1-' + races.length + ') or ', 'white') +
        colorize('race name', 'cyan') +
        colorize(': ', 'white')
    );
  }

  private getRaceIcon(raceId: string): string {
    const icons: Record<string, string> = {
      human: '*',
      elf: '~',
      dwarf: '#',
      halfling: 'o',
      orc: '!',
    };
    return icons[raceId] || '+';
  }

  private formatStatModifiers(race: Race): string {
    const mods = race.statModifiers;
    const parts: string[] = [];

    if (mods.strength !== 0) parts.push(`STR ${mods.strength > 0 ? '+' : ''}${mods.strength}`);
    if (mods.dexterity !== 0) parts.push(`DEX ${mods.dexterity > 0 ? '+' : ''}${mods.dexterity}`);
    if (mods.agility !== 0) parts.push(`AGI ${mods.agility > 0 ? '+' : ''}${mods.agility}`);
    if (mods.constitution !== 0)
      parts.push(`CON ${mods.constitution > 0 ? '+' : ''}${mods.constitution}`);
    if (mods.wisdom !== 0) parts.push(`WIS ${mods.wisdom > 0 ? '+' : ''}${mods.wisdom}`);
    if (mods.intelligence !== 0)
      parts.push(`INT ${mods.intelligence > 0 ? '+' : ''}${mods.intelligence}`);
    if (mods.charisma !== 0) parts.push(`CHA ${mods.charisma > 0 ? '+' : ''}${mods.charisma}`);

    return parts.length > 0 ? `Stats: ${parts.join(', ')}` : 'Stats: Balanced (no modifiers)';
  }

  handle(client: ConnectedClient, input: string): void {
    const trimmed = input.trim().toLowerCase();
    const races = this.raceManager.getAllRaces();

    // Try to match by number first
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num >= 1 && num <= races.length) {
      this.selectRace(client, races[num - 1]);
      return;
    }

    // Try to match by name
    const matchedRace = races.find((r) => r.id === trimmed || r.name.toLowerCase() === trimmed);

    if (matchedRace) {
      this.selectRace(client, matchedRace);
      return;
    }

    // Invalid selection
    writeToClient(
      client,
      colorize('Invalid selection. Please enter a number (1-5) or race name: ', 'red')
    );
  }

  private selectRace(client: ConnectedClient, race: Race): void {
    if (!client.user) {
      writeToClient(client, colorize('Error: No user data found.\r\n', 'red'));
      client.stateData.transitionTo = ClientStateType.LOGIN;
      return;
    }

    // Store the selected race
    client.stateData.selectedRaceId = race.id;

    // Apply race to the user
    this.userManager.applyRaceToUser(client.user.username, race.id);

    // Refresh user data after race application
    const updatedUser = this.userManager.getUser(client.user.username);
    if (updatedUser) {
      client.user = updatedUser;
    }

    writeToClient(client, colorize(`\r\nYou have chosen to be a ${race.name}!\r\n`, 'green'));
    writeToClient(client, colorize(`${race.bonusDescription}\r\n`, 'cyan'));

    // Transition to confirmation state
    client.stateData.transitionTo = ClientStateType.CONFIRMATION;
  }

  exit(_client: ConnectedClient): void {
    // No specific cleanup needed
  }
}
