import type { WebSocket } from 'ws';
import {
  type AreaConfig,
  type AreaId,
  type ClientMessage,
  type EntityBase,
  type EntityId,
  type ServerMessage,
  type Vector2
} from '../../shared/src/types.js';
import { clamp } from '../../shared/src/utils.js';
import { Instance } from './instance.js';
import type { VoiceRouter } from './voiceRouter.js';
import type { BotManager } from './botManager.js';
import type { ConvergenceEngine } from './convergenceEngine.js';

export type PlayerEntity = EntityBase & {
  kind: 'player';
  name: string;
  optOutLinking: boolean;
  health: number;
};

export type Session = {
  id: EntityId;
  socket: WebSocket;
  player?: PlayerEntity;
  instance?: Instance;
  muted: Set<EntityId>;
  lastSpeakAt: number;
  send: (message: ServerMessage) => void;
};

export class World {
  readonly areas: AreaConfig[] = [
    { id: 'safehouse', type: 'safehouse', softCap: 1, convergenceWeight: 0 },
    { id: 'meadow', type: 'field', softCap: 4, convergenceWeight: 1.2 },
    { id: 'forest', type: 'field', softCap: 4, convergenceWeight: 1.5 },
    { id: 'ruins', type: 'dungeon', softCap: 3, convergenceWeight: 2.2 }
  ];

  private sessions = new Map<EntityId, Session>();
  private instancesByArea = new Map<AreaId, Instance[]>();
  private instanceCounter = 0;
  private playerCounter = 0;

  constructor(private seed: number) {
    for (const area of this.areas) {
      this.instancesByArea.set(area.id, []);
    }
  }

  createSession(socket: WebSocket): Session {
    const id = `player-${++this.playerCounter}`;
    const session: Session = {
      id,
      socket,
      muted: new Set(),
      lastSpeakAt: 0,
      send: (message) => {
        if (socket.readyState === socket.OPEN) {
          socket.send(JSON.stringify(message));
        }
      }
    };
    this.sessions.set(id, session);
    return session;
  }

  removeSession(session: Session) {
    if (session.instance && session.player) {
      this.removeEntity(session.instance, session.player.id);
    }
    this.sessions.delete(session.id);
  }

  getAreaConfig(areaId: AreaId): AreaConfig {
    const area = this.areas.find((entry) => entry.id === areaId);
    if (!area) {
      throw new Error(`Unknown area: ${areaId}`);
    }
    return area;
  }

  getInstances(areaId: AreaId): Instance[] {
    return this.instancesByArea.get(areaId) ?? [];
  }

  getInstanceById(instanceId: string): Instance | undefined {
    for (const instances of this.instancesByArea.values()) {
      const found = instances.find((instance) => instance.id === instanceId);
      if (found) return found;
    }
    return undefined;
  }

  isSafehouse(areaId: AreaId): boolean {
    return this.getAreaConfig(areaId).type === 'safehouse';
  }

  tick(_deltaMs: number) {
    // placeholder for future simulation.
  }

  handleClientMessage(
    session: Session,
    message: ClientMessage,
    voiceRouter: VoiceRouter,
    botManager: BotManager,
    convergence: ConvergenceEngine
  ) {
    switch (message.type) {
      case 'Hello':
        if (session.player) {
          return;
        }
        this.spawnPlayer(session, message.data.name, message.data.optOutLinking);
        return;
      case 'EnterArea':
        if (!session.player) return;
        this.movePlayerToArea(session, message.data.areaId, 'manual');
        return;
      case 'Move':
        if (!session.player || !session.instance) return;
        this.moveEntity(session.instance, session.player.id, message.data.pos);
        return;
      case 'Speak':
        if (!session.player || !session.instance) return;
        if (!this.validateSpeak(session, message.data.frames)) return;
        voiceRouter.routeVoice(session, message.data);
        botManager.onPlayerSpoke(session, message.data);
        return;
      case 'UseItem':
        if (!session.player) return;
        if (message.data.itemId === 'SeverLink') {
          session.player.optOutLinking = true;
          this.movePlayerToArea(session, 'safehouse', 'sever');
          session.send({
            type: 'Notice',
            data: { type: 'info', message: 'You feel a calm isolation settle in.' }
          });
        }
        return;
      case 'MuteSpeaker':
        if (message.data.muted) {
          session.muted.add(message.data.speakerId);
        } else {
          session.muted.delete(message.data.speakerId);
        }
        return;
      case 'ReportSpeaker':
        convergence.reportSpeaker(session, message.data.speakerId, message.data.reason);
        return;
      default:
        return;
    }
  }

  spawnPlayer(session: Session, name: string, optOutLinking: boolean) {
    const player: PlayerEntity = {
      id: session.id,
      kind: 'player',
      pos: { x: 0, y: 0 },
      areaId: 'safehouse',
      name,
      optOutLinking,
      health: 100
    };
    session.player = player;
    const instance = this.ensureInstance('safehouse');
    session.instance = instance;
    instance.addEntity(player);
    session.send({ type: 'Welcome', data: { playerId: player.id } });
    session.send({
      type: 'WorldState',
      data: { areaId: instance.areaId, entities: instance.getEntities() }
    });
    this.broadcastToInstance(instance, {
      type: 'EntityJoined',
      data: { entity: player }
    }, player.id);
  }

  movePlayerToArea(session: Session, areaId: AreaId, reason: 'manual' | 'convergence' | 'sever') {
    if (!session.player) return;
    if (this.isSafehouse(areaId) && reason === 'convergence') return;

    const instance = this.ensureInstance(areaId);
    this.movePlayerToInstance(session, instance);
  }

  movePlayerToInstance(session: Session, instance: Instance) {
    if (!session.player) return;
    if (session.instance) {
      this.removeEntity(session.instance, session.player.id);
    }
    session.instance = instance;
    session.player.areaId = instance.areaId;
    session.player.pos = { x: 0, y: 0 };
    instance.addEntity(session.player);
    session.send({
      type: 'WorldState',
      data: { areaId: instance.areaId, entities: instance.getEntities() }
    });
    this.broadcastToInstance(
      instance,
      {
        type: 'EntityJoined',
        data: { entity: session.player }
      },
      session.player.id
    );
  }

  moveEntity(instance: Instance, entityId: EntityId, pos: Vector2) {
    instance.moveEntity(entityId, pos);
    this.broadcastToInstance(instance, {
      type: 'EntityMoved',
      data: { entityId, pos }
    }, entityId);
  }

  removeEntity(instance: Instance, entityId: EntityId) {
    const entity = instance.removeEntity(entityId);
    if (entity) {
      this.broadcastToInstance(instance, {
        type: 'EntityLeft',
        data: { entityId }
      }, entityId);
    }
  }

  broadcastToInstance(instance: Instance, message: ServerMessage, exceptId?: EntityId) {
    for (const session of this.sessions.values()) {
      if (session.instance?.id === instance.id && session.id !== exceptId) {
        session.send(message);
      }
    }
  }

  getSessionById(playerId: EntityId): Session | undefined {
    return this.sessions.get(playerId);
  }

  ensureInstance(areaId: AreaId): Instance {
    const instances = this.instancesByArea.get(areaId);
    if (!instances) throw new Error(`Unknown area ${areaId}`);
    const instance = new Instance(`instance-${++this.instanceCounter}`, areaId);
    instances.push(instance);
    return instance;
  }

  findInstanceByPlayer(playerId: EntityId): Instance | undefined {
    for (const instances of this.instancesByArea.values()) {
      const found = instances.find((instance) => instance.getEntity(playerId));
      if (found) return found;
    }
    return undefined;
  }

  getSessionsInInstance(instance: Instance): Session[] {
    return Array.from(this.sessions.values()).filter((session) => session.instance?.id === instance.id);
  }

  enforceSoftCap(areaId: AreaId) {
    const area = this.getAreaConfig(areaId);
    const instances = this.getInstances(areaId);
    for (const instance of instances) {
      const playerSessions = this.getSessionsInInstance(instance);
      if (playerSessions.length <= area.softCap) continue;
      const overflow = playerSessions.slice(area.softCap);
      for (const session of overflow) {
        if (!session.player) continue;
        this.movePlayerToArea(session, areaId, 'convergence');
      }
    }
  }

  getPlayerSessions(): Session[] {
    return Array.from(this.sessions.values()).filter((session) => session.player);
  }

  applyDamage(targetId: EntityId, amount: number, sourceId: EntityId) {
    const session = this.sessions.get(targetId);
    if (!session?.player || !session.instance) return;
    session.player.health = clamp(session.player.health - amount, 0, 100);
    session.send({
      type: 'DamageEvent',
      data: { sourceId, amount }
    });
    if (session.player.health <= 0) {
      this.movePlayerToArea(session, 'safehouse', 'sever');
    }
  }

  validateSpeak(session: Session, frames: string): boolean {
    const now = Date.now();
    if (now - session.lastSpeakAt < 500) {
      return false;
    }
    session.lastSpeakAt = now;
    if (frames.length > 4096) {
      return false;
    }
    return true;
  }
}
