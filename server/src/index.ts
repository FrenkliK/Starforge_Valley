import { createServer } from './server.js';

const port = Number(process.env.PORT ?? 8080);
const seed = Number(process.env.SEED ?? 42);
const debugConvergence = process.env.DEBUG_CONVERGENCE === '1';
const enableBots = process.env.ENABLE_BOTS !== '0';
const enableLinking = process.env.ENABLE_LINKING !== '0';

createServer({ port, seed, debugConvergence, enableBots, enableLinking });

console.log(`Server listening on ws://localhost:${port}`);
console.log(`Debug convergence: ${debugConvergence ? 'on' : 'off'}`);
console.log(`Bots enabled: ${enableBots ? 'on' : 'off'}`);
console.log(`Linking enabled: ${enableLinking ? 'on' : 'off'}`);
