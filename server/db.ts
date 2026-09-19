import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  adminAccounts,
  adminSessions,
  categories,
  InsertCategory,
  InsertListenerPreferences,
  InsertPlaylist,
  InsertTrack,
  listenerPreferences,
  mediaFiles,
  playlists,
  playlistTracks,
  siteSettings,
  tracks,
  InsertUser,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] === undefined) continue;
    const normalized = user[field] ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listTracks(options: { publishedOnly?: boolean; search?: string; status?: string; category?: string } = {}) {
  const db = await getDb();
  if (!db) return [];
  const filters = [];
  if (options.publishedOnly) filters.push(eq(tracks.status, "published"));
  if (options.status && options.status !== "all") filters.push(eq(tracks.status, options.status));
  if (options.category && options.category !== "all") filters.push(eq(tracks.category, options.category));
  if (options.search) {
    const query = `%${options.search}%`;
    filters.push(or(like(tracks.title, query), like(tracks.artist, query), like(tracks.album, query)));
  }
  return db.select().from(tracks).where(filters.length ? and(...filters) : undefined).orderBy(asc(tracks.sortOrder), desc(tracks.createdAt));
}

export async function getTrack(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(tracks).where(eq(tracks.id, id)).limit(1);
  return rows[0];
}

export async function createTrack(values: InsertTrack) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(tracks).values(values);
  return getTrack(values.id);
}

export async function updateTrack(id: string, values: Partial<InsertTrack>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(tracks).set(values).where(eq(tracks.id, id));
  return getTrack(id);
}

export async function deleteTrack(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(playlistTracks).where(eq(playlistTracks.trackId, id));
  await db.delete(tracks).where(eq(tracks.id, id));
}

export async function incrementPlayCount(id: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(tracks).set({ playCount: sql`${tracks.playCount} + 1` }).where(eq(tracks.id, id));
}

export async function listPlaylists() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(playlists).orderBy(asc(playlists.name));
}

export async function getPlaylist(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(playlists).where(eq(playlists.id, id)).limit(1);
  return rows[0];
}

export async function createPlaylist(values: InsertPlaylist) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(playlists).values(values);
  return getPlaylist(Number(result[0].insertId));
}

export async function updatePlaylist(id: number, values: Partial<InsertPlaylist>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(playlists).set(values).where(eq(playlists.id, id));
  return getPlaylist(id);
}

export async function deletePlaylist(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(playlistTracks).where(eq(playlistTracks.playlistId, id));
  await db.delete(playlists).where(eq(playlists.id, id));
}

export async function listPlaylistLinks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(playlistTracks);
}

export async function replaceTrackPlaylists(trackId: string, playlistIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(playlistTracks).where(eq(playlistTracks.trackId, trackId));
  if (playlistIds.length) await db.insert(playlistTracks).values(playlistIds.map((playlistId) => ({ playlistId, trackId })));
}

export async function listCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).orderBy(asc(categories.name));
}

export async function createCategory(values: InsertCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(categories).values(values);
  const rows = await db.select().from(categories).where(eq(categories.id, Number(result[0].insertId))).limit(1);
  return rows[0];
}

export async function updateCategory(id: number, values: Partial<InsertCategory>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(categories).set(values).where(eq(categories.id, id));
  const rows = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return rows[0];
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(categories).where(eq(categories.id, id));
}

export async function getSiteSettings() {
  const db = await getDb();
  if (!db) return {};
  const rows = await db.select().from(siteSettings);
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export async function upsertSiteSettings(values: Record<string, string>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  for (const [key, value] of Object.entries(values)) {
    await db.insert(siteSettings).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
  }
  return getSiteSettings();
}

export async function listMediaFiles() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(mediaFiles).orderBy(desc(mediaFiles.createdAt));
}

export async function insertMediaFile(values: typeof mediaFiles.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(mediaFiles).values(values);
  return values;
}

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { totalSongs: 0, publishedSongs: 0, draftSongs: 0, totalPlaylists: 0, totalCategories: 0 };
  const [songCount, publishedCount, draftCount, playlistCount, categoryCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(tracks),
    db.select({ count: sql<number>`count(*)` }).from(tracks).where(eq(tracks.status, "published")),
    db.select({ count: sql<number>`count(*)` }).from(tracks).where(eq(tracks.status, "draft")),
    db.select({ count: sql<number>`count(*)` }).from(playlists),
    db.select({ count: sql<number>`count(*)` }).from(categories),
  ]);
  return {
    totalSongs: Number(songCount[0]?.count ?? 0),
    publishedSongs: Number(publishedCount[0]?.count ?? 0),
    draftSongs: Number(draftCount[0]?.count ?? 0),
    totalPlaylists: Number(playlistCount[0]?.count ?? 0),
    totalCategories: Number(categoryCount[0]?.count ?? 0),
  };
}

export async function getAdminByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(adminAccounts).where(eq(adminAccounts.email, email.toLowerCase())).limit(1);
  return rows[0];
}

export async function createAdminAccount(values: typeof adminAccounts.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(adminAccounts).values(values).onDuplicateKeyUpdate({ set: { passwordHash: values.passwordHash, mustChangePassword: values.mustChangePassword } });
  return getAdminByEmail(values.email);
}

export async function updateAdminPassword(id: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(adminAccounts).set({ passwordHash, mustChangePassword: 0 }).where(eq(adminAccounts.id, id));
}

export async function createAdminSession(values: typeof adminSessions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(adminSessions).values(values);
}

export async function getAdminBySession(tokenHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select({ admin: adminAccounts, session: adminSessions }).from(adminSessions).innerJoin(adminAccounts, eq(adminSessions.adminId, adminAccounts.id)).where(eq(adminSessions.tokenHash, tokenHash)).limit(1);
  const row = rows[0];
  if (!row || row.session.expiresAt.getTime() <= Date.now()) return undefined;
  return row.admin;
}

export async function deleteAdminSession(tokenHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(adminSessions).where(eq(adminSessions.tokenHash, tokenHash));
}

export async function getListenerPreferences(visitorKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(listenerPreferences).where(eq(listenerPreferences.visitorKey, visitorKey)).limit(1);
  return result[0];
}

export async function upsertListenerPreferences(values: InsertListenerPreferences) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(listenerPreferences).values(values).onDuplicateKeyUpdate({
    set: {
      currentTrackId: values.currentTrackId,
      favoriteTrackIds: values.favoriteTrackIds,
      volume: values.volume,
      muted: values.muted,
      repeatMode: values.repeatMode,
      shuffleEnabled: values.shuffleEnabled,
    },
  });
  return getListenerPreferences(values.visitorKey);
}
