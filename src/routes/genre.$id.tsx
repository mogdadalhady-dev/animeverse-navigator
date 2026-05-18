import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AnimeCard } from "@/components/AnimeCard";
import { jikan } from "@/lib/jikan";

export const Route = createFileRoute("/genre/$id")({
  component: GenrePage,
});

function GenrePage() {
  const { id } = Route.useParams();
  const genres = useQuery({ queryKey: ["genres"], queryFn: () => jikan.genres() });
  const items = useQuery({
    queryKey: ["genre", id],
    queryFn: () => jikan.byGenre(Number(id)),
  });

  const name = genres.data?.data?.find((g) => g.mal_id === Number(id))?.name ?? "Genre";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-8">
        <h1 className="font-display text-4xl md:text-5xl">
          <span className="text-primary">{name}</span> Anime
        </h1>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.isLoading
            ? Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] animate-pulse rounded-lg bg-surface" />
              ))
            : items.data?.data?.map((a, i) => (
                <div key={`${a.mal_id}-${i}`} className="w-full">
                  <AnimeCard anime={a} />
                </div>
              ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
