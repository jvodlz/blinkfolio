import { describe, it, expect } from 'vitest';
import {
  pickLadderDecision,
  calcLadderX,
  calcTileCount,
  generateLadderDecision,
  resolveLadderLayout,
  LADDER_RENDERED_SIZE,
  type CardRect,
  type LadderDecision,
} from './ladderLayout';

// Helpers
function makeRng(...values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

const LEFT_CARD: CardRect = { left: 100, right: 300, top: 200 };
const RIGHT_CARD: CardRect = { left: 700, right: 900, top: 200 };
const MIDDLE_CARD: CardRect = { left: 400, right: 600, top: 200 };
const GROUND_TOP_Y = 600;

/**
 * pickLadderDecision
 */
describe('pickLadderDecision', () => {
  it('returns cardIndex 0 and side left when rng is below 0.5', () => {
    const rng = makeRng(0.3);
    const result = pickLadderDecision(rng);
    expect(result.cardIndex).toBe(0);
    expect(result.side).toBe('left');
  });

  it('returns cardIndex 2 and side right when rng is 0.5 or above', () => {
    const rng = makeRng(0.5);
    const result = pickLadderDecision(rng);
    expect(result.cardIndex).toBe(2);
    expect(result.side).toBe('right');
  });

  it('never returns leftmost card with right side', () => {
    const rng = makeRng(0.1);
    const result = pickLadderDecision(rng);
    expect(result.cardIndex === 0 && result.side === 'right').toBe(false);
  });

  it('never returns rightmost card with left side', () => {
    const rng = makeRng(0.9);
    const result = pickLadderDecision(rng);
    expect(result.cardIndex === 2 && result.side === 'left').toBe(false);
  });
});

/**
 * calcLadderX
 */
describe('calcLadderX', () => {
  it('positions ladder centre half a tile left of card left edge', () => {
    const x = calcLadderX(LEFT_CARD, 'left');
    expect(x).toBeCloseTo(LEFT_CARD.left - LADDER_RENDERED_SIZE / 2);
  });

  it('positions ladder centre half a tile right of card right edge', () => {
    const x = calcLadderX(RIGHT_CARD, 'right');
    expect(x).toBeCloseTo(RIGHT_CARD.right + LADDER_RENDERED_SIZE / 2);
  });

  it('ladder x sits fully outside card boundary on left side', () => {
    const x = calcLadderX(LEFT_CARD, 'left');
    expect(x).toBeLessThan(LEFT_CARD.left);
  });

  it('ladder x sits fully outside card boundary on right side', () => {
    const x = calcLadderX(RIGHT_CARD, 'right');
    expect(x).toBeGreaterThan(RIGHT_CARD.right);
  });
});

/**
 * calcTileCount
 */
describe('calcTileCount', () => {
  it('returns correct tile count for an exact multilple tile size', () => {
    const span = LADDER_RENDERED_SIZE * 5;
    expect(calcTileCount(0, span)).toBe(5);
  });

  it('rounds up when span is not an exact multiple', () => {
    const span = LADDER_RENDERED_SIZE * 3 + 1;
    expect(calcTileCount(0, span)).toBe(4);
  });

  it('returns 0 when bottomY is above or equal to topY', () => {
    expect(calcTileCount(500, 500)).toBe(0);
    expect(calcTileCount(600, 400)).toBe(0);
  });

  it('always covers the full span without a gap at the bottom', () => {
    const topY = 200;
    const bottomY = 600;
    const count = calcTileCount(topY, bottomY);
    expect(count * LADDER_RENDERED_SIZE).toBeGreaterThanOrEqual(bottomY - topY);
  });
});

/**
 * resolveLadderLayout
 */
describe('resolveLadderLayout', () => {
  const cards = [LEFT_CARD, MIDDLE_CARD, RIGHT_CARD];

  const leftDecision: LadderDecision = { cardIndex: 0, side: 'left' };
  const rightDecision: LadderDecision = { cardIndex: 2, side: 'right' };

  it('returns correct x for left card decision', () => {
    const layout = resolveLadderLayout(leftDecision, cards, GROUND_TOP_Y);
    expect(layout.x).toBeCloseTo(LEFT_CARD.left - LADDER_RENDERED_SIZE / 2);
  });

  it('sets topY to the chosen card top', () => {
    const layout = resolveLadderLayout(leftDecision, cards, GROUND_TOP_Y);
    expect(layout.topY).toBe(LEFT_CARD.top);
  });

  it('sets bottomY to groundTopY minus one full tile', () => {
    const layout = resolveLadderLayout(leftDecision, cards, GROUND_TOP_Y);
    expect(layout.bottomY).toBeCloseTo(GROUND_TOP_Y - LADDER_RENDERED_SIZE);
  });

  it('tileCount covers the full vertical span', () => {
    const layout = resolveLadderLayout(leftDecision, cards, GROUND_TOP_Y);
    const span = layout.bottomY - layout.topY;
    expect(layout.tileCount * LADDER_RENDERED_SIZE).toBeGreaterThanOrEqual(
      span
    );
  });

  it('ladder x sits immediately outside the left card boundary', () => {
    const layout = resolveLadderLayout(leftDecision, cards, GROUND_TOP_Y);
    expect(layout.x).toBeLessThan(LEFT_CARD.left);
  });

  it('works correctly for rightmost card on right side', () => {
    const layout = resolveLadderLayout(rightDecision, cards, GROUND_TOP_Y);
    expect(layout.x).toBeCloseTo(RIGHT_CARD.right + LADDER_RENDERED_SIZE / 2);
    expect(layout.topY).toBe(RIGHT_CARD.top);
  });
});

/**
 * generateLadderDecision
 */
describe('generateLadderDecision', () => {
  it('returns a valid decision from the rng', () => {
    const rng = makeRng(0.3);
    const decision = generateLadderDecision(rng);
    expect(decision.cardIndex).toBe(0);
    expect(decision.side).toBe('left');
  });
});
