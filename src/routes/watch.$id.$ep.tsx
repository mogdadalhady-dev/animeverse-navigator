import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Play, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { VideoPlayer } from "@/components/VideoPlayer";
import { jikan } from "@/lib/jikan";
import { buildEmbedSources, type EmbedServer } from "@/lib/consumet";
import { useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/watch/$id/$ep")({
  component: WatchPage,
});

type Mode = "vpa" | "embed";
type Lang = "sub" | "dub" | "multi";

interface ExtractPayload {
  found: boolean;
  source?: { url: string; isM3U8?: boolean; quality?: string };
  reason?: string;
  error?: string;
}

async function jsonFetch<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()) as T;
}

function WatchPage() {
  const { id, ep } = Route.useParams();
  const epNum = Number(ep) || 1;
  const [mode, setMode] = useState<Mode>("vpa");
  const [lang, setLang] = useState<Lang>("sub");

  const allServers = useMemo(() => buildEmbedSources(id, epNum), [id, epNum]);
  const filtered = useMemo(
    () => allServers.filter((s) => s.lang === lang || s.lang === "multi"),
    [allServers, lang],
  );

  const [serverIdx, setServerIdx] = useState(0);
  const current: EmbedServer | undefined = filtered[serverIdx];

  // Reset on episode / lang change
  useEffect(() => {
    setServerIdx(0);
  }, [lang, id, epNum]);

  // 1. Anime info
  const anime = useQuery({ queryKey: ["anime", id], queryFn: () => jikan.byId(id) });
  const a = anime.data?.data;
  const title = a?.title_english || a?.title || "";

  // 2. VPA: extract direct stream URL from current embed page (server-side
  //    scraper → returns a URL already proxied through /api/anime/proxy).
  const extract = useQuery<ExtractPayload>({
    enabled: mode === "vpa" && !!current?.url,
    queryKey: ["extract", current?.url],
    queryFn: () =>
      jsonFetch<ExtractPayload>(
        `/api/anime/extract?url=${encodeURIComponent(current!.url)}`,
      ),
    retry: 0,
    staleTime: 5 * 60_000,
  });

  // Auto-advance: if extraction fails, try the next server automatically.
  useEffect(() => {
    if (mode !== "vpa") return;
    if (extract.isLoading) return;
    const ok = extract.data?.found && !!extract.data.source?.url;
    if (!ok && serverIdx < filtered.length - 1) {
      const t = setTimeout(() => setServerIdx((i) => i + 1), 600);
      return () => clearTimeout(t);
    }
  }, [extract.data, extract.isLoading, extract.isError, mode, serverIdx, filtered.length]);

  // Iframe watchdog for embed mode
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeLoading, setIframeLoading] = useState(true);
  useEffect(() => {
    if (mode !== "embed" || !current) return;
    setIframeLoading(true);
    const timer = setTimeout(() => {
      setIframeLoading((still) => {
        if (still && serverIdx < filtered.length - 1) setServerIdx((i) => i + 1);
        return still;
      });
    }, 12000);
    return () => clearTimeout(timer);
  }, [current?.url, mode, serverIdx, filtered.length]);

  const vpaSource = extract.data?.found ? extract.data.source : undefined;
  const vpaLoading = mode === "vpa" && extract.isLoading;
  const vpaFailedAll =
    mode === "vpa" &&
    !vpaLoading &&
    !vpaSource &&
    serverIdx >= filtered.length - 1;

  const totalEpisodes = a?.episodes || 12;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
        <Link
          to="/anime/$id"
          params={{ id }}
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to {title || "anime"}
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
              {mode === "vpa" && vpaSource?.url ? (
                <VideoPlayer
                  src={vpaSource.url}
                  isM3U8={vpaSource.isM3U8}
                  poster={a?.images?.webp?.large_image_url}
                  title={`${title} — Episode ${epNum}`}
                  autoPlay
                />
              ) : mode === "vpa" && vpaLoading ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-7 w-7 animate-spin" />
                  <span className="text-sm">
                    Extracting from {current?.name ?? "server"}…
                  </span>
                  <span className="text-xs opacity-60">
                    Trying server {serverIdx + 1} / {filtered.length}
                  </span>
                </div>
              ) : mode === "vpa" && vpaFailedAll ? (
                a?.trailer?.youtube_id ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${a.trailer.youtube_id}`}
                    title="Trailer"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <div className="max-w-md px-4 text-center">
                      <AlertCircle className="mx-auto mb-2 h-10 w-10 opacity-50" />
                      <p className="font-semibold">No direct stream found</p>
                      <p className="mt-1 text-xs">
                        All {filtered.length} servers were tried. Switch to{" "}
                        <button
                          onClick={() => setMode("embed")}
                          className="underline hover:text-primary"
                        >
                          Embed mode
                        </button>{" "}
                        to try iframe playback.
                      </p>
                    </div>
                  </div>
                )
              ) : mode === "embed" && current ? (
                <div className="relative h-full w-full">
                  <iframe
                    ref={iframeRef}
                    key={current.url}
                    src={current.url}
                    title={current.name}
                    onLoad={() => setIframeLoading(false)}
                    onError={() => {
                      if (serverIdx < filtered.length - 1)
                        setServerIdx((i) => i + 1);
                    }}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen; accelerometer; gyroscope"
                    allowFullScreen
                    referrerPolicy="no-referrer"
                    className="h-full w-full"
                  />
                  {iframeLoading && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 text-muted-foreground">
                      <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                      <span>Loading {current.name}…</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <div className="max-w-md px-4 text-center">
                    <AlertCircle className="mx-auto mb-2 h-10 w-10 opacity-50" />
                    <p className="font-semibold">No server selected</p>
                  </div>
                </div>
              )}
            </div>

            <h1 className="mt-4 font-display text-3xl md:text-4xl">{title}</h1>
            <p className="mt-1 text-lg text-muted-foreground">Episode {epNum}</p>

            {/* Mode + language selector */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setMode("vpa");
                  setServerIdx(0);
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === "vpa"
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface hover:bg-surface-elevated"
                }`}
              >
                ⚡ Direct Stream (VPA)
              </button>
              <button
                onClick={() => {
                  setMode("embed");
                  setServerIdx(0);
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === "embed"
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface hover:bg-surface-elevated"
                }`}
              >
                Embed iframe
              </button>

              <div className="ml-2 flex gap-1 rounded-md bg-surface p-1">
                {(["sub", "dub"] as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`rounded px-2.5 py-1 text-xs font-semibold uppercase transition-colors ${
                      lang === l
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-surface-elevated"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  if (mode === "vpa") {
                    extract.refetch();
                  } else if (iframeRef.current) {
                    const src = iframeRef.current.src;
                    iframeRef.current.src = "about:blank";
                    setIframeLoading(true);
                    setTimeout(() => {
                      if (iframeRef.current) iframeRef.current.src = src;
                    }, 50);
                  }
                }}
                className="inline-flex items-center gap-1 rounded-md bg-surface px-2.5 py-1 text-xs hover:bg-surface-elevated"
              >
                <RefreshCw className="h-3 w-3" /> Reload
              </button>
            </div>

            {/* Servers grid */}
            <div className="mt-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                Servers — {lang.toUpperCase()} ({filtered.length})
                {mode === "vpa" && vpaSource?.url ? (
                  <span className="ml-2 normal-case text-emerald-400">
                    ● streaming via proxy
                  </span>
                ) : null}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {filtered.map((s, i) => {
                  const active = i === serverIdx;
                  return (
                    <button
                      key={s.name}
                      onClick={() => setServerIdx(i)}
                      className={`truncate rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface hover:bg-surface-elevated"
                      }`}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {mode === "vpa"
                  ? "VPA extracts the direct .m3u8 server-side and streams it through our proxy — no iframe blocks. Auto-switches if a server can't be extracted."
                  : "If a server doesn't load within ~12s it auto-switches to the next one."}
              </p>
            </div>
          </div>

          <aside className="rounded-xl border border-border bg-surface/50 p-4">
            <h2 className="mb-3 font-display text-xl">Episodes</h2>
            <div className="grid max-h-[600px] grid-cols-4 gap-2 overflow-y-auto lg:grid-cols-3">
              {Array.from({ length: totalEpisodes }).map((_, i) => {
                const n = i + 1;
                const active = n === epNum;
                return (
                  <Link
                    key={n}
                    to="/watch/$id/$ep"
                    params={{ id, ep: String(n) }}
                    className={`relative rounded-md bg-background px-2 py-3 text-center text-sm font-semibold transition-colors hover:bg-surface-elevated ${
                      active ? "bg-primary text-primary-foreground hover:bg-primary" : ""
                    }`}
                  >
                    {n}
                    {active ? (
                      <Play className="absolute right-1 top-1 h-2.5 w-2.5 fill-current" />
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
