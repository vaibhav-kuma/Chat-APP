import { useEffect, useRef } from "react";
import Hls from "hls.js";

interface Props {
  src?: string | null;
  poster?: string | null;
  live?: boolean;
}

export function HlsPlayer({ src, poster, live }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (Hls.isSupported()) {
      const hls = new Hls({ liveSyncDurationCount: live ? 3 : 0 });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          hls.destroy();
        }
      });
      return () => {
        hls.destroy();
      };
    }
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
    }
    return undefined;
  }, [src, live]);

  if (!src) {
    return (
      <div className="player-placeholder">
        <span style={{ fontSize: 40 }}>{live ? "📡" : "🎬"}</span>
        <span>Playback unavailable in this environment</span>
      </div>
    );
  }

  return <video ref={videoRef} poster={poster ?? undefined} controls autoPlay={Boolean(live)} playsInline />;
}
