import { describe, it, expect } from 'vitest';
import {
  pickLadderPosition,
  calcLadderX,
  calcTileCount,
  generateLadderLayout,
  LADDER_RENDERED_SIZE,
  type CardRect,
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
 * pickLadderPosition
 */
describe('pickLadderPosition', () => {
  it('returns cardIndex 0 and side left when rng is below 0.5', () => {
    const rng = makeRng(0.3);
    const result = pickLadderPosition(rng);
    expect(result.cardIndex).toBe(0);
    expect(result.side).toBe('left');
  });

  it('returns cardIndex 2 and side right when rng is 0.5 or above', () => {
    const rng = makeRng(0.5);
    const result = pickLadderPosition(rng);
    expect(result.cardIndex).toBe(2);
    expect(result.side).toBe('right');
  });

  it('never returns leftmost card with right side', () => {
    const rng = makeRng(0.1);
    const result = pickLadderPosition(rng);
    expect(result.cardIndex === 0 && result.side === 'right').toBe(false);
  });

  it('never returns rightmost card with left side', () => {
    const rng = makeRng(0.9);
    const result = pickLadderPosition(rng);
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
 * generateLadderLayout
 */
describe('generateLadderLayout', () => {
  const cards = [LEFT_CARD, MIDDLE_CARD, RIGHT_CARD];

  it('returns a layout with the correct card index and side', () => {
    const rng = makeRng(0.3);
    const layout = generateLadderLayout(cards, GROUND_TOP_Y, rng);
    expect(layout.cardIndex).toBe(0);
    expect(layout.side).toBe('left');
  });

  it('sets topY to the card top', () => {
    const rng = makeRng(0.3, 0.3);
    const layout = generateLadderLayout(cards, GROUND_TOP_Y, rng);
    expect(layout.topY).toBe(LEFT_CARD.top);
  });

  it('sets bottomY to groupTopY', () => {
    const rng = makeRng(0.3, 0.3);
    const layout = generateLadderLayout(cards, GROUND_TOP_Y, rng);
    expect(layout.bottomY).toBe(GROUND_TOP_Y);
  });

  it('tileCount covers the full vertical span', () => {
    const rng = makeRng(0.3, 0.3);
    const layout = generateLadderLayout(cards, GROUND_TOP_Y, rng);
    const span = layout.bottomY - layout.topY;
    expect(layout.tileCount * LADDER_RENDERED_SIZE).toBeGreaterThanOrEqual(
      span
    );
  });

  it('ladder x sits immediately outside the chosen card boundary', () => {
    const rng = makeRng(0.3);
    const layout = generateLadderLayout(cards, GROUND_TOP_Y, rng);
    // Left card, left side — ladder should be to the left of the card
    expect(layout.x).toBeLessThan(LEFT_CARD.left);
  });

  it('works correctly for rightmost card on right side', () => {
    const rng = makeRng(0.5);
    const layout = generateLadderLayout(cards, GROUND_TOP_Y, rng);
    expect(layout.cardIndex).toBe(2);
    expect(layout.side).toBe('right');
    // Ladder should be to the right of the card
    expect(layout.x).toBeCloseTo(RIGHT_CARD.right + LADDER_RENDERED_SIZE / 2);
  });
});
