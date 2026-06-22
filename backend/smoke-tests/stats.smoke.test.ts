import { describe, it, expect } from 'vitest';
import { retryFetch, getSmokeUrl } from './helpers/retryFetch.ts';

describe('smoke: GET /stats', () => {
  it('returns a stats object from the real database', async () => {
    const baseUrl = getSmokeUrl();

    const response = await retryFetch(`${baseUrl}/stats`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.stats).toBeTypeOf('object');
  });
});
