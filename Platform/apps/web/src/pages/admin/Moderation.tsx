import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiPost } from "../../api/client";

interface Report {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details?: string | null;
  status: string;
  createdAt: string;
  reporter: { id: string; name: string; email: string };
}

export function AdminModeration() {
  const qc = useQueryClient();

  const reports = useQuery({
    queryKey: ["admin", "reports"],
    queryFn: () => api<{ items: Report[] }>("/admin/reports?status=FLAGGED"),
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["admin", "reports"] });

  const resolve = useMutation({ mutationFn: (id: string) => apiPost(`/admin/reports/${id}/resolve`), onSuccess: invalidate });
  const action = useMutation({
    mutationFn: (r: { id: string; action: string; reason?: string }) =>
      apiPost(`/admin/reports/${r.id}/action`, { action: r.action, reason: r.reason }),
    onSuccess: invalidate,
  });

  return (
    <div>
      <h3 className="section-title">Moderation queue</h3>
      {reports.isLoading && <div className="spinner" />}
      {reports.data && reports.data.items.length === 0 && <div className="empty-state">No open reports. Great job!</div>}
      {reports.data && (
        <div style={{ display: "grid", gap: 10 }}>
          {reports.data.items.map((r) => (
            <div key={r.id} className="card" style={{ padding: 16 }}>
              <div className="row" style={{ flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <strong>
                    {r.targetType} {r.targetId}
                  </strong>
                  <div className="muted" style={{ fontSize: 13 }}>
                    Reason: {r.reason}
                  </div>
                  {r.details && <div className="muted" style={{ fontSize: 13 }}>{r.details}</div>}
                  <div className="muted" style={{ fontSize: 12 }}>
                    Reported by {r.reporter.name} · {new Date(r.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn btn-danger" disabled={action.isPending} onClick={() => action.mutate({ id: r.id, action: "REMOVE_CONTENT" })}>
                    Remove content
                  </button>
                  <button className="btn btn-danger" disabled={action.isPending} onClick={() => action.mutate({ id: r.id, action: "BLOCK_USER" })}>
                    Block user
                  </button>
                  <button className="btn" disabled={resolve.isPending} onClick={() => resolve.mutate(r.id)}>
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
