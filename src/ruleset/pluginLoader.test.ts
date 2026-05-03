import { listRulesetPlugins, getRulesetPlugin, loadActiveRuleset } from './pluginLoader';
import { RulesetRegistry } from './rulesetRegistry';

describe('pluginLoader', () => {
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

  it('lists at least the built-in fantasy plugin', () => {
    const plugins = listRulesetPlugins();
    expect(plugins.length).toBeGreaterThanOrEqual(1);
    expect(plugins[0].id).toBe('fantasy');
  });

  it('looks up a plugin by id', () => {
    const fantasy = getRulesetPlugin('fantasy');
    expect(fantasy?.name).toBe('Default Fantasy');
    expect(getRulesetPlugin('nonexistent')).toBeUndefined();
  });

  it('falls back to the first registered plugin when no id is provided', () => {
    const plugin = loadActiveRuleset();
    expect(plugin.id).toBe('fantasy');
    expect(RulesetRegistry.getInstance().isLoaded()).toBe(true);
  });

  it('respects an explicit id override', () => {
    const plugin = loadActiveRuleset('fantasy');
    expect(plugin.id).toBe('fantasy');
  });

  it('respects RULESET_ID env var when no override is given', () => {
    process.env.RULESET_ID = 'fantasy';
    const plugin = loadActiveRuleset();
    expect(plugin.id).toBe('fantasy');
  });

  it('throws on unknown id with the available list in the message', () => {
    expect(() => loadActiveRuleset('cyberpunk')).toThrow(/Unknown ruleset id/);
    expect(() => loadActiveRuleset('cyberpunk')).toThrow(/fantasy/);
  });
});
