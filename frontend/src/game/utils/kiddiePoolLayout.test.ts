import { describe, it, expect } from 'vitest';
import {
  resolvePoolSide,
  calcPoolX,
  calcPoolY,
  calcSplashTier,
  isEntryFromAbove,
  calcPoolBounds,
  POOL_WIDTH,
  POOL_INSET_RATIO,
  POOL_HEIGHT,
  POOL_GROUND_EMBED,
  SPLASH_THRESHOLD_MEDIUM,
  SPLASH_THRESHOLD_LARGE,
} from './kiddiePoolLayout';
import type { LadderDecision } from './ladderLayout';

describe('resolvePoolSide', () => {
  it('returns card index 2 right side when ladder is on card 0 left', () => {
    const ladder: LadderDecision = { cardIndex: 0, side: 'left' };
    const result = resolvePoolSide(ladder);
    expect(result).toEqual({ cardIndex: 2, side: 'right' });
  });

  it('returns card index 0 left side when ladder is on card 2 right', () => {
    const ladder: LadderDecision = { cardIndex: 2, side: 'right' };
    const result = resolvePoolSide(ladder);
    expect(result).toEqual({ cardIndex: 0, side: 'left' });
  });
});

describe('calcPoolX', () => {
  it('places pool centre to the right of card.right when side is right', () => {
    const card = { left: 100, right: 500, top: 200 };
    const result = calcPoolX(card, 'right');
    const expectedOffset = POOL_WIDTH / 2 - POOL_WIDTH * POOL_INSET_RATIO;
    expect(result).toBeCloseTo(card.right + expectedOffset);
  });

  it('places pool centre to the left of card.left when side is left', () => {
    const card = { left: 100, right: 500, top: 200 };
    const result = calcPoolX(card, 'left');
    const expectedOffset = POOL_WIDTH / 2 - POOL_WIDTH * POOL_INSET_RATIO;
    expect(result).toBeCloseTo(card.left - expectedOffset);
  });

  it('pool overlaps card by POOL_INSET_RATIO fraction of pool width on right side', () => {
    const card = { left: 100, right: 500, top: 200 };
    const result = calcPoolX(card, 'right');
    const poolLeftEdge = result - POOL_WIDTH / 2;
    const overlapAmount = card.right - poolLeftEdge;
    expect(overlapAmount).toBeCloseTo(POOL_WIDTH * POOL_INSET_RATIO);
  });

  it('pool overlaps card by POOL_INSET_RATIO fraction of pool width on left side', () => {
    const card = { left: 100, right: 500, top: 200 };
    const result = calcPoolX(card, 'left');
    const poolRightEdge = result + POOL_WIDTH / 2;
    const overlapAmount = poolRightEdge - card.left;
    expect(overlapAmount).toBeCloseTo(POOL_WIDTH * POOL_INSET_RATIO);
  });
});

describe('calcPoolY', () => {
  it('returns correct Y position embedded into ground', () => {
    const groundTopY = 500;
    const result = calcPoolY(groundTopY);
    expect(result).toBe(groundTopY - POOL_HEIGHT + POOL_GROUND_EMBED);
  });

  it('pool top is above the ground top (pool is not fully below ground)', () => {
    const groundTopY = 500;
    const result = calcPoolY(groundTopY);
    expect(result).toBeLessThan(groundTopY);
  });
});

describe('calcSplashTier', () => {
  it('returns small when fall distance is below medium threshold', () => {
    expect(calcSplashTier(0)).toBe('small');
    expect(calcSplashTier(50)).toBe('small');
    expect(calcSplashTier(SPLASH_THRESHOLD_MEDIUM - 1)).toBe('small');
  });

  it('returns medium at the medium threshold boundary', () => {
    expect(calcSplashTier(SPLASH_THRESHOLD_MEDIUM)).toBe('medium');
  });

  it('returns medium between medium and large thresholds', () => {
    expect(calcSplashTier(SPLASH_THRESHOLD_MEDIUM + 1)).toBe('medium');
  });

  it('returns large at the large threshold boundary', () => {
    expect(calcSplashTier(SPLASH_THRESHOLD_LARGE)).toBe('large');
  });

  it('returns large above the large threshold', () => {
    expect(calcSplashTier(SPLASH_THRESHOLD_LARGE + 1)).toBe('large');
    expect(calcSplashTier(500)).toBe('large');
  });
});

describe('isEntryFromAbove', () => {
  it('returns true when player Y is at or above pool rim and moving downward', () => {
    expect(isEntryFromAbove(200, 210, 50)).toBe(true);
  });

  it('returns true when player Y equals pool rim Y and moving downward', () => {
    expect(isEntryFromAbove(210, 210, 10)).toBe(true);
  });

  it('returns false when player Y is below pool rim', () => {
    expect(isEntryFromAbove(300, 210, 50)).toBe(false);
  });

  it('returns false when vertical velocity is zero', () => {
    expect(isEntryFromAbove(200, 210, 0)).toBe(false);
  });

  it('returns false when vertical velocity is negative (moving upward)', () => {
    expect(isEntryFromAbove(200, 210, -50)).toBe(false);
  });
});

describe('calcPoolBounds', () => {
  it('returns correct left and right bounds from pool centre', () => {
    const result = calcPoolBounds(200);
    expect(result.left).toBeCloseTo(200 - POOL_WIDTH / 2);
    expect(result.right).toBeCloseTo(200 + POOL_WIDTH / 2);
  });

  it('bounds width equals POOL_WIDTH', () => {
    const result = calcPoolBounds(200);
    expect(result.right - result.left).toBeCloseTo(POOL_WIDTH);
  });
});
