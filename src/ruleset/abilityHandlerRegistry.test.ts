import { RulesetRegistry } from './rulesetRegistry';
import { defaultFantasyRulesetConfig } from './defaultFantasyRulesetConfig';
import { createAbilityHooks } from './abilityHandlerTypes';

describe('RulesetRegistry ability hooks', () => {
  beforeEach(() => RulesetRegistry.resetForTesting());

  it('default fantasy config registers an empty ability hook bundle', () => {
    const reg = RulesetRegistry.getInstance();
    reg.loadConfig(defaultFantasyRulesetConfig);
    expect(reg.hasAbilityHooks()).toBe(true);
    const hooks = reg.getAbilityHooks();
    expect(hooks).toBeDefined();
    expect(hooks!.getEffectTypes()).toEqual([]);
    expect(hooks!.getEffectHandler('damage')).toBeUndefined();
  });

  it('a ruleset can register handlers for arbitrary effect-type ids', () => {
    let called = false;
    const reg = RulesetRegistry.getInstance();
    reg.loadConfig({
      ...defaultFantasyRulesetConfig,
      abilityHooks: createAbilityHooks({
        hack: () => {
          called = true;
        },
      }),
    });
    const hooks = reg.getAbilityHooks();
    expect(hooks!.getEffectTypes()).toEqual(['hack']);
    const handler = hooks!.getEffectHandler('hack');
    expect(handler).toBeDefined();
    handler!({
      caster: {} as never,
      target: {} as never,
      ability: {},
      effect: {},
      effectManager: {},
      combatSystem: {},
    });
    expect(called).toBe(true);
  });

  it('returns undefined when no ability hooks are registered', () => {
    const reg = RulesetRegistry.getInstance();
    reg.loadConfig({
      ...defaultFantasyRulesetConfig,
      abilityHooks: undefined,
    });
    expect(reg.hasAbilityHooks()).toBe(false);
    expect(reg.getAbilityHooks()).toBeUndefined();
  });
});
