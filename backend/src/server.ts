import Fastify from 'fastify';
import type { FastifyError } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { validateEnv } from './config/env.ts';

const env = validateEnv();

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
    bodyLimit: 10 * 1024,
  });

  // -- Security middleware
  await app.register(helmet);

  await app.register(cors, {
    origin: env.ALLOWED_ORIGINS,
  });

  await app.register(rateLimit, {
    global: true,
    max: 60,
    timeWindow: '1 minute',
  });

  // -- Global error handler
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    app.log.error(error);
    const statusCode = error.statusCode ?? 500;
    const message =
      statusCode === 429 ? error.message : 'Internal server error';
    reply.status(statusCode).send({ error: message });
  });

  // -- Routes
  app.get('/health', async (_request, _reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return app;
}

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.fatal(err);
    process.exit(1);
  }
}

start();
