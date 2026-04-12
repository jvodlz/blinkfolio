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
export const POOL_WIDTH = 120;
export const POOL_HEIGHT = 100;
export const POOL_GROUND_EMBED = 8;
export const POOL_RIM_Y_OFFSET = 10;

// Inset: pool width overlaps the card boundary
export const POOL_INSET_RATIO = 0.1;

// Pool X breakpoints
export const POOL_X_BREAKPOINT_SMALL = 768;
export const POOL_X_BREAKPOINT_MEDIUM = 1028;

// Splash thresholds
export const SPLASH_THRESHOLD_MEDIUM = 100;
export const SPLASH_THRESHOLD_LARGE = 250;

// Colours
export const POOL_COLOUR_TOP = 0xff6b4a;
export const POOL_COLOUR_BOTTOM = 0xc8f135;
export const POOL_COLOUR_SHADOW = 0x9dbf28;
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
 * POOL_INSET_RATIO controls what fraction of the pool overlaps the card boundary.
 * The remainder sits outside
 *
 * offset = (POOL_WIDTH / 2) - (POOL_WIDTH * POOL_INSET_RATIO)
 * This places the centre so exactly POOL_INSET_RATIO of the pool is inside the card
 *
 * Right side: centre = card.right + offset
 * Left side:  centre = card.left  - offset
 */
export function calcPoolX(card: CardRect, side: PoolSide): number {
  const offset = POOL_WIDTH / 2 - POOL_WIDTH * POOL_INSET_RATIO;
  return side === 'right' ? card.right + offset : card.left - offset;
}

/**
 * Calculates the pool top Y position.
 *
 * Pool is embedded slightly into the ground for dug-in appearance
 * PoolY = groundTopY - (POOL_HEIGHT / 2)+ POOL_GROUND_EMBED
 */
export function calcPoolY(groundTopY: number): number {
  return groundTopY - POOL_HEIGHT / 2 + POOL_GROUND_EMBED;
}

/**
 * Determines the splash tier based on fall distance.
 *
 * Fall distance is measured from the pool rim Y minus player entry Y
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
 * Returns the left and right x boundaries of the pool interior.
 * Used to clamp player horizontal movement while inside the pool
 */
export function calcPoolBounds(poolX: number): PoolBounds {
  return {
    left: poolX - POOL_WIDTH / 2,
    right: poolX + POOL_WIDTH / 2,
  };
}

/**
 * Calculates pool centre X for narrow viewports where ladder is hidden
 *
 * At <= POOL_X_BREAKPOINT_SMALL: pool sits at centre (side-agnostic)
 * Between POOL_X_BREAKPOINT_SMALL and POOL_X_BREAKPOINT_MEDIUM:
 *   right: pool sits 75% of viewport width
 *   left: pool sits 25% of viewport width
 *
 * Only called when viewportWidth < MOBILE_POOL_BREAKPOINT_MEDIUM
 * Pool is ground-anchored
 */
export function resolveMobilePoolX(
  viewportWidth: number,
  side: PoolSide
): number {
  if (viewportWidth <= POOL_X_BREAKPOINT_SMALL) {
    return viewportWidth * 0.5;
  }
  return side === 'right' ? viewportWidth * 0.75 : viewportWidth * 0.25;
}
