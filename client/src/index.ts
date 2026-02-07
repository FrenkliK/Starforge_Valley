import { HeadlessClient } from './headlessClient.js';

const args = process.argv.slice(2);
const getArg = (name: string, fallback?: string) => {
  const index = args.findIndex((arg) => arg === `--${name}`);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
};

const name = getArg('name', 'Wanderer') ?? 'Wanderer';
const url = getArg('url', 'ws://localhost:8080') ?? 'ws://localhost:8080';
const optOutLinking = args.includes('--optOut');

const client = new HeadlessClient({ name, url, optOutLinking });

client.on('stranger', (entity) => {
  console.log(`[${name}] sees Stranger ${entity.id} in ${entity.areaId}`);
});

client.on('voice', (frame) => {
  console.log(`[${name}] hears voice from ${frame.speakerId}`);
});

client.on('quest', (quest) => {
  console.log(`[${name}] quest offer: ${quest.title}`);
});

client.on('damage', (event) => {
  console.log(`[${name}] took damage ${event.amount} from ${event.sourceId}`);
});

client.connect().then(() => {
  client.startSimulation();
});
