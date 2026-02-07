import { EventEmitter } from 'node:events';
import WebSocket from 'ws';
import {
  type ClientMessage,
  type EntityBase,
  type ServerMessage,
  type Vector2
} from '../../shared/src/types.js';
import { randomBetween, toBase64 } from '../../shared/src/utils.js';

export type HeadlessClientConfig = {
  name: string;
  url: string;
  optOutLinking: boolean;
};

export class HeadlessClient extends EventEmitter {
  private socket?: WebSocket;
  private playerId?: string;
  private entities = new Map<string, EntityBase>();
  private areaId = 'safehouse';
  private speakInterval?: NodeJS.Timeout;
  private moveInterval?: NodeJS.Timeout;
  private travelInterval?: NodeJS.Timeout;

  constructor(private config: HeadlessClientConfig) {
    super();
  }

  async connect() {
    this.socket = new WebSocket(this.config.url);
    await new Promise<void>((resolve) => {
      this.socket?.on('open', () => resolve());
    });
    this.send({
      type: 'Hello',
      data: { name: this.config.name, optOutLinking: this.config.optOutLinking }
    });

    this.socket.on('message', (data) => {
      const message = JSON.parse(data.toString()) as ServerMessage;
      this.handleMessage(message);
    });
  }

  startSimulation() {
    this.moveInterval = setInterval(() => this.randomWalk(), 700);
    this.speakInterval = setInterval(() => this.randomSpeak(), 2500);
    this.travelInterval = setInterval(() => this.randomTravel(), 8000);
  }

  stop() {
    this.moveInterval && clearInterval(this.moveInterval);
    this.speakInterval && clearInterval(this.speakInterval);
    this.travelInterval && clearInterval(this.travelInterval);
    this.socket?.close();
  }

  getSeenStrangers(): EntityBase[] {
    return Array.from(this.entities.values()).filter((entity) => entity.id !== this.playerId);
  }

  enterArea(areaId: string) {
    this.send({ type: 'EnterArea', data: { areaId } });
  }

  private handleMessage(message: ServerMessage) {
    switch (message.type) {
      case 'Welcome':
        this.playerId = message.data.playerId;
        this.emit('welcome', message.data.playerId);
        break;
      case 'WorldState':
        this.areaId = message.data.areaId;
        this.entities.clear();
        for (const entity of message.data.entities) {
          this.entities.set(entity.id, entity);
        }
        this.emit('world', message.data.areaId);
        break;
      case 'EntityJoined':
        this.entities.set(message.data.entity.id, message.data.entity);
        if (message.data.entity.id !== this.playerId) {
          this.emit('stranger', message.data.entity);
        }
        break;
      case 'EntityLeft':
        this.entities.delete(message.data.entityId);
        break;
      case 'EntityMoved':
        const entity = this.entities.get(message.data.entityId);
        if (entity) {
          entity.pos = message.data.pos;
        }
        break;
      case 'VoiceFrame':
        this.emit('voice', message.data);
        break;
      case 'QuestOffer':
        this.emit('quest', message.data);
        break;
      case 'DamageEvent':
        this.emit('damage', message.data);
        break;
      case 'Notice':
        this.emit('notice', message.data);
        break;
      default:
        break;
    }
  }

  private randomWalk() {
    const pos: Vector2 = {
      x: randomBetween(-8, 8, Math.random),
      y: randomBetween(-8, 8, Math.random)
    };
    this.send({ type: 'Move', data: { pos } });
  }

  private randomSpeak() {
    const phrases = [
      'Anyone out there?',
      'Looking for the river.',
      'Are you real?',
      'Need help?',
      'Quiet night.'
    ];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    const frames = toBase64(new TextEncoder().encode(phrase));
    this.send({
      type: 'Speak',
      data: { frames, durationMs: 900, transcriptHint: phrase }
    });
  }

  private randomTravel() {
    const areas = ['meadow', 'forest', 'ruins'];
    const areaId = areas[Math.floor(Math.random() * areas.length)];
    if (areaId === this.areaId) return;
    this.send({ type: 'EnterArea', data: { areaId } });
  }

  private send(message: ClientMessage) {
    this.socket?.send(JSON.stringify(message));
  }
}
