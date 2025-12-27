/**
 * Unit tests for MeditateCommand
 * @module command/commands/meditate.command.test
 */

import { MeditateCommand } from './meditate.command';
import { createMockClient, createMockUser } from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeFormattedMessageToClient: jest.fn(),
}));

import { writeFormattedMessageToClient } from '../../utils/socketWriter';

const mockWriteFormattedMessageToClient = writeFormattedMessageToClient as jest.MockedFunction<
  typeof writeFormattedMessageToClient
>;

describe('MeditateCommand', () => {
  let meditateCommand: MeditateCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    meditateCommand = new MeditateCommand();
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(meditateCommand.name).toBe('meditate');
    });

    it('should have a description', () => {
      expect(meditateCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should show error if client has no user', () => {
      const client = createMockClient({ user: null });

      meditateCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('must be logged in')
      );
    });

    it('should show error if user is in combat', () => {
      const client = createMockClient({
        user: createMockUser({ inCombat: true }),
      });

      meditateCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('cannot meditate while in combat')
      );
    });

    it('should show error if user is unconscious', () => {
      const client = createMockClient({
        user: createMockUser({ isUnconscious: true }),
      });

      meditateCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('unconscious')
      );
    });

    it('should show message if user is already meditating', () => {
      const client = createMockClient({
        user: createMockUser({ isMeditating: true }),
      });

      meditateCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('already meditating')
      );
    });

    it('should stop resting and start meditating if user was resting', () => {
      const user = createMockUser({
        isResting: true,
        restingTicks: 5,
      });
      const client = createMockClient({ user });

      meditateCommand.execute(client, '');

      expect(user.isResting).toBe(false);
      expect(user.restingTicks).toBe(0);
      expect(user.isMeditating).toBe(true);
      expect(user.meditatingTicks).toBe(0);
      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('stop resting')
      );
    });

    it('should start meditating successfully', () => {
      const user = createMockUser({
        isResting: false,
        isMeditating: false,
        inCombat: false,
        isUnconscious: false,
      });
      const client = createMockClient({ user });

      meditateCommand.execute(client, '');

      expect(user.isMeditating).toBe(true);
      expect(user.meditatingTicks).toBe(0);
      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('begin to meditate')
      );
    });
  });
});
