import { SneakCommand } from './sneak.command';
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

describe('SneakCommand', () => {
  let sneakCommand: SneakCommand;
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
    sneakCommand = new SneakCommand(clients);

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

  it('should toggle sneak mode on', () => {
    sneakCommand.execute(mockClient, '');

    expect(mockClient.user?.isSneaking).toBe(true);
    expect(writeFormattedMessageToClient).toHaveBeenCalledWith(
      mockClient,
      expect.stringContaining('stealthily')
    );
    expect(mockUserManager.updateUserStats).toHaveBeenCalledWith('testuser', {
      isSneaking: true,
    });
  });

  it('should toggle sneak mode off', () => {
    mockClient.user!.isSneaking = true;

    sneakCommand.execute(mockClient, '');

    expect(mockClient.user?.isSneaking).toBe(false);
    expect(writeFormattedMessageToClient).toHaveBeenCalledWith(
      mockClient,
      expect.stringContaining('stop sneaking')
    );
  });

  it('should not allow sneaking while in combat', () => {
    mockClient.user!.inCombat = true;

    sneakCommand.execute(mockClient, '');

    expect(mockClient.user?.isSneaking).toBe(false);
    expect(writeFormattedMessageToClient).toHaveBeenCalledWith(
      mockClient,
      expect.stringContaining("can't sneak while in combat")
    );
  });

  it('should not allow sneaking when NPCs have aggression', () => {
    const mockNPC = {
      hasAggression: jest.fn().mockReturnValue(true),
    };
    mockRoom.npcs = new Map([['npc-1', mockNPC as unknown as never]]);

    sneakCommand.execute(mockClient, '');

    expect(mockClient.user?.isSneaking).toBe(false);
    expect(writeFormattedMessageToClient).toHaveBeenCalledWith(
      mockClient,
      expect.stringContaining('enemies are watching')
    );
  });

  it('should notify room when starting to sneak (if not hiding)', () => {
    sneakCommand.execute(mockClient, '');

    expect(mockRoomManager.notifyPlayersInRoom).toHaveBeenCalledWith(
      'room-1',
      expect.stringContaining('slips into the shadows'),
      'testuser'
    );
  });

  it('should not notify room when already hiding', () => {
    mockClient.user!.isHiding = true;

    sneakCommand.execute(mockClient, '');

    expect(mockRoomManager.notifyPlayersInRoom).not.toHaveBeenCalled();
  });

  it('should require logged in user', () => {
    mockClient.user = null;

    sneakCommand.execute(mockClient, '');

    expect(writeFormattedMessageToClient).toHaveBeenCalledWith(
      mockClient,
      expect.stringContaining('must be logged in')
    );
  });
});
