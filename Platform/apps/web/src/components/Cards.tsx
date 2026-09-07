import { Link } from "react-router-dom";
import type { LiveStream, Video } from "../api/types";

export function VideoCard({ video }: { video: Video }) {
  const duration = video.durationSec
    ? `${Math.floor(video.durationSec / 60)}:${String(video.durationSec % 60).padStart(2, "0")}`
    : null;

  return (
    <Link to={`/video/${video.id}`} className="card">
      <div className="card-media">
        {video.thumbnailUrl ? (
          <img src={video.thumbnailUrl} alt={video.title} loading="lazy" />
        ) : (
          <div className="placeholder">🎬</div>
        )}
      </div>
      <div className="card-body">
        <h3>{video.title}</h3>
        <div className="card-meta">
          {video.category?.name ?? "General"}
          {duration ? ` · ${duration}` : ""}
          {video.viewCount > 0 ? ` · ${video.viewCount} views` : ""}
        </div>
      </div>
    </Link>
  );
}

export function LiveCard({ stream }: { stream: LiveStream }) {
  const isLive = stream.status === "LIVE";
  return (
    <Link to={`/live/${stream.id}`} className="card">
      <div className="card-media">
        {stream.thumbnailUrl ? (
          <img src={stream.thumbnailUrl} alt={stream.title} loading="lazy" />
        ) : (
          <div className="placeholder">📡</div>
        )}
      </div>
      <div className="card-body">
        <h3>{stream.title}</h3>
        <div className="card-meta">
          {isLive ? (
            <span>
              <span className="live-dot" /> LIVE NOW
            </span>
          ) : stream.status === "SCHEDULED" ? (
            `Scheduled ${stream.scheduledStartAt ? new Date(stream.scheduledStartAt).toLocaleString() : ""}`
          ) : (
            "Ended"
          )}
        </div>
      </div>
    </Link>
  );
}
