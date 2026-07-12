import Phaser from 'phaser';
import {
  MOBILE_MAX_WIDTH,
  GROUND_HEIGHT,
  GROUND_OFFSET_FROM_BOTTOM,
  PLAYER_SPEED,
  PLAYER_JUMP_VELOCITY,
  PLAYER_BOUNDARY_RATIO,
  SIGN_EDGE_SIZE,
} from '../constants';
import { InputController } from '../input/InputController';
import { registerPlayerAnimations } from '../utils/animationSetup';
import { createPlayer } from '../utils/playerSetup';
import {
  triggerSignpostTween,
  createSignpostButton,
} from '../utils/signpostUtils';

export class WelcomeScene extends Phaser.Scene {
  // Player
  private readonly NAVIGATION_TRIGGER_RATIO = 0.2; // fraction of body width past right edge to trigger navigation

  // Signpost
  private readonly SIGN_EDGE_INSET = 40;

  private player?: Phaser.Physics.Arcade.Sprite;
  private ground?: Phaser.GameObjects.Rectangle;
  private inputController?: InputController;
  private forwardButton?: Phaser.GameObjects.Image;
  private forwardButtonX?: number;
  private isWalkingToSign: boolean = false;
  private onNavigate?: () => void;

  constructor() {
    super({ key: 'WelcomeScene' });
  }

  init(data: { onNavigate: () => void }) {
    this.onNavigate = data.onNavigate;
  }

  preload() {
    this.load.spritesheet('idle', '/assets/characters/idle.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet('walk', '/assets/characters/walk.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet('jump', '/assets/characters/jump.png', {
      frameWidth: 32,
      frameHeight: 32,
    });

    // Arrow Signpost
    this.load.image('arrow-sign', '/assets/ui/arrow-left.png');
  }

  create() {
    const { width, height } = this.cameras.main;
    const startX = Phaser.Math.Between(width * 0.25, width * 0.75);
    const groundCenterY = height - GROUND_OFFSET_FROM_BOTTOM;

    // Ground
    this.ground = this.add.rectangle(
      width / 2,
      groundCenterY,
      width,
      GROUND_HEIGHT,
      0xe95526,
      0.8
    );
    this.physics.add.existing(this.ground, true);

    // Player
    this.player = createPlayer(this, startX, -100);

    this.physics.add.collider(this.player, this.ground);

    registerPlayerAnimations(this);
    this.player.play('idle-anim');

    this.setupControls();
    this.createForwardButton();

    this.scale.on('resize', this.handleResize, this);
  }

  /**
   * Wires InputController for movement and touch input.
   *
   * ESC is a no-op in this scene
   * SPACE navigates forward directly
   * Jump input from InputController is intentionally ignored
   */
  private setupControls(): void {
    this.inputController = new InputController(this);
    this.inputController.setup(() => {});

    this.input.keyboard?.on('keydown-SPACE', () => this.navigateToMainPage());
  }

  /**
   * Fires the signpost tween then navigates to MainScene.
   * Called when player reaches the forward button or is already close enough
   */
  private triggerForwardButtonTween(): void {
    if (!this.forwardButton) return;
    triggerSignpostTween(this, this.player, this.forwardButton, () =>
      this.navigateToMainPage()
    );
  }

  /**
   * Creates right arrow signpost to navigate to MainScene.
   *
   * Only rendered on touch-capable mobile devices
   * Pinned to right edge of ground platform
   * Safe to call on resize. Destroys and recreates each time
   * Uses the shared arrow-sign texture, flipped horizontally
   */
  private createForwardButton(): void {
    // Destroy existing button before recreating on resize
    if (this.forwardButton) {
      this.forwardButton.destroy();
      this.forwardButton = undefined;
      this.forwardButtonX = undefined;
      this.isWalkingToSign = false;
    }

    // Mobile touch devices only
    if (!this.sys.game.device.input.touch) return;
    if (window.innerWidth > MOBILE_MAX_WIDTH) return;

    const { width, height } = this.cameras.main;
    const groundCenterY = height - GROUND_OFFSET_FROM_BOTTOM;
    const groundTopY = groundCenterY - GROUND_HEIGHT / 2;

    const buttonX = width - this.SIGN_EDGE_INSET - SIGN_EDGE_SIZE;
    const buttonY = groundTopY - SIGN_EDGE_SIZE;

    this.forwardButtonX = buttonX;

    this.forwardButton = createSignpostButton(this, {
      x: buttonX,
      y: buttonY,
      direction: 'right',
      flipX: true,
      player: this.player,
      onTriggerImmediate: () => this.triggerForwardButtonTween(),
      onWalkToSign: () => {
        this.isWalkingToSign = true;
      },
    });
  }

  update() {
    if (!this.player) return;

    const { width, height } = this.cameras.main;

    // Walk player to signpost before navigating
    if (this.isWalkingToSign && this.forwardButtonX !== undefined) {
      const distanceToSign = this.forwardButtonX - this.player.x;

      if (distanceToSign <= 8) {
        // Player arrived - stop, idle, trigger
        this.isWalkingToSign = false;
        this.triggerForwardButtonTween();
        return;
      }

      // Force walk right toward button
      this.player.setVelocityX(PLAYER_SPEED);
      this.player.setFlipX(false);
      this.player.play('walk-anim', true);
      return;
    }

    const inputState = this.inputController?.getState() ?? {
      moveLeft: false,
      moveRight: false,
      jump: false,
      climbUp: false,
      climbDown: false,
    };

    const { moveLeft, moveRight } = inputState;

    const bodyWidth = (this.player.body as Phaser.Physics.Arcade.Body).width;
    const leftBoundary = bodyWidth * PLAYER_BOUNDARY_RATIO;
    const rightEdgeTrigger = width + bodyWidth * this.NAVIGATION_TRIGGER_RATIO;

    if (moveLeft) {
      this.player.setVelocityX(-PLAYER_SPEED);
      this.player.play('walk-anim', true);
      this.player.setFlipX(true);
    } else if (moveRight) {
      this.player.setVelocityX(PLAYER_SPEED);
      this.player.play('walk-anim', true);
      this.player.setFlipX(false);

      if (this.player.x > rightEdgeTrigger) {
        this.navigateToMainPage();
      }
    } else {
      this.player.setVelocityX(0);
      if (this.player.body && this.player.body.touching.down) {
        this.player.play('idle-anim', true);
      }
    }

    // Jump - W and Up Arrow Only
    const canJump = this.player.body?.touching.down ?? false;
    const keyboardJump =
      this.inputController?.['cursors']?.up.isDown === true ||
      this.inputController?.['wasd']?.W.isDown === true;

    // Jump: diagonal and upward swipes via InputController
    const touchJump = inputState.jump;

    if ((keyboardJump || touchJump) && canJump) {
      this.player.setVelocityY(PLAYER_JUMP_VELOCITY);
      this.player.play('jump-anim', true);
    }

    // Prevent walking off left edge
    if (this.player.x < leftBoundary) {
      this.player.x = leftBoundary;
      this.player.setVelocityX(0);
    }

    // Prevent falling below screen
    if (this.player.y > height + 100) {
      const groundCenterY = height - GROUND_OFFSET_FROM_BOTTOM;
      this.player.y = groundCenterY - this.player.displayHeight / 2;
      this.player.setVelocityY(0);
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    const { width, height } = gameSize;
    const groundCenterY = height - GROUND_OFFSET_FROM_BOTTOM;
    const groundHalf = GROUND_HEIGHT / 2;

    if (this.ground) {
      this.ground.setPosition(width / 2, groundCenterY);
      this.ground.setSize(width, GROUND_HEIGHT);
      const body = this.ground.body as Phaser.Physics.Arcade.StaticBody;
      if (body) body.updateFromGameObject();
    }

    if (!this.player) return;

    const bodyWidth = (this.player.body as Phaser.Physics.Arcade.Body).width;
    const leftBoundary = bodyWidth * PLAYER_BOUNDARY_RATIO;
    const rightBoundary = width - bodyWidth * PLAYER_BOUNDARY_RATIO;

    if (this.player.x < leftBoundary) this.player.x = leftBoundary;
    if (this.player.x > rightBoundary) this.player.x = rightBoundary;

    const groundTop = groundCenterY - groundHalf;
    const playerBottom = this.player.y + this.player.displayHeight / 2;
    if (playerBottom > groundTop) {
      this.player.y = groundTop - this.player.displayHeight / 2;
      this.player.setVelocityY(0);
    }

    if (this.player.y > height + 100) {
      this.player.y = height - 80;
      this.player.setVelocityY(0);
    }

    this.createForwardButton();
  }

  private navigateToMainPage() {
    if (this.onNavigate) this.onNavigate();
  }

  shutdown(): void {
    this.inputController?.destroy();
  }
}
