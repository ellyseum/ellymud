import { ClientState, ClientStateType, ConnectedClient } from '../types';
import { UserManager } from '../user/userManager';
import { colorize } from '../utils/colors';
import { writeToClient } from '../utils/socketWriter';
import { formatUsername } from '../utils/formatters';

export class ConfirmationState implements ClientState {
  name = ClientStateType.CONFIRMATION;

  constructor(private userManager: UserManager) {}

  enter(client: ConnectedClient): void {
    if (!client.user) {
      // Something went wrong, go back to login
      client.stateData.transitionTo = ClientStateType.LOGIN;
      return;
    }

    client.stateData.maskInput = false;

    // Character creation complete header
    writeToClient(client, '\r\n');
    writeToClient(
      client,
      colorize('    ╔═══════════════════════════════════════════════════════╗\r\n', 'green')
    );
    writeToClient(
      client,
      colorize('    ║', 'green') +
        colorize('            YOUR LEGEND BEGINS HERE                    ', 'bright') +
        colorize('║\r\n', 'green')
    );
    writeToClient(
      client,
      colorize('    ╚═══════════════════════════════════════════════════════╝\r\n', 'green')
    );
    writeToClient(client, '\r\n');

    // Character summary
    writeToClient(
      client,
      colorize('    The scribes have recorded your arrival in Thornwood Vale:\r\n\r\n', 'gray')
    );

    writeToClient(
      client,
      colorize('    ┌─────────────────────────────────────────────────────┐\r\n', 'cyan')
    );
    writeToClient(
      client,
      colorize('    │  ', 'cyan') +
        colorize('Name:  ', 'white') +
        colorize(formatUsername(client.user.username).padEnd(42), 'yellow') +
        colorize(' │\r\n', 'cyan')
    );
    const raceName = client.user.raceId
      ? client.user.raceId.charAt(0).toUpperCase() + client.user.raceId.slice(1)
      : 'Unknown';
    writeToClient(
      client,
      colorize('    │  ', 'cyan') +
        colorize('Race:  ', 'white') +
        colorize(raceName.padEnd(42), 'green') +
        colorize(' │\r\n', 'cyan')
    );
    writeToClient(
      client,
      colorize('    │  ', 'cyan') +
        colorize('Class: ', 'white') +
        colorize('Adventurer (Tier 0)'.padEnd(42), 'magenta') +
        colorize(' │\r\n', 'cyan')
    );
    writeToClient(
      client,
      colorize('    │  ', 'cyan') +
        colorize('Level: ', 'white') +
        colorize('1'.padEnd(42), 'white') +
        colorize(' │\r\n', 'cyan')
    );
    writeToClient(
      client,
      colorize('    └─────────────────────────────────────────────────────┘\r\n', 'cyan')
    );

    writeToClient(client, '\r\n');
    writeToClient(
      client,
      colorize('    Review your character above. Is this correct?\r\n\r\n', 'white')
    );
    writeToClient(
      client,
      colorize('    Type ', 'gray') +
        colorize('"confirm"', 'green') +
        colorize(' to enter the world, or ', 'gray') +
        colorize('"cancel"', 'red') +
        colorize(' to start over: ', 'gray')
    );
  }

  handle(client: ConnectedClient, input: string): void {
    const command = input.toLowerCase();

    if (command === 'confirm') {
      // Only set authenticated to true AFTER confirmation
      client.authenticated = true;
      writeToClient(
        client,
        colorize('Registration confirmed! Welcome to the adventure!\r\n', 'green')
      );
      client.stateData.transitionTo = ClientStateType.AUTHENTICATED;
    } else if (command === 'cancel') {
      // Remove the user if they cancel
      if (client.user) {
        const username = client.user.username;
        this.userManager.deleteUser(username);

        // Reset the client
        client.user = null;
        client.authenticated = false;
      }

      writeToClient(
        client,
        colorize('Registration cancelled. Please try again if you change your mind.\r\n', 'red')
      );
      client.stateData.transitionTo = ClientStateType.LOGIN;
    } else {
      writeToClient(
        client,
        colorize('Invalid command. Please type "confirm" or "cancel": ', 'red')
      );
    }
  }

  exit(_client: ConnectedClient): void {
    // No specific cleanup needed for confirmation state
  }
}
