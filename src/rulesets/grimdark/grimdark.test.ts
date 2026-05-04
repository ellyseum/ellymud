import { RulesetRegistry } from '../../ruleset/rulesetRegistry';
import { listRulesetPlugins, loadActiveRuleset } from '../../ruleset/pluginLoader';
import { defaultFantasyCombatHooks } from '../fantasy/combatHooks';
import { CombatContext } from '../../ruleset/combatTypes';
import { User } from '../../types';

describe('grimdark ruleset plugin', () => {
  let savedEnv: string | undefined;

  beforeEach(() => {
    RulesetRegistry.resetForTesting();
    savedEnv = process.env.RULESET_ID;
    delete process.env.RULESET_ID;
  });

  afterEach(() => {
    if (savedEnv === undefined) delete process.env.RULESET_ID;
    else process.env.RULESET_ID = savedEnv;
  });

  describe('plugin registration', () => {
    it('appears in the built-in plugin list', () => {
      const ids = listRulesetPlugins().map((p) => p.id);
      expect(ids).toContain('grimdark');
    });

    it('loads via loadActiveRuleset by id', () => {
      const plugin = loadActiveRuleset('grimdark');
      expect(plugin.id).toBe('grimdark');
      expect(plugin.name).toBe('Grimdark');
      expect(RulesetRegistry.getInstance().isLoaded()).toBe(true);
    });

    it('respects RULESET_ID env var', () => {
      process.env.RULESET_ID = 'grimdark';
      const plugin = loadActiveRuleset();
      expect(plugin.id).toBe('grimdark');
    });
  });

  describe('differentiation from fantasy', () => {
    beforeEach(() => loadActiveRuleset('grimdark'));

    it('renames stat display names', () => {
      const reg = RulesetRegistry.getInstance();
      const strength = reg.getStat('strength');
      expect(strength?.displayName).toBe('Power');
      expect(strength?.abbreviation).toBe('PWR');
      expect(reg.getStat('wisdom')?.displayName).toBe('Insight');
    });

    it('renames the mana pool to Will', () => {
      const reg = RulesetRegistry.getInstance();
      expect(reg.getResourcePool('mana')?.displayName).toBe('Will');
      expect(reg.getResourcePool('mana')?.abbreviation).toBe('WL');
    });

    it('starts characters with 75 attribute points instead of 100', () => {
      expect(RulesetRegistry.getInstance().getStartingAttributePoints()).toBe(75);
    });

    it('uses a 1.7^(level-1) XP curve', () => {
      const hooks = RulesetRegistry.getInstance().getProgressionHooks();
      expect(hooks).toBeDefined();
      expect(hooks!.expRequiredForLevel(1)).toBe(1000);
      // 1000 * 1.7^4 = 8352.1 -> floor = 8352
      expect(hooks!.expRequiredForLevel(5)).toBe(8352);
    });

    it('reduces hit chance to ~85% of fantasy values', () => {
      const ctx: CombatContext = {
        attacker: {
          stats: { dexterity: 30 },
          level: 5,
        } as unknown as User,
        defender: {
          stats: { agility: 10 },
        } as unknown as User,
        attackerLevel: 5,
        defenderLevel: 5,
        weaponDamageRange: { min: 5, max: 10 },
        attackKind: 'player-melee',
      };
      const fantasyHit = defaultFantasyCombatHooks.hitChance(ctx);
      const grimdarkHit = RulesetRegistry.getInstance().getCombatHooks().hitChance(ctx);
      expect(grimdarkHit).toBe(Math.floor(fantasyHit * 0.85));
    });
  });

  describe('non-interference with default fantasy boot', () => {
    it('default loadActiveRuleset() (no env, no arg) still picks fantasy', () => {
      const plugin = loadActiveRuleset();
      expect(plugin.id).toBe('fantasy');
    });
  });
});
