import { Link } from "@tanstack/react-router";
import { Star, Play } from "lucide-react";
import type { Anime } from "@/lib/jikan";
import { useI18n } from "@/lib/i18n";

interface Props {
  anime: Anime;
  size?: "sm" | "md" | "lg";
}

export function AnimeCard({ anime, size = "md" }: Props) {
  const { t } = useI18n();
  const img = anime.images?.webp?.large_image_url ?? anime.images?.jpg?.large_image_url;
  const title = anime.title_english || anime.title;

  const aspect = "aspect-[2/3]";
  const widths = {
    sm: "w-[140px]",
    md: "w-[180px] md:w-[200px]",
    lg: "w-[220px] md:w-[260px]",
  } as const;

  return (
    <Link
      to="/anime/$id"
      params={{ id: String(anime.mal_id) }}
      className={`group relative shrink-0 ${widths[size]}`}
    >
      <div
        className={`relative ${aspect} overflow-hidden rounded-lg bg-surface shadow-card`}
      >
        {img ? (
          <img
            src={img}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : null}

        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent opacity-60 transition-opacity group-hover:opacity-90" />

        {typeof anime.score === "number" && anime.score > 0 ? (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-xs font-semibold backdrop-blur">
            <Star className="h-3 w-3 fill-primary text-primary" />
            {anime.score.toFixed(1)}
          </div>
        ) : null}

        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow">
            <Play className="h-6 w-6 fill-current" />
          </div>
        </div>
      </div>

      <div className="mt-2 px-1">
        <h3 className="line-clamp-1 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
          {title}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {anime.type || "TV"}
          {anime.episodes ? ` • ${anime.episodes} ${t("card.ep")}` : ""}
          {anime.year ? ` • ${anime.year}` : ""}
        </p>
      </div>
    </Link>
  );
}
