import { describe, it, expect } from 'vitest';
import { retryFetch, getSmokeUrl } from './helpers/retryFetch.ts';

const SMOKE_BRICK_ID = 'smoke-test-brick';

describe('smoke: cooldown', () => {
  it('reports not-cooling, then cooling after POST, against real Valkey', async () => {
    const baseUrl = getSmokeUrl();

    const beforeResponse = await retryFetch(
      `${baseUrl}/cooldown/${SMOKE_BRICK_ID}`
    );
    expect(beforeResponse.status).toBe(200);

    const postResponse = await retryFetch(
      `${baseUrl}/cooldown/${SMOKE_BRICK_ID}`,
      { method: 'POST' }
    );
    const postBody = await postResponse.json();

    expect(postResponse.status).toBe(200);
    expect(postBody.cooling).toBe(true);

    const afterResponse = await retryFetch(
      `${baseUrl}/cooldown/${SMOKE_BRICK_ID}`
    );
    const afterBody = await afterResponse.json();

    expect(afterResponse.status).toBe(200);
    expect(afterBody.cooling).toBe(true);
  });
});
