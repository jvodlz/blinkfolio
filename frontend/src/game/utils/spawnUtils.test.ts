import { describe, it, expect } from 'vitest';
import { randomSpawnType, randomDirection } from './spawnUtils';

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
