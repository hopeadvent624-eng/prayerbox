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
  username?: string;
  email: string;
  role?: "user" | "admin";
  phone?: string;
  avatar?: string;
  bio?: string;
  accountStatus?: "active" | "deactivated";
  createdAt?: string;
}

export interface AccountActionTokenResponse {
  ok: boolean;
  action: "deactivate" | "delete";
  confirmationToken: string;
  expiresAt: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  refreshToken: string;
}

export interface AuthSession {
  id: string;
  current: boolean;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  ipAddress: string;
  userAgent: string;
}

const CONFIGURED_API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "";
const AUTH_TOKEN_KEY = "ayp_authToken";
const AUTH_REFRESH_TOKEN_KEY = "ayp_refreshToken";
let authToken = "";
let refreshToken = "";
let refreshingPromise: Promise<boolean> | null = null;

try {
  authToken = localStorage.getItem(AUTH_TOKEN_KEY) || "";
  refreshToken = localStorage.getItem(AUTH_REFRESH_TOKEN_KEY) || "";
} catch {
  authToken = "";
  refreshToken = "";
}

function persistTokens(token: string, nextRefreshToken: string) {
  authToken = token;
  refreshToken = nextRefreshToken;
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }

    if (nextRefreshToken) {
      localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, nextRefreshToken);
    } else {
      localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

async function tryRefreshAccessToken(baseUrl: string): Promise<boolean> {
  if (!refreshToken) return false;

  if (!refreshingPromise) {
    refreshingPromise = (async () => {
      try {
        const response = await fetch(`${baseUrl}/api/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          persistTokens("", "");
          return false;
        }

        const data = (await response.json()) as AuthResponse;
        persistTokens(data.token, data.refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshingPromise = null;
      }
    })();
  }

  return refreshingPromise;
}

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
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if ((host === "localhost" || host === "127.0.0.1") && !urls.includes(`http://localhost:4000${path}`)) {
      urls.push(`http://localhost:4000${path}`);
    }
  }
  urls.push(path);

  let lastError: Error | undefined;

  for (const [index, url] of urls.entries()) {
    try {
      const requestOptions: RequestInit = {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...options?.headers,
        },
      };

      let response = await fetch(url, requestOptions);

      const isAuthRoute = path.startsWith("/api/auth/");
      if (response.status === 401 && !isAuthRoute && refreshToken) {
        const base = url.startsWith("http") ? new URL(url).origin : "";
        const refreshed = await tryRefreshAccessToken(base);
        if (refreshed) {
          requestOptions.headers = {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            ...options?.headers,
          };
          response = await fetch(url, requestOptions);
        }
      }

      if (response.ok) {
        return response.json() as Promise<T>;
      }

      if (response.status === 404 && index === 0 && urls.length > 1) {
        continue;
      }

      // If login fails on one backend, try the next candidate URL before failing.
      if (path === "/api/auth/login" && response.status === 401 && index < urls.length - 1) {
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
  setAuthToken: (token: string) => persistTokens(token, refreshToken),
  clearAuthToken: () => persistTokens("", ""),
  getAuthToken: () => authToken,
  getRefreshToken: () => refreshToken,
  getCurrentUser: () => request<{ user: AuthUser }>("/api/auth/me"),
  updateProfile: (payload: { name?: string; username?: string; phone?: string; avatar?: string; bio?: string }) =>
    request<{ user: AuthUser }>("/api/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  changeEmail: (email: string, password: string) =>
    request<{ user: AuthUser }>("/api/auth/change-email", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: boolean }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  requestAccountActionToken: (action: "deactivate" | "delete") =>
    request<AccountActionTokenResponse>("/api/auth/account-actions/request", {
      method: "POST",
      body: JSON.stringify({ action }),
    }),
  confirmAccountAction: (action: "deactivate" | "delete", confirmationToken: string) =>
    request<{ ok: boolean; action: "deactivate" | "delete"; accountStatus?: "deactivated"; deleted?: boolean }>(
      "/api/auth/account-actions/confirm",
      {
        method: "POST",
        body: JSON.stringify({ action, confirmationToken }),
      }
    ),
  getState: () => request<PrayerboxState>("/api/state"),
  getUsers: () => request<AuthUser[]>("/api/users"),
  register: async (name: string, email: string, password: string, phone: string, avatar: string) => {
    const response = await request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, phone, avatar }),
    });
    persistTokens(response.token, response.refreshToken);
    return response;
  },
  login: async (email: string, password: string) => {
    const response = await request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    persistTokens(response.token, response.refreshToken);
    return response;
  },
  logout: async () => {
    try {
      await request<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
    } finally {
      persistTokens("", "");
    }
  },
  logoutAll: async (includeCurrent = false) => {
    const response = await request<{ ok: boolean }>("/api/auth/logout-all", {
      method: "POST",
      body: JSON.stringify({ includeCurrent }),
    });
    if (includeCurrent) {
      persistTokens("", "");
    }
    return response;
  },
  getSessions: () => request<{ sessions: AuthSession[] }>("/api/auth/sessions"),
  revokeSession: (sessionId: string) =>
    request<{ ok: boolean }>(`/api/auth/sessions/${sessionId}`, { method: "DELETE" }),
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
