import * as z from 'zod';

export const EVENT_TYPES = [
  'enemy_created',
  'flower_created',
  'enemy_squashed',
  'player_fainted',
  'brick_hit',
] as const;

export const eventTypeSchema = z.enum(EVENT_TYPES);

export type EventType = z.infer<typeof eventTypeSchema>;
