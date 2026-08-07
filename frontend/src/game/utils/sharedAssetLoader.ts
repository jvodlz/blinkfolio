import Phaser from 'phaser';
import { PLAYER_FRAME_WIDTH, PLAYER_FRAME_HEIGHT } from '../constants';

/**
 * Loads the player's shared spritesheets: idle, walk, jump.
 *
 * Note:
 * - MainScene also loads 'faint', which stays in scene-specific preload()
 */
export function loadPlayerAssets(scene: Phaser.Scene): void {
  scene.load.spritesheet('idle', '/assets/characters/idle.png', {
    frameWidth: PLAYER_FRAME_WIDTH,
    frameHeight: PLAYER_FRAME_HEIGHT,
  });
  scene.load.spritesheet('walk', '/assets/characters/walk.png', {
    frameWidth: PLAYER_FRAME_WIDTH,
    frameHeight: PLAYER_FRAME_HEIGHT,
  });
  scene.load.spritesheet('jump', '/assets/characters/jump.png', {
    frameWidth: PLAYER_FRAME_WIDTH,
    frameHeight: PLAYER_FRAME_HEIGHT,
  });
}

/**
 * Loads the signpost arrow shared by both scenes' forward/back navigation buttons.
 */
export function loadSignpostAssets(scene: Phaser.Scene): void {
  scene.load.image('arrow-sign', '/assets/ui/arrow-left.png');
}
