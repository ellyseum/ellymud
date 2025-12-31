/**
 * Centralized field mappers for database <-> domain conversion
 * @module persistence/mappers
 */

export { dbRowToUser, userToDbRow } from './userMapper';
export { dbRowToRoomData, roomDataToDbRow } from './roomMapper';
export {
  dbRowToGameItem,
  gameItemToDbRow,
  dbRowToItemInstance,
  itemInstanceToDbRow,
} from './itemMapper';
export { dbRowToNPCData, npcDataToDbRow } from './npcMapper';
