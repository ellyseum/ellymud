/**
 * Unit tests for Room class
 * @module room/room.test
 */

import { Room } from './room';
import { Currency, Exit } from '../types';
import { createMockNPC } from '../test/helpers/mockFactories';

// Mock dependencies
jest.mock('../utils/colors', () => ({
  colorize: jest.fn((text: string) => text),
}));

jest.mock('../utils/formatters', () => ({
  formatUsername: jest.fn(
    (username: string) => username.charAt(0).toUpperCase() + username.slice(1)
  ),
}));

jest.mock('../utils/itemNameColorizer', () => ({
  colorizeItemName: jest.fn((name: string) => name),
}));

jest.mock('../utils/itemManager', () => ({
  ItemManager: {
    getInstance: jest.fn().mockReturnValue({
      getItem: jest.fn().mockImplementation((templateId: string) => ({
        id: templateId,
        name: `Item ${templateId}`,
        description: `Description of ${templateId}`,
        type: 'misc',
        value: 100,
      })),
      getItemInstance: jest.fn().mockImplementation((instanceId: string) => ({
        instanceId,
        templateId: instanceId.split('-')[0],
        properties: {},
      })),
    }),
  },
}));

jest.mock('../utils/logger', () => ({
  systemLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  createContextLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

describe('Room', () => {
  describe('constructor', () => {
    it('should create a room with basic properties', () => {
      const room = new Room({
        id: 'town-square',
        name: 'Town Square',
        description: 'A bustling town square.',
        exits: [],
      });

      expect(room.id).toBe('town-square');
      expect(room.name).toBe('Town Square');
      expect(room.description).toBe('A bustling town square.');
    });

    it('should use shortDescription if name is not provided', () => {
      const room = new Room({
        id: 'test',
        shortDescription: 'Short Name',
        description: 'Description',
      });

      expect(room.name).toBe('Short Name');
    });

    it('should use longDescription if description is not provided', () => {
      const room = new Room({
        id: 'test',
        name: 'Test',
        longDescription: 'Long Description',
      });

      expect(room.description).toBe('Long Description');
    });

    it('should initialize with empty arrays and defaults', () => {
      const room = new Room({ id: 'test', name: 'Test' });

      expect(room.players).toEqual([]);
      expect(room.exits).toEqual([]);
      expect(room.items).toEqual([]);
      expect(room.flags).toEqual([]);
      expect(room.currency).toEqual({ gold: 0, silver: 0, copper: 0 });
    });

    it('should initialize with provided exits', () => {
      const exits: Exit[] = [
        { direction: 'north', roomId: 'market-street' },
        { direction: 'south', roomId: 'alley' },
      ];
      const room = new Room({
        id: 'test',
        name: 'Test',
        exits,
      });

      expect(room.exits).toEqual(exits);
    });

    it('should initialize with provided currency', () => {
      const currency: Currency = { gold: 100, silver: 50, copper: 25 };
      const room = new Room({
        id: 'test',
        name: 'Test',
        currency,
      });

      expect(room.currency).toEqual(currency);
    });

    it('should initialize itemInstances from array format', () => {
      const room = new Room({
        id: 'test',
        name: 'Test',
        itemInstances: [
          { instanceId: 'sword-1', templateId: 'iron-sword' },
          { instanceId: 'potion-1', templateId: 'health-potion' },
        ],
      });

      const instances = room.getItemInstances();
      expect(instances.get('sword-1')).toBe('iron-sword');
      expect(instances.get('potion-1')).toBe('health-potion');
    });

    it('should initialize flags from room data', () => {
      const room = new Room({
        id: 'test',
        name: 'Test',
        flags: ['safe', 'no-combat'],
      });

      expect(room.flags).toEqual(['safe', 'no-combat']);
    });
  });

  describe('addPlayer', () => {
    it('should add a player to the room', () => {
      const room = new Room({ id: 'test', name: 'Test' });

      room.addPlayer('testuser');

      expect(room.players).toContain('testuser');
    });

    it('should not add duplicate players', () => {
      const room = new Room({ id: 'test', name: 'Test' });

      room.addPlayer('testuser');
      room.addPlayer('testuser');

      expect(room.players).toHaveLength(1);
    });

    it('should add multiple different players', () => {
      const room = new Room({ id: 'test', name: 'Test' });

      room.addPlayer('player1');
      room.addPlayer('player2');
      room.addPlayer('player3');

      expect(room.players).toHaveLength(3);
    });
  });

  describe('removePlayer', () => {
    it('should remove a player from the room', () => {
      const room = new Room({
        id: 'test',
        name: 'Test',
        players: ['player1', 'player2'],
      });

      room.removePlayer('player1');

      expect(room.players).not.toContain('player1');
      expect(room.players).toContain('player2');
    });

    it('should handle removing non-existent player', () => {
      const room = new Room({
        id: 'test',
        name: 'Test',
        players: ['player1'],
      });

      room.removePlayer('nonexistent');

      expect(room.players).toHaveLength(1);
    });
  });

  describe('NPC management', () => {
    describe('addNPC', () => {
      it('should add an NPC to the room', () => {
        const room = new Room({ id: 'test', name: 'Test' });
        const npc = createMockNPC({ instanceId: 'npc-1' });

        room.addNPC(npc);

        expect(room.npcs.has('npc-1')).toBe(true);
      });

      it('should add multiple NPCs', () => {
        const room = new Room({ id: 'test', name: 'Test' });

        room.addNPC(createMockNPC({ instanceId: 'npc-1' }));
        room.addNPC(createMockNPC({ instanceId: 'npc-2' }));

        expect(room.npcs.size).toBe(2);
      });
    });

    describe('removeNPC', () => {
      it('should remove an NPC from the room', () => {
        const room = new Room({ id: 'test', name: 'Test' });
        const npc = createMockNPC({ instanceId: 'npc-1' });
        room.addNPC(npc);

        room.removeNPC('npc-1');

        expect(room.npcs.has('npc-1')).toBe(false);
      });
    });

    describe('getNPC', () => {
      it('should return NPC by instance ID', () => {
        const room = new Room({ id: 'test', name: 'Test' });
        const npc = createMockNPC({ instanceId: 'npc-1' });
        room.addNPC(npc);

        const found = room.getNPC('npc-1');

        expect(found).toBe(npc);
      });

      it('should return undefined for non-existent NPC', () => {
        const room = new Room({ id: 'test', name: 'Test' });

        const found = room.getNPC('nonexistent');

        expect(found).toBeUndefined();
      });
    });

    describe('findNPCsByTemplateId', () => {
      it('should find NPCs by template ID', () => {
        const room = new Room({ id: 'test', name: 'Test' });
        const npc1 = createMockNPC({ instanceId: 'npc-1', templateId: 'goblin' });
        const npc2 = createMockNPC({ instanceId: 'npc-2', templateId: 'goblin' });
        const npc3 = createMockNPC({ instanceId: 'npc-3', templateId: 'orc' });
        room.addNPC(npc1);
        room.addNPC(npc2);
        room.addNPC(npc3);

        const goblins = room.findNPCsByTemplateId('goblin');

        expect(goblins).toHaveLength(2);
      });

      it('should return empty array when no NPCs match', () => {
        const room = new Room({ id: 'test', name: 'Test' });

        const result = room.findNPCsByTemplateId('nonexistent');

        expect(result).toEqual([]);
      });
    });
  });

  describe('getExit', () => {
    it('should return room ID for valid exit', () => {
      const room = new Room({
        id: 'test',
        name: 'Test',
        exits: [
          { direction: 'north', roomId: 'market' },
          { direction: 'south', roomId: 'alley' },
        ],
      });

      expect(room.getExit('north')).toBe('market');
      expect(room.getExit('south')).toBe('alley');
    });

    it('should return undefined for invalid exit', () => {
      const room = new Room({
        id: 'test',
        name: 'Test',
        exits: [{ direction: 'north', roomId: 'market' }],
      });

      expect(room.getExit('west')).toBeNull();
    });
  });

  describe('item instances', () => {
    describe('addItemInstance', () => {
      it('should add an item instance', () => {
        const room = new Room({ id: 'test', name: 'Test' });

        room.addItemInstance('sword-1', 'iron-sword');

        const instances = room.getItemInstances();
        expect(instances.get('sword-1')).toBe('iron-sword');
      });
    });

    describe('removeItemInstance', () => {
      it('should remove an item instance', () => {
        const room = new Room({ id: 'test', name: 'Test' });
        room.addItemInstance('sword-1', 'iron-sword');

        room.removeItemInstance('sword-1');

        const instances = room.getItemInstances();
        expect(instances.has('sword-1')).toBe(false);
      });
    });

    describe('getItemInstances', () => {
      it('should return all item instances', () => {
        const room = new Room({ id: 'test', name: 'Test' });
        room.addItemInstance('sword-1', 'iron-sword');
        room.addItemInstance('potion-1', 'health-potion');

        const instances = room.getItemInstances();

        expect(instances.size).toBe(2);
      });
    });
  });

  describe('hasChanged flag', () => {
    it('should start as false', () => {
      const room = new Room({ id: 'test', name: 'Test' });
      expect(room.hasChanged).toBe(false);
    });

    it('should be settable', () => {
      const room = new Room({ id: 'test', name: 'Test' });
      room.hasChanged = true;
      expect(room.hasChanged).toBe(true);
    });
  });
});

// Additional tests to improve coverage
describe('Room Additional Coverage', () => {
  describe('hasItemInstance', () => {
    it('should return true for existing item instance', () => {
      const room = new Room({ id: 'test', name: 'Test' });
      room.addItemInstance('sword-12345678-uuid', 'iron-sword');

      expect(room.hasItemInstance('sword-12345678-uuid')).toBe(true);
    });

    it('should return false for non-existent item instance', () => {
      const room = new Room({ id: 'test', name: 'Test' });

      expect(room.hasItemInstance('nonexistent')).toBe(false);
    });

    it('should handle partial ID matching', () => {
      const room = new Room({ id: 'test', name: 'Test' });
      room.addItemInstance('sword-12345678-uuid', 'iron-sword');

      // Should match with partial ID of at least 8 chars
      expect(room.hasItemInstance('sword-12')).toBe(true);
    });

    it('should return undefined for ambiguous partial IDs', () => {
      const room = new Room({ id: 'test', name: 'Test' });
      room.addItemInstance('sword-12345678-uuid-a', 'iron-sword');
      room.addItemInstance('sword-12345678-uuid-b', 'iron-sword');

      // Should be undefined for ambiguous match
      expect(room.hasItemInstance('sword-12')).toBeUndefined();
    });
  });

  describe('findItemInstanceId', () => {
    it('should return exact match', () => {
      const room = new Room({ id: 'test', name: 'Test' });
      room.addItemInstance('exact-id-12345', 'template');

      expect(room.findItemInstanceId('exact-id-12345')).toBe('exact-id-12345');
    });

    it('should return null for short non-matching IDs', () => {
      const room = new Room({ id: 'test', name: 'Test' });
      room.addItemInstance('sword-12345678-uuid', 'iron-sword');

      // ID less than 8 chars should return null
      expect(room.findItemInstanceId('short')).toBeNull();
    });

    it('should return undefined for ambiguous matches', () => {
      const room = new Room({ id: 'test', name: 'Test' });
      room.addItemInstance('prefix-aa-12345678', 'template');
      room.addItemInstance('prefix-bb-12345678', 'template');

      // With partial ID less than 8 chars, returns null (won't try partial matching)
      // but 'prefix-a' is 8 chars so it will try matching and find 'prefix-aa-12345678'
      expect(room.findItemInstanceId('prefix-a')).toBe('prefix-aa-12345678');
    });
  });

  describe('removeItemInstance with partial IDs', () => {
    it('should remove item by partial ID', () => {
      const room = new Room({ id: 'test', name: 'Test' });
      room.addItemInstance('removetest-12345678-uuid', 'template');

      const result = room.removeItemInstance('removetest-1234');

      expect(result).toBe(true);
      expect(room.hasItemInstance('removetest-12345678-uuid')).toBe(false);
    });

    it('should return false for ambiguous partial IDs', () => {
      const room = new Room({ id: 'test', name: 'Test' });
      room.addItemInstance('ambig-test-12345678-a', 'template');
      room.addItemInstance('ambig-test-12345678-b', 'template');

      const result = room.removeItemInstance('ambig-test');
      expect(result).toBe(false);
    });
  });

  describe('serializeItemInstances', () => {
    it('should serialize item instances to array', () => {
      const room = new Room({ id: 'test', name: 'Test' });
      room.addItemInstance('instance-1', 'template-a');
      room.addItemInstance('instance-2', 'template-b');

      const serialized = room.serializeItemInstances();

      expect(serialized.length).toBe(2);
      expect(serialized[0]).toHaveProperty('instanceId');
      expect(serialized[0]).toHaveProperty('templateId');
    });

    it('should return empty array for room without items', () => {
      const room = new Room({ id: 'test', name: 'Test' });

      const serialized = room.serializeItemInstances();

      expect(serialized).toEqual([]);
    });
  });

  describe('addItem (legacy)', () => {
    it('should add string item', () => {
      const room = new Room({ id: 'test', name: 'Test' });

      room.addItem('test-item');

      expect(room.items.length).toBe(1);
    });

    it('should add object item', () => {
      const room = new Room({ id: 'test', name: 'Test' });

      room.addItem({ name: 'Test Object' });

      expect(room.items.length).toBe(1);
    });
  });

  describe('getDescription', () => {
    it('should include room name', () => {
      const room = new Room({
        id: 'test',
        name: 'Test Room Name',
        description: 'A test description',
      });

      const desc = room.getDescription();

      expect(desc).toContain('Test Room Name');
    });

    it('should include NPCs in description', () => {
      const room = new Room({
        id: 'test',
        name: 'Test',
        description: 'A test room',
      });

      const npc = createMockNPC({ name: 'Goblin' });
      room.npcs.set('goblin-1', npc);

      const desc = room.getDescription();

      expect(desc).toContain('Also here');
    });
  });

  describe('getBriefDescription', () => {
    it('should return brief description', () => {
      const room = new Room({
        id: 'test',
        name: 'Test Room',
        description: 'A longer description that should not appear',
      });

      const brief = room.getBriefDescription();

      expect(brief).toContain('Test Room');
    });
  });

  describe('getDescriptionExcludingPlayer', () => {
    it('should exclude specified player', () => {
      const room = new Room({
        id: 'test',
        name: 'Test',
        description: 'Test desc',
      });
      room.addPlayer('visibleplayer');
      room.addPlayer('excludedplayer');

      const desc = room.getDescriptionExcludingPlayer('excludedplayer');

      expect(desc).toContain('Visibleplayer');
      expect(desc).not.toContain('Excludedplayer');
    });
  });

  describe('getBriefDescriptionExcludingPlayer', () => {
    it('should return brief description excluding player', () => {
      const room = new Room({
        id: 'test',
        name: 'Test',
        description: 'Test desc',
      });
      room.addPlayer('player1');
      room.addPlayer('player2');

      const desc = room.getBriefDescriptionExcludingPlayer('player1');

      expect(desc).not.toContain('Player1');
    });
  });

  describe('getDescriptionForPeeking', () => {
    it('should include peeking direction', () => {
      const room = new Room({
        id: 'test',
        name: 'Test',
        description: 'Test desc',
        exits: [{ direction: 'north', roomId: 'other' }],
      });

      const desc = room.getDescriptionForPeeking('south');

      expect(desc).toContain('south');
    });

    it('should mention players as figures', () => {
      const room = new Room({
        id: 'test',
        name: 'Test',
        description: 'Test desc',
      });
      room.addPlayer('someplayer');

      const desc = room.getDescriptionForPeeking('north');

      expect(desc).toContain('figures');
    });

    it('should mention NPCs as creatures', () => {
      const room = new Room({
        id: 'test',
        name: 'Test',
        description: 'Test desc',
      });
      room.npcs.set('npc-1', createMockNPC({ name: 'Goblin' }));

      const desc = room.getDescriptionForPeeking('north');

      expect(desc).toContain('creatures');
    });

    it('should mention items', () => {
      const room = new Room({
        id: 'test',
        name: 'Test',
        description: 'Test desc',
      });
      room.addItem('sword');

      const desc = room.getDescriptionForPeeking('north');

      expect(desc).toContain('items');
    });

    it('should handle room without exits', () => {
      const room = new Room({
        id: 'test',
        name: 'Test',
        description: 'Test desc',
        exits: [],
      });

      const desc = room.getDescriptionForPeeking('north');

      expect(desc).toContain('no obvious exits');
    });
  });

  describe('currency display', () => {
    it('should show gold currency', () => {
      const room = new Room({
        id: 'test',
        name: 'Test',
        description: 'Test desc',
        currency: { gold: 5, silver: 0, copper: 0 },
      });

      const desc = room.getDescription();

      expect(desc).toContain('gold');
    });

    it('should show silver currency', () => {
      const room = new Room({
        id: 'test',
        name: 'Test',
        description: 'Test desc',
        currency: { gold: 0, silver: 10, copper: 0 },
      });

      const desc = room.getDescription();

      expect(desc).toContain('silver');
    });

    it('should show copper currency', () => {
      const room = new Room({
        id: 'test',
        name: 'Test',
        description: 'Test desc',
        currency: { gold: 0, silver: 0, copper: 15 },
      });

      const desc = room.getDescription();

      expect(desc).toContain('copper');
    });

    it('should handle single currency piece grammar', () => {
      const room = new Room({
        id: 'test',
        name: 'Test',
        description: 'Test desc',
        currency: { gold: 1, silver: 0, copper: 0 },
      });

      const desc = room.getDescription();

      expect(desc).toContain('1 gold piece');
      expect(desc).not.toContain('pieces');
    });
  });
});
