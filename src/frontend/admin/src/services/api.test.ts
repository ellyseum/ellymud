/**
 * Unit tests for ApiClient service
 * @jest-environment jsdom
 */

import { api } from './api';
import type { GameTimerConfig, MUDConfig, Area, RoomData, PlayerDetails } from '../types';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Note: window.location.reload cannot be mocked in jsdom - it's read-only
// We'll verify the token removal and error throwing behavior instead

describe('ApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
  });

  describe('checkHealth', () => {
    it('should return true when server responds with ok', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const result = await api.checkHealth();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/login', {
        method: 'OPTIONS',
      });
    });

    it('should return true when server responds with 405 (method not allowed)', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 405 });

      const result = await api.checkHealth();

      expect(result).toBe(true);
    });

    it('should return false when server is not responding', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await api.checkHealth();

      expect(result).toBe(false);
    });

    it('should return false when server responds with error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const result = await api.checkHealth();

      expect(result).toBe(false);
    });
  });

  describe('login', () => {
    it('should call login endpoint with correct credentials', async () => {
      const mockResponse = { success: true, token: 'test-token' };
      mockFetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await api.login('admin', 'password123');

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'password123' }),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should return response with requiresPasswordChange flag', async () => {
      const mockResponse = {
        success: true,
        data: {
          token: 'test-token',
          requiresPasswordChange: true,
        },
      };
      mockFetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await api.login('newuser', 'temppassword');

      expect(result.data?.requiresPasswordChange).toBe(true);
    });
  });

  describe('changePassword', () => {
    it('should call change-password endpoint with authorization header', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      const mockResponse = { success: true };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await api.changePassword('newPassword123');

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ newPassword: 'newPassword123' }),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should return validation errors', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      const mockResponse = {
        success: false,
        data: {
          errors: ['Password too short', 'Must contain special character'],
        },
      };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await api.changePassword('weak');

      expect(result.data?.errors).toEqual(['Password too short', 'Must contain special character']);
    });
  });

  describe('authentication header handling', () => {
    it('should include auth header when token exists', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'my-secret-token');
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      await api.getServerStats();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/stats',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer my-secret-token',
          }),
        })
      );
    });

    it('should not include auth header when token is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      await api.getServerStats();

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers.Authorization).toBeUndefined();
    });
  });

  describe('401 Unauthorized handling', () => {
    it('should clear token and throw error on 401 response', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'expired-token');
      mockFetch.mockResolvedValueOnce({
        status: 401,
        json: jest.fn().mockResolvedValue({ error: 'Unauthorized' }),
      });

      await expect(api.getServerStats()).rejects.toThrow('Unauthorized');

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('mudAdminToken');
      // Note: window.location.reload() is also called but cannot be mocked in jsdom
    });
  });

  describe('Server Stats', () => {
    it('should fetch server stats', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      const mockStats = {
        success: true,
        stats: {
          uptime: 3600,
          connectedClients: 5,
          authenticatedUsers: 3,
          totalConnections: 100,
          totalCommands: 1000,
          memoryUsage: {
            rss: 100000,
            heapTotal: 80000,
            heapUsed: 50000,
            external: 1000,
          },
        },
      };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue(mockStats),
      });

      const result = await api.getServerStats();

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/stats', expect.any(Object));
      expect(result).toEqual(mockStats);
    });
  });

  describe('Game Timer Config', () => {
    it('should fetch game timer config', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      const mockConfig = {
        success: true,
        config: { tickInterval: 1000, saveInterval: 60000 },
      };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue(mockConfig),
      });

      const result = await api.getGameTimerConfig();

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/gametimer-config', expect.any(Object));
      expect(result).toEqual(mockConfig);
    });

    it('should save game timer config', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      const config: GameTimerConfig = { tickInterval: 2000, saveInterval: 120000 };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      await api.saveGameTimerConfig(config);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/gametimer-config',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(config),
        })
      );
    });
  });

  describe('Force Save', () => {
    it('should trigger force save', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      await api.forceSave();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/force-save',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('Players', () => {
    it('should fetch connected players', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      const mockPlayers = {
        success: true,
        players: [{ id: '1', username: 'player1', authenticated: true }],
      };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue(mockPlayers),
      });

      const result = await api.getConnectedPlayers();

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/players', expect.any(Object));
      expect(result).toEqual(mockPlayers);
    });

    it('should fetch all players', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      const mockPlayers = {
        success: true,
        players: [
          { id: '1', username: 'player1' },
          { id: '2', username: 'player2' },
        ],
      };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue(mockPlayers),
      });

      const result = await api.getAllPlayers();

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/players/all', expect.any(Object));
      expect(result).toEqual(mockPlayers);
    });

    it('should fetch player details', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      const mockPlayer = {
        success: true,
        player: {
          username: 'player1',
          health: 100,
          maxHealth: 100,
          level: 5,
          experience: 500,
          currentRoomId: 'room-001',
          inventory: [],
        },
      };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue(mockPlayer),
      });

      const result = await api.getPlayerDetails('player1');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/players/details/player1',
        expect.any(Object)
      );
      expect(result).toEqual(mockPlayer);
    });

    it('should update player data', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      const updateData: Partial<PlayerDetails> & { newPassword?: string } = {
        health: 150,
        maxHealth: 150,
        newPassword: 'newPass123',
      };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      await api.updatePlayer('player1', updateData);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/players/update/player1',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(updateData),
        })
      );
    });

    it('should kick a player', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      await api.kickPlayer('client-123');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/players/client-123/kick',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should send admin message to player', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      await api.sendAdminMessage('client-123', 'Hello from admin!');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/players/client-123/message',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ message: 'Hello from admin!' }),
        })
      );
    });

    it('should monitor a player', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      await api.monitorPlayer('client-123');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/players/client-123/monitor',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should delete a player', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      await api.deletePlayer('player1');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/players/delete/player1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should ban a player with duration', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      await api.banPlayer('player1', 'Cheating', 1440);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/players/ban/player1',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ reason: 'Cheating', durationMinutes: 1440 }),
        })
      );
    });

    it('should ban a player permanently (null duration)', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      await api.banPlayer('player1', 'Permanent ban', null);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/players/ban/player1',
        expect.objectContaining({
          body: JSON.stringify({ reason: 'Permanent ban', durationMinutes: null }),
        })
      );
    });

    it('should unban a player', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      await api.unbanPlayer('player1');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/players/unban/player1',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('MUD Config', () => {
    it('should fetch MUD config', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      const mockConfig: MUDConfig = {
        dataFiles: {
          players: 'data/players',
          rooms: 'data/rooms',
          items: 'data/items',
          npcs: 'data/npcs',
        },
        game: {
          startingRoom: 'room-001',
          maxPlayers: 100,
          idleTimeout: 600,
          maxPasswordAttempts: 3,
        },
        advanced: {
          debugMode: false,
          allowRegistration: true,
          backupInterval: 3600,
          logLevel: 'info',
        },
      };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true, data: { config: mockConfig } }),
      });

      const result = await api.getMUDConfig();

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/mud-config', expect.any(Object));
      expect(result.data?.config).toEqual(mockConfig);
    });

    it('should save MUD config', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      const config: MUDConfig = {
        dataFiles: {
          players: 'data/players',
          rooms: 'data/rooms',
          items: 'data/items',
          npcs: 'data/npcs',
        },
        game: {
          startingRoom: 'room-001',
          maxPlayers: 200,
          idleTimeout: 1200,
          maxPasswordAttempts: 5,
        },
        advanced: {
          debugMode: true,
          allowRegistration: false,
          backupInterval: 7200,
          logLevel: 'debug',
        },
      };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      await api.saveMUDConfig(config);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/mud-config',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(config),
        })
      );
    });
  });

  describe('Pipeline Metrics', () => {
    it('should fetch pipeline metrics', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      const mockMetrics = {
        success: true,
        summary: { total: 10, successful: 8, failed: 2, successRate: '80%', totalTokens: 5000 },
        stages: {},
        executions: [],
        tokenUsage: { total: 5000, byStage: {} },
        toolCalls: [],
        complexity: {},
        modeDistribution: {},
        pipelineReport: '',
        commonIssues: [],
      };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue(mockMetrics),
      });

      const result = await api.getPipelineMetrics();

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/pipeline-metrics', expect.any(Object));
      expect(result).toEqual(mockMetrics);
    });
  });

  describe('Stage Reports', () => {
    it('should fetch stage reports', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      const mockReports = {
        success: true,
        stage: 'research',
        files: [{ filename: 'report1.md', date: '2025-01-18' }],
      };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue(mockReports),
      });

      const result = await api.getStageReports('research');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/stage-reports/research',
        expect.any(Object)
      );
      expect(result).toEqual(mockReports);
    });

    it('should fetch report file content', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      const mockFile = {
        success: true,
        filename: 'report.md',
        content: '# Report Content',
      };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue(mockFile),
      });

      const result = await api.getReportFile('research', 'report.md');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/report-file/research/report.md',
        expect.any(Object)
      );
      expect(result).toEqual(mockFile);
    });

    it('should URL encode filenames with special characters', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      await api.getReportFile('planning', 'report file (1).md');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/report-file/planning/report%20file%20(1).md',
        expect.any(Object)
      );
    });
  });

  describe('Areas', () => {
    it('should fetch all areas', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      const mockAreas = {
        success: true,
        areas: [
          { id: 'area-1', name: 'Village' },
          { id: 'area-2', name: 'Forest' },
        ],
      };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue(mockAreas),
      });

      const result = await api.getAreas();

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/areas', expect.any(Object));
      expect(result).toEqual(mockAreas);
    });

    it('should fetch area by ID', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      const mockArea = {
        success: true,
        area: { id: 'area-1', name: 'Village', description: 'A peaceful village' },
      };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue(mockArea),
      });

      const result = await api.getAreaById('area-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/areas/area-1', expect.any(Object));
      expect(result).toEqual(mockArea);
    });

    it('should create a new area', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      const newArea: Partial<Area> = { name: 'New Area', description: 'A new area' };
      const mockResponse = {
        success: true,
        area: { id: 'area-new', name: 'New Area', description: 'A new area' },
      };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await api.createArea(newArea);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/areas',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newArea),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should update an area', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      const updateData: Partial<Area> = { name: 'Updated Village' };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true, area: { id: 'area-1', ...updateData } }),
      });

      await api.updateArea('area-1', updateData);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/areas/area-1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData),
        })
      );
    });

    it('should delete an area', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      await api.deleteArea('area-1');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/areas/area-1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('Rooms', () => {
    it('should fetch all rooms', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      const mockRooms = {
        success: true,
        rooms: [
          { id: 'room-1', name: 'Town Square' },
          { id: 'room-2', name: 'Market' },
        ],
      };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue(mockRooms),
      });

      const result = await api.getRooms();

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/rooms', expect.any(Object));
      expect(result).toEqual(mockRooms);
    });

    it('should fetch room by ID', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      const mockRoom = {
        success: true,
        room: { id: 'room-1', name: 'Town Square', description: 'The main square' },
      };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue(mockRoom),
      });

      const result = await api.getRoomById('room-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/rooms/room-1', expect.any(Object));
      expect(result).toEqual(mockRoom);
    });

    it('should create a new room', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      const newRoom: Partial<RoomData> = {
        name: 'New Room',
        description: 'A new room',
        areaId: 'area-1',
      };
      const mockResponse = {
        success: true,
        room: { id: 'room-new', ...newRoom },
      };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const result = await api.createRoom(newRoom);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/rooms',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newRoom),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should update a room', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      const updateData: Partial<RoomData> = { name: 'Updated Room' };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true, room: { id: 'room-1', ...updateData } }),
      });

      await api.updateRoom('room-1', updateData);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/rooms/room-1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateData),
        })
      );
    });

    it('should delete a room', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      await api.deleteRoom('room-1');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/rooms/room-1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should fetch rooms by area ID', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      const mockRooms = {
        success: true,
        rooms: [{ id: 'room-1', name: 'Room in Area', areaId: 'area-1' }],
      };
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue(mockRooms),
      });

      const result = await api.getRoomsByAreaId('area-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/admin/rooms?areaId=area-1', expect.any(Object));
      expect(result).toEqual(mockRooms);
    });

    it('should URL encode area ID in getRoomsByAreaId', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true, rooms: [] }),
      });

      await api.getRoomsByAreaId('area with spaces');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/rooms?areaId=area%20with%20spaces',
        expect.any(Object)
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle empty response body', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue({}),
      });

      const result = await api.getServerStats();

      expect(result).toEqual({});
    });

    it('should handle network errors gracefully in authenticated requests', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      await expect(api.getServerStats()).rejects.toThrow('Network failure');
    });

    it('should handle malformed JSON response', async () => {
      mockLocalStorage.setItem('mudAdminToken', 'test-token');
      mockFetch.mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
      });

      await expect(api.getServerStats()).rejects.toThrow('Unexpected token');
    });
  });
});
