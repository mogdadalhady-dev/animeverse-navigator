import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  PictureInPicture2,
  RotateCcw,
  RotateCw,
  Loader2,
} from "lucide-react";

export interface QualitySource {
  url: string;
  quality?: string; // "1080p" | "720p" | "auto" ...
  isM3U8?: boolean;
}

interface Props {
  src?: string; // single source (back-compat)
  sources?: QualitySource[]; // multi-quality
  poster?: string;
  isM3U8?: boolean;
  title?: string;
  autoPlay?: boolean;
  onNext?: () => void;
  onPrev?: () => void;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function fmt(t: number) {
  if (!isFinite(t) || t < 0) t = 0;
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

export function VideoPlayer({
  src,
  sources,
  poster,
  isM3U8,
  title,
  autoPlay,
  onNext,
  onPrev,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimer = useRef<number | null>(null);

  const allSources: QualitySource[] =
    sources && sources.length > 0
      ? sources
      : src
        ? [{ url: src, quality: "auto", isM3U8 }]
        : [];

  const [activeIdx, setActiveIdx] = useState(0);
  const active = allSources[activeIdx];

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [fs, setFs] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [waiting, setWaiting] = useState(false);
  const [hlsLevels, setHlsLevels] = useState<{ index: number; label: string }[]>([]);
  const [hlsLevel, setHlsLevel] = useState<number>(-1); // -1 = auto

  // Attach source
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !active?.url) return;
    const url = active.url;
    const m3u8 = active.isM3U8 ?? /\.m3u8(\?|$)/i.test(url);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    setHlsLevels([]);
    setHlsLevel(-1);

    const wasTime = video.currentTime;

    if (m3u8 && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setHlsLevels(
          hls.levels.map((l, i) => ({
            index: i,
            label: l.height ? `${l.height}p` : `${Math.round(l.bitrate / 1000)}k`,
          })),
        );
        if (wasTime) video.currentTime = wasTime;
        if (autoPlay) video.play().catch(() => {});
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, d) => setHlsLevel(d.level));
      hlsRef.current = hls;
    } else {
      video.src = url;
      if (wasTime) {
        const seek = () => {
          video.currentTime = wasTime;
          video.removeEventListener("loadedmetadata", seek);
        };
        video.addEventListener("loadedmetadata", seek);
      }
      if (autoPlay) video.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [active?.url, active?.isM3U8, autoPlay]);

  // Video events
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setCurrent(v.currentTime);
    const onDur = () => setDuration(v.duration || 0);
    const onVol = () => {
      setMuted(v.muted);
      setVolume(v.volume);
    };
    const onProg = () => {
      if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
    };
    const onWait = () => setWaiting(true);
    const onPlaying = () => setWaiting(false);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("durationchange", onDur);
    v.addEventListener("volumechange", onVol);
    v.addEventListener("progress", onProg);
    v.addEventListener("waiting", onWait);
    v.addEventListener("playing", onPlaying);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("durationchange", onDur);
      v.removeEventListener("volumechange", onVol);
      v.removeEventListener("progress", onProg);
      v.removeEventListener("waiting", onWait);
      v.removeEventListener("playing", onPlaying);
    };
  }, []);

  // Fullscreen state
  useEffect(() => {
    const handler = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
  }, []);

  const seek = useCallback((t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, t));
  }, []);

  const skip = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
  }, []);

  const toggleFs = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  }, []);

  const togglePip = useCallback(async () => {
    const v = videoRef.current as any;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await (document as any).exitPictureInPicture();
      else await v.requestPictureInPicture?.();
    } catch {}
  }, []);

  const setRate = useCallback((r: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = r;
    setSpeed(r);
  }, []);

  const setQuality = useCallback(
    (idx: number) => {
      // HLS internal levels first
      if (hlsRef.current && hlsLevels.length > 0 && idx >= -1) {
        hlsRef.current.currentLevel = idx;
        setHlsLevel(idx);
        return;
      }
      setActiveIdx(idx);
    },
    [hlsLevels.length],
  );

  // Auto-hide controls
  const bump = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (!videoRef.current?.paused) setShowControls(false);
    }, 2800);
  }, []);

  useEffect(() => {
    bump();
  }, [bump, playing]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "arrowright":
          skip(5);
          break;
        case "arrowleft":
          skip(-5);
          break;
        case "l":
          skip(10);
          break;
        case "j":
          skip(-10);
          break;
        case "arrowup":
          e.preventDefault();
          if (videoRef.current) videoRef.current.volume = Math.min(1, videoRef.current.volume + 0.05);
          break;
        case "arrowdown":
          e.preventDefault();
          if (videoRef.current) videoRef.current.volume = Math.max(0, videoRef.current.volume - 0.05);
          break;
        case "m":
          toggleMute();
          break;
        case "f":
          toggleFs();
          break;
        case "p":
          togglePip();
          break;
        case ">":
          setRate(Math.min(2, speed + 0.25));
          break;
        case "<":
          setRate(Math.max(0.25, speed - 0.25));
          break;
      }
      bump();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, skip, toggleMute, toggleFs, togglePip, setRate, speed, bump]);

  const pct = duration ? (current / duration) * 100 : 0;
  const bufPct = duration ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={wrapRef}
      className="group relative h-full w-full overflow-hidden bg-black select-none"
      onMouseMove={bump}
      onMouseLeave={() => playing && setShowControls(false)}
      onTouchStart={bump}
    >
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        className="h-full w-full bg-black"
        onClick={togglePlay}
        onDoubleClick={toggleFs}
      />

      {/* Center loading / big play */}
      {waiting ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-white/90" />
        </div>
      ) : !playing ? (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center"
          aria-label="Play"
        >
          <div className="rounded-full bg-primary/90 p-5 shadow-2xl backdrop-blur transition-transform hover:scale-110">
            <Play className="h-8 w-8 fill-current text-primary-foreground" />
          </div>
        </button>
      ) : null}

      {/* Double-tap skip zones (mobile) */}
      <div
        className="absolute inset-y-0 left-0 w-1/4 md:hidden"
        onDoubleClick={(e) => {
          e.stopPropagation();
          skip(-10);
        }}
      />
      <div
        className="absolute inset-y-0 right-0 w-1/4 md:hidden"
        onDoubleClick={(e) => {
          e.stopPropagation();
          skip(10);
        }}
      />

      {/* Top bar */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-3 transition-opacity duration-200 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {title ? (
          <div className="pointer-events-auto truncate text-sm font-semibold text-white md:text-base">
            {title}
          </div>
        ) : null}
      </div>

      {/* Bottom controls */}
      <div
        className={`absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-2 pt-8 transition-opacity duration-200 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Seek bar */}
        <div className="group/seek relative h-1.5 w-full cursor-pointer rounded-full bg-white/20"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - r.left) / r.width;
            seek(ratio * duration);
          }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white/30"
            style={{ width: `${bufPct}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary"
            style={{ width: `${pct}%` }}
          />
          <div
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-0 transition-opacity group-hover/seek:opacity-100"
            style={{ left: `${pct}%` }}
          />
        </div>

        <div className="mt-2 flex items-center gap-2 text-white">
          <button onClick={togglePlay} className="rounded p-1.5 hover:bg-white/10" aria-label="Play/Pause">
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
          </button>

          <button
            onClick={() => skip(-10)}
            className="rounded p-1.5 hover:bg-white/10"
            aria-label="Back 10s"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <button
            onClick={() => skip(10)}
            className="rounded p-1.5 hover:bg-white/10"
            aria-label="Forward 10s"
          >
            <RotateCw className="h-5 w-5" />
          </button>

          {/* Volume */}
          <div className="group/vol flex items-center">
            <button
              onClick={toggleMute}
              className="rounded p-1.5 hover:bg-white/10"
              aria-label="Mute"
            >
              {muted || volume === 0 ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = videoRef.current;
                if (!v) return;
                v.muted = false;
                v.volume = Number(e.target.value);
              }}
              className="ml-1 hidden h-1 w-0 cursor-pointer accent-primary transition-all group-hover/vol:w-20 md:block md:group-hover/vol:w-20"
              style={{ width: undefined }}
            />
          </div>

          <div className="ml-1 text-xs tabular-nums text-white/90">
            {fmt(current)} <span className="text-white/50">/ {fmt(duration)}</span>
          </div>

          <div className="ml-auto flex items-center gap-1">
            {/* Settings */}
            <div className="relative">
              <button
                onClick={() => setShowSettings((s) => !s)}
                className="rounded p-1.5 hover:bg-white/10"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
              {showSettings ? (
                <div className="absolute bottom-10 right-0 w-52 rounded-lg border border-white/10 bg-black/95 p-2 text-sm shadow-xl backdrop-blur">
                  <div className="px-2 py-1 text-xs uppercase tracking-wide text-white/50">
                    Speed
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {SPEEDS.map((s) => (
                      <button
                        key={s}
                        onClick={() => setRate(s)}
                        className={`rounded px-2 py-1 text-xs ${
                          speed === s
                            ? "bg-primary text-primary-foreground"
                            : "bg-white/5 hover:bg-white/15"
                        }`}
                      >
                        {s === 1 ? "1x" : `${s}x`}
                      </button>
                    ))}
                  </div>

                  {(hlsLevels.length > 0 || allSources.length > 1) && (
                    <>
                      <div className="mt-2 px-2 py-1 text-xs uppercase tracking-wide text-white/50">
                        Quality
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {hlsLevels.length > 0 ? (
                          <>
                            <button
                              onClick={() => setQuality(-1)}
                              className={`rounded px-2 py-1 text-xs ${
                                hlsLevel === -1
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-white/5 hover:bg-white/15"
                              }`}
                            >
                              Auto
                            </button>
                            {hlsLevels.map((l) => (
                              <button
                                key={l.index}
                                onClick={() => setQuality(l.index)}
                                className={`rounded px-2 py-1 text-xs ${
                                  hlsLevel === l.index
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-white/5 hover:bg-white/15"
                                }`}
                              >
                                {l.label}
                              </button>
                            ))}
                          </>
                        ) : (
                          allSources.map((s, i) => (
                            <button
                              key={i}
                              onClick={() => setQuality(i)}
                              className={`rounded px-2 py-1 text-xs ${
                                activeIdx === i
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-white/5 hover:bg-white/15"
                              }`}
                            >
                              {s.quality || `S${i + 1}`}
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </div>

            <button
              onClick={togglePip}
              className="hidden rounded p-1.5 hover:bg-white/10 md:inline-flex"
              aria-label="Picture in Picture"
            >
              <PictureInPicture2 className="h-5 w-5" />
            </button>

            <button onClick={toggleFs} className="rounded p-1.5 hover:bg-white/10" aria-label="Fullscreen">
              {fs ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
