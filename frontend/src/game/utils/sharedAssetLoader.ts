import Phaser from 'phaser';
import {
  PLAYER_FRAME_WIDTH,
  PLAYER_FRAME_HEIGHT,
  FLOWER_KEYS,
} from '../constants';

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

/**
 * Loads all flower variant images used for random flower spawns.
 *
 * Note:
 * - MainScene-only despite living in this "shared" loader (see FLOWER_KEYS in constants.ts for the full key list)
 */
export function loadFlowerAssets(scene: Phaser.Scene): void {
  FLOWER_KEYS.forEach((key) => {
    scene.load.image(key, `/assets/items/${key}.png`);
  });
}
