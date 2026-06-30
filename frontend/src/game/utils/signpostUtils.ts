import Phaser from 'phaser';

/**
 * Shared signpost tween used by navigation signposts across scenes.
 *
 * @param scene - the scene the signpost belongs to (used to drive tweens)
 * @param player - the player sprite to halt and idle before navigating
 * @param button - the signpost image to pulse
 * @param onComplete - navigation callback fired after the tween finishes
 */
export function triggerSignpostTween(
  scene: Phaser.Scene,
  player: Phaser.Physics.Arcade.Sprite | undefined,
  button: Phaser.GameObjects.Image,
  onComplete: () => void
): void {
  player?.setVelocityX(0);
  player?.play('idle-anim', true);

  scene.tweens.add({
    targets: button,
    scaleX: 1.6,
    scaleY: 1.6,
    duration: 100,
    ease: 'Sine.In',
    yoyo: true,
    onComplete,
  });
}
