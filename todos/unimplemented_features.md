# Unimplemented Features

## 1. Private Messaging (`whisper` / `tell`)
- **Status:** Missing. Only `say` (room) and `yell` (area) exist.
- **Complexity:** Low Hanging Fruit. Requires finding a target user by name and sending a message only to them.
- **Reference:** "Chat System: Players can communicate with each other..." (implies more than just public chat).

## 2. Player-to-Player Trading (`give` command)
- **Status:** Missing. `giveitem` is Admin-only. Players must currently `drop` items for others to `pickup`, which is risky.
- **Complexity:** Low/Medium. Requires checking target presence, item ownership, and transferring data between inventories.
- **Reference:** "Player Economy: Players can trade items and gold with each other..."

## 3. NPC Merchant System (`buy` / `sell`)
- **Status:** Missing. No commands to exchange gold for items with NPCs.
- **Complexity:** Medium. Requires NPC "merchant" flags, inventory lists for NPCs, and gold transaction logic.
- **Reference:** "Trading: Some friendly NPCs may act as merchants..."

## 4. Dialogue System (`talk` / `interact`)
- **Status:** Missing. No way to initiate conversations with NPCs.
- **Complexity:** Medium. Requires defining dialogue trees/responses in NPC data and an interaction command.
- **Reference:** "Dialogue: Some NPCs can engage in dialogue with players..."

## 5. Party/Group System
- **Status:** Missing. No commands to form groups (`invite`, `join`, `leave`).
- **Complexity:** Medium/High. Requires a new `Party` manager, shared experience/loot logic, and private party chat.
- **Reference:** "Collaboration: Players can form groups or parties..."

## 6. Quest System
- **Status:** Missing. No quest log, acceptance, or tracking mechanics.
- **Complexity:** High. Requires a robust system to track quest states (active, completed), objectives (kill counts, items), and rewards.
- **Reference:** "Quests: NPCs may offer quests to players..."

## 7. Skills & Spells System (`cast` / `use`)
- **Status:** Missing. Combat is currently limited to `attack` (melee) and `root`. No magic system or special abilities.
- **Complexity:** Massive Rewrite. Requires defining a spell/ability database, mana costs, cooldowns, casting mechanics, and deep integration into the combat loop.
- **Reference:** "Attack Types: Players can perform various attack types, including melee, and spell based attacks."

---

## Recommendation: Next Feature to Implement

**Feature:** **Player-to-Player Trading (`give` command)**

**Reasoning:**
While Private Messaging is easier, **Trading** is a core gameplay mechanic explicitly promised in the "Player Economy" section. Currently, the only way for players to exchange items is the insecure method of dropping items on the floor. Implementing a secure `give` command (e.g., `give <item> <player>` and `give <amount> gold <player>`) will significantly enhance the multiplayer experience by allowing safe resource sharing and commerce.

It is a self-contained feature that builds upon existing Inventory and User Manager systems without requiring a massive architectural overhaul.
