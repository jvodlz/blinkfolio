/**
 * Platform Sync Utility
 *
 * Bridges the gap between DOM element positions and Phaser physics coordinates.
 * Uses getBoundingClientRect() to read real pixel positions from the browser layout,
 * then, converts them into a format Phaser can use to create collision platforms.
 */

export interface PlatformRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const CARD_STACK_BELOW_WIDTH = 768;

/**
 * Reads screen positions of DOM elements and converst them to Phaser-compatible platform descriptors.
 *
 * @param elements - Array of DOM elements (e.g. context section divs)
 * @returns Array of PlatformRect objects ready to use in Phaser
 */
export function getPlatformRectsFromElements(
  elements: Element[]
): PlatformRect[] {
  return elements
    .map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2, // Phaser positions by CenterX
        y: rect.top, // TOP surface
        width: rect.width,
        height: rect.height,
      };
    })
    .filter((rect) => rect.width > 0 && rect.height > 0); // Ignore hidden/unmounted elements
}
