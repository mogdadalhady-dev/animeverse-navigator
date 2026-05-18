import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AnimeCard } from "@/components/AnimeCard";
import { jikan } from "@/lib/jikan";

const searchSchema = z.object({ q: z.string().optional().default("") });

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const { data, isLoading } = useQuery({
    queryKey: ["search", q],
    queryFn: () => jikan.search(q),
    enabled: q.length > 0,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-8">
        <h1 className="font-display text-4xl md:text-5xl">
          {q ? <>Results for "<span className="text-primary">{q}</span>"</> : "Search anime"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {q ? `${data?.data?.length ?? 0} results` : "Use the search bar above to find your favorite anime."}
        </p>

        {isLoading ? (
          <Grid skeleton />
        ) : data?.data?.length ? (
          <Grid items={data.data} />
        ) : q ? (
          <p className="mt-10 text-center text-muted-foreground">No results found.</p>
        ) : null}
      </div>
      <Footer />
    </div>
  );
}

function Grid({ items, skeleton }: { items?: any[]; skeleton?: boolean }) {
  if (skeleton) {
    return (
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] animate-pulse rounded-lg bg-surface" />
        ))}
      </div>
    );
  }
  return (
    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {items?.map((a, i) => (
        <div key={`${a.mal_id}-${i}`} className="w-full">
          <AnimeCard anime={a} size="md" />
        </div>
      ))}
    </div>
  );
}
