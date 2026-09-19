import { randomUUID } from "node:crypto";
import express, { NextFunction, Request, Response } from "express";
import multer from "multer";
import {
  createCategory,
  createPlaylist,
  createTrack,
  deleteCategory,
  deletePlaylist,
  deleteTrack,
  getDashboardStats,
  getPlaylist,
  getSiteSettings,
  getTrack,
  incrementPlayCount,
  insertMediaFile,
  listCategories,
  listMediaFiles,
  listPlaylistLinks,
  listPlaylists,
  listTracks,
  replaceTrackPlaylists,
  updateCategory,
  updatePlaylist,
  updateTrack,
  upsertSiteSettings,
} from "./db";
import { getAdminFromRequest, hashPassword, loginAdmin, logoutAdmin, requireAdmin, verifyPassword } from "./adminAuth";
import { updateAdminPassword } from "./db";
import { storagePut } from "./storage";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024, files: 2 },
});
const asyncHandler = (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => {
  handler(req, res, next).catch(next);
};

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected server error";
  if (message.includes("Duplicate")) return "A record with that name already exists.";
  return message;
}

function bodyString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function parsePlaylistIds(value: unknown) {
  if (Array.isArray(value)) return value.map(Number).filter(Number.isFinite);
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(Number).filter(Number.isFinite);
  } catch {
    return value.split(",").map(Number).filter(Number.isFinite);
  }
  return [];
}

function getUploadedFile(req: Request, field: string) {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  return files?.[field]?.[0];
}

function validateFile(file: Express.Multer.File | undefined, kind: "audio" | "cover") {
  if (!file) return;
  const extension = file.originalname.toLowerCase().split(".").pop() || "";
  const audioExtensions = ["mp3", "wav", "m4a", "aac", "ogg"];
  const coverExtensions = ["jpg", "jpeg", "png", "webp"];
  const allowed = kind === "audio" ? audioExtensions : coverExtensions;
  if (!allowed.includes(extension)) throw new Error(`Unsupported ${kind} format.`);
  if (kind === "audio" && file.size > 80 * 1024 * 1024) throw new Error("Audio file is too large (80 MB maximum).");
  if (kind === "cover" && file.size > 10 * 1024 * 1024) throw new Error("Cover image is too large (10 MB maximum).");
}

async function storeFile(file: Express.Multer.File, kind: "audio" | "cover") {
  validateFile(file, kind);
  const extension = file.originalname.toLowerCase().split(".").pop() || "bin";
  const id = randomUUID().replace(/-/g, "");
  const key = `uploads/${kind === "audio" ? "audio" : "covers"}/${id}.${extension}`;
  const stored = await storagePut(key, file.buffer, file.mimetype || "application/octet-stream");
  await insertMediaFile({
    id,
    filename: file.originalname,
    storageKey: stored.key,
    url: stored.url,
    mimeType: file.mimetype || "application/octet-stream",
    sizeBytes: file.size,
    kind,
  });
  return stored.url;
}

function trackPayload(body: Record<string, unknown>, audioUrl: string, coverUrl: string | null, id: string) {
  const title = bodyString(body.title);
  const artist = bodyString(body.artist);
  if (!title) throw new Error("Song title is required.");
  if (!artist) throw new Error("Artist name is required.");
  if (!audioUrl) throw new Error("Audio file is required.");
  const year = Number(body.releaseYear);
  return {
    id,
    title,
    artist,
    album: bodyString(body.album) || null,
    description: bodyString(body.description) || null,
    duration: bodyString(body.duration, "00:00"),
    audio: audioUrl,
    coverUrl,
    category: bodyString(body.category, "Broken"),
    language: bodyString(body.language, "Hindi") || null,
    releaseYear: Number.isFinite(year) && year > 0 ? year : null,
    status: bodyString(body.status, "draft") === "published" ? "published" : "draft",
    palette: bodyString(body.palette, "#d19b76"),
    note: bodyString(body.note, "a quiet goodbye"),
    sortOrder: Number(body.sortOrder) || 0,
  };
}

// Admin authentication
router.post("/api/admin/login", asyncHandler(async (req, res) => {
  const email = bodyString(req.body?.email || req.body?.username);
  const password = bodyString(req.body?.password);
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }
  const admin = await loginAdmin(email, password, res);
  if (!admin) {
    res.status(401).json({ error: "Invalid login credentials." });
    return;
  }
  res.json({ admin });
}));

router.post("/api/admin/logout", asyncHandler(async (req, res) => {
  await logoutAdmin(req, res);
  res.json({ success: true });
}));

router.get("/api/admin/me", asyncHandler(async (req, res) => {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }
  res.json({ admin: { id: admin.id, email: admin.email, mustChangePassword: Boolean(admin.mustChangePassword) } });
}));

router.post("/api/admin/change-password", requireAdmin, asyncHandler(async (req, res) => {
  const admin = await getAdminFromRequest(req);
  const currentPassword = bodyString(req.body?.currentPassword);
  const newPassword = bodyString(req.body?.newPassword);
  if (!admin || !verifyPassword(currentPassword, admin.passwordHash)) {
    res.status(400).json({ error: "Current password is incorrect." });
    return;
  }
  if (newPassword.length < 12) {
    res.status(400).json({ error: "New password must be at least 12 characters." });
    return;
  }
  await updateAdminPassword(admin.id, hashPassword(newPassword));
  res.json({ success: true, message: "Password updated successfully." });
}));

// Public APIs. Only published songs and playlists leave these endpoints.
router.get("/api/songs", asyncHandler(async (req, res) => {
  const songs = await listTracks({ publishedOnly: true, search: bodyString(req.query.search), category: bodyString(req.query.category) });
  res.json({ songs });
}));
router.get("/api/songs/:id", asyncHandler(async (req, res) => {
  const song = await getTrack(req.params.id);
  if (!song || song.status !== "published") {
    res.status(404).json({ error: "Song not found" });
    return;
  }
  res.json({ song });
}));
router.post("/api/songs/:id/play", asyncHandler(async (req, res) => {
  const song = await getTrack(req.params.id);
  if (!song || song.status !== "published") {
    res.status(404).json({ error: "Song not found" });
    return;
  }
  await incrementPlayCount(song.id);
  res.json({ success: true });
}));
router.get("/api/playlists", asyncHandler(async (_req, res) => {
  const rows = await listPlaylists();
  res.json({ playlists: rows.filter((playlist) => playlist.status === "published") });
}));
router.get("/api/playlists/:id/songs", asyncHandler(async (req, res) => {
  const playlist = await getPlaylist(Number(req.params.id));
  if (!playlist || playlist.status !== "published") {
    res.status(404).json({ error: "Playlist not found" });
    return;
  }
  const links = (await listPlaylistLinks()).filter((link) => link.playlistId === playlist.id);
  const songs = (await Promise.all(links.map((link) => getTrack(link.trackId)))).filter((song) => song?.status === "published");
  res.json({ playlist, songs });
}));
router.get("/api/settings", asyncHandler(async (_req, res) => {
  res.json({ settings: await getSiteSettings() });
}));

// Protected admin dashboard and song management
router.get("/api/admin/dashboard", requireAdmin, asyncHandler(async (_req, res) => {
  const [stats, recentSongs, mostPlayed] = await Promise.all([
    getDashboardStats(),
    listTracks({}).then((rows) => rows.slice(0, 8)),
    listTracks({}).then((rows) => [...rows].sort((a, b) => b.playCount - a.playCount).slice(0, 5)),
  ]);
  res.json({ stats, recentSongs, mostPlayed });
}));

router.get("/api/admin/songs", requireAdmin, asyncHandler(async (req, res) => {
  const songs = await listTracks({ search: bodyString(req.query.search), status: bodyString(req.query.status, "all"), category: bodyString(req.query.category, "all") });
  res.json({ songs, links: await listPlaylistLinks() });
}));
router.get("/api/admin/songs/:id", requireAdmin, asyncHandler(async (req, res) => {
  const song = await getTrack(req.params.id);
  if (!song) {
    res.status(404).json({ error: "Song not found" });
    return;
  }
  const links = (await listPlaylistLinks()).filter((link) => link.trackId === song.id).map((link) => link.playlistId);
  res.json({ song, playlistIds: links });
}));

const songUpload = upload.fields([{ name: "audio", maxCount: 1 }, { name: "cover", maxCount: 1 }]);
router.post(["/api/admin/songs", "/api/songs"], requireAdmin, songUpload, asyncHandler(async (req, res) => {
  const audio = getUploadedFile(req, "audio");
  const cover = getUploadedFile(req, "cover");
  validateFile(audio, "audio");
  validateFile(cover, "cover");
  const audioUrl = audio ? await storeFile(audio, "audio") : "";
  const coverUrl = cover ? await storeFile(cover, "cover") : null;
  const song = await createTrack(trackPayload(req.body, audioUrl, coverUrl, `song-${randomUUID().replace(/-/g, "").slice(0, 20)}`));
  await replaceTrackPlaylists(song!.id, parsePlaylistIds(req.body.playlistIds));
  res.status(201).json({ song, message: "Song uploaded successfully" });
}));

router.put(["/api/admin/songs/:id", "/api/songs/:id"], requireAdmin, songUpload, asyncHandler(async (req, res) => {
  const existing = await getTrack(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Song not found" });
    return;
  }
  const audio = getUploadedFile(req, "audio");
  const cover = getUploadedFile(req, "cover");
  const audioUrl = audio ? await storeFile(audio, "audio") : existing.audio;
  const coverUrl = cover ? await storeFile(cover, "cover") : existing.coverUrl;
  const payload = trackPayload({ ...existing, ...req.body }, audioUrl, coverUrl, existing.id);
  const song = await updateTrack(existing.id, payload);
  await replaceTrackPlaylists(existing.id, parsePlaylistIds(req.body.playlistIds));
  res.json({ song, message: "Song updated successfully" });
}));
router.delete(["/api/admin/songs/:id", "/api/songs/:id"], requireAdmin, asyncHandler(async (req, res) => {
  await deleteTrack(req.params.id);
  res.json({ success: true, message: "Song deleted successfully" });
}));
router.patch(["/api/admin/songs/:id/publish", "/api/songs/:id/publish"], requireAdmin, asyncHandler(async (req, res) => {
  res.json({ song: await updateTrack(req.params.id, { status: "published" }) });
}));
router.patch(["/api/admin/songs/:id/unpublish", "/api/songs/:id/unpublish"], requireAdmin, asyncHandler(async (req, res) => {
  res.json({ song: await updateTrack(req.params.id, { status: "draft" }) });
}));
router.post("/api/admin/songs/:id/duplicate", requireAdmin, asyncHandler(async (req, res) => {
  const existing = await getTrack(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Song not found" });
    return;
  }
  const copy = await createTrack({ ...existing, id: `song-${randomUUID().replace(/-/g, "").slice(0, 20)}`, title: `${existing.title} copy`, status: "draft", playCount: 0 });
  res.status(201).json({ song: copy });
}));

// Protected playlist and category management
router.get("/api/admin/playlists", requireAdmin, asyncHandler(async (_req, res) => res.json({ playlists: await listPlaylists(), links: await listPlaylistLinks() })));
router.post(["/api/admin/playlists", "/api/playlists"], requireAdmin, asyncHandler(async (req, res) => {
  const name = bodyString(req.body?.name);
  if (!name) { res.status(400).json({ error: "Playlist name is required." }); return; }
  res.status(201).json({ playlist: await createPlaylist({ name, description: bodyString(req.body.description) || null, coverUrl: bodyString(req.body.coverUrl) || null, status: bodyString(req.body.status, "published") }) });
}));
router.put(["/api/admin/playlists/:id", "/api/playlists/:id"], requireAdmin, asyncHandler(async (req, res) => res.json({ playlist: await updatePlaylist(Number(req.params.id), { name: bodyString(req.body.name), description: bodyString(req.body.description) || null, coverUrl: bodyString(req.body.coverUrl) || null, status: bodyString(req.body.status, "published") }) })));
router.delete(["/api/admin/playlists/:id", "/api/playlists/:id"], requireAdmin, asyncHandler(async (req, res) => { await deletePlaylist(Number(req.params.id)); res.json({ success: true }); }));

router.get("/api/admin/categories", requireAdmin, asyncHandler(async (_req, res) => res.json({ categories: await listCategories() })));
router.post(["/api/admin/categories", "/api/categories"], requireAdmin, asyncHandler(async (req, res) => {
  const name = bodyString(req.body?.name);
  if (!name) { res.status(400).json({ error: "Category name is required." }); return; }
  res.status(201).json({ category: await createCategory({ name }) });
}));
router.put(["/api/admin/categories/:id", "/api/categories/:id"], requireAdmin, asyncHandler(async (req, res) => res.json({ category: await updateCategory(Number(req.params.id), { name: bodyString(req.body.name) }) })));
router.delete(["/api/admin/categories/:id", "/api/categories/:id"], requireAdmin, asyncHandler(async (req, res) => { await deleteCategory(Number(req.params.id)); res.json({ success: true }); }));

router.get("/api/admin/settings", requireAdmin, asyncHandler(async (_req, res) => res.json({ settings: await getSiteSettings() })));
router.put("/api/admin/settings", requireAdmin, asyncHandler(async (req, res) => res.json({ settings: await upsertSiteSettings(req.body ?? {}) })));
router.get("/api/admin/media", requireAdmin, asyncHandler(async (_req, res) => res.json({ files: await listMediaFiles() })));

router.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Admin API]", error);
  res.status(400).json({ error: errorMessage(error) });
});

export default router;
