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

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err.detail;
    const msg =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => d.msg).join(", ")
          : `API hatası: ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

async function fetchBlob(path) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`İndirme hatası: ${res.status}`);
  return res.blob();
}

export const api = {
  login: (email, password) =>
    fetchJson("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
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
  addNotification: (formData) => fetchJson("/api/notifications", { method: "POST", body: formData }),
  productCounts: (tarih) => fetchJson(`/api/counts/products${tarih ? `?tarih=${tarih}` : ""}`),
  getCameras: () => fetchJson("/api/settings/cameras"),
  cameraStream: (id) => fetchJson(`/api/cameras/${id}/stream`),
  addCamera: (body) => fetchJson("/api/settings/cameras", { method: "POST", body: JSON.stringify(body) }),
  updateCamera: (id, body) =>
    fetchJson(`/api/settings/cameras/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteCamera: (id) => fetchJson(`/api/settings/cameras/${id}`, { method: "DELETE" }),
  changePassword: (mevcut_sifre, yeni_sifre) =>
    fetchJson("/api/settings/password", {
      method: "POST",
      body: JSON.stringify({ mevcut_sifre, yeni_sifre }),
    }),
  exportReport: (title, format = "pdf") =>
    fetchBlob(`/api/reports/export?title=${encodeURIComponent(title)}&format=${format}`),
  dailyEmail: () => fetchJson("/api/reports/daily-email", { method: "POST" }),
};

export function mediaUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
}

export function wsUrl() {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = import.meta.env.VITE_API_URL
    ? new URL(import.meta.env.VITE_API_URL).host
    : window.location.host;
  const token = getToken();
  return `${proto}//${host}/api/ws?token=${encodeURIComponent(token || "")}`;
}
