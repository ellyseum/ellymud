/**
 * Unit tests for ConnectingState class
 * @module states/connecting.state.test
 */

import { ConnectingState } from './connecting.state';
import { ClientStateType } from '../types';
import { createMockClient } from '../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
  colors: {
    clear: '\x1b[2J\x1b[H',
  },
  rainbow: jest.fn((text: string) => text),
}));

jest.mock('../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
}));

import { writeToClient } from '../utils/socketWriter';

const mockWriteToClient = writeToClient as jest.MockedFunction<typeof writeToClient>;

describe('ConnectingState', () => {
  let connectingState: ConnectingState;

  beforeEach(() => {
    jest.clearAllMocks();
    connectingState = new ConnectingState();
  });

  describe('name property', () => {
    it('should have CONNECTING as the state name', () => {
      expect(connectingState.name).toBe(ClientStateType.CONNECTING);
    });
  });

  describe('enter', () => {
    it('should write welcome messages to client', () => {
      const client = createMockClient();

      connectingState.enter(client);

      expect(mockWriteToClient).toHaveBeenCalled();
      // The enter method writes: clear screen, ASCII art banner, welcome text
      expect(mockWriteToClient.mock.calls.length).toBe(3);
    });

    it('should clear the screen first', () => {
      const client = createMockClient();

      connectingState.enter(client);

      // First call should be the clear screen
      expect(mockWriteToClient.mock.calls[0][1]).toContain('\x1b');
    });
  });

  describe('handle', () => {
    it('should not do anything with input', () => {
      const client = createMockClient();

      // handle() should not throw and should not modify client
      connectingState.handle(client, 'test input');

      expect(client.stateData.transitionTo).toBeUndefined();
    });
  });

  describe('exit', () => {
    it('should not do anything on exit', () => {
      const client = createMockClient();

      // exit() should not throw and should not modify client
      connectingState.exit(client);

      expect(client.stateData.transitionTo).toBeUndefined();
    });
  });
});
