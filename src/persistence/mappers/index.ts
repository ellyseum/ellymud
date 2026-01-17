/**
 * Centralized field mappers for database <-> domain conversion
 * @module persistence/mappers
 */

export { dbRowToUser, userToDbRow } from './userMapper';
export { dbRowToRoomData, roomDataToDbRow } from './roomMapper';
export { dbRowToRoomState, roomStateToDbRow } from './roomStateMapper';
export {
  dbRowToGameItem,
  gameItemToDbRow,
  dbRowToItemInstance,
  itemInstanceToDbRow,
} from './itemMapper';
export { dbRowToNPCData, npcDataToDbRow } from './npcMapper';
export { dbRowToArea, areaToDbRow } from './areaMapper';
export { dbRowToAdminUser, adminUserToDbRow } from './adminMapper';
export { dbRowToBugReport, bugReportToDbRow } from './bugReportMapper';
export { dbRowToMerchantState, merchantStateToDbRow } from './merchantStateMapper';
export { dbRowToAbility, abilityToDbRow } from './abilityMapper';
export { dbRowToSnakeScore, snakeScoreToDbRow } from './snakeScoreMapper';
