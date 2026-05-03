import { getStat } from './safeAccess';
import { RulesetRegistry } from './rulesetRegistry';
import { defaultFantasyRulesetConfig } from '../rulesets/fantasy';
import { User } from '../types';

describe('getStat', () => {
  beforeEach(() => {
    RulesetRegistry.resetForTesting();
    RulesetRegistry.getInstance().loadConfig(defaultFantasyRulesetConfig);
  });

  it('reads from the new stats record when present', () => {
    const user = { stats: { strength: 17 } } as unknown as User;
    expect(getStat(user, 'strength')).toBe(17);
  });

  it('falls back to legacy flat field when stats record absent', () => {
    const user = { strength: 14 } as unknown as User;
    expect(getStat(user, 'strength')).toBe(14);
  });

  it('prefers new shape over legacy when both exist', () => {
    const user = {
      stats: { strength: 20 },
      strength: 14,
    } as unknown as User;
    expect(getStat(user, 'strength')).toBe(20);
  });

  it('falls back to schema baseValue when neither shape has the stat', () => {
    const user = {} as User;
    expect(getStat(user, 'strength')).toBe(10);
    expect(getStat(user, 'wisdom')).toBe(10);
  });

  it('returns 0 for unknown stat ids when nothing exists', () => {
    const user = {} as User;
    expect(getStat(user, 'hacking')).toBe(0);
  });

  it('treats NaN as missing and falls back', () => {
    const user = { stats: { strength: NaN } } as unknown as User;
    expect(getStat(user, 'strength')).toBe(10);
  });

  it('treats Infinity as missing and falls back', () => {
    const user = { stats: { strength: Infinity } } as unknown as User;
    expect(getStat(user, 'strength')).toBe(10);
  });

  it('treats string values as missing and falls back', () => {
    const user = {
      stats: { strength: '17' as unknown as number },
    } as unknown as User;
    expect(getStat(user, 'strength')).toBe(10);
  });
});
