# Commands Reference

Complete reference guide for all available commands in EllyMUD.

## Table of Contents

- [Command Syntax](#command-syntax)
- [Movement Commands](#movement-commands)
- [Information Commands](#information-commands)
- [Communication Commands](#communication-commands)
- [Item Commands](#item-commands)
- [Combat Commands](#combat-commands)
- [Recovery Commands](#recovery-commands)
- [Ability Commands](#ability-commands)
- [Character Commands](#character-commands)
- [Admin Commands](#admin-commands)
- [Utility Commands](#utility-commands)
- [Fun Commands](#fun-commands)

## Command Syntax

Commands in EllyMUD follow this general format:

```
command [arguments]
```

- Commands are case-insensitive
- Arguments are typically space-separated
- Some commands have aliases (shorter versions)
- Use `help` to see all available commands
- Use `help <command>` for specific command help

## Movement Commands

### Basic Movement

**north / n** - Move north

```
north
n
```

**south / s** - Move south

```
south
s
```

**east / e** - Move east

```
east
e
```

**west / w** - Move west

```
west
w
```

**up / u** - Move up

```
up
u
```

**down / d** - Move down

```
down
d
```

**Diagonal Movement**

- `northeast` / `ne` - Move northeast
- `northwest` / `nw` - Move northwest
- `southeast` / `se` - Move southeast
- `southwest` / `sw` - Move southwest

### Movement Notes

- You can only move through exits that exist in your current room
- Use `look` to see available exits
- Some areas may be locked or require special items/permissions
- Movement speed may be affected by your stats (agility) or equipment weight
- You can flee combat by moving to an adjacent room

## Information Commands

### look / l

Look at your surroundings or examine something specific.

**Usage:**

```
look
look <item>
look <player>
look <npc>
```

**Examples:**

```
look
look sword
look goblin
```

**Shows:**

- Room description
- Visible exits
- Players in the room
- NPCs in the room
- Items on the ground

### stats

View your character statistics.

**Usage:**

```
stats
```

**Shows:**

- Health and mana
- Level and experience
- Strength, dexterity, intelligence, etc.
- Combat stats
- Status effects

### inventory / i

Check your inventory.

**Usage:**

```
inventory
i
```

**Shows:**

- All items you're carrying
- Item quantities
- Total inventory count

### equipment

View your equipped items.

**Usage:**

```
equipment
```

**Shows:**

- Weapon
- Armor pieces
- Accessories
- Item stats and bonuses

### scores

View your character score and ranking.

**Usage:**

```
scores
```

**Shows:**

- Total score
- Kills and deaths
- Experience gained
- Other achievements

### time

Check the current game time.

**Usage:**

```
time
```

**Shows:**

- Current game time
- Time of day
- Day/night cycle information

### played

See how long you've been playing.

**Usage:**

```
played
```

**Shows:**

- Total playtime
- Session duration
- Login/logout history

### history

View your command history.

**Usage:**

```
history
```

**Shows:**

- Recent commands executed
- Timestamps
- Command count

## Communication Commands

### say

Speak to players in the same room.

**Usage:**

```
say <message>
```

**Examples:**

```
say Hello everyone!
say Has anyone seen the blacksmith?
```

**Notes:**

- Only players in the same room can hear you
- NPCs may respond to certain keywords

### wave

Wave at someone or everyone in the room.

**Usage:**

```
wave
wave <player>
```

**Examples:**

```
wave
wave alice
```

**Notes:**

- Only visible to players in the same room
- If targeting a player, they see a personalized message

### laugh

Laugh at someone or everyone in the room.

**Usage:**

```
laugh
laugh <player>
```

**Examples:**

```
laugh
laugh alice
```

**Notes:**

- Only visible to players in the same room
- If targeting a player, they see a personalized message

### yell

Shout to all players in nearby areas.

**Usage:**

```
yell <message>
```

**Examples:**

```
yell Help! I'm under attack!
yell Selling rare items at the marketplace!
```

**Notes:**

- Can be heard by players in adjacent rooms
- May have a cooldown period
- May alert hostile NPCs

### bugreport

Report a bug to the administrators.

**Usage:**

```
bugreport <description>
```

**Examples:**

```
bugreport The dragon boss is invisible
bugreport Game crashes when using heal spell
```

**Notes:**

- Helps improve the game
- Include as much detail as possible
- Bug reports are reviewed by admins

## Item Commands

### get / pickup

Pick up an item from the ground.

**Usage:**

```
get <item>
pickup <item>
```

**Examples:**

```
get sword
get all
pickup potion
```

**Notes:**

- Item must be in the current room
- You need space in your inventory
- Some items may be too heavy or locked

### drop

Drop an item from your inventory.

**Usage:**

```
drop <item>
drop all
```

**Examples:**

```
drop sword
drop torch
drop all
```

**Notes:**

- Item will appear in the current room
- Other players can pick it up
- Be careful with valuable items

### equip

Equip an item from your inventory.

**Usage:**

```
equip <item>
```

**Examples:**

```
equip sword
equip leather armor
equip ring
```

**Notes:**

- Item must be in your inventory
- Item must be equippable
- Replaces currently equipped item in that slot
- Stat bonuses apply immediately

### unequip

Remove an equipped item.

**Usage:**

```
unequip <item>
```

**Examples:**

```
unequip sword
unequip armor
```

**Notes:**

- Item returns to your inventory
- Stat bonuses are removed
- You need space in your inventory

### repair

Repair a damaged item.

**Usage:**

```
repair <item>
```

**Examples:**

```
repair sword
repair armor
```

**Notes:**

- Costs gold based on damage
- Some items cannot be repaired
- May need to find a blacksmith

### break

Intentionally break an item (testing/debugging).

**Usage:**

```
break <item>
```

**Examples:**

```
break sword
```

**Notes:**

- Primarily for testing purposes
- Item becomes damaged
- Can be repaired afterward

## Combat Commands

### attack

Attack an enemy to start combat.

**Usage:**

```
attack <target>
```

**Examples:**

```
attack goblin
attack orc
attack player_name
```

**Notes:**

- Target must be in the same room
- Enters combat mode
- Combat is turn-based
- Can attack multiple targets

### flee

Attempt to flee from combat.

**Usage:**

```
flee
```

**Or simply move in a direction:**

```
north
south
east
west
```

**Notes:**

- May fail based on your stats
- Moves you to a random adjacent room
- Enemies may pursue you
- Some bosses prevent fleeing

### heal

Use a healing ability or item.

**Usage:**

```
heal
heal <target>
```

**Examples:**

```
heal
heal player_name
```

**Notes:**

- Restores health points
- May cost mana or items
- Cannot use while in active combat (depends on implementation)
- Cooldown may apply

### damage

Deal direct damage (admin/testing).

**Usage:**

```
damage <target> <amount>
```

**Examples:**

```
damage goblin 50
damage self 10
```

**Notes:**

- Admin or testing command
- Bypasses normal combat mechanics
- Useful for testing

## Recovery Commands

Commands for regenerating health and mana outside of combat.

### rest

Sit down and rest to regenerate health faster.

**Usage:**

```
rest
```

**Notes:**

- Increases HP regeneration by 2x after 4 ticks (~24 seconds)
- Cannot rest while in combat
- Cannot rest while unconscious
- Automatically interrupted by:
  - Taking damage
  - Moving to another room
  - Attacking something
  - Entering combat
- Mutually exclusive with meditating (rest cancels meditation)

### meditate

Sit down and meditate to regenerate mana faster.

**Usage:**

```
meditate
```

**Notes:**

- Increases MP regeneration by 2x after 4 ticks (~24 seconds)
- Provides small MP gains every 6 ticks while meditating (mini meditation bonus)
- Mini bonus scales with Wisdom and Intelligence stats
- Cannot meditate while in combat
- Cannot meditate while unconscious
- Automatically interrupted by:
  - Taking damage
  - Moving to another room
  - Attacking something
  - Entering combat
- Mutually exclusive with resting (meditate cancels rest)

### Prompt Indicators

When resting or meditating, your prompt will show a special indicator:

- `[R]` - Currently resting
- `[M]` - Currently meditating

Example prompt while resting: `[R][HP:100/100 MP:50/50] > `

## Ability Commands

### cast

Cast a spell or ability at a target.

**Usage:**

```
cast <ability> [target]
```

**Examples:**

```
cast fireball goblin
cast heal
cast poison orc
cast strength_boost
```

**Notes:**

- Requires mana (MP) to cast
- Most offensive spells require a target
- Self-targeting spells don't need a target argument
- Abilities have cooldowns between uses
- Use `abilities` command to see available spells

### abilities

View your available abilities and their status.

**Usage:**

```
abilities
```

**Shows:**

- List of all available abilities
- Mana cost for each ability
- Current cooldown status (Ready or rounds remaining)
- Ability descriptions

**Notes:**

- Displays current mana pool
- Shows which abilities are on cooldown
- Helps plan spell usage during combat

### use

Use an item from your inventory.

**Usage:**

```
use <item>
```

**Examples:**

```
use health potion
use scroll of fire
use healing salve
```

**Notes:**

- Item must be in your inventory
- Item must have a usable ability
- Some items are consumed on use
- Items may have cooldowns
- Use `inventory` to see usable items

## Character Commands

### changePassword

Change your account password.

**Usage:**

```
changePassword
```

**Process:**

1. Enter current password
2. Enter new password
3. Confirm new password

**Notes:**

- Passwords are hashed and secure
- Old password required
- Follow password strength requirements

### resetname

Reset your character name (admin only).

**Usage:**

```
resetname <player>
```

**Examples:**

```
resetname player_name
```

**Notes:**

- Admin command only
- Allows player to choose new name
- Cannot duplicate existing names

### rename

Rename your character or an item.

**Usage:**

```
rename <old_name> <new_name>
```

**Examples:**

```
rename MyCharacter NewCharacter
```

**Notes:**

- May have restrictions
- Cannot duplicate existing names
- May cost gold or require special item

## Admin Commands

### addflag

Add a flag to a user (admin only).

**Usage:**

```
addflag <player> <flag>
```

**Examples:**

```
addflag player_name admin
addflag player_name immortal
```

**Notes:**

- Admin command only
- Grants special permissions or attributes
- Use carefully

### removeflag

Remove a flag from a user (admin only).

**Usage:**

```
removeflag <player> <flag>
```

**Examples:**

```
removeflag player_name admin
```

### listflags

List all flags on a user (admin only).

**Usage:**

```
listflags <player>
```

**Examples:**

```
listflags player_name
```

**Shows:**

- All active flags
- Flag descriptions
- When flags were added

### sudo

Execute a command as another user (admin only).

**Usage:**

```
sudo <player> <command>
```

**Examples:**

```
sudo player_name look
sudo player_name attack goblin
```

**Notes:**

- Admin command only
- Executes command as if the target player typed it
- Useful for testing and troubleshooting

### root

Elevate to root admin privileges (admin only).

**Usage:**

```
root
```

**Notes:**

- Highest level of administrative access
- Use with extreme caution
- All actions are logged

### adminmanage

Manage admin settings and users (admin only).

**Usage:**

```
adminmanage <action> <args>
```

**Examples:**

```
adminmanage list
adminmanage promote player_name
adminmanage demote player_name
```

**Actions:**

- `list` - List all admins
- `promote` - Grant admin privileges
- `demote` - Remove admin privileges

### spawn

Spawn an NPC or item (admin only).

**Usage:**

```
spawn <type> <id>
```

**Examples:**

```
spawn npc goblin
spawn item sword
```

**Notes:**

- Admin command only
- Creates new instances
- Useful for testing and events

### destroy

Destroy an NPC or item (admin only).

**Usage:**

```
destroy <target>
```

**Examples:**

```
destroy goblin
destroy sword
```

**Notes:**

- Admin command only
- Permanently removes the target
- Use carefully

### giveitem

Give an item to a player (admin only).

**Usage:**

```
giveitem <player> <item>
```

**Examples:**

```
giveitem player_name legendary_sword
```

**Notes:**

- Admin command only
- Creates item in player's inventory
- Useful for rewards and testing

### restrict

Restrict a player's access (admin only).

**Usage:**

```
restrict <player> <duration>
```

**Examples:**

```
restrict player_name 1h
restrict player_name 24h
restrict player_name permanent
```

**Notes:**

- Admin command only
- Temporarily or permanently bans player
- Duration can be: minutes (m), hours (h), days (d), permanent

### effect

Apply a status effect (admin/testing).

**Usage:**

```
effect <target> <effect_type> <duration>
```

**Examples:**

```
effect self poison 30
effect player_name buff 60
```

**Notes:**

- Admin or testing command
- Effects have various behaviors
- Duration in seconds

### list

List various game entities (admin only).

**Usage:**

```
list <type>
```

**Examples:**

```
list players
list npcs
list rooms
list items
```

**Shows:**

- All entities of the specified type
- IDs and names
- Current status

### debug

Toggle debug mode or show debug info (admin only).

**Usage:**

```
debug
debug <option>
```

**Examples:**

```
debug
debug on
debug off
```

**Notes:**

- Admin command only
- Shows additional game information
- Useful for development and troubleshooting

## Utility Commands

### help

Show available commands or help for a specific command.

**Usage:**

```
help
help <command>
```

**Examples:**

```
help
help attack
help move
```

**Shows:**

- List of all commands (no args)
- Detailed help for specific command

### wait

Wait for a period of time.

**Usage:**

```
wait <seconds>
```

**Examples:**

```
wait 5
wait 30
```

**Notes:**

- Character waits in place
- Useful for regeneration
- Can be interrupted by combat

### quit

Log out and disconnect from the game.

**Usage:**

```
quit
```

**Notes:**

- Saves your character automatically
- Cannot quit during combat in some situations
- Session is logged

## Fun Commands

### snake

Play the classic Snake game!

**Usage:**

```
snake
```

**Notes:**

- Fun mini-game within the MUD
- Use arrow keys or WASD to move
- Try to get the highest score!
- Exit the game to return to the MUD

## Command Tips

### General Tips

1. **Tab Completion**: Some clients support tab completion for commands
2. **Command History**: Use up/down arrows to recall previous commands (client-dependent)
3. **Aliases**: Many commands have short versions (e.g., `i` for `inventory`)
4. **Case Insensitive**: Commands work in any case (LOOK, look, Look all work)
5. **Spacing**: Extra spaces are generally ignored

### Combat Tips

- Use `look` to identify targets before attacking
- Check your stats before engaging strong enemies
- Keep healing items in your inventory
- Flee if you're losing - there's no shame in retreating!
- Some NPCs are aggressive and will attack on sight

### Movement Tips

- Use directional shortcuts (n, s, e, w) for faster movement
- Check exits with `look` before trying to move
- Movement speed varies based on your agility stat
- Map out areas as you explore

### Efficiency Tips

- Use shortened commands when possible
- Chain actions: `get sword; equip sword`
- Keep commonly used items accessible
- Organize your inventory regularly
- Use `wait` to regenerate between fights

## Role-Specific Commands

### User Commands

All players have access to:

- Movement, information, communication
- Item management
- Combat commands
- Character management

### Admin Commands

Admins additionally have access to:

- User management (`addflag`, `removeflag`, `restrict`)
- World manipulation (`spawn`, `destroy`, `giveitem`)
- Debugging (`debug`, `sudo`, `list`)
- Server management (`root`, `adminmanage`)

## Command Cooldowns

Some commands have cooldown periods:

- **yell**: 30 seconds between shouts
- **heal**: 10 seconds (varies by implementation)
- **Special abilities**: Varies by ability

Cooldowns prevent spam and balance gameplay.

## Command Permissions

Commands require different permission levels:

- **Public**: Available to all authenticated users
- **Admin**: Requires admin flag
- **Root**: Requires root admin privileges
- **In-Combat Only**: Only available during combat
- **Out-of-Combat Only**: Not available during combat

Check each command's notes for permission requirements.

## Troubleshooting Commands

### Command Not Found

If a command isn't recognized:

1. Check spelling
2. Use `help` to see available commands
3. You may not have permission
4. Command may not be implemented yet

### Command Not Working

If a command doesn't work as expected:

1. Check the syntax with `help <command>`
2. Ensure you have the required items/permissions
3. Check if you're in the right state (combat vs. normal)
4. Use `bugreport` to report issues

### Getting Help

- Use `help` for command list
- Use `help <command>` for specific help
- Ask other players with `say`
- Use `bugreport` for bugs
- Contact admins for assistance

## Future Commands

EllyMUD is actively developed. Future commands may include:

- Trading with other players
- Guild management
- Quest tracking
- Crafting system
- Mounts and pets
- Magic spells
- And much more!

Check the repository for upcoming features.

---

**Need more help?**

- [Getting Started Guide](getting-started.md) - New player guide
- [Development Guide](development.md) - For contributors
- [Architecture](architecture.md) - System overview

[← Back to Documentation](README.md)
