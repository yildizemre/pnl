import { useEffect } from "react";
import faviconUrl from "../public/siyah.png";
import { PAGE_ROUTES } from "../lib/routes";

const FAVICON_ID = "hv-favicon";

function ensureFaviconLink() {
  let link = document.getElementById(FAVICON_ID);
  if (!link) {
    link = document.createElement("link");
    link.id = FAVICON_ID;
    link.rel = "icon";
    link.type = "image/png";
    document.head.appendChild(link);
  }
  link.href = faviconUrl;
  return link;
}

export function usePageMeta(menuId, t, locale) {
  useEffect(() => {
    const route = PAGE_ROUTES[menuId] || PAGE_ROUTES.ana;
    const pageName = t[route.titleKey] || menuId;
    document.title = `${pageName} · HypeVision`;
    document.documentElement.lang = locale === "EN" ? "en" : "tr";
    ensureFaviconLink();
  }, [menuId, t, locale]);
}
