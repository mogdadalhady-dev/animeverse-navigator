import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { AnimeRow } from "@/components/AnimeRow";
import { jikan } from "@/lib/jikan";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const trending = useQuery({ queryKey: ["trending"], queryFn: () => jikan.trending(24) });
  const top = useQuery({ queryKey: ["top"], queryFn: () => jikan.top(24) });
  const season = useQuery({ queryKey: ["season"], queryFn: () => jikan.seasonNow(24) });
  const upcoming = useQuery({ queryKey: ["upcoming"], queryFn: () => jikan.upcoming(12) });

  const featured = trending.data?.data?.[0];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        {featured ? (
          <Hero anime={featured} />
        ) : (
          <div className="h-[60vh] animate-pulse bg-surface" />
        )}
        <AnimeRow title="Trending Now" items={trending.data?.data ?? []} />
        <AnimeRow title="This Season" items={season.data?.data ?? []} />
        <AnimeRow title="Top Rated" items={top.data?.data ?? []} />
        <AnimeRow title="Upcoming" items={upcoming.data?.data ?? []} />
      </main>
      <Footer />
    </div>
  );
}
