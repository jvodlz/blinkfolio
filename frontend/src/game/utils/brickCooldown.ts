/**
 * Brick Cooldown Utility
 *
 * Tracks which interactive bricks are currently in their cooldown period
 * (i.e. recently hit and not yet resetable)
 *
 * Uses a WeakMap keyed on the brick object reference directly.
 *   - WeakMap has O(1) lookup with no string construction
 *   - Keys are held weakly (i.e. brick objects are eligible for garbage collection when destroyed)
 *
 * This module is purely concerned with state tracking.
 * Timer scheduling is the responsibility of the caller (MainScene)
 */

// Using object keeps utility free from any Phaser import
// The scene passes real Phaser.GameObjects.Image instances at runtime
type Brick = object;

let _coolingDown = new WeakMap<Brick, boolean>();

export function isCoolingDown(brick: Brick): boolean {
  return _coolingDown.get(brick) === true;
}

export function markCoolingDown(brick: Brick): void {
  _coolingDown.set(brick, true);
}

// Called when reset timer fires
export function clearCooldown(brick: Brick): void {
  _coolingDown.delete(brick);
}

// Intended for tests only. Not for production code
export function resetAllCooldowns(): void {
  // WeakMap has no .clear(), thus, reassignment approach
  _coolingDown = new WeakMap<Brick, boolean>();
}
