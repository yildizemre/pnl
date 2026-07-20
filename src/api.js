import { humanizeApiError, humanizeNetworkError } from "./lib/apiErrors";

const API_BASE = import.meta.env.VITE_API_URL || "";

function getToken() {
  return localStorage.getItem("hv_token");
}

async function fetchJson(path, options = {}) {
  const headers = { ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const timeoutMs = options.timeoutMs ?? 20000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    throw new Error(humanizeNetworkError(err));
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = humanizeApiError(res.status, err.detail);
    const error = new Error(msg);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

async function fetchBlob(path) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(humanizeApiError(res.status, err.detail));
  }
  return res.blob();
}

export const api = {
  login: (loginId, password) =>
    fetchJson("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ login: loginId, email: loginId, password }),
    }),
  me: () => fetchJson("/api/auth/me"),
  savePreferences: (dashboard_layout, onboarding_done) =>
    fetchJson("/api/user/preferences", {
      method: "PUT",
      body: JSON.stringify({ dashboard_layout, onboarding_done }),
    }),
  impersonate: (userId) => fetchJson(`/api/admin/impersonate/${userId}`, { method: "POST" }),
  listUsers: () => fetchJson("/api/admin/users"),
  createUser: (body) => fetchJson("/api/admin/users", { method: "POST", body: JSON.stringify(body) }),
  deleteUser: (userId) => fetchJson(`/api/admin/users/${userId}`, { method: "DELETE" }),
  mesProductivity: (tarih) => fetchJson(`/api/mes/productivity${tarih ? `?tarih=${tarih}` : ""}`),
  reportsKpis: (tarih) => fetchJson(`/api/reports/kpis${tarih ? `?tarih=${tarih}` : ""}`),
  heartbeat: (camera_id) =>
    fetchJson("/api/heartbeat", { method: "POST", body: JSON.stringify({ camera_id }) }),
  systemStatus: () => fetchJson("/api/system/status"),
  dashboardAll: (compare) =>
    fetchJson(`/api/dashboard/all${compare ? `?compare=${compare}` : ""}`),
  recentNotifications: (limit = 10) => fetchJson(`/api/notifications/recent?limit=${limit}`),
  notifications: () => fetchJson("/api/notifications"),
  markNotificationRead: (id) => fetchJson(`/api/notifications/${id}/read`, { method: "PATCH" }),
  notificationFeedback: (id, label) =>
    fetchJson(`/api/notifications/${id}/feedback`, { method: "POST", body: JSON.stringify({ label }) }),
  markAllNotificationsRead: () => fetchJson("/api/notifications/read-all", { method: "PATCH" }),
  unreadCount: () => fetchJson("/api/notifications/unread-count"),
  addNotification: (formData) => fetchJson("/api/notifications", { method: "POST", body: formData }),
  listApiKeys: (userId) => fetchJson(`/api/admin/users/${userId}/api-keys`),
  createApiKey: (userId, label) =>
    fetchJson(`/api/admin/users/${userId}/api-keys`, { method: "POST", body: JSON.stringify({ label }) }),
  deleteApiKey: (keyId) => fetchJson(`/api/admin/api-keys/${keyId}`, { method: "DELETE" }),
  productCounts: (tarih) => fetchJson(`/api/counts/products${tarih ? `?tarih=${tarih}` : ""}`),
  notificationInsights: (tarih) => fetchJson(`/api/notifications/insights${tarih ? `?tarih=${tarih}` : ""}`),
  changePassword: (mevcut_sifre, yeni_sifre) =>
    fetchJson("/api/settings/password", {
      method: "POST",
      body: JSON.stringify({ mevcut_sifre, yeni_sifre }),
    }),
  exportReport: (title, format = "pdf") =>
    fetchBlob(`/api/reports/export?title=${encodeURIComponent(title)}&format=${format}`),
  dailyEmail: () => fetchJson("/api/reports/daily-email", { method: "POST" }),
  integrationStatus: () => fetchJson("/api/user/integration"),
  integrationTest: () => fetchJson("/api/user/integration/test", { method: "POST" }),
  trainingFeedbackReport: (days = 7) => fetchJson(`/api/reports/training-feedback?days=${days}`),
  resetPanelData: (userId) => fetchJson(`/api/admin/users/${userId}/reset-panel-data`, { method: "POST" }),
};

export function mediaUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
}

export function wsUrl() {
  const token = getToken();
  const q = `token=${encodeURIComponent(token || "")}`;

  // Üretim: aynı host üzerinden
  const apiBase = import.meta.env.VITE_API_URL;
  if (apiBase) {
    const url = new URL(apiBase);
    const proto = url.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${url.host}/api/ws?${q}`;
  }

  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/api/ws?${q}`;
}
