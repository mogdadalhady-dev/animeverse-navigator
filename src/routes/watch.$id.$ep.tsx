import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Play, AlertCircle, Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { VideoPlayer } from "@/components/VideoPlayer";
import { jikan } from "@/lib/jikan";
import { consumet, pickTitle, type Provider } from "@/lib/consumet";
import { useState } from "react";

export const Route = createFileRoute("/watch/$id/$ep")({
  component: WatchPage,
});

function WatchPage() {
  const { id, ep } = Route.useParams();
  const epNum = Number(ep) || 1;
  const [provider, setProvider] = useState<Provider>("gogoanime");

  // 1. Anime info from Jikan (MAL)
  const anime = useQuery({ queryKey: ["anime", id], queryFn: () => jikan.byId(id) });
  const a = anime.data?.data;
  const title = a?.title_english || a?.title || "";

  // 2. Map MAL → Consumet provider by title
  const mapping = useQuery({
    enabled: !!title,
    queryKey: ["consumet-map", title, provider],
    queryFn: () =>
      consumet.findByTitle(title, {
        provider,
        year: a?.year ?? null,
        totalEpisodes: a?.episodes ?? null,
      }),
  });

  // 3. Fetch episode list for the matched anime
  const info = useQuery({
    enabled: !!mapping.data?.id,
    queryKey: ["consumet-info", mapping.data?.id, provider],
    queryFn: () => consumet.info(mapping.data!.id, provider),
  });

  const episodes = info.data?.episodes ?? [];
  const currentEp = episodes.find((e) => e.number === epNum) ?? episodes[epNum - 1];

  // 4. Fetch streaming sources for the episode
  const stream = useQuery({
    enabled: !!currentEp?.id,
    queryKey: ["consumet-watch", currentEp?.id, provider],
    queryFn: () => consumet.watch(currentEp!.id, provider),
  });

  const bestSource =
    stream.data?.sources?.find((s) => s.quality === "1080p") ||
    stream.data?.sources?.find((s) => s.quality === "720p") ||
    stream.data?.sources?.[0];

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
              {stream.isLoading || mapping.isLoading || info.isLoading ? (
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
              ) : a?.trailer?.youtube_id ? (
                <iframe
                  src={`https://www.youtube.com/embed/${a.trailer.youtube_id}`}
                  title="Trailer"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <div className="max-w-md text-center px-4">
                    <AlertCircle className="mx-auto mb-2 h-10 w-10 opacity-50" />
                    <p className="font-semibold">Stream not available</p>
                    <p className="mt-1 text-xs">
                      Couldn't map this anime to the {provider} provider. Try another server below.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <h1 className="mt-4 font-display text-3xl md:text-4xl">{title}</h1>
            <p className="mt-1 text-lg text-muted-foreground">
              Episode {epNum}
              {currentEp?.title ? ` — ${currentEp.title}` : ""}
            </p>

            {/* Provider switcher */}
            <div className="mt-4">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Server</p>
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
                <p className="mt-2 text-xs text-destructive">No match on this provider.</p>
              ) : null}
            </div>

            {/* Quality selector */}
            {stream.data?.sources?.length ? (
              <div className="mt-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                  Quality (auto)
                </p>
                <div className="flex flex-wrap gap-2">
                  {stream.data.sources
                    .filter((s) => s.quality && s.quality !== "default")
                    .map((s, i) => (
                      <span
                        key={`${s.url}-${i}`}
                        className="rounded-md bg-surface px-2.5 py-1 text-xs"
                      >
                        {s.quality}
                      </span>
                    ))}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="rounded-xl border border-border bg-surface/50 p-4">
            <h2 className="mb-3 font-display text-xl">
              Episodes {totalFromMap ? `(${totalFromMap})` : ""}
            </h2>
            <div className="grid max-h-[600px] grid-cols-4 gap-2 overflow-y-auto lg:grid-cols-3">
              {Array.from({ length: totalEpisodes }).map((_, i) => {
                const n = i + 1;
                const active = n === epNum;
                const available = totalFromMap === 0 || !!episodes.find((e) => e.number === n);
                return (
                  <Link
                    key={n}
                    to="/watch/$id/$ep"
                    params={{ id, ep: String(n) }}
                    className={`relative rounded-md px-2 py-3 text-center text-sm font-semibold transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : available
                        ? "bg-background hover:bg-surface-elevated"
                        : "bg-background/50 text-muted-foreground/50"
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
