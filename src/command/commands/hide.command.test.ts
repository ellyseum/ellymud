import { HideCommand } from './hide.command';
import { ConnectedClient, User } from '../../types';
import { writeFormattedMessageToClient } from '../../utils/socketWriter';
import { UserManager } from '../../user/userManager';
import { RoomManager } from '../../room/roomManager';
import { Room } from '../../room/room';

jest.mock('../../utils/socketWriter', () => ({
  writeFormattedMessageToClient: jest.fn(),
}));

jest.mock('../../user/userManager', () => ({
  UserManager: {
    getInstance: jest.fn(),
  },
}));

jest.mock('../../room/roomManager', () => ({
  RoomManager: {
    getInstance: jest.fn(),
  },
}));

describe('HideCommand', () => {
  let hideCommand: HideCommand;
  let mockClient: ConnectedClient;
  let mockUserManager: jest.Mocked<UserManager>;
  let mockRoomManager: jest.Mocked<RoomManager>;
  let mockRoom: Partial<Room>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserManager = {
      updateUserStats: jest.fn(),
    } as unknown as jest.Mocked<UserManager>;
    (UserManager.getInstance as jest.Mock).mockReturnValue(mockUserManager);

    mockRoom = {
      npcs: new Map(),
    };

    mockRoomManager = {
      getRoom: jest.fn().mockReturnValue(mockRoom),
      notifyPlayersInRoom: jest.fn(),
    } as unknown as jest.Mocked<RoomManager>;
    (RoomManager.getInstance as jest.Mock).mockReturnValue(mockRoomManager);

    const clients = new Map<string, ConnectedClient>();
    hideCommand = new HideCommand(clients);

    mockClient = {
      user: {
        username: 'testuser',
        currentRoomId: 'room-1',
        inCombat: false,
        isSneaking: false,
        isHiding: false,
      } as User,
      connection: { write: jest.fn() },
    } as unknown as ConnectedClient;
  });

  it('should toggle hide mode on', () => {
    hideCommand.execute(mockClient, '');

    expect(mockClient.user?.isHiding).toBe(true);
    expect(writeFormattedMessageToClient).toHaveBeenCalledWith(
      mockClient,
      expect.stringContaining('hide yourself')
    );
    expect(mockUserManager.updateUserStats).toHaveBeenCalledWith('testuser', {
      isHiding: true,
    });
  });

  it('should toggle hide mode off', () => {
    mockClient.user!.isHiding = true;

    hideCommand.execute(mockClient, '');

    expect(mockClient.user?.isHiding).toBe(false);
    expect(writeFormattedMessageToClient).toHaveBeenCalledWith(
      mockClient,
      expect.stringContaining('step out of hiding')
    );
  });

  it('should not allow hiding while in combat', () => {
    mockClient.user!.inCombat = true;

    hideCommand.execute(mockClient, '');

    expect(mockClient.user?.isHiding).toBe(false);
    expect(writeFormattedMessageToClient).toHaveBeenCalledWith(
      mockClient,
      expect.stringContaining("can't hide while in combat")
    );
  });

  it('should not allow hiding when NPCs have aggression', () => {
    const mockNPC = {
      hasAggression: jest.fn().mockReturnValue(true),
    };
    mockRoom.npcs = new Map([['npc-1', mockNPC as unknown as never]]);

    hideCommand.execute(mockClient, '');

    expect(mockClient.user?.isHiding).toBe(false);
    expect(writeFormattedMessageToClient).toHaveBeenCalledWith(
      mockClient,
      expect.stringContaining('enemies are watching')
    );
  });

  it('should notify room before hiding', () => {
    hideCommand.execute(mockClient, '');

    expect(mockRoomManager.notifyPlayersInRoom).toHaveBeenCalledWith(
      'room-1',
      expect.stringContaining('disappears from view'),
      'testuser'
    );
  });

  it('should notify room when stepping out of hiding', () => {
    mockClient.user!.isHiding = true;

    hideCommand.execute(mockClient, '');

    expect(mockRoomManager.notifyPlayersInRoom).toHaveBeenCalledWith(
      'room-1',
      expect.stringContaining('steps out of hiding'),
      'testuser'
    );
  });

  it('should require logged in user', () => {
    mockClient.user = null;

    hideCommand.execute(mockClient, '');

    expect(writeFormattedMessageToClient).toHaveBeenCalledWith(
      mockClient,
      expect.stringContaining('must be logged in')
    );
  });
});
