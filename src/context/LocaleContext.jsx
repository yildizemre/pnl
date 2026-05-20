import { createContext, useContext, useEffect, useState } from "react";
import { EN, TR } from "../i18n";

const LocaleContext = createContext(null);

export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState(() => localStorage.getItem("hv_locale") || "TR");
  const t = locale === "EN" ? EN : TR;

  const set = (l) => {
    setLocale(l);
    localStorage.setItem("hv_locale", l);
  };

  useEffect(() => {
    document.documentElement.lang = locale === "EN" ? "en" : "tr";
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale: set, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export const useLocale = () => useContext(LocaleContext);
