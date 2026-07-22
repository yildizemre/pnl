import { useState, useMemo } from "react";
import { Camera, Activity, Wifi, RefreshCw, CheckCircle, AlertTriangle, ShieldCheck, Cpu, Zap, Radio, Search, Filter, Clock, ShieldAlert, History, BarChart2 } from "lucide-react";

const CAMERA_HEALTH_DATA = [
  {
    id: "CAM-01",
    name: "Paketleme B Hattı",
    area: "Fabrika Katı - Konveyör",
    ip: "192.168.1.101",
    rtsp: "rtsp://192.168.1.101/live",
    latency: 12,
    fps: 60,
    res: "1080p",
    status: "online",
    dailyDowntimeMin: 0,
    uptimePct: "100%",
    lastDisconnect: "Bugün kopma yaşanmadı",
    disconnectCount: 0,
    theme: "white", // Design variety 1
  },
  {
    id: "CAM-02",
    name: "Konveyör A Giriş",
    area: "Lojistik & Depo A",
    ip: "192.168.1.102",
    rtsp: "rtsp://192.168.1.102/live",
    latency: 15,
    fps: 60,
    res: "1080p",
    status: "online",
    dailyDowntimeMin: 1.5,
    uptimePct: "99.89%",
    lastDisconnect: "Bugün 14:22 (45 Sn geçici parazit)",
    disconnectCount: 1,
    theme: "dark", // Design variety 2
  },
  {
    id: "CAM-03",
    name: "Metal Kaynak Atölyesi",
    area: "Atölye B - Pres Bölgesi",
    ip: "192.168.1.103",
    rtsp: "rtsp://192.168.1.103/live",
    latency: 18,
    fps: 60,
    res: "1080p",
    status: "online",
    dailyDowntimeMin: 0,
    uptimePct: "100%",
    lastDisconnect: "Bugün kopma yaşanmadı",
    disconnectCount: 0,
    theme: "emerald", // Design variety 3
  },
  {
    id: "CAM-04",
    name: "Merkez Depo Raf Alanı",
    area: "Depo C - Raf 14",
    ip: "192.168.1.104",
    rtsp: "rtsp://192.168.1.104/live",
    latency: 14,
    fps: 60,
    res: "1080p",
    status: "online",
    dailyDowntimeMin: 2.0,
    uptimePct: "99.86%",
    lastDisconnect: "Bugün 09:15 (1.2 Dk otomatik reconnect)",
    disconnectCount: 1,
    theme: "amber", // Design variety 4
  },
  {
    id: "CAM-05",
    name: "Montaj Hattı 1",
    area: "Fabrika Katı - Ana Montaj",
    ip: "192.168.1.105",
    rtsp: "rtsp://192.168.1.105/live",
    latency: 22,
    fps: 58,
    res: "1080p",
    status: "online",
    dailyDowntimeMin: 0,
    uptimePct: "100%",
    lastDisconnect: "Bugün kopma yaşanmadı",
    disconnectCount: 0,
    theme: "white",
  },
  {
    id: "CAM-06",
    name: "Pres Makinesi B-4",
    area: "Ağır Sanayi - Pres B",
    ip: "192.168.1.106",
    rtsp: "rtsp://192.168.1.106/live",
    latency: 16,
    fps: 60,
    res: "1080p",
    status: "online",
    dailyDowntimeMin: 0,
    uptimePct: "100%",
    lastDisconnect: "Bugün kopma yaşanmadı",
    disconnectCount: 0,
    theme: "dark",
  },
  {
    id: "CAM-07",
    name: "Yükleme Rampası 2",
    area: "Sevkiyat - Kapı 02",
    ip: "192.168.1.107",
    rtsp: "rtsp://192.168.1.107/live",
    latency: 19,
    fps: 60,
    res: "1080p",
    status: "online",
    dailyDowntimeMin: 0.8,
    uptimePct: "99.94%",
    lastDisconnect: "Bugün 11:04 (48 Sn sinyal yenileme)",
    disconnectCount: 1,
    theme: "emerald",
  },
  {
    id: "CAM-08",
    name: "Kalite Kontrol Masası",
    area: "Laboratuvar - Hassas Test",
    ip: "192.168.1.108",
    rtsp: "rtsp://192.168.1.108/live",
    latency: 11,
    fps: 60,
    res: "4K UHD",
    status: "online",
    dailyDowntimeMin: 0,
    uptimePct: "100%",
    lastDisconnect: "Bugün kopma yaşanmadı",
    disconnectCount: 0,
    theme: "white",
  },
];

export default function CameraHealthView() {
  const [cameras, setCameras] = useState(CAMERA_HEALTH_DATA);
  const [checking, setChecking] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [selectedCamLogs, setSelectedCamLogs] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleRunHealthCheck = () => {
    setChecking(true);
    showToast("Kamera ağ geçitlerine teşhis paketi gönderiliyor...");

    setTimeout(() => {
      setCameras((prev) =>
        prev.map((c) => ({
          ...c,
          latency: Math.floor(Math.random() * 10 + 10),
          fps: Math.random() > 0.1 ? 60 : 58,
        }))
      );
      setChecking(false);
      showToast("Sağlık teşhisi tamamlandı: Tüm kameralar aktif ve bağlantıda.");
    }, 1500);
  };

  const handleReconnectCamera = (cam) => {
    showToast(`${cam.name} RTSP hattı tazelendi. Kopma kaydı sıfırlandı.`);
  };

  const filteredCameras = useMemo(() => {
    return cameras.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.ip.includes(search));
  }, [cameras, search]);

  const totalDowntimeMin = useMemo(() => {
    return cameras.reduce((acc, c) => acc + c.dailyDowntimeMin, 0).toFixed(1);
  }, [cameras]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 text-white shadow-2xl text-xs font-black">
          <CheckCircle size={16} />
          {toast}
        </div>
      )}

      {/* Disconnect Log Modal */}
      {selectedCamLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedCamLogs(null)}>
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200 text-slate-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-[#00BCD4]" />
                <h3 className="text-base font-extrabold font-display">{selectedCamLogs.name} — Kopma & Sinyal Günlüğü</h3>
              </div>
              <button onClick={() => setSelectedCamLogs(null)} className="text-slate-400 hover:text-slate-700 font-bold text-sm">✕</button>
            </div>
            
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="font-bold text-slate-600">Günlük Toplam Kesinti:</span>
                <span className="font-black text-emerald-600 text-sm">{selectedCamLogs.dailyDowntimeMin} Dk</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                <span className="font-bold text-slate-600">Çalışma Süresi Oranı:</span>
                <span className="font-black text-slate-900 text-sm">{selectedCamLogs.uptimePct}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                <span className="font-extrabold block">Son Olay Detayı:</span>
                <p className="font-medium text-xs text-amber-800">{selectedCamLogs.lastDisconnect}</p>
              </div>
            </div>

            <button onClick={() => setSelectedCamLogs(null)} className="w-full py-2.5 rounded-2xl bg-[#00BCD4] text-white text-xs font-black shadow-lg">
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* Header Panel */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-2xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#00BCD4] shadow-lg shrink-0">
            <Radio className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-black font-display flex items-center gap-2">
              Kamera Sağlığı & Kesinti Teşhis Ekranı
              <span className="text-xs font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                24/24 SİSTEM AKTİF
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 font-medium">
              Kameraların günlük kopma süreleri, dakikalık kesinti geçmişi ve RTSP ağ sağlık raporları.
            </p>
          </div>
        </div>

        <button
          onClick={handleRunHealthCheck}
          disabled={checking}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#00BCD4] hover:bg-cyan-600 text-white text-xs font-black shadow-xl shadow-cyan-500/20 transition-all duration-300 shrink-0"
        >
          <RefreshCw size={16} className={checking ? "animate-spin" : ""} />
          {checking ? "Teşhis Yapılıyor..." : "Health Check Başlat"}
        </button>
      </div>

      {/* Top Telemetry Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-lg flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-cyan-50 text-[#00BCD4] border border-cyan-100">
            <Camera size={22} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Toplam Kamera</span>
            <strong className="text-xl font-black text-slate-900 block">24 / 24 Bağlı</strong>
            <span className="text-[10px] font-bold text-emerald-600">✓ Sıfır Kalıcı Kopma</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-lg flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Clock size={22} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Toplam Günlük Kesinti</span>
            <strong className="text-xl font-black text-slate-900 block">{totalDowntimeMin} Dk</strong>
            <span className="text-[10px] font-bold text-emerald-600">⚡ Tesis Geneli %99.9 Uptime</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-lg flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Activity size={22} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Ortalama RTSP Ping</span>
            <strong className="text-xl font-black text-slate-900 block">14.5 ms</strong>
            <span className="text-[10px] font-bold text-indigo-600">🎥 60 FPS Kesintisiz</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-lg flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
            <ShieldCheck size={22} />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Sağlık Skoru</span>
            <strong className="text-xl font-black text-slate-900 block">%99.8 Mükemmel</strong>
            <span className="text-[10px] font-bold text-purple-600">🛡️ Otomatik Reconnect Aktif</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-md flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Kamera adı, bölge veya IP adresi ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#00BCD4]"
          />
        </div>
        <div className="text-xs font-extrabold text-slate-500 font-mono">
          {filteredCameras.length} Kamera Listeleniyor
        </div>
      </div>

      {/* Camera Health Grid with Dynamic Visual Themes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {filteredCameras.map((cam) => {
          const isWhite = cam.theme === "white";
          const isEmerald = cam.theme === "emerald";
          const isAmber = cam.theme === "amber";

          return (
            <div
              key={cam.id}
              className={`p-5 rounded-3xl border shadow-xl flex flex-col justify-between space-y-4 transition-all duration-300 hover:-translate-y-1 ${
                isWhite
                  ? "bg-white border-slate-200 text-slate-800 hover:border-cyan-400"
                  : isEmerald
                  ? "bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 border-emerald-500/40 text-white"
                  : isAmber
                  ? "bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950 border-amber-500/40 text-white"
                  : "bg-slate-900 border-slate-800 text-white"
              }`}
            >
              {/* Top Row: ID & Status */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                    isWhite ? "bg-slate-100 text-slate-700 border-slate-200" : "bg-slate-800 text-cyan-400 border-slate-700"
                  }`}>
                    {cam.id}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 text-[10px] font-extrabold border border-emerald-400/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Erişilebilir
                  </span>
                </div>

                <h4 className="text-sm font-extrabold font-display truncate">
                  {cam.name}
                </h4>
                <p className={`text-xs font-medium ${isWhite ? "text-slate-500" : "text-slate-400"}`}>{cam.area}</p>
              </div>

              {/* Middle Breakdown: Daily Disconnection Minutes & Uptime */}
              <div className={`p-3.5 rounded-2xl border space-y-2 text-xs ${
                isWhite ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
              }`}>
                <div className="flex justify-between items-center">
                  <span className={isWhite ? "text-slate-500 font-medium" : "text-slate-400"}>Günlük Kopma Süresi:</span>
                  <span className={`font-black font-mono text-xs ${
                    cam.dailyDowntimeMin === 0 ? "text-emerald-600" : "text-amber-600"
                  }`}>
                    {cam.dailyDowntimeMin === 0 ? "0 Dk (Kopma Yok)" : `${cam.dailyDowntimeMin} Dk`}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className={isWhite ? "text-slate-500 font-medium" : "text-slate-400"}>Çalışma Oranı (Uptime):</span>
                  <span className={`font-extrabold font-mono ${isWhite ? "text-slate-900" : "text-white"}`}>{cam.uptimePct}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className={isWhite ? "text-slate-500 font-medium" : "text-slate-400"}>Ping / FPS:</span>
                  <span className="font-mono text-[#00BCD4] font-bold">{cam.latency}ms · {cam.fps} FPS</span>
                </div>
              </div>

              {/* 24-Hour Availability Bar Representation */}
              <div>
                <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                  <span>24 Saatlik Sinyal Akışı</span>
                  <span className="text-emerald-500 font-mono">100% OK</span>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 24 }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-2 flex-1 rounded-sm ${
                        cam.dailyDowntimeMin > 0 && (idx === 14 || idx === 9) ? "bg-amber-400" : "bg-emerald-500"
                      }`}
                      title={`${idx}:00 - Sinyal Tam`}
                    />
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setSelectedCamLogs(cam)}
                  className={`py-2 rounded-xl text-xs font-extrabold border transition flex items-center justify-center gap-1 ${
                    isWhite ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                  }`}
                >
                  <History size={13} /> Günlük
                </button>

                <button
                  onClick={() => handleReconnectCamera(cam)}
                  className="py-2 rounded-xl bg-[#00BCD4] hover:bg-cyan-600 text-white text-xs font-black shadow-md transition flex items-center justify-center gap-1"
                >
                  <RefreshCw size={13} /> Reconnect
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}