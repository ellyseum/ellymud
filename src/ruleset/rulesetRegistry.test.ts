import { RulesetRegistry, RulesetValidationError } from './rulesetRegistry';
import { defaultFantasyRulesetConfig } from './defaultFantasyRulesetConfig';
import { RESERVED_STAT_IDS } from './reservedStatIds';

describe('RulesetRegistry', () => {
  beforeEach(() => RulesetRegistry.resetForTesting());

  it('starts unloaded', () => {
    expect(RulesetRegistry.getInstance().isLoaded()).toBe(false);
  });

  it('loads the default fantasy ruleset without error', () => {
    const reg = RulesetRegistry.getInstance();
    reg.loadConfig(defaultFantasyRulesetConfig);
    expect(reg.isLoaded()).toBe(true);
    expect(reg.getStatIds()).toEqual([
      'strength',
      'dexterity',
      'agility',
      'constitution',
      'intelligence',
      'wisdom',
      'charisma',
    ]);
    expect(reg.getStartingAttributePoints()).toBe(100);
  });

  it('returns stat definitions by id', () => {
    const reg = RulesetRegistry.getInstance();
    reg.loadConfig(defaultFantasyRulesetConfig);
    const str = reg.getStat('strength');
    expect(str?.abbreviation).toBe('STR');
    expect(str?.baseValue).toBe(10);
    expect(reg.getStat('nonexistent')).toBeUndefined();
  });

  describe('validation', () => {
    it('rejects empty stats array', () => {
      expect(() => RulesetRegistry.getInstance().loadConfig({ stats: [] })).toThrow(
        RulesetValidationError
      );
    });

    it('rejects malformed stat ids', () => {
      expect(() =>
        RulesetRegistry.getInstance().loadConfig({
          stats: [
            {
              id: 'Strength',
              displayName: 'X',
              abbreviation: 'X',
              baseValue: 10,
            },
          ],
        })
      ).toThrow(/must match/);
    });

    it('rejects ids in RESERVED_STAT_IDS', () => {
      expect(() =>
        RulesetRegistry.getInstance().loadConfig({
          stats: [
            {
              id: 'username',
              displayName: 'X',
              abbreviation: 'X',
              baseValue: 10,
            },
          ],
        })
      ).toThrow(/reserved/);
    });

    it('rejects duplicate ids', () => {
      expect(() =>
        RulesetRegistry.getInstance().loadConfig({
          stats: [
            { id: 'foo', displayName: 'F', abbreviation: 'F', baseValue: 1 },
            { id: 'foo', displayName: 'F', abbreviation: 'F', baseValue: 1 },
          ],
        })
      ).toThrow(/duplicate/);
    });

    it('rejects non-finite baseValue', () => {
      expect(() =>
        RulesetRegistry.getInstance().loadConfig({
          stats: [{ id: 'foo', displayName: 'F', abbreviation: 'F', baseValue: NaN }],
        })
      ).toThrow(/baseValue/);
    });

    it('rejects invalid costCurve', () => {
      expect(() =>
        RulesetRegistry.getInstance().loadConfig({
          stats: [
            {
              id: 'foo',
              displayName: 'F',
              abbreviation: 'F',
              baseValue: 1,
              costCurve: 'sigmoid' as 'linear',
            },
          ],
        })
      ).toThrow(/costCurve/);
    });

    it('reports all violations, not just the first', () => {
      try {
        RulesetRegistry.getInstance().loadConfig({
          stats: [{ id: 'BadCase', displayName: '', abbreviation: '', baseValue: NaN }],
        });
        fail('expected validation error');
      } catch (err) {
        expect(err).toBeInstanceOf(RulesetValidationError);
        const ve = err as RulesetValidationError;
        expect(ve.violations.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('does NOT reserve the seven fantasy stat names', () => {
      // Regression guard: the default fantasy ruleset registers these ids, so
      // including them in RESERVED_STAT_IDS would prevent the server from booting.
      for (const id of [
        'strength',
        'dexterity',
        'agility',
        'constitution',
        'intelligence',
        'wisdom',
        'charisma',
      ]) {
        expect(RESERVED_STAT_IDS.has(id)).toBe(false);
      }
    });

    it('rejects negative startingAttributePoints', () => {
      expect(() =>
        RulesetRegistry.getInstance().loadConfig({
          stats: [{ id: 'foo', displayName: 'F', abbreviation: 'F', baseValue: 1 }],
          startingAttributePoints: -5,
        })
      ).toThrow(/startingAttributePoints/);
    });
  });
});
