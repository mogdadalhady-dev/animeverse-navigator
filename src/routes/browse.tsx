import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AnimeCard } from "@/components/AnimeCard";
import { jikan } from "@/lib/jikan";

export const Route = createFileRoute("/browse")({
  component: BrowsePage,
});

function BrowsePage() {
  const top = useQuery({ queryKey: ["browse-top"], queryFn: () => jikan.top(24) });
  const popular = useQuery({ queryKey: ["browse-popular"], queryFn: () => jikan.popular(24) });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-8">
        <h1 className="font-display text-4xl md:text-5xl">Browse Anime</h1>
        <p className="mt-2 text-muted-foreground">Explore top-rated and most popular series.</p>

        <Section title="Top Rated" items={top.data?.data} />
        <Section title="Most Popular" items={popular.data?.data} />
      </div>
      <Footer />
    </div>
  );
}

function Section({ title, items }: { title: string; items?: any[] }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 font-display text-2xl">{title}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {items?.map((a) => (
          <div key={a.mal_id} className="w-full">
            <AnimeCard anime={a} />
          </div>
        )) ??
          Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] animate-pulse rounded-lg bg-surface" />
          ))}
      </div>
    </section>
  );
}
