/**
 * Spawn Utilities
 *
 * Pure functions for randomising spawn behaviour.
 * Accepts an rng function so behaviour is deterministic in tests
 *
 * No Phaser dependency - scene passes Math.random at call site
 */

export type SpawnType = 'flower' | 'enemy';
export type SpawnDirection = 'left' | 'right';

/**
 * Returns 'flower' or 'enemy' based on a 50/50 random split.
 *
 * @param rng - random number generator returning a value in [0,1)
 */
export function randomSpawnType(rng: () => number): SpawnType {
  return rng() < 0.5 ? 'flower' : 'enemy';
}

/**
 * Returns 'left' or 'right' based on a 50/50 random split.
 *
 * @param rng - random number generator returning a value in [0,1)
 */
export function randomDirection(rng: () => number): SpawnDirection {
  return rng() < 0.5 ? 'left' : 'right';
}
