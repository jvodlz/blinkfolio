import type { Env } from '../config/env.ts';
import type { Redis } from 'ioredis';
import type { Sql } from 'postgres';

declare module 'fastify' {
  interface FastifyInstance {
    config: Env;
    redis: Redis;
    db: Sql;
  }
}
