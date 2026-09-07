import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiPost } from "../../api/client";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  status: string;
  role: string;
  createdAt: string;
}

export function AdminUsers() {
  const qc = useQueryClient();

  const users = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => api<{ items: AdminUser[] }>("/admin/users"),
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["admin", "users"] });

  const block = useMutation({ mutationFn: (id: string) => apiPost(`/admin/users/${id}/block`), onSuccess: invalidate });
  const unblock = useMutation({ mutationFn: (id: string) => apiPost(`/admin/users/${id}/unblock`), onSuccess: invalidate });

  return (
    <div>
      <h3 className="section-title">Members</h3>
      {users.isLoading && <div className="spinner" />}
      {users.data && (
        <div style={{ display: "grid", gap: 8 }}>
          {users.data.items.map((u) => (
            <div key={u.id} className="card" style={{ padding: 14 }}>
              <div className="row" style={{ flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <strong>{u.name}</strong>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {u.email} · joined {new Date(u.createdAt).toLocaleDateString()} ·{" "}
                    <span style={{ color: u.status === "blocked" ? "var(--danger)" : "var(--success)" }}>{u.status}</span>
                  </div>
                </div>
                {u.status === "blocked" ? (
                  <button className="btn" disabled={unblock.isPending} onClick={() => unblock.mutate(u.id)}>
                    Unblock
                  </button>
                ) : (
                  <button className="btn btn-danger" disabled={block.isPending} onClick={() => block.mutate(u.id)}>
                    Block
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
