import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { Home } from "./pages/Home";
import { Search } from "./pages/Search";
import { VideoDetail } from "./pages/VideoDetail";
import { Live } from "./pages/Live";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Subscription } from "./pages/Subscription";
import { Profile } from "./pages/Profile";
import { Notifications } from "./pages/Notifications";
import { FollowList } from "./pages/FollowList";
import { Terms } from "./pages/legal/Terms";
import { Privacy } from "./pages/legal/Privacy";
import { Guidelines } from "./pages/legal/Guidelines";
import { Copyright } from "./pages/legal/Copyright";import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminDashboard } from "./pages/admin/Dashboard";
import { AdminVideos } from "./pages/admin/Videos";
import { AdminLive } from "./pages/admin/Live";
import { AdminModeration } from "./pages/admin/Moderation";
import { AdminUsers } from "./pages/admin/Users";
import { AdminMfa } from "./pages/admin/Mfa";

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ADMIN") return <Navigate to="/" replace />;
  return <>{children}</>;
}

function Shell() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="page container">
        <Outlet />
      </main>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/video/:id" element={<VideoDetail />} />
        <Route path="/live" element={<Live />} />
        <Route path="/live/:id" element={<Live />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/subscribe"
          element={
            <Protected>
              <Subscription />
            </Protected>
          }
        />
        <Route
          path="/profile"
          element={
            <Protected>
              <Profile />
            </Protected>
          }
        />
        <Route
          path="/notifications"
          element={
            <Protected>
              <Notifications />
            </Protected>
          }
        />
        <Route
          path="/following"
          element={
            <Protected>
              <FollowList />
            </Protected>
          }
        />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/guidelines" element={<Guidelines />} />
        <Route path="/copyright" element={<Copyright />} />
        <Route
          path="/admin"
          element={
            <AdminOnly>
              <AdminLayout />
            </AdminOnly>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="videos" element={<AdminVideos />} />
          <Route path="live" element={<AdminLive />} />
          <Route path="moderation" element={<AdminModeration />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="mfa" element={<AdminMfa />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
