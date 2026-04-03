/**
 * Brick Layout Generation Utility
 *
 * Generates a deterministic layout for a single brick row
 * (gap positions, interactive brick positions, row width, start offset)
 * from a random seed.
 *
 * The layout is generated once at page load and reused on every rebuild
 * (resize, scroll reset)
 * so the platform feels stable during a session.
 *
 * No Phaser dependency
 */

/**
 * Types
 *
 * Describes the anchor behaviour of the Top brick row.
 * Bottom row is always anchored flush between card edges (minus end reserves)
 */
export type RowAnchor = 'flush-left' | 'flush-right' | 'floating';

/**
 * Gap
 *
 * Contiguous run of missing bricks.
 * startIndex is the brick slot index where the gap begins
 * width is the number of consectutive empty slots (1 or 2)
 */
export interface BrickGap {
  startIndex: number;
  width: number;
}

/**
 * Brick Layout - per brick row
 *
 * Values are in brick-slot units (not pixels)
 * Layout is resolution-independent and can be rebuilt at any scale
 */
export interface BrickRowLayout {
  totalSlots: number;
  startSlotOffset: number;
  interactiveSlots: number[];
  gaps: BrickGap[];
  anchor: RowAnchor;
}

/**
 * Constants
 */

// Brick slots reserved
export const BOTTOM_ROW_END_RESERVE = 2;

// Slots shorter than full card span (Top row)
export const TOP_ROW_SHORTFALL_MIN = 3;
export const TOP_ROW_SHORTFALL_MAX = 6;

// Anchors (Flush-left, Flush-right)
export const FLUSH_INSET_MIN = 0;
export const FLUSH_INSET_MAX = 1;

// Floating anchors
export const FLOAT_INSET_MIN = 3;
export const FLOAT_INSET_MAX = 6;

// Gap count per row
export const GAP_COUNT_MIN = 1;
export const GAP_COUNT_MAX = 3;

export const INTERACTIVE_MAX = 3;

/**
 * Seeded Random Number Generator
 *
 * A simple seeded pseudo-random number generator (Mulberry32 algorithm).
 * Returns a function that produces a number in [0, 1) on each call
 *
 * Seeded RNG allows tests to pass a fixed seed and get deterministic results
 */
export function createSeededRandom(seed: number): () => number {
  let s = seed >>> 0; // unsigned 32-bit int
  return function () {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Return random integer between min and max inclusive
 * Uses seeded random function
 */
export function randomInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Gap Generation
 *
 * Generates non-overlapping gap descriptors for a row of the given slot count.
 * Gaps are placed randomly, never overlaps.
 * Count is random between GAP_COUNT_MIN and GAP_COUNT_MAX.
 *
 * @param totalSlots - total number of slots in the row
 * @param rng - seeded random function
 */
export function generateGaps(
  totalSlots: number,
  rng: () => number
): BrickGap[] {
  const gapCount = randomInt(GAP_COUNT_MIN, GAP_COUNT_MAX, rng);
  const gaps: BrickGap[] = [];

  // Track slots claimed by gap. Prevent overlaps
  const occupied = new Set<number>();

  let attempts = 0;
  const maxAttempts = 100; // Safety valve. Prevent infinite loop

  while (gaps.length < gapCount && attempts < maxAttempts) {
    attempts++;
    const gapWidth = randomInt(1, 2, rng);
    const startIndex = randomInt(0, totalSlots - gapWidth - 1, rng);

    // Check no slots the gap would occupy is already taken
    const slotsTaken = Array.from(
      { length: gapWidth },
      (_, i) => startIndex + i
    );
    const hasOverlap = slotsTaken.some((s) => occupied.has(s));

    if (!hasOverlap) {
      gaps.push({ startIndex, width: gapWidth });
      slotsTaken.forEach((s) => occupied.add(s));
    }
  }
  return gaps;
}

/**
 * Interactive Brick Slot Selection
 *
 * Selects 1 INTERACTIVE_MAX slot indices to contain interactive bricks.
 * Never places an interactive brick in a gap slot
 *
 * @param totalSlots - total number of slots in the row
 * @param gaps - already-generated gaps to avoid
 * @param rng - seeded random function
 */
export function generateInteractiveSlots(
  totalSlots: number,
  gaps: BrickGap[],
  rng: () => number
): number[] {
  // Build set of gap slots indices to exclude
  const gapSlots = new Set<number>();
  gaps.forEach((gap) => {
    for (let i = 0; i < gap.width; i++) {
      gapSlots.add(gap.startIndex + i);
    }
  });

  // Available slots are everything not in a gap
  const available = Array.from({ length: totalSlots }, (_, i) => i).filter(
    (i) => !gapSlots.has(i)
  );

  if (available.length === 0) return [];

  const count = randomInt(1, Math.min(INTERACTIVE_MAX, available.length), rng);

  // Fisher-Yates shuffle to pick random slots sans reptition (unbiased)
  const shuffled = [...available];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count).sort((a, b) => a - b);
}

/**
 * Top Row Layout
 *
 * Generate Top Brick Row.
 * Row is shorter than the full card span, with a random anchor
 */
export function generateTopRowLayout(
  cardSpanSlots: number,
  rng: () => number
): BrickRowLayout {
  const shortfall = randomInt(
    TOP_ROW_SHORTFALL_MIN,
    TOP_ROW_SHORTFALL_MAX,
    rng
  );
  const totalSlots = Math.max(1, cardSpanSlots - shortfall);

  // Pick anchor: 0 = flush-left, 1 = flush-right, 2 = floating
  const anchorChoice = randomInt(0, 2, rng);
  let anchor: RowAnchor;
  let startSlotOffset: number;

  if (anchorChoice === 0) {
    anchor = 'flush-left';
    startSlotOffset = randomInt(FLUSH_INSET_MIN, FLOAT_INSET_MAX, rng);
  } else if (anchorChoice === 1) {
    anchor = 'flush-right';
    const inset = randomInt(FLUSH_INSET_MIN, FLOAT_INSET_MAX, rng);
    startSlotOffset = cardSpanSlots - totalSlots - inset;
  } else {
    anchor = 'floating';
    const floatFromLeft = rng() < 0.5;
    const inset = randomInt(FLOAT_INSET_MIN, FLOAT_INSET_MAX, rng);
    startSlotOffset = floatFromLeft
      ? inset
      : cardSpanSlots - totalSlots - inset;
  }

  // Clamp startSlotOffset to valid range
  startSlotOffset = Math.max(
    0,
    Math.min(startSlotOffset, cardSpanSlots - totalSlots)
  );

  const gaps = generateGaps(totalSlots, rng);
  const interactiveSlots = generateInteractiveSlots(totalSlots, gaps, rng);

  return { totalSlots, startSlotOffset, interactiveSlots, gaps, anchor };
}

/**
 * Bottom Row Layout
 *
 * Generates Bottom Brick Row.
 * Spans from leftmost to rightmost card edge.
 *
 * @param cardSpanSlots - total slots spanning from leftmost to rightmost card edge
 * @param rng - seeded random function
 */
export function generateBottomRowLayout(
  cardSpanSlots: number,
  rng: () => number
): BrickRowLayout {
  // Reserve slots at both ends
  const totalSlots = Math.max(1, cardSpanSlots - BOTTOM_ROW_END_RESERVE * 2);
  const startSlotOffset = BOTTOM_ROW_END_RESERVE;

  const gaps = generateGaps(totalSlots, rng);
  const interactiveSlots = generateInteractiveSlots(totalSlots, gaps, rng);

  return {
    totalSlots,
    startSlotOffset,
    interactiveSlots,
    gaps,
    anchor: 'flush-left', // Bottom row always starts from left card edge + reserve
  };
}

/**
 * Main Entry Point
 */
export interface BrickLayoutConfig {
  topRow: BrickRowLayout;
  bottomRow: BrickRowLayout;
}

/**
 * Generate complete brick layout for both rows from a single seed.
 * Call this once at page load. Store the result and reuse on every resize and scroll reset.
 *
 * @param cardSpanSlots - number of brick slots spanning the full card width
 * @param seed - random seed (use Math.random() * 0xffffffff at load time)
 */
export function generateBrickLayout(
  cardSpanSlots: number,
  seed: number
): BrickLayoutConfig {
  const rng = createSeededRandom(seed);
  const topRow = generateTopRowLayout(cardSpanSlots, rng);

  // Bottom row uses same rng. It advances sequence from where Top row left off
  const bottomRow = generateBottomRowLayout(cardSpanSlots, rng);
  return { topRow, bottomRow };
}
