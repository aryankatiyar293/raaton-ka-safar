import {
  BarChart3,
  Check,
  ChevronRight,
  CloudUpload,
  Copy,
  FolderOpen,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  Music2,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";

type AdminUser = { id: number; email: string; mustChangePassword: boolean };
type Song = { id: string; title: string; artist: string; album?: string | null; description?: string | null; duration: string; audio: string; coverUrl?: string | null; category: string; language?: string | null; releaseYear?: number | null; status: string; playCount: number; palette: string; note: string; createdAt: string; updatedAt: string };
type Playlist = { id: number; name: string; description?: string | null; coverUrl?: string | null; status: string };
type Category = { id: number; name: string };

type FetchOptions = RequestInit & { json?: unknown };
async function adminFetch<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  let body = options.body;
  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.json);
  }
  const response = await fetch(url, { ...options, headers, body, credentials: "same-origin" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Something went wrong. Please try again.");
  return payload as T;
}

function formatDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins.toString().padStart(2, "0")}:${secs}`;
}

export function AdminLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    adminFetch("/api/admin/me").then(() => navigate("/admin")).catch(() => undefined);
  }, [navigate]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await adminFetch("/api/admin/login", { method: "POST", json: { email, password } });
      navigate("/admin");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Invalid login credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-auth-page">
      <div className="admin-auth-glow admin-auth-glow--one" />
      <div className="admin-auth-glow admin-auth-glow--two" />
      <section className="admin-auth-card">
        <div className="admin-brand-mark"><Music2 size={19} /><span>TS</span></div>
        <div className="admin-eyebrow">BROKEN SONGS / CONTROL ROOM</div>
        <h1>Welcome back.</h1>
        <p>Manage the late-night library without touching the source code.</p>
        <form onSubmit={handleSubmit} className="admin-form admin-login-form">
          <label>Email or username<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required placeholder="admin@example.com" /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required placeholder="••••••••" /></label>
          {error && <div className="admin-alert admin-alert--error">{error}</div>}
          <button className="admin-primary-button" disabled={loading}>{loading ? "Checking…" : "Enter the control room"}<ChevronRight size={16} /></button>
        </form>
        <Link href="/" className="admin-back-link">← Back to the public player</Link>
      </section>
    </main>
  );
}

function Sidebar({ active, onClose }: { active: string; onClose: () => void }) {
  const [, navigate] = useLocation();
  const items = [
    { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { path: "/admin/songs", label: "Songs", icon: Music2 },
    { path: "/admin/songs/new", label: "Add song", icon: Plus },
    { path: "/admin/playlists", label: "Playlists", icon: Library },
    { path: "/admin/categories", label: "Categories", icon: FolderOpen },
    { path: "/admin/media", label: "Media", icon: CloudUpload },
    { path: "/admin/settings", label: "Settings", icon: Settings },
  ];
  async function logout() {
    await adminFetch("/api/admin/logout", { method: "POST" });
    navigate("/admin/login");
  }
  return <aside className="admin-sidebar"><div className="admin-sidebar-brand"><div className="admin-brand-mark"><Music2 size={17} /><span>TS</span></div><div><strong>टूटा सा सफर</strong><small>CMS / CONTROL ROOM</small></div><button className="admin-mobile-close" onClick={onClose}><X size={18} /></button></div><nav className="admin-nav">{items.map(({ path, label, icon: Icon }) => <Link key={path} href={path} onClick={onClose} className={active === path || (path === "/admin/songs" && active.includes("/admin/songs/")) ? "is-active" : ""}><Icon size={17} /><span>{label}</span>{path === "/admin/songs/new" && <Plus size={14} className="admin-nav-plus" />}</Link>)}</nav><div className="admin-sidebar-bottom"><div className="admin-sidebar-note"><BarChart3 size={16} /><span>Keep the quiet<br /><b>loud enough.</b></span></div><button className="admin-logout-button" onClick={logout}><LogOut size={16} /> Log out</button></div></aside>;
}

function AdminLayout({ user, children, active }: { user: AdminUser; children: React.ReactNode; active: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return <div className="admin-app"><div className={`admin-sidebar-wrap ${mobileOpen ? "is-open" : ""}`}><Sidebar active={active} onClose={() => setMobileOpen(false)} /></div>{mobileOpen && <button className="admin-sidebar-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}<div className="admin-main"><header className="admin-topbar"><button className="admin-mobile-menu" onClick={() => setMobileOpen(true)}><Menu size={19} /></button><div><span className="admin-topbar-kicker">{active === "/admin" ? "OVERVIEW" : active.replace("/admin/", "").replace("/", " / ").toUpperCase()}</span><h2>{active === "/admin" ? "Dashboard" : active.includes("new") ? "Add song" : active.includes("edit") ? "Edit song" : active.split("/").pop()}</h2></div><div className="admin-user-chip"><span>{user.email.slice(0, 1).toUpperCase()}</span><div><strong>{user.email.split("@")[0]}</strong><small>Administrator</small></div></div></header><div className="admin-content">{children}</div></div></div>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="admin-page-heading"><div><div className="admin-eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function StatCard({ label, value, accent, detail }: { label: string; value: number; accent: string; detail: string }) {
  return <div className="admin-stat-card"><div className="admin-stat-card__line" style={{ background: accent }} /><span>{label}</span><strong>{value.toString().padStart(2, "0")}</strong><small>{detail}</small></div>;
}

function Dashboard() {
  const [data, setData] = useState<{ stats: Record<string, number>; recentSongs: Song[]; mostPlayed: Song[] }>();
  const [error, setError] = useState("");
  useEffect(() => { adminFetch<typeof data>("/api/admin/dashboard").then(setData).catch((reason) => setError(reason.message)); }, []);
  if (error) return <div className="admin-alert admin-alert--error">{error}</div>;
  const stats = data?.stats || {};
  return <>
    <PageHeading eyebrow="GOOD EVENING / CONTROL ROOM" title="A quieter kind of power." description="Your library at a glance. Publish, curate, and keep the night moving." action={<Link href="/admin/songs/new" className="admin-primary-button"><Plus size={16} /> Add a song</Link>} />
    <div className="admin-stat-grid"><StatCard label="Total songs" value={stats.totalSongs || 0} accent="#d39a78" detail="in the library" /><StatCard label="Published" value={stats.publishedSongs || 0} accent="#8fc6a3" detail="visible on the player" /><StatCard label="Drafts" value={stats.draftSongs || 0} accent="#bf9ad6" detail="waiting in the wings" /><StatCard label="Playlists" value={stats.totalPlaylists || 0} accent="#839ac5" detail="curated collections" /><StatCard label="Categories" value={stats.totalCategories || 0} accent="#d5b26f" detail="moods & moments" /></div>
    <div className="admin-two-column"><section className="admin-panel"><div className="admin-panel-heading"><div><span className="admin-eyebrow">RECENTLY UPDATED</span><h3>Recent songs</h3></div><Link href="/admin/songs">View all <ChevronRight size={14} /></Link></div><SongMiniList songs={data?.recentSongs || []} /></section><section className="admin-panel"><div className="admin-panel-heading"><div><span className="admin-eyebrow">LISTENER SIGNAL</span><h3>Most played</h3></div><BarChart3 size={17} /></div><SongMiniList songs={data?.mostPlayed || []} showPlays /></section></div>
  </>;
}

function SongMiniList({ songs, showPlays = false }: { songs: Song[]; showPlays?: boolean }) {
  if (!songs.length) return <div className="admin-empty">No songs yet. Add the first one to start the radio.</div>;
  return <div className="admin-mini-list">{songs.map((song) => <div className="admin-mini-row" key={song.id}><div className="admin-mini-art" style={{ background: song.palette }}>{song.title.slice(0, 1)}</div><div><strong>{song.title}</strong><small>{song.artist}</small></div><span>{showPlays ? `${song.playCount} plays` : formatDate(song.updatedAt)}</span></div>)}</div>;
}

function useAdminLists() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const reload = () => Promise.all([adminFetch<{ categories: Category[] }>("/api/admin/categories"), adminFetch<{ playlists: Playlist[] }>("/api/admin/playlists")]).then(([categoryData, playlistData]) => { setCategories(categoryData.categories); setPlaylists(playlistData.playlists); });
  useEffect(() => { reload().catch(() => undefined); }, []);
  return { categories, playlists, reload };
}

function Songs() {
  const [, navigate] = useLocation();
  const { categories, playlists } = useAdminLists();
  const [songs, setSongs] = useState<Song[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const playlistNames = useMemo(() => new Map(playlists.map((playlist) => [playlist.id, playlist.name])), [playlists]);
  async function load() {
    setLoading(true);
    try { const data = await adminFetch<{ songs: Song[] }>(`/api/admin/songs?search=${encodeURIComponent(search)}&status=${status}`); setSongs(data.songs); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load songs."); } finally { setLoading(false); }
  }
  useEffect(() => { load().catch(() => undefined); }, [status]);
  async function action(url: string, method: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    try { await adminFetch(url, { method }); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Action failed."); }
  }
  return <><PageHeading eyebrow="LIBRARY / ALL SONGS" title="Every feeling, catalogued." description="Search, filter, preview, and publish songs from one place." action={<Link href="/admin/songs/new" className="admin-primary-button"><Plus size={16} /> Add song</Link>} /><div className="admin-toolbar"><div className="admin-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") load().catch(() => undefined); }} placeholder="Search title, artist, album…" /></div><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Drafts</option></select><button className="admin-secondary-button" onClick={() => load()}>Search</button></div>{error && <div className="admin-alert admin-alert--error">{error}</div>}<section className="admin-panel admin-table-panel">{loading ? <div className="admin-empty">Loading the library…</div> : !songs.length ? <div className="admin-empty"><Music2 size={24} />No songs match this view.</div> : <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Song</th><th>Category</th><th>Duration</th><th>Status</th><th>Plays</th><th>Updated</th><th /></tr></thead><tbody>{songs.map((song) => <tr key={song.id}><td><div className="admin-song-cell"><div className="admin-table-art" style={{ background: song.palette }}>{song.title.slice(0, 1)}</div><div><strong>{song.title}</strong><small>{song.artist}{song.album ? ` · ${song.album}` : ""}</small></div></div></td><td>{song.category}</td><td>{song.duration}</td><td><span className={`admin-status admin-status--${song.status}`}>{song.status}</span></td><td>{song.playCount}</td><td>{formatDate(song.updatedAt)}</td><td><div className="admin-row-actions"><button title="Preview" onClick={() => window.alert(`Preview: ${song.title}\n${song.audio}`)}><BarChart3 size={15} /></button><button title="Edit" onClick={() => navigate(`/admin/songs/${song.id}/edit`)}><Pencil size={15} /></button><button title={song.status === "published" ? "Unpublish" : "Publish"} onClick={() => action(`/api/admin/songs/${song.id}/${song.status === "published" ? "unpublish" : "publish"}`, "PATCH")}>{song.status === "published" ? <X size={15} /> : <Check size={15} />}</button><button title="Duplicate" onClick={() => action(`/api/admin/songs/${song.id}/duplicate`, "POST")}><Copy size={15} /></button><button title="Delete" onClick={() => action(`/api/admin/songs/${song.id}`, "DELETE", "Are you sure you want to delete this song?")}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>}</section></>;
}

function SongForm({ songId }: { songId?: string }) {
  const [, navigate] = useLocation();
  const { categories, playlists } = useAdminLists();
  const [form, setForm] = useState({ title: "", artist: "", album: "", description: "", category: "Broken", language: "Hindi", releaseYear: "", duration: "00:00", status: "draft", palette: "#d19b76", note: "a quiet goodbye", playlistIds: [] as number[] });
  const [audio, setAudio] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [existingCover, setExistingCover] = useState("");
  const [existingAudio, setExistingAudio] = useState("");
  const [audioPreview, setAudioPreview] = useState("");
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const audioInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const editing = Boolean(songId);

  useEffect(() => {
    if (!songId) return;
    adminFetch<{ song: Song; playlistIds: number[] }>(`/api/admin/songs/${songId}`).then(({ song, playlistIds }) => { setForm({ title: song.title, artist: song.artist, album: song.album || "", description: song.description || "", category: song.category, language: song.language || "Hindi", releaseYear: song.releaseYear?.toString() || "", duration: song.duration, status: song.status, palette: song.palette, note: song.note, playlistIds }); setExistingAudio(song.audio); setAudioPreview(song.audio); setExistingCover(song.coverUrl || ""); }).catch((reason) => setError(reason.message));
  }, [songId]);

  function updateField(key: string, value: string) { setForm((current) => ({ ...current, [key]: value })); }
  function inspectAudio(file: File | null) {
    setAudio(file);
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAudioPreview(url);
    const probe = new Audio(url);
    probe.onloadedmetadata = () => { updateField("duration", formatDuration(probe.duration)); URL.revokeObjectURL(url); };
    probe.onerror = () => { URL.revokeObjectURL(url); setError("Could not read the audio file. Please choose a valid MP3, WAV, or M4A file."); };
  }
  function onDrop(event: React.DragEvent) { event.preventDefault(); setDragging(false); inspectAudio(event.dataTransfer.files?.[0] || null); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setMessage(""); setError("");
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, Array.isArray(value) ? JSON.stringify(value) : String(value)));
      if (audio) body.append("audio", audio);
      if (cover) body.append("cover", cover);
      const response = await adminFetch<{ message?: string }>(editing ? `/api/admin/songs/${songId}` : "/api/admin/songs", { method: editing ? "PUT" : "POST", body });
      setMessage(response.message || "Song saved successfully.");
      window.setTimeout(() => navigate("/admin/songs"), 650);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Upload failed. Please try again."); } finally { setSaving(false); }
  }
  return <><PageHeading eyebrow={editing ? "LIBRARY / EDIT SONG" : "LIBRARY / NEW SONG"} title={editing ? "Tune the details." : "Add a new feeling."} description="Upload the audio and cover once. The player will handle the rest." /><form className="admin-song-form" onSubmit={submit}><section className="admin-panel"><div className="admin-form-grid"><label>Song title<input required value={form.title} onChange={(event) => updateField("title", event.target.value)} placeholder="Tera Hone Laga Hoon" /></label><label>Artist name<input required value={form.artist} onChange={(event) => updateField("artist", event.target.value)} placeholder="Atif Aslam" /></label><label>Album name<input value={form.album} onChange={(event) => updateField("album", event.target.value)} placeholder="Ajab Prem Ki Ghazab Kahani" /></label><label>Language<select value={form.language} onChange={(event) => updateField("language", event.target.value)}><option>Hindi</option><option>Punjabi</option><option>English</option><option>Instrumental</option></select></label><label>Category<select value={form.category} onChange={(event) => updateField("category", event.target.value)}>{(categories.length ? categories : [{ id: 0, name: "Broken" }]).map((category) => <option key={category.id || category.name}>{category.name}</option>)}</select></label><label>Release year<input type="number" min="1900" max="2100" value={form.releaseYear} onChange={(event) => updateField("releaseYear", event.target.value)} placeholder="2026" /></label><label>Description<textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} placeholder="A short note about this song…" /></label><label>Player note<input value={form.note} onChange={(event) => updateField("note", event.target.value)} placeholder="a quiet goodbye" /></label></div></section><section className="admin-panel"><div className="admin-panel-heading"><div><span className="admin-eyebrow">CURATION</span><h3>Place the song</h3></div></div><div className="admin-form-grid"><label>Playlist<select multiple value={form.playlistIds.map(String)} onChange={(event) => setForm((current) => ({ ...current, playlistIds: Array.from(event.target.selectedOptions).map((option) => Number(option.value)) }))}>{playlists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.name}</option>)}</select><small className="admin-help">Hold Ctrl / Cmd to assign more than one playlist.</small></label><label>Publish status<select value={form.status} onChange={(event) => updateField("status", event.target.value)}><option value="draft">Draft</option><option value="published">Published</option></select></label><label>Palette accent<input type="color" value={form.palette} onChange={(event) => updateField("palette", event.target.value)} /></label><label>Duration<input value={form.duration} readOnly /><small className="admin-help">Detected automatically from the audio file.</small></label></div></section><section className="admin-upload-grid"><div className={`admin-upload-zone ${dragging ? "is-dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop} onClick={() => audioInput.current?.click()}><input ref={audioInput} type="file" accept="audio/mpeg,audio/wav,audio/x-m4a,audio/mp4,audio/*" className="sr-only" onChange={(event) => inspectAudio(event.target.files?.[0] || null)} /><CloudUpload size={25} /><strong>{audio ? audio.name : existingAudio ? "Audio already attached" : "Drop an MP3, WAV, or M4A"}</strong><span>{audio ? `${(audio.size / 1024 / 1024).toFixed(1)} MB · ${form.duration}` : "Choose audio · up to 80 MB"}</span>{audioPreview && <audio controls src={audioPreview} onClick={(event) => event.stopPropagation()} />} {audio && <div className="admin-upload-success"><Check size={14} /> Audio ready</div>}</div><div className="admin-upload-zone admin-upload-zone--cover" onClick={() => coverInput.current?.click()}><input ref={coverInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setCover(event.target.files?.[0] || null)} /><Upload size={22} /><strong>{cover ? cover.name : existingCover ? "Cover already attached" : "Choose cover artwork"}</strong><span>JPG, PNG, or WEBP · up to 10 MB</span>{cover && <div className="admin-upload-success"><Check size={14} /> Cover ready</div>}</div></section>{message && <div className="admin-alert admin-alert--success"><Check size={15} /> {message}</div>}{error && <div className="admin-alert admin-alert--error">{error}</div>}<div className="admin-form-actions"><button type="button" className="admin-secondary-button" onClick={() => navigate("/admin/songs")}>Cancel</button><button className="admin-primary-button" disabled={saving}>{saving ? "Uploading…" : editing ? "Save changes" : "Publish to library"}<ChevronRight size={16} /></button></div></form></>;
}

function Playlists() {
  const { playlists, reload } = useAdminLists();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  async function addPlaylist(event: FormEvent) { event.preventDefault(); try { await adminFetch("/api/admin/playlists", { method: "POST", json: { name, description, status: "published" } }); setName(""); setDescription(""); await reload(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to create playlist."); } }
  async function remove(id: number) { if (!window.confirm("Delete this playlist? Songs will remain in the library.")) return; await adminFetch(`/api/admin/playlists/${id}`, { method: "DELETE" }); await reload(); }
  return <><PageHeading eyebrow="CURATION / PLAYLISTS" title="Give the night a shape." description="Create collections for moods, seasons, and the roads between them." /><div className="admin-two-column admin-two-column--narrow"><section className="admin-panel"><div className="admin-panel-heading"><div><span className="admin-eyebrow">NEW COLLECTION</span><h3>Create playlist</h3></div></div><form className="admin-form" onSubmit={addPlaylist}><label>Playlist name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Late Night 🌙" /></label><label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="For the hour when the city goes quiet." /></label>{error && <div className="admin-alert admin-alert--error">{error}</div>}<button className="admin-primary-button"><Plus size={16} /> Create playlist</button></form></section><section className="admin-panel"><div className="admin-panel-heading"><div><span className="admin-eyebrow">YOUR COLLECTIONS</span><h3>{playlists.length} playlists</h3></div></div><div className="admin-card-list">{playlists.map((playlist) => <div className="admin-resource-row" key={playlist.id}><div className="admin-resource-icon"><Library size={17} /></div><div><strong>{playlist.name}</strong><small>{playlist.description || "No description yet"}</small></div><button onClick={() => remove(playlist.id)}><Trash2 size={15} /></button></div>)}</div></section></div></>;
}

function Categories() {
  const { categories, reload } = useAdminLists();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  async function addCategory(event: FormEvent) { event.preventDefault(); try { await adminFetch("/api/admin/categories", { method: "POST", json: { name } }); setName(""); await reload(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to create category."); } }
  async function remove(id: number) { if (!window.confirm("Delete this category? Songs keep their current label.")) return; await adminFetch(`/api/admin/categories/${id}`, { method: "DELETE" }); await reload(); }
  return <><PageHeading eyebrow="TAXONOMY / CATEGORIES" title="Name the feeling." description="Keep discovery simple with a small, expressive vocabulary." /><section className="admin-panel admin-category-panel"><form className="admin-inline-form" onSubmit={addCategory}><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Add a category" /><button className="admin-primary-button"><Plus size={16} /> Add</button></form>{error && <div className="admin-alert admin-alert--error">{error}</div>}<div className="admin-chip-grid">{categories.map((category) => <div className="admin-category-chip" key={category.id}><span>{category.name}</span><button onClick={() => remove(category.id)} aria-label={`Delete ${category.name}`}><X size={14} /></button></div>)}</div></section></>;
}

function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { adminFetch<{ settings: Record<string, string> }>("/api/admin/settings").then((data) => setSettings(data.settings)).catch((reason) => setError(reason.message)); }, []);
  function set(key: string, value: string) { setSettings((current) => ({ ...current, [key]: value })); }
  async function save(event: FormEvent) { event.preventDefault(); try { await adminFetch("/api/admin/settings", { method: "PUT", json: settings }); setMessage("Settings saved. The public player will use them on its next visit."); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save settings."); } }
  return <><PageHeading eyebrow="CONTROL ROOM / SETTINGS" title="Shape the room." description="These details flow into the public player without a code change." /><form className="admin-panel admin-settings-form" onSubmit={save}><div className="admin-form-grid"><label>Website name<input value={settings.websiteName || ""} onChange={(event) => set("websiteName", event.target.value)} placeholder="टूटा सा सफर" /></label><label>Subtitle<input value={settings.subtitle || ""} onChange={(event) => set("subtitle", event.target.value)} placeholder="BROKEN SONGS" /></label><label>Tagline<textarea value={settings.tagline || ""} onChange={(event) => set("tagline", event.target.value)} placeholder="कुछ गाने सुने नहीं जाते... महसूस किए जाते हैं।" /></label><label>Footer text<input value={settings.footerText || ""} onChange={(event) => set("footerText", event.target.value)} placeholder="Made with love for late-night listeners" /></label><label>Logo URL<input value={settings.logoUrl || ""} onChange={(event) => set("logoUrl", event.target.value)} placeholder="/manus-storage/your-logo.png" /></label><label>Background image URL<input value={settings.backgroundImage || ""} onChange={(event) => set("backgroundImage", event.target.value)} placeholder="/manus-storage/your-background.jpg" /></label><label>Support me link<input value={settings.supportLink || ""} onChange={(event) => set("supportLink", event.target.value)} placeholder="https://…" /></label><label>Social links<input value={settings.socialLinks || ""} onChange={(event) => set("socialLinks", event.target.value)} placeholder="Instagram, YouTube, Spotify" /></label></div>{message && <div className="admin-alert admin-alert--success"><Check size={15} /> {message}</div>}{error && <div className="admin-alert admin-alert--error">{error}</div>}<button className="admin-primary-button"><Check size={16} /> Save settings</button></form></>;
}

function MediaPage() {
  const [files, setFiles] = useState<Array<{ id: string; filename: string; url: string; mimeType: string; sizeBytes: number; kind: string; createdAt: string }>>([]);
  const [error, setError] = useState("");
  useEffect(() => { adminFetch<{ files: Array<{ id: string; filename: string; url: string; mimeType: string; sizeBytes: number; kind: string; createdAt: string }> }>("/api/admin/media").then((data) => setFiles(data.files)).catch((reason) => setError(reason.message)); }, []);
  return <><PageHeading eyebrow="MEDIA / STORAGE" title="Everything in its place." description="Uploaded audio and artwork are stored in durable object storage, not on the app server." />{error && <div className="admin-alert admin-alert--error">{error}</div>}<section className="admin-panel"><div className="admin-panel-heading"><div><span className="admin-eyebrow">UPLOADED FILES</span><h3>{files.length} files</h3></div><CloudUpload size={17} /></div>{!files.length ? <div className="admin-empty">No uploaded files yet. Add a song to create media.</div> : <div className="admin-card-list">{files.map((file) => <div className="admin-resource-row" key={file.id}><div className="admin-resource-icon">{file.kind === "audio" ? <Music2 size={17} /> : <FolderOpen size={17} />}</div><div><strong>{file.filename}</strong><small>{file.kind} · {(file.sizeBytes / 1024 / 1024).toFixed(2)} MB · {formatDate(file.createdAt)}</small></div><a className="admin-media-open" href={file.url} target="_blank" rel="noreferrer">Open</a></div>)}</div>}</section></>;
}

function ForcePasswordChange({ email, onComplete }: { email: string; onComplete: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) { setError("New passwords do not match."); return; }
    setSaving(true); setError("");
    try { await adminFetch("/api/admin/change-password", { method: "POST", json: { currentPassword, newPassword } }); onComplete(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update password."); }
    finally { setSaving(false); }
  }
  return <main className="admin-auth-page"><section className="admin-auth-card"><div className="admin-brand-mark"><Music2 size={19} /><span>TS</span></div><div className="admin-eyebrow">FIRST LOGIN / SECURITY CHECK</div><h1>Set your own key.</h1><p>The environment password is temporary. Choose a new password for {email} before entering the control room.</p><form onSubmit={submit} className="admin-form admin-login-form"><label>Current password<input type="password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" /></label><label>New password<input type="password" required minLength={12} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" /><small className="admin-help">Use at least 12 characters.</small></label><label>Confirm new password<input type="password" required minLength={12} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" /></label>{error && <div className="admin-alert admin-alert--error">{error}</div>}<button className="admin-primary-button" disabled={saving}>{saving ? "Updating…" : "Save new password"}<ChevronRight size={16} /></button></form></section></main>;
}

export default function AdminApp() {
  const [location, navigate] = useLocation();
  const [user, setUser] = useState<AdminUser>();
  const [checking, setChecking] = useState(true);
  useEffect(() => { adminFetch<{ admin: AdminUser }>("/api/admin/me").then((data) => setUser(data.admin)).catch(() => setUser(undefined)).finally(() => setChecking(false)); }, [location]);
  useEffect(() => { if (!checking && !user && location !== "/admin/login") navigate("/admin/login"); }, [checking, location, navigate, user]);
  if (checking) return <main className="admin-loading"><div className="admin-loading-orb" /><span>Opening the control room…</span></main>;
  if (!user) return <AdminLogin />;
  if (user.mustChangePassword) return <ForcePasswordChange email={user.email} onComplete={() => setUser((current) => current ? { ...current, mustChangePassword: false } : current)} />;
  let content: React.ReactNode = <Dashboard />;
  if (location === "/admin/songs" || location === "/admin/songs/") content = <Songs />;
  else if (location === "/admin/songs/new") content = <SongForm />;
  else if (location.startsWith("/admin/songs/") && location.endsWith("/edit")) content = <SongForm songId={location.split("/")[3]} />;
  else if (location.startsWith("/admin/playlists")) content = <Playlists />;
  else if (location.startsWith("/admin/categories")) content = <Categories />;
  else if (location.startsWith("/admin/media")) content = <MediaPage />;
  else if (location.startsWith("/admin/settings")) content = <SettingsPage />;
  return <AdminLayout user={user} active={location === "/admin" ? "/admin" : location.startsWith("/admin/songs") ? "/admin/songs" : location.startsWith("/admin/playlists") ? "/admin/playlists" : location.startsWith("/admin/categories") ? "/admin/categories" : location.startsWith("/admin/media") ? "/admin/media" : "/admin/settings"}>{content}</AdminLayout>;
}
