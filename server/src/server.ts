import http from 'node:http';
import { WebSocketServer } from 'ws';
import { World } from './world.js';
import { ConvergenceEngine } from './convergenceEngine.js';
import { VoiceRouter } from './voiceRouter.js';
import { BotManager } from './botManager.js';
import { ModerationLogger } from './moderationLogger.js';
import type { ClientMessage, ServerMessage } from '../../shared/src/types.js';

export type ServerConfig = {
  port: number;
  seed: number;
  debugConvergence: boolean;
  enableBots: boolean;
  enableLinking: boolean;
};

export const createServer = (config: ServerConfig) => {
  const httpServer = http.createServer();
  const wss = new WebSocketServer({ server: httpServer });
  const world = new World(config.seed);
  const moderation = new ModerationLogger();
  const voiceRouter = new VoiceRouter(world, moderation);
  const botManager = new BotManager(world, moderation, config.seed, config.enableBots);
  const convergence = new ConvergenceEngine(world, config.seed, config.debugConvergence, moderation);

  const tickInterval = setInterval(() => {
    world.tick(500);
    if (config.enableLinking) {
      convergence.tick(500);
    }
    botManager.tick(500);
  }, 500);

  wss.on('connection', (socket) => {
    const session = world.createSession(socket);

    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString()) as ClientMessage;
        world.handleClientMessage(session, message, voiceRouter, botManager, convergence);
      } catch (error) {
        session.send({
          type: 'Notice',
          data: { type: 'error', message: 'Malformed message.' }
        } satisfies ServerMessage);
      }
    });

    socket.on('close', () => {
      world.removeSession(session);
    });
  });

  httpServer.listen(config.port);

  return {
    wss,
    world,
    stop: () => {
      clearInterval(tickInterval);
      wss.close();
      httpServer.close();
    },
    port: () => (httpServer.address() && typeof httpServer.address() === 'object'
      ? httpServer.address()!.port
      : config.port)
  };
};
