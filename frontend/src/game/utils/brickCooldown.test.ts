import { describe, it, expect, beforeEach } from 'vitest';
import {
  isCoolingDown,
  markCoolingDown,
  clearCooldown,
  resetAllCooldowns,
} from './brickCooldown';

type FakeBrick = object;

const makeBrick = (): FakeBrick => ({});

describe('brickCooldown', () => {
  // Reset shared WeakMap state between tests
  beforeEach(() => {
    resetAllCooldowns();
  });

  it('fresh brick is not cooling down', () => {
    const brick = makeBrick();
    expect(isCoolingDown(brick)).toBe(false);
  });

  it('brick is cooling down after markCoolingDown', () => {
    const brick = makeBrick();
    markCoolingDown(brick);
    expect(isCoolingDown(brick)).toBe(true);
  });

  it('brick is no longer cooling down after clearCooldown', () => {
    const brick = makeBrick();
    markCoolingDown(brick);
    clearCooldown(brick);
    expect(isCoolingDown(brick)).toBe(false);
  });

  it('clearing a brick that was never marked does not throw', () => {
    const brick = makeBrick();
    expect(() => clearCooldown(brick)).not.toThrow();
  });

  it('two distinct brick objects are tracked independently', () => {
    const brickA = makeBrick();
    const brickB = makeBrick();

    markCoolingDown(brickA);

    expect(isCoolingDown(brickA)).toBe(true);
    expect(isCoolingDown(brickB)).toBe(false);
  });
});
