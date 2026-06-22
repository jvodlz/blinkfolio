import { describe, it, expect } from 'vitest';
import { retryFetch, getSmokeUrl } from './helpers/retryFetch.ts';

const SMOKE_EVENT_TYPE = 'brick_hit';

describe('smoke: POST /events/:eventType', () => {
  it('increments the real game_events counter via Postgres', async () => {
    const baseUrl = getSmokeUrl();

    const statsBefore = await retryFetch(`${baseUrl}/stats`);
    const statsBeforeBody = await statsBefore.json();
    const countBefore = statsBeforeBody.stats[SMOKE_EVENT_TYPE] ?? 0;

    const postResponse = await retryFetch(
      `${baseUrl}/events/${SMOKE_EVENT_TYPE}`,
      { method: 'POST' }
    );
    const postBody = await postResponse.json();

    expect(postResponse.status).toBe(200);
    expect(postBody.event_type).toBe(SMOKE_EVENT_TYPE);
    expect(postBody.count).toBe(countBefore + 1);
  });
});
