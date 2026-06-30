export type Category = "Personal" | "Health" | "Family" | "Studies" | "Ministry" | "Other";

export interface PrayerRequest {
  id: number;
  name: string;
  request: string;
  category: Category;
  prayerCount: number;
  approved: boolean;
  urgent?: boolean;
}

export interface Testimony {
  id: number;
  name: string;
  text: string;
  category: Category;
  daysAgo: number;
  prayerCount: number;
  approved: boolean;
}

export interface PrayerboxState {
  prayers: PrayerRequest[];
  testimonies: Testimony[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = API_BASE_URL ? `${API_BASE_URL}${path}` : path;
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getState: () => request<PrayerboxState>("/api/state"),
  submitPrayer: (name: string, prayerRequest: string, category: Category) =>
    request<PrayerRequest>("/api/prayers", {
      method: "POST",
      body: JSON.stringify({ name, request: prayerRequest, category }),
    }),
  prayForRequest: (id: number) =>
    request<PrayerRequest>(`/api/prayers/${id}/pray`, { method: "POST" }),
  updatePrayer: (id: number, updates: Partial<Pick<PrayerRequest, "approved" | "urgent">>) =>
    request<PrayerRequest>(`/api/prayers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),
  deletePrayer: (id: number) =>
    request<{ ok: boolean }>(`/api/prayers/${id}`, { method: "DELETE" }),
  submitTestimony: (name: string, text: string) =>
    request<Testimony>("/api/testimonies", {
      method: "POST",
      body: JSON.stringify({ name, text }),
    }),
  updateTestimony: (id: number, updates: Partial<Pick<Testimony, "approved">>) =>
    request<Testimony>(`/api/testimonies/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),
  deleteTestimony: (id: number) =>
    request<{ ok: boolean }>(`/api/testimonies/${id}`, { method: "DELETE" }),
};
