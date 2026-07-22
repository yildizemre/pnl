import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, Camera, ChevronLeft, ChevronRight, Wifi, Trash2 } from 'lucide-react';
import { AlertDetail } from './DetailModal';
import { deleteNotification, deleteAllNotifications } from '../services/api';

interface AlertTableProps {
  alerts: AlertDetail[];
  loading?: boolean;
  title?: string;
  emptyMessage?: string;
  onOpenModal?: (alert: AlertDetail) => void;
  onDeleteAlert?: (id: string) => void;
  onDeleteAll?: () => void;
  defaultRowsPerPage?: number;
  showPagination?: boolean;
}

const ROWS_OPTIONS = [10, 20, 50];

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-400',
};

export default function AlertTable({
  alerts, loading, title, emptyMessage, onOpenModal,
  onDeleteAlert, onDeleteAll,
  defaultRowsPerPage = 10, showPagination = true,
}: AlertTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    await deleteNotification(id);
    setDeletingId(null);
    onDeleteAlert?.(id);
  };

  const handleClearAll = async () => {
    await deleteAllNotifications();
    setConfirmClear(false);
    onDeleteAll?.();
  };

  const totalPages = Math.ceil(alerts.length / rowsPerPage);
  const paginated = alerts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleRowsChange = (n: number) => { setRowsPerPage(n); setPage(0); };

  if (loading) {
    return (
      <div className="card-premium p-10 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-[#00BCD4] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Veriler yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card-premium">
      {(title || showPagination) && (
        <div className="px-5 py-3.5 border-b border-slate-100/80 flex items-center justify-between flex-wrap gap-2">
          {title && (
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 text-sm font-display">{title}</h3>
              <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">{alerts.length} kayıt</span>
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {onDeleteAll && alerts.length > 0 && (
              confirmClear ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-red-600 font-semibold">Tümü silinsin mi?</span>
                  <button onClick={handleClearAll} className="text-[11px] font-bold px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">Evet</button>
                  <button onClick={() => setConfirmClear(false)} className="text-[11px] font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">Hayır</button>
                </div>
              ) : (
                <button onClick={() => setConfirmClear(true)} className="flex items-center gap-1.5 text-[11px] font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors">
                  <Trash2 size={11} /> Tümünü Sil
                </button>
              )
            )}
            {showPagination && (
              <>
                <span className="text-xs text-slate-400">Satır:</span>
                <div className="flex gap-1">
                  {ROWS_OPTIONS.map((n) => (
                    <button key={n} onClick={() => handleRowsChange(n)}
                      className={`text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors ${
                        rowsPerPage === n ? 'bg-[#00BCD4]/10 text-[#0B3C5D] border border-[#00BCD4]/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-transparent'
                      }`}>{n}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="py-14 flex flex-col items-center justify-center text-slate-400">
          <CheckCircle size={30} className="mb-2 text-emerald-400" />
          <p className="text-sm">{emptyMessage || 'Kayıt bulunamadı.'}</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'linear-gradient(90deg, rgba(11,60,93,0.04) 0%, rgba(0,188,212,0.03) 100%)' }}
                  className="border-b border-slate-100/80">
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Olay</th>
                  <th className="text-left px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kamera</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden xl:table-cell">MAC / RTSP</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Zaman</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Durum</th>
                  {onDeleteAlert && <th className="w-10 px-2 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginated.map((alert) => (
                  <tr key={alert.id} onClick={() => onOpenModal?.(alert)}
                    className={`hover:bg-slate-50/60 transition-colors ${onOpenModal ? 'cursor-pointer' : ''} group`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <img src={alert.imageUrl} alt={alert.label} className="w-10 h-10 rounded-xl object-cover border border-slate-100 shadow-sm group-hover:scale-105 transition-transform" />
                          <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${SEVERITY_DOT[alert.severity] || 'bg-slate-300'}`} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700">{alert.label}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{alert.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-start gap-2">
                        <Camera size={12} className="text-[#00BCD4] mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-slate-600 leading-tight">{alert.cameraName}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{alert.cameraId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <div className="flex items-start gap-1.5">
                        <Wifi size={11} className="text-slate-300 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] font-mono text-slate-500">{alert.macAddress}</p>
                          <p className="text-[10px] font-mono text-[#00BCD4] truncate max-w-[180px]">{alert.rtspUrl}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock size={10} className="flex-shrink-0" />
                        <span className="text-[11px]">{new Date(alert.timestamp).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {alert.status === 'resolved' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                          <CheckCircle size={9} /> Çözüldü
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">
                          <AlertTriangle size={9} /> Açık
                        </span>
                      )}
                    </td>
                    {onDeleteAlert && (
                      <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                        <button onClick={(e) => handleDelete(e, alert.id)} disabled={deletingId === alert.id}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-40">
                          {deletingId === alert.id
                            ? <span className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                            : <Trash2 size={12} />}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showPagination && totalPages > 1 && (
            <div className="px-5 py-3 border-t border-slate-100/80 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                {page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, alerts.length)} / {alerts.length} kayıt
              </p>
              <div className="flex items-center gap-1">
                <NavBtn onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}><ChevronLeft size={13} /></NavBtn>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = totalPages <= 5 ? i : Math.max(0, Math.min(totalPages - 5, page - 2)) + i;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                        page === p ? 'bg-[#00BCD4]/10 text-[#0B3C5D] border border-[#00BCD4]/20' : 'text-slate-500 hover:bg-slate-100 border border-transparent'
                      }`}>{p + 1}</button>
                  );
                })}
                <NavBtn onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}><ChevronRight size={13} /></NavBtn>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NavBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
      {children}
    </button>
  );
}
