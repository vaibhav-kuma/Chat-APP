import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { ChatMessage, LiveStream } from "../api/types";
import { HlsPlayer } from "../components/HlsPlayer";
import { useAuth } from "../context/AuthContext";
import { socket } from "../socket/socket";

interface LiveDetailResponse {
  stream: LiveStream;
  playbackUrl?: string;
}

export function Live() {
  const { id } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const liveList = useQuery({
    queryKey: ["live", "list"],
    queryFn: () => api<{ items: LiveStream[] }>("/live"),
  });

  const detail = useQuery({
    queryKey: ["live", "detail", id],
    queryFn: () => api<LiveDetailResponse>(`/live/${id}`),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!id) return;
    socket.connect();
    socket.emit("live:join", id);
    const onMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };
    socket.on("chat:message", onMessage);
    return () => {
      socket.off("chat:message", onMessage);
      socket.emit("live:leave", id);
    };
  }, [id]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  if (!id) {
    const items = liveList.data?.items ?? [];
    return (
      <div>
        <h2 className="section-title">Live & Upcoming</h2>
        {items.length === 0 && <div className="empty-state">No live streams right now. Check back soon.</div>}
        <div className="grid">
          {items.map((s) => (
            <a key={s.id} href={`/live/${s.id}`} className="card">
              <div className="card-media">
                <div className="placeholder">📡</div>
              </div>
              <div className="card-body">
                <h3>{s.title}</h3>
                <div className="card-meta">{s.status}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    );
  }

  const stream = detail.data?.stream;
  if (!stream) {
    return <div className="spinner" />;
  }

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    socket.emit("chat:message", { liveId: id, body: draft });
    setDraft("");
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: "2fr 1fr", alignItems: "start" }}>
      <div>
        <div className="player-shell">
          {detail.data?.playbackUrl ? (
            <HlsPlayer src={detail.data.playbackUrl} live />
          ) : (
            <div className="player-placeholder">
              <span style={{ fontSize: 40 }}>🔒</span>
              <span>{stream.status === "LIVE" ? "Subscribe to watch this live stream" : "This stream has not started yet"}</span>
            </div>
          )}
        </div>
        <h1 style={{ margin: "16px 0 4px", fontSize: 20 }}>
          {stream.title}
          {stream.status === "LIVE" && (
            <span style={{ marginLeft: 10, color: "var(--danger)", fontSize: 14 }}>
              <span className="live-dot" /> LIVE
            </span>
          )}
        </h1>
        <div className="muted">{stream.description}</div>
      </div>

      <div className="chat-panel">
        <div className="section-title" style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", margin: 0 }}>
          Live Chat
        </div>
        <div className="chat-messages" ref={listRef}>
          {messages.map((m) => (
            <div className="chat-msg" key={m.id}>
              <span className="name">{m.user.name}</span>
              {m.body}
            </div>
          ))}
        </div>
        {user ? (
          <form className="chat-input" onSubmit={send}>
            <input placeholder="Say something…" value={draft} onChange={(e) => setDraft(e.target.value)} />
            <button className="btn btn-primary" type="submit" disabled={!draft.trim()}>
              Send
            </button>
          </form>
        ) : (
          <div className="chat-input">
            <span className="muted" style={{ padding: 8 }}>
              Login to join the chat
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
