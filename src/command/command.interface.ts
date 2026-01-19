import { ConnectedClient } from '../types';

export interface Command {
  name: string;
  description: string;
  /**
   * If true, this command must be invoked with a '/' prefix (e.g., /whisper).
   * Aliases also require the '/' prefix when this is set.
   * This allows slash command aliases to coexist with regular command aliases
   * (e.g., /w for whisper vs w for west).
   */
  isSlashCommand?: boolean;
  execute(client: ConnectedClient, args: string): void;
}
