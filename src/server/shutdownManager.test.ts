/**
 * Unit tests for ShutdownManager
 * @module server/shutdownManager.test
 */

import { ShutdownManager } from './shutdownManager';
import { ClientManager } from '../client/clientManager';
import { GameServer } from '../app';
import { ConnectedClient } from '../types';

// Mock dependencies
jest.mock('../utils/logger', () => ({
  systemLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../utils/messageFormatter', () => ({
  createSystemMessageBox: jest.fn((msg: string) => `[BOX] ${msg} [/BOX]\r\n`),
}));

import { systemLogger } from '../utils/logger';

describe('ShutdownManager', () => {
  let shutdownManager: ShutdownManager;
  let mockClientManager: jest.Mocked<ClientManager>;
  let mockGameServer: jest.Mocked<GameServer>;
  let mockClients: Map<string, ConnectedClient>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    // Create mock clients
    mockClients = new Map();

    // Create mock client manager
    mockClientManager = {
      getClients: jest.fn().mockReturnValue(mockClients),
    } as unknown as jest.Mocked<ClientManager>;

    // Create mock game server
    mockGameServer = {
      shutdown: jest.fn(),
    } as unknown as jest.Mocked<GameServer>;

    shutdownManager = new ShutdownManager(mockClientManager, mockGameServer);
  });

  afterEach(() => {
    jest.useRealTimers();
    shutdownManager.clearShutdownTimer();
  });

  describe('isShutdownActive', () => {
    it('should return false initially', () => {
      expect(shutdownManager.isShutdownActive()).toBe(false);
    });

    it('should return true after scheduling shutdown', () => {
      shutdownManager.scheduleShutdown(5);

      expect(shutdownManager.isShutdownActive()).toBe(true);
    });

    it('should return false after cancelling shutdown', () => {
      shutdownManager.scheduleShutdown(5);
      shutdownManager.cancelShutdown();

      expect(shutdownManager.isShutdownActive()).toBe(false);
    });
  });

  describe('scheduleShutdown', () => {
    it('should notify all authenticated clients', () => {
      const mockConnection = { write: jest.fn() };
      const mockClient: ConnectedClient = {
        authenticated: true,
        connection: mockConnection,
      } as unknown as ConnectedClient;
      mockClients.set('client1', mockClient);

      shutdownManager.scheduleShutdown(5);

      expect(mockConnection.write).toHaveBeenCalledWith(
        expect.stringContaining('shutting down in 5 minutes')
      );
    });

    it('should include reason in notification if provided', () => {
      const mockConnection = { write: jest.fn() };
      const mockClient: ConnectedClient = {
        authenticated: true,
        connection: mockConnection,
      } as unknown as ConnectedClient;
      mockClients.set('client1', mockClient);

      shutdownManager.scheduleShutdown(5, 'server maintenance');

      expect(mockConnection.write).toHaveBeenCalledWith(
        expect.stringContaining('server maintenance')
      );
    });

    it('should not notify unauthenticated clients', () => {
      const mockConnection = { write: jest.fn() };
      const mockClient: ConnectedClient = {
        authenticated: false,
        connection: mockConnection,
      } as unknown as ConnectedClient;
      mockClients.set('client1', mockClient);

      shutdownManager.scheduleShutdown(5);

      expect(mockConnection.write).not.toHaveBeenCalled();
    });

    it('should log the scheduled shutdown', () => {
      shutdownManager.scheduleShutdown(5);

      expect(systemLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('scheduled in 5 minutes')
      );
    });

    it('should use correct grammar for 1 minute', () => {
      const mockConnection = { write: jest.fn() };
      const mockClient: ConnectedClient = {
        authenticated: true,
        connection: mockConnection,
      } as unknown as ConnectedClient;
      mockClients.set('client1', mockClient);

      shutdownManager.scheduleShutdown(1);

      expect(mockConnection.write).toHaveBeenCalledWith(expect.stringContaining('1 minute.'));
    });

    it('should cancel previous shutdown timer when scheduling new one', () => {
      shutdownManager.scheduleShutdown(10);
      shutdownManager.scheduleShutdown(5);

      // Fast forward 5 minutes
      jest.advanceTimersByTime(5 * 60000);

      // Should only have one active shutdown sequence
      expect(shutdownManager.isShutdownActive()).toBe(true);
    });

    describe('countdown behavior', () => {
      it('should send reminder at specific intervals', () => {
        const mockConnection = { write: jest.fn() };
        const mockClient: ConnectedClient = {
          authenticated: true,
          connection: mockConnection,
        } as unknown as ConnectedClient;
        mockClients.set('client1', mockClient);

        shutdownManager.scheduleShutdown(6);
        jest.clearAllMocks();

        // Advance 1 minute - 5 minutes remaining (reminder)
        jest.advanceTimersByTime(60000);
        expect(mockConnection.write).toHaveBeenCalledWith(expect.stringContaining('5 minutes'));

        jest.clearAllMocks();

        // Advance 2 more minutes - 3 minutes remaining (no reminder)
        jest.advanceTimersByTime(120000);
        expect(mockConnection.write).not.toHaveBeenCalled();

        jest.clearAllMocks();

        // Advance 1 more minute - 2 minutes remaining (reminder)
        jest.advanceTimersByTime(60000);
        expect(mockConnection.write).toHaveBeenCalledWith(expect.stringContaining('2 minutes'));

        jest.clearAllMocks();

        // Advance 1 more minute - 1 minute remaining (reminder)
        jest.advanceTimersByTime(60000);
        expect(mockConnection.write).toHaveBeenCalledWith(expect.stringContaining('1 minute'));
      });

      it('should send final message and shutdown', () => {
        const mockConnection = { write: jest.fn() };
        const mockClient: ConnectedClient = {
          authenticated: true,
          connection: mockConnection,
        } as unknown as ConnectedClient;
        mockClients.set('client1', mockClient);

        shutdownManager.scheduleShutdown(1);
        jest.clearAllMocks();

        // Advance 1 minute - should trigger shutdown
        jest.advanceTimersByTime(60000);

        expect(mockConnection.write).toHaveBeenCalledWith(
          expect.stringContaining('shutting down now')
        );

        // Advance the 2 second delay for shutdown
        jest.advanceTimersByTime(2000);
        expect(mockGameServer.shutdown).toHaveBeenCalled();
      });

      it('should handle immediate shutdown (0 minutes)', () => {
        const mockConnection = { write: jest.fn() };
        const mockClient: ConnectedClient = {
          authenticated: true,
          connection: mockConnection,
        } as unknown as ConnectedClient;
        mockClients.set('client1', mockClient);

        shutdownManager.scheduleShutdown(0);

        expect(mockConnection.write).toHaveBeenCalledWith(
          expect.stringContaining('shutting down now')
        );

        // Advance the 2 second delay for shutdown
        jest.advanceTimersByTime(2000);
        expect(mockGameServer.shutdown).toHaveBeenCalled();
      });
    });
  });

  describe('cancelShutdown', () => {
    it('should do nothing if no shutdown is active', () => {
      shutdownManager.cancelShutdown();

      expect(systemLogger.info).not.toHaveBeenCalledWith(expect.stringContaining('cancelled'));
    });

    it('should cancel active shutdown and notify clients', () => {
      const mockConnection = { write: jest.fn() };
      const mockClient: ConnectedClient = {
        authenticated: true,
        connection: mockConnection,
      } as unknown as ConnectedClient;
      mockClients.set('client1', mockClient);

      shutdownManager.scheduleShutdown(5);
      jest.clearAllMocks();

      shutdownManager.cancelShutdown();

      expect(mockConnection.write).toHaveBeenCalledWith(expect.stringContaining('cancelled'));
      expect(systemLogger.info).toHaveBeenCalledWith(expect.stringContaining('cancelled'));
    });

    it('should prevent shutdown from occurring after cancel', () => {
      shutdownManager.scheduleShutdown(1);
      shutdownManager.cancelShutdown();

      // Advance past the scheduled shutdown time
      jest.advanceTimersByTime(120000);

      expect(mockGameServer.shutdown).not.toHaveBeenCalled();
    });
  });

  describe('clearShutdownTimer', () => {
    it('should clear the timer and set active to false', () => {
      shutdownManager.scheduleShutdown(5);
      shutdownManager.clearShutdownTimer();

      expect(shutdownManager.isShutdownActive()).toBe(false);
    });

    it('should handle case when no timer is active', () => {
      // Should not throw
      expect(() => shutdownManager.clearShutdownTimer()).not.toThrow();
    });
  });
});
