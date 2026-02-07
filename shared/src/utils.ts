import type { Vector2 } from './types.js';

export const toBase64 = (data: Uint8Array): string => Buffer.from(data).toString('base64');
export const fromBase64 = (data: string): Uint8Array => new Uint8Array(Buffer.from(data, 'base64'));

export const distance = (a: Vector2, b: Vector2): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const mulberry32 = (seed: number): (() => number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const randomChoice = <T>(values: T[], rng: () => number): T =>
  values[Math.floor(rng() * values.length)];

export const randomBetween = (min: number, max: number, rng: () => number): number =>
  min + (max - min) * rng();
