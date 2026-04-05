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
export const LADDER_MIN_WIDTH = 1218;
export const LADDER_MIN_HEIGHT = 780;

// Types
export type LadderSide = 'left' | 'right';

export interface CardRect {
  left: number;
  right: number;
  top: number;
}

export interface LadderLayout {
  cardIndex: number;
  side: LadderSide;
  x: number; // X centre of the ladder column in screen
  topY: number; // Y of the card top
  bottomY: number; // Y of ground top
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
export function pickLadderPosition(rng: () => number): {
  cardIndex: number;
  side: LadderSide;
} {
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
 * Generates the full ladder layout for a session
 *
 * Call once after DOM layout settles
 * Store the result and reuses on every resize and scroll rebuild
 *
 * @param cardRects - bounding rects for all content cards, left to right
 * @param groundTopY - Y coordinate of the top edge of the ground platform
 * @param rng - seeded random function
 */
export function generateLadderLayout(
  cardRects: CardRect[],
  groundTopY: number,
  rng: () => number
): LadderLayout {
  const { cardIndex, side } = pickLadderPosition(rng);
  const card = cardRects[cardIndex];

  const x = calcLadderX(card, side);
  const topY = card.top;
  const bottomY = groundTopY;
  const tileCount = calcTileCount(topY, bottomY);

  return { cardIndex, side, x, topY, bottomY, tileCount };
}
