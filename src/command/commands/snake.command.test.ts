/**
 * Unit tests for SnakeCommand
 * @module command/commands/snake.command.test
 */

import { SnakeCommand } from './snake.command';
import { ClientStateType } from '../../types';
import { createMockClient, createMockUser } from '../../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
}));

import { writeToClient } from '../../utils/socketWriter';
import { StateMachine } from '../../state/stateMachine';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

// Create a mock StateMachine
const createMockStateMachine = () => ({
  handleInput: jest.fn(),
  getClients: jest.fn().mockReturnValue(new Map()),
});

describe('SnakeCommand', () => {
  let snakeCommand: SnakeCommand;
  let mockStateMachine: ReturnType<typeof createMockStateMachine>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStateMachine = createMockStateMachine();
    snakeCommand = new SnakeCommand(mockStateMachine as unknown as StateMachine);
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(snakeCommand.name).toBe('snake');
    });

    it('should have a description', () => {
      expect(snakeCommand.description).toBeDefined();
      expect(snakeCommand.description.toLowerCase()).toContain('snake');
    });
  });

  describe('execute', () => {
    it('should return error if client has no user', () => {
      const client = createMockClient({ user: null });

      snakeCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('must be logged in to play Snake')
      );
    });

    it('should store previous state before transitioning', () => {
      const client = createMockClient({
        user: createMockUser(),
        state: ClientStateType.AUTHENTICATED,
      });

      snakeCommand.execute(client, '');

      expect(client.stateData.previousState).toBe(ClientStateType.AUTHENTICATED);
    });

    it('should store clients map in stateData', () => {
      const mockClientsMap = new Map();
      mockStateMachine.getClients.mockReturnValue(mockClientsMap);

      const client = createMockClient({
        user: createMockUser(),
      });

      snakeCommand.execute(client, '');

      expect(client.stateData.clientsMap).toBe(mockClientsMap);
    });

    it('should notify player about entering snake game', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      snakeCommand.execute(client, '');

      expect(mockWriteToClient).toHaveBeenCalledWith(
        client,
        expect.stringContaining('Entering Snake game')
      );
    });

    it('should set transition flag to SNAKE_GAME state', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      snakeCommand.execute(client, '');

      expect(client.stateData.transitionTo).toBe(ClientStateType.SNAKE_GAME);
    });

    it('should invoke state machine to process transition', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      snakeCommand.execute(client, '');

      expect(mockStateMachine.handleInput).toHaveBeenCalledWith(client, '');
    });

    it('should ignore args parameter', () => {
      const client = createMockClient({
        user: createMockUser(),
      });

      snakeCommand.execute(client, 'some args that should be ignored');

      expect(mockStateMachine.handleInput).toHaveBeenCalledWith(client, '');
      expect(client.stateData.transitionTo).toBe(ClientStateType.SNAKE_GAME);
    });
  });
});
