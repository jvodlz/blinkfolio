import Phaser from 'phaser';
import { MOBILE_MAX_WIDTH } from '../constants';
import { InputController } from '../input/InputController';

export class WelcomeScene extends Phaser.Scene {
  private readonly GROUND_HEIGHT = 40;
  private readonly GROUND_OFFSET_FROM_BOTTOM = 20;

  // Player
  private readonly PLAYER_SCALE = 2.5;
  private readonly PLAYER_SPEED = 200;
  private readonly PLAYER_JUMP_VELOCITY = -400;
  private readonly PLAYER_BOUNDARY_RATIO = 0.33; // left/right visible boundary ratio
  private readonly NAVIGATION_TRIGGER_RATIO = 0.2; // fraction of body width past right edge to trigger navigation
  private readonly PLAYER_BODY_WIDTH = 10;
  private readonly PLAYER_BODY_HEIGHT = 15;
  private readonly PLAYER_BODY_OFFSET_X = 11;
  private readonly PLAYER_BODY_OFFSET_Y = 17;

  private player?: Phaser.Physics.Arcade.Sprite;
  private ground?: Phaser.GameObjects.Rectangle;
  private inputController?: InputController;
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
    const groundCenterY = height - this.GROUND_OFFSET_FROM_BOTTOM;

    // Ground
    this.ground = this.add.rectangle(
      width / 2,
      groundCenterY,
      width,
      this.GROUND_HEIGHT,
      0xe95526,
      0.8
    );
    this.physics.add.existing(this.ground, true);

    // Player
    this.player = this.physics.add.sprite(startX, -100, 'idle');
    this.player.setScale(this.PLAYER_SCALE);
    this.player.setCollideWorldBounds(false);
    this.player.setDepth(1);

    // Fit physics body to player
    this.player.setBodySize(this.PLAYER_BODY_WIDTH, this.PLAYER_BODY_HEIGHT);
    this.player.setOffset(this.PLAYER_BODY_OFFSET_X, this.PLAYER_BODY_OFFSET_Y);

    this.physics.add.collider(this.player, this.ground);

    this.createAnimations();
    this.player.play('idle-anim');

    this.setupControls();

    this.scale.on('resize', this.handleResize, this);
  }

  private createAnimations(): void {
    this.anims.create({
      key: 'idle-anim',
      frames: this.anims.generateFrameNumbers('idle', { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'walk-anim',
      frames: this.anims.generateFrameNumbers('walk', { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'jump-anim',
      frames: this.anims.generateFrameNumbers('jump', { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1,
    });
  }

  /**
   * Wires InputController for movement and touch input
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

  update() {
    if (!this.player) return;

    const { width, height } = this.cameras.main;

    const inputState = this.inputController?.getState() ?? {
      moveLeft: false,
      moveRight: false,
      jump: false,
      climbUp: false,
      climbDown: false,
    };

    const { moveLeft, moveRight } = inputState;

    const bodyWidth = (this.player.body as Phaser.Physics.Arcade.Body).width;
    const leftBoundary = bodyWidth * this.PLAYER_BOUNDARY_RATIO;
    const rightEdgeTrigger = width + bodyWidth * this.NAVIGATION_TRIGGER_RATIO;

    if (moveLeft) {
      this.player.setVelocityX(-this.PLAYER_SPEED);
      this.player.play('walk-anim', true);
      this.player.setFlipX(true);
    } else if (moveRight) {
      this.player.setVelocityX(this.PLAYER_SPEED);
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
    const jumpKeys =
      this.inputController?.['cursors']?.up.isDown === true ||
      this.inputController?.['wasd']?.W.isDown === true;
    if (jumpKeys && canJump) {
      this.player.setVelocityY(this.PLAYER_JUMP_VELOCITY);
      this.player.play('jump-anim', true);
    }

    // Prevent walking off left edge
    if (this.player.x < leftBoundary) {
      this.player.x = leftBoundary;
      this.player.setVelocityX(0);
    }

    // Prevent falling below screen
    if (this.player.y > height + 100) {
      const groundCenterY = height - this.GROUND_OFFSET_FROM_BOTTOM;
      this.player.y = groundCenterY - this.player.displayHeight / 2;
      this.player.setVelocityY(0);
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    const { width, height } = gameSize;
    const groundCenterY = height - this.GROUND_OFFSET_FROM_BOTTOM;
    const groundHalf = this.GROUND_HEIGHT / 2;

    if (this.ground) {
      this.ground.setPosition(width / 2, groundCenterY);
      this.ground.setSize(width, this.GROUND_HEIGHT);
      const body = this.ground.body as Phaser.Physics.Arcade.StaticBody;
      if (body) body.updateFromGameObject();
    }

    if (!this.player) return;

    const bodyWidth = (this.player.body as Phaser.Physics.Arcade.Body).width;
    const leftBoundary = bodyWidth * this.PLAYER_BOUNDARY_RATIO;
    const rightBoundary = width - bodyWidth * this.PLAYER_BOUNDARY_RATIO;

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
  }

  private navigateToMainPage() {
    if (this.onNavigate) this.onNavigate();
  }

  shutdown(): void {
    this.inputController?.destroy();
  }
}
