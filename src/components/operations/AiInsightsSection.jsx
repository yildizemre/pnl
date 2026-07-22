import { useState } from "react";
import { Sparkles, BrainCircuit, ShieldCheck, Zap, ArrowUpRight, CheckCircle2, RefreshCw } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";

export default function AiInsightsSection() {
  const { locale } = useLocale();
  const [refreshed, setRefreshed] = useState(false);

  const handleRefresh = () => {
    setRefreshed(true);
    setTimeout(() => setRefreshed(false), 1200);
  };

  const isEn = locale === "EN";

  const insights = [
    {
      id: 1,
      category: isEn ? "HSE Predictive Risk" : "İSG Risk Tahmini",
      badge: isEn ? "High Priority" : "Yüksek Öncelik",
      color: "from-rose-500/15 to-rose-500/5 border-rose-500/30 text-rose-400",
      accentDot: "bg-rose-400",
      icon: ShieldCheck,
      title: isEn ? "Packaging Line B Safety Anomaly" : "Paketleme B Hattı İSG Riski",
      desc: isEn 
        ? "AI model detected 14% increase in helmet compliance violations during Shift 2. Automated audio warnings activated." 
        : "Vardiya 2'de Paketleme B hattında baret ihlali riski %14 arttı. Yapay zeka sesli ikaz sistemini otomatik tetikledi.",
      metric: "%98.4 AI Confidence",
    },
    {
      id: 2,
      category: isEn ? "Inventory & Count Optimization" : "Sayım & Stok Öngörüsü",
      badge: isEn ? "Optimal" : "Optimum",
      color: "from-sky-500/15 to-sky-500/5 border-sky-500/30 text-sky-400",
      accentDot: "bg-sky-400",
      icon: Zap,
      title: isEn ? "Pallet Count Variance Alert" : "Palet Sayım Sapma Uyarısı",
      desc: isEn 
        ? "Logistics Depot A pallet scan showed 0.3% variance against ERP inventory. RFID label recalibration recommended." 
        : "Lojistik A deposundaki palet sayımında %0.3 sapma tespit edildi. ERP eşleşmesi için etiket taraması öneriliyor.",
      metric: "99.7% Accuracy",
    },
    {
      id: 3,
      category: isEn ? "AI Shift Recommendation" : "Akıllı Vardiya Önerisi",
      badge: isEn ? "Smart Patrol" : "Akıllı Devriye",
      color: "from-purple-500/15 to-purple-500/5 border-purple-500/30 text-purple-400",
      accentDot: "bg-purple-400",
      icon: BrainCircuit,
      title: isEn ? "Wednesday Peak Hour Recommendation" : "Çarşamba Yoğunluk Önerisi",
      desc: isEn 
        ? "Historical analysis suggests scheduling an additional safety patrol on Wednesdays between 14:00 - 16:00." 
        : "Son 7 günün ihlal trendi incelendi. Çarşamba günleri 14:00 - 16:00 saatleri arasına ek devriye planlanması önerilir.",
      metric: "+24% Risk Reduction",
    },
  ];

  return (
    <section className="space-y-4 my-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-slate-900/80 via-slate-800/60 to-slate-900/80 border border-slate-700/50 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/30 via-purple-500/30 to-pink-500/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-md">
            <Sparkles size={20} className={refreshed ? "animate-spin" : "animate-pulse"} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2 font-display">
              {isEn ? "AI Smart Insights & Predictive Analytics" : "Akıllı Öngörüler & AI Analiz Raporları"}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                v2.1 Real-time
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEn ? "Continuous deep learning telemetry from 24 camera feeds." : "24 kamera akışından anlık derin öğrenme telemetrisi ve öneriler."}
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 border border-white/10 transition-all self-end sm:self-auto"
        >
          <RefreshCw size={13} className={refreshed ? "animate-spin" : ""} />
          {isEn ? "Refresh Analysis" : "Analizi Yenile"}
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className={`p-5 rounded-2xl bg-gradient-to-br ${card.color} backdrop-blur-xl border transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-2xl flex flex-col justify-between group`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${card.accentDot} animate-ping`} />
                    {card.category}
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-white/10 text-white border border-white/15">
                    {card.badge}
                  </span>
                </div>

                <div className="flex items-start gap-3 pt-1">
                  <div className="p-2 rounded-xl bg-white/10 text-white shrink-0 group-hover:scale-110 transition-transform">
                    <Icon size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-white leading-snug group-hover:text-cyan-300 transition-colors">
                      {card.title}
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-bold text-slate-300">
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 size={13} />
                  {card.metric}
                </span>
                <span className="flex items-center gap-0.5 text-cyan-400 group-hover:translate-x-1 transition-transform cursor-pointer">
                  {isEn ? "Details" : "Detaylar"} <ArrowUpRight size={13} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}