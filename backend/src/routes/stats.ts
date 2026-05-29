import type { FastifyInstance } from 'fastify';

type GameEventRow = {
  event_type: string;
  count: string;
  updated_at: string;
};

async function statsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/stats', async (_request, reply) => {
    const rows = await app.db<GameEventRow[]>`
      SELECT event_type, count, updated_at
      FROM game_events
      ORDER BY event_type ASC
    `;

    const stats = Object.fromEntries(
      rows.map((row) => [row.event_type, Number(row.count)])
    );

    return reply.send({ stats });
  });
}

export { statsRoutes };
