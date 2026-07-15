import { api } from "./client.ts";
import type { WineDetail, WineListResponse } from "./types.ts";

export const winesApi = {
  list: (cursor: number | null, limit = 10) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor !== null) params.set("cursor", String(cursor));
    return api.get<WineListResponse>(`/wines?${params.toString()}`);
  },
  detail: (id: number) => api.get<WineDetail>(`/wines/${id}`),
};
