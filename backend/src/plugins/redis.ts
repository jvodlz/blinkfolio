import fp from 'fastify-plugin';
import { Redis } from 'ioredis';
import type { FastifyInstance } from 'fastify';

async function redisPlugin(app: FastifyInstance): Promise<void> {
  const client = new Redis(app.config.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  await client.connect();

  const pong = await client.ping();
  if (pong !== 'PONG') {
    throw new Error('Redis health check failed on startup');
  }

  app.log.info('Redis connected and healthy');

  app.decorate('redis', client);

  app.addHook('onClose', async () => {
    await client.quit();
  });
}

export default fp(redisPlugin, {
  name: 'redis',
  dependencies: ['config'],
});
