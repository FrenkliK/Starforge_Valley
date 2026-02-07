import { describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';
import { World } from '../src/world.js';
import { BotManager } from '../src/botManager.js';
import { ModerationLogger } from '../src/moderationLogger.js';

const createSocket = () =>
  ({
    OPEN: 1,
    readyState: 1,
    send: vi.fn()
  }) as unknown as WebSocket;

const createPlayerSession = (world: World) => {
  const session = world.createSession(createSocket());
  world.spawnPlayer(session, 'Tester', false);
  world.movePlayerToArea(session, 'meadow', 'manual');
  return session;
};

describe('BotManager suspicion', () => {
  it('escalates moods based on suspicion thresholds', () => {
    const world = new World(3);
    const botManager = new BotManager(world, new ModerationLogger(), 3, true);
    const session = createPlayerSession(world);
    const instance = session.instance!;

    botManager.spawnBotForTest(instance.id, 'meadow');
    const bot = botManager.getBotsInInstance(instance.id)[0]!;

    for (let i = 0; i < 3; i += 1) {
      botManager.onPlayerSpoke(session, { frames: 'x', durationMs: 100, transcriptHint: 'are you real' });
    }
    expect(bot.mood).toBe('evasive');

    for (let i = 0; i < 3; i += 1) {
      botManager.onPlayerSpoke(session, { frames: 'x', durationMs: 100, transcriptHint: 'bot' });
    }
    expect(bot.mood).toBe('mislead');

    for (let i = 0; i < 3; i += 1) {
      botManager.onPlayerSpoke(session, { frames: 'x', durationMs: 100, transcriptHint: 'real' });
    }
    expect(bot.mood).toBe('hostile');
  });
});
