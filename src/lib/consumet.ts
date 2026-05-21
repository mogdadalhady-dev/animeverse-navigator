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
 * Curated anime embed servers (MAL-id based). Compiled from popular
 * GitHub aggregators (consumet/anime-api, miruro-official, aniyomi lists).
 * All accept the MyAnimeList id directly — no provider mapping needed,
 * which avoids the "server address not found" failures we hit before.
 *
 * Each entry has `lang` (sub / dub / multi) and `kind` so the UI can group
 * them. iframes are sandboxed at render time with permissive flags so they
 * still play but cannot navigate the parent window.
 */
export type EmbedServer = {
  name: string;
  url: string;
  lang: "sub" | "dub" | "multi";
};

export function buildEmbedSources(
  malId: number | string,
  ep: number,
): EmbedServer[] {
  const id = String(malId);
  const e = ep;
  return [
    // ---- Vidsrc family (very reliable, multi-quality) ----
    { name: "Vidsrc",        url: `https://vidsrc.cc/v2/embed/anime/ani${id}/${e}/sub`, lang: "sub" },
    { name: "Vidsrc Dub",    url: `https://vidsrc.cc/v2/embed/anime/ani${id}/${e}/dub`, lang: "dub" },
    { name: "Vidsrc Pro",    url: `https://vidsrcpro.com/embed/anime/${id}/${e}/sub`,    lang: "sub" },

    // ---- VidLink (clean, supports auto-next) ----
    { name: "VidLink",       url: `https://vidlink.pro/anime/${id}/${e}/sub`, lang: "sub" },
    { name: "VidLink Dub",   url: `https://vidlink.pro/anime/${id}/${e}/dub`, lang: "dub" },

    // ---- MegaPlay (Zoro mirror) ----
    { name: "MegaPlay",      url: `https://megaplay.buzz/stream/s-2/${id}/${e}/sub`, lang: "sub" },
    { name: "MegaPlay Dub",  url: `https://megaplay.buzz/stream/s-2/${id}/${e}/dub`, lang: "dub" },

    // ---- 2Embed (large catalog) ----
    { name: "2Embed",        url: `https://www.2embed.cc/embed/anime/${id}/${e}`, lang: "multi" },
    { name: "2Embed Org",    url: `https://2embed.org/embed/anime/${id}/${e}`,    lang: "multi" },

    // ---- 2Anime (legacy but widely cached) ----
    { name: "2Anime",        url: `https://2anime.xyz/embed/${id}-episode-${e}`, lang: "sub" },

    // ---- Anime Pahe / HiAnime style mirrors ----
    { name: "HiAnime",       url: `https://hianime.to/embed/anime/${id}/${e}`,        lang: "sub" },
    { name: "AniPlay",       url: `https://aniplaynow.live/embed/anime/${id}/${e}/sub`, lang: "sub" },
    { name: "AniPlay Dub",   url: `https://aniplaynow.live/embed/anime/${id}/${e}/dub`, lang: "dub" },

    // ---- Moopa / Miruro mirrors ----
    { name: "Miruro",        url: `https://www.miruro.tv/watch?id=${id}&ep=${e}`,  lang: "sub" },
    { name: "Moopa",         url: `https://moopa.live/anime/watch/${id}/${e}`,     lang: "sub" },

    // ---- AnimeKai / AnimeOwl / AniWave ----
    { name: "AnimeKai",      url: `https://animekai.to/embed/${id}/${e}`,   lang: "sub" },
    { name: "AnimeOwl",      url: `https://animeowl.net/embed/${id}/${e}`,  lang: "sub" },
    { name: "AniWave",       url: `https://aniwave.se/embed/${id}/${e}`,    lang: "sub" },

    // ---- AllAnime / Yugen / AnimeZ ----
    { name: "AllAnime",      url: `https://allanime.to/embed/anime/${id}/${e}`,  lang: "multi" },
    { name: "Yugen",         url: `https://yugenanime.tv/embed/${id}/${e}/`,     lang: "sub" },
    { name: "AnimeZ",        url: `https://animez.org/embed/${id}/${e}`,         lang: "sub" },

    // ---- AnimeNoSub / EmbTaku (gogo mirror) ----
    { name: "EmbTaku",       url: `https://embtaku.pro/embed/${id}/${e}`,        lang: "sub" },
    { name: "AnimeParadise", url: `https://animeparadise.moe/embed/${id}/${e}`,  lang: "sub" },
  ];
}
