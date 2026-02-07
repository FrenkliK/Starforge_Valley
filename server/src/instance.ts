import type { AreaId, EntityBase, EntityId, Vector2 } from '../../shared/src/types.js';

export class Instance {
  readonly id: string;
  readonly areaId: AreaId;
  private entities = new Map<EntityId, EntityBase>();

  constructor(id: string, areaId: AreaId) {
    this.id = id;
    this.areaId = areaId;
  }

  addEntity(entity: EntityBase) {
    this.entities.set(entity.id, entity);
  }

  removeEntity(entityId: EntityId): EntityBase | undefined {
    const entity = this.entities.get(entityId);
    this.entities.delete(entityId);
    return entity;
  }

  moveEntity(entityId: EntityId, pos: Vector2) {
    const entity = this.entities.get(entityId);
    if (entity) {
      entity.pos = pos;
    }
  }

  getEntity(entityId: EntityId) {
    return this.entities.get(entityId);
  }

  getEntities(): EntityBase[] {
    return Array.from(this.entities.values());
  }

  countPlayers(): number {
    return Array.from(this.entities.values()).filter((entity) => entity.kind === 'player').length;
  }
}
