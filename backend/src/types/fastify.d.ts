import type { Env } from '../config/env.ts';
import type { Redis } from 'ioredis';

declare module 'fastify' {
  interface FastifyInstance {
    config: Env;
    redis: Redis;
  }
}
