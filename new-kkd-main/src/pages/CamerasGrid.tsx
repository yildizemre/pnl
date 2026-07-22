import React, { useState, useEffect } from 'react';
import { Camera, Wifi, Radio, Maximize2, Shield, AlertTriangle, Eye, RefreshCw, Layers } from 'lucide-react';
import { fetchCameras } from '../services/api';

interface CameraItem {
  id: string;
  name: string;
  macAddress: string;
  rtspUrl: string;
  active: boolean;
  alerts24h: number;
  lastSeen: string;
  snapshotUrl?: string;
  fps?: number;
  resolution?: string;
}

export default function CamerasGrid() {
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'alerts'>('all');
  const [activeCam, setActiveCam] = useState<CameraItem | null>(null);

  const loadCameras = () => {
    setLoading(true);
    fetchCameras().then((res: any[]) => {
      const enriched = res.map((c, i) => ({
        ...c,
        fps: 24 + (i % 3) * 3,
        resolution: i % 2 === 0 ? '1920x1080' : '2560x1440',
        active: i !== 5, // make Camera 06 simulated inactive sometimes or customized
      }));
      setCameras(enriched);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadCameras();
    const interval = setInterval(() => {
      // Simulate slight fps variations
      setCameras((prev) =>
        prev.map((c) => ({
          ...c,
          fps: c.active ? Math.max(15, Math.min(30, (c.fps || 25) + (Math.random() > 0.5 ? 1 : -1))) : 0,
        }))
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const filtered = cameras.filter((c) => {
    if (filter === 'active') return c.active;
    if (filter === 'alerts') return c.alerts24h > 10;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="card-premium animate-fade-up" style={{ borderTop: '3px solid #00BCD4' }}>
        <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0" style={{ background: 'linear-gradient(135deg, #0B3C5D, #00BCD4)' }}>
              <Camera size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-extrabold text-slate-800 font-display">Canlı Kamera Akışları</h2>
                <span className="text-[10px] text-[#00BCD4] bg-[#00BCD4]/10 px-2 py-0.5 rounded-full font-bold border border-[#00BCD4]/25">LIVE</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">Yapay zeka analizli aktif ve pasif video akışlarını tek bir ızgarada izleyin.</p>
            </div>
          </div>
          <button onClick={loadCameras} className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-200 transition-colors">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Yenile
          </button>
        </div>
      </div>

      {/* Filter and stats row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 p-1 rounded-xl shadow-sm">
          {[
            { id: 'all', label: 'Tüm Kameralar' },
            { id: 'active', label: 'Sadece Aktif' },
            { id: 'alerts', label: 'Yüksek Riskli (>10 Olay)' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id as any)}
              className={`text-xs font-bold px-3 py-2 rounded-lg transition-all ${
                filter === t.id ? 'bg-[#00BCD4] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block animate-pulse" /> Aktif: {cameras.filter(c => c.active).length}</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-slate-300 rounded-full inline-block" /> Pasif: {cameras.filter(c => !c.active).length}</span>
        </div>
      </div>

      {/* Grid container */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card-premium h-56 p-2 flex flex-col justify-between">
              <div className="skeleton w-full h-36 rounded-xl" />
              <div className="space-y-1.5 p-2">
                <div className="skeleton w-3/4 h-3.5 rounded" />
                <div className="skeleton w-1/2 h-2.5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((cam) => (
            <div key={cam.id} className="card-premium group hover:border-[#00BCD4]/40 hover:shadow-glow-cyan transition-all duration-300 overflow-hidden flex flex-col">
              {/* Snapshot / Video Simulator */}
              <div className="relative aspect-video bg-slate-950 overflow-hidden flex-shrink-0">
                {cam.active && cam.snapshotUrl ? (
                  <>
                    <img src={cam.snapshotUrl} alt={cam.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80" />
                    {/* Blinking Red LIVE Dot */}
                    <div className="absolute top-3 left-3 bg-red-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shadow-md select-none">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                      <span>CANLI</span>
                    </div>
                    {/* Resolution Overlay */}
                    <div className="absolute bottom-2 left-2 bg-slate-900/60 backdrop-blur-sm text-[9px] font-mono text-white/80 px-1.5 py-0.5 rounded">
                      {cam.resolution}
                    </div>
                    {/* FPS Overlay */}
                    <div className="absolute bottom-2 right-2 bg-slate-900/60 backdrop-blur-sm text-[9px] font-mono text-white/80 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Radio size={9} className="text-emerald-400" />
                      <span>{cam.fps} FPS</span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-4">
                    <AlertTriangle size={24} className="text-amber-500 mb-1" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Kamera Çevrimdışı</span>
                    <span className="text-[9px] text-slate-600 mt-0.5 font-mono">{cam.id}</span>
                  </div>
                )}

                {/* Overlays on hover */}
                {cam.active && (
                  <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => setActiveCam(cam)}
                      className="p-2.5 bg-white/90 hover:bg-white text-[#0B3C5D] rounded-xl transition-all hover:scale-105 shadow-lg"
                      title="Büyüt ve İzle"
                    >
                      <Maximize2 size={14} />
                    </button>
                    <div className="p-2.5 bg-white/90 text-slate-600 rounded-xl shadow-lg text-[10px] font-bold">
                      {cam.macAddress}
                    </div>
                  </div>
                )}
              </div>

              {/* Title & Info */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-slate-700 leading-tight truncate group-hover:text-[#0B3C5D]">{cam.name.replace('Kamera ', 'Kam ')}</p>
                    <span className="text-[9px] font-mono bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded border border-slate-200/80">{cam.id}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono mt-1 truncate">{cam.rtspUrl}</p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                  <span className="flex items-center gap-1"><Shield size={11} className="text-[#00BCD4]" /> AI Aktif</span>
                  {cam.alerts24h > 10 ? (
                    <span className="text-red-500 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <AlertTriangle size={10} /> {cam.alerts24h} olay
                    </span>
                  ) : (
                    <span className="text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                      {cam.alerts24h} olay
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox / Video Akış Detayı Popup */}
      {activeCam && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" onClick={() => setActiveCam(null)}>
          <div className="relative max-w-4xl w-full rounded-3xl shadow-2xl overflow-hidden bg-slate-950 border border-slate-800 animate-modal-in" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-white">
                <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                  <Radio size={14} className="animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-bold">{activeCam.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{activeCam.id} · {activeCam.rtspUrl}</p>
                </div>
              </div>
              <button onClick={() => setActiveCam(null)} className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                <X size={15} />
              </button>
            </div>
            
            <div className="relative aspect-video">
              <img src={activeCam.snapshotUrl} alt={activeCam.name} className="w-full h-full object-cover" />
              {/* Simulator overlay stats */}
              <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md border border-slate-800 p-3 rounded-2xl text-[10px] font-mono text-slate-300 space-y-1">
                <p><span className="text-slate-500">FPS:</span> <span className="text-emerald-400 font-bold">{activeCam.fps} FPS</span></p>
                <p><span className="text-slate-500">Bant Genişliği:</span> 1.4 Mbps</p>
                <p><span className="text-slate-500">Çözünürlük:</span> {activeCam.resolution}</p>
                <p><span className="text-slate-500">Gecikme:</span> 42ms</p>
              </div>

              {/* Bounding box mock visualization */}
              <div className="absolute border-2 border-emerald-500 rounded-lg p-1 animate-pulse" style={{ top: '40%', left: '20%', width: '100px', height: '140px' }}>
                <span className="bg-emerald-500 text-white text-[8px] font-bold px-1 py-0.5 rounded absolute -top-4 -left-0.5 whitespace-nowrap">Barett / Yelek (OK)</span>
              </div>
              <div className="absolute border-2 border-red-500 rounded-lg p-1 animate-pulse" style={{ top: '35%', left: '60%', width: '80px', height: '120px' }}>
                <span className="bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded absolute -top-4 -left-0.5 whitespace-nowrap">Baret Yok</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function X({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}
