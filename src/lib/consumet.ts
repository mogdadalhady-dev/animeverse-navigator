// Consumet API client — fetches anime episodes & streaming links
// Public instance — can be swapped via VITE_CONSUMET_BASE
const BASE = (import.meta as any).env?.VITE_CONSUMET_BASE || "https://api.consumet.org";

export type Provider = "gogoanime" | "zoro";

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

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Consumet ${res.status}`);
  return res.json();
}

function titleString(t: ConsumetSearchResult["title"]): string {
  if (typeof t === "string") return t;
  return t?.english || t?.romaji || t?.native || "";
}

export const consumet = {
  async search(query: string, provider: Provider = "gogoanime") {
    const data = await get<{ results: ConsumetSearchResult[] }>(
      `/anime/${provider}/${encodeURIComponent(query)}`,
    );
    return data.results || [];
  },

  async info(id: string, provider: Provider = "gogoanime") {
    return get<ConsumetInfo>(`/anime/${provider}/info/${encodeURIComponent(id)}`);
  },

  async watch(episodeId: string, provider: Provider = "gogoanime", server?: string) {
    const qs = server ? `?server=${server}` : "";
    return get<StreamResponse>(
      `/anime/${provider}/watch/${encodeURIComponent(episodeId)}${qs}`,
    );
  },

  /**
   * Map a MAL anime to a Consumet anime by searching by title and picking the
   * best match. This is the standard cross-source mapping pattern.
   */
  async findByTitle(
    title: string,
    opts: { provider?: Provider; year?: number | null; totalEpisodes?: number | null } = {},
  ) {
    const provider = opts.provider || "gogoanime";
    const results = await consumet.search(title, provider);
    if (!results.length) return null;

    // Score: exact title match > contains > first result
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const target = norm(title);
    const ranked = results
      .map((r) => {
        const t = norm(titleString(r.title));
        let score = 0;
        if (t === target) score += 100;
        else if (t.startsWith(target) || target.startsWith(t)) score += 50;
        else if (t.includes(target) || target.includes(t)) score += 20;
        // Prefer sub over dub by default
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
