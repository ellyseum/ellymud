import { createEffectMetadataHooks } from './effectMetadata';
import { RulesetRegistry } from './rulesetRegistry';
import { defaultFantasyRulesetConfig } from '../rulesets/fantasy';
import { EffectType, StackingBehavior } from '../types/effects';

describe('effect metadata registry', () => {
  beforeEach(() => RulesetRegistry.resetForTesting());

  it('createEffectMetadataHooks builds an immutable bundle from a flat map', () => {
    const hooks = createEffectMetadataHooks({
      overheat: { id: 'overheat', defaultStacking: StackingBehavior.STACK_INTENSITY },
    });
    expect(hooks.listEffectTypes()).toEqual(['overheat']);
    expect(hooks.getMetadata('overheat')?.defaultStacking).toBe(StackingBehavior.STACK_INTENSITY);
    expect(hooks.getMetadata('nonexistent')).toBeUndefined();
  });

  describe('default fantasy bundle', () => {
    beforeEach(() => {
      RulesetRegistry.getInstance().loadConfig(defaultFantasyRulesetConfig);
    });

    it('registers metadata for every historical EffectType', () => {
      const hooks = RulesetRegistry.getInstance().getEffectMetadataHooks();
      expect(hooks).toBeDefined();
      const ids = hooks!.listEffectTypes();
      for (const enumValue of Object.values(EffectType)) {
        expect(ids).toContain(enumValue);
      }
    });

    it('preserves the historical default stacking rules', () => {
      const hooks = RulesetRegistry.getInstance().getEffectMetadataHooks()!;
      // Spot-check a few of the more interesting cases that aren't REFRESH.
      expect(hooks.getMetadata(EffectType.HASTE)?.defaultStacking).toBe(
        StackingBehavior.STRONGEST_WINS
      );
      expect(hooks.getMetadata(EffectType.STEALTH)?.defaultStacking).toBe(StackingBehavior.IGNORE);
      expect(hooks.getMetadata(EffectType.TAUNT)?.defaultStacking).toBe(StackingBehavior.REPLACE);
      expect(hooks.getMetadata(EffectType.BLEED)?.defaultStacking).toBe(
        StackingBehavior.STACK_INTENSITY
      );
      expect(hooks.getMetadata(EffectType.POISON)?.defaultStacking).toBe(StackingBehavior.REFRESH);
    });
  });
});
