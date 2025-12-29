/* eslint-disable @typescript-eslint/no-explicit-any */
// Logger utilities use dynamic typing for flexible log metadata
import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import * as config from '../config';

const LOGS_DIR = path.join(__dirname, '..', '..', 'logs');
const PLAYER_LOGS_DIR = path.join(LOGS_DIR, 'players');
const ERROR_LOGS_DIR = path.join(LOGS_DIR, 'error');
const EXCEPTIONS_LOGS_DIR = path.join(LOGS_DIR, 'exceptions');
const REJECTIONS_LOGS_DIR = path.join(LOGS_DIR, 'rejections');
const SYSTEM_LOGS_DIR = path.join(LOGS_DIR, 'system');
const MCP_LOGS_DIR = path.join(LOGS_DIR, 'mcp');
const AUDIT_LOGS_DIR = path.join(LOGS_DIR, 'audit');

// --- Ensure log directories exist ---
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}
if (!fs.existsSync(PLAYER_LOGS_DIR)) {
  fs.mkdirSync(PLAYER_LOGS_DIR, { recursive: true });
}
if (!fs.existsSync(ERROR_LOGS_DIR)) {
  fs.mkdirSync(ERROR_LOGS_DIR, { recursive: true });
}
if (!fs.existsSync(EXCEPTIONS_LOGS_DIR)) {
  fs.mkdirSync(EXCEPTIONS_LOGS_DIR, { recursive: true });
}
if (!fs.existsSync(REJECTIONS_LOGS_DIR)) {
  fs.mkdirSync(REJECTIONS_LOGS_DIR, { recursive: true });
}
if (!fs.existsSync(SYSTEM_LOGS_DIR)) {
  fs.mkdirSync(SYSTEM_LOGS_DIR, { recursive: true });
}
if (!fs.existsSync(MCP_LOGS_DIR)) {
  fs.mkdirSync(MCP_LOGS_DIR, { recursive: true });
}
if (!fs.existsSync(AUDIT_LOGS_DIR)) {
  fs.mkdirSync(AUDIT_LOGS_DIR, { recursive: true });
}
// Note: winston-daily-rotate-file handles the archive rotation automatically based on config.

// --- Define Log Format ---
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }), // Log stack traces for errors
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  })
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  logFormat // Reuse the base format but add color
);

// Create transports array based on configurations
const transports: winston.transport[] = [
  // System File Transport (Info Level)
  new winston.transports.DailyRotateFile({
    filename: path.join(SYSTEM_LOGS_DIR, 'system-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true, // Compress rotated files
    maxSize: '20m', // Rotate when file reaches 20MB
    maxFiles: '14d', // Keep logs for 14 days
    level: 'info', // Log info, warn, error to this file
    utc: true, // Use UTC time for file rotation
    auditFile: path.join(AUDIT_LOGS_DIR, 'system-audit.json'),
  }),
  // Error File Transport (Error Level Only)
  new winston.transports.DailyRotateFile({
    filename: path.join(ERROR_LOGS_DIR, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error', // Only log errors and above to this file
    utc: true, // Use UTC time for file rotation
    auditFile: path.join(AUDIT_LOGS_DIR, 'error-audit.json'),
  }),
];

// Add console transport only if silent mode is not enabled
if (!config.SILENT_MODE) {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat, // Use the colorful format for the console
      level: config.LOG_LEVEL, // Use the level from config
    })
  );
}

// Create exception handlers array
const exceptionHandlers: winston.transport[] = [
  new winston.transports.DailyRotateFile({
    filename: path.join(EXCEPTIONS_LOGS_DIR, 'exceptions-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '10m',
    maxFiles: '30d',
    utc: true, // Use UTC time for file rotation
    auditFile: path.join(AUDIT_LOGS_DIR, 'exceptions-audit.json'),
  }),
];

// Add console exception handler only if silent mode is not enabled
if (!config.SILENT_MODE) {
  exceptionHandlers.push(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Create rejection handlers array
const rejectionHandlers: winston.transport[] = [
  new winston.transports.DailyRotateFile({
    filename: path.join(REJECTIONS_LOGS_DIR, 'rejections-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '10m',
    maxFiles: '30d',
    utc: true, // Use UTC time for file rotation
    auditFile: path.join(AUDIT_LOGS_DIR, 'rejections-audit.json'),
  }),
];

// Add console rejection handler only if silent mode is not enabled
if (!config.SILENT_MODE) {
  rejectionHandlers.push(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// --- System Logger ---
const systemLogger = winston.createLogger({
  level: config.LOG_LEVEL || 'info', // Use the level from config
  format: logFormat,
  transports,
  exceptionHandlers,
  rejectionHandlers,
  exitOnError: false, // Prevent Winston from exiting on handled exceptions/rejections
});

// --- MCP Logger ---
const mcpLogger = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports: [
    new winston.transports.DailyRotateFile({
      filename: path.join(MCP_LOGS_DIR, 'mcp-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '10m',
      maxFiles: '14d',
      level: 'info',
      utc: true,
      auditFile: path.join(AUDIT_LOGS_DIR, 'mcp-audit.json'),
    }),
  ],
  exitOnError: false,
});

// --- Player Logger Management ---
const playerLoggers = new Map<string, winston.Logger>();

function getPlayerLogger(username: string): winston.Logger {
  // Sanitize username to prevent path traversal issues and invalid characters
  const sanitizedUsername = username.replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!playerLoggers.has(sanitizedUsername)) {
    const logger = winston.createLogger({
      level: 'info',
      format: logFormat,
      transports: [
        new winston.transports.DailyRotateFile({
          filename: path.join(PLAYER_LOGS_DIR, `${sanitizedUsername}-%DATE%.log`),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '5m', // Smaller size for individual player logs
          maxFiles: '7d', // Keep player logs for 7 days
          level: 'info',
          utc: true, // Use UTC time for file rotation
          auditFile: path.join(AUDIT_LOGS_DIR, `player-${sanitizedUsername}-audit.json`),
        }),
      ],
    });
    playerLoggers.set(sanitizedUsername, logger);
    systemLogger.debug(`Created logger for player: ${sanitizedUsername}`);
  }
  return playerLoggers.get(sanitizedUsername)!;
}

// --- Context-Aware Logging Helpers ---

/**
 * Enable silent mode by removing console transports from the logger.
 * Call this after bootTestMode() to suppress console output during tests.
 */
function enableSilentMode(): void {
  // Remove console transports from systemLogger
  const consoleTransports = systemLogger.transports.filter(
    (t) => t instanceof winston.transports.Console
  );
  consoleTransports.forEach((t) => systemLogger.remove(t));
}

/**
 * Creates a context-aware logger with predefined metadata
 * Useful for consistently logging from a specific component
 */
function createContextLogger(context: string) {
  return {
    debug: (message: string, metadata?: unknown) =>
      systemLogger.debug(`[${context}] ${message}`, metadata),
    info: (message: string, metadata?: unknown) =>
      systemLogger.info(`[${context}] ${message}`, metadata),
    warn: (message: string, metadata?: unknown) =>
      systemLogger.warn(`[${context}] ${message}`, metadata),
    error: (message: string, metadata?: unknown) =>
      systemLogger.error(`[${context}] ${message}`, metadata),
  };
}

/**
 * Creates a specific logger for game mechanics like combat, movement, etc.
 * Adds both system logging and player-specific logging
 */
function createMechanicsLogger(mechanicName: string) {
  const mechLogger = createContextLogger(mechanicName);

  return {
    ...mechLogger,
    // Log both to system and to player logs
    playerAction: (
      username: string,
      message: string,
      level: 'info' | 'warn' | 'error' = 'info'
    ) => {
      const playerLogger = getPlayerLogger(username);
      mechLogger[level](`Player ${username}: ${message}`);
      playerLogger[level](`[${mechanicName}] ${message}`);
    },
  };
}

export {
  systemLogger,
  mcpLogger,
  getPlayerLogger,
  createContextLogger,
  createMechanicsLogger,
  enableSilentMode,
};
