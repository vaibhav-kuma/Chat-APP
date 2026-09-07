import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import type { Plan } from "../../api/types";

interface DashboardData {
  members: number;
  admins: number;
  activeSubscriptions: number;
  publishedVideos: number;
  liveStreams: number;
  openReports: number;
  plans: Plan[];
  monthlyRecurring: number;
}

export function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => api<DashboardData>("/admin/dashboard"),
  });

  if (isLoading) return <div className="spinner" />;

  const stats = [
    { label: "Members", value: data?.members },
    { label: "Active subscriptions", value: data?.activeSubscriptions },
    { label: "Monthly recurring", value: data?.monthlyRecurring != null ? `₹${data.monthlyRecurring.toFixed(2)}` : "—" },
    { label: "Published videos", value: data?.publishedVideos },
    { label: "Live / scheduled", value: data?.liveStreams },
    { label: "Open reports", value: data?.openReports },
  ];

  return (
    <div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        {stats.map((s) => (
          <div key={s.label} className="card" style={{ padding: 20 }}>
            <div className="muted" style={{ fontSize: 13 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{s.value ?? "—"}</div>
          </div>
        ))}
      </div>

      {data?.plans && data.plans.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 className="section-title">Plans</h3>
          <div className="grid">
            {data.plans.map((p) => (
              <div key={p.id} className="card" style={{ padding: 16 }}>
                <strong>{p.name}</strong>
                <div>
                  ₹{(p.pricePaise / 100).toFixed(2)} / {p.billingCycle}
                </div>
                <div className="muted">{p.trialDays > 0 ? `${p.trialDays}-day trial` : "No trial"}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
