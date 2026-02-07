import type { ClientSpeak, EntityId } from '../../shared/src/types.js';
import { distance } from '../../shared/src/utils.js';
import type { World, Session } from './world.js';
import type { ModerationLogger } from './moderationLogger.js';

export class VoiceRouter {
  constructor(private world: World, private moderation: ModerationLogger) {}

  routeVoice(session: Session, speak: ClientSpeak) {
    if (!session.player || !session.instance) return;
    const speaker = session.player;
    const instance = session.instance;
    const entities = instance.getEntities();

    for (const entity of entities) {
      if (entity.id === speaker.id) continue;
      if (distance(entity.pos, speaker.pos) > 10) continue;
      const listenerSession = this.world.getSessionById(entity.id);
      if (!listenerSession || listenerSession.muted.has(speaker.id)) continue;
      listenerSession.send({
        type: 'VoiceFrame',
        data: {
          speakerId: speaker.id,
          frames: speak.frames,
          durationMs: speak.durationMs
        }
      });
      this.moderation.logVoiceSession(speaker.id, entity.id);
    }
  }

  sendBotVoice(botId: EntityId, instanceId: string, frames: string, durationMs: number) {
    const instance = this.world.getInstanceById(instanceId);
    if (!instance) return;
    for (const session of this.world.getSessionsInInstance(instance)) {
      if (session.muted.has(botId)) continue;
      session.send({
        type: 'VoiceFrame',
        data: { speakerId: botId, frames, durationMs }
      });
      this.moderation.logVoiceSession(botId, session.id);
    }
  }
}
