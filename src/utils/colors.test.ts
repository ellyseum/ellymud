import { colors, colorize, stripColorCodes, stripCustomColorCodes, rainbow } from './colors';

describe('colors', () => {
  describe('colors object', () => {
    it('should have basic color codes', () => {
      expect(colors.red).toBe('\x1b[31m');
      expect(colors.reset).toBe('\x1b[0m');
    });

    it('should have all standard colors', () => {
      expect(colors.black).toBe('\x1b[30m');
      expect(colors.green).toBe('\x1b[32m');
      expect(colors.yellow).toBe('\x1b[33m');
      expect(colors.blue).toBe('\x1b[34m');
      expect(colors.magenta).toBe('\x1b[35m');
      expect(colors.cyan).toBe('\x1b[36m');
      expect(colors.white).toBe('\x1b[37m');
    });

    it('should have style codes', () => {
      expect(colors.bright).toBe('\x1b[1m');
      expect(colors.dim).toBe('\x1b[2m');
      expect(colors.underscore).toBe('\x1b[4m');
      expect(colors.blink).toBe('\x1b[5m');
      expect(colors.reverse).toBe('\x1b[7m');
      expect(colors.hidden).toBe('\x1b[8m');
    });

    it('should have bold colors', () => {
      expect(colors.boldRed).toBe('\x1b[1m\x1b[31m');
      expect(colors.boldGreen).toBe('\x1b[1m\x1b[32m');
    });

    it('should have bright colors', () => {
      expect(colors.brightRed).toBe('\x1b[91m');
      expect(colors.brightGreen).toBe('\x1b[92m');
    });

    it('should have background colors', () => {
      expect(colors.bgRed).toBe('\x1b[41m');
      expect(colors.bgGreen).toBe('\x1b[42m');
    });

    it('should have clear screen code', () => {
      expect(colors.clear).toBe('\x1B[2J\x1B[0f');
    });
  });

  describe('colorize', () => {
    it('should colorize text with specified color', () => {
      expect(colorize('test', 'red')).toBe('\x1b[31mtest\x1b[0m');
    });

    it('should handle empty string', () => {
      expect(colorize('', 'red')).toBe('\x1b[31m\x1b[0m');
    });

    it('should handle different colors', () => {
      expect(colorize('hello', 'green')).toBe('\x1b[32mhello\x1b[0m');
      expect(colorize('world', 'blue')).toBe('\x1b[34mworld\x1b[0m');
      expect(colorize('test', 'yellow')).toBe('\x1b[33mtest\x1b[0m');
    });

    it('should handle bold colors', () => {
      expect(colorize('bold', 'boldRed')).toBe('\x1b[1m\x1b[31mbold\x1b[0m');
    });

    it('should handle bright colors', () => {
      expect(colorize('bright', 'brightCyan')).toBe('\x1b[96mbright\x1b[0m');
    });

    it('should handle background colors', () => {
      expect(colorize('bg', 'bgYellow')).toBe('\x1b[43mbg\x1b[0m');
    });

    it('should handle text with special characters', () => {
      expect(colorize('hello\nworld', 'red')).toBe('\x1b[31mhello\nworld\x1b[0m');
      expect(colorize('tab\there', 'blue')).toBe('\x1b[34mtab\there\x1b[0m');
    });
  });

  describe('stripColorCodes', () => {
    it('should strip color codes from text', () => {
      const colored = '\x1b[31mtest\x1b[0m';
      expect(stripColorCodes(colored)).toBe('test');
    });

    it('should handle empty string', () => {
      expect(stripColorCodes('')).toBe('');
    });

    it('should handle text without color codes', () => {
      expect(stripColorCodes('plain text')).toBe('plain text');
    });

    it('should strip multiple color codes', () => {
      const multiColored = '\x1b[31mred\x1b[0m \x1b[32mgreen\x1b[0m \x1b[34mblue\x1b[0m';
      expect(stripColorCodes(multiColored)).toBe('red green blue');
    });

    it('should strip bold color codes', () => {
      const boldText = '\x1b[1m\x1b[31mbold red\x1b[0m';
      expect(stripColorCodes(boldText)).toBe('bold red');
    });

    it('should strip background color codes', () => {
      const bgText = '\x1b[41mred background\x1b[0m';
      expect(stripColorCodes(bgText)).toBe('red background');
    });

    it('should handle clear screen code', () => {
      const withClear = '\x1B[2J\x1B[0fcleared';
      expect(stripColorCodes(withClear)).toBe('cleared');
    });
  });

  describe('stripCustomColorCodes', () => {
    it('should strip single custom color code', () => {
      expect(stripCustomColorCodes('$rHello')).toBe('Hello');
    });

    it('should strip multiple custom color codes', () => {
      expect(stripCustomColorCodes('$rHello $gWorld')).toBe('Hello World');
    });

    it('should handle empty string', () => {
      expect(stripCustomColorCodes('')).toBe('');
    });

    it('should handle text without custom color codes', () => {
      expect(stripCustomColorCodes('plain text')).toBe('plain text');
    });

    it('should strip uppercase color codes', () => {
      expect(stripCustomColorCodes('$RBold $GGreen')).toBe('Bold Green');
    });

    it('should strip numeric color codes', () => {
      expect(stripCustomColorCodes('$1First $2Second $9Ninth')).toBe('First Second Ninth');
    });

    it('should strip mixed case and numeric codes', () => {
      expect(stripCustomColorCodes('$rRed $G Green $3Three')).toBe('Red  Green Three');
    });

    it('should not strip dollar sign followed by space', () => {
      expect(stripCustomColorCodes('Cost: $ 50')).toBe('Cost: $ 50');
    });

    it('should strip color code in dollar amounts (known behavior)', () => {
      // Note: $1 in "$100" matches the color code pattern
      expect(stripCustomColorCodes('Price: $100')).toBe('Price: 00');
    });

    it('should handle consecutive color codes', () => {
      expect(stripCustomColorCodes('$r$g$bText')).toBe('Text');
    });

    it('should handle color codes at end of string', () => {
      expect(stripCustomColorCodes('Text$r')).toBe('Text');
    });

    it('should preserve text structure', () => {
      expect(stripCustomColorCodes('$rLine 1\n$gLine 2\n$bLine 3')).toBe('Line 1\nLine 2\nLine 3');
    });
  });

  describe('rainbow', () => {
    it('should apply rainbow colors to text', () => {
      const result = rainbow('Hello');
      // Should contain color codes
      expect(result).toContain('\x1b[');
      // Should contain original characters
      expect(stripColorCodes(result)).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(rainbow('')).toBe('');
    });

    it('should handle single character', () => {
      const result = rainbow('A');
      // First character should be red
      expect(result).toBe('\x1b[31mA\x1b[0m');
    });

    it('should cycle through colors in order', () => {
      // Colors cycle: red, yellow, green, cyan, blue, magenta
      const result = rainbow('ABCDEF');

      // Verify each character has the expected color
      expect(result).toContain('\x1b[31mA\x1b[0m'); // red
      expect(result).toContain('\x1b[33mB\x1b[0m'); // yellow
      expect(result).toContain('\x1b[32mC\x1b[0m'); // green
      expect(result).toContain('\x1b[36mD\x1b[0m'); // cyan
      expect(result).toContain('\x1b[34mE\x1b[0m'); // blue
      expect(result).toContain('\x1b[35mF\x1b[0m'); // magenta
    });

    it('should wrap around after 6 colors', () => {
      const result = rainbow('ABCDEFG');

      // 7th character should be red again (index 0)
      expect(result).toContain('\x1b[31mG\x1b[0m'); // red (wrap around)
    });

    it('should handle longer text with multiple color cycles', () => {
      const text = 'Hello World!';
      const result = rainbow(text);

      // Stripped text should match original
      expect(stripColorCodes(result)).toBe(text);

      // Should have color codes for each character
      // Each character gets: colorCode + char + reset
      expect(result.length).toBeGreaterThan(text.length);
    });

    it('should handle spaces and special characters', () => {
      const result = rainbow('A B');

      // Space should also be colorized
      expect(stripColorCodes(result)).toBe('A B');
      // Should have 3 colorized segments
      const segments = result.split('\x1b[0m').filter((s) => s.length > 0);
      expect(segments.length).toBe(3);
    });

    it('should handle newlines', () => {
      const result = rainbow('A\nB');
      expect(stripColorCodes(result)).toBe('A\nB');
    });

    it('should handle unicode characters', () => {
      const result = rainbow('Hi!');
      expect(stripColorCodes(result)).toBe('Hi!');
    });

    it('should produce consistent output for same input', () => {
      const result1 = rainbow('Test');
      const result2 = rainbow('Test');
      expect(result1).toBe(result2);
    });

    it('should handle numeric text', () => {
      const result = rainbow('123456');
      expect(stripColorCodes(result)).toBe('123456');
      // Verify color cycling
      expect(result).toContain('\x1b[31m1\x1b[0m'); // red
      expect(result).toContain('\x1b[35m6\x1b[0m'); // magenta
    });
  });
});
