import { describe, it, expect } from 'vitest';
import { getPlatformRectsFromElements } from './platformSync.ts';

// Simulate getBoundingClientRect
function makeMockElement(rect: {
  left: number;
  top: number;
  width: number;
  height: number;
}): Element {
  const el = document.createElement('div');
  el.getBoundingClientRect = () => ({
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    x: rect.left,
    y: rect.top,
    toJSON: () => {},
  });
  return el;
}

describe('getPlatformRectsFromElements', () => {
  it('returns empty array when given no elements', () => {
    const result = getPlatformRectsFromElements([]);
    expect(result).toEqual([]);
  });

  it('converts a single element rect to a platform rect', () => {
    const el = makeMockElement({
      left: 100,
      top: 200,
      width: 300,
      height: 150,
    });
    const result = getPlatformRectsFromElements([el]);

    expect(result).toHaveLength(1);
    expect(result[0].x).toBe(250); // centerX = left + width/2
    expect(result[0].y).toBe(200); // top of element (surface player lands on)
    expect(result[0].width).toBe(300);
    expect(result[0].height).toBe(150);
  });

  it('converts multiple elements correctly', () => {
    const els = [
      makeMockElement({ left: 0, top: 300, width: 200, height: 100 }),
      makeMockElement({ left: 250, top: 350, width: 200, height: 100 }),
      makeMockElement({ left: 500, top: 400, width: 200, height: 100 }),
    ];
    const result = getPlatformRectsFromElements(els);

    expect(result).toHaveLength(3);
    expect(result[0].x).toBe(100);
    expect(result[1].x).toBe(350);
    expect(result[2].x).toBe(600);
  });

  it('returns top of element as y (not centre)', () => {
    const el = makeMockElement({ left: 0, top: 500, width: 400, height: 200 });
    const result = getPlatformRectsFromElements([el]);

    // y should be the TOP of the element (where the player's feet land)
    expect(result[0].y).toBe(500);
    expect(result[0].y).not.toBe(600); // NOT the centre
  });

  it('filters out elements with zero dimensions', () => {
    const validEl = makeMockElement({
      left: 100,
      top: 200,
      width: 300,
      height: 150,
    });
    const zeroWidthEl = makeMockElement({
      left: 0,
      top: 0,
      width: 0,
      height: 100,
    });
    const zeroHeightEl = makeMockElement({
      left: 0,
      top: 0,
      width: 100,
      height: 0,
    });

    const result = getPlatformRectsFromElements([
      validEl,
      zeroWidthEl,
      zeroHeightEl,
    ]);
    expect(result).toHaveLength(1);
  });
});
