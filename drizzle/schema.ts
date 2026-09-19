import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/** Core user table backing Manus OAuth. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Public music library metadata. Audio bytes remain in local/S3 storage, never in SQL. */
export const tracks = mysqlTable("tracks", {
  id: varchar("id", { length: 32 }).primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  artist: varchar("artist", { length: 160 }).notNull(),
  album: varchar("album", { length: 160 }),
  description: text("description"),
  duration: varchar("duration", { length: 12 }).notNull(),
  audio: text("audio").notNull(),
  coverUrl: text("coverUrl"),
  category: varchar("category", { length: 40 }).notNull(),
  language: varchar("language", { length: 40 }),
  releaseYear: int("releaseYear"),
  status: varchar("status", { length: 16 }).default("published").notNull(),
  playCount: int("playCount").default(0).notNull(),
  palette: varchar("palette", { length: 16 }).notNull(),
  note: varchar("note", { length: 160 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Track = typeof tracks.$inferSelect;
export type InsertTrack = typeof tracks.$inferInsert;

export const playlists = mysqlTable("playlists", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  description: text("description"),
  coverUrl: text("coverUrl"),
  status: varchar("status", { length: 16 }).default("published").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Playlist = typeof playlists.$inferSelect;
export type InsertPlaylist = typeof playlists.$inferInsert;

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 80 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

export const playlistTracks = mysqlTable("playlistTracks", {
  playlistId: int("playlistId").notNull(),
  trackId: varchar("trackId", { length: 32 }).notNull(),
});

export const adminAccounts = mysqlTable("adminAccounts", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  mustChangePassword: int("mustChangePassword").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const adminSessions = mysqlTable("adminSessions", {
  tokenHash: varchar("tokenHash", { length: 128 }).primaryKey(),
  adminId: int("adminId").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const siteSettings = mysqlTable("siteSettings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const mediaFiles = mysqlTable("mediaFiles", {
  id: varchar("id", { length: 32 }).primaryKey(),
  filename: varchar("filename", { length: 255 }).notNull(),
  storageKey: text("storageKey").notNull(),
  url: text("url").notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  sizeBytes: int("sizeBytes").notNull(),
  kind: varchar("kind", { length: 16 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Device-scoped state keeps the public player persistent without requiring sign-in. */
export const listenerPreferences = mysqlTable("listenerPreferences", {
  visitorKey: varchar("visitorKey", { length: 64 }).primaryKey(),
  currentTrackId: varchar("currentTrackId", { length: 32 }).notNull().default("01"),
  favoriteTrackIds: text("favoriteTrackIds").notNull(),
  volume: int("volume").notNull().default(72),
  muted: int("muted").notNull().default(0),
  repeatMode: varchar("repeatMode", { length: 8 }).notNull().default("off"),
  shuffleEnabled: int("shuffleEnabled").notNull().default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ListenerPreferences = typeof listenerPreferences.$inferSelect;
export type InsertListenerPreferences = typeof listenerPreferences.$inferInsert;
