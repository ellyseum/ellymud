# Changelog

All notable changes to EllyMUD are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [Semantic Versioning](https://semver.org/).

## [1.2.0] — 2026-05-04

The "engine + content split" release. EllyMUD's game-mechanics layer
(stats, resources, combat math, abilities, progression) becomes
ruleset-driven via a plugin architecture. The bundled fantasy ruleset
preserves all historical behavior; alternative rulesets can ship as
self-contained plugins under `src/rulesets/<id>/`.

### Added

- **Ruleset plugin architecture.** `RulesetPlugin` manifest plus a built-in
  registry under `src/rulesets/`. Active plugin selected via `RULESET_ID`
  env var or `--ruleset` flag.
- **Stat schema registry** (`src/ruleset/rulesetRegistry.ts`).
  `getStat(user, id)` reads through the registry; `setStat` /
  `addToStat` write through it.
- **Resource pool registry.** Each pool declares its sizing kind
  (fixed/derived) and per-cadence regen rules (tick / sub / full). The
  six historical fantasy pools (mana/rage/energy/ki/holy/nature) move
  to data; the engine no longer enumerates them.
- **Combat hook surface.** Per-attack math (hit chance, dodge, crit, AC,
  DR, end-to-end damage) supplied by the ruleset. `combat.ts`,
  `CombatProcessor.processNpcAttack`, and `AbilityManager`'s combat
  ability path all dispatch through these hooks.
- **Progression hook surface.** XP curve becomes ruleset config. Engine
  helpers in `progressionAccess.ts` fall back to the bundled fantasy
  curve when omitted.
- **Effect type metadata hooks.** Default stacking behavior moves from
  the hardcoded `effectStackingRules` constant to a ruleset-supplied
  bundle. New effect ids can register without engine code changes.
- **Ability hook surface (foundation).** `AbilityHooks` slot exists for a
  future migration; engine still dispatches effects through
  `EffectManager` directly.
- **Versioned SQL schema migration runner**
  (`src/data/schemaMigrations.ts`). v1 added the `stats` /
  `allocated_stats` JSON columns and backfilled them; v2 dropped the
  seven legacy per-stat columns once the JSON path was canonical.
- **`grimdark` ruleset.** A second built-in plugin demonstrating the
  architecture's variety: same stat ids as fantasy with different display
  names, harsher XP curve, lower hit chance. Selectable via
  `RULESET_ID=grimdark`.
- **`ellymud` CLI.** `start [--ruleset <id>]`, `list-rulesets`,
  `init <id>`. The `init` subcommand scaffolds a new ruleset folder
  from the grimdark template and registers it in the barrel.
- **`docs/rulesets.md`.** Author guide for new ruleset plugins, walking
  through grimdark as the worked example.
- Quest cross-reference validator (templateId/roomId/itemId), recursive
  quest loader, schema error surfacing, and `repeatCooldown` enforcement.
- Per-room mob population cap with backpressure-aware auto-dispersal.
- One-shot "ready to train" hint when XP crosses the level threshold.
- `exits` command, room `shortDescription`/`longDescription` fields.

### Changed

- `User.stats: Record<string, number>` is now the canonical stat
  storage. The seven historical flat fields (`user.strength`, etc.)
  were removed from the `User` type after every consumer migrated to
  `getStat()`.
- `ResourceType` enum becomes a `string` type alias plus a const
  compatibility object so existing `ResourceType.MANA` references still
  resolve to `'mana'`. Validation at class/ability load time guards
  against typos in resource ids.
- The default fantasy ruleset's combat hooks compose with grimdark's
  via standard object spread, demonstrating the "override one method"
  pattern for ruleset variants.
- `combatFormulas.ts` stays as the implementation library used by the
  default fantasy hook bundle; rulesets that want different math
  replace the bundle entirely.
- Class data and ability data are validated against the active
  ruleset's resource pool registry on load — typos surface at boot
  rather than mid-combat.
- Fantasy combat preserves the existing 50% NPC-aggro and 65%
  combat-ability hit chances via `attackKind` discriminators on the
  hook context; alternate rulesets can override per kind.
- Equipment-derived AC/DR flow through the combat hook surface via
  `defenderArmor` on the context.
- Resource pool regen now distributes across three explicit cadences
  (tick / sub / full); meditation/rest gating stays in the timer
  layer because it's player-state semantics, not pool behavior.
- `RulesetType` validation rejects malformed or reserved stat ids,
  duplicates, non-finite base values, and invalid cost curves;
  reports all violations on load.
- The default plugin first-loads in <50ms; ruleset switching has no
  runtime cost beyond loading the plugin's config object.

### Fixed

- `AsyncFileUserRepository` (the live JSON repo) consults `migrateUser`
  on every load path, hydrating legacy flat stat fields into the new
  `stats` record.
- Mana regen continues for users with `maxMana > 0` even when their
  class has no resource pool — preserves the historical cross-class
  mana-recovery semantics.
- Quest loader recurses into subdirectories and surfaces individual
  schema errors instead of dropping a phase silently.
- Quest dialogue requirements now enforce both `items` and `minCount`.
- `repeatCooldown` is honored in `getAvailableQuests` and
  `canStartQuest`.
- Room NPCs no longer instantiate before the NPC template registry
  finishes loading.
- `setMaxHP` and related helpers no longer reference removed flat-stat
  fields.

### Removed

- `User.strength`, `User.dexterity`, `User.agility`, `User.constitution`,
  `User.wisdom`, `User.intelligence`, `User.charisma` — moved to
  `user.stats`.
- The seven `users.<stat>` SQL columns — replaced by `users.stats` JSON
  column.
- `effectStackingRules` constant lookups in the active code path —
  replaced by `EffectMetadataHooks.getMetadata().defaultStacking`. The
  constant remains as the fallback for the unloaded-registry case.
- Dead `src/types/index.ts` (`UserData`, parallel `ConnectedClient`).
- `.github/` workflow infrastructure, `.vscode/`, `.devcontainer/`,
  `public/`, `todos/`, all sub-directory `README.md` and `AGENTS.md`
  files (181 paired docs), root markdown boilerplate, `fly.toml`, and
  the entire Make system. Replaced with a focused `.claude/CLAUDE.md`
  for the project.

## [1.1.0] — 2025

Initial release of the post-cleanup branch. Canonical pre-engine-split
state with hardcoded fantasy stats, the seven `users.<stat>` SQL
columns, fixed-list `ResourceType` enum, and combat math directly
calling `combatFormulas.ts`.

[1.2.0]: https://github.com/ellyseum/ellymud/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/ellyseum/ellymud/releases/tag/v1.1.0
