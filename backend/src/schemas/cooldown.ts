import * as z from 'zod';

export const brickIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid brickId');
