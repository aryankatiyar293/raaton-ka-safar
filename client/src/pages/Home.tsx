import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Disc3,
  Heart,
  ListMusic,
  Menu,
  Mic2,
  MoreHorizontal,
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useRef, useState } from "react";

type RepeatMode = "off" | "one" | "all";
type Category = "All" | "Broken" | "Late Night" | "Sad Vibes" | "Lo-Fi" | "Romantic" | "Road Trip" | "Memories";

type Track = {
  id: string;
  title: string;
  artist: string;
  album?: string | null;
  duration: string;
  audio: string;
  coverUrl?: string | null;
  category: Exclude<Category, "All">;
  palette: string;
  note: string;
};

const categories: Category[] = ["All", "Broken", "Late Night", "Sad Vibes", "Lo-Fi", "Romantic", "Road Trip", "Memories"];

// Replace the audio paths below with files you place in /uploads/audio/.
// Static hosting cannot list a folder at runtime, so this config is the source of truth.
// You can also use the “Load local track” action to preview a file from your device.
const SAMPLE_TRACKS: Track[] = [
  { id: "01", title: "Shaam Ke Baad", artist: "Aarav Mehta", duration: "04:18", audio: "/uploads/audio/shaam-ke-baad.mp3", category: "Broken", palette: "#d19b76", note: "a quiet goodbye" },
  { id: "02", title: "Khidki Par Baarish", artist: "Naina Verma", duration: "03:52", audio: "/uploads/audio/khidki-par-baarish.mp3", category: "Late Night", palette: "#8098be", note: "rain on the glass" },
  { id: "03", title: "Adhoora Sa", artist: "Ritvik Suri", duration: "04:43", audio: "/uploads/audio/adhoora-sa.mp3", category: "Sad Vibes", palette: "#b77bb1", note: "some things stay" },
  { id: "04", title: "Neon Memories", artist: "Mira & The Miles", duration: "03:27", audio: "/uploads/audio/neon-memories.mp3", category: "Lo-Fi", palette: "#c4899f", note: "3:17 am" },
  { id: "05", title: "Tera Shehar", artist: "Kabir Anand", duration: "05:06", audio: "/uploads/audio/tera-shehar.mp3", category: "Romantic", palette: "#d78a79", note: "still yours" },
  { id: "06", title: "Highway 47", artist: "The Midnight Club", duration: "04:11", audio: "/uploads/audio/highway-47.mp3", category: "Road Trip", palette: "#c49b69", note: "keep driving" },
  { id: "07", title: "Polaroid Summer", artist: "Ira Sen", duration: "03:59", audio: "/uploads/audio/polaroid-summer.mp3", category: "Memories", palette: "#d5ae70", note: "before the rain" },
];

const EMPTY_TRACK: Track = { id: "empty", title: "The room is quiet", artist: "Add a published song from admin", duration: "00:00", audio: "", category: "Broken", palette: "#7d849b", note: "nothing here yet" };

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function getStoredId() {
  try {
    return localStorage.getItem("toota-current-track") || SAMPLE_TRACKS[0].id;
  } catch {
    return SAMPLE_TRACKS[0].id;
  }
}

function getVisitorKey() {
  try {
    const existing = localStorage.getItem("toota-visitor-key");
    if (existing) return existing;
    const generated = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : `visitor${Date.now()}${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("toota-visitor-key", generated);
    return generated;
  } catch {
    return `visitor${Date.now()}${Math.random().toString(36).slice(2)}`;
  }
}

function AlbumArt({ track, compact = false, playing = false }: { track: Track; compact?: boolean; playing?: boolean }) {
  return (
    <div className={`album-art ${compact ? "album-art--compact" : ""} ${playing ? "is-playing" : ""}`} style={{ "--album-accent": track.palette } as React.CSSProperties}>
      {track.coverUrl && <img className="album-art__image" src={track.coverUrl} alt="" />}
      <div className="album-art__glow" />
      <div className="album-art__road" />
      <div className="album-art__moon" />
      <div className="album-art__copy">
        <span>TS / 0{track.id}</span>
        <strong>{track.category}</strong>
      </div>
      <div className="album-art__grain" />
    </div>
  );
}

function Equalizer({ active }: { active: boolean }) {
  return (
    <span className={`equalizer ${active ? "is-active" : ""}`} aria-hidden="true">
      <i /><i /><i /><i />
    </span>
  );
}

export default function Home() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previousVolumeRef = useRef(0.72);
  const [visitorKey] = useState(getVisitorKey);
  const tracksQuery = trpc.music.tracks.useQuery();
  const settingsQuery = trpc.music.settings.useQuery();
  const preferencesQuery = trpc.music.preferences.get.useQuery({ visitorKey });
  const { mutate: savePreferences } = trpc.music.preferences.save.useMutation();
  const { mutate: recordPlay } = trpc.music.play.useMutation();
  const [now, setNow] = useState(new Date());
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [currentId, setCurrentId] = useState(getStoredId);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.72);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [shuffleOn, setShuffleOn] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState("Ready when you are");
  const [customSources, setCustomSources] = useState<Record<string, string>>({});
  const [shuffleQueue, setShuffleQueue] = useState<string[]>([]);

  const tracks = useMemo<Track[]>(() => tracksQuery.data === undefined ? SAMPLE_TRACKS : tracksQuery.data.map((track) => ({
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    duration: track.duration,
    audio: track.audio,
    coverUrl: track.coverUrl,
    category: track.category as Track["category"],
    palette: track.palette,
    note: track.note,
  })), [tracksQuery.data]);
  const visibleTracks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tracks.filter((track) => {
      const matchesCategory = activeCategory === "All" || track.category === activeCategory;
      const matchesSearch = !query || [track.title, track.artist, track.album].filter(Boolean).some((value) => value!.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery, tracks]);
  const currentTrack = tracks.find((track) => track.id === currentId) || tracks[0] || EMPTY_TRACK;
  const currentSource = customSources[currentTrack.id] || currentTrack.audio;
  const currentIndex = Math.max(0, visibleTracks.findIndex((track) => track.id === currentTrack.id));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem("toota-favorites");
      if (savedFavorites) setFavoriteIds(JSON.parse(savedFavorites));
    } catch {
      // Local storage is an enhancement, not a dependency.
    }
  }, []);

  useEffect(() => {
    const saved = preferencesQuery.data;
    if (!saved) return;
    setCurrentId(saved.currentTrackId);
    try {
      setFavoriteIds(JSON.parse(saved.favoriteTrackIds) as string[]);
    } catch {
      setFavoriteIds([]);
    }
    setVolume(saved.volume / 100);
    setIsMuted(Boolean(saved.muted));
    setRepeatMode(saved.repeatMode as RepeatMode);
    setShuffleOn(Boolean(saved.shuffleEnabled));
  }, [preferencesQuery.data]);

  useEffect(() => {
    try {
      localStorage.setItem("toota-current-track", currentId);
      localStorage.setItem("toota-favorites", JSON.stringify(favoriteIds));
    } catch {
      // Ignore storage restrictions, including private browsing.
    }
  }, [currentId, favoriteIds]);

  useEffect(() => {
    if (preferencesQuery.isLoading) return;
    const timeout = window.setTimeout(() => {
      savePreferences({
        visitorKey,
        currentTrackId: currentId,
        favoriteTrackIds: favoriteIds,
        volume: Math.round(volume * 100),
        muted: isMuted,
        repeatMode,
        shuffleEnabled: shuffleOn,
      });
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [currentId, favoriteIds, isMuted, preferencesQuery.isLoading, repeatMode, savePreferences, shuffleOn, visitorKey, volume]);

  useEffect(() => {
    setShuffleQueue([]);
  }, [activeCategory]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.src = currentSource || "";
    audio.load();
    setCurrentTime(0);
    setDuration(0);
    setStatusMessage(currentSource ? "Ready when you are" : "Add a local audio file to begin");
    setIsLoading(Boolean(currentSource));
    if (isPlaying && currentSource) {
      void audio.play().catch(() => {
        setIsPlaying(false);
        setStatusMessage("Tap play to start — browsers block autoplay");
      });
    }
  }, [currentId, currentSource]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.code === "Space") { event.preventDefault(); void togglePlay(); }
      if (event.code === "ArrowRight") skipRelative(1);
      if (event.code === "ArrowLeft") skipRelative(-1);
      if (event.key.toLowerCase() === "m") toggleMute();
      if (event.key.toLowerCase() === "s") setShuffleOn((value) => !value);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const selectTrack = (trackId: string) => {
    setCurrentId(trackId);
    setStatusMessage("Loading track…");
    setPlaylistOpen(false);
  };

  const buildShuffleQueue = () => {
    const remaining = visibleTracks.filter((track) => track.id !== currentTrack.id).map((track) => track.id);
    for (let index = remaining.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [remaining[index], remaining[randomIndex]] = [remaining[randomIndex], remaining[index]];
    }
    return remaining;
  };

  const skipRelative = (direction: 1 | -1) => {
    if (!visibleTracks.length) {
      setStatusMessage("This playlist is empty");
      return;
    }
    if (direction === 1 && shuffleOn) {
      const nextQueue = shuffleQueue.length ? shuffleQueue : buildShuffleQueue();
      const nextId = nextQueue[0];
      if (nextId) {
        setShuffleQueue(nextQueue.slice(1));
        setCurrentId(nextId);
        return;
      }
    }
    const nextIndex = (currentIndex + direction + visibleTracks.length) % visibleTracks.length;
    setCurrentId(visibleTracks[nextIndex].id);
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!currentSource) {
      fileInputRef.current?.click();
      setStatusMessage("Choose an audio file to bring this song to life");
      return;
    }
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      setStatusMessage("Paused");
      return;
    }
    setIsLoading(true);
    try {
      await audio.play();
      setIsPlaying(true);
      setStatusMessage("Now playing");
    } catch {
      setIsPlaying(false);
      setStatusMessage("Tap play again to start this local track");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevious = () => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    skipRelative(-1);
  };

  const handleEnded = () => {
    if (repeatMode === "one") {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        void audioRef.current.play().catch(() => setIsPlaying(false));
      }
      return;
    }
    if (!shuffleOn && repeatMode === "off" && currentIndex === visibleTracks.length - 1) {
      setIsPlaying(false);
      setStatusMessage("Playlist complete — press play to hear it again");
      return;
    }
    skipRelative(1);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    const nextMuted = !isMuted;
    if (nextMuted) {
      previousVolumeRef.current = volume || 0.72;
      setVolume(0);
      if (audio) audio.volume = 0;
    } else {
      const restored = previousVolumeRef.current || 0.72;
      setVolume(restored);
      if (audio) audio.volume = restored;
    }
    setIsMuted(nextMuted);
  };

  const changeVolume = (nextVolume: number) => {
    setVolume(nextVolume);
    setIsMuted(nextVolume === 0);
    if (audioRef.current) audioRef.current.volume = nextVolume;
  };

  const changeRepeat = () => {
    setRepeatMode((mode) => mode === "off" ? "one" : mode === "one" ? "all" : "off");
  };

  const toggleFavorite = () => {
    setFavoriteIds((ids) => ids.includes(currentTrack.id) ? ids.filter((id) => id !== currentTrack.id) : [...ids, currentTrack.id]);
  };

  const handleSeek = (value: number) => {
    if (!audioRef.current || !Number.isFinite(audioRef.current.duration)) return;
    audioRef.current.currentTime = value;
    setCurrentTime(value);
  };

  const handleLocalFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCustomSources((sources) => ({ ...sources, [currentTrack.id]: url }));
    setStatusMessage(`${file.name} loaded for this session`);
    setIsPlaying(false);
  };

  const clock = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
  const dateLabel = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "2-digit", month: "short" }).format(now);
  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0;
  const siteName = settingsQuery.data?.websiteName || "टूटा सा सफर";
  const siteSubtitle = settingsQuery.data?.subtitle || "BROKEN SONGS";
  const siteTagline = settingsQuery.data?.tagline || "कुछ गाने सुने नहीं जाते... महसूस किए जाते हैं।";
  const footerText = settingsQuery.data?.footerText || "Made with ❤️ for late-night listeners";
  const supportLink = settingsQuery.data?.supportLink || "";
  const backgroundImage = settingsQuery.data?.backgroundImage || "";
  const siteLogo = settingsQuery.data?.logoUrl || "";

  return (
    <main className="site-shell" style={backgroundImage ? { "--site-background": `url(${backgroundImage})` } as React.CSSProperties : undefined}>
      <div className="background-wash" />
      <div className="rain-layer" />
      <div className="grain-layer" />
      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={(event) => { setDuration(event.currentTarget.duration); setIsLoading(false); }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => { setIsPlaying(true); setIsLoading(false); recordPlay({ trackId: currentTrack.id }); }}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onError={() => { setIsLoading(false); setIsPlaying(false); setStatusMessage("Audio file missing — use Load local track or update the config"); }}
        aria-label="Broken Songs audio player"
      />
      <input ref={fileInputRef} type="file" accept="audio/*" className="sr-only" onChange={handleLocalFile} />

      <header className="topbar">
        <div className="topbar__left">
          <div className="clock-lockup">
            <Clock3 size={14} strokeWidth={1.5} />
            <span className="clock-value">{clock}</span>
            <span className="clock-zone">IST</span>
          </div>
          <div className="listener-count"><span className="online-dot" /> 1,284 listeners now</div>
        </div>

        <div className="brand-lockup" aria-label={`${siteName} ${siteSubtitle}`}>
          <div className="brand-mark">{siteLogo ? <img src={siteLogo} alt="" /> : <span>TS</span>}<i /></div>
          <div>
            <div className="brand-title">{siteName}</div>
            <div className="brand-subtitle">{siteSubtitle} <span>— late night radio</span></div>
          </div>
        </div>

        <div className="topbar__right">
          {searchOpen ? <div className="search-box"><input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search songs…" aria-label="Search songs" /><button onClick={() => { setSearchQuery(""); setSearchOpen(false); }} aria-label="Close search"><X size={14} /></button></div> : <button className="icon-button icon-button--subtle" onClick={() => setSearchOpen(true)} aria-label="Search songs" title="Search songs"><Mic2 size={17} /></button>}
          <button className="support-button" onClick={() => supportLink ? window.open(supportLink, "_blank", "noopener,noreferrer") : setStatusMessage("Thank you for keeping the late-night radio alive")}>Support me <Heart size={13} fill="currentColor" /></button>
          <button className="icon-button icon-button--subtle" onClick={toggleMute} aria-label={isMuted ? "Unmute" : "Mute"} title={isMuted ? "Unmute" : "Mute"}>{isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
          <button className={`icon-button menu-trigger ${menuOpen ? "is-open" : ""}`} onClick={() => setMenuOpen((open) => !open)} aria-label="Open menu" aria-expanded={menuOpen}>{menuOpen ? <X size={18} /> : <Menu size={18} />}</button>
          {menuOpen && <div className="quick-menu"><div className="quick-menu__eyebrow">SHORTCUTS</div><div><kbd>SPACE</kbd> play / pause</div><div><kbd>←</kbd><kbd>→</kbd> skip track</div><div><kbd>M</kbd> mute &nbsp; <kbd>S</kbd> shuffle</div></div>}
        </div>
      </header>

      <section className="hero-grid">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> VOL. 06 / AFTER MIDNIGHT</div>
          <h1>{siteTagline.split(" महसूस")[0]}<em>महसूस{siteTagline.includes(" महसूस") ? siteTagline.split(" महसूस")[1] : " किए जाते हैं।"}</em></h1>
          <p className="hero-note">A small collection for the roads you take when sleep feels too far away.</p>
          <div className="hero-meta"><span><Mic2 size={14} /> 07 songs</span><span><Disc3 size={14} /> curated after dark</span></div>
        </div>

        <div className="player-stage">
          <div className="player-card">
            <div className="player-card__topline"><span className="player-label">NOW PLAYING</span><span className="player-status"><span className={`status-dot ${isPlaying ? "is-playing" : ""}`} />{isLoading ? "BUFFERING" : statusMessage}</span></div>
            <div className="player-main">
              <div className="art-wrap"><AlbumArt track={currentTrack} playing={isPlaying} /><span className="art-index">0{currentTrack.id} / 07</span></div>
              <div className="track-copy"><div className="track-category">{currentTrack.category} <span>·</span> {currentTrack.note}</div><h2>{currentTrack.title}</h2><p>{currentTrack.artist}</p><div className="track-tags"><span>RAINY HOURS</span><span>04:18 AVG</span></div></div>
            </div>
            <div className="progress-wrap"><div className="time-row"><span>{formatTime(currentTime)}</span><span>{duration ? formatTime(duration) : currentTrack.duration}</span></div><input aria-label="Seek through current track" type="range" min="0" max={duration || 1} step="0.1" value={Math.min(currentTime, duration || 1)} onChange={(event) => handleSeek(Number(event.target.value))} style={{ "--progress": `${progress}%` } as React.CSSProperties} /></div>
            <div className="main-controls"><button className={`control-button ${shuffleOn ? "is-active" : ""}`} onClick={() => { setShuffleOn((value) => !value); setShuffleQueue([]); }} aria-label="Toggle shuffle" title="Shuffle"><Shuffle size={17} /></button><button className="control-button" onClick={handlePrevious} aria-label="Previous track" title="Previous"><SkipBack size={21} fill="currentColor" /></button><button className="play-button" onClick={() => void togglePlay()} aria-label={isPlaying ? "Pause" : "Play"}>{isLoading ? <span className="loader-ring" /> : isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}</button><button className="control-button" onClick={() => skipRelative(1)} aria-label="Next track" title="Next"><SkipForward size={21} fill="currentColor" /></button><button className={`control-button ${repeatMode !== "off" ? "is-active" : ""}`} onClick={changeRepeat} aria-label={`Repeat ${repeatMode}`} title={`Repeat ${repeatMode}`}><Repeat size={17} /><span className="repeat-badge">{repeatMode === "one" ? "1" : ""}</span></button></div>
            <div className="player-bottom"><div className="volume-control"><button className="mini-icon" onClick={toggleMute} aria-label={isMuted ? "Unmute" : "Mute"}>{isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}</button><input aria-label="Volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => changeVolume(Number(event.target.value))} style={{ "--progress": `${volume * 100}%` } as React.CSSProperties} /></div><div className="playing-pulse"><Equalizer active={isPlaying} /><span>{isPlaying ? "soundtracking your silence" : "press play to begin"}</span></div><button className={`mini-icon favorite-button ${favoriteIds.includes(currentTrack.id) ? "is-favorite" : ""}`} onClick={toggleFavorite} aria-label="Favorite track" title="Favorite"><Heart size={17} fill={favoriteIds.includes(currentTrack.id) ? "currentColor" : "none"} /></button></div>
          </div>
          <div className="player-shadow-label"><Sparkles size={13} /> headphones recommended <span /> quiet volume, loud feelings</div>
        </div>

        <aside className={`playlist-panel ${playlistOpen ? "is-open" : ""}`}>
          <div className="playlist-head"><div><div className="section-kicker">THE NIGHT DRIVE</div><h3>Your collection</h3></div><button className="close-playlist" onClick={() => setPlaylistOpen(false)} aria-label="Close playlist"><X size={18} /></button></div>
          <div className="category-scroller">{categories.map((category) => <button key={category} className={activeCategory === category ? "is-selected" : ""} onClick={() => setActiveCategory(category)}>{category}{category === "All" && <span>07</span>}</button>)}</div>
          <div className="track-list">{visibleTracks.map((track, index) => <button className={`track-row ${currentTrack.id === track.id ? "is-current" : ""}`} key={track.id} onClick={() => selectTrack(track.id)}><span className="track-number">{String(index + 1).padStart(2, "0")}</span><AlbumArt track={track} compact playing={currentTrack.id === track.id && isPlaying} /><span className="track-row__copy"><strong>{track.title}</strong><small>{track.artist}</small></span><span className="track-row__duration">{currentTrack.id === track.id && isPlaying ? <Equalizer active /> : track.duration}</span></button>)}{!visibleTracks.length && <div className="empty-state"><ListMusic size={24} /><strong>Nothing here yet</strong><span>Add tracks to this mood in the config.</span></div>}</div>
          <div className="playlist-footer"><button className="load-button" onClick={() => fileInputRef.current?.click()}><span className="load-icon"><ChevronDown size={15} /></span> Load local track</button><span>MP3 · WAV · M4A</span></div>
        </aside>
      </section>

      <button className="mobile-playlist-toggle" onClick={() => setPlaylistOpen((open) => !open)}><ListMusic size={17} /> <span>Queue</span><b>{visibleTracks.length}</b><ChevronRight size={16} /></button>
      <footer className="site-footer"><span>{footerText.includes("❤️") ? footerText : <>{footerText}</>} <Heart size={11} fill="currentColor" /></span><span>© 2026 Broken Songs</span></footer>
      <div className="ambient-corner ambient-corner--left">NH 48 <span>— 02:41 AM</span></div>
      <div className="ambient-corner ambient-corner--right">KEEP MOVING <span>→</span></div>
    </main>
  );
}
