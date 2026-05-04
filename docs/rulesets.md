# Rulesets

EllyMUD ships its game-mechanics layer as **ruleset plugins**. The default
fantasy ruleset is one of them; alternatives like `grimdark` live alongside
it. Each plugin declares stats, resource pools, combat math, ability
behavior, progression curve, and effect-type metadata. The engine never
hardcodes those values — it reads them from the active ruleset's plugin.

This document is the authoring guide. Read it if you want to ship a new
ruleset (cyberpunk, sci-fi, custom-fantasy variant) without touching engine
code.

## At a glance

- Built-in plugins live under `src/rulesets/<id>/`.
- The active plugin is selected via `RULESET_ID=<id>` env var or
  `ellymud start --ruleset <id>`.
- A plugin is a single TypeScript module exporting a `RulesetPlugin`
  manifest as its default.
- The engine consumes the plugin's `RulesetConfig`, never the plugin's
  individual files.

## Quickest path: scaffold from grimdark

```bash
ellymud init mygame
```

This copies `src/rulesets/grimdark/` to `src/rulesets/mygame/`, substitutes
the id throughout, and registers the new plugin in the built-in barrel
(`src/rulesets/index.ts`). Edit the generated files, run
`RULESET_ID=mygame npm test` to verify, and you're shipping a new ruleset.

## What a `RulesetPlugin` looks like

```ts
// src/rulesets/<id>/index.ts
import { RulesetPlugin } from '../../ruleset/plugin';
import { myConfig } from './config';

const plugin: RulesetPlugin = {
  id: 'mygame',
  name: 'My Game',
  description: 'A short tagline that shows up in `ellymud list-rulesets`.',
  config: myConfig,
};

export default plugin;
```

The interesting work is in `config.ts` (`RulesetConfig`).

## `RulesetConfig` — the slots

```ts
interface RulesetConfig {
  stats: StatDefinition[];                    // required
  resourcePools?: ResourcePoolDefinition[];   // optional, but combat needs it
  combatHooks?: CombatHooks;                  // required if combat will run
  progressionHooks?: ProgressionHooks;        // optional, falls back to default exponential
  abilityHooks?: AbilityHooks;                // optional surface for future use
  effectMetadataHooks?: EffectMetadataHooks;  // optional, falls back to fantasy defaults
  startingAttributePoints?: number;           // default 100
}
```

### stats

The list of character attributes. Each entry:

```ts
{
  id: 'reflexes',           // referenced in formulas; lowercase snake_case
  displayName: 'Reflexes',  // shown in stat panels
  abbreviation: 'REF',      // 2–4 chars
  baseValue: 10,            // starting value before allocation
  description: '...',       // optional tooltip text
}
```

Reserved ids are listed in `src/ruleset/reservedStatIds.ts` — they're
non-stat User fields the registry won't let you shadow (`username`,
`health`, `mana`, etc.).

### resourcePools

Resource pools (mana, rage, energy, ki, holy, nature in fantasy). Each
declares how its max value is computed (`fixed` or `derived` from stats),
how it regenerates across three cadences (every game tick, every 3-tick
sub-regen window, every 12-tick full regen), and rage-style decay.

Look at `src/rulesets/fantasy/config.ts` for the seven historical pools as
working examples. The shape is documented in
`src/ruleset/resourceTypes.ts`.

### combatHooks

Per-attack math: hit chance, dodge, crit chance, armor class, damage
reduction, and end-to-end damage computation. The engine still owns the
roll, dodge resolution sequence, damage application, and event
broadcasting; the ruleset just supplies the numbers.

```ts
{
  hitChance(ctx): number,        // 0–100
  dodgeChance(ctx): number,      // 0–100
  critChance(ctx): number,       // 0–100
  armorClass(ctx): number,
  damageReduction(ctx): number,
  computeDamage(ctx): { base, computed, isCrit },
}
```

A ruleset that wants to *adjust* fantasy combat (rather than reinvent it)
can compose:

```ts
import { defaultFantasyCombatHooks } from '../fantasy/combatHooks';

export const myCombatHooks: CombatHooks = {
  ...defaultFantasyCombatHooks,
  hitChance(ctx) {
    // Lower base hit chance by 15% across the board.
    return Math.floor(defaultFantasyCombatHooks.hitChance(ctx) * 0.85);
  },
};
```

`grimdark` uses exactly this pattern.

### progressionHooks

The XP curve. Two functions:

```ts
{
  expRequiredForLevel(level: number): number,   // XP to advance level → level+1
  totalExpForLevel?(level: number): number,     // optional; engine derives if absent
}
```

Engine helpers (`src/ruleset/progressionAccess.ts`) fall back to the
bundled fantasy curve when the active ruleset omits this slot.

### effectMetadataHooks

Per-effect-type metadata: default stacking behavior and tick-message
templates. The engine consults this when adding an effect; if the active
ruleset doesn't register a metadata bundle, the engine falls back to its
historical `effectStackingRules` constant for the 21 fantasy effect kinds.

A ruleset adds new effect ids by registering them here; the
`EffectManager` respects whatever stacking the metadata declares.

### abilityHooks

Surface only at this point. The engine doesn't yet dispatch ability
effects through this registry — that migration is scheduled for a future
phase. The slot exists so that when execution paths do migrate, plugin
configs don't have to change shape again.

## The seven historical fantasy stat ids are special

The bundled fantasy combat hooks reference the seven historical ids
(`strength`, `dexterity`, etc.) by name. If your ruleset:

- **uses the same seven ids**: existing class/npc/item content data
  validates against your schema unchanged. This is what `grimdark` does.
- **uses different ids**: existing fantasy content won't load against your
  schema; you'll need your own classes/npcs/items data files. Expected.
- **omits one of the seven**: the fantasy combat hooks will read 0 from
  `getStat()` for that id. Either supply your own combat hooks or accept
  the default math will produce off-balance numbers for fantasy formulas.

## Validation

`RulesetRegistry.loadConfig` runs validation on load and throws if:

- A stat id has invalid shape (must match `^[a-z][a-z0-9_]*$`)
- A stat id is reserved (collides with a User field)
- A pool id is `'none'` (the no-resource sentinel)
- Sizing or regen rule kinds are unrecognized
- `startingAttributePoints` is negative

Errors include all violations, not just the first.

`ClassManager` and `AbilityManager` apply additional checks at load time:
class data must reference a registered resource pool id, ability data must
reference one too. A typo in `data/classes.json` surfaces at boot, not in
runtime combat.

## Selecting the active ruleset at boot

```bash
RULESET_ID=grimdark npm start
ellymud start --ruleset grimdark
ellymud list-rulesets
```

Unset → defaults to the first registered plugin (`fantasy`).

## End-to-end test against your ruleset

```bash
RULESET_ID=mygame npm test
RULESET_ID=mygame npm run test:e2e
```

The full suite is expected to pass under any ruleset that doesn't break
the seven fantasy stat ids. If your ruleset diverges from those, expect
the fantasy-specific content tests to fail — that's the signal that you
also need ruleset-specific content data.

## Files in this guide

- `src/ruleset/types.ts` — the `RulesetConfig` interface
- `src/ruleset/plugin.ts` — the `RulesetPlugin` manifest interface
- `src/ruleset/pluginLoader.ts` — `loadActiveRuleset()` and barrel discovery
- `src/ruleset/resourceTypes.ts` — pool definitions
- `src/ruleset/combatTypes.ts` — combat hook surface
- `src/ruleset/progressionTypes.ts` — progression hook surface
- `src/ruleset/effectMetadata.ts` — effect metadata surface
- `src/ruleset/abilityHandlerTypes.ts` — ability hook surface (foundation only)
- `src/rulesets/fantasy/` — the canonical reference implementation
- `src/rulesets/grimdark/` — a worked example of the "compose from fantasy" pattern
