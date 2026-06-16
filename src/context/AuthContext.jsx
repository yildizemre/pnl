import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";

export const AuthContext = createContext(null);

function isAuthError(err) {
  const status = err?.status;
  if (status === 401 || status === 403) return true;
  const msg = String(err?.message || "");
  return /geçersiz oturum|giriş gerekli|unauthorized|401/i.test(msg);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("hv_token"));
  const [loading, setLoading] = useState(true);
  const sessionReadyRef = useRef(false);

  const applySession = useCallback((t, u) => {
    setToken(t);
    setUser(u);
    if (t) localStorage.setItem("hv_token", t);
    else localStorage.removeItem("hv_token");
  }, []);

  useEffect(() => {
    if (!token) {
      sessionReadyRef.current = false;
      setLoading(false);
      return undefined;
    }
    if (sessionReadyRef.current) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    api
      .me()
      .then((u) => {
        if (!cancelled) {
          setUser(u);
          sessionReadyRef.current = true;
        }
      })
      .catch((err) => {
        if (!cancelled && isAuthError(err)) {
          sessionReadyRef.current = false;
          applySession(null, null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, applySession]);

  const login = async (loginId, password) => {
    const res = await api.login(loginId, password);
    sessionReadyRef.current = true;
    applySession(res.token, res.user);
    setLoading(false);
    return res.user;
  };

  const logout = () => {
    sessionReadyRef.current = false;
    applySession(null, null);
    setLoading(false);
  };

  const impersonate = async (userId) => {
    const res = await api.impersonate(userId);
    localStorage.setItem("hv_admin_token", token);
    sessionReadyRef.current = true;
    applySession(res.token, res.user);
  };

  const exitImpersonation = async () => {
    const adminToken = localStorage.getItem("hv_admin_token");
    if (!adminToken) return;
    localStorage.removeItem("hv_admin_token");
    sessionReadyRef.current = false;
    applySession(adminToken, null);
    setLoading(true);
    try {
      const u = await api.me();
      setUser(u);
      sessionReadyRef.current = true;
    } catch (err) {
      if (isAuthError(err)) applySession(null, null);
    } finally {
      setLoading(false);
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
