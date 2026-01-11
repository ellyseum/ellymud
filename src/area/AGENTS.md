# Area Module

This module contains the Area entity and AreaManager for managing game areas.

## Files

- `area.ts` - Area interfaces and DTOs
- `areaManager.ts` - Singleton manager for area CRUD operations

## Usage

```typescript
import { AreaManager } from './area/areaManager';
import { CreateAreaDTO } from './area/area';

const areaManager = AreaManager.getInstance();
await areaManager.initialize();

const newArea = await areaManager.create({
  id: 'dark-forest',
  name: 'Dark Forest',
  description: 'A dangerous forest filled with creatures',
  levelRange: { min: 5, max: 15 },
});
```
