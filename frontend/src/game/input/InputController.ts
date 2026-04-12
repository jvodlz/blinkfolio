import Phaser from 'phaser';

/**
 * Input state contract
 */
export interface InputState {
  moveLeft: boolean;
  moveRight: boolean;
  jump: boolean;
  climbUp: boolean;
  climbDown: boolean;
}

/**
 * Constants
 */
const SWIPE_MIN_DELTA = 20; // Mininum pixel distance travelled to register swipe
const TOUCH_MOVE_LATCH_MS = 300;

/**
 * InputController
 *
 * Abstracts keyboard and touch input into a single normalised state
 * MainScene calls getState() each update tick. Never reads raw input sources directly
 *
 * Touch swipe rules:
 *   - Diagonal: moveLeft/moveRight + jump (angled hop)
 *   - Pure up: jump only
 *   - Pure horizontal: move only
 */
export class InputController {
  private readonly scene: Phaser.Scene;

  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  // Touch tracking
  private touchStartX: number = 0;
  private touchStartY: number = 0;

  // Pending touch-derived state. Consumed once per swipe
  private pendingState: InputState = InputController.emptyState();

  private latchedMoveLeft: boolean = false;
  private latchedMoveRight: boolean = false;
  private latchClearTimer?: ReturnType<typeof setTimeout>;

  /**
   * Construction & setup
   */
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Returns a zeroed-out InputState
   *
   * Static helper for initialisation and resetting state after consumption
   */
  private static emptyState(): InputState {
    return {
      moveLeft: false,
      moveRight: false,
      jump: false,
      climbUp: false,
      climbDown: false,
    };
  }

  /**
   * Sets up keyboard bindings and touch listeners.
   */
  setup(onNavigateBack: () => void): void {
    this.setupKeyboard(onNavigateBack);
    this.setupTouch();
  }

  private setupKeyboard(onNavigateBack: () => void): void {
    this.cursors = this.scene.input.keyboard?.createCursorKeys();

    if (this.scene.input.keyboard) {
      this.wasd = {
        W: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }

    this.scene.input.keyboard?.on('keydown-ESC', () => {
      onNavigateBack();
    });
  }

  /**
   * Registers touchstart and touchend listeners on the Phaser canvas element.
   *
   * Listen directly on canvas so touch events on content area (cards, scroll) are not intercepted
   * touchstart: records finger start position
   * touchend: calculates delta and resolves swipe direction
   */
  private setupTouch(): void {
    const canvas = this.scene.sys.game.canvas;

    canvas.addEventListener('touchstart', this.handleTouchStart, {
      passive: true,
    });

    canvas.addEventListener('touchend', this.handleTouchEnd, {
      passive: true,
    });
  }

  /**
   * Touch handlers
   */

  /**
   * Records finger starting position when touch begins.
   * Arrow function syntax binds `this` at definition time
   * Methods can be used directly as an event listener sans .bind(this) gymnastics
   */
  private handleTouchStart = (e: TouchEvent): void => {
    const touch = e.changedTouches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
  };

  /**
   * Calculates swipe delta on finger lift and resolves on the InputState.
   *
   * Delta is measured from touchstart to touchend
   * Total movement below SWIPE_MIN_DELTA is ignored as accidental tap or tremor
   */
  private handleTouchEnd = (e: TouchEvent): void => {
    const touch = e.changedTouches[0];
    const dx = touch.clientX - this.touchStartX;
    const dy = touch.clientY - this.touchStartY;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const totalDelta = Math.sqrt(dx * dx + dy * dy);

    if (totalDelta < SWIPE_MIN_DELTA) return;

    const isDiagonal = absDx >= SWIPE_MIN_DELTA && absDy >= SWIPE_MIN_DELTA;
    const isPureHorizontal =
      absDx >= SWIPE_MIN_DELTA && absDy < SWIPE_MIN_DELTA;
    const isPureUp =
      absDy >= SWIPE_MIN_DELTA && absDx < SWIPE_MIN_DELTA && dy < 0;

    const next = InputController.emptyState();

    if (isDiagonal) {
      // Diagonal swipe: directional jump
      next.moveLeft = dx < 0;
      next.moveRight = dx > 0;
      next.jump = true;
    } else if (isPureHorizontal) {
      // Pure horizontal: movement only
      next.moveLeft = dx < 0;
      next.moveRight = dx > 0;
    } else if (isPureUp) {
      // Pure up: jump only
      next.jump = true;
    }

    this.pendingState = next;

    /**
     * Latch horizontal movement for TOUCH_MOVE_LATCH_MS
     * Clears any previous latch before starting a new one
     **/
    if (next.moveLeft || next.moveRight) {
      this.latchedMoveLeft = next.moveLeft;
      this.latchedMoveRight = next.moveRight;

      if (this.latchClearTimer !== undefined) {
        clearTimeout(this.latchClearTimer);
      }

      this.latchClearTimer = setTimeout(() => {
        this.latchedMoveLeft = false;
        this.latchedMoveRight = false;
        this.latchClearTimer = undefined;
      }, TOUCH_MOVE_LATCH_MS);
    }
  };

  /**
   * Public interface. Called at every tick
   */

  /**
   * Returns the merged input state for the current frame.
   *
   * Keyboard state is read live (held keys stay true each frame)
   * Touch state is consumed once per swipe then cleared
   *
   * Merging means either source can trigger and action (keyboard OR touch)
   */
  getState(): InputState {
    const kb = this.readKeyboard();
    const touch = this.pendingState;

    // Consume touch state (fires for one frame, then, resets)
    this.pendingState = InputController.emptyState();

    return {
      moveLeft: kb.moveLeft || touch.moveLeft || this.latchedMoveLeft,
      moveRight: kb.moveRight || touch.moveRight || this.latchedMoveRight,
      jump: kb.jump || touch.jump,
      climbUp: kb.climbUp || touch.climbUp,
      climbDown: kb.climbDown || touch.climbDown,
    };
  }

  /**
   * Reads live keyboard state into InputState shape.
   */
  private readKeyboard(): InputState {
    return {
      moveLeft:
        this.cursors?.left.isDown === true || this.wasd?.A.isDown === true,
      moveRight:
        this.cursors?.right.isDown === true || this.wasd?.D.isDown === true,
      jump:
        this.cursors?.up.isDown === true ||
        this.wasd?.W.isDown === true ||
        this.cursors?.space.isDown === true,
      climbUp:
        this.cursors?.up.isDown === true ||
        this.wasd?.W.isDown === true ||
        this.cursors?.space.isDown === true,
      climbDown:
        this.cursors?.down.isDown === true || this.wasd?.S.isDown === true,
    };
  }

  /**
   * Cleanup
   */

  /**
   * Removes all touch listeners from the canvas.
   */
  destroy(): void {
    if (this.latchClearTimer !== undefined) {
      clearTimeout(this.latchClearTimer);
    }
    const canvas = this.scene.sys.game.canvas;
    canvas.removeEventListener('touchstart', this.handleTouchStart);
    canvas.removeEventListener('touchend', this.handleTouchEnd);
  }
}
