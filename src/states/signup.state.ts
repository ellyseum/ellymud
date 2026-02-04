import { RESTRICTED_USERNAMES } from '../config';
import { ClientState, ClientStateType, ConnectedClient } from '../types';
import { UserManager } from '../user/userManager';
import { colorize } from '../utils/colors';
import { createSessionReferenceFile } from '../utils/fileUtils';
import { formatUsername, standardizeUsername, validateUsername } from '../utils/formatters';
import { systemLogger } from '../utils/logger';
import { writeToClient } from '../utils/socketWriter';

export class SignupState implements ClientState {
  name = ClientStateType.SIGNUP;

  constructor(private userManager: UserManager) {}

  enter(client: ConnectedClient): void {
    // Initialize default state values if needed
    client.stateData.maskInput = false;

    // Show character creation header
    writeToClient(client, '\r\n');
    writeToClient(
      client,
      colorize('    ╔═══════════════════════════════════════════════════════╗\r\n', 'green')
    );
    writeToClient(
      client,
      colorize('    ║', 'green') +
        colorize('              CHARACTER CREATION                       ', 'bright') +
        colorize('║\r\n', 'green')
    );
    writeToClient(
      client,
      colorize('    ╚═══════════════════════════════════════════════════════╝\r\n', 'green')
    );
    writeToClient(client, '\r\n');

    writeToClient(
      client,
      colorize('    A new hero emerges from the mists of destiny...\r\n\r\n', 'gray')
    );

    // Check if we already have a username (came from login state)
    if (client.stateData.username) {
      // Show the username that will be used
      writeToClient(
        client,
        colorize('    Your chosen name: ', 'cyan') +
          colorize(formatUsername(client.stateData.username), 'yellow') +
          '\r\n\r\n'
      );
      client.stateData.maskInput = true; // Enable password masking for next input
      writeToClient(
        client,
        colorize('    Now, whisper a secret word to protect your identity.\r\n', 'gray')
      );
      writeToClient(client, colorize('    Create a password: ', 'cyan'));
    } else {
      // No username yet, ask for one
      writeToClient(
        client,
        colorize('    What name shall echo through the halls of legend?\r\n', 'gray')
      );
      writeToClient(
        client,
        colorize('    (3-16 characters, letters and numbers only)\r\n\r\n', 'gray')
      );
      writeToClient(client, colorize('    Choose your name: ', 'cyan'));
    }
  }

  handle(client: ConnectedClient, input: string): void {
    // If we're waiting for a username (username not yet set)
    if (!client.stateData.username) {
      // Validate the username format first
      const validation = validateUsername(input);

      if (!validation.isValid) {
        writeToClient(client, colorize(`${validation.message}. Please try again: `, 'red'));
        return;
      }

      // Standardize to lowercase for storage and checks
      const standardUsername = standardizeUsername(input);

      // Check if the username is in the restricted list
      if (RESTRICTED_USERNAMES.includes(standardUsername)) {
        systemLogger.warn(
          `Blocked signup attempt with restricted username: ${standardUsername} from ${client.ipAddress || 'unknown IP'}`
        );
        writeToClient(
          client,
          colorize('This username is reserved. Please choose another: ', 'red')
        );
        return;
      }

      if (this.userManager.userExists(standardUsername)) {
        writeToClient(client, colorize('Username already exists. Choose another one: ', 'red'));
      } else if (standardUsername.length < 3) {
        writeToClient(client, colorize('Username too short. Choose a longer one: ', 'red'));
      } else {
        client.stateData.username = standardUsername;
        client.stateData.maskInput = true; // Enable password masking

        // Display the username in camelcase format
        writeToClient(
          client,
          colorize(`Username set to: ${formatUsername(standardUsername)}\r\n`, 'green')
        );
        writeToClient(client, colorize('Create a password: ', 'green'));
      }
    }
    // If we're waiting for a password (username is already set)
    else if (!client.stateData.password) {
      if (input.length < 4) {
        writeToClient(client, colorize('Password too short. Choose a longer one: ', 'red'));
      } else {
        client.stateData.password = input;
        client.stateData.maskInput = false; // Disable masking after password input

        // Create the user (without race - will be set in race selection)
        if (this.userManager.createUser(client.stateData.username, client.stateData.password)) {
          const user = this.userManager.getUser(client.stateData.username);
          if (user) {
            // Set the user but DON'T set authenticated flag yet
            client.user = user;
            // Generate session reference file for new user in debug mode
            createSessionReferenceFile(client, client.stateData.username!, false);
            // Transition to race selection state
            client.stateData.transitionTo = ClientStateType.RACE_SELECTION;
          } else {
            writeToClient(client, colorize('Error creating user. Please try again.\r\n', 'red'));
            client.stateData.transitionTo = ClientStateType.LOGIN;
          }
        } else {
          writeToClient(client, colorize('Error creating user. Please try again.\r\n', 'red'));
          client.stateData.transitionTo = ClientStateType.LOGIN;
        }
      }
    }
  }

  exit(client: ConnectedClient): void {
    // Clean up any signup state resources
    if (client.stateData.maskInput) {
      client.stateData.maskInput = false;
      client.connection.setMaskInput(false); // Disable masking on exit
    }
  }
}
