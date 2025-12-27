import { colorizeItemName, stripColorCodes } from './itemNameColorizer';
import { colorize } from './colors';
import { ItemInstance } from '../types';

// Mock the colors module
jest.mock('./colors', () => ({
  colorize: jest.fn((text: string, color: string) => `[${color}]${text}[/]`),
}));

const mockColorize = colorize as jest.MockedFunction<typeof colorize>;

describe('itemNameColorizer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('colorizeItemName', () => {
    describe('empty/null/undefined input handling', () => {
      it('should return empty string for empty name', () => {
        const result = colorizeItemName('');
        expect(result).toBe('');
      });

      it('should return empty string for null name', () => {
        const result = colorizeItemName(null as unknown as string);
        expect(result).toBe('');
      });

      it('should return empty string for undefined name', () => {
        const result = colorizeItemName(undefined as unknown as string);
        expect(result).toBe('');
      });
    });

    describe('name without color codes', () => {
      it('should colorize entire name with default white color', () => {
        colorizeItemName('Iron Sword');
        expect(mockColorize).toHaveBeenCalledWith('Iron Sword', 'white');
      });

      it('should colorize entire name with specified default color', () => {
        colorizeItemName('Iron Sword', 'blue');
        expect(mockColorize).toHaveBeenCalledWith('Iron Sword', 'blue');
      });
    });

    describe('single color code handling', () => {
      it('should handle color code at the beginning', () => {
        const result = colorizeItemName('$rFire Sword');

        // Should colorize "Fire Sword" with red
        expect(mockColorize).toHaveBeenCalledWith('Fire Sword', 'red');
        expect(result).toBe('[red]Fire Sword[/]');
      });

      it('should handle color code in the middle', () => {
        const result = colorizeItemName('Iron $rSword');

        // "Iron " should be colorized with default (white)
        // "Sword" should be colorized with red
        expect(mockColorize).toHaveBeenCalledWith('Iron ', 'white');
        expect(mockColorize).toHaveBeenCalledWith('Sword', 'red');
        expect(result).toBe('[white]Iron [/][red]Sword[/]');
      });

      it('should handle color code at the end', () => {
        colorizeItemName('Iron Sword$r');

        // "Iron Sword" should be colorized with default (white)
        // Empty remaining text after $r
        expect(mockColorize).toHaveBeenCalledWith('Iron Sword', 'white');
        expect(mockColorize).toHaveBeenCalledWith('', 'red');
      });
    });

    describe('multiple color codes', () => {
      it('should handle multiple color codes in sequence', () => {
        colorizeItemName('$rFire $bIce $gNature');

        expect(mockColorize).toHaveBeenCalledWith('Fire ', 'red');
        expect(mockColorize).toHaveBeenCalledWith('Ice ', 'blue');
        expect(mockColorize).toHaveBeenCalledWith('Nature', 'green');
      });

      it('should handle text before first color code with default color', () => {
        colorizeItemName('The $rFire $bSword');

        expect(mockColorize).toHaveBeenCalledWith('The ', 'white');
        expect(mockColorize).toHaveBeenCalledWith('Fire ', 'red');
        expect(mockColorize).toHaveBeenCalledWith('Sword', 'blue');
      });

      it('should handle adjacent color codes', () => {
        colorizeItemName('$r$bBlue Text');

        // When color codes are adjacent, only the last color is used for the following text
        // The implementation doesn't output empty strings for intermediate color codes
        expect(mockColorize).toHaveBeenCalledWith('Blue Text', 'blue');
        expect(mockColorize).toHaveBeenCalledTimes(1);
      });
    });

    describe('all lowercase color codes', () => {
      const lowercaseColorMappings = [
        { code: 'k', color: 'black' },
        { code: 'r', color: 'red' },
        { code: 'g', color: 'green' },
        { code: 'y', color: 'yellow' },
        { code: 'b', color: 'blue' },
        { code: 'm', color: 'magenta' },
        { code: 'c', color: 'cyan' },
        { code: 'w', color: 'white' },
        { code: 'a', color: 'gray' },
      ];

      lowercaseColorMappings.forEach(({ code, color }) => {
        it(`should map $${code} to ${color}`, () => {
          colorizeItemName(`$${code}Test`);
          expect(mockColorize).toHaveBeenCalledWith('Test', color);
        });
      });
    });

    describe('all uppercase color codes', () => {
      const uppercaseColorMappings = [
        { code: 'K', color: 'brightblack' },
        { code: 'R', color: 'brightred' },
        { code: 'G', color: 'brightgreen' },
        { code: 'Y', color: 'brightyellow' },
        { code: 'B', color: 'brightblue' },
        { code: 'M', color: 'brightmagenta' },
        { code: 'C', color: 'brightcyan' },
        { code: 'W', color: 'brightwhite' },
        { code: 'A', color: 'brightgray' },
      ];

      uppercaseColorMappings.forEach(({ code, color }) => {
        it(`should map $${code} to ${color}`, () => {
          colorizeItemName(`$${code}Test`);
          expect(mockColorize).toHaveBeenCalledWith('Test', color);
        });
      });
    });

    describe('quality-based coloring', () => {
      type QualityType = 'poor' | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

      const createMockInstance = (quality?: QualityType): ItemInstance => ({
        instanceId: 'test-instance-1',
        templateId: 'item-template-1',
        created: new Date(),
        createdBy: 'test',
        properties: quality ? { quality } : undefined,
      });

      it('should use gray for poor quality items', () => {
        const instance = createMockInstance('poor');
        colorizeItemName('Broken Sword', 'white', instance);
        expect(mockColorize).toHaveBeenCalledWith('Broken Sword', 'gray');
      });

      it('should use brightgray for common quality items', () => {
        const instance = createMockInstance('common');
        colorizeItemName('Iron Sword', 'white', instance);
        expect(mockColorize).toHaveBeenCalledWith('Iron Sword', 'brightgray');
      });

      it('should use cyan for uncommon quality items', () => {
        const instance = createMockInstance('uncommon');
        colorizeItemName('Fine Sword', 'white', instance);
        expect(mockColorize).toHaveBeenCalledWith('Fine Sword', 'cyan');
      });

      it('should use blue for rare quality items', () => {
        const instance = createMockInstance('rare');
        colorizeItemName('Rare Sword', 'white', instance);
        expect(mockColorize).toHaveBeenCalledWith('Rare Sword', 'blue');
      });

      it('should use magenta for epic quality items', () => {
        const instance = createMockInstance('epic');
        colorizeItemName('Epic Sword', 'white', instance);
        expect(mockColorize).toHaveBeenCalledWith('Epic Sword', 'magenta');
      });

      it('should use yellow for legendary quality items', () => {
        const instance = createMockInstance('legendary');
        colorizeItemName('Legendary Sword', 'white', instance);
        expect(mockColorize).toHaveBeenCalledWith('Legendary Sword', 'yellow');
      });

      it('should use default color when instance has no quality property', () => {
        const instance = createMockInstance();
        colorizeItemName('Plain Sword', 'red', instance);
        expect(mockColorize).toHaveBeenCalledWith('Plain Sword', 'red');
      });

      it('should use default color when instance has unknown quality', () => {
        const instance: ItemInstance = {
          instanceId: 'test-instance-1',
          templateId: 'item-template-1',
          created: new Date(),
          createdBy: 'test',
          properties: { quality: 'mythical' as unknown as 'common' },
        };
        colorizeItemName('Mythical Sword', 'green', instance);
        expect(mockColorize).toHaveBeenCalledWith('Mythical Sword', 'green');
      });

      it('should use default color when instance has no properties', () => {
        const instance: ItemInstance = {
          instanceId: 'test-instance-1',
          templateId: 'item-template-1',
          created: new Date(),
          createdBy: 'test',
        };
        colorizeItemName('Sword', 'cyan', instance);
        expect(mockColorize).toHaveBeenCalledWith('Sword', 'cyan');
      });

      it('should apply quality color as default but allow color codes to override', () => {
        const instance = createMockInstance('rare');
        colorizeItemName('The $rFlaming Sword', 'white', instance);

        // "The " should use quality-based color (blue for rare)
        expect(mockColorize).toHaveBeenCalledWith('The ', 'blue');
        // "Flaming Sword" should use red from color code
        expect(mockColorize).toHaveBeenCalledWith('Flaming Sword', 'red');
      });
    });

    describe('edge cases', () => {
      it('should handle color code followed by nothing', () => {
        colorizeItemName('Sword$r');
        expect(mockColorize).toHaveBeenCalledWith('Sword', 'white');
        expect(mockColorize).toHaveBeenCalledWith('', 'red');
      });

      it('should handle multiple adjacent color codes at start', () => {
        colorizeItemName('$r$g$bBlue');
        // When multiple adjacent color codes exist at start, only the last one's color is applied
        expect(mockColorize).toHaveBeenCalledWith('Blue', 'blue');
        expect(mockColorize).toHaveBeenCalledTimes(1);
      });

      it('should handle only color codes with no text', () => {
        colorizeItemName('$r$g$b');
        // With only color codes and no text, only the final colorize is called with empty string
        expect(mockColorize).toHaveBeenCalledWith('', 'blue');
        expect(mockColorize).toHaveBeenCalledTimes(1);
      });

      it('should preserve spaces in the name', () => {
        colorizeItemName('$rSword   of   Fire');
        expect(mockColorize).toHaveBeenCalledWith('Sword   of   Fire', 'red');
      });

      it('should handle special characters in name', () => {
        colorizeItemName('$rSword [+5]');
        expect(mockColorize).toHaveBeenCalledWith('Sword [+5]', 'red');
      });

      it('should handle mixed color codes and text', () => {
        colorizeItemName('A $rRed $gGreen $bBlue Z');
        expect(mockColorize).toHaveBeenCalledWith('A ', 'white');
        expect(mockColorize).toHaveBeenCalledWith('Red ', 'red');
        expect(mockColorize).toHaveBeenCalledWith('Green ', 'green');
        expect(mockColorize).toHaveBeenCalledWith('Blue Z', 'blue');
      });
    });

    describe('invalid color codes', () => {
      it('should treat $ followed by invalid letter as regular text', () => {
        // The regex only matches valid color codes, so $x, $z etc. are ignored
        // and the text is colorized as normal
        colorizeItemName('$xInvalid Code');
        // Since $x is not in COLOR_MAP, it won't be matched
        // The entire string is treated as having no color codes
        expect(mockColorize).toHaveBeenCalledWith('$xInvalid Code', 'white');
      });

      it('should handle $ followed by number as regular text', () => {
        colorizeItemName('$1Price: $100');
        expect(mockColorize).toHaveBeenCalledWith('$1Price: $100', 'white');
      });

      it('should handle standalone $ as regular text', () => {
        colorizeItemName('Price: $50 $rGold');
        expect(mockColorize).toHaveBeenCalledWith('Price: $50 ', 'white');
        expect(mockColorize).toHaveBeenCalledWith('Gold', 'red');
      });
    });

    describe('return value format', () => {
      it('should return concatenated colorized segments', () => {
        const result = colorizeItemName('$rRed $bBlue');
        expect(result).toBe('[red]Red [/][blue]Blue[/]');
      });

      it('should return single colorized segment for no color codes', () => {
        const result = colorizeItemName('Plain Text');
        expect(result).toBe('[white]Plain Text[/]');
      });
    });
  });

  describe('stripColorCodes', () => {
    describe('empty/null/undefined input handling', () => {
      it('should return empty string for empty input', () => {
        expect(stripColorCodes('')).toBe('');
      });

      it('should return empty string for null input', () => {
        expect(stripColorCodes(null as unknown as string)).toBe('');
      });

      it('should return empty string for undefined input', () => {
        expect(stripColorCodes(undefined as unknown as string)).toBe('');
      });
    });

    describe('text without color codes', () => {
      it('should return the same text', () => {
        expect(stripColorCodes('Plain Sword')).toBe('Plain Sword');
      });

      it('should preserve spaces', () => {
        expect(stripColorCodes('Iron   Sword')).toBe('Iron   Sword');
      });

      it('should preserve special characters', () => {
        expect(stripColorCodes('Sword [+5]')).toBe('Sword [+5]');
      });
    });

    describe('stripping lowercase color codes', () => {
      it('should strip $k (black)', () => {
        expect(stripColorCodes('$kDark Sword')).toBe('Dark Sword');
      });

      it('should strip $r (red)', () => {
        expect(stripColorCodes('$rFire Sword')).toBe('Fire Sword');
      });

      it('should strip $g (green)', () => {
        expect(stripColorCodes('$gNature Staff')).toBe('Nature Staff');
      });

      it('should strip $y (yellow)', () => {
        expect(stripColorCodes('$yGold Ring')).toBe('Gold Ring');
      });

      it('should strip $b (blue)', () => {
        expect(stripColorCodes('$bIce Wand')).toBe('Ice Wand');
      });

      it('should strip $m (magenta)', () => {
        expect(stripColorCodes('$mMagic Orb')).toBe('Magic Orb');
      });

      it('should strip $c (cyan)', () => {
        expect(stripColorCodes('$cCrystal')).toBe('Crystal');
      });

      it('should strip $w (white)', () => {
        expect(stripColorCodes('$wBright Light')).toBe('Bright Light');
      });

      it('should strip $a (gray)', () => {
        expect(stripColorCodes('$aStone')).toBe('Stone');
      });
    });

    describe('stripping uppercase color codes', () => {
      it('should strip $K (brightblack)', () => {
        expect(stripColorCodes('$KShadow')).toBe('Shadow');
      });

      it('should strip $R (brightred)', () => {
        expect(stripColorCodes('$RCrimson')).toBe('Crimson');
      });

      it('should strip $G (brightgreen)', () => {
        expect(stripColorCodes('$GEmerald')).toBe('Emerald');
      });

      it('should strip $Y (brightyellow)', () => {
        expect(stripColorCodes('$YGolden')).toBe('Golden');
      });

      it('should strip $B (brightblue)', () => {
        expect(stripColorCodes('$BSapphire')).toBe('Sapphire');
      });

      it('should strip $M (brightmagenta)', () => {
        expect(stripColorCodes('$MAmethyst')).toBe('Amethyst');
      });

      it('should strip $C (brightcyan)', () => {
        expect(stripColorCodes('$CAqua')).toBe('Aqua');
      });

      it('should strip $W (brightwhite)', () => {
        expect(stripColorCodes('$WRadiant')).toBe('Radiant');
      });

      it('should strip $A (brightgray)', () => {
        expect(stripColorCodes('$ASilver')).toBe('Silver');
      });
    });

    describe('stripping multiple color codes', () => {
      it('should strip multiple color codes from name', () => {
        expect(stripColorCodes('$rFire $bIce $gNature')).toBe('Fire Ice Nature');
      });

      it('should strip adjacent color codes', () => {
        expect(stripColorCodes('$r$b$gMulti Color')).toBe('Multi Color');
      });

      it('should strip color codes at beginning and middle', () => {
        expect(stripColorCodes('$rThe $bMighty $gSword')).toBe('The Mighty Sword');
      });

      it('should strip color codes at the end', () => {
        expect(stripColorCodes('Sword$r')).toBe('Sword');
      });
    });

    describe('mixed content handling', () => {
      it('should preserve $ followed by invalid characters', () => {
        expect(stripColorCodes('$xNot a code')).toBe('$xNot a code');
      });

      it('should preserve $ followed by numbers', () => {
        expect(stripColorCodes('Price: $100')).toBe('Price: $100');
      });

      it('should strip valid codes but preserve invalid ones', () => {
        expect(stripColorCodes('$rRed $xInvalid $bBlue')).toBe('Red $xInvalid Blue');
      });

      it('should handle standalone $ correctly', () => {
        expect(stripColorCodes('Cost: $ 50 $rGold')).toBe('Cost: $ 50 Gold');
      });
    });
  });
});
