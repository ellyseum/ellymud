/**
 * Unit tests for KyselyItemRepository
 * Uses in-memory SQLite for isolated, fast testing
 * @module persistence/KyselyItemRepository.test
 */

import { Kysely } from 'kysely';
import { Database } from '../data/schema';
import { KyselyItemRepository } from './KyselyItemRepository';
import { setupTestDb, destroyTestDb } from '../testing/testDb';
import { GameItem, ItemInstance } from '../types';

// Helper to create a test item template
function createTestItem(overrides: Partial<GameItem> = {}): GameItem {
  return {
    id: overrides.id ?? 'test-item',
    name: overrides.name ?? 'Test Item',
    description: overrides.description ?? 'A test item',
    type: overrides.type ?? 'misc',
    value: overrides.value ?? 10,
    slot: overrides.slot,
    weight: overrides.weight,
    stats: overrides.stats,
    requirements: overrides.requirements,
  };
}

// Helper to create a test item instance
function createTestInstance(overrides: Partial<ItemInstance> = {}): ItemInstance {
  return {
    instanceId: overrides.instanceId ?? 'inst-1',
    templateId: overrides.templateId ?? 'test-item',
    created: overrides.created ?? new Date('2024-01-01T00:00:00Z'),
    createdBy: overrides.createdBy ?? 'test',
    properties: overrides.properties,
    history: overrides.history,
  };
}

describe('KyselyItemRepository', () => {
  let db: Kysely<Database>;
  let repository: KyselyItemRepository;

  beforeEach(async () => {
    db = await setupTestDb();
    repository = new KyselyItemRepository(db);
  });

  afterEach(async () => {
    await destroyTestDb();
  });

  describe('Template Operations', () => {
    describe('findAllTemplates', () => {
      it('should return empty array when no templates exist', async () => {
        const templates = await repository.findAllTemplates();
        expect(templates).toEqual([]);
      });

      it('should return all saved templates', async () => {
        const item1 = createTestItem({ id: 'sword-1', name: 'Sword' });
        const item2 = createTestItem({ id: 'potion-1', name: 'Potion' });

        await repository.saveTemplate(item1);
        await repository.saveTemplate(item2);

        const templates = await repository.findAllTemplates();
        expect(templates).toHaveLength(2);
        expect(templates.map((t) => t.id).sort()).toEqual(['potion-1', 'sword-1']);
      });
    });

    describe('findTemplateById', () => {
      it('should return undefined for non-existent template', async () => {
        const template = await repository.findTemplateById('nonexistent');
        expect(template).toBeUndefined();
      });

      it('should return the template when found', async () => {
        const testItem = createTestItem({ id: 'find-me', name: 'Find Me Item', value: 500 });
        await repository.saveTemplate(testItem);

        const template = await repository.findTemplateById('find-me');
        expect(template).toBeDefined();
        expect(template!.name).toBe('Find Me Item');
        expect(template!.value).toBe(500);
      });

      it('should preserve stats correctly', async () => {
        const testItem = createTestItem({
          id: 'stat-item',
          stats: { attack: 10, defense: 5 },
        });
        await repository.saveTemplate(testItem);

        const template = await repository.findTemplateById('stat-item');
        expect(template!.stats).toEqual({ attack: 10, defense: 5 });
      });
    });

    describe('saveTemplate', () => {
      it('should create a new template', async () => {
        const testItem = createTestItem({ id: 'new-item' });
        await repository.saveTemplate(testItem);

        const saved = await repository.findTemplateById('new-item');
        expect(saved).toBeDefined();
      });

      it('should update an existing template', async () => {
        const testItem = createTestItem({ id: 'update-item', value: 100 });
        await repository.saveTemplate(testItem);

        testItem.value = 200;
        await repository.saveTemplate(testItem);

        const updated = await repository.findTemplateById('update-item');
        expect(updated!.value).toBe(200);
      });
    });

    describe('saveTemplates', () => {
      it('should save multiple templates in transaction', async () => {
        const items = [
          createTestItem({ id: 'batch-1' }),
          createTestItem({ id: 'batch-2' }),
          createTestItem({ id: 'batch-3' }),
        ];

        await repository.saveTemplates(items);

        const all = await repository.findAllTemplates();
        expect(all).toHaveLength(3);
      });

      it('should handle empty array gracefully', async () => {
        await repository.saveTemplates([]);
        const all = await repository.findAllTemplates();
        expect(all).toEqual([]);
      });
    });

    describe('deleteTemplate', () => {
      it('should remove template by id', async () => {
        const testItem = createTestItem({ id: 'delete-item' });
        await repository.saveTemplate(testItem);

        await repository.deleteTemplate('delete-item');

        const template = await repository.findTemplateById('delete-item');
        expect(template).toBeUndefined();
      });
    });
  });

  describe('Instance Operations', () => {
    describe('findAllInstances', () => {
      it('should return empty array when no instances exist', async () => {
        const instances = await repository.findAllInstances();
        expect(instances).toEqual([]);
      });

      it('should return all saved instances', async () => {
        const inst1 = createTestInstance({ instanceId: 'inst-1' });
        const inst2 = createTestInstance({ instanceId: 'inst-2' });

        await repository.saveInstance(inst1);
        await repository.saveInstance(inst2);

        const instances = await repository.findAllInstances();
        expect(instances).toHaveLength(2);
      });
    });

    describe('findInstanceById', () => {
      it('should return undefined for non-existent instance', async () => {
        const instance = await repository.findInstanceById('nonexistent');
        expect(instance).toBeUndefined();
      });

      it('should return the instance when found', async () => {
        const testInstance = createTestInstance({
          instanceId: 'find-me',
          templateId: 'sword-1',
        });
        await repository.saveInstance(testInstance);

        const instance = await repository.findInstanceById('find-me');
        expect(instance).toBeDefined();
        expect(instance!.templateId).toBe('sword-1');
      });
    });

    describe('findInstancesByTemplateId', () => {
      it('should return empty array when no matching instances', async () => {
        const instances = await repository.findInstancesByTemplateId('nonexistent');
        expect(instances).toEqual([]);
      });

      it('should return all instances matching template', async () => {
        await repository.saveInstance(
          createTestInstance({ instanceId: 'inst-1', templateId: 'sword' })
        );
        await repository.saveInstance(
          createTestInstance({ instanceId: 'inst-2', templateId: 'sword' })
        );
        await repository.saveInstance(
          createTestInstance({ instanceId: 'inst-3', templateId: 'potion' })
        );

        const swordInstances = await repository.findInstancesByTemplateId('sword');
        expect(swordInstances).toHaveLength(2);
        expect(swordInstances.every((i) => i.templateId === 'sword')).toBe(true);
      });
    });

    describe('saveInstance', () => {
      it('should create a new instance', async () => {
        const testInstance = createTestInstance({ instanceId: 'new-inst' });
        await repository.saveInstance(testInstance);

        const saved = await repository.findInstanceById('new-inst');
        expect(saved).toBeDefined();
      });

      it('should preserve properties and history', async () => {
        const testInstance = createTestInstance({
          instanceId: 'prop-inst',
          properties: { enchanted: true },
          history: [{ event: 'created', timestamp: new Date('2024-01-01T00:00:00Z') }],
        });
        await repository.saveInstance(testInstance);

        const saved = await repository.findInstanceById('prop-inst');
        expect(saved!.properties).toEqual({ enchanted: true });
        expect(saved!.history).toHaveLength(1);
        expect(saved!.history![0].event).toBe('created');
        expect(saved!.history![0].timestamp).toEqual(new Date('2024-01-01T00:00:00Z'));
      });
    });

    describe('saveInstances', () => {
      it('should save multiple instances in transaction', async () => {
        const instances = [
          createTestInstance({ instanceId: 'batch-1' }),
          createTestInstance({ instanceId: 'batch-2' }),
          createTestInstance({ instanceId: 'batch-3' }),
        ];

        await repository.saveInstances(instances);

        const all = await repository.findAllInstances();
        expect(all).toHaveLength(3);
      });
    });

    describe('deleteInstance', () => {
      it('should remove instance by id', async () => {
        const testInstance = createTestInstance({ instanceId: 'delete-inst' });
        await repository.saveInstance(testInstance);

        await repository.deleteInstance('delete-inst');

        const instance = await repository.findInstanceById('delete-inst');
        expect(instance).toBeUndefined();
      });
    });
  });
});
