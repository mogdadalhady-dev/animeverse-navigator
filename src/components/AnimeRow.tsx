import { ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Anime } from "@/lib/jikan";
import { AnimeCard } from "./AnimeCard";

interface Props {
  title: string;
  items: Anime[];
  viewAllTo?: string;
}

export function AnimeRow({ title, items }: Props) {
  if (!items?.length) return null;
  return (
    <section className="py-6">
      <div className="mb-3 flex items-end justify-between px-4 md:px-8">
        <h2 className="text-2xl md:text-3xl font-display tracking-wide">
          {title}
        </h2>
        <Link
          to="/browse"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          View all <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="scrollbar-hide flex gap-4 overflow-x-auto px-4 pb-4 md:px-8">
        {items.map((a) => (
          <AnimeCard key={a.mal_id} anime={a} />
        ))}
      </div>
    </section>
  );
}
