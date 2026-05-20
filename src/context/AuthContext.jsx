import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("hv_token"));
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((t, u) => {
    setToken(t);
    setUser(u);
    if (t) localStorage.setItem("hv_token", t);
    else localStorage.removeItem("hv_token");
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((u) => setUser(u))
      .catch(() => applySession(null, null))
      .finally(() => setLoading(false));
  }, [token, applySession]);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    applySession(res.token, res.user);
    return res.user;
  };

  const logout = () => applySession(null, null);

  const impersonate = async (userId) => {
    const res = await api.impersonate(userId);
    localStorage.setItem("hv_admin_token", token);
    applySession(res.token, res.user);
  };

  const exitImpersonation = async () => {
    const adminToken = localStorage.getItem("hv_admin_token");
    if (adminToken) {
      localStorage.removeItem("hv_admin_token");
      applySession(adminToken, null);
      try {
        const u = await api.me();
        setUser(u);
      } catch {
        applySession(null, null);
      }
    }
  };

  const isImpersonating = !!localStorage.getItem("hv_admin_token");

  const patchUser = (patch) => {
    setUser((u) => (typeof patch === "function" ? patch(u) : { ...u, ...patch }));
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout, impersonate, exitImpersonation, isImpersonating, setUser: patchUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
