import Phaser from 'phaser';
import {
  PLAYER_SCALE,
  PLAYER_BODY_WIDTH,
  PLAYER_BODY_HEIGHT,
  PLAYER_BODY_OFFSET_X,
  PLAYER_BODY_OFFSET_Y,
} from '../constants';

/**
 * Creates and configures a player sprite.
 *
 * Encapsulates all shared player construction:
 * - sprite creation, scale, depth
 * - world bounds
 * - physics body dimensions
 *
 * startX and startY are caller-provided
 *
 * @param scene - Phaser scene that owns the sprite
 * @param x - initial horizontal spawn position
 * @param y - initial vertical spawn position
 * @returns a fully configured arcade physics sprite
 */

export function createPlayer(
  scene: Phaser.Scene,
  x: number,
  y: number
): Phaser.Physics.Arcade.Sprite {
  const player = scene.physics.add.sprite(x, y, 'idle');

  player.setScale(PLAYER_SCALE);
  player.setDepth(1);
  player.setCollideWorldBounds(false);
  player.setBodySize(PLAYER_BODY_WIDTH, PLAYER_BODY_HEIGHT);
  player.setOffset(PLAYER_BODY_OFFSET_X, PLAYER_BODY_OFFSET_Y);

  return player;
}
