import { ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Anime } from "@/lib/jikan";
import { AnimeCard } from "./AnimeCard";
import { useI18n } from "@/lib/i18n";

interface Props {
  title: string;
  items: Anime[];
  viewAllTo?: string;
}

export function AnimeRow({ title, items }: Props) {
  const { t } = useI18n();
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
          {t("row.view_all")} <ChevronRight className="h-4 w-4 rtl:rotate-180" />
        </Link>
      </div>
      <div className="scrollbar-hide flex gap-4 overflow-x-auto px-4 pb-4 md:px-8">
        {items.map((a, i) => (
          <AnimeCard key={`${a.mal_id}-${i}`} anime={a} />
        ))}
      </div>
    </section>
  );
}
