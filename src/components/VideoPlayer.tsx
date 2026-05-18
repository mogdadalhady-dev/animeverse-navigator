import { useEffect, useRef } from "react";
import Hls from "hls.js";

interface Props {
  src: string;
  poster?: string;
  isM3U8?: boolean;
}

export function VideoPlayer({ src, poster, isM3U8 }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const m3u8 = isM3U8 ?? /\.m3u8(\?|$)/i.test(src);

    let hls: Hls | null = null;
    if (m3u8) {
      if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: true });
        hls.loadSource(src);
        hls.attachMedia(video);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari native
        video.src = src;
      }
    } else {
      video.src = src;
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [src, isM3U8]);

  return (
    <video
      ref={videoRef}
      poster={poster}
      controls
      playsInline
      className="h-full w-full bg-black"
    />
  );
}
