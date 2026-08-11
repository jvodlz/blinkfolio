/**
 * Shared game constants
 *
 * Scene-specific constants remain on their respective classes.
 */

export const MOBILE_MAX_WIDTH = 480;

// --------
// GROUND
// --------

export const GROUND_HEIGHT = 40;
export const GROUND_OFFSET_FROM_BOTTOM = 20;

// ----------------
// PLAYER PHYSICS
// ----------------

export const PLAYER_SCALE = 2.5;
export const PLAYER_SPEED = 200;
export const PLAYER_JUMP_VELOCITY = -400;
export const PLAYER_BOUNDARY_RATIO = 0.33; // left/right visible boundary ratio

export const PLAYER_FRAME_WIDTH = 32;
export const PLAYER_FRAME_HEIGHT = 32;

export const PLAYER_BODY_WIDTH = 10;
export const PLAYER_BODY_HEIGHT = 15;
export const PLAYER_BODY_OFFSET_X = 11;
export const PLAYER_BODY_OFFSET_Y = 17;

// -----
// SIGN
// -----
export const SIGN_EDGE_SIZE = 18;

// -------
// FLOWER
// -------
export const FLOWER_KEYS = [
  'flower_1',
  'flower_2',
  'flower_3',
  'flower_4',
  'flower_5',
  'flower_6',
] as const;
export type FlowerKey = (typeof FLOWER_KEYS)[number];

export const FLOWER_ABOVE_BRICK_OFFSET = 2;
