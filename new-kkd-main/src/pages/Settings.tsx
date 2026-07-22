import React, { useState, useEffect, useRef } from 'react';
import {
  Camera, Mail, Lock, Plus, Trash2, Upload, CheckCircle, AlertCircle,
  Eye, EyeOff, Save, Info, RefreshCw, ZoomIn, X, Settings as SettingsIcon
} from 'lucide-react';
import { fetchCameras, updateCameraSettings, uploadCameraSnapshot, fetchReportEmails, updateReportEmails, changePassword } from '../services/api';

type Tab = 'cameras' | 'reports' | 'security';

interface CameraEntry {
  id: string; name: string; macAddress: string; rtspUrl: string;
  active: boolean; alerts24h: number; lastSeen: string; snapshotUrl?: string;
}
interface Toast { type: 'success' | 'error'; message: string; }

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" onClick={onClose}>
      <div className="relative max-w-3xl w-full animate-modal-in" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt="Kamera referans görüntüsü" className="w-full rounded-2xl shadow-2xl object-contain max-h-[80vh] border border-slate-200" />
        <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center text-slate-600 transition-colors shadow-md">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export default function Settings() {
  const [tab, setTab] = useState<Tab>('cameras');
  const [toast, setToast] = useState<Toast | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div className="space-y-5">
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold animate-slide-up ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      <div className="card-premium animate-fade-up" style={{ borderTop: '3px solid #0B3C5D' }}>
        <div className="p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0" style={{ background: 'linear-gradient(135deg, #0B3C5D, #071E2E)' }}>
            <SettingsIcon size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold text-slate-800 font-display">Ayarlar</h2>
              <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">Settings</span>
            </div>
            <p className="text-sm text-slate-500 mt-1">Sistem konfigürasyonu, raporlama ve güvenlik ayarları.</p>
          </div>
        </div>
      </div>

      <div className="card-premium">
        <div className="flex border-b border-slate-100/80 overflow-x-auto">
          {([
            { id: 'cameras', label: 'Kamera Yönetimi', icon: <Camera size={14} /> },
            { id: 'reports', label: 'Raporlama', icon: <Mail size={14} /> },
            { id: 'security', label: 'Güvenlik', icon: <Lock size={14} /> },
          ] as { id: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-4 text-xs font-bold transition-all border-b-2 flex-1 justify-center sm:flex-none sm:justify-start ${
                tab === t.id ? 'border-[#00BCD4] text-[#0B3C5D] bg-[#00BCD4]/5' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}>
              {t.icon} <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="p-6">
          {tab === 'cameras' && <CameraManagement showToast={showToast} onZoom={setLightboxSrc} />}
          {tab === 'reports' && <ReportSettings showToast={showToast} />}
          {tab === 'security' && <SecuritySettings showToast={showToast} />}
        </div>
      </div>
    </div>
  );
}

function CameraManagement({ showToast, onZoom }: { showToast: (t: 'success' | 'error', m: string) => void; onZoom: (src: string) => void }) {
  const [cameras, setCameras] = useState<CameraEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => { fetchCameras().then((c: CameraEntry[]) => { setCameras(c); setLoading(false); }); }, []);

  const change = (id: string, field: string, value: string) =>
    setCameras((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));

  const handleSave = async (cam: CameraEntry) => {
    setSaving(cam.id);
    await updateCameraSettings(cam.id, cam);
    setSaving(null);
    showToast('success', `"${cam.name}" ayarları kaydedildi.`);
  };

  const handleUpload = async (cam: CameraEntry, file: File) => {
    setUploading(cam.id);
    const res = await uploadCameraSnapshot(cam.id, file);
    setCameras((prev) => prev.map((c) => c.id === cam.id ? { ...c, snapshotUrl: res.snapshotUrl } : c));
    setUploading(null);
    showToast('success', 'Referans görüntü yüklendi.');
  };

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-[#00BCD4] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 bg-[#00BCD4]/5 border border-[#00BCD4]/15 rounded-xl">
        <Info size={13} className="text-[#00BCD4] flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600">Kamera adı, RTSP URL ve MAC adresi bilgilerini düzenleyebilir, her kamera için referans fotoğraf yükleyebilirsiniz.</p>
      </div>
      {cameras.map((cam) => (
        <div key={cam.id} className="border border-slate-200/80 rounded-2xl p-5 hover:border-slate-300 transition-colors bg-slate-50/30">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cam.active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <div>
                <p className="text-sm font-bold text-slate-700">{cam.name}</p>
                <p className="text-[10px] text-slate-400">{cam.alerts24h} olay / son 24 saat</p>
              </div>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-mono border border-slate-200">{cam.id}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {[
              { field: 'name', label: 'Kamera Adı', mono: false },
              { field: 'macAddress', label: 'MAC Adresi', mono: true },
              { field: 'rtspUrl', label: 'RTSP URL', mono: true },
            ].map(({ field, label, mono }) => (
              <div key={field} className={field === 'rtspUrl' ? 'md:col-span-2' : ''}>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</label>
                <input
                  className={`w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/40 focus:border-[#00BCD4] transition ${mono ? 'font-mono text-xs' : ''}`}
                  value={(cam as any)[field]}
                  onChange={(e) => change(cam.id, field, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-4">
            {cam.snapshotUrl ? (
              <button onClick={() => onZoom(cam.snapshotUrl!)} className="relative group flex-shrink-0 focus:outline-none" title="Büyütmek için tıklayın">
                <img src={cam.snapshotUrl} alt="Snapshot" className="w-16 h-12 rounded-xl object-cover border border-slate-200 group-hover:opacity-80 transition-opacity" />
                <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-slate-900/0 group-hover:bg-slate-900/30 transition-all">
                  <ZoomIn size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ) : (
              <div className="w-16 h-12 rounded-xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center flex-shrink-0">
                <Camera size={14} className="text-slate-300" />
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1">Referans Görüntü</p>
              <input ref={(el) => { fileRefs.current[cam.id] = el; }} type="file" accept="image/*" className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleUpload(cam, e.target.files[0]); }} />
              <button onClick={() => fileRefs.current[cam.id]?.click()} disabled={uploading === cam.id}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#00BCD4] hover:text-[#0B3C5D] transition-colors disabled:opacity-50">
                {uploading === cam.id ? <RefreshCw size={11} className="animate-spin" /> : <Upload size={11} />}
                {uploading === cam.id ? 'Yükleniyor...' : 'Görüntü Yükle'}
              </button>
            </div>
          </div>

          <button onClick={() => handleSave(cam)} disabled={saving === cam.id}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#0B3C5D] to-[#00BCD4] text-white text-xs font-bold rounded-xl hover:shadow-[0_8px_24px_rgba(0,188,212,0.3)] transition-all disabled:opacity-60">
            {saving === cam.id ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
            Kaydet
          </button>
        </div>
      ))}
    </div>
  );
}

function ReportSettings({ showToast }: { showToast: (t: 'success' | 'error', m: string) => void }) {
  const [emails, setEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchReportEmails().then(setEmails); }, []);

  const addEmail = () => {
    const trimmed = newEmail.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { showToast('error', 'Geçerli bir e-posta girin.'); return; }
    if (emails.includes(trimmed)) { showToast('error', 'Bu e-posta zaten listede.'); return; }
    setEmails((p) => [...p, trimmed]); setNewEmail('');
  };

  const handleSave = async () => {
    setSaving(true);
    await updateReportEmails(emails);
    setSaving(false);
    showToast('success', 'E-posta listesi güncellendi.');
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="p-4 bg-[#00BCD4]/5 border border-[#00BCD4]/15 rounded-2xl flex items-start gap-3">
        <Info size={14} className="text-[#00BCD4] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-slate-600">Bu listeye eklenen e-postalara <strong className="text-slate-700">günlük ve haftalık sistem analiz raporları</strong> otomatik olarak gönderilecektir.</p>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Rapor E-posta Listesi</label>
        <div className="space-y-2">
          {emails.map((email) => (
            <div key={email} className="flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-2">
                <Mail size={12} className="text-[#00BCD4]" />
                <span className="text-sm text-slate-700">{email}</span>
              </div>
              <button onClick={() => setEmails((p) => p.filter((x) => x !== email))} className="text-slate-300 hover:text-red-500 transition-colors">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {emails.length === 0 && (
            <div className="py-6 text-center text-sm text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">Henüz e-posta eklenmedi.</div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <input type="email" placeholder="yeni@sirket.com.tr" value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addEmail()}
          className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/40 focus:border-[#00BCD4] transition" />
        <button onClick={addEmail} className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors">
          <Plus size={14} /> Ekle
        </button>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0B3C5D] to-[#00BCD4] text-white text-sm font-bold rounded-xl hover:shadow-[0_8px_24px_rgba(0,188,212,0.3)] transition-all disabled:opacity-60">
        {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
        Değişiklikleri Kaydet
      </button>
    </div>
  );
}

function SecuritySettings({ showToast }: { showToast: (t: 'success' | 'error', m: string) => void }) {
  const [form, setForm] = useState({ oldPwd: '', newPwd: '', confirmPwd: '' });
  const [show, setShow] = useState({ old: false, new: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.oldPwd) e.oldPwd = 'Mevcut şifre gerekli.';
    if (form.newPwd.length < 8) e.newPwd = 'En az 8 karakter gerekli.';
    if (form.newPwd !== form.confirmPwd) e.confirmPwd = 'Şifreler eşleşmiyor.';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    const res = await changePassword(form.oldPwd, form.newPwd);
    setSaving(false);
    if (res.success) { showToast('success', res.message); setForm({ oldPwd: '', newPwd: '', confirmPwd: '' }); setErrors({}); }
    else setErrors({ oldPwd: res.message });
  };

  const pwdField = (key: 'oldPwd' | 'newPwd' | 'confirmPwd', label: string, showKey: 'old' | 'new' | 'confirm', placeholder: string) => (
    <div>
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="relative">
        <input type={show[showKey] ? 'text' : 'password'} placeholder={placeholder} value={form[key]}
          onChange={(e) => { setForm((p) => ({ ...p, [key]: e.target.value })); setErrors((p) => ({ ...p, [key]: '' })); }}
          className={`w-full bg-white border rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 pr-10 focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/40 focus:border-[#00BCD4] transition ${errors[key] ? 'border-red-300 bg-red-50/30' : 'border-slate-200'}`} />
        <button type="button" onClick={() => setShow((p) => ({ ...p, [showKey]: !p[showKey] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
          {show[showKey] ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
    </div>
  );

  return (
    <div className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ background: 'rgba(0,188,212,0.08)', borderColor: 'rgba(0,188,212,0.15)' }}>
            <Lock size={15} className="text-[#00BCD4]" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">Şifre Değiştir</p>
            <p className="text-xs text-slate-400">Güvenli ve benzersiz bir şifre kullanın.</p>
          </div>
        </div>
        {pwdField('oldPwd', 'Mevcut Şifre', 'old', '••••••••')}
        {pwdField('newPwd', 'Yeni Şifre', 'new', 'En az 8 karakter')}
        {pwdField('confirmPwd', 'Yeni Şifre (Tekrar)', 'confirm', 'Şifreyi tekrar girin')}
        <div className="pt-1">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0B3C5D] to-[#00BCD4] text-white text-sm font-bold rounded-xl hover:shadow-[0_8px_24px_rgba(0,188,212,0.3)] transition-all disabled:opacity-60">
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <Lock size={13} />}
            Şifreyi Güncelle
          </button>
        </div>
      </form>
      <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
        <p className="text-xs font-bold text-amber-700 mb-1.5">Güvenlik Önerileri</p>
        <ul className="text-xs text-amber-600/80 space-y-1 list-disc list-inside">
          <li>En az 8 karakter, büyük/küçük harf ve sayı içermeli</li>
          <li>Daha önce kullanılan şifreler tercih edilmemeli</li>
          <li>Şifrenizi kimseyle paylaşmayın</li>
        </ul>
      </div>
    </div>
  );
}
