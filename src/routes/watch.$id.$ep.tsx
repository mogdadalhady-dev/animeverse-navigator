import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Play } from "lucide-react";
import { z } from "zod";
import { Navbar } from "@/components/Navbar";
import { jikan } from "@/lib/jikan";

export const Route = createFileRoute("/watch/$id/$ep")({
  component: WatchPage,
});

function WatchPage() {
  const { id, ep } = Route.useParams();
  const { data } = useQuery({ queryKey: ["anime", id], queryFn: () => jikan.byId(id) });
  const a = data?.data;
  const title = a?.title_english || a?.title || "Loading...";
  const total = a?.episodes ?? 12;
  const epNum = Number(ep) || 1;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
        <Link to="/anime/$id" params={{ id }} className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to {title}
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
              {a?.trailer?.youtube_id ? (
                <iframe
                  src={`https://www.youtube.com/embed/${a.trailer.youtube_id}`}
                  title="Player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Play className="mx-auto mb-2 h-12 w-12 opacity-50" />
                    <p>Video source not available in demo.</p>
                    <p className="text-xs mt-1">Connect a streaming provider to enable playback.</p>
                  </div>
                </div>
              )}
            </div>

            <h1 className="mt-4 font-display text-3xl md:text-4xl">{title}</h1>
            <p className="mt-1 text-lg text-muted-foreground">Episode {epNum}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-md bg-surface px-3 py-1.5 text-sm">Server 1</span>
              <span className="rounded-md bg-surface px-3 py-1.5 text-sm opacity-50">Server 2</span>
              <span className="rounded-md bg-surface px-3 py-1.5 text-sm opacity-50">Server 3</span>
            </div>
          </div>

          <aside className="rounded-xl border border-border bg-surface/50 p-4">
            <h2 className="mb-3 font-display text-xl">Episodes</h2>
            <div className="grid max-h-[600px] grid-cols-4 gap-2 overflow-y-auto lg:grid-cols-3">
              {Array.from({ length: total }).map((_, i) => {
                const n = i + 1;
                const active = n === epNum;
                return (
                  <Link
                    key={n}
                    to="/watch/$id/$ep"
                    params={{ id, ep: String(n) }}
                    className={`rounded-md px-2 py-3 text-center text-sm font-semibold transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-background hover:bg-surface-elevated"
                    }`}
                  >
                    {n}
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
