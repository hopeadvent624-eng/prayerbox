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
  users: AuthUser[];
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  createdAt?: string;
}

const CONFIGURED_API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "";

async function readErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") || "";
  let message = `Request failed with ${response.status}`;

  if (contentType.includes("application/json")) {
    try {
      const data = await response.json();
      message = typeof data === "string" ? data : data.error || data.message || message;
    } catch {
      // fall back to plain text below
    }
  }

  if (message === `Request failed with ${response.status}`) {
    try {
      const text = await response.text();
      if (text) message = text;
    } catch {
      // ignore
    }
  }

  return message;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const urls = [] as string[];
  if (CONFIGURED_API_BASE_URL) {
    urls.push(`${CONFIGURED_API_BASE_URL}${path}`);
  }
  urls.push(path);

  let lastError: Error | undefined;

  for (const [index, url] of urls.entries()) {
    try {
      const response = await fetch(url, {
        headers: { "Content-Type": "application/json", ...options?.headers },
        ...options,
      });

      if (response.ok) {
        return response.json() as Promise<T>;
      }

      if (response.status === 404 && index === 0 && urls.length > 1) {
        continue;
      }

      throw new Error(await readErrorMessage(response));
    } catch (error) {
      if (error instanceof Error) {
        lastError = error;
      }
      if (index === urls.length - 1 || !(error instanceof Error && error.message.includes("Route not found"))) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error("Request failed");
}

export const api = {
  getState: () => request<PrayerboxState>("/api/state"),
  getUsers: () => request<AuthUser[]>("/api/users"),
  register: (name: string, email: string, password: string, phone: string, avatar: string) =>
    request<{ user: AuthUser }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, phone, avatar }),
    }),
  login: (email: string, password: string) =>
    request<{ user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  deleteUser: (id: number) =>
    request<{ ok: boolean }>(`/api/users/${id}`, { method: "DELETE" }),
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
