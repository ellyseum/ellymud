import { RulesetRegistry, RulesetValidationError } from './rulesetRegistry';
import { defaultFantasyRulesetConfig } from './defaultFantasyRulesetConfig';
import { NO_RESOURCE } from './resourceTypes';

describe('RulesetRegistry resource pools', () => {
  beforeEach(() => RulesetRegistry.resetForTesting());

  it('loads the seven default fantasy pools', () => {
    const reg = RulesetRegistry.getInstance();
    reg.loadConfig(defaultFantasyRulesetConfig);
    const pools = reg.getResourcePools();
    expect(pools.map((p) => p.id).sort()).toEqual(
      ['energy', 'holy', 'ki', 'mana', 'nature', 'rage'].sort()
    );
  });

  it('looks up a pool by id', () => {
    const reg = RulesetRegistry.getInstance();
    reg.loadConfig(defaultFantasyRulesetConfig);
    const mana = reg.getResourcePool('mana');
    expect(mana?.abbreviation).toBe('MP');
    expect(reg.getResourcePool('nope')).toBeUndefined();
  });

  it('hasResourcePool accepts the no-resource sentinel', () => {
    const reg = RulesetRegistry.getInstance();
    reg.loadConfig(defaultFantasyRulesetConfig);
    expect(reg.hasResourcePool(NO_RESOURCE)).toBe(true);
    expect(reg.hasResourcePool('mana')).toBe(true);
    expect(reg.hasResourcePool('nope')).toBe(false);
  });

  it('rejects a pool whose id is the no-resource sentinel', () => {
    expect(() =>
      RulesetRegistry.getInstance().loadConfig({
        stats: defaultFantasyRulesetConfig.stats,
        resourcePools: [
          {
            id: NO_RESOURCE,
            displayName: 'None',
            abbreviation: 'NA',
            sizing: { kind: 'fixed', value: 0 },
            regen: {},
          },
        ],
      })
    ).toThrow(RulesetValidationError);
  });

  it('rejects duplicate pool ids', () => {
    expect(() =>
      RulesetRegistry.getInstance().loadConfig({
        stats: defaultFantasyRulesetConfig.stats,
        resourcePools: [
          {
            id: 'foo',
            displayName: 'Foo',
            abbreviation: 'FO',
            sizing: { kind: 'fixed', value: 1 },
            regen: {},
          },
          {
            id: 'foo',
            displayName: 'Foo2',
            abbreviation: 'FO',
            sizing: { kind: 'fixed', value: 2 },
            regen: {},
          },
        ],
      })
    ).toThrow(/duplicate/);
  });

  it('rejects malformed pool id', () => {
    expect(() =>
      RulesetRegistry.getInstance().loadConfig({
        stats: defaultFantasyRulesetConfig.stats,
        resourcePools: [
          {
            id: 'BadCase',
            displayName: 'X',
            abbreviation: 'X',
            sizing: { kind: 'fixed', value: 1 },
            regen: {},
          },
        ],
      })
    ).toThrow(/must match/);
  });
});
