/**
 * ActivityExplorer — visor de actividad: lista los eventos de negocio
 * (lead movido de columna, respuesta del bot, respuesta de un agente del
 * CRM) que expone `/api/metrics/activities`, con filtros, búsqueda y
 * paginación. Adaptado de ChatExplorer.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRightLeft, Bot, Headset, Search, X, ChevronRight,
  Hash, Clock, Inbox, RefreshCw, Radio, ArrowDownLeft, ArrowUpRight, ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { API_BASE, authHeaders } from "@/lib/apiClient";

// ─── Config ──────────────────────────────────────────────────────────────────

export type ActivityType = "lead_moved_column" | "bot_reply" | "human_agent_reply";

const ACTIVITY_TYPES: ActivityType[] = ["lead_moved_column", "bot_reply", "human_agent_reply"];

const TYPE_CONFIG: Record<ActivityType, { label: string; short: string; icon: typeof Bot; color: string }> = {
  lead_moved_column: { label: "Movida de columna", short: "Columna",  icon: ArrowRightLeft, color: "#a78bfa" },
  bot_reply:         { label: "Respuesta del bot",  short: "Bot",     icon: Bot,             color: "#34d399" },
  human_agent_reply: { label: "Respuesta de agente CRM", short: "Agente", icon: Headset,      color: "#fb923c" },
};

const TIME_RANGES = [
  { label: "1h",  hours: 1 },
  { label: "6h",  hours: 6 },
  { label: "24h", hours: 24 },
  { label: "7d",  hours: 168 },
  { label: "30d", hours: 720 },
];

const LIMIT = 50;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityItem {
  id: number;
  activity_type: ActivityType;
  label: string;
  lead_status_id: number | null;
  tenant_id: string;
  conversation_id: string | null;
  channel: string;
  direction: "inbound" | "outbound";
  action: string | null;
  message: string;
  created_at: string | null;
}

interface ActivitiesResponse {
  tenant_id: string;
  from: string;
  to: string;
  total: number;
  limit: number;
  offset: number;
  counts: Record<string, number>;
  activities: ActivityItem[];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Skel({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-secondary ${className}`} />;
}

function TypeBadge({ type }: { type: ActivityType }) {
  const cfg = TYPE_CONFIG[type];
  const Icon = cfg.icon;
  return (
    <span
      className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium rounded px-1.5 py-0.5"
      style={{ color: cfg.color, backgroundColor: `${cfg.color}18` }}
    >
      <Icon className="w-2.5 h-2.5" />
      {cfg.short}
    </span>
  );
}

function ActivityRow({ item, onClick }: { item: ActivityItem; onClick: () => void }) {
  const cfg = TYPE_CONFIG[item.activity_type];
  const Icon = cfg.icon;
  const isInbound = item.direction === "inbound";
  const ts = item.created_at
    ? new Date(item.created_at).toLocaleString("es-AR", {
        month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

  return (
    <div
      onClick={onClick}
      className="flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 hover:bg-secondary/40 cursor-pointer transition-colors group"
    >
      <div
        className="shrink-0 mt-0.5 flex items-center justify-center w-6 h-6 rounded-full"
        style={{ color: cfg.color, backgroundColor: `${cfg.color}18` }}
      >
        <Icon className="w-3 h-3" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-muted-foreground font-mono tabular-nums shrink-0">{ts}</span>
          <span className="text-[10px] font-medium text-muted-foreground bg-secondary rounded px-1.5 py-0.5 shrink-0">
            {item.channel}
          </span>
          {item.conversation_id && (
            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5 shrink-0">
              <Hash className="w-2.5 h-2.5" />{item.conversation_id}
            </span>
          )}
          <TypeBadge type={item.activity_type} />
          <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/60">
            {isInbound ? <ArrowDownLeft className="w-2.5 h-2.5" /> : <ArrowUpRight className="w-2.5 h-2.5" />}
          </span>
        </div>
        <p className="text-xs text-foreground/90 font-medium leading-relaxed">{item.label}</p>
        {item.message && (
          <p className="text-xs text-foreground/60 truncate leading-relaxed">{item.message}</p>
        )}
      </div>

      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 mt-1 group-hover:text-muted-foreground transition-colors" />
    </div>
  );
}

function ActivityModal({ item, onClose, crmSubdomain }: {
  item: ActivityItem; onClose: () => void; crmSubdomain?: string;
}) {
  const cfg = TYPE_CONFIG[item.activity_type];
  const Icon = cfg.icon;
  const ts = item.created_at
    ? new Date(item.created_at).toLocaleString("es-AR", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      })
    : "—";

  // Solo confiable para human_agent_reply: ahí conversation_id es el lead_id
  // de Kommo (viene del webhook de Digital Pipeline). Para bot_reply /
  // lead_moved_column, conversation_id puede ser el talk_id de Kommo, un id
  // distinto, así que no armamos el link para esos casos.
  const leadUrl = crmSubdomain && item.conversation_id && item.activity_type === "human_agent_reply"
    ? `https://${crmSubdomain}.kommo.com/leads/detail/${item.conversation_id}`
    : null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center w-6 h-6 rounded-full"
              style={{ color: cfg.color, backgroundColor: `${cfg.color}18` }}
            >
              <Icon className="w-3 h-3" />
            </div>
            <span className="text-sm font-medium">{cfg.label}</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-px bg-border">
          {[
            { label: "ID",           value: `#${item.id}` },
            { label: "Lead / Conversación", value: item.conversation_id ?? "—" },
            { label: "Canal",        value: item.channel },
            { label: "Dirección",    value: item.direction },
            { label: "Acción cruda", value: item.action ?? "—" },
            ...(item.lead_status_id !== null
              ? [{ label: "Status ID destino", value: String(item.lead_status_id) }]
              : []),
          ].map(({ label, value }) => (
            <div key={label} className="bg-card px-4 py-2.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
              <p className="text-xs text-foreground font-mono truncate">{value}</p>
            </div>
          ))}
        </div>

        <div className="px-5 py-2.5 border-b border-border flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="w-3 h-3" />{ts}
        </div>

        {item.message && (
          <div className="px-5 py-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Mensaje</p>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">{item.message}</p>
          </div>
        )}

        {leadUrl && (
          <div className="px-5 pb-5">
            <a
              href={leadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir conversación en Kommo
            </a>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface Props {
  apiSlug: string;
  title?: string;
  /** Cuando se pasa, la vista queda fija en ese tipo de actividad y se
   * ocultan los tabs de tipo (usado para secciones dedicadas, como
   * "Actividad respuesta humana"). */
  fixedType?: ActivityType;
  /** Subdominio de Kommo del tenant (ej. "infoelectrorai"), para armar el
   * link "Abrir conversación en Kommo" en el modal de detalle. */
  crmSubdomain?: string;
}

export function ActivityExplorer({ apiSlug, title = "Actividad reciente", fixedType, crmSubdomain }: Props) {
  const { accessToken, logout } = useAuth();
  const [hours,       setHours]       = useState(24);
  const [live,        setLive]        = useState(false);
  const [data,        setData]        = useState<ActivitiesResponse | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [search,      setSearch]      = useState("");
  const [leadFilter,  setLeadFilter]  = useState("");
  const [type,        setType]        = useState<"all" | ActivityType>(fixedType ?? "all");
  const [offset,      setOffset]      = useState(0);
  const [selected,    setSelected]    = useState<ActivityItem | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const liveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchActivities = useCallback(async (
    opts: { h?: number; offset?: number; t?: string; srch?: string; lead?: string } = {}
  ) => {
    const h    = opts.h      ?? hours;
    const off  = opts.offset ?? offset;
    const t    = opts.t      ?? type;
    const srch = opts.srch   ?? search;
    const lead = opts.lead   ?? leadFilter;

    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tenant_id: apiSlug,
        hours:     String(h),
        limit:     String(LIMIT),
        offset:    String(off),
      });
      if (t !== "all")     params.set("types", t);
      if (srch.trim())     params.set("search", srch.trim());
      if (lead.trim())     params.set("conversation_id", lead.trim());

      const res = await fetch(`${API_BASE}/api/metrics/activities?${params}`, { headers: authHeaders(accessToken) });
      if (res.status === 401) { logout(); return; }
      if (res.ok) {
        setData(await res.json());
        setLastRefresh(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, [apiSlug, accessToken, logout, hours, offset, type, search, leadFilter]);

  // Carga inicial + cambio de rango
  useEffect(() => {
    setOffset(0);
    fetchActivities({ offset: 0 });
  }, [apiSlug, accessToken, hours]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cambio de filtros
  useEffect(() => {
    setOffset(0);
    fetchActivities({ offset: 0, t: type, srch: search, lead: leadFilter });
  }, [type, search, leadFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live polling (30s)
  useEffect(() => {
    if (liveRef.current) { clearInterval(liveRef.current); liveRef.current = null; }
    if (live) liveRef.current = setInterval(() => fetchActivities(), 30_000);
    return () => { if (liveRef.current) clearInterval(liveRef.current); };
  }, [live, fetchActivities]);

  return (
    <div className="premium-card overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-3 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <Inbox className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">{title}</span>
          {data && !loading && (
            <Badge variant="secondary" className="text-[11px]">{data.total}</Badge>
          )}
        </div>

        {/* Time range */}
        <div className="flex items-center gap-0.5 bg-secondary rounded-md p-0.5">
          {TIME_RANGES.map(r => (
            <button
              key={r.label}
              onClick={() => setHours(r.hours)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                hours === r.hours
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {lastRefresh && (
            <span className="text-[11px] text-muted-foreground hidden md:block tabular-nums">
              {lastRefresh.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <button
            onClick={() => setLive(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
              live
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {live ? <Radio className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />}
            Live
          </button>
          <button
            onClick={() => fetchActivities()}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md border border-border hover:bg-secondary transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Filters row ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-wrap">
        {/* Type filter */}
        {!fixedType && (
          <div className="flex items-center gap-0.5 bg-secondary rounded-md p-0.5 flex-wrap">
            <button
              onClick={() => setType("all")}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                type === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Todas
              {data && <span className="ml-1 text-muted-foreground/70">({ACTIVITY_TYPES.reduce((s, t) => s + (data.counts[t] ?? 0), 0)})</span>}
            </button>
            {ACTIVITY_TYPES.map(t => {
              const cfg = TYPE_CONFIG[t];
              const Icon = cfg.icon;
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    type === t
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3 h-3" style={{ color: cfg.color }} />
                  {cfg.short}
                  {data && <span className="text-muted-foreground/70">({data.counts[t] ?? 0})</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Lead / conversation filter */}
        <div className="relative w-40">
          <Hash className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="ID de lead..."
            value={leadFilter}
            onChange={e => setLeadFilter(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-secondary border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {leadFilter && (
            <button
              onClick={() => setLeadFilter("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar en mensajes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-secondary border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── Activity list ── */}
      <div className="max-h-[560px] overflow-y-auto">
        {loading && !data ? (
          <div className="divide-y divide-border/50">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="px-4 py-3 flex items-start gap-3">
                <Skel className="w-6 h-6 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Skel className="h-3.5 w-24" /><Skel className="h-3.5 w-16" /><Skel className="h-3.5 w-20" />
                  </div>
                  <Skel className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : !data?.activities?.length ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
            <Inbox className="w-7 h-7 opacity-30" />
            <p className="text-xs">Sin actividad en este rango</p>
          </div>
        ) : (
          <>
            {data.activities.map(item => (
              <ActivityRow key={item.id} item={item} onClick={() => setSelected(item)} />
            ))}

            {/* Pagination */}
            {data.total > LIMIT && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/30">
                <span className="text-[11px] text-muted-foreground">
                  {offset + 1}–{Math.min(offset + LIMIT, data.total)} de {data.total}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={offset === 0 || loading}
                    onClick={() => {
                      const next = Math.max(0, offset - LIMIT);
                      setOffset(next);
                      fetchActivities({ offset: next });
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 px-2 py-1 rounded border border-border hover:bg-secondary transition-colors"
                  >
                    ← Anterior
                  </button>
                  <button
                    disabled={offset + LIMIT >= data.total || loading}
                    onClick={() => {
                      const next = offset + LIMIT;
                      setOffset(next);
                      fetchActivities({ offset: next });
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 px-2 py-1 rounded border border-border hover:bg-secondary transition-colors"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selected && (
        <ActivityModal item={selected} onClose={() => setSelected(null)} crmSubdomain={crmSubdomain} />
      )}
    </div>
  );
}
