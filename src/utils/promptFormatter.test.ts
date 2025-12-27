import { writeCommandPrompt, getPromptText, drawCommandPrompt } from './promptFormatter';
import { createMockUser, createMockClient } from '../test/helpers/mockFactories';

// Mock dependencies
jest.mock('./colors', () => ({
  colorize: jest.fn((text: string, color: string) => `[${color}]${text}[/${color}]`),
}));

jest.mock('./socketWriter', () => ({
  writeToClient: jest.fn(),
}));

jest.mock('../command/commands/sudo.command', () => ({
  SudoCommand: {
    isAuthorizedUser: jest.fn(),
  },
}));

// Import mocked modules for assertion
import { colorize } from './colors';
import { writeToClient } from './socketWriter';
import { SudoCommand } from '../command/commands/sudo.command';

describe('promptFormatter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: user is not an admin
    (SudoCommand.isAuthorizedUser as jest.Mock).mockReturnValue(false);
  });

  describe('getPromptText', () => {
    describe('basic functionality', () => {
      it('should return empty string when client has no user', () => {
        const client = createMockClient({ user: null });

        const result = getPromptText(client);

        expect(result).toBe('');
      });

      it('should include ANSI reset at the beginning', () => {
        const client = createMockClient({
          user: createMockUser(),
        });

        const result = getPromptText(client);

        expect(result.startsWith('\x1b[0m')).toBe(true);
      });

      it('should format HP numbers with green color', () => {
        const client = createMockClient({
          user: createMockUser({ health: 75, maxHealth: 100 }),
        });

        getPromptText(client);

        expect(colorize).toHaveBeenCalledWith('75/100', 'green');
      });

      it('should format MP numbers with blue color', () => {
        const client = createMockClient({
          user: createMockUser({ mana: 30, maxMana: 50 }),
        });

        getPromptText(client);

        expect(colorize).toHaveBeenCalledWith('30/50', 'blue');
      });

      it('should include white-colored brackets and labels', () => {
        const client = createMockClient({
          user: createMockUser(),
        });

        getPromptText(client);

        expect(colorize).toHaveBeenCalledWith('[HP=', 'white');
        expect(colorize).toHaveBeenCalledWith(' MP=', 'white');
        expect(colorize).toHaveBeenCalledWith(']', 'white');
        expect(colorize).toHaveBeenCalledWith(': ', 'white');
      });
    });

    describe('mana stats handling', () => {
      it('should display --/-- when mana is undefined', () => {
        const client = createMockClient({
          user: createMockUser({ mana: undefined as unknown as number, maxMana: 50 }),
        });

        getPromptText(client);

        expect(colorize).toHaveBeenCalledWith('--/--', 'blue');
      });

      it('should display --/-- when maxMana is undefined', () => {
        const client = createMockClient({
          user: createMockUser({ mana: 50, maxMana: undefined as unknown as number }),
        });

        getPromptText(client);

        expect(colorize).toHaveBeenCalledWith('--/--', 'blue');
      });

      it('should display --/-- when both mana and maxMana are undefined', () => {
        const client = createMockClient({
          user: createMockUser({
            mana: undefined as unknown as number,
            maxMana: undefined as unknown as number,
          }),
        });

        getPromptText(client);

        expect(colorize).toHaveBeenCalledWith('--/--', 'blue');
      });

      it('should display actual mana values when both are defined', () => {
        const client = createMockClient({
          user: createMockUser({ mana: 25, maxMana: 100 }),
        });

        getPromptText(client);

        expect(colorize).toHaveBeenCalledWith('25/100', 'blue');
      });

      it('should display mana as 0 when mana is 0 (falsy but valid)', () => {
        const client = createMockClient({
          user: createMockUser({ mana: 0, maxMana: 50 }),
        });

        getPromptText(client);

        expect(colorize).toHaveBeenCalledWith('0/50', 'blue');
      });
    });

    describe('combat indicator', () => {
      it('should add COMBAT indicator when user is in combat', () => {
        const client = createMockClient({
          user: createMockUser({ inCombat: true }),
        });

        getPromptText(client);

        expect(colorize).toHaveBeenCalledWith(' [COMBAT]', 'boldYellow');
      });

      it('should not add COMBAT indicator when user is not in combat', () => {
        const client = createMockClient({
          user: createMockUser({ inCombat: false }),
        });

        getPromptText(client);

        expect(colorize).not.toHaveBeenCalledWith(' [COMBAT]', 'boldYellow');
      });

      it('should not add COMBAT indicator when inCombat is undefined', () => {
        const client = createMockClient({
          user: createMockUser({ inCombat: undefined }),
        });

        getPromptText(client);

        expect(colorize).not.toHaveBeenCalledWith(' [COMBAT]', 'boldYellow');
      });
    });

    describe('resting indicator', () => {
      it('should add Resting indicator when user is resting', () => {
        const client = createMockClient({
          user: createMockUser({ isResting: true }),
        });

        getPromptText(client);

        expect(colorize).toHaveBeenCalledWith(' (Resting)', 'green');
      });

      it('should not add Resting indicator when user is not resting', () => {
        const client = createMockClient({
          user: createMockUser({ isResting: false }),
        });

        getPromptText(client);

        expect(colorize).not.toHaveBeenCalledWith(' (Resting)', 'green');
      });
    });

    describe('meditating indicator', () => {
      it('should add Meditating indicator when user is meditating', () => {
        const client = createMockClient({
          user: createMockUser({ isMeditating: true }),
        });

        getPromptText(client);

        expect(colorize).toHaveBeenCalledWith(' (Meditating)', 'blue');
      });

      it('should not add Meditating indicator when user is not meditating', () => {
        const client = createMockClient({
          user: createMockUser({ isMeditating: false }),
        });

        getPromptText(client);

        expect(colorize).not.toHaveBeenCalledWith(' (Meditating)', 'blue');
      });

      it('should show Resting instead of Meditating when both are true', () => {
        // Based on the code: else if (client.user.isMeditating) - so resting takes priority
        const client = createMockClient({
          user: createMockUser({ isResting: true, isMeditating: true }),
        });

        getPromptText(client);

        expect(colorize).toHaveBeenCalledWith(' (Resting)', 'green');
        expect(colorize).not.toHaveBeenCalledWith(' (Meditating)', 'blue');
      });
    });

    describe('admin indicator', () => {
      it('should add Admin indicator when user is an authorized admin', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'adminuser' }),
        });
        (SudoCommand.isAuthorizedUser as jest.Mock).mockReturnValue(true);

        getPromptText(client);

        expect(SudoCommand.isAuthorizedUser).toHaveBeenCalledWith('adminuser');
        expect(colorize).toHaveBeenCalledWith(' [Admin]', 'red');
      });

      it('should not add Admin indicator when user is not an authorized admin', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'regularuser' }),
        });
        (SudoCommand.isAuthorizedUser as jest.Mock).mockReturnValue(false);

        getPromptText(client);

        expect(SudoCommand.isAuthorizedUser).toHaveBeenCalledWith('regularuser');
        expect(colorize).not.toHaveBeenCalledWith(' [Admin]', 'red');
      });
    });

    describe('combined states', () => {
      it('should show combat + admin indicators together', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin', inCombat: true }),
        });
        (SudoCommand.isAuthorizedUser as jest.Mock).mockReturnValue(true);

        getPromptText(client);

        expect(colorize).toHaveBeenCalledWith(' [COMBAT]', 'boldYellow');
        expect(colorize).toHaveBeenCalledWith(' [Admin]', 'red');
      });

      it('should show combat + resting + admin indicators together', () => {
        const client = createMockClient({
          user: createMockUser({ username: 'admin', inCombat: true, isResting: true }),
        });
        (SudoCommand.isAuthorizedUser as jest.Mock).mockReturnValue(true);

        getPromptText(client);

        expect(colorize).toHaveBeenCalledWith(' [COMBAT]', 'boldYellow');
        expect(colorize).toHaveBeenCalledWith(' (Resting)', 'green');
        expect(colorize).toHaveBeenCalledWith(' [Admin]', 'red');
      });

      it('should show all indicators in correct order', () => {
        const client = createMockClient({
          user: createMockUser({
            username: 'admin',
            health: 50,
            maxHealth: 100,
            mana: 25,
            maxMana: 50,
            inCombat: true,
            isMeditating: true,
          }),
        });
        (SudoCommand.isAuthorizedUser as jest.Mock).mockReturnValue(true);

        const result = getPromptText(client);

        // Verify all expected colorize calls were made
        expect(colorize).toHaveBeenCalledWith(' [COMBAT]', 'boldYellow');
        expect(colorize).toHaveBeenCalledWith(' (Meditating)', 'blue');
        expect(colorize).toHaveBeenCalledWith(' [Admin]', 'red');

        // Verify result contains formatted output
        expect(result).toContain('\x1b[0m'); // ANSI reset at start
      });
    });

    describe('HP edge cases', () => {
      it('should handle zero HP', () => {
        const client = createMockClient({
          user: createMockUser({ health: 0, maxHealth: 100 }),
        });

        getPromptText(client);

        expect(colorize).toHaveBeenCalledWith('0/100', 'green');
      });

      it('should handle full HP', () => {
        const client = createMockClient({
          user: createMockUser({ health: 100, maxHealth: 100 }),
        });

        getPromptText(client);

        expect(colorize).toHaveBeenCalledWith('100/100', 'green');
      });

      it('should handle overheal (HP > maxHP)', () => {
        const client = createMockClient({
          user: createMockUser({ health: 120, maxHealth: 100 }),
        });

        getPromptText(client);

        expect(colorize).toHaveBeenCalledWith('120/100', 'green');
      });

      it('should handle negative HP', () => {
        const client = createMockClient({
          user: createMockUser({ health: -10, maxHealth: 100 }),
        });

        getPromptText(client);

        expect(colorize).toHaveBeenCalledWith('-10/100', 'green');
      });
    });
  });

  describe('writeCommandPrompt', () => {
    it('should return early when client has no user', () => {
      const client = createMockClient({ user: null });

      writeCommandPrompt(client);

      expect(writeToClient).not.toHaveBeenCalled();
    });

    it('should call getPromptText and write to client', () => {
      const client = createMockClient({
        user: createMockUser({ health: 80, maxHealth: 100 }),
      });

      writeCommandPrompt(client);

      expect(writeToClient).toHaveBeenCalledTimes(1);
      expect(writeToClient).toHaveBeenCalledWith(client, expect.any(String));
    });

    it('should write formatted prompt with HP/MP stats', () => {
      const client = createMockClient({
        user: createMockUser({ health: 50, maxHealth: 100, mana: 25, maxMana: 50 }),
      });

      writeCommandPrompt(client);

      const writtenText = (writeToClient as jest.Mock).mock.calls[0][1];
      expect(writtenText).toContain('\x1b[0m'); // ANSI reset
    });
  });

  describe('drawCommandPrompt', () => {
    describe('basic functionality', () => {
      it('should return early when client has no user', () => {
        const client = createMockClient({ user: null });

        drawCommandPrompt(client);

        expect(writeToClient).not.toHaveBeenCalled();
      });

      it('should clear line and write prompt', () => {
        const client = createMockClient({
          user: createMockUser(),
        });

        drawCommandPrompt(client);

        expect(writeToClient).toHaveBeenCalledTimes(1);
        const writtenText = (writeToClient as jest.Mock).mock.calls[0][1];
        // Check for clear line sequence at start
        expect(writtenText.startsWith('\r\x1B[K')).toBe(true);
      });

      it('should include clear line sequence followed by prompt', () => {
        const client = createMockClient({
          user: createMockUser({ health: 100, maxHealth: 100 }),
        });

        drawCommandPrompt(client);

        const writtenText = (writeToClient as jest.Mock).mock.calls[0][1];
        // Clear line sequence is \r\x1B[K - use startsWith instead of regex to avoid control char warning
        expect(writtenText.startsWith('\r\x1B[K')).toBe(true);
        // Should also contain the ANSI reset from getPromptText
        expect(writtenText).toContain('\x1b[0m');
      });
    });

    describe('suppressPrompt handling', () => {
      it('should skip drawing when suppressPrompt is true', () => {
        const client = createMockClient({
          stateData: { suppressPrompt: true },
        });

        drawCommandPrompt(client);

        expect(writeToClient).not.toHaveBeenCalled();
      });

      it('should draw when suppressPrompt is false', () => {
        const client = createMockClient({
          user: createMockUser(),
          stateData: { suppressPrompt: false },
        });

        drawCommandPrompt(client);

        expect(writeToClient).toHaveBeenCalled();
      });

      it('should draw when suppressPrompt is undefined', () => {
        const client = createMockClient({
          user: createMockUser(),
          stateData: {},
        });

        drawCommandPrompt(client);

        expect(writeToClient).toHaveBeenCalled();
      });

      it('should draw when stateData is empty object', () => {
        const client = createMockClient({
          user: createMockUser(),
          stateData: {},
        });

        drawCommandPrompt(client);

        expect(writeToClient).toHaveBeenCalled();
      });
    });

    describe('buffer redraw', () => {
      it('should redraw partial input buffer after prompt', () => {
        const client = createMockClient({
          user: createMockUser(),
          buffer: 'partial command',
        });

        drawCommandPrompt(client);

        expect(writeToClient).toHaveBeenCalledTimes(2);
        expect(writeToClient).toHaveBeenNthCalledWith(2, client, 'partial command');
      });

      it('should not write buffer when buffer is empty string', () => {
        const client = createMockClient({
          user: createMockUser(),
          buffer: '',
        });

        drawCommandPrompt(client);

        expect(writeToClient).toHaveBeenCalledTimes(1);
      });

      it('should not write buffer when buffer has zero length', () => {
        const client = createMockClient({
          user: createMockUser(),
          buffer: '',
        });

        drawCommandPrompt(client);

        // Only the prompt should be written
        expect(writeToClient).toHaveBeenCalledTimes(1);
      });

      it('should redraw buffer with special characters', () => {
        const client = createMockClient({
          user: createMockUser(),
          buffer: 'say hello world!',
        });

        drawCommandPrompt(client);

        expect(writeToClient).toHaveBeenNthCalledWith(2, client, 'say hello world!');
      });

      it('should redraw buffer with whitespace', () => {
        const client = createMockClient({
          user: createMockUser(),
          buffer: '   ',
        });

        drawCommandPrompt(client);

        expect(writeToClient).toHaveBeenCalledTimes(2);
        expect(writeToClient).toHaveBeenNthCalledWith(2, client, '   ');
      });

      it('should redraw single character buffer', () => {
        const client = createMockClient({
          user: createMockUser(),
          buffer: 'a',
        });

        drawCommandPrompt(client);

        expect(writeToClient).toHaveBeenCalledTimes(2);
        expect(writeToClient).toHaveBeenNthCalledWith(2, client, 'a');
      });
    });

    describe('combined scenarios', () => {
      it('should not draw anything when user is null and buffer exists', () => {
        const client = createMockClient({
          user: null,
          buffer: 'some text',
        });

        drawCommandPrompt(client);

        expect(writeToClient).not.toHaveBeenCalled();
      });

      it('should not draw anything when suppressPrompt is true and buffer exists', () => {
        const client = createMockClient({
          stateData: { suppressPrompt: true },
          buffer: 'some text',
        });

        drawCommandPrompt(client);

        expect(writeToClient).not.toHaveBeenCalled();
      });

      it('should draw prompt and buffer for active user with buffer', () => {
        const client = createMockClient({
          user: createMockUser({ health: 80, maxHealth: 100, inCombat: true }),
          buffer: 'attack goblin',
          stateData: {},
        });
        (SudoCommand.isAuthorizedUser as jest.Mock).mockReturnValue(false);

        drawCommandPrompt(client);

        expect(writeToClient).toHaveBeenCalledTimes(2);
        // First call: clear line + prompt
        const promptCall = (writeToClient as jest.Mock).mock.calls[0][1];
        expect(promptCall.startsWith('\r\x1B[K')).toBe(true);
        // Second call: buffer content
        expect(writeToClient).toHaveBeenNthCalledWith(2, client, 'attack goblin');
      });
    });
  });

  describe('integration scenarios', () => {
    it('should produce consistent output between getPromptText and writeCommandPrompt', () => {
      const client = createMockClient({
        user: createMockUser({ health: 75, maxHealth: 100, mana: 40, maxMana: 50 }),
      });

      const promptText = getPromptText(client);
      jest.clearAllMocks();

      writeCommandPrompt(client);

      const writtenText = (writeToClient as jest.Mock).mock.calls[0][1];
      // The prompt text should be what gets written
      expect(writtenText).toBe(promptText);
    });

    it('should handle rapid state changes', () => {
      const user = createMockUser({ health: 100, maxHealth: 100 });
      const client = createMockClient({ user });

      // First prompt - normal state
      writeCommandPrompt(client);
      const firstPrompt = (writeToClient as jest.Mock).mock.calls[0][1];

      jest.clearAllMocks();

      // Update user state
      user.inCombat = true;
      user.health = 50;

      // Second prompt - combat state
      writeCommandPrompt(client);
      const secondPrompt = (writeToClient as jest.Mock).mock.calls[0][1];

      // Prompts should be different
      expect(firstPrompt).not.toBe(secondPrompt);
    });

    it('should correctly call SudoCommand.isAuthorizedUser with exact username', () => {
      const client = createMockClient({
        user: createMockUser({ username: 'TestPlayer123' }),
      });

      getPromptText(client);

      expect(SudoCommand.isAuthorizedUser).toHaveBeenCalledWith('TestPlayer123');
      expect(SudoCommand.isAuthorizedUser).toHaveBeenCalledTimes(1);
    });
  });
});
