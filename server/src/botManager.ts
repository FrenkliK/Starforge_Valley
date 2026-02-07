import type { ClientSpeak, EntityBase, EntityId, Vector2 } from '../../shared/src/types.js';
import { distance, mulberry32, randomChoice, randomBetween, toBase64 } from '../../shared/src/utils.js';
import type { World, Session } from './world.js';
import type { ModerationLogger } from './moderationLogger.js';
import { QuestSystem } from './questSystem.js';

export type BotState = {
  id: EntityId;
  instanceId: string;
  entity: EntityBase;
  suspicion: number;
  mood: 'neutral' | 'evasive' | 'mislead' | 'hostile';
  conversation: 'idle' | 'greeting' | 'quest';
  lastSpokeAt: number;
};

export class BotManager {
  private rng: () => number;
  private bots = new Map<EntityId, BotState>();
  private questSystem: QuestSystem;
  private botCounter = 0;

  constructor(
    private world: World,
    _moderation: ModerationLogger,
    seed: number,
    private enabled: boolean
  ) {
    this.rng = mulberry32(seed + 200);
    this.questSystem = new QuestSystem(this.rng);
  }

  spawnBotForTest(instanceId: string, areaId: string) {
    this.spawnBot(instanceId, areaId);
  }

  tick(_deltaMs: number) {
    if (!this.enabled) return;
    for (const area of this.world.areas) {
      if (area.type === 'safehouse') continue;
      const instances = this.world.getInstances(area.id);
      for (const instance of instances) {
        const sessions = this.world.getSessionsInInstance(instance);
        if (sessions.length === 0) continue;
        const hasBot = instance.getEntities().some((entity) => entity.kind === 'bot');
        if (!hasBot && this.rng() < 0.12) {
          this.spawnBot(instance.id, area.id);
        }
        this.patrolBots(instance.id);
      }
    }
  }

  onPlayerSpoke(session: Session, speak: ClientSpeak) {
    if (!this.enabled || !session.instance || !session.player) return;
    const bots = this.getBotsInInstance(session.instance.id);
    if (bots.length === 0) return;

    for (const bot of bots) {
      if (distance(bot.entity.pos, session.player.pos) > 12) continue;
      if (this.shouldIncreaseSuspicion(speak.transcriptHint)) {
        bot.suspicion += 1;
      }
      bot.suspicion += this.rng() < 0.1 ? 1 : 0;
      this.updateMood(bot);
      this.respond(bot, session, speak.transcriptHint);
    }
  }

  private spawnBot(instanceId: string, areaId: string) {
    const botId = `bot-${++this.botCounter}`;
    const entity: EntityBase = {
      id: botId,
      kind: 'bot',
      pos: { x: randomBetween(-4, 4, this.rng), y: randomBetween(-4, 4, this.rng) },
      areaId,
      name: randomChoice(['Stranger', 'Wanderer', 'Echo'], this.rng)
    };
    const instance = this.world.getInstanceById(instanceId);
    if (!instance) return;
    instance.addEntity(entity);
    this.bots.set(botId, {
      id: botId,
      instanceId,
      entity,
      suspicion: 0,
      mood: 'neutral',
      conversation: 'greeting',
      lastSpokeAt: 0
    });
    this.world.broadcastToInstance(instance, {
      type: 'EntityJoined',
      data: { entity }
    });
  }

  private patrolBots(instanceId: string) {
    const instance = this.world.getInstanceById(instanceId);
    if (!instance) return;
    for (const bot of this.getBotsInInstance(instanceId)) {
      if (this.rng() < 0.4) {
        bot.entity.pos = {
          x: bot.entity.pos.x + randomBetween(-1, 1, this.rng),
          y: bot.entity.pos.y + randomBetween(-1, 1, this.rng)
        };
        this.world.broadcastToInstance(instance, {
          type: 'EntityMoved',
          data: { entityId: bot.id, pos: bot.entity.pos }
        });
      }
    }
  }

  private respond(bot: BotState, session: Session, transcriptHint?: string) {
    const now = Date.now();
    if (now - bot.lastSpokeAt < 2000) return;
    bot.lastSpokeAt = now;

    if (bot.mood === 'hostile') {
      this.world.applyDamage(session.id, 8, bot.id);
      return;
    }

    if (bot.conversation === 'greeting') {
      bot.conversation = 'idle';
      this.sendBotVoice(bot, '...passing through. The meadow hides a quiet river.');
      return;
    }

    if (bot.mood === 'mislead') {
      this.sendBotVoice(bot, 'Go east to the ruins. Or west. Both are empty.');
      return;
    }

    if (bot.mood === 'evasive') {
      this.sendBotVoice(bot, 'Not much to say. The stones already said it.');
      return;
    }

    if (this.rng() < 0.25 && bot.conversation !== 'quest') {
      bot.conversation = 'quest';
      this.questSystem.offerQuest(session, bot.id);
      this.sendBotVoice(bot, 'If you want purpose, follow the whispering glyphs.');
      return;
    }

    if (transcriptHint?.includes('help')) {
      this.sendBotVoice(bot, 'Stay close, but not too close. The forest listens.');
      return;
    }

    this.sendBotVoice(bot, 'The air tastes like copper. I would avoid the ruins.');
  }

  private sendBotVoice(bot: BotState, text: string) {
    const frames = toBase64(new TextEncoder().encode(text));
    const instance = this.world.getInstanceById(bot.instanceId);
    if (!instance) return;
    for (const session of this.world.getSessionsInInstance(instance)) {
      if (!session.player) continue;
      if (distance(session.player.pos, bot.entity.pos) > 12) continue;
      session.send({
        type: 'VoiceFrame',
        data: { speakerId: bot.id, frames, durationMs: 1200 }
      });
    }
  }

  private shouldIncreaseSuspicion(transcriptHint?: string) {
    if (!transcriptHint) return false;
    const lower = transcriptHint.toLowerCase();
    return lower.includes('real') || lower.includes('bot') || lower.includes('who are you');
  }

  private updateMood(bot: BotState) {
    if (bot.suspicion >= 8) {
      bot.mood = 'hostile';
    } else if (bot.suspicion >= 6) {
      bot.mood = 'mislead';
    } else if (bot.suspicion >= 3) {
      bot.mood = 'evasive';
    } else {
      bot.mood = 'neutral';
    }
  }

  getBotsInInstance(instanceId: string): BotState[] {
    return Array.from(this.bots.values()).filter((bot) => bot.instanceId === instanceId);
  }

  getBotState(botId: EntityId): BotState | undefined {
    return this.bots.get(botId);
  }
}
