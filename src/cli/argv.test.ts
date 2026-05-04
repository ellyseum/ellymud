import { parseArgv, CliArgError } from './argv';

describe('parseArgv', () => {
  it('returns help when invoked with no args', () => {
    expect(parseArgv([])).toEqual({ command: 'help' });
  });

  it('parses bare start', () => {
    expect(parseArgv(['start'])).toEqual({ command: 'start', rulesetId: undefined });
  });

  it('parses start with --ruleset value', () => {
    expect(parseArgv(['start', '--ruleset', 'grimdark'])).toEqual({
      command: 'start',
      rulesetId: 'grimdark',
    });
  });

  it('parses start with --ruleset=value form', () => {
    expect(parseArgv(['start', '--ruleset=grimdark'])).toEqual({
      command: 'start',
      rulesetId: 'grimdark',
    });
  });

  it('parses list-rulesets', () => {
    expect(parseArgv(['list-rulesets'])).toEqual({ command: 'list-rulesets' });
  });

  it('parses init with positional id', () => {
    expect(parseArgv(['init', 'cyberpunk'])).toEqual({
      command: 'init',
      newRulesetId: 'cyberpunk',
    });
  });

  it('throws when init is missing its positional id', () => {
    expect(() => parseArgv(['init'])).toThrow(CliArgError);
  });

  it('throws on unknown command', () => {
    expect(() => parseArgv(['nonexistent'])).toThrow(/Unknown command/);
  });
});
