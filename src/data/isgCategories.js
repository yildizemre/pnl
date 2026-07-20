import { Bell } from "lucide-react";
import { EVENT_TYPES, eventColor, eventIcon, eventLabel } from "./notificationTypes";

const PALETTE = [
  "#1e3a5f", "#ef4444", "#f59e0b", "#22c55e", "#06b6d4",
  "#8b5cf6", "#ec4899", "#6366f1", "#14b8a6", "#f97316",
  "#84cc16", "#0ea5e9", "#a855f7", "#e11d48", "#64748b",
];

const KNOWN = new Set(EVENT_TYPES.map((t) => t.id));

function hashColor(name) {
  let h = 0;
  const s = String(name || "");
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** Bildirim JSON'daki kategori alanından dinamik dağılım (sabit liste yok). */
export function groupNotificationsByCategory(notifications = [], locale = "TR") {
  const counts = new Map();
  notifications.forEach((n) => {
    const kat = String(n.kategori || n.category || "Sistem").trim() || "Sistem";
    counts.set(kat, (counts.get(kat) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([kategori, adet]) => ({
      id: kategori,
      kategori,
      label: eventLabel(kategori, locale) || kategori,
      labelTr: kategori,
      labelEn: kategori,
      adet,
      color: KNOWN.has(kategori) ? eventColor(kategori) : hashColor(kategori),
      icon: eventIcon(kategori) || Bell,
    }))
    .sort((a, b) => b.adet - a.adet);
}

function parseNotifDate(n) {
  if (n?.tarih) {
    const d = new Date(`${n.tarih}T12:00:00`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const raw = String(n?.zaman || "");
  if (raw.includes("T")) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function startOfWeek(d) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Pazartesi başlangıç
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function buildHourlyDensity(notifications = []) {
  const buckets = Array.from({ length: 24 }, (_, h) => ({
    saat: `${String(h).padStart(2, "0")}:00`,
    adet: 0,
  }));
  notifications.forEach((n) => {
    const raw = String(n.zaman || "");
    let h = -1;
    if (raw.includes("T")) {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) h = d.getHours();
    } else {
      const m = raw.match(/^(\d{1,2})/);
      if (m) h = Number(m[1]);
    }
    if (h >= 0 && h < 24) buckets[h].adet += 1;
  });
  return buckets;
}

export function peakHourLabel(hourly = []) {
  if (!hourly.length) return null;
  let best = hourly[0];
  hourly.forEach((row) => {
    if (row.adet > best.adet) best = row;
  });
  if (!best.adet) return null;
  const h = Number(best.saat.slice(0, 2));
  const next = `${String((h + 1) % 24).padStart(2, "0")}:00`;
  return `${best.saat}-${next}`;
}

const WEEKDAY_TR = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const WEEKDAY_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Bu haftanın (Pzt–Paz) günlük bildirim sayıları — yalnız bildirimlerden. */
export function buildWeeklyDistribution(notifications = [], locale = "TR") {
  const labels = locale === "EN" ? WEEKDAY_EN : WEEKDAY_TR;
  const now = new Date();
  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const counts = Array(7).fill(0);
  notifications.forEach((n) => {
    const d = parseNotifDate(n);
    if (!d || d < weekStart || d >= weekEnd) return;
    // Pazartesi=0 … Pazar=6
    const js = d.getDay();
    const idx = js === 0 ? 6 : js - 1;
    counts[idx] += 1;
  });
  return labels.map((gun, i) => ({ gun, adet: counts[i] }));
}

const MONTH_TR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const MONTH_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Son 12 ay — her ayın bildirim sayısı (JSON tarih alanından). */
export function buildMonthlyTrend(notifications = [], locale = "TR", months = 12) {
  const labels = locale === "EN" ? MONTH_EN : MONTH_TR;
  const now = new Date();
  const map = new Map();
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    map.set(key, { ay: labels[d.getMonth()], adet: 0, key });
  }
  notifications.forEach((n) => {
    const d = parseNotifDate(n);
    if (!d) return;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (map.has(key)) map.get(key).adet += 1;
  });
  return Array.from(map.values());
}
