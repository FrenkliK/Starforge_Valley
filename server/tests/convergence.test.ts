import { describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';
import { World } from '../src/world.js';
import { ConvergenceEngine } from '../src/convergenceEngine.js';
import { ModerationLogger } from '../src/moderationLogger.js';

const createSocket = () =>
  ({
    OPEN: 1,
    readyState: 1,
    send: vi.fn()
  }) as unknown as WebSocket;

const createPlayer = (world: World, name: string) => {
  const session = world.createSession(createSocket());
  world.spawnPlayer(session, name, false);
  return session;
};

describe('ConvergenceEngine', () => {
  it('never links safehouse-only populations', () => {
    const world = new World(1);
    const moderation = new ModerationLogger();
    const convergence = new ConvergenceEngine(world, 1, true, moderation);
    const sessionA = createPlayer(world, 'A');
    const sessionB = createPlayer(world, 'B');

    convergence.tick(5000);

    expect(sessionA.player?.areaId).toBe('safehouse');
    expect(sessionB.player?.areaId).toBe('safehouse');
  });

  it('enforces soft caps by spilling over', () => {
    const world = new World(2);
    const meadowInstance = world.ensureInstance('meadow');
    const sessions = Array.from({ length: 5 }).map((_, index) => createPlayer(world, `P${index}`));

    for (const session of sessions) {
      if (!session.player) continue;
      world.removeEntity(session.instance!, session.player.id);
      session.instance = meadowInstance;
      session.player.areaId = 'meadow';
      meadowInstance.addEntity(session.player);
    }

    world.enforceSoftCap('meadow');

    const instances = world.getInstances('meadow');
    const maxPlayers = Math.max(...instances.map((instance) => instance.countPlayers()));
    expect(maxPlayers).toBeLessThanOrEqual(world.getAreaConfig('meadow').softCap);
  });
});
