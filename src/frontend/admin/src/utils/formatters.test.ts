/**
 * Unit tests for formatters utility functions
 */

import {
  formatBytes,
  formatTime,
  formatDate,
  truncateText,
  generateRandomPassword,
  scoreToGrade,
  complexityColor,
  getDaysSinceLogin,
} from './formatters';

describe('formatBytes', () => {
  it('should format 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  it('should format bytes correctly', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('should respect decimal places', () => {
    expect(formatBytes(1536, 0)).toBe('2 KB');
    expect(formatBytes(1536, 1)).toBe('1.5 KB');
    expect(formatBytes(1536, 2)).toBe('1.5 KB');
  });

  it('should handle negative decimals', () => {
    expect(formatBytes(1536, -1)).toBe('2 KB');
  });
});

describe('formatTime', () => {
  it('should format seconds only', () => {
    expect(formatTime(45)).toBe('45s');
  });

  it('should format minutes and seconds', () => {
    expect(formatTime(125)).toBe('2m 5s');
  });

  it('should format hours, minutes, and seconds', () => {
    expect(formatTime(3665)).toBe('1h 1m 5s');
  });

  it('should format days, hours, minutes, and seconds', () => {
    expect(formatTime(90061)).toBe('1d 1h 1m 1s');
  });

  it('should handle zero', () => {
    expect(formatTime(0)).toBe('0s');
  });
});

describe('formatDate', () => {
  it('should format valid date string', () => {
    const result = formatDate('2026-01-07T10:00:00Z');
    expect(result).toContain('10:00');
    expect(typeof result).toBe('string');
    expect(result).not.toBe('-');
  });

  it('should return "-" for empty string', () => {
    expect(formatDate('')).toBe('-');
  });

  it('should return original string for invalid date', () => {
    const result = formatDate('invalid-date');
    expect(result).toContain('Invalid Date');
  });
});

describe('truncateText', () => {
  it('should truncate long text', () => {
    expect(truncateText('This is a very long text', 10)).toBe('This is a ...');
  });

  it('should not truncate short text', () => {
    expect(truncateText('Short', 10)).toBe('Short');
  });

  it('should handle empty string', () => {
    expect(truncateText('', 10)).toBe('-');
  });

  it('should handle null/undefined', () => {
    expect(truncateText(null as unknown as string, 10)).toBe('-');
  });
});

describe('generateRandomPassword', () => {
  it('should generate password of default length', () => {
    const password = generateRandomPassword();
    expect(password).toHaveLength(10);
  });

  it('should generate password of specified length', () => {
    const password = generateRandomPassword(20);
    expect(password).toHaveLength(20);
  });

  it('should only contain valid characters', () => {
    const password = generateRandomPassword(100);
    expect(password).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('should generate different passwords', () => {
    const password1 = generateRandomPassword();
    const password2 = generateRandomPassword();
    expect(password1).not.toBe(password2);
  });
});

describe('scoreToGrade', () => {
  it('should return A+ for 97+', () => {
    expect(scoreToGrade(100)).toBe('A+');
    expect(scoreToGrade(97)).toBe('A+');
  });

  it('should return A for 93-96', () => {
    expect(scoreToGrade(96)).toBe('A');
    expect(scoreToGrade(93)).toBe('A');
  });

  it('should return A- for 90-92', () => {
    expect(scoreToGrade(92)).toBe('A-');
    expect(scoreToGrade(90)).toBe('A-');
  });

  it('should return B+ for 87-89', () => {
    expect(scoreToGrade(89)).toBe('B+');
    expect(scoreToGrade(87)).toBe('B+');
  });

  it('should return D for 60-69', () => {
    expect(scoreToGrade(65)).toBe('D');
    expect(scoreToGrade(60)).toBe('D');
  });

  it('should return F for below 60', () => {
    expect(scoreToGrade(59)).toBe('F');
    expect(scoreToGrade(0)).toBe('F');
  });
});

describe('complexityColor', () => {
  it('should return secondary for trivial', () => {
    expect(complexityColor('trivial')).toBe('secondary');
    expect(complexityColor('TRIVIAL')).toBe('secondary');
  });

  it('should return success for low', () => {
    expect(complexityColor('low')).toBe('success');
  });

  it('should return warning for medium', () => {
    expect(complexityColor('medium')).toBe('warning');
  });

  it('should return danger for high', () => {
    expect(complexityColor('high')).toBe('danger');
  });

  it('should return dark for critical', () => {
    expect(complexityColor('critical')).toBe('dark');
  });

  it('should return secondary for unknown complexity', () => {
    expect(complexityColor('unknown')).toBe('secondary');
    expect(complexityColor(undefined)).toBe('secondary');
  });
});

describe('getDaysSinceLogin', () => {
  it('should calculate days since login', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    expect(getDaysSinceLogin(threeDaysAgo.toISOString())).toBe(3);
  });

  it('should return 0 for today', () => {
    const now = new Date();
    expect(getDaysSinceLogin(now.toISOString())).toBe(0);
  });

  it('should handle past dates', () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    expect(getDaysSinceLogin(tenDaysAgo.toISOString())).toBe(10);
  });
});
