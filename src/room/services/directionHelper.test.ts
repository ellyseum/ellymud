import { DirectionHelper } from './directionHelper';

describe('DirectionHelper', () => {
  let helper: DirectionHelper;

  beforeEach(() => {
    helper = new DirectionHelper();
  });

  describe('getOppositeDirection', () => {
    describe('cardinal directions (full names)', () => {
      it('should return south for north', () => {
        expect(helper.getOppositeDirection('north')).toBe('south');
      });

      it('should return north for south', () => {
        expect(helper.getOppositeDirection('south')).toBe('north');
      });

      it('should return west for east', () => {
        expect(helper.getOppositeDirection('east')).toBe('west');
      });

      it('should return east for west', () => {
        expect(helper.getOppositeDirection('west')).toBe('east');
      });
    });

    describe('vertical directions (full names)', () => {
      it('should return below for up', () => {
        expect(helper.getOppositeDirection('up')).toBe('below');
      });

      it('should return above for down', () => {
        expect(helper.getOppositeDirection('down')).toBe('above');
      });
    });

    describe('diagonal directions (full names)', () => {
      it('should return southwest for northeast', () => {
        expect(helper.getOppositeDirection('northeast')).toBe('southwest');
      });

      it('should return southeast for northwest', () => {
        expect(helper.getOppositeDirection('northwest')).toBe('southeast');
      });

      it('should return northwest for southeast', () => {
        expect(helper.getOppositeDirection('southeast')).toBe('northwest');
      });

      it('should return northeast for southwest', () => {
        expect(helper.getOppositeDirection('southwest')).toBe('northeast');
      });
    });

    describe('cardinal direction abbreviations', () => {
      it('should return south for n', () => {
        expect(helper.getOppositeDirection('n')).toBe('south');
      });

      it('should return north for s', () => {
        expect(helper.getOppositeDirection('s')).toBe('north');
      });

      it('should return west for e', () => {
        expect(helper.getOppositeDirection('e')).toBe('west');
      });

      it('should return east for w', () => {
        expect(helper.getOppositeDirection('w')).toBe('east');
      });
    });

    describe('diagonal direction abbreviations', () => {
      it('should return southwest for ne', () => {
        expect(helper.getOppositeDirection('ne')).toBe('southwest');
      });

      it('should return southeast for nw', () => {
        expect(helper.getOppositeDirection('nw')).toBe('southeast');
      });

      it('should return northwest for se', () => {
        expect(helper.getOppositeDirection('se')).toBe('northwest');
      });

      it('should return northeast for sw', () => {
        expect(helper.getOppositeDirection('sw')).toBe('northeast');
      });
    });

    describe('vertical direction abbreviations', () => {
      it('should return below for u', () => {
        expect(helper.getOppositeDirection('u')).toBe('below');
      });

      it('should return above for d', () => {
        expect(helper.getOppositeDirection('d')).toBe('above');
      });
    });

    describe('case insensitivity', () => {
      it('should handle uppercase NORTH', () => {
        expect(helper.getOppositeDirection('NORTH')).toBe('south');
      });

      it('should handle mixed case NoRtH', () => {
        expect(helper.getOppositeDirection('NoRtH')).toBe('south');
      });

      it('should handle uppercase abbreviation N', () => {
        expect(helper.getOppositeDirection('N')).toBe('south');
      });

      it('should handle uppercase NORTHEAST', () => {
        expect(helper.getOppositeDirection('NORTHEAST')).toBe('southwest');
      });

      it('should handle uppercase abbreviation NE', () => {
        expect(helper.getOppositeDirection('NE')).toBe('southwest');
      });

      it('should handle uppercase UP', () => {
        expect(helper.getOppositeDirection('UP')).toBe('below');
      });
    });

    describe('unknown directions', () => {
      it('should return somewhere for empty string', () => {
        expect(helper.getOppositeDirection('')).toBe('somewhere');
      });

      it('should return somewhere for random string', () => {
        expect(helper.getOppositeDirection('random')).toBe('somewhere');
      });

      it('should return somewhere for portal', () => {
        expect(helper.getOppositeDirection('portal')).toBe('somewhere');
      });

      it('should return somewhere for numeric string', () => {
        expect(helper.getOppositeDirection('123')).toBe('somewhere');
      });

      it('should return somewhere for special characters', () => {
        expect(helper.getOppositeDirection('!@#')).toBe('somewhere');
      });

      it('should return somewhere for whitespace', () => {
        expect(helper.getOppositeDirection('   ')).toBe('somewhere');
      });
    });
  });

  describe('getFullDirectionName', () => {
    describe('cardinal direction abbreviations', () => {
      it('should convert n to north', () => {
        expect(helper.getFullDirectionName('n')).toBe('north');
      });

      it('should convert s to south', () => {
        expect(helper.getFullDirectionName('s')).toBe('south');
      });

      it('should convert e to east', () => {
        expect(helper.getFullDirectionName('e')).toBe('east');
      });

      it('should convert w to west', () => {
        expect(helper.getFullDirectionName('w')).toBe('west');
      });
    });

    describe('diagonal direction abbreviations', () => {
      it('should convert ne to northeast', () => {
        expect(helper.getFullDirectionName('ne')).toBe('northeast');
      });

      it('should convert nw to northwest', () => {
        expect(helper.getFullDirectionName('nw')).toBe('northwest');
      });

      it('should convert se to southeast', () => {
        expect(helper.getFullDirectionName('se')).toBe('southeast');
      });

      it('should convert sw to southwest', () => {
        expect(helper.getFullDirectionName('sw')).toBe('southwest');
      });
    });

    describe('vertical direction abbreviations', () => {
      it('should convert u to up', () => {
        expect(helper.getFullDirectionName('u')).toBe('up');
      });

      it('should convert d to down', () => {
        expect(helper.getFullDirectionName('d')).toBe('down');
      });
    });

    describe('full direction names return lowercase', () => {
      it('should return north unchanged (lowercase)', () => {
        expect(helper.getFullDirectionName('north')).toBe('north');
      });

      it('should return south unchanged (lowercase)', () => {
        expect(helper.getFullDirectionName('south')).toBe('south');
      });

      it('should return east unchanged (lowercase)', () => {
        expect(helper.getFullDirectionName('east')).toBe('east');
      });

      it('should return west unchanged (lowercase)', () => {
        expect(helper.getFullDirectionName('west')).toBe('west');
      });

      it('should return northeast unchanged (lowercase)', () => {
        expect(helper.getFullDirectionName('northeast')).toBe('northeast');
      });

      it('should return northwest unchanged (lowercase)', () => {
        expect(helper.getFullDirectionName('northwest')).toBe('northwest');
      });

      it('should return southeast unchanged (lowercase)', () => {
        expect(helper.getFullDirectionName('southeast')).toBe('southeast');
      });

      it('should return southwest unchanged (lowercase)', () => {
        expect(helper.getFullDirectionName('southwest')).toBe('southwest');
      });

      it('should return up unchanged (lowercase)', () => {
        expect(helper.getFullDirectionName('up')).toBe('up');
      });

      it('should return down unchanged (lowercase)', () => {
        expect(helper.getFullDirectionName('down')).toBe('down');
      });
    });

    describe('case insensitivity', () => {
      it('should handle uppercase abbreviation N', () => {
        expect(helper.getFullDirectionName('N')).toBe('north');
      });

      it('should handle uppercase abbreviation NE', () => {
        expect(helper.getFullDirectionName('NE')).toBe('northeast');
      });

      it('should handle uppercase full name NORTH', () => {
        expect(helper.getFullDirectionName('NORTH')).toBe('north');
      });

      it('should handle mixed case NoRtH', () => {
        expect(helper.getFullDirectionName('NoRtH')).toBe('north');
      });

      it('should handle uppercase U', () => {
        expect(helper.getFullDirectionName('U')).toBe('up');
      });
    });

    describe('unknown directions return lowercase', () => {
      it('should return empty string for empty input', () => {
        expect(helper.getFullDirectionName('')).toBe('');
      });

      it('should return lowercase for unknown direction', () => {
        expect(helper.getFullDirectionName('portal')).toBe('portal');
      });

      it('should return lowercase for uppercase unknown', () => {
        expect(helper.getFullDirectionName('PORTAL')).toBe('portal');
      });

      it('should return lowercase for mixed case unknown', () => {
        expect(helper.getFullDirectionName('PoRtAl')).toBe('portal');
      });

      it('should return whitespace unchanged (but lowercase)', () => {
        expect(helper.getFullDirectionName('   ')).toBe('   ');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle all cardinal abbreviations in sequence', () => {
      const abbreviations = ['n', 's', 'e', 'w'];
      const expected = ['north', 'south', 'east', 'west'];
      abbreviations.forEach((abbrev, index) => {
        expect(helper.getFullDirectionName(abbrev)).toBe(expected[index]);
      });
    });

    it('should handle all diagonal abbreviations in sequence', () => {
      const abbreviations = ['ne', 'nw', 'se', 'sw'];
      const expected = ['northeast', 'northwest', 'southeast', 'southwest'];
      abbreviations.forEach((abbrev, index) => {
        expect(helper.getFullDirectionName(abbrev)).toBe(expected[index]);
      });
    });

    it('should handle opposite direction symmetry for full names', () => {
      // Test that getting opposite twice returns original
      const directions = ['north', 'south', 'east', 'west'];
      directions.forEach((dir) => {
        const opposite = helper.getOppositeDirection(dir);
        const backToOriginal = helper.getOppositeDirection(opposite);
        expect(backToOriginal).toBe(dir);
      });
    });

    it('should handle opposite direction symmetry for diagonals', () => {
      const directions = ['northeast', 'northwest', 'southeast', 'southwest'];
      directions.forEach((dir) => {
        const opposite = helper.getOppositeDirection(dir);
        const backToOriginal = helper.getOppositeDirection(opposite);
        expect(backToOriginal).toBe(dir);
      });
    });
  });
});
