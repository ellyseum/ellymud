/**
 * Unit tests for RestCommand
 * @module command/commands/rest.command.test
 */

import { RestCommand } from './rest.command';
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

describe('RestCommand', () => {
  let restCommand: RestCommand;

  beforeEach(() => {
    jest.clearAllMocks();
    restCommand = new RestCommand();
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(restCommand.name).toBe('rest');
    });

    it('should have a description', () => {
      expect(restCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should show error if client has no user', () => {
      const client = createMockClient({ user: null });

      restCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('must be logged in')
      );
    });

    it('should show error if user is in combat', () => {
      const client = createMockClient({
        user: createMockUser({ inCombat: true }),
      });

      restCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('cannot rest while in combat')
      );
    });

    it('should show error if user is unconscious', () => {
      const client = createMockClient({
        user: createMockUser({ isUnconscious: true }),
      });

      restCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('unconscious')
      );
    });

    it('should show message if user is already resting', () => {
      const client = createMockClient({
        user: createMockUser({ isResting: true }),
      });

      restCommand.execute(client, '');

      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('already resting')
      );
    });

    it('should stop meditating and start resting if user was meditating', () => {
      const user = createMockUser({
        isMeditating: true,
        meditatingTicks: 5,
      });
      const client = createMockClient({ user });

      restCommand.execute(client, '');

      expect(user.isMeditating).toBe(false);
      expect(user.meditatingTicks).toBe(0);
      expect(user.isResting).toBe(true);
      expect(user.restingTicks).toBe(0);
      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('stop meditating')
      );
    });

    it('should start resting successfully', () => {
      const user = createMockUser({
        isResting: false,
        isMeditating: false,
        inCombat: false,
        isUnconscious: false,
      });
      const client = createMockClient({ user });

      restCommand.execute(client, '');

      expect(user.isResting).toBe(true);
      expect(user.restingTicks).toBe(0);
      expect(mockWriteFormattedMessageToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('begin to rest')
      );
    });
  });
});
