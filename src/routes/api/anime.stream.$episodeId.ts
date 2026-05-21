// Server route: GET /api/anime/stream/:episodeId?provider=gogoanime
// Returns streaming sources with URLs rewritten through our /api/anime/proxy
// so the browser never hits a CORS / Referer-restricted origin directly.
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

function proxify(rawUrl: string, referer?: string, origin?: string) {
  const u = new URL("/api/anime/proxy", "http://x");
  u.searchParams.set("url", rawUrl);
  if (referer) u.searchParams.set("ref", referer);
  if (origin) u.searchParams.set("origin", origin);
  return u.pathname + "?" + u.searchParams.toString();
}

export const Route = createFileRoute("/api/anime/stream/$episodeId")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const provider = url.searchParams.get("provider") || "gogoanime";
        const server = url.searchParams.get("server") || "";
        const qs = server ? `?server=${encodeURIComponent(server)}` : "";
        try {
          const data = await tryFetch<any>(
            `/anime/${provider}/watch/${encodeURIComponent(params.episodeId)}${qs}`,
          );
          const ref =
            data?.headers?.Referer ||
            data?.headers?.referer ||
            (provider === "gogoanime" ? "https://gogoanime.fi/" : undefined);
          const origin = ref ? new URL(ref).origin : undefined;
          const sources = (data?.sources || []).map((s: any) => ({
            url: proxify(s.url, ref, origin),
            quality: s.quality,
            isM3U8: s.isM3U8 ?? /\.m3u8/i.test(s.url),
          }));
          const subtitles = (data?.subtitles || []).map((s: any) => ({
            url: proxify(s.url, ref, origin),
            lang: s.lang,
          }));
          return new Response(
            JSON.stringify({ sources, subtitles, provider }),
            { headers: { "Content-Type": "application/json", ...CORS } },
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
