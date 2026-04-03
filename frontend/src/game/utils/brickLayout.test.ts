import { describe, it, expect } from 'vitest';
import {
  createSeededRandom,
  randomInt,
  generateInteractiveSlots,
  generateTopRowLayout,
  generateBottomRowLayout,
  generateBrickLayout,
  BOTTOM_ROW_END_RESERVE,
  GAP_COUNT_MIN,
  GAP_COUNT_MAX,
  INTERACTIVE_MAX,
  TOP_ROW_SHORTFALL_MIN,
  TOP_ROW_SHORTFALL_MAX,
  generateGaps,
} from './brickLayout';

/**
 * Seeded RNG
 */
describe('createSeededRandom', () => {
  it('produces values in [0, 1)', () => {
    const rng = createSeededRandom(42);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('produces the same sequence for the same seed', () => {
    const rng1 = createSeededRandom(123);
    const rng2 = createSeededRandom(123);
    for (let i = 0; i < 20; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it('produces different sequences for different seeds', () => {
    const rng1 = createSeededRandom(1);
    const rng2 = createSeededRandom(2);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).not.toEqual(seq2);
  });
});

/**
 * randomInt
 */
describe('randomInt', () => {
  it('always returns a value within the inclusive range', () => {
    const rng = createSeededRandom(99);
    for (let i = 0; i < 200; i++) {
      const v = randomInt(2, 7, rng);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(7);
    }
  });

  it('returns the only possible value when min equals max', () => {
    const rng = createSeededRandom(1);
    expect(randomInt(5, 5, rng)).toBe(5);
  });
});

/**
 * generateGaps
 */
describe('generateGaps', () => {
  it('produces gaps between GAP_COUNT_MIN and GAP_COUNT_MAX', () => {
    const rng = createSeededRandom(7);
    const gaps = generateGaps(20, rng);
    expect(gaps.length).toBeGreaterThanOrEqual(GAP_COUNT_MIN);
    expect(gaps.length).toBeLessThanOrEqual(GAP_COUNT_MAX);
  });

  it('gaps never overlap each other', () => {
    // Run many seeds to check no overlaps occur
    for (let seed = 0; seed < 50; seed++) {
      const rng = createSeededRandom(seed);
      const gaps = generateGaps(20, rng);
      const occupied = new Set<number>();
      gaps.forEach((gap) => {
        for (let i = 0; i < gap.width; i++) {
          const slot = gap.startIndex + i;
          expect(occupied.has(slot)).toBe(false);
          occupied.add(slot);
        }
      });
    }
  });

  it('all gap slots are within row bounds', () => {
    const totalSlots = 15;
    const rng = createSeededRandom(3);
    const gaps = generateGaps(totalSlots, rng);
    gaps.forEach((gap) => {
      expect(gap.startIndex).toBeGreaterThanOrEqual(0);
      expect(gap.startIndex + gap.width - 1).toBeLessThan(totalSlots);
    });
  });

  it('each gap width is 2 or 3', () => {
    const rng = createSeededRandom(55);
    const gaps = generateGaps(20, rng);
    gaps.forEach((gap) => {
      expect([2, 3]).toContain(gap.width);
    });
  });
});

/**
 * generateInteractiveSlots
 */
describe('generateInteractiveSlots', () => {
  it('returns at least 1 and at most INTERACTIVE_MAX slots', () => {
    const rng = createSeededRandom(11);
    const gaps = generateGaps(20, rng);
    const rng2 = createSeededRandom(11); // fresh rng for interactive
    generateGaps(20, rng2);
    const slots = generateInteractiveSlots(20, gaps, rng2);
    expect(slots.length).toBeGreaterThanOrEqual(1);
    expect(slots.length).toBeLessThanOrEqual(INTERACTIVE_MAX);
  });

  it('never places an interactive brick in a gap slot', () => {
    for (let seed = 0; seed < 50; seed++) {
      const rng = createSeededRandom(seed);
      const gaps = generateGaps(20, rng);
      const slots = generateInteractiveSlots(20, gaps, rng);
      const gapSlots = new Set<number>();
      gaps.forEach((g) => {
        for (let i = 0; i < g.width; i++) gapSlots.add(g.startIndex + i);
      });
      slots.forEach((s) => {
        expect(gapSlots.has(s)).toBe(false);
      });
    }
  });

  it('returns no duplicate slot indices', () => {
    const rng = createSeededRandom(22);
    const gaps = generateGaps(20, rng);
    const slots = generateInteractiveSlots(20, gaps, rng);
    expect(new Set(slots).size).toBe(slots.length);
  });
});

/**
 * generateTopRowLayout
 */
describe('generateTopRowLayout', () => {
  it('total slots is shorter than card span by shortfall range', () => {
    for (let seed = 0; seed < 30; seed++) {
      const rng = createSeededRandom(seed);
      const cardSpanSlots = 25;
      const layout = generateTopRowLayout(cardSpanSlots, rng);
      const shortfall = cardSpanSlots - layout.totalSlots;
      expect(shortfall).toBeGreaterThanOrEqual(TOP_ROW_SHORTFALL_MIN);
      expect(shortfall).toBeLessThanOrEqual(TOP_ROW_SHORTFALL_MAX);
    }
  });

  it('anchor is one of the three valid values', () => {
    const rng = createSeededRandom(5);
    const layout = generateTopRowLayout(25, rng);
    expect(['flush-left', 'flush-right', 'floating']).toContain(layout.anchor);
  });

  it('startSlotOffset keeps the row within card span bounds', () => {
    for (let seed = 0; seed < 50; seed++) {
      const rng = createSeededRandom(seed);
      const cardSpanSlots = 25;
      const layout = generateTopRowLayout(cardSpanSlots, rng);
      expect(layout.startSlotOffset).toBeGreaterThanOrEqual(0);
      expect(layout.startSlotOffset + layout.totalSlots).toBeLessThanOrEqual(
        cardSpanSlots
      );
    }
  });

  it('is deterministic for the same seed', () => {
    const rng1 = createSeededRandom(77);
    const rng2 = createSeededRandom(77);
    const layout1 = generateTopRowLayout(20, rng1);
    const layout2 = generateTopRowLayout(20, rng2);
    expect(layout1).toEqual(layout2);
  });
});

/**
 * generateBottomRowLayout
 */
describe('generateBottomRowLayout', () => {
  it('reserves BOTTOM_ROW_END_RESERVE slots at each end', () => {
    const rng = createSeededRandom(8);
    const cardSpanSlots = 20;
    const layout = generateBottomRowLayout(cardSpanSlots, rng);
    expect(layout.startSlotOffset).toBe(BOTTOM_ROW_END_RESERVE);
    expect(layout.totalSlots).toBe(cardSpanSlots - BOTTOM_ROW_END_RESERVE * 2);
  });

  it('anchor is always flush-left', () => {
    const rng = createSeededRandom(9);
    const layout = generateBottomRowLayout(20, rng);
    expect(layout.anchor).toBe('flush-left');
  });

  it('contains at least one interactive brick', () => {
    const rng = createSeededRandom(13);
    const layout = generateBottomRowLayout(20, rng);
    expect(layout.interactiveSlots.length).toBeGreaterThanOrEqual(1);
  });
});

/**
 * generateBrickLayout
 */
describe('generateBrickLayout', () => {
  it('returns both topRow and bottomRow', () => {
    const config = generateBrickLayout(25, 12345);
    expect(config.topRow).toBeDefined();
    expect(config.bottomRow).toBeDefined();
  });

  it('is fully deterministic for the same seed', () => {
    const config1 = generateBrickLayout(25, 99999);
    const config2 = generateBrickLayout(25, 99999);
    expect(config1).toEqual(config2);
  });

  it('produces different layouts for different seeds', () => {
    const config1 = generateBrickLayout(25, 1);
    const config2 = generateBrickLayout(25, 2);
    expect(config1).not.toEqual(config2);
  });
});
