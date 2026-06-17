// CI path-filter test: backend-only change, no behavioural effect
import Fastify from 'fastify';
import type { FastifyError } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';

import configPlugin from './plugins/config.ts';
import redisPlugin from './plugins/redis.ts';
import databasePlugin from './plugins/database.ts';

import { cooldownRoutes } from './routes/cooldown.ts';
import { statsRoutes } from './routes/stats.ts';
import { eventsRoutes } from './routes/events.ts';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
    },
    bodyLimit: 10 * 1024,
  });

  // -- Config
  await app.register(configPlugin);

  // -- Security middleware
  await app.register(helmet);

  await app.register(cors, {
    origin: app.config.ALLOWED_ORIGINS,
  });

  await app.register(rateLimit, {
    global: true,
    max: 60,
    timeWindow: '1 minute',
  });

  // -- Redis
  await app.register(redisPlugin);

  // -- Database
  await app.register(databasePlugin);

  // -- Routes
  await app.register(cooldownRoutes);
  await app.register(statsRoutes);
  await app.register(eventsRoutes);
  app.get('/health', async (_request, reply) => {
    const timestamp = new Date().toISOString();
    const services: Record<string, 'ok' | 'degraded'> = {};

    try {
      await app.db`SELECT 1`;
      services['database'] = 'ok';
    } catch {
      services['database'] = 'degraded';
    }

    try {
      const pong = await app.redis.ping();
      services['redis'] = pong === 'PONG' ? 'ok' : 'degraded';
    } catch {
      services['redis'] = 'degraded';
    }

    const allHealthy = Object.values(services).every((s) => s === 'ok');

    if (!allHealthy) {
      return reply.status(503).send({
        status: 'degraded',
        timestamp,
        services,
      });
    }

    return reply.status(200).send({
      status: 'ok',
      timestamp,
      services,
    });
  });

  // -- Not found handler
  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({ error: 'Not found' });
  });

  // -- Global error handler
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    app.log.error(error);
    const statusCode = error.statusCode ?? 500;
    const message =
      statusCode === 429 ? error.message : 'Internal server error';
    reply.status(statusCode).send({ error: message });
  });

  return app;
}

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: app.config.PORT, host: app.config.HOST });
  } catch (err) {
    app.log.fatal(err);
    process.exit(1);
  }
}

start();
