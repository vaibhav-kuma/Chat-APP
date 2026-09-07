import { Link, NavLink, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { socket } from "../socket/socket";
import { useEffect, useState } from "react";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const { data: unread } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => api<{ count: number }>("/notifications/unread-count"),
    enabled: Boolean(user),
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (!user) return;
    socket.connect();
    const onNotif = () => {
      window.dispatchEvent(new Event("refetch-notifications"));
    };
    socket.on("notification", onNotif);
    return () => {
      socket.off("notification", onNotif);
      socket.disconnect();
    };
  }, [user]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand">
          <span className="dot" /> Platform
        </Link>
        <nav className="nav-links">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/live">Live</NavLink>
          {user?.role === "ADMIN" && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <form className="search-box" onSubmit={submitSearch}>
          <input
            placeholder="Search videos"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search videos"
          />
        </form>
        <div className="navbar-actions">
          {user ? (
            <>
              <Link to="/notifications" className="icon-btn" aria-label="Notifications">
                🔔
                {unread && unread.count > 0 && <span className="badge">{unread.count > 9 ? "9+" : unread.count}</span>}
              </Link>
              <Link to="/profile" className="avatar" style={{ width: 32, height: 32 }}>
                {user.name.charAt(0).toUpperCase()}
              </Link>
              <button
                className="btn"
                onClick={() => {
                  void logout().then(() => navigate("/"));
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary">
                Join
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
