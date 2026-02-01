import Ajv from 'ajv';

// Initialize the validator
export const ajv = new Ajv({
  allErrors: true, // Return all errors, not just the first one
  removeAdditional: false, // Don't remove properties not in the schema
  useDefaults: true, // Apply default values from the schema
});

// Room schema
export const roomSchema = {
  type: 'array',
  items: {
    type: 'object',
    required: ['id', 'name', 'description'],
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      description: { type: 'string' },
      exits: {
        type: 'array',
        items: {
          type: 'object',
          required: ['direction', 'roomId'],
          properties: {
            direction: { type: 'string' },
            roomId: { type: 'string' },
          },
        },
      },
      npcs: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
      items: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
      itemInstances: {
        type: 'array',
        items: {
          // Allow either string or object - this matches the mixed types you have in your data
          anyOf: [
            { type: 'string' },
            { type: 'object', additionalProperties: true },
            { type: 'null' }, // Also allow null items if they exist
          ],
        },
      },
      currency: {
        type: 'object',
        properties: {
          gold: { type: 'number' },
          silver: { type: 'number' },
          copper: { type: 'number' },
        },
      },
    },
    additionalProperties: true,
  },
};

// User schema
export const userSchema = {
  type: 'array',
  items: {
    type: 'object',
    required: ['username'],
    properties: {
      username: { type: 'string' },
      passwordHash: { type: 'string' },
      salt: { type: 'string' },
      health: { type: 'number' },
      maxHealth: { type: 'number' },
      experience: { type: 'number' },
      level: { type: 'number' },
      strength: { type: 'number' },
      dexterity: { type: 'number' },
      agility: { type: 'number' },
      constitution: { type: 'number' },
      wisdom: { type: 'number' },
      intelligence: { type: 'number' },
      charisma: { type: 'number' },
      attack: { type: 'number' },
      defense: { type: 'number' },
      equipment: {
        type: 'object',
        additionalProperties: true,
      },
      joinDate: { type: 'string' },
      lastLogin: { type: 'string' },
      currentRoomId: { type: 'string' },
      inventory: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { type: 'string' },
          },
          currency: {
            type: 'object',
            properties: {
              gold: { type: 'number' },
              silver: { type: 'number' },
              copper: { type: 'number' },
            },
          },
        },
      },
      commandHistory: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    additionalProperties: true,
  },
};

// Item schema
export const itemSchema = {
  type: 'array',
  items: {
    type: 'object',
    required: ['id', 'name', 'description'],
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      description: { type: 'string' },
      type: { type: 'string' },
      slot: { type: 'string' },
      value: { type: 'number' },
      weight: { type: 'number' },
      stats: {
        type: 'object',
        additionalProperties: true,
      },
      requirements: {
        type: 'object',
        additionalProperties: true,
      },
      portable: { type: 'boolean' },
      properties: {
        type: 'object',
        additionalProperties: true,
      },
    },
    additionalProperties: true,
  },
};

// Item instance schema
export const itemInstanceSchema = {
  type: 'array',
  items: {
    type: 'object',
    required: ['instanceId', 'templateId'],
    properties: {
      instanceId: { type: 'string' },
      templateId: { type: 'string' },
      created: { type: 'string' },
      createdBy: { type: 'string' },
      properties: {
        type: 'object',
        properties: {
          durability: {
            type: 'object',
            properties: {
              current: { type: 'number' },
              max: { type: 'number' },
            },
          },
          quality: { type: 'string' },
          customName: { type: 'string' },
          enchantments: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: true,
            },
          },
          soulbound: { type: 'boolean' },
          boundTo: { type: 'string' },
        },
        additionalProperties: true,
      },
      history: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            timestamp: { type: 'string' },
            event: { type: 'string' },
            details: { type: 'string' },
          },
        },
      },
    },
    additionalProperties: true,
  },
};

// NPC inventory item schema (for drops and merchant stock)
const npcInventoryItemSchema = {
  type: 'object',
  required: ['itemId', 'itemCount', 'spawnRate'],
  properties: {
    itemId: { type: 'string' },
    itemCount: {
      oneOf: [
        { type: 'number' },
        {
          type: 'object',
          required: ['min', 'max'],
          properties: {
            min: { type: 'number' },
            max: { type: 'number' },
          },
        },
      ],
    },
    spawnRate: { type: 'number', minimum: 0, maximum: 1 },
    spawnPeriod: { type: 'number' },
    lastSpawned: { type: 'string' },
  },
  additionalProperties: false,
};

// NPC schema
export const npcSchema = {
  type: 'array',
  items: {
    type: 'object',
    required: ['id', 'name', 'description'],
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      description: { type: 'string' },
      dialogue: {
        type: 'object',
        additionalProperties: {
          type: 'string',
        },
      },
      inventory: {
        type: 'array',
        items: npcInventoryItemSchema,
      },
      merchant: { type: 'boolean' },
      stockConfig: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            templateId: { type: 'string' },
            maxStock: { type: 'number' },
            restockAmount: { type: 'number' },
            restockPeriod: { type: 'number' },
            restockUnit: { type: 'string', enum: ['minutes', 'hours', 'days', 'weeks'] },
            lastRestock: { type: 'string' },
          },
        },
      },
    },
    additionalProperties: true,
  },
};

// Race schema
export const raceSchema = {
  type: 'object',
  required: ['races'],
  properties: {
    races: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'name', 'description', 'statModifiers', 'bonuses', 'bonusDescription'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          statModifiers: {
            type: 'object',
            required: [
              'strength',
              'dexterity',
              'agility',
              'constitution',
              'wisdom',
              'intelligence',
              'charisma',
            ],
            properties: {
              strength: { type: 'number' },
              dexterity: { type: 'number' },
              agility: { type: 'number' },
              constitution: { type: 'number' },
              wisdom: { type: 'number' },
              intelligence: { type: 'number' },
              charisma: { type: 'number' },
            },
          },
          bonuses: {
            type: 'object',
            properties: {
              xpGain: { type: 'number' },
              maxMana: { type: 'number' },
              maxHealth: { type: 'number' },
              critChance: { type: 'number' },
              attack: { type: 'number' },
            },
          },
          bonusDescription: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  },
};

// Character class schema
export const classSchema = {
  type: 'object',
  required: ['classes'],
  properties: {
    classes: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'id',
          'name',
          'description',
          'tier',
          'requirements',
          'statBonuses',
          'availableAdvancement',
        ],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          tier: { type: 'number', minimum: 0, maximum: 2 },
          requirements: {
            type: 'object',
            required: ['level', 'previousClass', 'questFlag', 'trainerType'],
            properties: {
              level: { type: 'number', minimum: 1 },
              previousClass: { type: ['string', 'null'] },
              questFlag: { type: ['string', 'null'] },
              trainerType: { type: ['string', 'null'] },
            },
          },
          statBonuses: {
            type: 'object',
            required: ['maxHealth', 'maxMana', 'attack', 'defense'],
            properties: {
              maxHealth: { type: 'number' },
              maxMana: { type: 'number' },
              attack: { type: 'number' },
              defense: { type: 'number' },
            },
          },
          availableAdvancement: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    },
  },
};

// Compile validators
export const validateRooms = ajv.compile(roomSchema);
export const validateUsers = ajv.compile(userSchema);
export const validateItems = ajv.compile(itemSchema);
export const validateItemInstances = ajv.compile(itemInstanceSchema);
export const validateNpcs = ajv.compile(npcSchema);
export const validateRaces = ajv.compile(raceSchema);
export const validateClasses = ajv.compile(classSchema);
