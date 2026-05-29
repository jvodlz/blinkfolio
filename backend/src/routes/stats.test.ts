import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import type { Sql } from 'postgres';
import { statsRoutes } from './stats.ts';

function buildTestApp(): FastifyInstance {
  const app = Fastify({ logger: false });

  const mockDb = vi.fn() as unknown as Sql;

  app.decorate('db', mockDb);

  return app;
}

describe('GET /stats', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = buildTestApp();
    await app.register(statsRoutes);
    await app.ready();
  });

  it('returns all event counters as an object', async () => {
    const mockRows = [
      {
        event_type: 'brick_hit',
        count: '42',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      {
        event_type: 'enemy_squashed',
        count: '7',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ];

    const mockFn = app.db as unknown as ReturnType<typeof vi.fn>;
    vi.mocked(mockFn).mockResolvedValueOnce(mockRows as never);

    const response = await app.inject({
      method: 'GET',
      url: '/stats',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ stats: Record<string, number> }>();
    expect(body.stats).toEqual({
      brick_hit: 42,
      enemy_squashed: 7,
    });
  });

  it('returns an empty object when no events have been recorded', async () => {
    const mockFn = app.db as unknown as ReturnType<typeof vi.fn>;
    vi.mocked(mockFn).mockResolvedValueOnce([] as never);

    const response = await app.inject({
      method: 'GET',
      url: '/stats',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{ stats: Record<string, number> }>();
    expect(body.stats).toEqual({});
  });

  it('returns 500 when the database query fails', async () => {
    const mockFn = app.db as unknown as ReturnType<typeof vi.fn>;
    vi.mocked(mockFn).mockRejectedValueOnce(new Error('db error') as never);

    const response = await app.inject({
      method: 'GET',
      url: '/stats',
    });

    expect(response.statusCode).toBe(500);
  });
});
