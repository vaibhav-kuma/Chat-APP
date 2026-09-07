import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiPost } from "../../api/client";
import type { LiveStream } from "../../api/types";
import { useState } from "react";

export function AdminLive() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledStartAt, setScheduledStartAt] = useState("");

  const list = useQuery({
    queryKey: ["admin", "live"],
    queryFn: () => api<{ items: LiveStream[] }>("/live?limit=50"),
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["admin", "live"] });

  const create = useMutation({
    mutationFn: () =>
      apiPost<{ stream: LiveStream }>("/live", {
        title,
        description,
        scheduledStartAt: scheduledStartAt ? new Date(scheduledStartAt).toISOString() : undefined,
      }),
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setScheduledStartAt("");
      invalidate();
    },
  });

  const start = useMutation({ mutationFn: (id: string) => apiPost(`/live/${id}/start`), onSuccess: invalidate });
  const end = useMutation({ mutationFn: (id: string) => apiPost(`/live/${id}/end`), onSuccess: invalidate });
  const record = useMutation({
    mutationFn: (id: string) => apiPost(`/live/${id}/record`),
    onSuccess: invalidate,
    onError: (err) => window.alert(String(err)),
  });

  return (
    <div>
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 16px" }}>Create live stream</h3>
        <div className="form-group">
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Scheduled start (optional)</label>
          <input type="datetime-local" value={scheduledStartAt} onChange={(e) => setScheduledStartAt(e.target.value)} />
        </div>
        <button className="btn btn-primary" disabled={!title.trim() || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? "Creating…" : "Create stream"}
        </button>
      </div>

      {list.data && (
        <div style={{ display: "grid", gap: 10 }}>
          {list.data.items.map((s) => (
            <div key={s.id} className="card" style={{ padding: 14 }}>
              <div className="row" style={{ flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <strong>{s.title}</strong>
                  <div className="muted" style={{ fontSize: 13 }}>
                    <span style={{ textTransform: "uppercase", color: s.status === "LIVE" ? "var(--success)" : "var(--text-dim)" }}>
                      {s.status}
                    </span>
                    {s.streamKey && (
                      <>
                        {" "}
                        · <span title="Ingest key">{s.streamKey}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  {s.status === "SCHEDULED" && (
                    <button className="btn" disabled={start.isPending} onClick={() => start.mutate(s.id)}>
                      Start
                    </button>
                  )}
                  {s.status === "LIVE" && (
                    <button className="btn" disabled={end.isPending} onClick={() => end.mutate(s.id)}>
                      End
                    </button>
                  )}
                  {s.status === "ENDED" && (
                    <button className="btn" disabled={record.isPending} onClick={() => record.mutate(s.id)}>
                      Publish recording
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
