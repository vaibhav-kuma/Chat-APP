import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api, apiPost } from "../api/client";
import type { Comment, Video } from "../api/types";
import { HlsPlayer } from "../components/HlsPlayer";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface DetailResponse {
  video: Video;
}

export function VideoDetail() {
  const { id = "" } = useParams();
  const { membership, user } = useAuth();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");

  const detail = useQuery({
    queryKey: ["video", id],
    queryFn: () => api<DetailResponse>(`/videos/${id}`),
    retry: false,
  });

  const streamUrl = useQuery({
    queryKey: ["video", id, "stream-url"],
    queryFn: () => api<{ url: string | null }>(`/videos/${id}/stream-url`),
    enabled: Boolean(membership?.isActive || user?.role === "ADMIN"),
    retry: false,
  });

  const comments = useQuery({
    queryKey: ["comments", id],
    queryFn: () => api<{ items: Comment[] }>(`/social/videos/${id}/comments`),
    retry: false,
  });

  const canWatch = Boolean(streamUrl.data?.url || membership?.isActive || user?.role === "ADMIN");

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    await apiPost(`/social/videos/${id}/comments`, { body: comment });
    setComment("");
    void qc.invalidateQueries({ queryKey: ["comments", id] });
  };

  if (detail.isLoading) return <div className="spinner" />;

  const video = detail.data?.video;
  if (!video) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: 40, marginBottom: 8 }}>🔒</div>
        <div>This video is for members only.</div>
        <div className="muted" style={{ margin: "8px 0 16px" }}>
          Subscribe to unlock the full library.
        </div>
        {!user && <a href="/register" className="btn btn-primary">Join now</a>}
        {user && !membership?.isActive && <a href="/subscribe" className="btn btn-primary">Subscribe</a>}
      </div>
    );
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: "2fr 1fr", alignItems: "start" }}>
      <div>
        <div className="player-shell">
          {canWatch && streamUrl.data?.url ? (
            <HlsPlayer src={streamUrl.data.url} poster={video.thumbnailUrl} />
          ) : (
            <div className="player-placeholder">
              <span style={{ fontSize: 40 }}>🔒</span>
              <span>Subscribe to watch this video</span>
            </div>
          )}
        </div>
        <h1 style={{ margin: "16px 0 4px", fontSize: 20 }}>{video.title}</h1>
        <div className="muted" style={{ marginBottom: 12 }}>
          {video.category?.name ?? "General"} · {video.viewCount} views · Published{" "}
          {video.publishedAt ? new Date(video.publishedAt).toLocaleDateString() : ""}
        </div>
        <div style={{ whiteSpace: "pre-wrap" }}>{video.description}</div>
      </div>

      <div>
        <h3 className="section-title">Comments</h3>
        <div className="chat-panel" style={{ minHeight: 320 }}>
          <div className="chat-messages">
            {comments.data && comments.data.items.length > 0 ? (
              comments.data.items.map((c) => (
                <div className="chat-msg" key={c.id}>
                  <span className="name">{c.user.name}</span>
                  {c.body}
                </div>
              ))
            ) : (
              <div className="empty-state" style={{ padding: 24 }}>
                No comments yet.
              </div>
            )}
          </div>
          {user && (
            <form className="chat-input" onSubmit={submitComment}>
              <input placeholder="Add a comment…" value={comment} onChange={(e) => setComment(e.target.value)} />
              <button className="btn btn-primary" type="submit" disabled={!comment.trim()}>
                Post
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
