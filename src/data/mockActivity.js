export function buildActivityFeed(notifications = [], locale = "TR") {
  const fromApi = (notifications || []).slice(0, 6).map((n, i) => ({
    id: n.id ?? `n-${i}`,
    time: n.zaman || "—",
    camera: n.kamera || "—",
    title: n.baslik || "—",
    type: n.kategori || n.seviye || "bilgi",
  }));

  if (fromApi.length >= 4) return fromApi;

  const demo = locale === "EN"
    ? [
        { id: "d1", time: "14:32", camera: "Hype Camera 3", title: "OHS zone violation", type: "isg" },
        { id: "d2", time: "14:18", camera: "Hype Camera 1", title: "Line count +12%", type: "sayim" },
        { id: "d3", time: "13:55", camera: "Hype Camera 5", title: "PPE check passed", type: "mes" },
        { id: "d4", time: "13:40", camera: "Hype Camera 2", title: "Product pallet detected", type: "urun" },
        { id: "d5", time: "13:12", camera: "Hype Camera 4", title: "Shift efficiency 87%", type: "mes" },
      ]
    : [
        { id: "d1", time: "14:32", camera: "Hype Kamera 3", title: "İSG bölge ihlali", type: "isg" },
        { id: "d2", time: "14:18", camera: "Hype Kamera 1", title: "Hat sayımı +%12", type: "sayim" },
        { id: "d3", time: "13:55", camera: "Hype Kamera 5", title: "KKD kontrolü OK", type: "mes" },
        { id: "d4", time: "13:40", camera: "Hype Kamera 2", title: "Palet algılandı", type: "urun" },
        { id: "d5", time: "13:12", camera: "Hype Kamera 4", title: "Vardiya verim %87", type: "mes" },
      ];

  return [...fromApi, ...demo].slice(0, 6);
}
