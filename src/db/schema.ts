import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  decimal,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "host", "guest", "viewer"]);
export const ratingType = pgEnum("rating_type", ["song", "album_manual", "album_auto"]);

/**
 * Profile table mirrored 1:1 with Supabase auth.users.
 * `id` should equal `auth.uid()` — sync via trigger or app code on sign-up.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  avatarUrl: text("avatar_url"),
  role: userRole("role").notNull().default("viewer"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
});

export const artists = pgTable("artists", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  bio: text("bio"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const albums = pgTable("albums", {
  id: uuid("id").primaryKey().defaultRandom(),
  artistId: uuid("artist_id")
    .notNull()
    .references(() => artists.id, { onDelete: "restrict" }),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  releaseYear: smallint("release_year").notNull(),
  coverUrl: text("cover_url"),
  genres: text("genres").array().notNull().default(sql`'{}'::text[]`),
  label: varchar("label", { length: 150 }),
  totalDurationSeconds: integer("total_duration_seconds"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  streamEpisodeUrl: text("stream_episode_url"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  /** Aggregated by trigger from ratings (rating_type='song'). */
  avgRating: decimal("avg_rating", { precision: 3, scale: 1 }),
  ratingCount: integer("rating_count").notNull().default(0),
});

export const songs = pgTable(
  "songs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    albumId: uuid("album_id")
      .notNull()
      .references(() => albums.id, { onDelete: "cascade" }),
    trackNumber: smallint("track_number").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    durationSeconds: integer("duration_seconds"),
    featuredArtists: text("featured_artists").array().notNull().default(sql`'{}'::text[]`),
    isHighlight: boolean("is_highlight").notNull().default(false),
    avgRating: decimal("avg_rating", { precision: 3, scale: 1 }),
    ratingCount: integer("rating_count").notNull().default(0),
  },
  (t) => [uniqueIndex("songs_album_track_unique").on(t.albumId, t.trackNumber)],
);

/**
 * A rating is either for a song (song_id NOT NULL) or an album (album_id NOT NULL).
 * `score` must be in [1.0, 10.0] in steps of 0.5 — enforced at DB level.
 */
export const ratings = pgTable(
  "ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    songId: uuid("song_id").references(() => songs.id, { onDelete: "cascade" }),
    albumId: uuid("album_id").references(() => albums.id, { onDelete: "cascade" }),
    score: decimal("score", { precision: 3, scale: 1 }).notNull(),
    ratingType: ratingType("rating_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("ratings_score_range", sql`${t.score} >= 1 AND ${t.score} <= 10`),
    check("ratings_score_half_step", sql`(${t.score} * 2) = FLOOR(${t.score} * 2)`),
    check(
      "ratings_target_present",
      sql`(${t.songId} IS NOT NULL) OR (${t.albumId} IS NOT NULL)`,
    ),
    uniqueIndex("ratings_user_song_unique")
      .on(t.userId, t.songId)
      .where(sql`${t.songId} IS NOT NULL`),
    uniqueIndex("ratings_user_album_type_unique")
      .on(t.userId, t.albumId, t.ratingType)
      .where(sql`${t.albumId} IS NOT NULL`),
  ],
);

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  songId: uuid("song_id").references(() => songs.id, { onDelete: "cascade" }),
  albumId: uuid("album_id").references(() => albums.id, { onDelete: "cascade" }),
  parentCommentId: uuid("parent_comment_id"),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const liveSessions = pgTable("live_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  currentAlbumId: uuid("current_album_id").references(() => albums.id, {
    onDelete: "set null",
  }),
  hostUserId: uuid("host_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Artist = typeof artists.$inferSelect;
export type Album = typeof albums.$inferSelect;
export type Song = typeof songs.$inferSelect;
export type Rating = typeof ratings.$inferSelect;
export type Comment = typeof comments.$inferSelect;
