import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiPost } from "../api/client";
import type { Paginated, Notification } from "../api/types";
import { useEffect } from "react";
import { socket } from "../socket/socket";

export function Notifications() {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<Paginated<Notification>>("/notifications?limit=50"),
  });

  useEffect(() => {
    const onRefresh = () => void qc.invalidateQueries({ queryKey: ["notifications"] });
    window.addEventListener("refetch-notifications", onRefresh);
    return () => window.removeEventListener("refetch-notifications", onRefresh);
  }, [qc]);

  const markRead = async (id?: string) => {
    await apiPost(id ? `/notifications/${id}/read` : "/notifications/read-all");
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  useEffect(() => {
    socket.connect();
    const onNotif = () => void qc.invalidateQueries({ queryKey: ["notifications"] });
    socket.on("notification", onNotif);
    return () => {
      socket.off("notification", onNotif);
      socket.disconnect();
    };
  }, [qc]);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="row" style={{ marginBottom: 16 }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          Notifications
        </h2>
        <div className="spacer" />
        <button className="btn" onClick={() => markRead()}>
          Mark all read
        </button>
      </div>

      {list.isLoading && <div className="spinner" />}
      {list.data && list.data.items.length === 0 && <div className="empty-state">No notifications yet.</div>}
      {list.data && (
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          {list.data.items.map((n) => (
            <div
              key={n.id}
              className={`notification-item${n.isRead ? "" : " unread"}`}
              onClick={() => !n.isRead && markRead(n.id)}
              style={!n.isRead ? { cursor: "pointer" } : undefined}
            >
              <strong style={{ fontSize: 14 }}>{n.title}</strong>
              {n.body && <div className="muted" style={{ fontSize: 13 }}>{n.body}</div>}
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                {new Date(n.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
