/**
 * Unit tests for GetCommand
 * @module command/commands/get.command.test
 */

import { GetCommand } from './get.command';
import { ConnectedClient } from '../../types';
import {
  createMockClient,
  createMockUser,
  createMockUserManager,
} from '../../test/helpers/mockFactories';

// Mock PickupCommand
jest.mock('./pickup.command', () => ({
  PickupCommand: jest.fn().mockImplementation(() => ({
    execute: jest.fn(),
  })),
}));

import { PickupCommand } from './pickup.command';

describe('GetCommand', () => {
  let getCommand: GetCommand;
  let clients: Map<string, ConnectedClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    clients = new Map();
    const mockUserManager = createMockUserManager();
    getCommand = new GetCommand(clients, mockUserManager);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(getCommand.name).toBe('get');
    });

    it('should have a description', () => {
      expect(getCommand.description).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should forward to PickupCommand', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      getCommand.execute(client, 'sword');

      // Get the mock instance
      const mockPickupInstance = (PickupCommand as jest.MockedClass<typeof PickupCommand>).mock
        .results[0].value;

      expect(mockPickupInstance.execute).toHaveBeenCalledWith(client, 'sword');
    });

    it('should pass empty args correctly', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      getCommand.execute(client, '');

      const mockPickupInstance = (PickupCommand as jest.MockedClass<typeof PickupCommand>).mock
        .results[0].value;

      expect(mockPickupInstance.execute).toHaveBeenCalledWith(client, '');
    });

    it('should pass currency args correctly', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      getCommand.execute(client, '10 gold');

      const mockPickupInstance = (PickupCommand as jest.MockedClass<typeof PickupCommand>).mock
        .results[0].value;

      expect(mockPickupInstance.execute).toHaveBeenCalledWith(client, '10 gold');
    });
  });
});
