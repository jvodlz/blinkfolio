import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';
import { cooldownRoutes } from './cooldown.ts';

function buildTestApp(redisMock: Partial<Redis>): FastifyInstance {
  const app = Fastify({ logger: false });
  app.decorate('redis', redisMock as Redis);
  app.register(cooldownRoutes);
  return app;
}

describe('GET /cooldown/:brickId', () => {
  let redisMock: Partial<Redis>;

  beforeEach(() => {
    redisMock = {
      get: vi.fn(),
    };
  });

  it('returns cooling: false when no cooldown exists', async () => {
    (redisMock.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const app = buildTestApp(redisMock);
    const response = await app.inject({
      method: 'GET',
      url: '/cooldown/brick-1',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ brickId: 'brick-1', cooling: false });
  });

  it('returns cooling: true when cooldown exists', async () => {
    (redisMock.get as ReturnType<typeof vi.fn>).mockResolvedValue('1');
    const app = buildTestApp(redisMock);
    const response = await app.inject({
      method: 'GET',
      url: '/cooldown/brick-1',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ brickId: 'brick-1', cooling: true });
  });

  it('returns 400 for an invalid brickId', async () => {
    const app = buildTestApp(redisMock);
    const response = await app.inject({
      method: 'GET',
      url: '/cooldown/brick 1!',
    });
    expect(response.statusCode).toBe(400);
  });
});

describe('POST /cooldown/:brickId', () => {
  let redisMock: Partial<Redis>;

  beforeEach(() => {
    redisMock = {
      set: vi.fn(),
    };
  });

  it('sets a cooldown and returns cooling: true', async () => {
    (redisMock.set as ReturnType<typeof vi.fn>).mockResolvedValue('OK');
    const app = buildTestApp(redisMock);
    const response = await app.inject({
      method: 'POST',
      url: '/cooldown/brick-1',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ brickId: 'brick-1', cooling: true });
  });

  it('returns 400 for an invalid brickId', async () => {
    const app = buildTestApp(redisMock);
    const response = await app.inject({
      method: 'POST',
      url: '/cooldown/brick 1!',
    });
    expect(response.statusCode).toBe(400);
  });
});
