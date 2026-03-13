import Phaser from 'phaser';

export class WelcomeScene extends Phaser.Scene {
  private readonly GROUND_HEIGHT = 40;
  private readonly GROUND_OFFSET_FROM_BOTTOM = 20;

  // Player constants
  private readonly PLAYER_SCALE = 2.5;
  private readonly PLAYER_BODY_WIDTH_OFFSET = 22; // difference between sprite and collision body
  private readonly PLAYER_SPEED = 200;
  private readonly PLAYER_JUMP_VELOCITY = -400;
  private readonly PLAYER_BOUNDARY_RATIO = 0.33; // left/right visible boundary ratio
  private readonly NAVIGATION_TRIGGER_RATIO = 0.2; // fraction of body width past right edge to trigger navigation

  private player?: Phaser.Physics.Arcade.Sprite;
  private ground?: Phaser.GameObjects.Rectangle;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
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
    this.physics.add.collider(this.player, this.ground);

    // Animations
    this.anims.create({
      key: 'idle-anim',
      frames: this.anims.generateFrameNumbers('idle', { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'walk-anim',
      frames: this.anims.generateFrameNumbers('walk', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'jump-anim',
      frames: this.anims.generateFrameNumbers('jump', { start: 0, end: 5 }),
      frameRate: 12,
      repeat: -1,
    });

    this.player.play('idle-anim');

    // Controls
    this.cursors = this.input.keyboard?.createCursorKeys();
    if (this.input.keyboard) {
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }
    this.input.keyboard?.on('keydown-SPACE', () => this.navigateToMainPage());

    this.scale.on('resize', this.handleResize, this);
  }

  update() {
    if (!this.player || !this.cursors) return;

    const { width, height } = this.cameras.main;
    const bodyWidth = this.player.displayWidth - this.PLAYER_BODY_WIDTH_OFFSET;
    const leftBoundary = bodyWidth * this.PLAYER_BOUNDARY_RATIO;
    const rightEdgeTrigger = width + bodyWidth * this.NAVIGATION_TRIGGER_RATIO;

    const moveLeft = this.cursors.left.isDown || this.wasd?.A.isDown;
    const moveRight = this.cursors.right.isDown || this.wasd?.D.isDown;
    const jump = this.cursors.up.isDown || this.wasd?.W.isDown;

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

    // Jump
    if (jump && this.player.body && this.player.body.touching.down) {
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
      this.player.y = height - 80;
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

    const bodyWidth = this.player.displayWidth - this.PLAYER_BODY_WIDTH_OFFSET;
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
}
