import type { FastifyInstance } from 'fastify';
import * as z from 'zod';
import { brickIdSchema } from '../schemas/cooldown.ts';

const COOLDOWN_TTL_SECONDS = 30;

const paramsSchema = z.object({
  brickId: brickIdSchema,
});

type Params = z.infer<typeof paramsSchema>;

async function cooldownRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: Params }>('/cooldown/:brickId', async (request, reply) => {
    const result = paramsSchema.safeParse(request.params);
    if (!result.success) {
      return reply.status(400).send({ error: 'Bad request' });
    }

    const { brickId } = result.data;
    const value = await app.redis.get(`cooldown:${brickId}`);

    return reply.send({ brickId, cooling: value !== null });
  });

  app.post<{ Params: Params }>('/cooldown/:brickId', async (request, reply) => {
    const result = paramsSchema.safeParse(request.params);
    if (!result.success) {
      return reply.status(400).send({ error: 'Bad request' });
    }

    const { brickId } = result.data;
    await app.redis.set(`cooldown:${brickId}`, '1', 'EX', COOLDOWN_TTL_SECONDS);

    return reply.send({ brickId, cooling: true });
  });
}

export { cooldownRoutes };
