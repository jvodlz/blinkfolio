import type { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.createTable('game_events', {
    event_type: {
      type: 'text',
      primaryKey: true,
    },
    count: {
      type: 'bigint',
      notNull: true,
      default: 0,
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.dropTable('game_events');
};
