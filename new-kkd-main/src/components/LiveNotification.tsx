import React, { useState, useEffect, useCallback } from 'react';
import { X, AlertTriangle, Flame, ShieldAlert, PersonStanding, HardHat, ChevronRight, Trash2 } from 'lucide-react';
import { fetchLiveNotification, deleteNotification } from '../services/api';
import { AlertDetail } from './DetailModal';

interface NotifEntry extends AlertDetail {
  isNew?: boolean;
}

const TYPE_META: Record<string, { icon: React.ReactNode; color: string; border: string; accent: string }> = {
  ppe:       { icon: <HardHat size={15} />,       color: 'text-amber-600',  border: 'border-amber-200',  accent: 'bg-amber-500'  },
  fire:      { icon: <Flame size={15} />,         color: 'text-red-600',    border: 'border-red-200',    accent: 'bg-red-500'    },
  intrusion: { icon: <ShieldAlert size={15} />,  color: 'text-orange-600', border: 'border-orange-200', accent: 'bg-orange-500' },
  fall:      { icon: <PersonStanding size={15} />, color: 'text-pink-600',  border: 'border-pink-200',   accent: 'bg-pink-500'   },
  counting:  { icon: <AlertTriangle size={15} />, color: 'text-cyan-600',  border: 'border-cyan-200',   accent: 'bg-cyan-500'   },
};

interface LiveNotificationProps {
  onOpenModal: (alert: AlertDetail) => void;
}

export default function LiveNotification({ onOpenModal }: LiveNotificationProps) {
  const [byType, setByType] = useState<Record<string, NotifEntry>>({});

  const pushNotif = useCallback(async () => {
    const notif = await fetchLiveNotification() as NotifEntry;
    notif.isNew = true;
    setByType((prev) => {
      const next = { ...prev, [notif.type]: notif };
      setTimeout(() => {
        setByType((p) => {
          if (p[notif.type]?.id === notif.id) {
            return { ...p, [notif.type]: { ...p[notif.type], isNew: false } };
          }
          return p;
        });
      }, 600);
      return next;
    });
  }, []);

  useEffect(() => {
    const initial = setTimeout(() => pushNotif(), 4000);
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const d = 30000 + Math.random() * 15000;
      timeout = setTimeout(() => { pushNotif(); schedule(); }, d);
    };
    const scheduleStart = setTimeout(() => schedule(), 4200);
    return () => { clearTimeout(initial); clearTimeout(timeout); clearTimeout(scheduleStart); };
  }, [pushNotif]);

  const dismiss = async (type: string, id?: string) => {
    setByType((prev) => {
      const next = { ...prev };
      delete next[type];
      return next;
    });
    if (id) {
      await deleteNotification(id);
    }
  };

  const entries = Object.values(byType);
  if (entries.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2.5 w-[300px]">
      {entries.map((notif) => {
        const meta = TYPE_META[notif.type] || TYPE_META.ppe;
        const time = new Date(notif.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

        return (
          <div
            key={notif.type}
            className={`bg-white/95 backdrop-blur-sm border ${meta.border} rounded-2xl shadow-[0_8px_30px_rgba(11,60,93,0.15)] overflow-hidden transition-all duration-300 ${
              notif.isNew ? 'animate-notif-in' : ''
            }`}
          >
            <div className={`h-0.5 w-full ${meta.accent}`} />

            <div className="flex items-start gap-3 p-3">
              <button onClick={() => onOpenModal(notif)} className="flex-shrink-0 relative group">
                <img src={notif.imageUrl} alt={notif.label} className="w-14 h-14 rounded-xl object-cover border border-slate-100 shadow-sm group-hover:scale-105 transition-transform" />
                <div className="absolute inset-0 rounded-xl bg-slate-900/0 group-hover:bg-slate-900/15 transition-all flex items-center justify-center">
                  <ChevronRight size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>

              <div className="flex-1 min-w-0">
                <div className={`flex items-center gap-1.5 ${meta.color}`}>
                  {meta.icon}
                  <span className="text-xs font-bold truncate text-slate-700">{notif.label}</span>
                </div>
                <p className="text-slate-500 text-[11px] font-medium mt-0.5 truncate">{notif.cameraName}</p>
                <p className="text-slate-400 text-[10px] mt-0.5">{time}</p>
                <button onClick={() => onOpenModal(notif)}
                  className="mt-1 text-[10px] font-semibold text-[#00BCD4] hover:text-[#0B3C5D] transition-colors flex items-center gap-0.5">
                  Detayları Gör <ChevronRight size={9} />
                </button>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button onClick={() => dismiss(notif.type, notif.id)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-all" title="Kapat">
                  <X size={12} />
                </button>
                <button onClick={() => dismiss(notif.type, notif.id)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all" title="Bildirimi sil">
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
