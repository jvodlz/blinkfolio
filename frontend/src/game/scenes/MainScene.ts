import Phaser from 'phaser';
import { MOBILE_MAX_WIDTH } from '../constants';
import {
  getPlatformRectsFromElements,
  CARD_STACK_BELOW_WIDTH,
} from '../utils/platformSync';
import {
  generateBrickLayout,
  type BrickLayoutConfig,
  type BrickRowLayout,
} from '../utils/brickLayout';
import {
  isCoolingDown,
  markCoolingDown,
  clearCooldown,
} from '../utils/brickCooldown';
import { randomSpawnType, randomDirection } from '../utils/spawnUtils';
import {
  generateLadderDecision,
  resolveLadderLayout,
  type LadderDecision,
  type CardRect,
  LADDER_MIN_WIDTH,
  LADDER_MIN_HEIGHT,
  LADDER_RENDERED_SIZE,
  LADDER_RAIL_WIDTH,
  LADDER_RUNG_HEIGHT,
  LADDER_COLOUR_RAIL,
  LADDER_COLOUR_RUNG,
  LADDER_RUNG_SPACING,
} from '../utils/ladderLayout';
import { createSeededRandom } from '../utils/brickLayout';
import {
  resolvePoolSide,
  calcPoolX,
  calcPoolY,
  calcPoolBounds,
  type PoolDecision,
  type PoolBounds,
  POOL_WIDTH,
  POOL_COLOUR_TOP,
  POOL_COLOUR_BOTTOM,
  POOL_WATER_COLOUR,
  POOL_WATER_ALPHA,
  POOL_COLOUR_SHADOW,
  POOL_GROUND_EMBED,
  calcSplashTier,
  type SplashTier,
  resolveMobilePoolX,
  POOL_X_BREAKPOINT_MEDIUM,
} from '../utils/kiddiePoolLayout';
import { InputController } from '../input/InputController';

const BrickLayout = {
  None: 'NONE',
  LowerOnly: 'LOWER_ONLY',
  Both: 'BOTH',
} as const;

type BrickLayout = (typeof BrickLayout)[keyof typeof BrickLayout];

export class MainScene extends Phaser.Scene {
  private readonly GROUND_HEIGHT = 40;
  private readonly GROUND_OFFSET_FROM_BOTTOM = 20;

  // Player
  private readonly PLAYER_SCALE = 2.5;
  private readonly PLAYER_SPEED = 200;
  private readonly PLAYER_JUMP_VELOCITY = -400;
  private readonly PLAYER_BOUNDARY_RATIO = 0.33; // left/right visible boundary ratio

  private readonly PLAYER_BODY_WIDTH = 10;
  private readonly PLAYER_BODY_HEIGHT = 15;
  private readonly PLAYER_BODY_OFFSET_X = 11;
  private readonly PLAYER_BODY_OFFSET_Y = 17;
  private readonly FAINT_FLASH_COUNT = 5;
  private readonly FAINT_FLASH_DURATION = 2500;

  // Brick platform
  private readonly BRICK_SIMPLE_SCALE = 0.625;
  private readonly BRICK_INTERACTIVE_SCALE = 2.2;
  private readonly BRICK_SIMPLE_NATIVE_SIZE = 64;
  private readonly BRICK_ABOVE_CARD_OFFSET = 70;
  private readonly BRICK_ABOVE_GROUND_OFFSET = 75;

  // Items
  private readonly FLOWER_SCALE = 2;

  // Enemy
  private readonly ENEMY_SCALE = 2.5;
  private readonly ENEMY_SPEED = 90;
  private readonly ENEMY_BODY_WIDTH = 14;
  private readonly ENEMY_BODY_HEIGHT = 9;
  private readonly ENEMY_BODY_OFFSET_X = 1;
  private readonly ENEMY_BODY_OFFSET_Y = 4;

  // Brick breakpoint thresholds
  private readonly BP_WIDTH_MIN = 1028;
  private readonly BP_HEIGHT_BOTH = 945;
  private readonly BP_HEIGHT_LOWER = 827;

  // Ladder
  private readonly LADDER_CLIMB_SPEED = 150;
  private readonly LADDER_GRAVITY_REDUCED = -250;

  // Pool drawing
  private readonly POOL_BOTTOM_RING_H = 40;
  private readonly POOL_BOTTOM_RING_Y_OFFSET = 18; // how far below pool centre the bottom ring sits
  private readonly POOL_TOP_RING_H = 36;
  private readonly POOL_TOP_RING_Y_OFFSET = 2;
  private readonly POOL_TOP_RING_Y_INNER = 12; // ellipse centre shift within top ring bounds
  private readonly POOL_WATER_Y_OFFSET = 8; // how far above pool centre the water sits
  private readonly POOL_WATER_Y_INNER = 10; // water ellipse centre shift within water bounds
  private readonly POOL_WATER_SHADOW_Y_INNER = 10.5;
  private readonly POOL_WATER_WIDTH_RATIO = 0.8; // water ellipse width as fraction of POOL_WIDTH
  private readonly POOL_WATER_H = 14;
  private readonly POOL_WATER_SHADOW_H = 8;
  private readonly POOL_DUCK_X_OFFSET = 20; // duck offset to the right of pool centre
  private readonly POOL_DUCK_WATER_Y_OFFSET = 2;
  private readonly POOL_BOB_AMPLITUDE = 3;
  private readonly POOL_PLAYER_BOB_DURATION = 800;
  private readonly POOL_PLAYER_BOB_SPEED = 15;
  private readonly POOL_ENTRY_THRESHOLD = 20;

  // Duck
  private readonly DUCK_COLOUR = 0xf5d020;
  private readonly DUCK_WING_COLOUR = 0xd4b010;
  private readonly DUCK_BILL_COLOUR = 0xff8c00;
  private readonly DUCK_EYE_COLOUR = 0x1a1a1a;

  // Splash Particle
  private readonly SPLASH_TEXTURE_KEY = 'splash-particle';

  private player?: Phaser.Physics.Arcade.Sprite;
  private ground?: Phaser.GameObjects.Rectangle;
  private inputController?: InputController;
  private backButton?: Phaser.GameObjects.Image;

  // Callbacks
  private onNavigateBack?: () => void;

  // Content platforms
  private platformGroup?: Phaser.Physics.Arcade.StaticGroup;
  private platformDebugGraphics?: Phaser.GameObjects.Graphics;

  // Brick platforms
  private brickGroup?: Phaser.Physics.Arcade.StaticGroup;
  private brickLayoutConfig?: BrickLayoutConfig;
  private brickLayoutSeed?: number;

  // Ladder
  private ladderDecision?: LadderDecision;
  private ladderImageGroup?: Phaser.GameObjects.Group;
  private ladderZone?: Phaser.GameObjects.Zone;
  private isClimbing: boolean = false;
  private isOnLadder: boolean = false;
  private ladderBounds?: { topY: number; bottomY: number };

  // Kiddie pool
  private poolDecision?: PoolDecision;
  private poolGraphics?: Phaser.GameObjects.Graphics;
  private waterShadowGraphics?: Phaser.GameObjects.Graphics;
  private waterGraphics?: Phaser.GameObjects.Graphics;
  private duckGraphics?: Phaser.GameObjects.Graphics;
  private duckBaseY: number = 0;
  private poolX?: number;
  private poolY?: number;
  private poolBounds?: PoolBounds;
  private waterBounds?: PoolBounds;
  private poolRimY?: number;
  private isInPool: boolean = false;
  private poolBobTime: number = 0;
  private playerEntryY?: number;
  private playerPoolPinnedY?: number;

  // Enemy
  private enemyGroup?: Phaser.Physics.Arcade.Group;

  // Player state
  private isFainting: boolean = false;
  private isWalkingToSign: boolean = false;
  private backButtonX?: number;

  private contentAreaElement?: Element;
  private isScrolled: boolean = false;

  constructor() {
    super({ key: 'MainScene' });
  }

  init(data: { onNavigateBack: () => void }) {
    this.onNavigateBack = data.onNavigateBack;
  }

  preload() {
    // Player
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
    this.load.spritesheet('faint', '/assets/characters/faint.png', {
      frameWidth: 32,
      frameHeight: 32,
    });

    // Brick
    this.load.image('brick-simple', '/assets/tiles/brick-simple.png');
    this.load.image('brick-interactive', '/assets/tiles/brick-interactive.png');
    this.load.image(
      'brick-interactive-hit',
      '/assets/tiles/brick-interactive-hit.png'
    );

    // Item
    this.load.image('flower', '/assets/items/flower.png');

    // Enemy
    this.load.spritesheet('enemy', '/assets/enemies/enemy-simple.png', {
      frameWidth: 16,
      frameHeight: 16,
      endFrame: 7,
    });

    // Splash Particles
    if (!this.textures.exists(this.SPLASH_TEXTURE_KEY)) {
      const graphics = this.make.graphics({ x: 0, y: 0 });
      graphics.fillStyle(0xffffff, 1);
      graphics.fillRect(0, 0, 6, 6);
      graphics.generateTexture(this.SPLASH_TEXTURE_KEY, 6, 6);
      graphics.destroy();
    }

    // Arrow Signpost
    this.load.image('back-button', '/assets/ui/arrow-left.png');
  }

  create() {
    const { width, height } = this.cameras.main;
    const groundCenterY = this.getGroundCenterY(height);

    // Ground platform
    this.ground = this.add.rectangle(
      width / 2,
      groundCenterY,
      width,
      this.GROUND_HEIGHT,
      0xe95526,
      0.8
    );
    this.physics.add.existing(this.ground, true);

    const startX = Phaser.Math.Between(width * 0.25, width * 0.75);
    this.player = this.physics.add.sprite(startX, -100, 'idle');
    this.player.setDepth(1);
    this.player.setScale(this.PLAYER_SCALE);
    this.player.setCollideWorldBounds(false);

    // Shrink physics body to match visible player
    this.player.setBodySize(this.PLAYER_BODY_WIDTH, this.PLAYER_BODY_HEIGHT);
    this.player.setOffset(this.PLAYER_BODY_OFFSET_X, this.PLAYER_BODY_OFFSET_Y);

    // Collision with ground
    this.physics.add.collider(this.player, this.ground);

    // Initialise platform group so collider can reference it
    // Register collider once. Group is populated after DOM layout settles
    this.platformGroup = this.physics.add.staticGroup();
    this.physics.add.collider(this.player!, this.platformGroup);

    // Register brick group collider once.
    // Clear and repopulate on resize/scroll without breaking this reference
    // Handles the bonk
    this.brickGroup = this.physics.add.staticGroup();
    this.physics.add.collider(
      this.player!,
      this.brickGroup,
      this.handleBrickHit as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    this.enemyGroup = this.physics.add.group();
    this.physics.add.collider(this.enemyGroup, this.ground!);
    this.physics.add.collider(this.enemyGroup, this.platformGroup!);

    this.physics.add.collider(this.enemyGroup, this.brickGroup!);

    this.physics.add.overlap(
      this.player!,
      this.enemyGroup,
      this
        .handleEnemyContact as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );

    // Sync HTML content sections to Phaser platforms
    // Delay allows DOM to finish rendering before positions are read
    this.time.delayedCall(100, () => {
      this.createContentPlatforms();
      this.initialiseBrickLayout();
      this.createBrickPlatforms();
      this.initialiseLadderLayout();
      this.createLadder();
      this.initialisePoolLayout();
      this.createKiddiePool();
    });

    this.createAnimations();
    this.player.play('idle-anim');

    this.setupControls();
    this.createBackButton();

    // Handle window resize
    this.scale.on('resize', this.handleResize, this);

    // Listen for content area scroll to sync platform state
    this.setupScrollListener();
  }

  private createAnimations() {
    // Idle
    this.anims.create({
      key: 'idle-anim',
      frames: this.anims.generateFrameNumbers('idle', { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1,
    });

    // Walk
    this.anims.create({
      key: 'walk-anim',
      frames: this.anims.generateFrameNumbers('walk', { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1,
    });

    // Jump
    this.anims.create({
      key: 'jump-anim',
      frames: this.anims.generateFrameNumbers('jump', { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1,
    });

    // Faint
    this.anims.create({
      key: 'faint-anim',
      frames: this.anims.generateFrameNumbers('faint', { start: 0, end: 5 }),
      frameRate: 8,
      repeat: 0,
    });

    // Enemy animation
    this.anims.create({
      key: 'enemy-walk',
      frames: this.anims.generateFrameNumbers('enemy', { start: 0, end: 7 }),
      frameRate: 8,
      repeat: -1,
    });
  }

  /**
   * Fires left arrow sign press tween then navigate to Welcome Scene
   *
   * Called when player reaches the button or is already close enough.
   * Player is stopped and idled between tween fires for a clean visual beat.
   */
  private triggerBackButtonTween(): void {
    if (!this.backButton) return;

    // Stop player and return to idle
    this.player?.setVelocityX(0);
    this.player?.play('idle-anim', true);

    this.tweens.add({
      targets: this.backButton,
      scaleX: 1.6,
      scaleY: 1.6,
      duration: 100,
      ease: 'Sine.In',
      yoyo: true,
      onComplete: () => {
        this.navigateBack();
      },
    });
  }

  /**
   * Create Arrow Signpost to go back to Welcome Scene for touch devices
   *
   * Only rendered on touch-capable devices
   * Pinned to the left edge of platform
   * Safe to call on resize. Destroys and recreates the button each time
   */
  private createBackButton(): void {
    // Destroys existing button before recreating on resize
    if (this.backButton) {
      this.backButton.destroy();
      this.backButton = undefined;
      this.backButtonX = undefined;
      this.isWalkingToSign = false;
    }

    // Mobile touch devices only
    if (!this.sys.game.device.input.touch) return;
    if (window.innerWidth > MOBILE_MAX_WIDTH) return;

    const { height } = this.cameras.main;
    const groundCenterY = this.getGroundCenterY(height);
    const groundTopY = groundCenterY - this.GROUND_HEIGHT / 2;

    const scaledBrickSize =
      this.BRICK_SIMPLE_NATIVE_SIZE * this.BRICK_SIMPLE_SCALE;

    this.backButton = this.add.image(0, 0, 'back-button');
    this.backButton.setScale(2);
    this.backButton.setDepth(4);

    // Sign placement
    const buttonX = scaledBrickSize + this.backButton.displayWidth / 2;
    const buttonY = groundTopY - this.backButton.displayHeight / 2;
    this.backButton.setPosition(buttonX, buttonY);
    this.backButtonX = buttonX;

    this.backButton.setInteractive();
    this.backButton.on('pointerdown', () => {
      // Prevent double-firing if tapped rapidly
      if (!this.backButton) return;

      this.backButton.disableInteractive();

      // If player is at or past the left of arrow signpost, navigate immediately
      if (
        this.player &&
        this.backButtonX !== undefined &&
        this.player.x <= this.backButtonX
      ) {
        this.triggerBackButtonTween();
      }

      this.isWalkingToSign = true;
    });
  }

  private setupControls() {
    this.inputController = new InputController(this);

    // ESC key go back to Welcome Page
    this.inputController.setup(() => this.navigateBack());
  }

  update() {
    if (!this.player) return;
    if (this.isFainting) return;

    // Walk player to left arrown signpost before navigating
    if (this.isWalkingToSign && this.backButtonX !== undefined) {
      const distanceToSign = this.player.x - this.backButtonX;

      if (distanceToSign <= 8) {
        // Player arrived. Stop, idle, trigger
        this.isWalkingToSign = false;
        this.triggerBackButtonTween();
        return;
      }

      // Force walk left toward button
      this.player.setVelocityX(-this.PLAYER_SPEED);
      this.player.setFlipX(true);
      this.player.play('walk-anim', true);
      return;
    }

    this.isOnLadder = false;
    const { width, height } = this.cameras.main;

    const inputState = this.inputController?.getState() ?? {
      moveLeft: false,
      moveRight: false,
      jump: false,
      climbUp: false,
      climbDown: false,
    };
    const { moveLeft, moveRight, climbUp, climbDown } = inputState;

    // Climbing mode
    if (this.isClimbing) {
      const playerBody = this.player.body as Phaser.Physics.Arcade.Body;

      // Disable gravity while climbing
      playerBody.setGravityY(-this.physics.world.gravity.y);

      if (climbUp) {
        this.player.setVelocityY(-this.LADDER_CLIMB_SPEED);
        this.player.play('walk-anim', true);
      } else if (climbDown) {
        this.player.setVelocityY(this.LADDER_CLIMB_SPEED);
        this.player.play('walk-anim', true);
      } else {
        this.player.setVelocityY(0);
        this.player.play('idle-anim', true);
      }

      // Exit climbing: walk off ladder
      if (moveLeft || moveRight) {
        this.exitClimbing();
      }

      // Exit climbing: land on card
      if (this.ladderBounds && this.player.y < this.ladderBounds.topY) {
        this.exitClimbing();
      }

      // Exit climbing: reach the ground
      if (this.ladderBounds && this.player.y > this.ladderBounds.bottomY) {
        this.exitClimbing();
      }

      // Horizontal movement allowed while climbing
      if (moveLeft) {
        this.player.setVelocityX(-this.PLAYER_SPEED);
        this.player.setFlipX(true);
      } else if (moveRight) {
        this.player.setVelocityX(this.PLAYER_SPEED);
        this.player.setFlipX(false);
      } else {
        this.player.setVelocityX(0);
      }

      return;
    }

    /**
     * Pool mode - player is floating inside the kiddie pool
     */
    if (this.isInPool) {
      const playerBody = this.player.body as Phaser.Physics.Arcade.Body;

      // Keep gravity cancelled while in pool
      playerBody.setGravityY(-this.physics.world.gravity.y);

      // Drive gentle bob via velocity. Physics body stays in sync
      if (this.playerPoolPinnedY !== undefined) {
        this.poolBobTime += this.game.loop.delta / 1000;
        const bobVelocity =
          Math.sin(
            this.poolBobTime *
              (Math.PI / (this.POOL_PLAYER_BOB_DURATION / 1000))
          ) * this.POOL_PLAYER_BOB_SPEED;
        this.player.setVelocityY(bobVelocity);

        // Safety clamp. Prvent drift beyond bob amplitude
        if (
          this.player.y <
          this.playerPoolPinnedY - this.POOL_BOB_AMPLITUDE - 2
        ) {
          this.player.y = this.playerPoolPinnedY - this.POOL_BOB_AMPLITUDE - 2;
        } else if (
          this.player.y >
          this.playerPoolPinnedY + this.POOL_BOB_AMPLITUDE + 2
        ) {
          this.player.y = this.playerPoolPinnedY + this.POOL_BOB_AMPLITUDE + 2;
        }
      }

      // Clamp horizontal movement within pool bounds
      if (this.poolBounds) {
        const halfBody = this.player.displayWidth / 2;
        if (this.player.x < this.poolBounds.left + halfBody) {
          this.player.x = this.poolBounds.left + halfBody;
          this.player.setVelocityX(0);
        } else if (this.player.x > this.poolBounds.right - halfBody) {
          this.player.x = this.poolBounds.right - halfBody;
          this.player.setVelocityX(0);
        }
      }

      // Horizontal movement in pool
      if (moveLeft) {
        this.player.setVelocityX(-this.PLAYER_SPEED * 0.4);
        this.player.setFlipX(true);
        this.player.play('walk-anim', true);
        this.triggerWaterRipple();
        this.triggerDuckBob();
      } else if (moveRight) {
        this.player.setVelocityX(this.PLAYER_SPEED * 0.4);
        this.player.setFlipX(false);
        this.player.play('walk-anim', true);
        this.triggerWaterRipple();
        this.triggerDuckBob();
      } else {
        this.player.setVelocityX(0);
        this.player.play('idle-anim', true);
      }

      // Jump to exit pool
      const jump = inputState.jump;
      if (jump) {
        this.player.setVelocityY(this.PLAYER_JUMP_VELOCITY);
        this.player.play('jump-anim', true);
        this.handlePoolExit();
      }

      return;
    }

    /**
     * Normal movement
     */

    // Reduced gravity when falling within ladder bounds
    if (this.isOnLadder) {
      const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
      if (playerBody.velocity.y > 0) {
        playerBody.setGravityY(this.LADDER_GRAVITY_REDUCED);
      } else {
        playerBody.setGravityY(0);
      }
    } else {
      // Restore normal gravity when not on ladder
      const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
      playerBody.setGravityY(0);
    }

    // Horizontal movement
    if (moveLeft) {
      this.player.setVelocityX(-this.PLAYER_SPEED);
      this.player.play('walk-anim', true);
      this.player.setFlipX(true);
    } else if (moveRight) {
      this.player.setVelocityX(this.PLAYER_SPEED);
      this.player.play('walk-anim', true);
      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);

      // Return to idle if on ground
      if (this.player.body && this.player.body.touching.down) {
        this.player.play('idle-anim', true);
      }
    }

    // Jump
    const jump = inputState.jump;
    if (jump && this.player.body && this.player.body.touching.down) {
      this.player.setVelocityY(this.PLAYER_JUMP_VELOCITY);
      this.player.play('jump-anim', true);
    }

    // Keep player in horizontal bounds
    const bodyWidth = (this.player.body as Phaser.Physics.Arcade.Body).width;
    const leftBoundary = bodyWidth * this.PLAYER_BOUNDARY_RATIO;
    const rightBoundary = width - bodyWidth * this.PLAYER_BOUNDARY_RATIO;

    if (this.player.x < leftBoundary) {
      this.player.x = leftBoundary;
      this.player.setVelocityX(0);
    }

    if (this.player.x > rightBoundary) {
      this.player.x = rightBoundary;
    }

    /**
     * Pool Entry Detection
     *
     * Triggers when player centre reaches or passes the water rim from above within ellipse X bounds
     */
    if (
      this.poolRimY !== undefined &&
      this.waterBounds !== undefined &&
      !this.isInPool
    ) {
      const playerBody = this.player.body as Phaser.Physics.Arcade.Body;

      const withinWaterX =
        this.player.x >= this.waterBounds.left &&
        this.player.x <= this.waterBounds.right;

      const isAirborne = !playerBody.blocked.down;

      const nearRim =
        playerBody.bottom >= this.poolRimY &&
        playerBody.bottom <= this.poolRimY + this.POOL_ENTRY_THRESHOLD;

      if (withinWaterX && isAirborne && nearRim && playerBody.velocity.y > 0) {
        this.handlePoolEntry();
      }
    }

    // Safety check for falling below screen
    if (this.player.y > height + 100) {
      const groundY = this.getGroundCenterY(height);
      this.player.y = groundY - this.player.displayHeight / 2;
      this.player.setVelocityY(0);
    }

    // Destroy enemies that walked off screen
    this.enemyGroup?.getChildren().forEach((child) => {
      const enemy = child as Phaser.Physics.Arcade.Sprite;
      if (enemy.x < -100 || enemy.x > width + 100) {
        enemy.destroy();
      }
    });
  }

  createContentPlatforms() {
    // Clean up previously created platforms sans breaking collider reference
    // Reuse same group object
    this.platformGroup?.clear(true, true);

    // Clean up debug graphics
    if (this.platformDebugGraphics) {
      this.platformDebugGraphics.clear();
    } else {
      this.platformDebugGraphics = this.add.graphics();
    }

    // Read DOM positions of content sections
    const sectionElements = Array.from(
      document.querySelectorAll('[data-testid$="-section"]')
    );

    if (window.innerWidth <= CARD_STACK_BELOW_WIDTH) {
      return;
    }

    const platformRects = getPlatformRectsFromElements(sectionElements);

    platformRects.forEach((rect) => {
      // Create invisible Rectangle Game Object at the card's position
      const platform = this.add.rectangle(
        rect.x,
        rect.y,
        rect.width,
        8 // Thin collision surface - just the top edge of the card
      );

      // Give Rectangle a static physics body
      this.physics.add.existing(platform, true);

      // One-way platform
      const body = platform.body as Phaser.Physics.Arcade.StaticBody;
      body.checkCollision.down = false;
      body.checkCollision.left = false;
      body.checkCollision.right = false;

      this.platformGroup!.add(platform);

      // Debug visualisation - draws a line to see the platform
      this.platformDebugGraphics!.lineStyle(2, 0x00ff00, 1);
      this.platformDebugGraphics!.strokeRect(
        rect.x - rect.width / 2,
        rect.y,
        rect.width,
        8
      );
    });
  }

  /**
   * Reads current card span in brick slots and generates the layout.
   * Calls once after the first DOM layout.
   * Stores result. Reuses same layout during resize and scroll rebuilds.
   */
  initialiseBrickLayout() {
    const sectionElements = Array.from(
      document.querySelectorAll('[data-testid$="-section"]')
    );

    if (sectionElements.length === 0) return;

    const rects = sectionElements
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0);

    if (rects.length === 0) return;

    const scaledBrickSize =
      this.BRICK_SIMPLE_NATIVE_SIZE * this.BRICK_SIMPLE_SCALE;

    // Card span: left edge of leftmost card to right edge of rightmost card
    // Expressed in brick slots
    const spanLeft = Math.min(...rects.map((r) => r.left));
    const spanRight = Math.max(...rects.map((r) => r.right));
    const cardSpanPx = spanRight - spanLeft;
    const cardSpanSlots = Math.floor(cardSpanPx / scaledBrickSize);

    this.brickLayoutSeed = Math.floor(Math.random() * 0xffffffff);
    this.brickLayoutConfig = generateBrickLayout(
      cardSpanSlots,
      this.brickLayoutSeed
    );
  }

  /**
   * Generates and stores the ladder layout for a session.
   *
   * Uses same seed as the brick layout for session consistency
   * Called once after DOM layout settles
   */
  private initialiseLadderLayout(): void {
    if (!this.brickLayoutSeed) return;
    const rng = createSeededRandom(this.brickLayoutSeed);
    this.ladderDecision = generateLadderDecision(rng);
  }

  createBrickPlatforms() {
    this.brickGroup?.clear(true, true);

    const brickLayoutMode = this.getBrickLayout();
    if (brickLayoutMode === BrickLayout.None) return;
    if (!this.brickLayoutConfig) return;

    const sectionElements = Array.from(
      document.querySelectorAll('[data-testid$="-section"]')
    );
    if (sectionElements.length === 0) return;

    const rects = sectionElements
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0);

    if (rects.length === 0) return;

    const scaledBrickSize =
      this.BRICK_SIMPLE_NATIVE_SIZE * this.BRICK_SIMPLE_SCALE;
    const spanLeft = Math.min(...rects.map((r) => r.left));
    const highestCardTop = Math.min(...rects.map((r) => r.top));

    // Render Lower row (when layout is not None)
    // Anchored to ground platform
    const groundCenterY = this.getGroundCenterY(this.cameras.main.height);
    const groundTop = groundCenterY - this.GROUND_HEIGHT / 2;
    const belowRowY = groundTop - this.BRICK_ABOVE_GROUND_OFFSET;
    this.renderBrickRow(
      this.brickLayoutConfig.bottomRow,
      belowRowY,
      spanLeft,
      scaledBrickSize
    );

    // Render Upper row (when both rows required)
    if (brickLayoutMode === BrickLayout.Both) {
      const aboveRowY = highestCardTop - this.BRICK_ABOVE_CARD_OFFSET;
      this.renderBrickRow(
        this.brickLayoutConfig.topRow,
        aboveRowY,
        spanLeft,
        scaledBrickSize
      );
    }
  }

  /**
   * Renders ladder layout fom live DOM positions.
   *
   * Drawn using Phaser Graphics
   * Clears any existing ladder
   * Called on initial load, resize, and scroll reset
   */
  private createLadder(): void {
    this.clearLadder();

    if (!this.shouldShowLadder()) return;
    if (!this.ladderDecision) return;

    const sectionElements = Array.from(
      document.querySelectorAll('[data-testid$="-section"]')
    );

    if (sectionElements.length < 3) return;

    const rects = sectionElements
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0);

    if (rects.length < 3) return;

    const cardRects: CardRect[] = rects.map((r) => ({
      left: r.left,
      right: r.right,
      top: r.top,
    }));

    const groundCenterY = this.getGroundCenterY(this.cameras.main.height);
    const groundTopY = groundCenterY - this.GROUND_HEIGHT / 2;

    const layout = resolveLadderLayout(
      this.ladderDecision,
      cardRects,
      groundTopY
    );
    const { x, topY, bottomY } = layout;
    this.ladderBounds = { topY, bottomY };

    const ladderWidth = LADDER_RENDERED_SIZE;
    const ladderLeft = x - ladderWidth / 2;
    const ladderHeight = bottomY - topY;

    const graphics = this.add.graphics();
    this.ladderImageGroup = this.add.group();
    this.ladderImageGroup.add(graphics);

    // Draw left rail
    graphics.fillStyle(LADDER_COLOUR_RAIL, 1);
    graphics.fillRect(ladderLeft, topY, LADDER_RAIL_WIDTH, ladderHeight);

    // Draw right rail
    graphics.fillRect(
      ladderLeft + ladderWidth - LADDER_RAIL_WIDTH,
      topY,
      LADDER_RAIL_WIDTH,
      ladderHeight
    );

    // Draw ladder rungs. Evenly spaced
    graphics.fillStyle(LADDER_COLOUR_RUNG, 1);
    let rungY = topY + LADDER_RUNG_SPACING;
    const lastRungY = bottomY - LADDER_RUNG_HEIGHT - LADDER_RUNG_SPACING / 3;
    while (rungY <= lastRungY) {
      graphics.fillRect(
        ladderLeft + LADDER_RAIL_WIDTH,
        rungY,
        ladderWidth - LADDER_RAIL_WIDTH * 2,
        LADDER_RUNG_HEIGHT
      );
      rungY += LADDER_RUNG_SPACING;
    }

    // Invisible spacing. For overlap detection
    const zoneHeight = bottomY - topY;
    const zoneCenterY = topY + zoneHeight / 2;
    this.ladderZone = this.add.zone(x, zoneCenterY, ladderWidth, zoneHeight);
    this.physics.add.existing(this.ladderZone, true);
    this.physics.add.overlap(
      this.player!,
      this.ladderZone,
      this
        .handleLadderOverlap as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined,
      this
    );
  }

  /**
   * Destroys all ladder visuals and the overlap zone
   * Safe to call if ladder was never created
   */
  private clearLadder(): void {
    this.ladderImageGroup?.clear(true, true);
    this.ladderImageGroup = undefined;
    this.isClimbing = false;
    this.isOnLadder = false;
    this.ladderBounds = undefined;

    if (this.ladderZone) {
      this.ladderZone.destroy();
      this.ladderZone = undefined;
    }
  }

  /**
   * Exit climbing mode and restore normal physics
   * Called when player walks off ladder, reaches top, or falls to bottom
   */
  private exitClimbing(): void {
    this.isClimbing = false;
    if (this.player) {
      const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
      playerBody.setGravityY(0);
    }
  }

  /**
   * Renders a single brick row from a BrickRowLayout descriptor
   *
   * Iterates over every slot in the row. Skips gap slots.
   * Places brick-interactive for interactive slots, brick-simple for all others.
   *
   * @param layout - row layout descriptor from brickLayout utility
   * @param rowY - Y position in Phaser/screen space
   * @param spanLeft - left edge of card span in screen px (used as row origin)
   * @param scaledSize - rendered size of each brick tile in px
   * @oneWay - if true, only top surface collides (upper row behaviour)
   */
  private renderBrickRow(
    layout: BrickRowLayout,
    rowY: number,
    spanLeft: number,
    scaledSize: number
  ) {
    const gapSlots = new Set<number>();
    layout.gaps.forEach((gap) => {
      for (let i = 0; i < gap.width; i++) {
        gapSlots.add(gap.startIndex + i);
      }
    });

    const interactiveSlots = new Set(layout.interactiveSlots);
    for (let i = 0; i < layout.totalSlots; i++) {
      // Skip gap slots
      if (gapSlots.has(i)) continue;

      // Absolute slot index accounts for row's start offset within card span
      const absoluteSlot = layout.startSlotOffset + i;

      // X position: card span left edge + slot offset in px + half brick (centreX)
      const brickX = spanLeft + absoluteSlot * scaledSize + scaledSize / 2;

      const textureKey = interactiveSlots.has(i)
        ? 'brick-interactive'
        : 'brick-simple';

      const brick = this.brickGroup!.create(
        brickX,
        rowY,
        textureKey
      ) as Phaser.Types.Physics.Arcade.ImageWithStaticBody;

      const scale =
        textureKey === 'brick-interactive'
          ? this.BRICK_INTERACTIVE_SCALE
          : this.BRICK_SIMPLE_SCALE;
      brick.setScale(scale);

      // Sync physics body to scaled visual size
      brick.refreshBody();

      // Override physics body to 40x40 to match simple-bricks exactly
      // Offset centres the 40px body withing the 39.6px visual
      if (textureKey === 'brick-interactive') {
        const body = brick.body as Phaser.Physics.Arcade.StaticBody;
        body.setSize(40, 40, true);
      }
    }
  }

  /**
   * Spawn a flower
   *
   * Flower is static - purely decorative
   * Despawns after brick cooldown duration via its own delayedCall
   *
   * @param brick - the interactive brick that was hit
   */
  private spawnFlower(brick: Phaser.GameObjects.Image): void {
    const scaledBrickSize =
      this.BRICK_SIMPLE_NATIVE_SIZE * this.BRICK_SIMPLE_SCALE;
    const flower = this.add.image(brick.x, brick.y - scaledBrickSize, 'flower');

    flower.setScale(this.FLOWER_SCALE);

    this.time.delayedCall(8000, () => {
      if (!flower.active) return;
      flower.destroy();
    });
  }

  /**
   * Spawn an enemy
   *
   * Enemy pauses 1s then walks in a random direction.
   * Destroyed in update() when it exits the viewport
   *
   * @param brick - the interactive brick that was hit
   */
  private spawnEnemy(brick: Phaser.GameObjects.Image): void {
    const scaledBrickSize =
      this.BRICK_SIMPLE_NATIVE_SIZE * this.BRICK_SIMPLE_SCALE;
    const enemy = this.enemyGroup!.create(
      brick.x,
      brick.y - scaledBrickSize,
      'enemy'
    ) as Phaser.Physics.Arcade.Sprite;

    enemy.setScale(this.ENEMY_SCALE);
    enemy.setBodySize(this.ENEMY_BODY_WIDTH, this.ENEMY_BODY_HEIGHT);
    (enemy.body as Phaser.Physics.Arcade.Body).pushable = false;
    enemy.setOffset(this.ENEMY_BODY_OFFSET_X, this.ENEMY_BODY_OFFSET_Y);
    enemy.setGravityY(0);
    enemy.setVelocityX(0);
    enemy.play('enemy-walk');

    const direction = randomDirection(Math.random);

    this.time.delayedCall(1000, () => {
      if (!enemy.active) return;
      const velocity =
        direction === 'left' ? -this.ENEMY_SPEED : this.ENEMY_SPEED;
      enemy.setVelocityX(velocity);
      enemy.setFlipX(direction === 'left');
    });
  }

  /**
   * Fired by overlap check between player and brickGroup on every contact frame.
   *
   * On valid upward hit, ALL contacted bricks are marked cooling down
   * Prevents brick misidentification
   * Only brick-interactive gets texture swap
   * brick-simple cooldowns persist until next rebuild
   */
  private handleBrickHit(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    brick: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) {
    const playerBody = player.body as Phaser.Physics.Arcade.Body;

    // blocked.up is set by Phaser post-resolution
    if (!playerBody.blocked.up) return;

    const brickImage = brick as Phaser.GameObjects.Image;

    if (isCoolingDown(brickImage)) return;
    markCoolingDown(brickImage);
    if (brickImage.texture.key !== 'brick-interactive') return;

    brickImage.setTexture('brick-interactive-hit');

    // 50/50 chance: spawn flower or enemy
    const spawnType = randomSpawnType(Math.random);
    if (spawnType === 'flower') {
      this.spawnFlower(brickImage);
    } else {
      this.spawnEnemy(brickImage);
    }

    this.time.delayedCall(8000, () => {
      if (!brickImage.active) return;
      clearCooldown(brickImage);
      brickImage.setTexture('brick-interactive');
    });
  }

  /**
   * Fired every frame the player overlaps the ladder zone.
   *
   * Sets isOnLadder flag for update() to read
   * Activates climbing mode Up/W or Down/s is pressed
   */
  private handleLadderOverlap(): void {
    this.isOnLadder = true;

    if (this.isClimbing) return;

    const { climbUp, climbDown } = this.inputController?.getState() ?? {
      climbUp: false,
      climbDown: false,
    };

    if (climbUp || climbDown) {
      this.isClimbing = true;
    }
  }

  /**
   * Fired on every frame the player and an enemy overlap.
   *
   * Stomp (player falling onto enemy from above) -> squash and destroy enemy
   * Side contact -> trigger player faint if not already fainting
   */
  private handleEnemyContact(
    player: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    enemy: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) {
    if (this.isFainting) return;

    const playerBody = player.body as Phaser.Physics.Arcade.Body;
    const enemySprite = enemy as Phaser.Physics.Arcade.Sprite;

    const isStomp =
      playerBody.velocity.y > 0 &&
      (player as Phaser.Physics.Arcade.Sprite).y < enemySprite.y;

    if (isStomp) {
      this.stompEnemy(enemySprite);
    } else {
      this.triggerFaint();
    }
  }

  /**
   * Squash-and-tween on the enemy then destroy
   * Physics body disabled immediately so no further contact fires
   */
  private stompEnemy(enemy: Phaser.Physics.Arcade.Sprite): void {
    enemy.body!.enable = false;

    const targetY =
      enemy.y +
      (enemy.displayHeight / 2) * (1 - 0.05) -
      this.ENEMY_BODY_OFFSET_Y;

    this.tweens.add({
      targets: enemy,
      scaleY: 0.05,
      y: targetY,
      duration: 200,
      ease: 'Bounce.Out',
      onComplete: () => {
        if (!enemy.active) return;
        this.tweens.add({
          targets: enemy,
          alpha: 0,
          duration: 600,
          ease: 'Linear',
          onComplete: () => {
            if (enemy.active) enemy.destroy();
          },
        });
      },
    });
  }

  private triggerFaint(): void {
    if (!this.player) return;

    this.isFainting = true;
    this.player.setVelocity(0, 0);
    this.player.play('faint-anim');

    this.player.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + 'faint-anim',
      () => {
        if (!this.player) return;

        // Restore controls before flashing begins
        this.isFainting = false;

        const flashInterval =
          this.FAINT_FLASH_DURATION / (this.FAINT_FLASH_COUNT * 2);
        let flashCount = 0;
        const totalFlashes = this.FAINT_FLASH_COUNT * 2;

        const flashTimer = this.time.addEvent({
          delay: flashInterval,
          repeat: totalFlashes - 1,
          callback: () => {
            if (!this.player) return;
            flashCount++;
            this.player.setAlpha(flashCount % 2 === 0 ? 1 : 0.2);

            if (flashCount >= totalFlashes) {
              this.player.setAlpha(1);
              flashTimer.remove();
            }
          },
        });
      }
    );
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    const { width, height } = gameSize;
    const groundCenterY = this.getGroundCenterY(height);

    // Update ground
    if (this.ground) {
      this.ground.setPosition(width / 2, groundCenterY);
      this.ground.setSize(width, this.GROUND_HEIGHT);

      const body = this.ground.body as Phaser.Physics.Arcade.StaticBody;
      if (body) {
        body.updateFromGameObject();
      }
    }

    // Keep player in bounds
    if (this.player) {
      const bodyWidth = (this.player.body as Phaser.Physics.Arcade.Body).width;
      const leftBoundary = bodyWidth * this.PLAYER_BOUNDARY_RATIO;
      const rightBoundary = width - bodyWidth * this.PLAYER_BOUNDARY_RATIO;

      if (this.player.x < leftBoundary) {
        this.player.x = leftBoundary;
      }

      if (this.player.x > rightBoundary) {
        this.player.x = rightBoundary;
      }

      const groundTop = groundCenterY - this.GROUND_HEIGHT / 2;
      const playerBottom = this.player.y + this.player.displayHeight / 2;

      if (playerBottom > groundTop) {
        this.player.y = groundTop - this.player.displayHeight / 2;
        this.player.setVelocityY(0);
      }
    }

    // Rebuild match new DOM positions
    this.createContentPlatforms();
    this.createBrickPlatforms();
    this.createLadder();
    this.createKiddiePool();
    this.createBackButton();
  }

  private getGroundCenterY(height: number): number {
    return height - this.GROUND_OFFSET_FROM_BOTTOM;
  }

  /**
   * Derives which brick platforms should exist based on viewport dimensions
   * Called on initial load, resize, and scroll reset
   */
  private getBrickLayout(): BrickLayout {
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (w <= this.BP_WIDTH_MIN) return BrickLayout.None;
    if (h >= this.BP_HEIGHT_BOTH) return BrickLayout.Both;
    if (h >= this.BP_HEIGHT_LOWER) return BrickLayout.LowerOnly;
    return BrickLayout.None;
  }

  private shouldShowLadder(): boolean {
    return (
      window.innerWidth >= LADDER_MIN_WIDTH &&
      window.innerHeight > LADDER_MIN_HEIGHT
    );
  }

  /**
   * Derives pool decision from ladder decision.
   *
   * Pool is always on the opposite card and side from the ladder
   * Called once after initialiseLadderLayout()
   */
  private initialisePoolLayout(): void {
    if (!this.ladderDecision) return;
    this.poolDecision = resolvePoolSide(this.ladderDecision);
  }

  /**
   * Pool Water Entry Point
   *
   * Calculates the Y coordinate of the bottom edge of the water ellipse
   * waterEllipseCentre = poolY - POOL_WATER_Y_OFFSET + POOL_WATER_Y_INNER
   * waterBottomEdge = waterEllipseCentre + POOL_WATER_H / 2
   */
  private calcWaterSurfaceY(poolY: number): number {
    const waterEllipseCentre =
      poolY - this.POOL_WATER_Y_OFFSET + this.POOL_WATER_Y_INNER;
    return waterEllipseCentre + this.POOL_WATER_H / 2;
  }

  /**
   * Pool is always visible unless the viewport is too narrow to be usable
   *
   * Pool persists on mobile viewports
   * Mininum threshold matches the point where cards disappear entirely
   */
  private shouldShowPool(): boolean {
    return window.innerWidth > 360;
  }

  /**
   * Draws the kiddie pool and duck from live DOM positions.
   *
   * Clears any existing pool
   * Called on initial load, resize, scroll reset
   */
  private createKiddiePool(): void {
    this.clearKiddiePool();

    if (!this.shouldShowPool()) return;
    if (!this.poolDecision) return;

    const sectionElements = Array.from(
      document.querySelectorAll('[data-testid$="-section"]')
    );
    if (sectionElements.length < 3) return;

    const rects = sectionElements
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0);
    if (rects.length < 3) return;

    const cardRects = rects.map((r) => ({
      left: r.left,
      right: r.right,
      top: r.top,
    }));

    const groundCenterY = this.getGroundCenterY(this.cameras.main.height);
    const groundTopY = groundCenterY - this.GROUND_HEIGHT / 2;

    const viewportWidth = window.innerWidth;
    if (viewportWidth < POOL_X_BREAKPOINT_MEDIUM) {
      this.poolX = resolveMobilePoolX(viewportWidth, this.poolDecision.side);
    } else {
      const card = cardRects[this.poolDecision.cardIndex];
      this.poolX = calcPoolX(card, this.poolDecision.side);
    }

    this.poolY = calcPoolY(groundTopY);
    this.poolBounds = calcPoolBounds(this.poolX);
    const waterWidth = POOL_WIDTH * this.POOL_WATER_WIDTH_RATIO;
    this.waterBounds = {
      left: this.poolX - waterWidth / 2,
      right: this.poolX + waterWidth / 2,
    };

    // Pool rim Y is the bottom edge of the water ellipse.
    // Player crosses this Y when falling into the pool from above.
    this.poolRimY = this.calcWaterSurfaceY(this.poolY);

    // Pool shell
    this.poolGraphics = this.add.graphics();
    this.poolGraphics.setDepth(1.1);
    this.drawPool(this.poolGraphics, this.poolX, this.poolY);

    // Water shadow
    this.waterShadowGraphics = this.add.graphics();
    this.waterShadowGraphics.setDepth(1.2);
    this.drawWaterShadow(this.waterShadowGraphics, this.poolX, this.poolY);

    // Water surface
    this.waterGraphics = this.add.graphics();
    this.waterGraphics.setDepth(2);
    this.waterGraphics.setPosition(this.poolX, this.poolY);
    this.drawWaterSurface(this.waterGraphics, 0, 0);

    // Duck
    this.duckGraphics = this.add.graphics();
    this.duckGraphics.setDepth(2);
    this.duckBaseY = 0;
    this.drawDuck(this.duckGraphics, this.poolX, this.poolY);
  }

  /**
   * Destroys all pool and duck graphics safely
   * Safe to call if pool was never created
   */
  private clearKiddiePool(): void {
    if (this.poolGraphics) {
      this.poolGraphics.destroy();
      this.poolGraphics = undefined;
    }
    if (this.waterShadowGraphics) {
      this.waterShadowGraphics.destroy();
      this.waterShadowGraphics = undefined;
    }
    if (this.waterGraphics) {
      this.waterGraphics.destroy();
      this.waterGraphics = undefined;
    }
    if (this.duckGraphics) {
      this.duckGraphics.destroy();
      this.duckGraphics = undefined;
    }

    if (this.isInPool) {
      this.handlePoolExit();
    }

    this.poolX = undefined;
    this.poolY = undefined;
    this.poolBounds = undefined;
    this.waterBounds = undefined;
    this.poolRimY = undefined;
  }

  /**
   * Trigger short bob tween on the duck graphics
   *
   * Called when the player moves horizontally inside the pool
   * Ignored if duck graphics no longer exist
   */
  private triggerDuckBob(): void {
    if (!this.duckGraphics) return;

    this.tweens.add({
      targets: this.duckGraphics,
      y: this.duckGraphics.y - this.POOL_BOB_AMPLITUDE,
      duration: 150,
      ease: 'Sine.InOut',
      yoyo: true,
      onComplete: () => {
        if (this.duckGraphics) {
          this.duckGraphics.y = this.duckBaseY;
        }
      },
    });
  }

  /**
   * Simulate disturbed water
   *
   * Trigger a brief horizontal scale pulse on pool graphics
   */
  private triggerWaterRipple(): void {
    if (!this.waterGraphics) return;

    this.tweens.add({
      targets: this.waterGraphics,
      scaleX: 1.03,
      duration: 120,
      ease: 'Sine.Out',
      yoyo: true,
    });
  }

  /**
   * Returns particle emitter config for the given splash tier.
   *
   * Each tier increases particle count, speed, scale, and lifespan
   * Colour is tinted to match pool water. Alpha fades over lifetime
   */
  private createSplashConfig(
    tier: SplashTier
  ): Phaser.Types.GameObjects.Particles.ParticleEmitterConfig {
    const base = {
      tint: POOL_WATER_COLOUR,
      angle: { min: -120, max: -60 },
      gravityY: 300,
      alpha: { start: 1, end: 0 },
      frequency: -1,
    };

    if (tier === 'large') {
      return {
        ...base,
        speed: { min: 180, max: 280 },
        scale: { min: 0.6, max: 1.2 },
        lifespan: 700,
        quantity: 80,
      };
    }
    if (tier === 'medium') {
      return {
        ...base,
        speed: { min: 120, max: 200 },
        scale: { min: 0.4, max: 0.8 },
        lifespan: 550,
        quantity: 42,
      };
    }
    return {
      ...base,
      speed: { min: 80, max: 120 },
      scale: { min: 0.3, max: 0.6 },
      lifespan: 400,
      quantity: 22,
    };
  }

  /**
   * Fires a one-shot particle burst on pool entry.
   *
   * Fall distance determines splash tier via calcSplashTier
   * Emitter is created inline and destroys itself after all particles expire
   */
  private triggerSplash(): void {
    if (!this.poolX || !this.poolRimY || !this.playerEntryY) return;

    const fallDistance = this.poolRimY - this.playerEntryY;
    const tier = calcSplashTier(fallDistance);
    const config = this.createSplashConfig(tier);

    const emitter = this.add.particles(
      this.poolX,
      this.poolRimY,
      this.SPLASH_TEXTURE_KEY,
      config
    );

    emitter.setDepth(3);
    emitter.explode(config.quantity as number);

    emitter.on(Phaser.GameObjects.Particles.Events.COMPLETE, () => {
      if (emitter.active) emitter.destroy();
    });
  }

  /**
   * Called when player centre reaches the pool water rim
   *
   * Pins player at the water surface
   * Cancels gravity and velocity so player floats
   * Resets bob time so sine wave starts from pinned Y
   * Record entry Y for splash tier calculation
   * Trigger duck bob on entry
   */
  private handlePoolEntry(): void {
    if (!this.player || !this.poolRimY) return;

    this.isInPool = true;
    this.poolBobTime = 0;
    this.playerEntryY = this.player.y;

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;

    // Cancels all velocity and gravity so player floats
    this.player.setVelocity(0, 0);
    playerBody.setGravityY(-this.physics.world.gravity.y);

    // Pin player to stable water surface position
    this.playerPoolPinnedY = this.poolRimY - this.player.displayHeight * 0.6;
    this.player.y = this.playerPoolPinnedY;

    // Raise player depth. Render in front of pool shell, behind water surface and duck
    this.player.setDepth(1.5);

    this.triggerDuckBob();
    this.triggerSplash();
  }

  /**
   * Called when player jumps out of the pool
   *
   * Stops the bob tween. Restores gravity. Clears pool state
   * Player depth stays at 1. Pool graphics at depth 2 handle the layering
   */
  private handlePoolExit(): void {
    if (!this.player) return;

    this.isInPool = false;
    this.playerEntryY = undefined;
    this.playerPoolPinnedY = undefined;
    this.poolBobTime = 0;

    // Restore normal gravity
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setGravityY(0);

    // Restore player depth
    this.player.setDepth(1);
  }

  /**
   * Draws a pill/stadium shape — a rectangle with semicircular ends.
   * Used to draw each inflatable ring of the pool.
   *
   * cx, cy — centre of the pill
   * w — total width including rounded ends
   * h — total height (diameter of semicircles = h)
   * colour — fill colour
   */
  private drawPill(
    graphics: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    w: number,
    h: number,
    colour: number
  ): void {
    const radius = h / 2;
    const rectWidth = w - h; // inner rectangle width, excluding the two semicircles

    graphics.fillStyle(colour, 1);

    // Centre rectangle
    graphics.fillRect(cx - rectWidth / 2, cy - radius, rectWidth, h);

    // Left semicircle
    graphics.fillCircle(cx - rectWidth / 2, cy, radius);

    // Right semicircle
    graphics.fillCircle(cx + rectWidth / 2, cy, radius);
  }

  /**
   * Draws pool with two stacked inflatable rings.
   *
   * Bottom ring: wider, taller, lime — POOL_COLOUR_BOTTOM
   * Top ring: ellipse — POOL_COLOUR_TOP
   *
   * y is the pool centre.
   */
  private drawPool(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number
  ): void {
    const w = POOL_WIDTH;

    // Bottom ring
    const bottomRingY = y + this.POOL_BOTTOM_RING_Y_OFFSET + POOL_GROUND_EMBED;
    this.drawPill(
      graphics,
      x,
      bottomRingY,
      w,
      this.POOL_BOTTOM_RING_H,
      POOL_COLOUR_BOTTOM
    );

    // Top ring
    const topRingY = y - this.POOL_TOP_RING_Y_OFFSET;
    graphics.fillStyle(POOL_COLOUR_TOP, 1);
    graphics.fillEllipse(
      x,
      topRingY + this.POOL_TOP_RING_Y_INNER,
      w - 2,
      this.POOL_TOP_RING_H
    );
  }

  /**
   * Draws the water shadow ellipse.
   * Sits on top of player during walk past.
   * On top of player while in pool (created earlier)
   */
  private drawWaterShadow(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number
  ): void {
    const waterY = y - this.POOL_WATER_Y_OFFSET;
    const waterW = POOL_WIDTH * this.POOL_WATER_WIDTH_RATIO;

    graphics.fillStyle(POOL_COLOUR_SHADOW, 1);
    graphics.fillEllipse(
      x,
      waterY + this.POOL_WATER_SHADOW_Y_INNER,
      waterW,
      this.POOL_WATER_SHADOW_H
    );
  }

  /**
   * Draws the water surface inside the top ring.
   * A shadow sits just below to suggest depth.
   * Always in front of the player.
   *
   * y is the pool centre.
   */
  private drawWaterSurface(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number
  ): void {
    const waterY = y - this.POOL_WATER_Y_OFFSET;
    const waterW = POOL_WIDTH * this.POOL_WATER_WIDTH_RATIO;

    graphics.fillStyle(POOL_WATER_COLOUR, POOL_WATER_ALPHA);
    graphics.fillEllipse(
      x,
      waterY + this.POOL_WATER_Y_INNER,
      waterW,
      this.POOL_WATER_H
    );
  }

  /**
   * Draws a retro rubber duck floating in the water.
   * Duck sits slightly right of centre so it reads clearly against the pool rim
   */
  private drawDuck(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number
  ): void {
    // Water surface Y. Duck floats at this level
    const waterY = y - this.POOL_DUCK_WATER_Y_OFFSET;

    // Duck offset: sits slightly right of pool centre
    const duckX = x + this.POOL_DUCK_X_OFFSET;

    // Body
    graphics.fillStyle(this.DUCK_COLOUR, 1);
    graphics.fillEllipse(duckX, waterY, 20, 11);

    // Head
    graphics.fillStyle(this.DUCK_COLOUR, 1);
    graphics.fillCircle(duckX + 6, waterY - 8, 6);

    // Bill
    graphics.fillStyle(this.DUCK_BILL_COLOUR, 1);
    graphics.fillRect(duckX + 10, waterY - 9, 5, 3);

    // Eye
    graphics.fillStyle(this.DUCK_EYE_COLOUR, 1);
    graphics.fillCircle(duckX + 7, waterY - 9, 1.5);

    // Wing
    graphics.fillStyle(this.DUCK_WING_COLOUR, 1);
    graphics.fillEllipse(duckX + 2, waterY + 1, 9, 5);
  }

  private navigateBack() {
    if (this.onNavigateBack) {
      this.onNavigateBack();
    }
  }

  private setupScrollListener() {
    this.contentAreaElement =
      document.querySelector('.content-area') ?? undefined;

    if (!this.contentAreaElement) return;

    this.contentAreaElement.addEventListener(
      'scroll',
      this.handleContentScroll
    );
  }

  private handleContentScroll = () => {
    const scrollTop = this.contentAreaElement?.scrollTop ?? 0;
    const atTop = scrollTop === 0;

    if (atTop && this.isScrolled) {
      // Rebuild platforms
      this.isScrolled = false;
      this.createContentPlatforms();
      this.createBrickPlatforms();
      this.createLadder();
      if (window.innerWidth >= POOL_X_BREAKPOINT_MEDIUM) {
        this.createKiddiePool();
      }
    } else if (!atTop && !this.isScrolled) {
      // Scrolled away from top -> clear platforms. Drop player to ground
      this.isScrolled = true;
      this.platformGroup?.clear(true, true);
      this.platformDebugGraphics?.clear();
      this.brickGroup?.clear(true, true); // clear bricks on scroll away
      this.clearLadder();
      if (window.innerWidth >= POOL_X_BREAKPOINT_MEDIUM) {
        this.clearKiddiePool();
      }
    }
  };

  shutdown() {
    this.contentAreaElement?.removeEventListener(
      'scroll',
      this.handleContentScroll
    );
    this.inputController?.destroy();
    this.clearLadder();
    this.clearKiddiePool();
  }
}
