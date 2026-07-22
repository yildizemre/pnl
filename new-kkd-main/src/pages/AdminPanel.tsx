import React, { useState } from 'react';
import { Building2, Users, Database, Plus, Edit2, Trash2, Shield, LogOut, Check, X, ShieldAlert, Key, Play } from 'lucide-react';
import { DateFilter } from '../components/Header';

export interface Company {
  id: string;
  name: string;
  dbName: string;
  activeModules: string[]; // e.g. ['ppe', 'fire']
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'brand_manager';
  companyId: string; // Mapped company
  camerasCount: number;
}

interface AdminPanelProps {
  companies: Company[];
  users: User[];
  onAddCompany: (c: Company) => void;
  onEditCompany: (c: Company) => void;
  onDeleteCompany: (id: string) => void;
  onAddUser: (u: User) => void;
  onEditUser: (u: User) => void;
  onDeleteUser: (id: string) => void;
  onMasquerade: (u: User | null) => void;
  currentUser: User | null;
}

const ALL_MODULES = [
  { id: 'dashboard', label: 'Genel Bakış' },
  { id: 'cameras', label: 'Canlı İzleme' },
  { id: 'ppe', label: 'KKD Kontrolü' },
  { id: 'fire', label: 'Yangın & Duman' },
  { id: 'intrusion', label: 'Hırsızlık & İhlal' },
  { id: 'fall', label: 'Düşme & Bayılma' },
  { id: 'counting', label: 'Ürün Sayım' },
  { id: 'personnel', label: 'Personel Verimliliği' },
  { id: 'settings', label: 'Ayarlar' },
];

export default function AdminPanel({
  companies, users,
  onAddCompany, onEditCompany, onDeleteCompany,
  onAddUser, onEditUser, onDeleteUser,
  onMasquerade, currentUser
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'companies' | 'users'>('companies');

  // Company Modals / Forms
  const [showCompModal, setShowCompModal] = useState(false);
  const [editingComp, setEditingComp] = useState<Company | null>(null);
  const [compName, setCompName] = useState('');
  const [compDb, setCompDb] = useState('');
  const [compModules, setCompModules] = useState<string[]>(['dashboard']);

  // User Modals / Forms
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'user' | 'brand_manager'>('user');
  const [userCompany, setUserCompany] = useState('');
  const [userCameras, setUserCameras] = useState(0);

  // Toggle module selection
  const handleToggleModule = (modId: string) => {
    if (modId === 'dashboard') return; // Dashboard is always required
    if (compModules.includes(modId)) {
      setCompModules(prev => prev.filter(id => id !== modId));
    } else {
      setCompModules(prev => [...prev, modId]);
    }
  };

  const handleOpenAddCompany = () => {
    setEditingComp(null);
    setCompName('');
    setCompDb('');
    setCompModules(['dashboard']);
    setShowCompModal(true);
  };

  const handleOpenEditCompany = (c: Company) => {
    setEditingComp(c);
    setCompName(c.name);
    setCompDb(c.dbName);
    setCompModules(c.activeModules);
    setShowCompModal(true);
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName.trim() || !compDb.trim()) return;

    if (editingComp) {
      onEditCompany({
        ...editingComp,
        name: compName,
        dbName: compDb,
        activeModules: compModules
      });
    } else {
      onAddCompany({
        id: `COMP-${Date.now()}`,
        name: compName,
        dbName: compDb,
        activeModules: compModules
      });
    }
    setShowCompModal(false);
  };

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserName('');
    setUserEmail('');
    setUserRole('user');
    setUserCompany(companies[0]?.id || '');
    setUserCameras(0);
    setShowUserModal(true);
  };

  const handleOpenEditUser = (u: User) => {
    setEditingUser(u);
    setUserName(u.name);
    setUserEmail(u.email);
    setUserRole(u.role);
    setUserCompany(u.companyId);
    setUserCameras(u.camerasCount);
    setShowUserModal(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim()) return;

    if (editingUser) {
      onEditUser({
        ...editingUser,
        name: userName,
        email: userEmail,
        role: userRole,
        companyId: userCompany,
        camerasCount: Number(userCameras)
      });
    } else {
      onAddUser({
        id: `USER-${Date.now()}`,
        name: userName,
        email: userEmail,
        role: userRole,
        companyId: userCompany,
        camerasCount: Number(userCameras)
      });
    }
    setShowUserModal(false);
  };

  return (
    <div className="space-y-5">
      {/* Hero Welcome */}
      <div className="card-premium animate-fade-up" style={{ borderTop: '3px solid #0B3C5D' }}>
        <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0" style={{ background: 'linear-gradient(135deg, #0B3C5D, #00BCD4)' }}>
              <Shield size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800 font-display">Yönetici Paneli</h2>
              <p className="text-sm text-slate-500 mt-1">Sistem genelindeki şirketleri, üyeleri ve yetkilendirmeleri yönetin.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 p-1 rounded-xl shadow-sm max-w-xs">
        <button
          onClick={() => setActiveTab('companies')}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-lg transition-all ${
            activeTab === 'companies' ? 'bg-[#0B3C5D] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Building2 size={13} /> Şirket Yönetimi
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-lg transition-all ${
            activeTab === 'users' ? 'bg-[#0B3C5D] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users size={13} /> Üye Yönetimi
        </button>
      </div>

      {/* Tab 1: Companies Grid */}
      {activeTab === 'companies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Şirketler listesi</p>
            <button
              onClick={handleOpenAddCompany}
              className="flex items-center gap-1 text-[11px] font-bold bg-[#00BCD4]/10 text-[#0B3C5D] border border-[#00BCD4]/25 hover:bg-[#00BCD4]/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={12} /> Şirket Ekle
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companies.map((comp) => {
              const compUsers = users.filter((u) => u.companyId === comp.id);
              return (
                <div key={comp.id} className="card-premium p-5 flex flex-col justify-between hover:shadow-premium-md transition-shadow">
                  <div>
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm font-display">{comp.name}</h4>
                        <p className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mt-0.5">
                          <Database size={10} className="text-[#00BCD4]" /> DB: {comp.dbName}
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleOpenEditCompany(comp)}
                          className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-500 rounded-lg transition-colors"
                          title="Düzenle"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => onDeleteCompany(comp.id)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-100 text-red-500 rounded-lg transition-colors"
                          title="Sil"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Active Modules */}
                    <div className="mt-3.5 space-y-1.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Aktif Modüller</p>
                      <div className="flex flex-wrap gap-1">
                        {comp.activeModules.map((mId) => (
                          <span
                            key={mId}
                            className="text-[9px] font-bold px-2 py-0.5 bg-[#00BCD4]/10 text-[#0B3C5D] border border-[#00BCD4]/15 rounded-full"
                          >
                            {ALL_MODULES.find((m) => m.id === mId)?.label || mId}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users size={11} className="text-slate-400" />
                      <strong>{compUsers.length}</strong> kullanıcı tanımlı
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Users List */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display">Tüm kullanıcıları görüntüle ve yönet</p>
            <button
              onClick={handleOpenAddUser}
              className="flex items-center gap-1 text-[11px] font-bold bg-[#00BCD4]/10 text-[#0B3C5D] border border-[#00BCD4]/25 hover:bg-[#00BCD4]/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={12} /> Yeni Kullanıcı
            </button>
          </div>

          <div className="card-premium overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase">Kullanıcı</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase">Email</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase">Rol</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase">Şirket</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase">Kurulum</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const userComp = companies.find((c) => c.id === u.companyId);
                  const isCur = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                      <td className="px-5 py-3 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-[#00BCD4]/10 border border-[#00BCD4]/20 flex items-center justify-center font-bold text-[#0B3C5D]">
                          {u.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-700 leading-none">{u.name}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">ID: {u.id}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-500 font-mono">{u.email}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          u.role === 'admin' 
                            ? 'bg-[#0B3C5D]/10 text-[#0B3C5D] border border-[#0B3C5D]/20' 
                            : u.role === 'brand_manager' 
                              ? 'bg-amber-50 border border-amber-200 text-amber-600'
                              : 'bg-slate-50 border border-slate-200 text-slate-500'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600 font-semibold">
                        {userComp ? userComp.name : '—'}
                      </td>
                      <td className="px-5 py-3 text-slate-500 flex items-center gap-1 mt-1 leading-none">
                        <Camera size={11} className="text-slate-400" /> {u.camerasCount} Kamera
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => onMasquerade(u)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-600 text-[10px] font-bold rounded-lg transition-colors"
                          >
                            <Play size={10} /> Panele Git
                          </button>
                          <button
                            onClick={() => handleOpenEditUser(u)}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 rounded-lg transition-colors"
                          >
                            <Edit2 size={11} />
                          </button>
                          <button
                            onClick={() => onDeleteUser(u.id)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-100 text-red-500 rounded-lg transition-colors"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: Şirket Ekle / Düzenle */}
      {showCompModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-modal-in">
            <div className="px-6 py-4 bg-gradient-to-r from-[#0B3C5D] to-[#00BCD4] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm font-display">{editingComp ? 'Şirketi Düzenle' : 'Yeni Şirket Ekle'}</h3>
              <button onClick={() => setShowCompModal(false)} className="text-white/80 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCompany} className="p-6 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Şirket Adı</label>
                  <input
                    required
                    value={compName}
                    onChange={(e) => setCompName(e.target.value)}
                    placeholder="Örn: City Lojistik"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#00BCD4]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Veritabanı Adı (DB Schema)</label>
                  <input
                    required
                    value={compDb}
                    onChange={(e) => setCompDb(e.target.value)}
                    placeholder="Örn: city_logistics_db"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#00BCD4]"
                  />
                </div>
              </div>

              {/* Checklist modules */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Aktif Modüller</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-200/80 p-3 rounded-2xl">
                  {ALL_MODULES.map((mod) => (
                    <label key={mod.id} className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-medium text-slate-600">
                      <input
                        type="checkbox"
                        checked={compModules.includes(mod.id)}
                        disabled={mod.id === 'dashboard'} // dashboard always required
                        onChange={() => handleToggleModule(mod.id)}
                        className="rounded border-slate-300 text-[#00BCD4] focus:ring-[#00BCD4] disabled:opacity-50"
                      />
                      <span className={mod.id === 'dashboard' ? 'opacity-50' : ''}>{mod.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCompModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-[#0B3C5D] to-[#00BCD4] text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-glow-cyan"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Üye Ekle / Düzenle */}
      {showUserModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-modal-in">
            <div className="px-6 py-4 bg-gradient-to-r from-[#0B3C5D] to-[#00BCD4] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm font-display">{editingUser ? 'Üyeyi Düzenle' : 'Yeni Üye Tanımla'}</h3>
              <button onClick={() => setShowUserModal(false)} className="text-white/80 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Adı Soyadı</label>
                  <input
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Örn: Kasım Yıldırım"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#00BCD4]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">E-posta</label>
                  <input
                    required
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="kullanici@sirket.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#00BCD4]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Rol</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#00BCD4]"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="brand_manager">Brand Manager</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bağlı Olduğu Şirket</label>
                  <select
                    value={userCompany}
                    onChange={(e) => setUserCompany(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#00BCD4]"
                  >
                    <option value="" disabled>Şirket Seçin</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Kamera Sayısı</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={userCameras}
                    onChange={(e) => setUserCameras(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#00BCD4]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-[#0B3C5D] to-[#00BCD4] text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-glow-cyan"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
