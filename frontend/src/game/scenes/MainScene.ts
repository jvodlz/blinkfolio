import Phaser from 'phaser';
import { getPlatformRectsFromElements } from '../utils/platformSync';

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

  private readonly PLAYER_BODY_WIDTH = 18;
  private readonly PLAYER_BODY_HEIGHT = 16;
  private readonly PLAYER_BODY_OFFSET_X = 7;
  private readonly PLAYER_BODY_OFFSET_Y = 16;

  // Brick platform
  private readonly BRICK_SCALE = 2.5;
  private readonly BRICK_NATIVE_SIZE = 16;
  private readonly BRICK_ABOVE_CARD_OFFSET = 80;
  private readonly BRICK_BELOW_CARD_OFFSET = 60;

  // Brick breakpoint thresholds
  private readonly BP_WIDTH_MIN = 1028;
  private readonly BP_HEIGHT_BOTH = 947;
  private readonly BP_HEIGHT_LOWER = 827;

  private player?: Phaser.Physics.Arcade.Sprite;
  private ground?: Phaser.GameObjects.Rectangle;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  // Callbacks
  private onNavigateBack?: () => void;

  // Content platforms
  private platformGroup?: Phaser.Physics.Arcade.StaticGroup;
  private platformDebugGraphics?: Phaser.GameObjects.Graphics;

  // Brick platforms
  private brickGroup?: Phaser.Physics.Arcade.StaticGroup;

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

    // Create player at left side of screen
    this.player = this.physics.add.sprite(150, -100, 'idle');
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
    this.brickGroup = this.physics.add.staticGroup();
    this.physics.add.collider(this.player!, this.brickGroup);

    // Sync HTML content sections to Phaser platforms
    // Delay allows DOM to finish rendering before positions are read
    this.time.delayedCall(100, () => {
      this.createContentPlatforms();
      this.createBrickPlatforms();
    });

    this.createAnimations();
    this.player.play('idle-anim');

    this.setupControls();

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
      repeat: -1,
    });

    // Enemy animation
    this.anims.create({
      key: 'enemy-walk',
      frames: this.anims.generateFrameNumbers('enemy', { start: 0, end: 7 }),
      frameRate: 8,
      repeat: -1,
    });
  }

  private setupControls() {
    // Arrow keys
    this.cursors = this.input.keyboard?.createCursorKeys();

    // WASD keys
    if (this.input.keyboard) {
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }

    // ESC key go back to Welcome Page
    this.input.keyboard?.on('keydown-ESC', () => {
      this.navigateBack();
    });
  }

  update() {
    if (!this.player || !this.cursors) return;

    const { width, height } = this.cameras.main;

    const moveLeft = this.cursors.left.isDown || this.wasd?.A.isDown;
    const moveRight = this.cursors.right.isDown || this.wasd?.D.isDown;
    const jump = this.cursors.up.isDown || this.wasd?.W.isDown;

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

    // Safety check for falling below screen
    if (this.player.y > height + 100) {
      const groundY = this.getGroundCenterY(height);
      this.player.y = groundY - this.player.displayHeight / 2;
      this.player.setVelocityY(0);
    }
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

    if (window.innerWidth <= 768) {
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

  createBrickPlatforms() {
    this.brickGroup?.clear(true, true);

    const layout = this.getBrickLayout();

    if (layout === BrickLayout.None) return;

    const sectionElements = Array.from(
      document.querySelectorAll('[data-testid$="-section"]')
    );

    if (sectionElements.length === 0) return;

    const rects = sectionElements
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0);

    if (rects.length === 0) return;

    const lowestCardBottom = Math.max(...rects.map((r) => r.bottom));
    const scaledBrickSize = this.BRICK_NATIVE_SIZE * this.BRICK_SCALE;
    const brickCount = Math.ceil(window.innerWidth / scaledBrickSize);

    // Lower row
    const belowRowY = lowestCardBottom + this.BRICK_BELOW_CARD_OFFSET;
    this.placeBrickRow(belowRowY, brickCount, scaledBrickSize, false);

    // Upper row
    if (layout === BrickLayout.Both) {
      const highestCardTop = Math.min(...rects.map((r) => r.top));
      const aboveRowY = highestCardTop - this.BRICK_ABOVE_CARD_OFFSET;
      this.placeBrickRow(aboveRowY, brickCount, scaledBrickSize, true);
    }
  }

  /**
   * Places single row of brick-simple tiles across the screen width
   *
   * @param rowY - Y position of the row in screen/Phaser space
   * @param brickCount - no. of bricks to tile across
   * @param scaledSize - rendered size of each brick in px (native x scale)
   * @param oneWay - if tue, player only land on top (upper row behaviour)
   */
  private placeBrickRow(
    rowY: number,
    brickCount: number,
    scaledSize: number,
    oneWay: boolean
  ) {
    for (let i = 0; i < brickCount; i++) {
      const brick = this.brickGroup!.create(
        i * scaledSize + scaledSize / 2, // centreX of each tile
        rowY,
        'brick-simple'
      ) as Phaser.Types.Physics.Arcade.ImageWithStaticBody;

      brick.setScale(this.BRICK_SCALE);

      // Sync the physics body to scaled visual size
      brick.refreshBody();

      if (oneWay) {
        // Upper row only
        const body = brick.body as Phaser.Physics.Arcade.StaticBody;
        body.checkCollision.down = false;
        body.checkCollision.left = false;
        body.checkCollision.right = false;
      }
    }
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

    // Rebuild content platforms to match new DOM positions
    this.createContentPlatforms();
    this.createBrickPlatforms();
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
    } else if (!atTop && !this.isScrolled) {
      // Scrolled away from top -> clear platforms. Drop player to ground
      this.isScrolled = true;
      this.platformGroup?.clear(true, true);
      this.platformDebugGraphics?.clear();
      this.brickGroup?.clear(true, true); // clear bricks on scroll away
    }
  };

  shutdown() {
    this.contentAreaElement?.removeEventListener(
      'scroll',
      this.handleContentScroll
    );
  }
}
