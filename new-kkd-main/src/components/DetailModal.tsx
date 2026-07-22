import React from 'react';
import { X, Camera, Wifi, Clock, AlertTriangle, CheckCircle, Bell, Flag, ExternalLink, Copy } from 'lucide-react';

export interface AlertDetail {
  id: string;
  type: string;
  label: string;
  severity: string;
  cameraId: string;
  cameraName: string;
  macAddress: string;
  rtspUrl: string;
  imageUrl: string;
  timestamp: string;
  status: string;
}

interface DetailModalProps {
  alert: AlertDetail | null;
  onClose: () => void;
}

const SEVERITY_META: Record<string, { label: string; bg: string; text: string; border: string }> = {
  critical: { label: 'KRİTİK', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  warning: { label: 'UYARI', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  info: { label: 'BİLGİ', bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200' },
};

const TYPE_COLORS: Record<string, string> = {
  ppe: '#F59E0B',
  fire: '#EF4444',
  intrusion: '#F97316',
  fall: '#EC4899',
  counting: '#06B6D4',
};

export default function DetailModal({ alert, onClose }: DetailModalProps) {
  if (!alert) return null;

  const sev = SEVERITY_META[alert.severity] || SEVERITY_META.info;
  const accentColor = TYPE_COLORS[alert.type] || '#00BCD4';
  const time = new Date(alert.timestamp);
  const timeStr = time.toLocaleString('tr-TR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  const copyToClipboard = (text: string) => navigator.clipboard?.writeText(text);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-modal-in bg-white border border-slate-200/80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent bar — navy to accent gradient */}
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, #0B3C5D, ${accentColor}, #00BCD4)` }} />

        {/* Header */}
        <div className="px-6 py-4 flex items-start justify-between border-b border-slate-100/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md" style={{ backgroundColor: accentColor }}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 font-display">{alert.label}</h2>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">{alert.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${sev.bg} ${sev.text} ${sev.border}`}>
              {sev.label}
            </span>
            <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Image */}
        <div className="relative">
          <img src={alert.imageUrl} alt={alert.label} className="w-full h-64 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full text-white ${alert.status === 'resolved' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                {alert.status === 'resolved' ? 'ÇÖZÜLDÜ' : 'AÇIK'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-white text-xs">
              <Clock size={12} />
              <span>{timeStr}</span>
            </div>
          </div>
        </div>

        {/* Camera Details */}
        <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-slate-100/80">
          <DetailItem icon={<Camera size={14} />} label="Kamera" value={alert.cameraName} copyable={false} />
          <DetailItem icon={<Wifi size={14} />} label="MAC Adresi" value={alert.macAddress} copyable onCopy={() => copyToClipboard(alert.macAddress)} />
          <DetailItem icon={<ExternalLink size={14} />} label="RTSP Stream" value={alert.rtspUrl} copyable onCopy={() => copyToClipboard(alert.rtspUrl)} truncate />
        </div>

        {/* Action buttons */}
        <div className="px-6 py-4 flex items-center gap-3 flex-wrap">
          <ActionButton icon={<Bell size={14} />} label="Sorumluya Bildir" variant="primary" />
          <ActionButton icon={<CheckCircle size={14} />} label="Çözüldü İşaretle" variant="success" />
          <ActionButton icon={<Flag size={14} />} label="Yanlış Alarm" variant="ghost" />
        </div>
      </div>
    </div>
  );
}

function DetailItem({ icon, label, value, copyable, onCopy, truncate }: {
  icon: React.ReactNode; label: string; value: string; copyable?: boolean; onCopy?: () => void; truncate?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
      <span className="text-[#00BCD4] mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
        <p className={`text-xs font-semibold text-slate-700 mt-0.5 ${truncate ? 'truncate' : ''}`}>{value}</p>
      </div>
      {copyable && (
        <button onClick={onCopy} className="text-slate-300 hover:text-[#00BCD4] transition-colors flex-shrink-0">
          <Copy size={12} />
        </button>
      )}
    </div>
  );
}

function ActionButton({ icon, label, variant }: { icon: React.ReactNode; label: string; variant: 'primary' | 'success' | 'ghost' }) {
  const styles = {
    primary: 'text-white hover:shadow-[0_8px_24px_rgba(0,188,212,0.3)] shadow-sm',
    success: 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm',
    ghost: 'bg-slate-100 text-slate-600 hover:bg-slate-200',
  };
  return (
    <button
      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${styles[variant]}`}
      style={variant === 'primary' ? { background: 'linear-gradient(135deg, #0B3C5D, #00BCD4)' } : undefined}
    >
      {icon} {label}
    </button>
  );
}
