import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { LiveStream, Paginated, Video } from "../api/types";
import { VideoCard, LiveCard } from "../components/Cards";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

export function Home() {
  const { user, membership } = useAuth();

  const videos = useQuery({
    queryKey: ["videos", 1],
    queryFn: () => api<Paginated<Video>>("/videos?page=1&limit=12"),
  });

  const live = useQuery({
    queryKey: ["live", "list"],
    queryFn: () => api<Paginated<LiveStream>>("/live?page=1&limit=4"),
  });

  const liveStreams = live.data?.items.filter((s) => s.status === "LIVE" || s.status === "SCHEDULED") ?? [];

  return (
    <div>
      {!user && (
        <div
          style={{
            background: "linear-gradient(135deg, #7c5cff, #e26df0)",
            borderRadius: 16,
            padding: "40px 28px",
            marginBottom: 32,
          }}
        >
          <h1 style={{ margin: "0 0 8px", fontSize: 28 }}>Unlimited family-safe videos & live streams</h1>
          <p style={{ margin: "0 0 20px", opacity: 0.9 }}>One simple monthly subscription. New content every week.</p>
          <Link to="/register" className="btn" style={{ background: "#fff", color: "#111", border: "none" }}>
            Start Watching
          </Link>
        </div>
      )}

      {!membership?.isActive && user && (
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <strong>Your membership is not active.</strong>{" "}
          <Link to="/subscribe" style={{ color: "var(--accent)" }}>
            Subscribe now
          </Link>{" "}
          to unlock videos and live streams.
        </div>
      )}

      {liveStreams.length > 0 && (
        <>
          <h2 className="section-title">Live & Upcoming</h2>
          <div className="grid" style={{ marginBottom: 32 }}>
            {liveStreams.map((s) => (
              <LiveCard key={s.id} stream={s} />
            ))}
          </div>
        </>
      )}

      <h2 className="section-title">Latest Videos</h2>
      {videos.isLoading ? (
        <div className="spinner" />
      ) : videos.data && videos.data.items.length > 0 ? (
        <div className="grid">
          {videos.data.items.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      ) : (
        <div className="empty-state">No videos published yet. Check back soon.</div>
      )}
    </div>
  );
}
