export const ROLE_STYLES = {
  admin: {
    avatar: "bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 shadow-violet-500/30",
    badge: "bg-violet-500/15 text-violet-500 border-violet-500/25",
    chip: "border-violet-500/30 bg-gradient-to-r from-violet-500/8 to-cyan-500/8",
  },
  isg: {
    avatar: "bg-gradient-to-br from-red-500 to-orange-500 shadow-red-500/30",
    badge: "bg-red-500/15 text-red-500 border-red-500/25",
    chip: "border-red-500/30 bg-gradient-to-r from-red-500/8 to-orange-500/8",
  },
  uretim_muduru: {
    avatar: "bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30",
    badge: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25 dark:text-emerald-400",
    chip: "border-emerald-500/30 bg-gradient-to-r from-emerald-500/8 to-teal-500/8",
  },
  operator: {
    avatar: "bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/30",
    badge: "bg-amber-500/15 text-amber-600 border-amber-500/25 dark:text-amber-400",
    chip: "border-amber-500/30 bg-gradient-to-r from-amber-500/8 to-orange-500/8",
  },
  user: {
    avatar: "bg-gradient-to-br from-cyan-500 to-sky-600 shadow-cyan-500/30",
    badge: "bg-cyan-500/15 text-cyan-500 border-cyan-500/25",
    chip: "border-cyan-500/30 bg-gradient-to-r from-cyan-500/8 to-sky-500/8",
  },
};

export function roleStyle(rol) {
  return ROLE_STYLES[rol] || ROLE_STYLES.user;
}

export const ROLE_LABELS_TR = {
  admin: "Yönetici",
  isg: "İSG Sorumlusu",
  uretim_muduru: "Üretim Müdürü",
  operator: "Operatör",
  user: "Kullanıcı",
};

export const ROLE_LABELS_EN = {
  admin: "Administrator",
  isg: "HSE Officer",
  uretim_muduru: "Production Manager",
  operator: "Operator",
  user: "User",
};
