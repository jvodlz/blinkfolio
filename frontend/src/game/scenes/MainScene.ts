import Phaser from 'phaser';
import { getPlatformRectsFromElements } from '../utils/platformSync';
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
  private brickLayoutConfig?: BrickLayoutConfig;
  private brickLayoutSeed?: number;

  // Ladder
  private ladderDecision?: LadderDecision;
  private ladderImageGroup?: Phaser.GameObjects.Group;
  private ladderZone?: Phaser.GameObjects.Zone;

  // Enemy
  private enemyGroup?: Phaser.Physics.Arcade.Group;

  // Player state
  private isFainting: boolean = false;

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
    if (this.isFainting) return;

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
    this.physics.add.overlap(this.player!, this.ladderZone);
  }

  /**
   * Destroys all ladder visuals and the overlap zone
   * Safe to call if ladder was never created
   */
  private clearLadder(): void {
    this.ladderImageGroup?.clear(true, true);
    this.ladderImageGroup = undefined;

    if (this.ladderZone) {
      this.ladderZone.destroy();
      this.ladderZone = undefined;
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
    } else if (!atTop && !this.isScrolled) {
      // Scrolled away from top -> clear platforms. Drop player to ground
      this.isScrolled = true;
      this.platformGroup?.clear(true, true);
      this.platformDebugGraphics?.clear();
      this.brickGroup?.clear(true, true); // clear bricks on scroll away
      this.clearLadder();
    }
  };

  shutdown() {
    this.contentAreaElement?.removeEventListener(
      'scroll',
      this.handleContentScroll
    );
    this.clearLadder();
  }
}
