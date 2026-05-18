import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { jikan } from "@/lib/jikan";

export const Route = createFileRoute("/genres")({
  component: GenresPage,
});

function GenresPage() {
  const { data, isLoading } = useQuery({ queryKey: ["genres"], queryFn: () => jikan.genres() });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-8">
        <h1 className="font-display text-4xl md:text-5xl">Genres</h1>
        <p className="mt-2 text-muted-foreground">Pick a genre to explore.</p>

        {isLoading ? (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-surface" />
            ))}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {data?.data?.map((g) => (
              <Link
                key={g.mal_id}
                to="/genre/$id"
                params={{ id: String(g.mal_id) }}
                className="group relative flex h-20 items-center justify-between overflow-hidden rounded-lg border border-border bg-surface px-5 transition-all hover:border-primary hover:bg-surface-elevated"
              >
                <span className="font-display text-xl tracking-wide transition-colors group-hover:text-primary">
                  {g.name}
                </span>
                <span className="text-xs text-muted-foreground">{g.count}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
