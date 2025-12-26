import { createAdminMessageBox, createSystemMessageBox } from './messageFormatter';

describe('messageFormatter', () => {
  // ANSI color codes
  const magenta = '\x1b[95m';
  const cyan = '\x1b[96m';
  const reset = '\x1b[0m';

  // Box drawing characters
  const topLeft = '╔';
  const topRight = '╗';
  const bottomLeft = '╚';
  const bottomRight = '╝';
  const horizontal = '═';
  const vertical = '║';

  describe('createAdminMessageBox', () => {
    describe('box structure', () => {
      it('should start with a newline', () => {
        const result = createAdminMessageBox('Test');
        expect(result.startsWith('\r\n')).toBe(true);
      });

      it('should end with a newline', () => {
        const result = createAdminMessageBox('Test');
        expect(result.endsWith('\r\n')).toBe(true);
      });

      it('should contain top-left corner', () => {
        const result = createAdminMessageBox('Test');
        expect(result).toContain(topLeft);
      });

      it('should contain top-right corner', () => {
        const result = createAdminMessageBox('Test');
        expect(result).toContain(topRight);
      });

      it('should contain bottom-left corner', () => {
        const result = createAdminMessageBox('Test');
        expect(result).toContain(bottomLeft);
      });

      it('should contain bottom-right corner', () => {
        const result = createAdminMessageBox('Test');
        expect(result).toContain(bottomRight);
      });

      it('should contain horizontal borders', () => {
        const result = createAdminMessageBox('Test');
        expect(result).toContain(horizontal);
      });

      it('should contain vertical borders', () => {
        const result = createAdminMessageBox('Test');
        expect(result).toContain(vertical);
      });

      it('should contain "MESSAGE FROM ADMIN:" header', () => {
        const result = createAdminMessageBox('Test');
        expect(result).toContain('MESSAGE FROM ADMIN:');
      });

      it('should use \\r\\n line endings throughout', () => {
        const result = createAdminMessageBox('Test message');
        const lines = result.split('\r\n');
        // Should have multiple lines (start newline, top border, header, separator, content, bottom border, trailing)
        expect(lines.length).toBeGreaterThan(5);
      });
    });

    describe('ANSI colors', () => {
      it('should use magenta color code', () => {
        const result = createAdminMessageBox('Test');
        expect(result).toContain(magenta);
      });

      it('should include reset codes', () => {
        const result = createAdminMessageBox('Test');
        expect(result).toContain(reset);
      });

      it('should not use cyan color code', () => {
        const result = createAdminMessageBox('Test');
        expect(result).not.toContain(cyan);
      });
    });

    describe('message handling', () => {
      it('should handle empty message', () => {
        const result = createAdminMessageBox('');
        expect(result).toContain('MESSAGE FROM ADMIN:');
        expect(result).toContain(topLeft);
        expect(result).toContain(bottomRight);
      });

      it('should handle single word message', () => {
        const result = createAdminMessageBox('Hello');
        expect(result).toContain('Hello');
      });

      it('should handle short message that fits on one line', () => {
        const result = createAdminMessageBox('This is a short message');
        expect(result).toContain('This is a short message');
      });

      it('should wrap long message to multiple lines', () => {
        const longMessage =
          'This is a very long message that should definitely wrap to multiple lines because it exceeds the maximum line length of fifty characters';
        const result = createAdminMessageBox(longMessage);

        // Count content lines (lines with vertical borders containing message text)
        const lines = result.split('\r\n');
        const contentLines = lines.filter(
          (line) =>
            line.includes(vertical) &&
            !line.includes('MESSAGE FROM ADMIN:') &&
            !line.includes(horizontal.repeat(3)) &&
            !line.includes(topLeft) &&
            !line.includes(bottomLeft)
        );
        expect(contentLines.length).toBeGreaterThan(1);
      });

      it('should handle message with exactly maxLineLength characters', () => {
        // maxLineLength is 50, create a message that's exactly 50 chars
        const exactMessage = 'A'.repeat(50);
        const result = createAdminMessageBox(exactMessage);
        expect(result).toContain(exactMessage);
      });

      it('should handle very long single word', () => {
        const longWord = 'supercalifragilisticexpialidocious';
        const result = createAdminMessageBox(longWord);
        expect(result).toContain(longWord);
      });

      it('should handle message with multiple spaces between words', () => {
        const message = 'Hello    world';
        const result = createAdminMessageBox(message);
        // Multiple spaces will be split and rejoined with single spaces
        expect(result).toContain('Hello');
        expect(result).toContain('world');
      });

      it('should handle unicode characters in message', () => {
        const message = 'Hello 世界! 🎮 Ñoño';
        const result = createAdminMessageBox(message);
        expect(result).toContain('Hello');
        expect(result).toContain('世界');
        expect(result).toContain('🎮');
        expect(result).toContain('Ñoño');
      });

      it('should handle message with special characters', () => {
        const message = 'Test @#$%^&*()!';
        const result = createAdminMessageBox(message);
        expect(result).toContain('@#$%^&*()!');
      });

      it('should handle message with newline characters in input', () => {
        // The function splits by space, so newlines become part of words
        const message = 'Line1\nLine2';
        const result = createAdminMessageBox(message);
        expect(result).toContain('Line1\nLine2');
      });
    });

    describe('padding and alignment', () => {
      it('should have consistent box width for short messages', () => {
        const result = createAdminMessageBox('Hi');
        const lines = result.split('\r\n').filter((line) => line.length > 0);

        // All lines should have similar visual structure
        const topBorder = lines.find((line) => line.includes(topLeft));
        const bottomBorder = lines.find((line) => line.includes(bottomLeft));

        expect(topBorder).toBeDefined();
        expect(bottomBorder).toBeDefined();
      });

      it('should expand box width for long content', () => {
        const shortResult = createAdminMessageBox('Hi');
        const longResult = createAdminMessageBox('This is a much longer single line message here');

        // Long result should have wider box (more horizontal characters)
        const shortHorizontalCount = (shortResult.match(/═/g) || []).length;
        const longHorizontalCount = (longResult.match(/═/g) || []).length;

        expect(longHorizontalCount).toBeGreaterThan(shortHorizontalCount);
      });

      it('should have minimum width based on header length', () => {
        const result = createAdminMessageBox('X');
        // Box should be at least as wide as "MESSAGE FROM ADMIN:" + padding
        expect(result).toContain('MESSAGE FROM ADMIN:');
        // The header should fit within the box
        const headerLine = result
          .split('\r\n')
          .find((line) => line.includes('MESSAGE FROM ADMIN:'));
        expect(headerLine).toBeDefined();
      });
    });

    describe('word wrapping logic', () => {
      it('should not break words in the middle', () => {
        const message = 'Hello wonderful amazing beautiful world today';
        const result = createAdminMessageBox(message);

        // Each word should appear intact
        expect(result).toContain('Hello');
        expect(result).toContain('wonderful');
        expect(result).toContain('amazing');
        expect(result).toContain('beautiful');
        expect(result).toContain('world');
        expect(result).toContain('today');
      });

      it('should handle words at boundary of maxLineLength', () => {
        // Create message where adding next word would exceed limit
        const message = 'A'.repeat(45) + ' ' + 'B'.repeat(10);
        const result = createAdminMessageBox(message);

        expect(result).toContain('A'.repeat(45));
        expect(result).toContain('B'.repeat(10));
      });
    });
  });

  describe('createSystemMessageBox', () => {
    describe('box structure', () => {
      it('should start with a newline', () => {
        const result = createSystemMessageBox('Test');
        expect(result.startsWith('\r\n')).toBe(true);
      });

      it('should end with a newline', () => {
        const result = createSystemMessageBox('Test');
        expect(result.endsWith('\r\n')).toBe(true);
      });

      it('should contain top-left corner', () => {
        const result = createSystemMessageBox('Test');
        expect(result).toContain(topLeft);
      });

      it('should contain top-right corner', () => {
        const result = createSystemMessageBox('Test');
        expect(result).toContain(topRight);
      });

      it('should contain bottom-left corner', () => {
        const result = createSystemMessageBox('Test');
        expect(result).toContain(bottomLeft);
      });

      it('should contain bottom-right corner', () => {
        const result = createSystemMessageBox('Test');
        expect(result).toContain(bottomRight);
      });

      it('should contain horizontal borders', () => {
        const result = createSystemMessageBox('Test');
        expect(result).toContain(horizontal);
      });

      it('should contain vertical borders', () => {
        const result = createSystemMessageBox('Test');
        expect(result).toContain(vertical);
      });

      it('should contain "SYSTEM MESSAGE:" header', () => {
        const result = createSystemMessageBox('Test');
        expect(result).toContain('SYSTEM MESSAGE:');
      });

      it('should use \\r\\n line endings throughout', () => {
        const result = createSystemMessageBox('Test message');
        const lines = result.split('\r\n');
        expect(lines.length).toBeGreaterThan(5);
      });
    });

    describe('ANSI colors', () => {
      it('should use cyan color code', () => {
        const result = createSystemMessageBox('Test');
        expect(result).toContain(cyan);
      });

      it('should include reset codes', () => {
        const result = createSystemMessageBox('Test');
        expect(result).toContain(reset);
      });

      it('should not use magenta color code', () => {
        const result = createSystemMessageBox('Test');
        expect(result).not.toContain(magenta);
      });
    });

    describe('message handling', () => {
      it('should handle empty message', () => {
        const result = createSystemMessageBox('');
        expect(result).toContain('SYSTEM MESSAGE:');
        expect(result).toContain(topLeft);
        expect(result).toContain(bottomRight);
      });

      it('should handle single word message', () => {
        const result = createSystemMessageBox('Alert');
        expect(result).toContain('Alert');
      });

      it('should handle short message that fits on one line', () => {
        const result = createSystemMessageBox('Server restarting soon');
        expect(result).toContain('Server restarting soon');
      });

      it('should wrap long message to multiple lines', () => {
        const longMessage =
          'The server will be undergoing maintenance in approximately thirty minutes please save your progress and log out safely before then';
        const result = createSystemMessageBox(longMessage);

        const lines = result.split('\r\n');
        const contentLines = lines.filter(
          (line) =>
            line.includes(vertical) &&
            !line.includes('SYSTEM MESSAGE:') &&
            !line.includes(horizontal.repeat(3)) &&
            !line.includes(topLeft) &&
            !line.includes(bottomLeft)
        );
        expect(contentLines.length).toBeGreaterThan(1);
      });

      it('should handle message with exactly maxLineLength characters', () => {
        const exactMessage = 'B'.repeat(50);
        const result = createSystemMessageBox(exactMessage);
        expect(result).toContain(exactMessage);
      });

      it('should handle very long single word', () => {
        const longWord = 'pneumonoultramicroscopicsilicovolcanoconiosis';
        const result = createSystemMessageBox(longWord);
        expect(result).toContain(longWord);
      });

      it('should handle message with multiple spaces between words', () => {
        const message = 'System    maintenance    scheduled';
        const result = createSystemMessageBox(message);
        expect(result).toContain('System');
        expect(result).toContain('maintenance');
        expect(result).toContain('scheduled');
      });

      it('should handle unicode characters in message', () => {
        const message = 'Alerta: 日本語 ✓ Ελληνικά';
        const result = createSystemMessageBox(message);
        expect(result).toContain('Alerta:');
        expect(result).toContain('日本語');
        expect(result).toContain('✓');
        expect(result).toContain('Ελληνικά');
      });

      it('should handle message with special characters', () => {
        const message = 'Error: [500] - Connection failed!';
        const result = createSystemMessageBox(message);
        expect(result).toContain('[500]');
        expect(result).toContain('Connection');
        expect(result).toContain('failed!');
      });

      it('should handle message with tabs', () => {
        const message = 'Tab\there';
        const result = createSystemMessageBox(message);
        expect(result).toContain('Tab\there');
      });
    });

    describe('padding and alignment', () => {
      it('should have consistent box width for short messages', () => {
        const result = createSystemMessageBox('OK');
        const lines = result.split('\r\n').filter((line) => line.length > 0);

        const topBorder = lines.find((line) => line.includes(topLeft));
        const bottomBorder = lines.find((line) => line.includes(bottomLeft));

        expect(topBorder).toBeDefined();
        expect(bottomBorder).toBeDefined();
      });

      it('should expand box width for long content', () => {
        const shortResult = createSystemMessageBox('OK');
        const longResult = createSystemMessageBox(
          'This is a much longer single line system message'
        );

        const shortHorizontalCount = (shortResult.match(/═/g) || []).length;
        const longHorizontalCount = (longResult.match(/═/g) || []).length;

        expect(longHorizontalCount).toBeGreaterThan(shortHorizontalCount);
      });

      it('should have minimum width based on header length', () => {
        const result = createSystemMessageBox('Y');
        expect(result).toContain('SYSTEM MESSAGE:');
        const headerLine = result.split('\r\n').find((line) => line.includes('SYSTEM MESSAGE:'));
        expect(headerLine).toBeDefined();
      });
    });

    describe('word wrapping logic', () => {
      it('should not break words in the middle', () => {
        const message = 'Server maintenance scheduled tonight';
        const result = createSystemMessageBox(message);

        expect(result).toContain('Server');
        expect(result).toContain('maintenance');
        expect(result).toContain('scheduled');
        expect(result).toContain('tonight');
      });

      it('should handle words at boundary of maxLineLength', () => {
        const message = 'C'.repeat(48) + ' ' + 'D'.repeat(8);
        const result = createSystemMessageBox(message);

        expect(result).toContain('C'.repeat(48));
        expect(result).toContain('D'.repeat(8));
      });
    });
  });

  describe('comparison between admin and system boxes', () => {
    const testMessage = 'This is a test message';

    it('should have different color codes', () => {
      const adminResult = createAdminMessageBox(testMessage);
      const systemResult = createSystemMessageBox(testMessage);

      expect(adminResult).toContain(magenta);
      expect(adminResult).not.toContain(cyan);
      expect(systemResult).toContain(cyan);
      expect(systemResult).not.toContain(magenta);
    });

    it('should have different headers', () => {
      const adminResult = createAdminMessageBox(testMessage);
      const systemResult = createSystemMessageBox(testMessage);

      expect(adminResult).toContain('MESSAGE FROM ADMIN:');
      expect(adminResult).not.toContain('SYSTEM MESSAGE:');
      expect(systemResult).toContain('SYSTEM MESSAGE:');
      expect(systemResult).not.toContain('MESSAGE FROM ADMIN:');
    });

    it('should have same box structure characters', () => {
      const adminResult = createAdminMessageBox(testMessage);
      const systemResult = createSystemMessageBox(testMessage);

      // Both should use same box drawing characters
      expect(adminResult).toContain(topLeft);
      expect(systemResult).toContain(topLeft);
      expect(adminResult).toContain(bottomRight);
      expect(systemResult).toContain(bottomRight);
    });

    it('should both contain the message content', () => {
      const adminResult = createAdminMessageBox(testMessage);
      const systemResult = createSystemMessageBox(testMessage);

      expect(adminResult).toContain(testMessage);
      expect(systemResult).toContain(testMessage);
    });

    it('should both use \\r\\n line endings', () => {
      const adminResult = createAdminMessageBox(testMessage);
      const systemResult = createSystemMessageBox(testMessage);

      expect(adminResult.includes('\r\n')).toBe(true);
      expect(systemResult.includes('\r\n')).toBe(true);
      // Should not have bare \n without \r
      const adminWithoutCRLF = adminResult.replace(/\r\n/g, '');
      const systemWithoutCRLF = systemResult.replace(/\r\n/g, '');
      expect(adminWithoutCRLF.includes('\n')).toBe(false);
      expect(systemWithoutCRLF.includes('\n')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle message with only spaces', () => {
      const adminResult = createAdminMessageBox('     ');
      const systemResult = createSystemMessageBox('     ');

      // Should still create valid boxes
      expect(adminResult).toContain(topLeft);
      expect(systemResult).toContain(topLeft);
    });

    it('should handle message with leading spaces', () => {
      const result = createAdminMessageBox('   Hello');
      expect(result).toContain('Hello');
    });

    it('should handle message with trailing spaces', () => {
      const result = createAdminMessageBox('Hello   ');
      expect(result).toContain('Hello');
    });

    it('should handle numeric message', () => {
      const result = createSystemMessageBox('12345');
      expect(result).toContain('12345');
    });

    it('should handle message with only special characters', () => {
      const result = createAdminMessageBox('!@#$%');
      expect(result).toContain('!@#$%');
    });

    it('should handle very short message (single character)', () => {
      const result = createSystemMessageBox('X');
      expect(result).toContain('X');
      expect(result).toContain('SYSTEM MESSAGE:');
    });

    it('should handle message with ANSI codes already present', () => {
      const messageWithCodes = '\x1b[31mRed text\x1b[0m';
      const result = createAdminMessageBox(messageWithCodes);
      expect(result).toContain(messageWithCodes);
    });

    it('should handle message that exactly fills multiple lines', () => {
      // Create a message that splits into exactly 2 lines
      const word1 = 'A'.repeat(25);
      const word2 = 'B'.repeat(25);
      const word3 = 'C'.repeat(25);
      const word4 = 'D'.repeat(25);
      const message = `${word1} ${word2} ${word3} ${word4}`;
      const result = createAdminMessageBox(message);

      expect(result).toContain(word1);
      expect(result).toContain(word2);
      expect(result).toContain(word3);
      expect(result).toContain(word4);
    });
  });
});
