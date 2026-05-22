import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Menu, X } from "lucide-react";
import { useState } from "react";
import { LanguageToggle, useI18n } from "@/lib/i18n";

export function Navbar() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useI18n();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate({ to: "/search", search: { q: q.trim() } });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-6 px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-display text-xl">
            A
          </div>
          <span className="font-display text-2xl tracking-wider text-gradient-primary">
            ANIROLL
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/">{t("nav.home")}</NavLink>
          <NavLink to="/browse">{t("nav.browse")}</NavLink>
          <NavLink to="/genres">{t("nav.genres")}</NavLink>
        </nav>

        <form onSubmit={onSubmit} className="ms-auto flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("nav.search_placeholder")}
              className="w-full rounded-full border border-border bg-surface py-2 ps-10 pe-4 text-sm outline-none transition-colors focus:border-primary"
            />
          </div>
        </form>

        <LanguageToggle className="hidden md:flex" />

        <button
          className="ms-auto md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={t("nav.menu")}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-border bg-background px-4 py-4 md:hidden">
          <form onSubmit={onSubmit} className="mb-4">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("nav.search_placeholder")}
                className="w-full rounded-full border border-border bg-surface py-2 ps-10 pe-4 text-sm outline-none focus:border-primary"
              />
            </div>
          </form>
          <div className="mb-3 flex justify-end">
            <LanguageToggle />
          </div>
          <div className="flex flex-col gap-1" onClick={() => setOpen(false)}>
            <NavLink to="/">{t("nav.home")}</NavLink>
            <NavLink to="/browse">{t("nav.browse")}</NavLink>
            <NavLink to="/genres">{t("nav.genres")}</NavLink>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: to === "/" }}
      className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-foreground [&.active]:text-primary"
    >
      {children}
    </Link>
  );
}
