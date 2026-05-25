import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { validateEnv } from '../config/env.ts';

async function configPlugin(app: FastifyInstance): Promise<void> {
  const env = validateEnv();
  app.decorate('config', env);
}

export default fp(configPlugin, {
  name: 'config',
});
