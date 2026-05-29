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
  app.get('/health', async (_request, _reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
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
    await app.listen({ port: app.config.PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.fatal(err);
    process.exit(1);
  }
}

start();
