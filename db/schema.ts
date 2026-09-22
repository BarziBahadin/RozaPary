import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
export const events = sqliteTable('events', {
  slug: text('slug').primaryKey(),
  data: text('data').notNull(),
  createdAt: text('created_at').notNull(),
});
export const responses = sqliteTable(
  'responses',
  {
    id: text('id').primaryKey(),
    eventSlug: text('event_slug')
      .notNull()
      .references(() => events.slug),
    guestToken: text('guest_token').notNull(),
    name: text('name').notNull(),
    attendance: text('attendance').notNull(),
    plusOnes: integer('plus_ones').notNull().default(0),
    dietary: text('dietary').notNull().default(''),
    message: text('message').notNull().default(''),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_responses_event').on(table.eventSlug),
    uniqueIndex('idx_responses_guest').on(table.eventSlug, table.guestToken),
  ],
);
export const opens = sqliteTable(
  'opens',
  {
    eventSlug: text('event_slug')
      .notNull()
      .references(() => events.slug),
    guestToken: text('guest_token').notNull(),
    openedAt: text('opened_at').notNull(),
  },
  (table) => [primaryKey({ columns: [table.eventSlug, table.guestToken] })],
);
export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(),
  hits: integer('hits').notNull(),
  expiresAt: integer('expires_at').notNull(),
});
