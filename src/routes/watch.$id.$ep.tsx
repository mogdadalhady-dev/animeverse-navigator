import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Play, AlertCircle, Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { VideoPlayer } from "@/components/VideoPlayer";
import { jikan } from "@/lib/jikan";
import { consumet, pickTitle, buildEmbedSources, type Provider } from "@/lib/consumet";
import { useState } from "react";

export const Route = createFileRoute("/watch/$id/$ep")({
  component: WatchPage,
});

type SourceMode = "direct" | string; // "direct" = consumet m3u8, else embed name

function WatchPage() {
  const { id, ep } = Route.useParams();
  const epNum = Number(ep) || 1;
  const [provider, setProvider] = useState<Provider>("gogoanime");
  const embeds = buildEmbedSources(id, epNum);
  // Default to our custom HLS player
  const [mode, setMode] = useState<SourceMode>("direct");

  // 1. Anime info from Jikan (MAL)
  const anime = useQuery({ queryKey: ["anime", id], queryFn: () => jikan.byId(id) });
  const a = anime.data?.data;
  const title = a?.title_english || a?.title || "";

  // 2. Map MAL → Consumet provider by title (only when direct mode is selected)
  const mapping = useQuery({
    enabled: !!title && mode === "direct",
    queryKey: ["consumet-map", title, provider],
    queryFn: () =>
      consumet.findByTitle(title, {
        provider,
        year: a?.year ?? null,
        totalEpisodes: a?.episodes ?? null,
      }),
    retry: 1,
  });

  // 3. Fetch episode list for the matched anime
  const info = useQuery({
    enabled: !!mapping.data?.id && mode === "direct",
    queryKey: ["consumet-info", mapping.data?.id, provider],
    queryFn: () => consumet.info(mapping.data!.id, provider),
    retry: 1,
  });

  const episodes = info.data?.episodes ?? [];
  const currentEp = episodes.find((e) => e.number === epNum) ?? episodes[epNum - 1];

  // 4. Fetch streaming sources for the episode
  const stream = useQuery({
    enabled: !!currentEp?.id && mode === "direct",
    queryKey: ["consumet-watch", currentEp?.id, provider],
    queryFn: () => consumet.watch(currentEp!.id, provider),
    retry: 1,
  });

  const bestSource =
    stream.data?.sources?.find((s) => s.quality === "1080p") ||
    stream.data?.sources?.find((s) => s.quality === "720p") ||
    stream.data?.sources?.[0];

  const currentEmbed = embeds.find((e) => e.name === mode);
  const directLoading = mode === "direct" && (stream.isLoading || mapping.isLoading || info.isLoading);
  const directFailed =
    mode === "direct" &&
    !directLoading &&
    (!bestSource?.url || mapping.isError || info.isError || stream.isError);

  const totalFromMap = episodes.length;
  const totalEpisodes = totalFromMap || a?.episodes || 12;

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
              {currentEmbed ? (
                <iframe
                  key={currentEmbed.url}
                  src={currentEmbed.url}
                  title={currentEmbed.name}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                  className="h-full w-full"
                />
              ) : directLoading ? (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                  <span>Loading stream…</span>
                </div>
              ) : bestSource?.url ? (
                <VideoPlayer
                  src={bestSource.url}
                  isM3U8={bestSource.isM3U8}
                  poster={a?.images?.webp?.large_image_url}
                />
              ) : directFailed && a?.trailer?.youtube_id ? (
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
                    <p className="font-semibold">Stream not available</p>
                    <p className="mt-1 text-xs">Try switching to another server below.</p>
                  </div>
                </div>
              )}
            </div>

            <h1 className="mt-4 font-display text-3xl md:text-4xl">{title}</h1>
            <p className="mt-1 text-lg text-muted-foreground">
              Episode {epNum}
              {currentEp?.title ? ` — ${currentEp.title}` : ""}
            </p>

            {/* Source switcher: embeds + direct */}
            <div className="mt-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Servers</p>
              <div className="flex flex-wrap gap-2">
                {embeds.map((e) => {
                  const active = mode === e.name;
                  return (
                    <button
                      key={e.name}
                      onClick={() => setMode(e.name)}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface hover:bg-surface-elevated"
                      }`}
                    >
                      {e.name}
                    </button>
                  );
                })}
                <button
                  onClick={() => setMode("direct")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    mode === "direct"
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface hover:bg-surface-elevated"
                  }`}
                >
                  Direct (HLS)
                </button>
              </div>
            </div>

            {/* Provider switcher — only relevant in direct mode */}
            {mode === "direct" && (
              <div className="mt-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                  Direct provider
                </p>
                <div className="flex flex-wrap gap-2">
                  {(["gogoanime", "zoro"] as Provider[]).map((p) => {
                    const active = p === provider;
                    return (
                      <button
                        key={p}
                        onClick={() => setProvider(p)}
                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-surface hover:bg-surface-elevated"
                        }`}
                      >
                        {p === "gogoanime" ? "GogoAnime" : "Zoro"}
                      </button>
                    );
                  })}
                </div>
                {mapping.data ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Matched: {pickTitle(mapping.data.title)}
                  </p>
                ) : mapping.isFetched && !mapping.isLoading ? (
                  <p className="mt-2 text-xs text-destructive">
                    No match on this provider. Try another server above.
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <aside className="rounded-xl border border-border bg-surface/50 p-4">
            <h2 className="mb-3 font-display text-xl">
              Episodes {totalFromMap ? `(${totalFromMap})` : ""}
            </h2>
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
