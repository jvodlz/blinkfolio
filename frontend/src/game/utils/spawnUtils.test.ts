import { describe, it, expect } from 'vitest';
import {
  randomSpawnType,
  randomDirection,
  randomFlowerKey,
} from './spawnUtils';

// Deterministic RNG helpers for tests
const alwaysLow = () => 0;
const alwaysHigh = () => 0.999;

describe('randomSpawnType', () => {
  it('returns flower when rng is below 0.5', () => {
    const rng = alwaysLow;
    const result = randomSpawnType(rng);
    expect(result).toBe('flower');
  });

  it('return enemy when rng is 0.5 or above', () => {
    const rng = alwaysHigh;
    const result = randomSpawnType(rng);
    expect(result).toBe('enemy');
  });
});

describe('randomDirection', () => {
  it('returns left when rng is below 0.5', () => {
    const rng = alwaysLow;
    const result = randomDirection(rng);
    expect(result).toBe('left');
  });

  it('returns right when rng is 0.5 or above', () => {
    const rng = alwaysHigh;
    const result = randomDirection(rng);
    expect(result).toBe('right');
  });
});

describe('randomFlowerKey', () => {
  const keys = [
    'flower_1',
    'flower_2',
    'flower_3',
    'flower_4',
    'flower_5',
    'flower_6',
  ];

  it('returns a key that exists in the input array', () => {
    const result = randomFlowerKey(() => 0.5, keys);
    expect(keys).toContain(result);
  });

  it('returns the first key when rng returns 0', () => {
    expect(randomFlowerKey(alwaysLow, keys)).toBe('flower_1');
  });

  it('returns the last key when rng returns just under 1', () => {
    expect(randomFlowerKey(alwaysHigh, keys)).toBe('flower_6');
  });

  it('always returns the only key in a single-element array', () => {
    const singleKeyArray = ['flower_1'];
    expect(randomFlowerKey(alwaysLow, singleKeyArray)).toBe('flower_1');
    expect(randomFlowerKey(alwaysHigh, singleKeyArray)).toBe('flower_1');
  });
});
