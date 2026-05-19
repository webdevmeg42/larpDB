import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import type { SchemaField, GameCodex } from '@larpdb/shared'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  role: text('role', { enum: ['owner', 'gm', 'player'] }).notNull().default('player'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const game = pgTable('game', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const siteConfig = pgTable('site_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameId: uuid('game_id').notNull().references(() => game.id),
  siteTitle: text('site_title').notNull().default('My LARP'),
  tagline: text('tagline'),
  logoUrl: text('logo_url'),
  faviconUrl: text('favicon_url'),
  bannerUrl: text('banner_url'),
  colorPrimary: text('color_primary').notNull().default('#6366f1'),
  colorSecondary: text('color_secondary').notNull().default('#a78bfa'),
  colorBackground: text('color_background').notNull().default('#0f0f1a'),
  colorText: text('color_text').notNull().default('#ffffff'),
  colorAccent: text('color_accent').notNull().default('#f59e0b'),
  fontHeading: text('font_heading').notNull().default('Inter'),
  fontBody: text('font_body').notNull().default('Inter'),
  welcomeMessage: text('welcome_message'),
  footerText: text('footer_text'),
  customCss: text('custom_css'),
  codex: jsonb('codex').$type<GameCodex>(),
  currencyName: text('currency_name').notNull().default('monies'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const schemaTemplates = pgTable('schema_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  genre: text('genre').notNull(),
  description: text('description'),
  fields: jsonb('fields').notNull().$type<SchemaField[]>(),
  isBuiltin: boolean('is_builtin').notNull().default(false),
})

export const characterSchemas = pgTable('character_schemas', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  version: integer('version').notNull().default(1),
  fields: jsonb('fields').notNull().$type<SchemaField[]>(),
  templateSource: uuid('template_source').references(() => schemaTemplates.id),
  isActive: boolean('is_active').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const characters = pgTable('characters', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  schemaId: uuid('schema_id').notNull().references(() => characterSchemas.id),
  name: text('name').notNull(),
  portraitUrl: text('portrait_url'),
  data: jsonb('data').notNull().default({}),
  totalXp: integer('total_xp').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const xpTransactions = pgTable('xp_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  characterId: uuid('character_id').notNull().references(() => characters.id),
  awardedBy: uuid('awarded_by').references(() => users.id),
  amount: integer('amount').notNull(),
  reason: text('reason').notNull(),
  type: text('type', { enum: ['award', 'spend'] }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  location: text('location'),
  startAt: timestamp('start_at').notNull(),
  endAt: timestamp('end_at'),
  maxPlayers: integer('max_players'),
  status: text('status', { enum: ['draft', 'published', 'archived'] }).notNull().default('draft'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const eventRegistrations = pgTable('event_registrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => events.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  characterId: uuid('character_id').references(() => characters.id),
  status: text('status', { enum: ['pending', 'confirmed', 'waitlist', 'cancelled'] }).notNull().default('pending'),
  registeredAt: timestamp('registered_at').notNull().defaultNow(),
})

export const npcs = pgTable('npcs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  portraitUrl: text('portrait_url'),
  notes: text('notes'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const plots = pgTable('plots', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['active', 'resolved'] }).notNull().default('active'),
  linkedEventIds: uuid('linked_event_ids').array().notNull().default(sql`'{}'`),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const storeItems = pgTable('store_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => events.id),
  name: text('name').notNull(),
  description: text('description'),
  price: integer('price').notNull().default(0),
  quantityAvailable: integer('quantity_available'),
  isAvailable: boolean('is_available').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const purchases = pgTable('purchases', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeItemId: uuid('store_item_id').notNull().references(() => storeItems.id),
  eventId: uuid('event_id').notNull().references(() => events.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  characterId: uuid('character_id').notNull().references(() => characters.id),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: integer('unit_price').notNull(),
  currencyName: text('currency_name').notNull(),
  purchasedAt: timestamp('purchased_at').notNull().defaultNow(),
})
