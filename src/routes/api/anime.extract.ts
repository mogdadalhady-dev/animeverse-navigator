// Server route: GET /api/anime/extract?url=<embed-page>
//
// Video Proxy Architecture (VPA) — Step 2: Direct Stream Extractor.
// Given an embed page URL (vidsrc, 2anime, embtaku, megaplay, ...), this
// route fetches the HTML server-side with the proper Referer / UA headers,
// scrapes the first direct media URL (.m3u8 or .mp4), and returns it
// rewritten through our /api/anime/proxy so the browser can play it
// without hitting CORS / X-Frame-Options blocks.
//
// This is a best-effort scraper: it works for providers that embed the
// media URL in the page HTML / inline JS. Heavily-obfuscated providers
// (packer/AES) will return `notFound` so the caller can try another server.

import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Regexes ordered by preference (HLS > MP4).
const MEDIA_REGEXES: RegExp[] = [
  /https?:\\?\/\\?\/[^"'\s<>()]+\.m3u8[^"'\s<>()]*/gi,
  /["'](https?:[^"']+\.m3u8[^"']*)["']/gi,
  /file\s*:\s*["'](https?:[^"']+\.m3u8[^"']*)["']/gi,
  /source\s*:\s*["'](https?:[^"']+\.m3u8[^"']*)["']/gi,
  /https?:\\?\/\\?\/[^"'\s<>()]+\.mp4[^"'\s<>()]*/gi,
  /["'](https?:[^"']+\.mp4[^"']*)["']/gi,
];

function cleanUrl(raw: string): string {
  let u = raw.replace(/\\\//g, "/").replace(/\\u002F/gi, "/");
  // strip wrapping quotes if regex captured them
  u = u.replace(/^["']|["']$/g, "");
  return u;
}

function extractMedia(html: string): { url: string; isM3U8: boolean } | null {
  for (const rx of MEDIA_REGEXES) {
    const matches = html.matchAll(rx);
    for (const m of matches) {
      const candidate = cleanUrl(m[1] ?? m[0]);
      if (!/^https?:\/\//i.test(candidate)) continue;
      if (/\.(png|jpe?g|svg|webp|ico|css)(\?|$)/i.test(candidate)) continue;
      return { url: candidate, isM3U8: /\.m3u8/i.test(candidate) };
    }
  }
  return null;
}

function proxify(absolute: string, ref: string) {
  const origin = (() => {
    try {
      return new URL(ref).origin;
    } catch {
      return "";
    }
  })();
  const u = new URLSearchParams();
  u.set("url", absolute);
  if (ref) u.set("ref", ref);
  if (origin) u.set("origin", origin);
  return `/api/anime/proxy?${u.toString()}`;
}

export const Route = createFileRoute("/api/anime/extract")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const target = url.searchParams.get("url");
        if (!target) {
          return new Response(JSON.stringify({ error: "Missing url" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }

        let referer = "";
        try {
          referer = new URL(target).origin + "/";
        } catch {
          return new Response(JSON.stringify({ error: "Invalid url" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }

        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 10_000);
          const res = await fetch(target, {
            redirect: "follow",
            signal: ctrl.signal,
            headers: {
              "User-Agent": UA,
              Accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.9",
              Referer: referer,
            },
          });
          clearTimeout(t);

          if (!res.ok) {
            return new Response(
              JSON.stringify({ error: `Upstream ${res.status}`, found: false }),
              { status: 502, headers: { "Content-Type": "application/json", ...CORS } },
            );
          }

          const html = await res.text();
          const hit = extractMedia(html);
          if (!hit) {
            return new Response(
              JSON.stringify({ found: false, reason: "No direct media URL in HTML" }),
              { status: 404, headers: { "Content-Type": "application/json", ...CORS } },
            );
          }

          // Use the embed page URL as referer for the media fetch — most
          // hosts validate Referer against their own embed domain.
          const mediaRef = target;
          return new Response(
            JSON.stringify({
              found: true,
              source: { url: proxify(hit.url, mediaRef), isM3U8: hit.isM3U8, quality: "auto" },
              raw: hit.url,
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Cache-Control": "public, max-age=300",
                ...CORS,
              },
            },
          );
        } catch (e: any) {
          return new Response(
            JSON.stringify({ error: String(e?.message ?? e), found: false }),
            { status: 502, headers: { "Content-Type": "application/json", ...CORS } },
          );
        }
      },
    },
  },
});
