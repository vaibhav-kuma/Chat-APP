import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/videos", label: "Videos" },
  { to: "/admin/live", label: "Live streams" },
  { to: "/admin/moderation", label: "Moderation" },
  { to: "/admin/users", label: "Users" },
];

export function AdminLayout() {
  return (
    <div>
      <h2 className="section-title">Admin</h2>
      <div className="row" style={{ marginBottom: 24, overflowX: "auto" }}>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => `btn${isActive ? " btn-primary" : ""}`}
          >
            {l.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
