import { ExitsCommand } from './exits.command';
import { ConnectedClient } from '../../types';
import { RoomManager } from '../../room/roomManager';
import { Room } from '../../room/room';

jest.mock('../../room/roomManager');
jest.mock('../../utils/socketWriter', () => ({
  writeToClient: jest.fn(),
}));

import { writeToClient } from '../../utils/socketWriter';

describe('ExitsCommand', () => {
  let command: ExitsCommand;
  let mockClients: Map<string, ConnectedClient>;
  let mockRoomManager: jest.Mocked<RoomManager>;
  let mockClient: ConnectedClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClients = new Map();

    mockRoomManager = {
      getRoom: jest.fn(),
      getStartingRoomId: jest.fn().mockReturnValue('start-room'),
    } as unknown as jest.Mocked<RoomManager>;

    (RoomManager.getInstance as jest.Mock).mockReturnValue(mockRoomManager);

    command = new ExitsCommand(mockClients);

    mockClient = {
      authenticated: true,
      user: {
        username: 'tester',
        currentRoomId: 'room-1',
      },
    } as unknown as ConnectedClient;
  });

  it('writes the room exits line for a room with exits', () => {
    const room = {
      getExitsLine: jest.fn().mockReturnValue('Obvious exits: north, south.\r\n'),
    } as unknown as Room;
    mockRoomManager.getRoom.mockReturnValue(room);

    command.execute(mockClient, '');

    expect(mockRoomManager.getRoom).toHaveBeenCalledWith('room-1');
    expect(writeToClient).toHaveBeenCalledWith(mockClient, 'Obvious exits: north, south.\r\n');
  });

  it('writes the empty-exits line for a room with no exits', () => {
    const room = {
      getExitsLine: jest.fn().mockReturnValue('There are no obvious exits.\r\n'),
    } as unknown as Room;
    mockRoomManager.getRoom.mockReturnValue(room);

    command.execute(mockClient, '');

    expect(writeToClient).toHaveBeenCalledWith(mockClient, 'There are no obvious exits.\r\n');
  });

  it('falls back to starting room id when user has no current room', () => {
    (mockClient.user as { currentRoomId: string | null }).currentRoomId = '';
    const room = {
      getExitsLine: jest.fn().mockReturnValue('Obvious exits: out.\r\n'),
    } as unknown as Room;
    mockRoomManager.getRoom.mockReturnValue(room);

    command.execute(mockClient, '');

    expect(mockRoomManager.getStartingRoomId).toHaveBeenCalled();
    expect(mockRoomManager.getRoom).toHaveBeenCalledWith('start-room');
  });

  it('does nothing if user is missing', () => {
    (mockClient as { user: ConnectedClient['user'] }).user =
      null as unknown as ConnectedClient['user'];
    command.execute(mockClient, '');
    expect(mockRoomManager.getRoom).not.toHaveBeenCalled();
    expect(writeToClient).not.toHaveBeenCalled();
  });

  it('returns silently if room not found', () => {
    mockRoomManager.getRoom.mockReturnValue(undefined);
    command.execute(mockClient, '');
    expect(writeToClient).not.toHaveBeenCalled();
  });
});
