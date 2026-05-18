import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star, Play, Calendar, Clock, Tv } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AnimeCard } from "@/components/AnimeCard";
import { jikan } from "@/lib/jikan";

export const Route = createFileRoute("/anime/$id")({
  component: AnimePage,
});

function AnimePage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["anime", id],
    queryFn: () => jikan.byId(id),
  });
  const recs = useQuery({
    queryKey: ["recs", id],
    queryFn: () => jikan.recommendations(id),
  });

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="h-[60vh] animate-pulse bg-surface" />
      </div>
    );
  }

  const a = data.data;
  const img = a.images?.webp?.large_image_url ?? a.images?.jpg?.large_image_url;
  const title = a.title_english || a.title;
  const trailerId = a.trailer?.youtube_id;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="relative h-[50vh] min-h-[400px] w-full overflow-hidden">
        {img ? (
          <img src={img} alt={title} className="absolute inset-0 h-full w-full object-cover blur-xl scale-110 opacity-40" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/30" />
      </div>

      <div className="relative z-10 mx-auto -mt-48 max-w-[1400px] px-4 md:px-8">
        <div className="grid gap-8 md:grid-cols-[280px_1fr]">
          <div>
            {img ? (
              <img src={img} alt={title} className="aspect-[2/3] w-full rounded-xl object-cover shadow-glow" />
            ) : null}
            <Link
              to="/watch/$id/$ep"
              params={{ id, ep: "1" }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
            >
              <Play className="h-5 w-5 fill-current" /> Watch Episode 1
            </Link>
          </div>

          <div>
            <h1 className="font-display text-4xl md:text-6xl">{title}</h1>
            {a.title_english && a.title !== a.title_english ? (
              <p className="mt-1 text-muted-foreground">{a.title}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              {a.score ? (
                <span className="flex items-center gap-1.5 rounded-md bg-surface px-3 py-1.5">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <strong>{a.score}</strong>
                  <span className="text-muted-foreground">/ 10</span>
                </span>
              ) : null}
              {a.type ? <Pill icon={<Tv className="h-3.5 w-3.5" />}>{a.type}</Pill> : null}
              {a.episodes ? <Pill>{a.episodes} eps</Pill> : null}
              {a.year ? <Pill icon={<Calendar className="h-3.5 w-3.5" />}>{a.year}</Pill> : null}
              {a.duration ? <Pill icon={<Clock className="h-3.5 w-3.5" />}>{a.duration}</Pill> : null}
              {a.status ? <Pill>{a.status}</Pill> : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {a.genres?.map((g) => (
                <Link
                  key={g.mal_id}
                  to="/genre/$id"
                  params={{ id: String(g.mal_id) }}
                  className="rounded-full border border-border bg-surface px-3 py-1 text-xs hover:border-primary hover:text-primary"
                >
                  {g.name}
                </Link>
              ))}
            </div>

            <h2 className="mt-8 mb-2 font-display text-2xl">Synopsis</h2>
            <p className="leading-relaxed text-muted-foreground">{a.synopsis || "No synopsis available."}</p>

            {a.studios?.length ? (
              <p className="mt-4 text-sm text-muted-foreground">
                <span className="text-foreground font-semibold">Studio:</span>{" "}
                {a.studios.map((s) => s.name).join(", ")}
              </p>
            ) : null}
          </div>
        </div>

        {trailerId ? (
          <section className="mt-12">
            <h2 className="mb-4 font-display text-3xl">Trailer</h2>
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-surface">
              <iframe
                src={`https://www.youtube.com/embed/${trailerId}`}
                title="Trailer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </section>
        ) : null}

        {recs.data?.data?.length ? (
          <section className="mt-12 mb-12">
            <h2 className="mb-4 font-display text-3xl">You may also like</h2>
            <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-4">
              {recs.data.data.slice(0, 12).map((r, i) => (
                <AnimeCard key={`${r.entry.mal_id}-${i}`} anime={r.entry} />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <Footer />
    </div>
  );
}

function Pill({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-surface px-3 py-1.5 text-sm">
      {icon}
      {children}
    </span>
  );
}
