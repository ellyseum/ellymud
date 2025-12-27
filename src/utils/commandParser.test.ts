import { CommandParser, ParsedCommand } from './commandParser';
import { ClientStateType } from '../types';
import { createMockUser, createMockClient } from '../test/helpers/mockFactories';

// Mock the logger module
jest.mock('./logger', () => ({
  createContextLogger: jest.fn().mockReturnValue({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('CommandParser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create a CommandParser instance with a client', () => {
      const client = createMockClient();
      const parser = new CommandParser(client);

      expect(parser).toBeInstanceOf(CommandParser);
    });
  });

  describe('parse', () => {
    describe('empty and whitespace input', () => {
      it('should return empty command and args for empty string', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('');

        expect(result).toEqual<ParsedCommand>({
          command: '',
          args: [],
        });
      });

      it('should return empty command and args for whitespace-only input', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('   ');

        expect(result).toEqual<ParsedCommand>({
          command: '',
          args: [],
        });
      });

      it('should return empty command and args for tab-only input', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('\t\t');

        expect(result).toEqual<ParsedCommand>({
          command: '',
          args: [],
        });
      });

      it('should return empty command and args for mixed whitespace', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('  \t  \n  ');

        expect(result).toEqual<ParsedCommand>({
          command: '',
          args: [],
        });
      });

      it('should return empty command for client without user and empty input', () => {
        const client = createMockClient({ user: null });
        const parser = new CommandParser(client);

        const result = parser.parse('');

        expect(result).toEqual<ParsedCommand>({
          command: '',
          args: [],
        });
      });
    });

    describe('combat mode with empty input', () => {
      it('should return attack command for player in combat with empty input', () => {
        const user = createMockUser({ inCombat: true });
        const client = createMockClient({ user });
        const parser = new CommandParser(client);

        const result = parser.parse('');

        expect(result).toEqual<ParsedCommand>({
          command: 'attack',
          args: [],
        });
      });

      it('should return attack command for player in combat with whitespace input', () => {
        const user = createMockUser({ inCombat: true });
        const client = createMockClient({ user });
        const parser = new CommandParser(client);

        const result = parser.parse('   ');

        expect(result).toEqual<ParsedCommand>({
          command: 'attack',
          args: [],
        });
      });

      it('should return empty command for player not in combat with empty input', () => {
        const user = createMockUser({ inCombat: false });
        const client = createMockClient({ user });
        const parser = new CommandParser(client);

        const result = parser.parse('');

        expect(result).toEqual<ParsedCommand>({
          command: '',
          args: [],
        });
      });

      it('should return empty command when user exists but inCombat is undefined', () => {
        const user = createMockUser();
        delete user.inCombat; // Simulate undefined inCombat
        const client = createMockClient({ user });
        const parser = new CommandParser(client);

        const result = parser.parse('');

        expect(result).toEqual<ParsedCommand>({
          command: '',
          args: [],
        });
      });
    });

    describe('single word commands', () => {
      it('should parse a single word command with no args', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('look');

        expect(result).toEqual<ParsedCommand>({
          command: 'look',
          args: [],
        });
      });

      it('should lowercase the command', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('LOOK');

        expect(result).toEqual<ParsedCommand>({
          command: 'look',
          args: [],
        });
      });

      it('should lowercase mixed case commands', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('LoOk');

        expect(result).toEqual<ParsedCommand>({
          command: 'look',
          args: [],
        });
      });

      it('should trim leading whitespace from command', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('   look');

        expect(result).toEqual<ParsedCommand>({
          command: 'look',
          args: [],
        });
      });

      it('should trim trailing whitespace from command', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('look   ');

        expect(result).toEqual<ParsedCommand>({
          command: 'look',
          args: [],
        });
      });
    });

    describe('commands with arguments', () => {
      it('should parse command with single argument', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('say hello');

        expect(result).toEqual<ParsedCommand>({
          command: 'say',
          args: ['hello'],
        });
      });

      it('should parse command with multiple arguments', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('give sword bob');

        expect(result).toEqual<ParsedCommand>({
          command: 'give',
          args: ['sword', 'bob'],
        });
      });

      it('should parse command with many arguments', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('tell bob hello how are you today');

        expect(result).toEqual<ParsedCommand>({
          command: 'tell',
          args: ['bob', 'hello', 'how', 'are', 'you', 'today'],
        });
      });

      it('should preserve argument case', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('say Hello World');

        expect(result).toEqual<ParsedCommand>({
          command: 'say',
          args: ['Hello', 'World'],
        });
      });
    });

    describe('whitespace handling', () => {
      it('should handle extra whitespace between command and args', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('say    hello');

        expect(result).toEqual<ParsedCommand>({
          command: 'say',
          args: ['hello'],
        });
      });

      it('should handle extra whitespace between arguments', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('give   sword    bob');

        expect(result).toEqual<ParsedCommand>({
          command: 'give',
          args: ['sword', 'bob'],
        });
      });

      it('should handle tabs as whitespace', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('say\thello');

        expect(result).toEqual<ParsedCommand>({
          command: 'say',
          args: ['hello'],
        });
      });

      it('should handle mixed whitespace types', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('give \t sword  \t bob');

        expect(result).toEqual<ParsedCommand>({
          command: 'give',
          args: ['sword', 'bob'],
        });
      });

      it('should handle leading and trailing whitespace with args', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('  say hello world  ');

        expect(result).toEqual<ParsedCommand>({
          command: 'say',
          args: ['hello', 'world'],
        });
      });
    });

    describe('special characters in commands', () => {
      it('should handle numbers in command', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('take1 sword');

        expect(result).toEqual<ParsedCommand>({
          command: 'take1',
          args: ['sword'],
        });
      });

      it('should handle hyphenated command', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('cast-spell fireball');

        expect(result).toEqual<ParsedCommand>({
          command: 'cast-spell',
          args: ['fireball'],
        });
      });

      it('should handle underscored command', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('admin_teleport town');

        expect(result).toEqual<ParsedCommand>({
          command: 'admin_teleport',
          args: ['town'],
        });
      });

      it('should handle special characters in arguments', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('say hello@world');

        expect(result).toEqual<ParsedCommand>({
          command: 'say',
          args: ['hello@world'],
        });
      });
    });

    describe('edge cases', () => {
      it('should handle null input', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        // @ts-expect-error - Testing null input handling
        const result = parser.parse(null);

        expect(result).toEqual<ParsedCommand>({
          command: '',
          args: [],
        });
      });

      it('should handle undefined input', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        // @ts-expect-error - Testing undefined input handling
        const result = parser.parse(undefined);

        expect(result).toEqual<ParsedCommand>({
          command: '',
          args: [],
        });
      });

      it('should handle single character command', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('n');

        expect(result).toEqual<ParsedCommand>({
          command: 'n',
          args: [],
        });
      });

      it('should handle single character command with args', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('i sword');

        expect(result).toEqual<ParsedCommand>({
          command: 'i',
          args: ['sword'],
        });
      });

      it('should handle very long command', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);
        const longCommand = 'a'.repeat(100);

        const result = parser.parse(longCommand);

        expect(result).toEqual<ParsedCommand>({
          command: longCommand,
          args: [],
        });
      });

      it('should handle very long arguments', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);
        const longArg = 'b'.repeat(100);

        const result = parser.parse(`say ${longArg}`);

        expect(result).toEqual<ParsedCommand>({
          command: 'say',
          args: [longArg],
        });
      });

      it('should handle many arguments', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);
        const manyArgs = Array(50).fill('arg').join(' ');

        const result = parser.parse(`cmd ${manyArgs}`);

        expect(result.command).toBe('cmd');
        expect(result.args).toHaveLength(50);
        expect(result.args.every((arg) => arg === 'arg')).toBe(true);
      });
    });

    describe('command parsing behavior for different client states', () => {
      it('should parse commands the same way regardless of client state', () => {
        const states = [
          ClientStateType.AUTHENTICATED,
          ClientStateType.GAME,
          ClientStateType.EDITOR,
        ];

        states.forEach((state) => {
          const client = createMockClient({ state });
          const parser = new CommandParser(client);

          const result = parser.parse('look around');

          expect(result).toEqual<ParsedCommand>({
            command: 'look',
            args: ['around'],
          });
        });
      });

      it('should only trigger combat behavior when user.inCombat is true', () => {
        const userNotInCombat = createMockUser({ inCombat: false });
        const clientNotInCombat = createMockClient({
          user: userNotInCombat,
          state: ClientStateType.GAME,
        });
        const parserNotInCombat = new CommandParser(clientNotInCombat);

        const resultNotInCombat = parserNotInCombat.parse('');

        expect(resultNotInCombat.command).toBe('');

        const userInCombat = createMockUser({ inCombat: true });
        const clientInCombat = createMockClient({
          user: userInCombat,
          state: ClientStateType.GAME,
        });
        const parserInCombat = new CommandParser(clientInCombat);

        const resultInCombat = parserInCombat.parse('');

        expect(resultInCombat.command).toBe('attack');
      });
    });

    describe('ParsedCommand interface', () => {
      it('should return an object with command and args properties', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('test arg1 arg2');

        expect(result).toHaveProperty('command');
        expect(result).toHaveProperty('args');
        expect(typeof result.command).toBe('string');
        expect(Array.isArray(result.args)).toBe(true);
      });

      it('should return args as array of strings', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('test arg1 arg2 arg3');

        result.args.forEach((arg) => {
          expect(typeof arg).toBe('string');
        });
      });
    });

    describe('regex split edge cases', () => {
      it('should handle newline characters', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('say\nhello');

        expect(result).toEqual<ParsedCommand>({
          command: 'say',
          args: ['hello'],
        });
      });

      it('should handle carriage return characters', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('say\rhello');

        expect(result).toEqual<ParsedCommand>({
          command: 'say',
          args: ['hello'],
        });
      });

      it('should handle command with numeric arguments', () => {
        const client = createMockClient();
        const parser = new CommandParser(client);

        const result = parser.parse('drop 5');

        expect(result).toEqual<ParsedCommand>({
          command: 'drop',
          args: ['5'],
        });
      });
    });
  });
});
