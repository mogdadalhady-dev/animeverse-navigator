// Jikan API client — MyAnimeList data, no key required
const BASE = "https://api.jikan.moe/v4";

export interface AnimeImage {
  jpg: { image_url: string; large_image_url: string };
  webp: { image_url: string; large_image_url: string };
}

export interface Anime {
  mal_id: number;
  title: string;
  title_english?: string | null;
  images: AnimeImage;
  score?: number | null;
  episodes?: number | null;
  type?: string | null;
  status?: string | null;
  year?: number | null;
  synopsis?: string | null;
  genres?: { mal_id: number; name: string }[];
  trailer?: { youtube_id?: string | null; embed_url?: string | null };
  rating?: string | null;
  rank?: number | null;
  popularity?: number | null;
  duration?: string | null;
  studios?: { name: string }[];
}

interface JikanResp<T> {
  data: T;
  pagination?: { has_next_page: boolean; current_page: number; last_visible_page: number };
}

async function get<T>(path: string): Promise<JikanResp<T>> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Jikan ${res.status}`);
  return res.json();
}

export const jikan = {
  top: (limit = 24) => get<Anime[]>(`/top/anime?limit=${limit}`),
  trending: (limit = 24) => get<Anime[]>(`/top/anime?filter=airing&limit=${limit}`),
  upcoming: (limit = 12) => get<Anime[]>(`/top/anime?filter=upcoming&limit=${limit}`),
  popular: (limit = 12) => get<Anime[]>(`/top/anime?filter=bypopularity&limit=${limit}`),
  seasonNow: (limit = 24) => get<Anime[]>(`/seasons/now?limit=${limit}`),
  byId: (id: number | string) => get<Anime>(`/anime/${id}/full`),
  search: (q: string, page = 1) =>
    get<Anime[]>(`/anime?q=${encodeURIComponent(q)}&page=${page}&order_by=popularity&sort=asc&limit=24`),
  genres: () => get<{ mal_id: number; name: string; count: number }[]>(`/genres/anime`),
  byGenre: (genreId: number, page = 1) =>
    get<Anime[]>(`/anime?genres=${genreId}&order_by=popularity&sort=asc&page=${page}&limit=24`),
  recommendations: (id: number | string) =>
    get<{ entry: Anime }[]>(`/anime/${id}/recommendations`),
};
