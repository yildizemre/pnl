import { useState, useEffect, useMemo } from "react";
import { 
  Building2, Users, Database, Plus, Trash2, Edit, ChevronDown, ChevronUp, 
  Settings, Key, Shield, CheckCircle, Mail, MapPin, Store
} from "lucide-react";
import { Panel } from "../components/ui";
import { useLocale } from "../context/LocaleContext";

export default function CompanyManagementView() {
  const { t, locale } = useLocale();

  // Load state from localStorage or use defaults
  const [companies, setCompanies] = useState(() => {
    const saved = localStorage.getItem("hv_companies");
    if (saved) return JSON.parse(saved);
    return [
      { id: "C-01", name: "City Lojistik", db: "hypevision.db", stores: ["Merkez Depo", "A Bölgesi"], modules: ["ana", "bildirimler", "mes", "sayim", "ayarlar"], usersCount: 1 },
      { id: "C-02", name: "Collins", db: "collins_dev.db", stores: ["İstanbul Forum", "İzmir Optimum"], modules: ["ana", "sayim", "ayarlar"], usersCount: 1 },
      { id: "C-03", name: "Suwen", db: "suwen_prod.db", stores: ["Merkez", "Ankara Mall"], modules: ["ana", "mes", "ayarlar"], usersCount: 1 },
      { id: "C-04", name: "Emilio Lara", db: "emilio_lara.db", stores: ["Emilio Conex/polanco"], modules: ["ana", "bildirimler", "mes", "sayim", "kpi", "raporlar", "ayarlar"], usersCount: 2 }
    ];
  });

  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem("hv_company_users");
    if (saved) return JSON.parse(saved);
    return [
      { id: "U-01", name: "Kadir", email: "kadir@citylojistik.com.tr", role: "MAĞAZA YÖNETİCİSİ", companyId: "C-01" },
      { id: "U-02", name: "Hüseyin Başgör", email: "huseyin.basgor@collins.com.tr", role: "KULLANICI", companyId: "C-02" },
      { id: "U-03", name: "Adem Hüner", email: "adem.huner@suwen.com.tr", role: "MAĞAZA YÖNETİCİSİ", companyId: "C-03" },
      { id: "U-04", name: "Rüstem Süleyman", email: "rustem.suleyman@emiliolara.com", role: "KULLANICI", companyId: "C-04" },
      { id: "U-05", name: "Mert Yalçın", email: "mertyalcin@emiliolara.com", role: "MAĞAZA YÖNETİCİSİ", companyId: "C-04" },
      { id: "U-06", name: "Kasım Yıldırım", email: "kasim@kasim.com.tr", role: "MAĞAZA YÖNETİCİSİ", companyId: "" } // Unassigned at first
    ];
  });

  // Save updates to local storage
  useEffect(() => {
    localStorage.setItem("hv_companies", JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem("hv_company_users", JSON.stringify(users));
  }, [users]);

  // UI States
  const [expandedId, setExpandedId] = useState(null);
  const [toast, setToast] = useState(null);

  // Modal States
  const [activeModal, setActiveModal] = useState(null); // 'add_company' | 'db_ata' | 'store_add' | 'user_ata' | 'user_add'
  const [selectedCompany, setSelectedCompany] = useState(null);

  // Form Fields
  const [newCompanyName, setNewCompanyName] = useState("");
  const [selectedDb, setSelectedDb] = useState("hypevision.db");
  const [newStoreName, setNewStoreName] = useState("");
  
  // User Form
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("KULLANICI");
  const [newUserCompany, setNewUserCompany] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // 1. Add Company
  const handleAddCompany = () => {
    if (!newCompanyName.trim()) return;
    const newComp = {
      id: "C-" + Math.floor(Math.random() * 900 + 100),
      name: newCompanyName.trim(),
      db: "hypevision.db",
      stores: [],
      modules: ["ana", "ayarlar"],
      usersCount: 0
    };
    setCompanies([...companies, newComp]);
    setNewCompanyName("");
    setActiveModal(null);
    showToast("Şirket başarıyla eklendi.");
  };

  // 2. Delete Company
  const handleDeleteCompany = (compId) => {
    if (confirm("Bu şirketi ve bağlı tüm alt verileri silmek istediğinize emin misiniz?")) {
      setCompanies(companies.filter(c => c.id !== compId));
      setUsers(users.map(u => u.companyId === compId ? { ...u, companyId: "" } : u));
      showToast("Şirket silindi.");
    }
  };

  // 3. Database Assign
  const handleAssignDb = () => {
    if (!selectedCompany) return;
    setCompanies(companies.map(c => c.id === selectedCompany.id ? { ...c, db: selectedDb } : c));
    setActiveModal(null);
    showToast(`${selectedCompany.name} veritabanı ${selectedDb} olarak atandı.`);
  };

  // 4. Add Sub-store
  const handleAddStore = () => {
    if (!newStoreName.trim() || !selectedCompany) return;
    setCompanies(companies.map(c => {
      if (c.id === selectedCompany.id) {
        return { ...c, stores: [...c.stores, newStoreName.trim()] };
      }
      return c;
    }));
    setNewStoreName("");
    setActiveModal(null);
    showToast("Alt mağaza başarıyla eklendi.");
  };

  // 5. Assign User to Company
  const [targetUserId, setTargetUserId] = useState("");
  const handleAssignUser = () => {
    if (!targetUserId || !selectedCompany) return;
    setUsers(users.map(u => u.id === targetUserId ? { ...u, companyId: selectedCompany.id } : u));
    setTargetUserId("");
    setActiveModal(null);
    showToast("Kullanıcı şirkete bağlandı.");
  };

  // 6. Add Global User
  const handleAddUser = () => {
    if (!newUserName.trim() || !newUserEmail.trim()) return;
    const newUser = {
      id: "U-" + Math.floor(Math.random() * 900 + 100),
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      role: newUserRole,
      companyId: newUserCompany || ""
    };
    setUsers([...users, newUser]);
    setNewUserName("");
    setNewUserEmail("");
    setNewUserRole("KULLANICI");
    setNewUserCompany("");
    setActiveModal(null);
    showToast("Üye / Kullanıcı başarıyla oluşturuldu.");
  };

  // Toggle module authorization for a company
  const toggleCompanyModule = (compId, modId) => {
    setCompanies(companies.map(c => {
      if (c.id === compId) {
        const active = c.modules.includes(modId);
        const updated = active 
          ? c.modules.filter(m => m !== modId) 
          : [...c.modules, modId];
        return { ...c, modules: updated };
      }
      return c;
    }));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 text-white shadow-2xl text-xs font-bold animate-slide-up">
          <CheckCircle size={14} />
          {toast}
        </div>
      )}

      {/* Header Panel */}
      <div className="card-premium p-5 flex items-center justify-between animate-fade-up" style={{ borderTop: "3px solid #0B3C5D" }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md bg-gradient-to-br from-[#0B3C5D] to-[#071E2E] flex-shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[var(--text-primary)] font-display">Şirket & Üye Yönetimi</h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">Müşteri veritabanı eşleme, alt mağaza hiyerarşisi ve yetkilendirmeleri yönetin.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveModal("user_add")} className="btn-secondary">
            <Plus size={14} /> Üye Ekle
          </button>
          <button onClick={() => setActiveModal("add_company")} className="btn-primary">
            <Plus size={14} /> Şirket Ekle
          </button>
        </div>
      </div>

      {/* Company List Accordion */}
      <div className="space-y-3">
        {companies.map((comp) => {
          const compUsers = users.filter(u => u.companyId === comp.id);
          const isExpanded = expandedId === comp.id;

          return (
            <div key={comp.id} className="border border-[var(--border)] rounded-2xl bg-[var(--bg-card)] overflow-hidden transition-all duration-300">
              {/* Accordion Trigger Head */}
              <div 
                onClick={() => toggleExpand(comp.id)}
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#00BCD4]/10 border border-[#00BCD4]/25 flex items-center justify-center text-[#00BCD4] font-bold">
                    {comp.name[0]}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                      {comp.name}
                      <span className="text-[10px] px-2 py-0.5 bg-[var(--bg-hover)] text-[var(--text-muted)] rounded-full border border-[var(--border)] font-mono">{comp.db}</span>
                    </h3>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      {compUsers.length} Kullanıcı · {comp.stores.length} Alt Mağaza
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => { setSelectedCompany(comp); setSelectedDb(comp.db); setActiveModal("db_ata"); }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/25 text-[10px] font-bold rounded-lg"
                  >
                    <Database size={11} /> DB Ata
                  </button>
                  <button 
                    onClick={() => { setSelectedCompany(comp); setActiveModal("store_add"); }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/25 text-[10px] font-bold rounded-lg"
                  >
                    <Store size={11} /> Alt Mağaza
                  </button>
                  <button 
                    onClick={() => { setSelectedCompany(comp); setActiveModal("user_ata"); }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#30D158]/10 hover:bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/25 text-[10px] font-bold rounded-lg"
                  >
                    <Users size={11} /> Kullanıcı
                  </button>
                  <button onClick={() => handleDeleteCompany(comp.id)} className="p-1.5 text-[var(--text-muted)] hover:text-red-500">
                    <Trash2 size={13} />
                  </button>
                  <div className="text-[var(--text-muted)]">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </div>

              {/* Accordion Detail Body */}
              {isExpanded && (
                <div className="border-t border-[var(--border)] bg-[var(--bg-table-head)] p-5 space-y-5">
                  {/* Module Access Rights Checkboxes */}
                  <div className="p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
                    <h4 className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Settings size={12} className="text-[#00BCD4]" /> Aktif Modüller (Sol Bar Kısıtlamaları)
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                      {[
                        { id: "ana", label: "Genel Bakış" },
                        { id: "bildirimler", label: "İSG & Güvenlik" },
                        { id: "mes", label: "Personel" },
                        { id: "sayim", label: "Sayım" },
                        { id: "kpi", label: "KPI Stüdyo" },
                        { id: "raporlar", label: "Raporlar" },
                        { id: "ayarlar", label: "Ayarlar" }
                      ].map((mod) => (
                        <label key={mod.id} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[var(--text-primary)]">
                          <input 
                            type="checkbox" 
                            checked={comp.modules.includes(mod.id)} 
                            onChange={() => toggleCompanyModule(comp.id, mod.id)}
                            className="rounded border-[var(--border)] text-[#00BCD4] focus:ring-0" 
                          />
                          {mod.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Sub-stores details list */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Panel title="Alt Mağazalar / Bölgeler">
                      {comp.stores.length === 0 ? (
                        <p className="text-xs text-[var(--text-muted)] py-4 text-center">Henüz alt mağaza veya bölge tanımlanmadı.</p>
                      ) : (
                        <ul className="divide-y divide-[var(--border)]">
                          {comp.stores.map((st, idx) => (
                            <li key={idx} className="py-2.5 flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                              <MapPin size={12} className="text-[#00BCD4]" /> {st}
                            </li>
                          ))}
                        </ul>
                      )}
                    </Panel>

                    <Panel title="Şirket Üye ve Kullanıcıları">
                      {compUsers.length === 0 ? (
                        <p className="text-xs text-[var(--text-muted)] py-4 text-center">Şirkete bağlı üye bulunmuyor. Kullanıcı butonuyla atayın.</p>
                      ) : (
                        <ul className="divide-y divide-[var(--border)]">
                          {compUsers.map((u) => (
                            <li key={u.id} className="py-2.5 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-[#00BCD4]/10 text-[#00BCD4] text-[10px] font-bold flex items-center justify-center">
                                  {u.name[0]}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-[var(--text-primary)] truncate">{u.name}</p>
                                  <p className="text-[10px] text-[var(--text-muted)] truncate">{u.email}</p>
                                </div>
                              </div>
                              <span className="text-[9px] font-bold px-2 py-0.5 bg-[#00BCD4]/10 text-[#00BCD4] border border-[#00BCD4]/25 rounded-md">
                                {u.role}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Panel>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Global User list panel */}
      <Panel title="Tüm Üye ve Kullanıcı Havuzu" subtitle="Sistemdeki tüm kayıtlı kullanıcıların listesi">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)] font-bold uppercase">
                <th className="py-2.5">Ad Soyad</th>
                <th>E-posta</th>
                <th>Rol</th>
                <th>Bağlı Şirket</th>
                <th className="text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-semibold text-[var(--text-primary)]">
              {users.map((u) => {
                const comp = companies.find(c => c.id === u.companyId);
                return (
                  <tr key={u.id} className="hover:bg-[var(--bg-hover)]">
                    <td className="py-3 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#00BCD4]/10 text-[#00BCD4] flex items-center justify-center font-bold text-[10px]">{u.name[0]}</div>
                      {u.name}
                    </td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>
                      {comp ? (
                        <span className="px-2.5 py-1 rounded-md bg-[#00BCD4]/10 border border-[#00BCD4]/20 text-[#00BCD4] font-bold text-[10px]">
                          {comp.name}
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)] font-normal">Bağlı Değil</span>
                      )}
                    </td>
                    <td className="text-right">
                      <button 
                        onClick={() => {
                          if (confirm("Bu kullanıcıyı sistemden tamamen silmek istediğinize emin misiniz?")) {
                            setUsers(users.filter(x => x.id !== u.id));
                            showToast("Kullanıcı sistemden silindi.");
                          }
                        }}
                        className="text-[var(--text-muted)] hover:text-red-500 p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ────────────────────────────────────────────────────────────────
         MODALS (POPUP DIALOGS)
         ──────────────────────────────────────────────────────────────── */}
      
      {/* 1. Add Company Modal */}
      {activeModal === "add_company" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 animate-modal-in shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Yeni Şirket Ekle</h3>
            <input 
              type="text" 
              placeholder="Şirket Adı (örn. City Lojistik)" 
              value={newCompanyName} 
              onChange={(e) => setNewCompanyName(e.target.value)} 
              className="w-full bg-[var(--bg-hover)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none mb-4" 
            />
            <div className="flex justify-end gap-2 text-xs font-bold">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-xl border border-[var(--border)]">İptal</button>
              <button onClick={handleAddCompany} className="px-4 py-2 bg-[#00BCD4] text-white rounded-xl">Oluştur</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Assign Database Modal */}
      {activeModal === "db_ata" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 animate-modal-in shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">{selectedCompany?.name} Veritabanı Ata</h3>
            <select 
              value={selectedDb} 
              onChange={(e) => setSelectedDb(e.target.value)} 
              className="w-full bg-[var(--bg-hover)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none mb-4"
            >
              <option value="hypevision.db">hypevision.db (Genel)</option>
              <option value="ata.db">ata.db (Özel)</option>
              <option value="collins_dev.db">collins_dev.db</option>
              <option value="suwen_prod.db">suwen_prod.db</option>
              <option value="emilio_lara.db">emilio_lara.db</option>
            </select>
            <div className="flex justify-end gap-2 text-xs font-bold">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-xl border border-[var(--border)]">İptal</button>
              <button onClick={handleAssignDb} className="px-4 py-2 bg-[#00BCD4] text-white rounded-xl">Veritabanı Bağla</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Add Sub-store Modal */}
      {activeModal === "store_add" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 animate-modal-in shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">{selectedCompany?.name} Alt Mağaza/Bölge Ekle</h3>
            <input 
              type="text" 
              placeholder="Mağaza/Bölge Adı (örn. Emilio Conex/polanco)" 
              value={newStoreName} 
              onChange={(e) => setNewStoreName(e.target.value)} 
              className="w-full bg-[var(--bg-hover)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none mb-4" 
            />
            <div className="flex justify-end gap-2 text-xs font-bold">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-xl border border-[var(--border)]">İptal</button>
              <button onClick={handleAddStore} className="px-4 py-2 bg-[#00BCD4] text-white rounded-xl">Ekle</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Assign User to Company Modal */}
      {activeModal === "user_ata" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 animate-modal-in shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">{selectedCompany?.name} Şirketine Üye/Kullanıcı Bağla</h3>
            <select 
              value={targetUserId} 
              onChange={(e) => setTargetUserId(e.target.value)} 
              className="w-full bg-[var(--bg-hover)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none mb-4"
            >
              <option value="">Kullanıcı Seçin...</option>
              {users.filter(u => u.companyId !== selectedCompany.id).map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
            <div className="flex justify-end gap-2 text-xs font-bold">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-xl border border-[var(--border)]">İptal</button>
              <button onClick={handleAssignUser} className="px-4 py-2 bg-[#00BCD4] text-white rounded-xl">Şirkete Bağla</button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Add Global User/Member Modal */}
      {activeModal === "user_add" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setActiveModal(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 animate-modal-in shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Yeni Üye/Kullanıcı Ekle</h3>
            <div className="space-y-3 mb-4">
              <input 
                type="text" 
                placeholder="Adı Soyadı" 
                value={newUserName} 
                onChange={(e) => setNewUserName(e.target.value)} 
                className="w-full bg-[var(--bg-hover)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none" 
              />
              <input 
                type="email" 
                placeholder="E-posta Adresi (örn. kasim@kasim.com.tr)" 
                value={newUserEmail} 
                onChange={(e) => setNewUserEmail(e.target.value)} 
                className="w-full bg-[var(--bg-hover)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none" 
              />
              <select 
                value={newUserRole} 
                onChange={(e) => setNewUserRole(e.target.value)} 
                className="w-full bg-[var(--bg-hover)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none"
              >
                <option value="MAĞAZA YÖNETİCİSİ">MAĞAZA YÖNETİCİSİ</option>
                <option value="KULLANICI">KULLANICI</option>
                <option value="UYE">UYE</option>
              </select>
              <select 
                value={newUserCompany} 
                onChange={(e) => setNewUserCompany(e.target.value)} 
                className="w-full bg-[var(--bg-hover)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none"
              >
                <option value="">Şirket Atama (Boş Bırakılabilir)</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 text-xs font-bold">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-xl border border-[var(--border)]">İptal</button>
              <button onClick={handleAddUser} className="px-4 py-2 bg-[#00BCD4] text-white rounded-xl">Oluştur</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
