import type { FastifyInstance } from 'fastify';
import * as z from 'zod';
import { eventTypeSchema } from '../schemas/events.ts';

const paramsSchema = z.object({
  eventType: eventTypeSchema,
});

type Params = z.infer<typeof paramsSchema>;

type GameEventRow = {
  event_type: string;
  count: string;
};

async function eventsRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: Params }>('/events/:eventType', async (request, reply) => {
    const result = paramsSchema.safeParse(request.params);

    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid event type' });
    }

    const { eventType } = result.data;

    const rows = await app.db<GameEventRow[]>`
        INSERT INTO game_events (event_type, count, updated_at)
        VALUES (${eventType}, 1, now())
        ON CONFLICT (event_type)
        DO UPDATE SET
            count = game_events.count + 1,
            updated_at = now()
        RETURNING event_type, count
    `;

    const row = rows[0];

    return reply.send({
      event_type: row.event_type,
      count: Number(row.count),
    });
  });
}

export { eventsRoutes };
