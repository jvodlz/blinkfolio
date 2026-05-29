import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import type { Sql } from 'postgres';
import { eventsRoutes } from './events.ts';

function buildTestApp(): FastifyInstance {
  const app = Fastify({ logger: false });

  const mockDb = vi.fn() as unknown as Sql;

  app.decorate('db', mockDb);

  return app;
}

describe('POST /events/:eventType', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = buildTestApp();
    await app.register(eventsRoutes);
    await app.ready();
  });

  it('returns 200 and increments a valid event type', async () => {
    const mockFn = app.db as unknown as ReturnType<typeof vi.fn>;
    vi.mocked(mockFn).mockResolvedValueOnce([
      { event_type: 'brick_hit', count: '1' },
    ] as never);

    const response = await app.inject({
      method: 'POST',
      url: '/events/brick_hit',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ event_type: string; count: number }>();
    expect(body.event_type).toBe('brick_hit');
    expect(body.count).toBe(1);
  });

  it('returns 200 for each valid event type', async () => {
    const validTypes = [
      'enemy_created',
      'flower_created',
      'enemy_squashed',
      'player_fainted',
      'brick_hit',
    ];

    for (const eventType of validTypes) {
      const mockFn = app.db as unknown as ReturnType<typeof vi.fn>;
      vi.mocked(mockFn).mockResolvedValueOnce([
        { event_type: eventType, count: '1' },
      ] as never);

      const response = await app.inject({
        method: 'POST',
        url: `/events/${eventType}`,
      });

      expect(response.statusCode).toBe(200);
    }
  });

  it('returns 400 for an invalid event type', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/events/invalid_event',
    });

    expect(response.statusCode).toBe(400);
  });

  it('return 500 when the database query fails', async () => {
    const mockFn = app.db as unknown as ReturnType<typeof vi.fn>;
    vi.mocked(mockFn).mockRejectedValueOnce(new Error('db error') as never);

    const response = await app.inject({
      method: 'POST',
      url: '/events/brick_hit',
    });

    expect(response.statusCode).toBe(500);
  });
});
