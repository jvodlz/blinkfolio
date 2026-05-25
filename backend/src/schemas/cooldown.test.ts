import { describe, it, expect } from 'vitest';
import { brickIdSchema } from './cooldown.ts';

describe('brickIdSchema', () => {
  it('accepts a valid brick ID', () => {
    const result = brickIdSchema.safeParse('brick-1');
    expect(result.success).toBe(true);
  });

  it('rejects an empty string', () => {
    const result = brickIdSchema.safeParse('');
    expect(result.success).toBe(false);
  });

  it('rejects a string exceeding 64 characters', () => {
    const result = brickIdSchema.safeParse('a'.repeat(65));
    expect(result.success).toBe(false);
  });

  it('rejects a string with invalid characters', () => {
    const result = brickIdSchema.safeParse('brick 1!');
    expect(result.success).toBe(false);
  });
});
