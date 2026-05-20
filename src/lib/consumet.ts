// Multi-source anime streaming client with automatic fallback.
// Tries several public Consumet deployments + providers until one returns data.

const EXTRA = (import.meta as any).env?.VITE_CONSUMET_BASE as string | undefined;

// Public Consumet instances (community-hosted). We rotate through them.
const BASES: string[] = [
  ...(EXTRA ? [EXTRA] : []),
  "https://consumet-api-puce.vercel.app",
  "https://api.consumet.org",
  "https://consumet-api-h1ga.onrender.com",
  "https://anime-api-eight.vercel.app",
];

export type Provider = "gogoanime" | "zoro" | "animepahe" | "9anime";

export interface ConsumetSearchResult {
  id: string;
  title: string | { romaji?: string; english?: string; native?: string };
  image?: string;
  releaseDate?: string;
  subOrDub?: string;
}

export interface ConsumetEpisode {
  id: string;
  number: number;
  title?: string;
  url?: string;
  image?: string;
}

export interface ConsumetInfo {
  id: string;
  title: string | { romaji?: string; english?: string };
  image?: string;
  episodes: ConsumetEpisode[];
  totalEpisodes?: number;
}

export interface StreamSource {
  url: string;
  quality?: string;
  isM3U8?: boolean;
}

export interface StreamResponse {
  sources: StreamSource[];
  subtitles?: { url: string; lang: string }[];
  headers?: Record<string, string>;
}

async function tryFetch<T>(path: string, timeoutMs = 8000): Promise<T> {
  let lastErr: unknown = null;
  for (const base of BASES) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(`${base}${path}`, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) {
        lastErr = new Error(`${base} → ${res.status}`);
        continue;
      }
      const json = (await res.json()) as T;
      return json;
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  throw lastErr ?? new Error("All sources failed");
}

function titleString(t: ConsumetSearchResult["title"]): string {
  if (typeof t === "string") return t;
  return t?.english || t?.romaji || t?.native || "";
}

export const consumet = {
  async search(query: string, provider: Provider = "gogoanime") {
    const data = await tryFetch<{ results: ConsumetSearchResult[] }>(
      `/anime/${provider}/${encodeURIComponent(query)}`,
    );
    return data.results || [];
  },

  async info(id: string, provider: Provider = "gogoanime") {
    return tryFetch<ConsumetInfo>(
      `/anime/${provider}/info/${encodeURIComponent(id)}`,
    );
  },

  async watch(episodeId: string, provider: Provider = "gogoanime", server?: string) {
    const qs = server ? `?server=${server}` : "";
    return tryFetch<StreamResponse>(
      `/anime/${provider}/watch/${encodeURIComponent(episodeId)}${qs}`,
    );
  },

  /**
   * Find an anime on a given provider by title, picking the best match.
   */
  async findByTitle(
    title: string,
    opts: { provider?: Provider; year?: number | null; totalEpisodes?: number | null } = {},
  ) {
    const provider = opts.provider || "gogoanime";
    const results = await consumet.search(title, provider).catch(() => []);
    if (!results.length) return null;

    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const target = norm(title);
    const ranked = results
      .map((r) => {
        const t = norm(titleString(r.title));
        let score = 0;
        if (t === target) score += 100;
        else if (t.startsWith(target) || target.startsWith(t)) score += 50;
        else if (t.includes(target) || target.includes(t)) score += 20;
        if (r.subOrDub === "sub") score += 5;
        return { r, score };
      })
      .sort((a, b) => b.score - a.score);

    return ranked[0].r;
  },
};

export function pickTitle(t: ConsumetSearchResult["title"] | ConsumetInfo["title"]): string {
  if (!t) return "";
  if (typeof t === "string") return t;
  return (t as any).english || (t as any).romaji || (t as any).native || "";
}

// ---------------------------------------------------------------------------
// Secondary source: AllAnime via "AnimeAPI" style endpoints (fallback).
// Uses a public proxy that returns m3u8 links by MAL id.
// ---------------------------------------------------------------------------

export interface FallbackSource {
  url: string;
  quality?: string;
  isM3U8?: boolean;
  server?: string;
}

/**
 * Vidsrc-style embeds — work as iframe fallbacks when direct m3u8 fails.
 * These accept MAL id directly, no mapping needed.
 */
export function buildEmbedSources(malId: number | string, ep: number) {
  return [
    {
      name: "Vidsrc",
      url: `https://vidsrc.cc/v2/embed/anime/ani${malId}/${ep}/sub`,
    },
    {
      name: "Vidsrc (Dub)",
      url: `https://vidsrc.cc/v2/embed/anime/ani${malId}/${ep}/dub`,
    },
    {
      name: "2Anime",
      url: `https://2anime.xyz/embed/${encodeURIComponent(String(malId))}-episode-${ep}`,
    },
    {
      name: "AnimeOwl",
      url: `https://animeowl.net/embed/${malId}/${ep}`,
    },
  ];
}
