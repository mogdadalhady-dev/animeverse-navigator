import { Link } from "@tanstack/react-router";
import { Play, Info, Star } from "lucide-react";
import type { Anime } from "@/lib/jikan";

export function Hero({ anime }: { anime: Anime }) {
  const img =
    anime.images?.webp?.large_image_url ?? anime.images?.jpg?.large_image_url;
  const title = anime.title_english || anime.title;

  return (
    <section className="relative h-[70vh] min-h-[500px] w-full overflow-hidden">
      {img ? (
        <img
          src={img}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover object-top blur-sm scale-110 opacity-50"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />

      <div className="relative z-10 mx-auto flex h-full max-w-[1600px] items-end px-4 pb-16 md:items-center md:px-8">
        <div className="grid items-center gap-8 md:grid-cols-[1fr_320px]">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Featured Anime
            </div>
            <h1 className="font-display text-5xl leading-none md:text-7xl">
              {title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {anime.score ? (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <strong className="text-foreground">{anime.score}</strong>
                </span>
              ) : null}
              {anime.year ? <span>{anime.year}</span> : null}
              {anime.episodes ? <span>{anime.episodes} episodes</span> : null}
              {anime.rating ? <span>{anime.rating}</span> : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {anime.genres?.slice(0, 4).map((g) => (
                <span
                  key={g.mal_id}
                  className="rounded-full bg-surface px-3 py-1 text-xs"
                >
                  {g.name}
                </span>
              ))}
            </div>
            <p className="mt-5 line-clamp-3 text-base text-muted-foreground md:text-lg">
              {anime.synopsis}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/anime/$id"
                params={{ id: String(anime.mal_id) }}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
              >
                <Play className="h-5 w-5 fill-current" /> Watch Now
              </Link>
              <Link
                to="/anime/$id"
                params={{ id: String(anime.mal_id) }}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-6 py-3 font-semibold backdrop-blur transition-colors hover:bg-surface-elevated"
              >
                <Info className="h-5 w-5" /> More Info
              </Link>
            </div>
          </div>
          <div className="hidden md:block">
            {img ? (
              <img
                src={img}
                alt={title}
                className="aspect-[2/3] w-full rounded-2xl object-cover shadow-glow"
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
