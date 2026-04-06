/**
 * Kiddie Pool Layout Utility
 *
 * Calculates position, bounds, and splash tier for the kiddie pool.
 * Pool spawns on the opposite side from the ladder decision
 *
 * No Phaser dependency
 */

import { type LadderDecision, type CardRect } from './ladderLayout';

export type PoolSide = 'left' | 'right';

export interface PoolDecision {
  cardIndex: number;
  side: PoolSide;
}

export interface PoolBounds {
  left: number;
  right: number;
}

export type SplashTier = 'small' | 'medium' | 'large';

// Pool dimensions
export const POOL_WIDTH = 95;
export const POOL_HEIGHT = 45;
export const POOL_GROUND_EMBED = 8;
export const POOL_RIM_Y_OFFSET = 10;

// Inset: 1/4 pool width overlaps the card boundary
export const POOL_INSET_RATIO = 0.25;

// Splash thresholds
export const SPLASH_THRESHOLD_MEDIUM = 100;
export const SPLASH_THRESHOLD_LARGE = 250;

// Colours
export const POOL_COLOUR_TOP = 0xc8f135;
export const POOL_COLOUR_BOTTOM = 0xff6b4a;
export const POOL_WATER_COLOUR = 0xc0e3ef;
export const POOL_WATER_ALPHA = 0.7;

/**
 * Derive pool card and side from the ladder decision.
 *
 * Pool is always on the opposite card and the opposite side from the ladder
 */
export function resolvePoolSide(ladder: LadderDecision): PoolDecision {
  if (ladder.cardIndex === 0) {
    return { cardIndex: 2, side: 'right' };
  }
  return { cardIndex: 0, side: 'left' };
}

/**
 * Calculates the pool centre X position.
 *
 * 1/4 of the pool width overlaps the card boundary
 * 3/4 sits outside the card
 *
 * Right side: centre = card.right + POOL_WIDTH * POOL_INSET_RATIO
 * Left side: centre = card.left - POOL_WIDTH * POOL_INSET_RATIO
 */
export function calcPoolX(card: CardRect, side: PoolSide): number {
  const offset = POOL_WIDTH * POOL_INSET_RATIO;
  return side === 'right' ? card.right + offset : card.left - offset;
}

/**
 * Calculates the pool top Y position.
 *
 * Pool is embedded slightly into the ground for dug-in appearance
 * PoolY = groundTopY - POOL_HEIGHT + POOL_GROUND_EMBED
 */
export function calcPoolY(groundTopY: number): number {
  return groundTopY - POOL_HEIGHT + POOL_GROUND_EMBED;
}

/**
 * Determines the splash tier based on fall distance.
 *
 * Fall distance is measures from the player's Y at the moment of entry minus the pool rim Y
 *
 * small: fallDistance < SPLASH_THRESHOLD_MEDIUM
 * medium: fallDistance>= SPLASH_THRESHOLD_MEDIUM and < SPLASH_THRESHOLD_LARGE
 * large: fallDistance >= SPLASH_THRESHOLD_LARGE
 */
export function calcSplashTier(fallDistance: number): SplashTier {
  if (fallDistance >= SPLASH_THRESHOLD_LARGE) return 'large';
  if (fallDistance >= SPLASH_THRESHOLD_MEDIUM) return 'medium';
  return 'small';
}

/**
 * Returns true when the player has entered the pool from above.
 *
 * All conditions must hold:
 * - playerY <= poolRimY (player is at or above the rim)
 * - velocityY > 0 (player is moving downward)
 *
 * Note: the startedInsidePool guard is in the caller's responsibility (MainScene)
 */
export function isEntryFromAbove(
  playerY: number,
  poolRimY: number,
  velocityY: number
): boolean {
  return playerY <= poolRimY && velocityY > 0;
}

/**
 * Returns the left and right x boundaries of the pool interior.
 * Used to clamp player horizontal movement while inside the pool
 */
export function calcPoolBounds(poolX: number): PoolBounds {
  return {
    left: poolX - POOL_WIDTH / 2,
    right: poolX + POOL_WIDTH / 2,
  };
}
