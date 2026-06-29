import Phaser from 'phaser';

/**
 * Registers shared animations on a scene's animation manager.
 *
 * Scene-specific animations are registered by their respective scenes.
 * @param scene
 */
export function registerPlayerAnimations(scene: Phaser.Scene): void {
  scene.anims.create({
    key: 'idle-anim',
    frames: scene.anims.generateFrameNumbers('idle', { start: 0, end: 5 }),
    frameRate: 8,
    repeat: -1,
  });

  scene.anims.create({
    key: 'walk-anim',
    frames: scene.anims.generateFrameNumbers('walk', { start: 0, end: 5 }),
    frameRate: 8,
    repeat: -1,
  });

  scene.anims.create({
    key: 'jump-anim',
    frames: scene.anims.generateFrameNumbers('jump', { start: 0, end: 5 }),
    frameRate: 8,
    repeat: -1,
  });
}
