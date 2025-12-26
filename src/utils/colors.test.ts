import { colors, colorize, stripColorCodes } from './colors';

describe('colors', () => {
  it('should have color codes', () => {
    expect(colors.red).toBe('\x1b[31m');
    expect(colors.reset).toBe('\x1b[0m');
  });

  it('should colorize text', () => {
    expect(colorize('test', 'red')).toBe('\x1b[31mtest\x1b[0m');
  });

  it('should strip color codes', () => {
    const colored = '\x1b[31mtest\x1b[0m';
    expect(stripColorCodes(colored)).toBe('test');
  });
});
