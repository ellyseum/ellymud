import { ConnectedClient, ResourceType } from '../types';
import { colorize } from './colors';
import { writeToClient } from './socketWriter';
import { SudoCommand } from '../command/commands/sudo.command';
import { ClassManager } from '../class/classManager';
import { getResourceDisplayAbbr } from './statCalculator';
import { ComboManager } from '../combat/comboManager';

/**
 * Writes a command prompt to the client based on their stats
 */
export function writeCommandPrompt(client: ConnectedClient): void {
  if (!client.user) return;

  const promptText = getPromptText(client);
  writeToClient(client, promptText);
}

/**
 * Get the resource type for a user based on their class
 * Returns NONE for tier 0 Adventurer
 */
function getUserResourceType(classId: string | undefined): ResourceType {
  if (!classId) {
    return ResourceType.NONE;
  }

  const classManager = ClassManager.getInstance();
  const classData = classManager.getClass(classId);

  if (!classData) {
    return ResourceType.NONE;
  }

  return classData.resourceType ?? ResourceType.NONE;
}

/**
 * Get the current resource value for a user
 */
function getCurrentResourceValue(
  user: { mana?: number; resource?: number },
  resourceType: ResourceType
): number {
  if (resourceType === ResourceType.NONE) {
    return 0;
  }

  // For mana type, use existing mana field for backward compatibility
  if (resourceType === ResourceType.MANA) {
    return user.mana ?? 0;
  }

  // For other resource types, use the generic resource field
  return user.resource ?? 0;
}

/**
 * Get the max resource value for a user
 */
function getMaxResourceValue(
  user: { maxMana?: number; maxResource?: number },
  resourceType: ResourceType
): number {
  if (resourceType === ResourceType.NONE) {
    return 0;
  }

  // For mana type, use existing maxMana field for backward compatibility
  if (resourceType === ResourceType.MANA) {
    return user.maxMana ?? 0;
  }

  // For other resource types, use the generic maxResource field
  return user.maxResource ?? 0;
}

/**
 * Returns the command prompt text (without writing to client)
 */
export function getPromptText(client: ConnectedClient): string {
  if (!client.user) return '';

  // Reset any previous color formatting
  const ANSI_RESET = '\x1b[0m';

  // Format the HP numbers in green
  const hpNumbers = colorize(`${client.user.health}/${client.user.maxHealth}`, 'green');

  // Get resource type from class
  const resourceType = getUserResourceType(client.user.classId);
  const resourceAbbr = getResourceDisplayAbbr(resourceType);

  // Build the prompt with HP first
  let prompt = colorize(`[HP=`, 'white') + hpNumbers;

  // Only show resource if not NONE
  if (resourceType !== ResourceType.NONE) {
    const currentResource = getCurrentResourceValue(client.user, resourceType);
    const maxResource = getMaxResourceValue(client.user, resourceType);
    const resourceDisplay = `${currentResource}/${maxResource}`;
    const resourceNumbers = colorize(resourceDisplay, 'blue');

    prompt += colorize(` ${resourceAbbr}=`, 'white') + resourceNumbers;
  }

  // Show combo points for energy-class users (thief tree)
  if (resourceType === ResourceType.ENERGY) {
    const comboManager = ComboManager.getInstance();
    const comboPoints = comboManager.getComboPoints(client.user);
    if (comboPoints > 0) {
      const comboDisplay = colorize(`${comboPoints}`, 'yellow');
      prompt += colorize(` CP=`, 'white') + comboDisplay;
    }
  }

  prompt += colorize(`]`, 'white');

  // Add combat indicator if in combat
  if (client.user.inCombat) {
    prompt += colorize(' [COMBAT]', 'boldYellow');
  }

  // Add resting/meditating indicators
  if (client.user.isResting) {
    prompt += colorize(' (Resting)', 'green');
  } else if (client.user.isMeditating) {
    prompt += colorize(' (Meditating)', 'blue');
  }

  // Check if user has admin privileges using the static method
  // This guarantees we're checking the same admin status across the entire application
  if (SudoCommand.isAuthorizedUser(client.user.username)) {
    prompt += colorize(' [Admin]', 'red');
  }

  prompt += colorize(': ', 'white');

  // Write the prompt with a reset first to ensure clean formatting
  return ANSI_RESET + prompt;
}

/**
 * Clears the current line and draws the command prompt
 * This function ensures that the prompt is properly displayed
 * without duplicates by always clearing the line first
 */
export function drawCommandPrompt(client: ConnectedClient): void {
  if (!client.user) return;

  // Skip drawing the prompt if it's currently suppressed (e.g., during movement)
  if (client.stateData?.suppressPrompt) {
    return;
  }

  // ANSI sequence to clear the current line
  const clearLineSequence = '\r\x1B[K';

  // Get the prompt text
  const promptText = getPromptText(client);

  // Write the clear line sequence followed by the prompt
  writeToClient(client, clearLineSequence + promptText);

  // Redraw any partially typed command
  if (client.buffer && client.buffer.length > 0) {
    writeToClient(client, client.buffer);
  }
}
