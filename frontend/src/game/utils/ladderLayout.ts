/**
 * Ladder Layout Utility
 *
 * Calculates the position and tile count for a single ladder per session.
 * The ladder spawns on the left or right edge of either the leftmost or rightmost content card
 * Decided once per page load via seeded RNG
 *
 * No Phaser dependency
 */

export const LADDER_NATIVE_SIZE = 18;
export const LADDER_SCALE = 2.2;
export const LADDER_RENDERED_SIZE = LADDER_NATIVE_SIZE * LADDER_SCALE;

// Viewport threshold
export const LADDER_MIN_WIDTH = 1210;
export const LADDER_MIN_HEIGHT = 195;

// Types
export type LadderSide = 'left' | 'right';

export interface CardRect {
  left: number;
  right: number;
  top: number;
}

export interface LadderDecision {
  cardIndex: number;
  side: LadderSide;
}

export interface LadderLayout {
  x: number;
  topY: number;
  bottomY: number;
  tileCount: number;
}

/**
 * Decides which card and which edge the ladder spawns on
 * Uses the seeded RNG
 *
 * Side is derived by card choice:
 *   - leftmost card (index 0) -> always left edge
 *   - rightmost card (index 2) -> always right edge
 */
export function pickLadderDecision(rng: () => number): LadderDecision {
  const useLeftCard = rng() < 0.5;
  return useLeftCard
    ? { cardIndex: 0, side: 'left' }
    : { cardIndex: 2, side: 'right' };
}

/**
 * Calculates the X centre of the ladder column.
 *
 * Left: ladder centre = card.left - half a rendered tile
 * Right: ladder centre = card.right + half a rendered tile
 *
 * This places the ladder immediately outside the card boundary
 * No overlapping card content
 */
export function calcLadderX(card: CardRect, side: LadderSide): number {
  const halfTile = LADDER_RENDERED_SIZE / 2;
  return side === 'left' ? card.left - halfTile : card.right + halfTile;
}

/**
 * Calculates number of tiles needed to fill vertical span from card top to the ground top
 *
 * Uses Math.ceil so the ladder always reaches the ground
 */
export function calcTileCount(topY: number, bottomY: number): number {
  const span = bottomY - topY;
  if (span <= 0) return 0;
  return Math.ceil(span / LADDER_RENDERED_SIZE);
}

/**
 * Main entry point
 */

/**
 * Generates session-stable ladder from seeded RNG
 *
 * Call once at page load
 * Store the result and reuses on every resize and scroll rebuild
 *
 * @param rng - seeded random function
 */
export function generateLadderDecision(rng: () => number): LadderDecision {
  return pickLadderDecision(rng);
}

/**
 * Resolves full ladder layout from current DOM position
 *
 * Call on every render
 * Reads fresh card rects so the ladder tracks card reflow correctly
 *
 * @param decision - session-stable card/side decision
 * @param cardRects - current bounding rects for all content cards, left to right
 * @param groundTopY - current Y coordinate of the top edge of the ground platform
 */
export function resolveLadderLayout(
  decision: LadderDecision,
  cardRects: CardRect[],
  groundTopY: number
): LadderLayout {
  const card = cardRects[decision.cardIndex];
  const x = calcLadderX(card, decision.side);
  const topY = card.top;
  const bottomY = groundTopY - LADDER_RENDERED_SIZE;
  const tileCount = calcTileCount(topY, bottomY);

  return { x, topY, bottomY, tileCount };
}
