import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Paginated, Video } from "../api/types";
import { VideoCard } from "../components/Cards";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

export function Profile() {
  const { user, membership, logout } = useAuth();

  const myVideos = useQuery({
    queryKey: ["admin", "videos"],
    queryFn: () => api<Paginated<Video>>("/videos/admin/all?limit=12"),
    enabled: user?.role === "ADMIN",
  });

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="row" style={{ marginBottom: 24 }}>
        <div className="avatar" style={{ width: 64, height: 64, fontSize: 28 }}>
          {user?.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>{user?.name}</h1>
          <div className="muted">{user?.email}</div>
          <div className="muted">
            Role: {user?.role} · Membership:{" "}
            {membership?.isActive ? (
              <span style={{ color: "var(--success)" }}>Active</span>
            ) : (
              <span style={{ color: "var(--danger)" }}>Inactive</span>
            )}
          </div>
        </div>
        <div className="spacer" />
        <Link to="/subscribe" className="btn btn-primary">
          Manage membership
        </Link>
      </div>

      {myVideos.data && myVideos.data.items.length > 0 && (
        <>
          <h2 className="section-title">My videos</h2>
          <div className="grid">
            {myVideos.data.items.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        </>
      )}

      <button
        className="btn"
        style={{ marginTop: 24 }}
        onClick={() => {
          void logout().then(() => window.location.reload());
        }}
      >
        Logout
      </button>
    </div>
  );
}
