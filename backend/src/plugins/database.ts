import fp from 'fastify-plugin';
import postgres from 'postgres';
import type { FastifyInstance } from 'fastify';

async function databasePlugin(app: FastifyInstance): Promise<void> {
  const sql = postgres(app.config.DATABASE_URL, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: (notice) => {
      app.log.warn({ notice }, 'PostgreSQL notice');
    },
  });

  try {
    await sql`SELECT 1`;
    app.log.info('Database connected and healthy');
  } catch (err) {
    app.log.fatal({ err }, 'Database health check failed on startup');
    throw err;
  }

  app.decorate('db', sql);

  app.addHook('onClose', async () => {
    await sql.end();
  });
}

export default fp(databasePlugin, {
  name: 'database',
  dependencies: ['config'],
});
