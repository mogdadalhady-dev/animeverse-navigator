import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Play, AlertCircle, Loader2, RefreshCw, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { VideoPlayer } from "@/components/VideoPlayer";
import { jikan } from "@/lib/jikan";
import { buildEmbedSources, type EmbedServer } from "@/lib/consumet";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();
  const epNum = Number(ep) || 1;
  const [mode, setMode] = useState<Mode>("vpa");
  const [lang, setLang] = useState<Lang>("sub");

  const allServers = useMemo(() => buildEmbedSources(id, epNum), [id, epNum]);
  const langFiltered = useMemo(
    () => allServers.filter((s) => s.lang === lang || s.lang === "multi"),
    [allServers, lang],
  );

  // Probe every candidate server in parallel via /api/anime/extract.
  // Keep only the ones that actually return a usable stream.
  const probes = useQueries({
    queries: langFiltered.map((s) => ({
      queryKey: ["extract", s.url],
      queryFn: () =>
        jsonFetch<ExtractPayload>(
          `/api/anime/extract?url=${encodeURIComponent(s.url)}`,
        ),
      retry: 0,
      staleTime: 5 * 60_000,
    })),
  });

  const probing = probes.some((p) => p.isLoading);
  const available = useMemo(
    () =>
      langFiltered
        .map((s, i) => ({ s, probe: probes[i] }))
        .filter(({ probe }) => probe.data?.found && !!probe.data.source?.url),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [langFiltered, probes.map((p) => p.dataUpdatedAt).join("|")],
  );

  // In VPA mode we restrict to verified servers. In embed mode, fall back to
  // the full lang-filtered list (iframe playback can't be probed reliably).
  const filtered: EmbedServer[] =
    mode === "vpa" ? available.map((a) => a.s) : langFiltered;

  const [serverIdx, setServerIdx] = useState(0);
  const current: EmbedServer | undefined = filtered[serverIdx];

  // Reset when episode / lang / mode / available-set changes
  useEffect(() => {
    setServerIdx(0);
  }, [lang, id, epNum, mode, filtered.length]);

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
  const vpaLoading =
    mode === "vpa" && (probing || extract.isLoading) && !vpaSource;
  const vpaFailedAll =
    mode === "vpa" && !probing && available.length === 0;

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
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t("watch.back_to")} {title || t("watch.anime")}
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
                    {t("watch.extracting")} {current?.name ?? t("watch.server")}…
                  </span>
                  <span className="text-xs opacity-60">
                    {t("watch.trying_server")} {serverIdx + 1} / {filtered.length}
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
                      <p className="font-semibold">{t("watch.no_direct")}</p>
                      <p className="mt-1 text-xs">
                        {t("watch.all_tried", { n: filtered.length })}{" "}
                        <button
                          onClick={() => setMode("embed")}
                          className="underline hover:text-primary"
                        >
                          {t("watch.embed_mode")}
                        </button>{" "}
                        {t("watch.to_try_iframe")}
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
                      <Loader2 className="me-2 h-6 w-6 animate-spin" />
                      <span>{t("watch.loading")} {current.name}…</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <div className="max-w-md px-4 text-center">
                    <AlertCircle className="mx-auto mb-2 h-10 w-10 opacity-50" />
                    <p className="font-semibold">{t("watch.no_server")}</p>
                  </div>
                </div>
              )}
            </div>

            <h1 className="mt-4 font-display text-3xl md:text-4xl">{title}</h1>
            <p className="mt-1 text-lg text-muted-foreground">{t("watch.episode")} {epNum}</p>

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
                {t("watch.direct")}
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
                {t("watch.embed")}
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
                <RefreshCw className="h-3 w-3" /> {t("watch.reload")}
              </button>
            </div>

            {/* Servers grid */}
            <div className="mt-4">
              <p className="mb-2 flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <span>
                  {t("watch.servers")} — {lang.toUpperCase()} ({filtered.length}
                  {mode === "vpa" ? ` / ${langFiltered.length}` : ""})
                </span>
                {mode === "vpa" && probing ? (
                  <span className="inline-flex items-center gap-1 normal-case text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t("watch.checking") ?? "Checking servers…"}
                  </span>
                ) : null}
                {mode === "vpa" && !probing && available.length > 0 ? (
                  <span className="inline-flex items-center gap-1 normal-case text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    {available.length} {t("watch.available") ?? "available"}
                  </span>
                ) : null}
              </p>
              {mode === "vpa" && !probing && filtered.length === 0 ? (
                <p className="rounded-md border border-border bg-surface/40 p-3 text-xs text-muted-foreground">
                  {t("watch.none_have_episode") ??
                    "No server has this episode available. Try switching language or Embed mode."}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {filtered.map((s, i) => {
                    const active = i === serverIdx;
                    return (
                      <button
                        key={s.name}
                        onClick={() => setServerIdx(i)}
                        className={`inline-flex items-center justify-center gap-1 truncate rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-surface hover:bg-surface-elevated"
                        }`}
                      >
                        {mode === "vpa" ? (
                          <CheckCircle2 className="h-3 w-3 shrink-0 opacity-80" />
                        ) : null}
                        <span className="truncate">{s.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {mode === "vpa" ? t("watch.vpa_hint") : t("watch.embed_hint")}
              </p>
            </div>
          </div>

          <aside className="rounded-xl border border-border bg-surface/50 p-4">
            <h2 className="mb-3 font-display text-xl">{t("watch.episodes_title")}</h2>
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
