// Server route: GET /api/anime/episodes/:id
// Maps a MAL id → Consumet anime, returns episode list (no CORS).
import { createFileRoute } from "@tanstack/react-router";

const BASES = [
  "https://consumet-api-puce.vercel.app",
  "https://api.consumet.org",
  "https://consumet-api-h1ga.onrender.com",
  "https://anime-api-eight.vercel.app",
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function tryFetch<T>(path: string, timeoutMs = 8000): Promise<T> {
  let lastErr: unknown = null;
  for (const base of BASES) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const r = await fetch(`${base}${path}`, { signal: ctrl.signal });
      clearTimeout(t);
      if (!r.ok) {
        lastErr = new Error(`${base} ${r.status}`);
        continue;
      }
      return (await r.json()) as T;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("All sources failed");
}

function titleOf(t: any): string {
  if (!t) return "";
  if (typeof t === "string") return t;
  return t.english || t.romaji || t.native || "";
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function findMatch(query: string, provider: string) {
  const data = await tryFetch<{ results: any[] }>(
    `/anime/${provider}/${encodeURIComponent(query)}`,
  ).catch(() => ({ results: [] }));
  if (!data.results?.length) return null;
  const target = norm(query);
  const ranked = data.results
    .map((r) => {
      const t = norm(titleOf(r.title));
      let score = 0;
      if (t === target) score += 100;
      else if (t.startsWith(target) || target.startsWith(t)) score += 50;
      else if (t.includes(target) || target.includes(t)) score += 20;
      if (r.subOrDub === "sub") score += 5;
      return { r, score };
    })
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.r ?? null;
}

export const Route = createFileRoute("/api/anime/episodes/$id")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const provider = url.searchParams.get("provider") || "gogoanime";
        const title = url.searchParams.get("title") || "";
        try {
          // Try Jikan first if no title supplied
          let q = title;
          if (!q) {
            const j = await fetch(`https://api.jikan.moe/v4/anime/${params.id}`).then((r) => r.json());
            q = j?.data?.title_english || j?.data?.title || "";
          }
          if (!q) {
            return new Response(
              JSON.stringify({ error: "No title" }),
              { status: 404, headers: { "Content-Type": "application/json", ...CORS } },
            );
          }
          const match = await findMatch(q, provider);
          if (!match) {
            return new Response(
              JSON.stringify({ error: "No match", title: q, provider }),
              { status: 404, headers: { "Content-Type": "application/json", ...CORS } },
            );
          }
          const info = await tryFetch<any>(
            `/anime/${provider}/info/${encodeURIComponent(match.id)}`,
          );
          return new Response(
            JSON.stringify({
              animeId: match.id,
              title: titleOf(info.title || match.title),
              provider,
              episodes: info.episodes || [],
              totalEpisodes: info.totalEpisodes || info.episodes?.length || 0,
            }),
            { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=600", ...CORS } },
          );
        } catch (e: any) {
          return new Response(
            JSON.stringify({ error: String(e?.message ?? e) }),
            { status: 502, headers: { "Content-Type": "application/json", ...CORS } },
          );
        }
      },
    },
  },
});
