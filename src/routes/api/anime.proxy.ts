// Server route: GET /api/anime/proxy?url=<upstream>&ref=<referer>&origin=<origin>
// Streams/rewrites HLS playlists & segments to bypass CORS + Referer restrictions
// imposed by free anime streaming hosts.
import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range",
};

function proxyUrlFor(absolute: string, ref?: string, origin?: string) {
  const u = new URLSearchParams();
  u.set("url", absolute);
  if (ref) u.set("ref", ref);
  if (origin) u.set("origin", origin);
  return `/api/anime/proxy?${u.toString()}`;
}

function rewritePlaylist(text: string, base: string, ref?: string, origin?: string) {
  const out: string[] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line) {
      out.push(line);
      continue;
    }
    // Rewrite URI="..." inside EXT-X-KEY / EXT-X-MAP / EXT-X-MEDIA tags.
    if (line.startsWith("#")) {
      const replaced = line.replace(/URI="([^"]+)"/g, (_m, p1) => {
        const abs = new URL(p1, base).toString();
        return `URI="${proxyUrlFor(abs, ref, origin)}"`;
      });
      out.push(replaced);
      continue;
    }
    // Segment / variant playlist lines
    try {
      const abs = new URL(line, base).toString();
      out.push(proxyUrlFor(abs, ref, origin));
    } catch {
      out.push(line);
    }
  }
  return out.join("\n");
}

export const Route = createFileRoute("/api/anime/proxy")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);

        // Same-origin protection: only allow our own site to use the proxy.
        const reqOrigin = request.headers.get("origin");
        const reqRef = request.headers.get("referer");
        const allowedHost = url.host;
        const hostOf = (s: string | null) => {
          if (!s) return null;
          try { return new URL(s).host; } catch { return null; }
        };
        const oh = hostOf(reqOrigin);
        const rh = hostOf(reqRef);
        const sameOrigin =
          (!reqOrigin && !reqRef) || oh === allowedHost || rh === allowedHost;
        if (!sameOrigin) {
          return new Response("Forbidden", { status: 403, headers: CORS });
        }

        const target = url.searchParams.get("url");
        const ref = url.searchParams.get("ref") || undefined;
        const origin = url.searchParams.get("origin") || undefined;
        if (!target) {
          return new Response("Missing url", { status: 400, headers: CORS });
        }
        try {
          const headers: Record<string, string> = {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
            Accept: "*/*",
          };
          if (ref) headers["Referer"] = ref;
          if (origin) headers["Origin"] = origin;
          const range = request.headers.get("range");
          if (range) headers["Range"] = range;

          const upstream = await fetch(target, { headers, redirect: "follow" });
          const ct = upstream.headers.get("content-type") || "";
          const isPlaylist =
            /mpegurl|x-mpegurl/i.test(ct) || /\.m3u8(\?|$)/i.test(target);

          if (isPlaylist) {
            const text = await upstream.text();
            const rewritten = rewritePlaylist(text, target, ref, origin);
            return new Response(rewritten, {
              status: upstream.status,
              headers: {
                "Content-Type": "application/vnd.apple.mpegurl",
                "Cache-Control": "no-store",
                ...CORS,
              },
            });
          }

          // Pass-through (segments, keys, subs, mp4)
          const passHeaders = new Headers();
          for (const h of ["content-type", "content-length", "content-range", "accept-ranges", "cache-control"]) {
            const v = upstream.headers.get(h);
            if (v) passHeaders.set(h, v);
          }
          for (const [k, v] of Object.entries(CORS)) passHeaders.set(k, v);
          return new Response(upstream.body, {
            status: upstream.status,
            headers: passHeaders,
          });
        } catch (e: any) {
          return new Response(`Proxy error: ${String(e?.message ?? e)}`, {
            status: 502,
            headers: CORS,
          });
        }
      },
    },
  },
});
