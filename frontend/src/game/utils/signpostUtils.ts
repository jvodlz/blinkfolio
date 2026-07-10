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

/**
 * The direction the signpost faces, used to determine whether the player has reached the button at click time.
 *
 * Note:
 * - 'right' - forward (WelcomeScene): player reached when player.x >= buttonX
 * - 'left' - back (MainScene): player reached when player.x <= buttonX
 */
export type SignpostDirection = 'left' | 'right';

/**
 * Config for createSignpostButton.
 *
 * Note:
 * - x and y are pre-computed by caller
 * - flipX is explicit and separate from direction
 */
export interface SignpostButtonConfig {
  x: number;
  y: number;
  direction: SignpostDirection;
  flipX: boolean;
  player: Phaser.Physics.Arcade.Sprite | undefined;
  onTriggerImmediate: () => void;
  onWalkToSign: () => void;
}

/**
 * Navigation button - Create, position, and wire.
 *
 * Shared by scenes. Caller is responsible for pre-computing x and y for each callback
 *
 * @param scene - the scene to create the image in
 * @param config - position, direction, flip, player reference, callbacks
 * @returns the created Image game object
 */
export function createSignpostButton(
  scene: Phaser.Scene,
  config: SignpostButtonConfig
): Phaser.GameObjects.Image {
  const { x, y, direction, flipX, player, onTriggerImmediate, onWalkToSign } =
    config;

  const button = scene.add.image(0, 0, 'arrow-sign');
  button.setScale(2);
  button.setDepth(0.5);
  button.setFlipX(flipX);
  button.setPosition(x, y);
  button.setInteractive();

  button.on('pointerdown', () => {
    button.disableInteractive();

    const hasReached =
      direction === 'right'
        ? player !== undefined && player.x >= x
        : player !== undefined && player.x <= x;

    if (hasReached) {
      onTriggerImmediate();
      return;
    }
    onWalkToSign();
  });

  return button;
}
