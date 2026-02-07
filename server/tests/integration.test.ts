import { describe, expect, it } from 'vitest';
import { createServer } from '../src/server.js';
import { HeadlessClient } from '../../client/src/headlessClient.js';

const waitFor = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('integration: convergence', () => {
  it('converges at least one client pair in debug mode', async () => {
    const server = createServer({
      port: 0,
      seed: 42,
      debugConvergence: true,
      enableBots: false,
      enableLinking: true
    });

    const url = `ws://localhost:${server.port()}`;
    const clients = [
      new HeadlessClient({ name: 'Alice', url, optOutLinking: false }),
      new HeadlessClient({ name: 'Bob', url, optOutLinking: false }),
      new HeadlessClient({ name: 'Cara', url, optOutLinking: false })
    ];

    for (const client of clients) {
      await client.connect();
      client.enterArea('meadow');
      client.startSimulation();
    }

    const convergenceSeen = await Promise.race([
      new Promise<boolean>((resolve) => {
        for (const client of clients) {
          client.on('stranger', () => resolve(true));
        }
      }),
      waitFor(12000).then(() => false)
    ]);

    for (const client of clients) {
      client.stop();
    }
    server.stop();

    expect(convergenceSeen).toBe(true);
  });
});
