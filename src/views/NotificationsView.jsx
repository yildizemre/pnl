import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Bell, Bot, CheckCircle2, Flame, GraduationCap, List,
} from "lucide-react";
import { useLocale } from "../context/LocaleContext";
import { translateSeviye } from "../i18n/helpers";
import FilterBar from "../components/FilterBar";
import { Panel, StatCard } from "../components/ui";
import NotificationCard from "../components/notifications/NotificationCard";
import NotificationTable from "../components/notifications/NotificationTable";
import NotificationDetailModal from "../components/notifications/NotificationDetailModal";
import NotificationInsightsView from "../components/notifications/NotificationInsightsView";
import TrainingFeedbackView from "../components/notifications/TrainingFeedbackView";
import EventCategoryPanel from "../components/isg/EventCategoryPanel";
import IsgTrendCharts from "../components/isg/IsgTrendCharts";
import {
  EVENT_TYPES, SEVIYELER, countByEventType, kritikCount,
} from "../data/notificationTypes";

const TABS = [
  { id: "liste", icon: List, labelKey: "notifTabListe" },
  { id: "analiz", icon: Bot, labelKey: "notifTabAnaliz" },
  { id: "egitim", icon: GraduationCap, labelKey: "notifTabEgitim" },
];

const STATUS_FILTERS = [
  { id: "kritik", icon: AlertTriangle, labelKey: "isgDurumKritik", accent: "red" },
  { id: "bekleyen", icon: Bell, labelKey: "isgDurumBekleyen", accent: "orange" },
  { id: "kapandi", icon: CheckCircle2, labelKey: "isgDurumKapandi", accent: "green" },
];

export default function NotificationsView({ data, onNotificationUpdated, onRefresh }) {
  const { t, locale } = useLocale();
  const dates = data.dates || [];
  const [tab, setTab] = useState("liste");
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("tumu");
  const [seviyeFilter, setSeviyeFilter] = useState("tumu");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [viewMode, setViewMode] = useState("kart");

  const list = data.notifications || [];

  useEffect(() => {
    if (dates[0]) setDate(dates[0]);
  }, [dates[0]]);

  const dayList = useMemo(
    () => (date ? list.filter((n) => n.tarih === date) : list),
    [list, date]
  );

  const statusCounts = useMemo(() => ({
    kritik: dayList.filter((n) => n.seviye === "kritik" && !n.okundu).length,
    bekleyen: dayList.filter((n) => !n.okundu).length,
    kapandi: dayList.filter((n) => n.okundu).length,
  }), [dayList]);

  const filtered = useMemo(() => {
    return list.filter((n) => {
      if (date && n.tarih !== date) return false;
      if (eventFilter !== "tumu" && n.kategori !== eventFilter) return false;
      if (seviyeFilter !== "tumu" && n.seviye !== seviyeFilter) return false;
      if (statusFilter === "kritik" && !(n.seviye === "kritik" && !n.okundu)) return false;
      if (statusFilter === "bekleyen" && n.okundu) return false;
      if (statusFilter === "kapandi" && !n.okundu) return false;
      const q = search.toLowerCase();
      if (!q) return true;
      return [n.baslik, n.detay, n.kamera, n.kategori, n.modul, n.alan].some((x) =>
        String(x || "").toLowerCase().includes(q)
      );
    });
  }, [list, date, search, eventFilter, seviyeFilter, statusFilter]);

  const typeCounts = useMemo(() => countByEventType(filtered), [filtered]);
  const kritik = kritikCount(filtered);
  const unread = filtered.filter((n) => !n.okundu).length;

  const toggleStatus = (id) => setStatusFilter((cur) => (cur === id ? "" : id));

  return (
    <div className="notif-page">
      <div className="notif-page-tabs" role="tablist">
        {TABS.map(({ id, icon: Icon, labelKey }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "dash-pill dash-pill--active" : "dash-pill"}
            onClick={() => setTab(id)}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{t[labelKey]}</span>
          </button>
        ))}
      </div>

      {tab === "analiz" ? (
        <NotificationInsightsView dates={dates} />
      ) : tab === "egitim" ? (
        <TrainingFeedbackView />
      ) : (
        <>
          <div className="isg-status-row" role="group" aria-label={t.isgDurumFiltre}>
            {STATUS_FILTERS.map(({ id, icon: Icon, labelKey, accent }) => (
              <button
                key={id}
                type="button"
                className={`isg-status-card isg-status-card--${accent} ${statusFilter === id ? "isg-status-card--active" : ""}`}
                onClick={() => toggleStatus(id)}
              >
                <Icon className="h-4 w-4" />
                <div>
                  <span className="isg-status-val">{statusCounts[id]}</span>
                  <span className="isg-status-lbl">{t[labelKey]}</span>
                </div>
              </button>
            ))}
          </div>

          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t.bildirimAra}
            date={date}
            onDateChange={setDate}
            dates={dates}
            showGranularity={false}
          />

          <div className="notif-summary-row">
            <StatCard title={t.toplamFiltre} value={filtered.length} subtitle={t.seciliTarihArama} icon={Bell} accent="blue" />
            <StatCard title={t.okunmamisKritik} value={kritik} subtitle={t.acilMudahale} icon={AlertTriangle} accent="red" />
            <StatCard title={t.okunmamis} value={unread} subtitle={t.bekleyenKayit} icon={Bell} accent="orange" />
            <StatCard title={t.olayTipleri} value={EVENT_TYPES.filter((e) => typeCounts[e.id] > 0).length} subtitle={t.aktifAlgilama} icon={Flame} accent="cyan" />
          </div>

          <section className="isg-analytics-row">
            <EventCategoryPanel notifications={list} />
            <IsgTrendCharts notifications={list} />
          </section>

          <Panel title={t.olayTipiKpi} subtitle={t.olayTipiKpiAlt} className="notif-events-panel">
            <div className="notif-event-kpis">
              <button
                type="button"
                className={`notif-event-kpi ${eventFilter === "tumu" ? "notif-event-kpi--active" : ""}`}
                onClick={() => setEventFilter("tumu")}
              >
                <span className="notif-event-kpi-val">{filtered.length}</span>
                <span className="notif-event-kpi-lbl">{t.tumKategoriler}</span>
              </button>
              {EVENT_TYPES.map((ev) => {
                const Icon = ev.icon;
                const cnt = typeCounts[ev.id] || 0;
                if (cnt === 0 && eventFilter !== ev.id) return null;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    className={`notif-event-kpi ${eventFilter === ev.id ? "notif-event-kpi--active" : ""}`}
                    style={{ "--ev-color": ev.color }}
                    onClick={() => setEventFilter(eventFilter === ev.id ? "tumu" : ev.id)}
                  >
                    <Icon className="notif-event-kpi-icon" />
                    <span className="notif-event-kpi-val">{cnt}</span>
                    <span className="notif-event-kpi-lbl">{locale === "EN" ? ev.labelEn : ev.labelTr}</span>
                    <span className="notif-event-kpi-desc">{locale === "EN" ? ev.descEn : ev.descTr}</span>
                  </button>
                );
              })}
            </div>
          </Panel>

          <div className="notif-list-toolbar">
            <div className="notif-sev-filters">
              {["tumu", ...SEVIYELER].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={seviyeFilter === s ? "notif-sev-pill notif-sev-pill--active" : "notif-sev-pill"}
                  onClick={() => setSeviyeFilter(s)}
                >
                  {s === "tumu" ? t.tumSeviyeler : translateSeviye(locale, s)}
                </button>
              ))}
            </div>
            <div className="notif-view-toggle">
              <button
                type="button"
                className={viewMode === "kart" ? "notif-sev-pill notif-sev-pill--active" : "notif-sev-pill"}
                onClick={() => setViewMode("kart")}
              >
                {t.isgKartGorunum}
              </button>
              <button
                type="button"
                className={viewMode === "tablo" ? "notif-sev-pill notif-sev-pill--active" : "notif-sev-pill"}
                onClick={() => setViewMode("tablo")}
              >
                {t.isgTabloGorunum}
              </button>
            </div>
          </div>

          {viewMode === "kart" ? (
            <Panel title={t.isgOlayKartlari} subtitle={`${filtered.length} ${t.kayit}`}>
              {filtered.length ? (
                <div className="notif-card-grid">
                  {filtered.map((item) => (
                    <NotificationCard key={item.id} item={item} onClick={setSelected} />
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-[var(--text-muted)]">{t.bildirimBulunamadi}</p>
              )}
            </Panel>
          ) : (
            <Panel
              title={t.bildirimTablosu}
              subtitle={`${filtered.length} ${t.kayit} · ${t.gorselOnizleme}`}
              className="notif-table-panel"
              flush
            >
              <NotificationTable items={filtered} onSelect={setSelected} onUpdated={onNotificationUpdated} />
            </Panel>
          )}

          {selected && (
            <NotificationDetailModal
              item={selected}
              onClose={() => setSelected(null)}
              onUpdated={(item) => {
                onNotificationUpdated?.(item);
                setSelected(item);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
