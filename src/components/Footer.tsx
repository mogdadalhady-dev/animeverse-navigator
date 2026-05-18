export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-surface/50">
      <div className="mx-auto max-w-[1600px] px-4 py-10 md:px-8">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="font-display text-2xl text-gradient-primary">ANIROLL</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Stream your favorite anime. Powered by MyAnimeList (Jikan API).
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Aniroll — Demo project.
          </p>
        </div>
      </div>
    </footer>
  );
}
