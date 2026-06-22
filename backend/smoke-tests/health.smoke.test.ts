import { describe, it, expect } from 'vitest';
import { retryFetch, getSmokeUrl } from './helpers/retryFetch.ts';

describe('smoke: GET /health', () => {
  it('reports a healthy status with database and redis connected', async () => {
    const baseUrl = getSmokeUrl();

    const response = await retryFetch(`${baseUrl}/health`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.services.database).toBe('ok');
    expect(body.services.redis).toBe('ok');
  });
});
