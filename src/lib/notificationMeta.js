/** Bildirim meta alanları (AI algılama JSON) */

export function formatGuven(guven) {
  if (guven == null || Number.isNaN(Number(guven))) return null;
  const g = Number(guven);
  const pct = g <= 1 ? g * 100 : g;
  return `${pct.toFixed(1)}%`;
}

export function formatMetaTime(meta, item, locale = "TR") {
  const raw = meta?.zaman;
  if (!raw) {
    if (item?.tarih && item?.zaman) return `${item.tarih} · ${item.zaman}`;
    return item?.zaman || "—";
  }
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleString(locale === "EN" ? "en-GB" : "tr-TR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return raw;
  }
}

export function metaRows(item, t) {
  const m = item?.meta || {};
  const rows = [];
  if (m.alan) rows.push({ label: t.alan, value: m.alan });
  const guven = formatGuven(m.guven);
  if (guven) rows.push({ label: t.dogruluk, value: guven });
  if (m.model) rows.push({ label: t.model, value: m.model });
  if (m.kamera_id) rows.push({ label: "ID", value: m.kamera_id });
  return rows;
}
