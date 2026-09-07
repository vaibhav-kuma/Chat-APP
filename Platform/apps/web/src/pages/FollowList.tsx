import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiDelete } from "../api/client";
import type { User } from "../api/types";
import { useState } from "react";

export function FollowList() {
  const qc = useQueryClient();
  const [err, setErr] = useState("");

  const following = useQuery({
    queryKey: ["me", "following"],
    queryFn: () => api<{ items: User[] }>("/social/following"),
  });

  const unfollow = async (id: string) => {
    setErr("");
    try {
      await apiDelete(`/social/users/${id}/follow`);
      void qc.invalidateQueries({ queryKey: ["me", "following"] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unfollow failed");
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <h2 className="section-title">People I follow</h2>
      {following.data && following.data.items.length === 0 && (
        <div className="empty-state">You're not following anyone yet. When creators post, you'll see them here.</div>
      )}
      <div style={{ display: "grid", gap: 12 }}>
        {following.data?.items.map((u) => (
          <div key={u.id} className="card" style={{ padding: 16 }}>
            <div className="row">
              <div className="avatar">{u.name.charAt(0).toUpperCase()}</div>
              <div>
                <strong>{u.name}</strong>
              </div>
              <div className="spacer" />
              <button className="btn" onClick={() => unfollow(u.id)}>
                Unfollow
              </button>
            </div>
          </div>
        ))}
      </div>
      {err && <div className="error-text">{err}</div>}
    </div>
  );
}
