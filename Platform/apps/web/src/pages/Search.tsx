import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { Paginated, Video } from "../api/types";
import { VideoCard } from "../components/Cards";

export function Search() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";

  const results = useQuery({
    queryKey: ["videos", "search", q],
    queryFn: () => api<Paginated<Video>>(`/videos?q=${encodeURIComponent(q)}`),
    enabled: Boolean(q),
  });

  return (
    <div>
      <h2 className="section-title">{q ? `Results for "${q}"` : "Search"}</h2>
      {!q && <div className="empty-state">Type a search term to find videos.</div>}
      {q && results.isLoading && <div className="spinner" />}
      {results.data && results.data.items.length > 0 && (
        <div className="grid">
          {results.data.items.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      )}
      {results.data && results.data.items.length === 0 && <div className="empty-state">No videos found.</div>}
    </div>
  );
}
