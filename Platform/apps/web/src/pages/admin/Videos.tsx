import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiPost, apiPut, apiDelete } from "../../api/client";
import type { Paginated, Video } from "../../api/types";
import { useState } from "react";

export function AdminVideos() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Video | null>(null);

  const list = useQuery({
    queryKey: ["admin", "videos"],
    queryFn: () => api<Paginated<Video>>("/videos/admin/all?limit=50"),
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["admin", "videos"] });

  const createUpload = useMutation({
    mutationFn: () => apiPost<{ videoId: string; uploadUrl: string }>("/videos/upload", {}),
    onSuccess: (data) => {
      invalidate();
      window.open(data.uploadUrl, "_blank");
    },
  });

  const publish = useMutation({ mutationFn: (id: string) => apiPost(`/videos/${id}/publish`), onSuccess: invalidate });
  const unpublish = useMutation({ mutationFn: (id: string) => apiPost(`/videos/${id}/unpublish`), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: string) => apiDelete(`/videos/${id}`), onSuccess: invalidate });
  const save = useMutation({
    mutationFn: (v: { id: string; title: string; description?: string }) =>
      apiPut(`/videos/${v.id}`, { title: v.title, description: v.description }),
    onSuccess: () => {
      setEditing(null);
      invalidate();
    },
  });

  return (
    <div>
      <div className="row" style={{ marginBottom: 16 }}>
        <h3 className="section-title" style={{ margin: 0 }}>
          Videos
        </h3>
        <div className="spacer" />
        <button className="btn btn-primary" disabled={createUpload.isPending} onClick={() => createUpload.mutate()}>
          {createUpload.isPending ? "Creating…" : "New upload"}
        </button>
      </div>
      {createUpload.isError && <div className="error-text">{String(createUpload.error)}</div>}

      {list.isLoading && <div className="spinner" />}
      {list.data && (
        <div style={{ display: "grid", gap: 10 }}>
          {list.data.items.map((v) => (
            <div key={v.id} className="card" style={{ padding: 14 }}>
              <div className="row" style={{ flexWrap: "wrap" }}>
                <div style={{ minWidth: 220, flex: 1 }}>
                  <strong>{v.title}</strong>
                  <div className="muted" style={{ fontSize: 13 }}>
                    <span style={{ textTransform: "uppercase", color: v.status === "PUBLISHED" ? "var(--success)" : "var(--text-dim)" }}>
                      {v.status}
                    </span>{" "}
                    · {v.category?.name ?? "Uncategorized"} · {v.viewCount} views
                  </div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn" onClick={() => setEditing(v)}>
                    Edit
                  </button>
                  {v.status !== "PUBLISHED" ? (
                    <button className="btn" disabled={publish.isPending} onClick={() => publish.mutate(v.id)}>
                      Publish
                    </button>
                  ) : (
                    <button className="btn" disabled={unpublish.isPending} onClick={() => unpublish.mutate(v.id)}>
                      Unpublish
                    </button>
                  )}
                  <button className="btn btn-danger" disabled={remove.isPending} onClick={() => remove.mutate(v.id)}>
                    Delete
                  </button>
                </div>
              </div>

              {editing?.id === v.id && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    save.mutate({ id: v.id, title: editing.title, description: editing.description ?? undefined });
                  }}
                  style={{ marginTop: 12 }}
                >
                  <div className="form-group">
                    <input
                      value={editing.title}
                      onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <textarea
                      rows={3}
                      placeholder="Description"
                      value={editing.description ?? ""}
                      onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    />
                  </div>
                  <button className="btn btn-primary" type="submit">
                    Save
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
