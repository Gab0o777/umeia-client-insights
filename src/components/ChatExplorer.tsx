/**
 * ChatExplorer — lista de mensajes reales con búsqueda, filtros y paginación.
 * Adaptado de ChatExplorerView (projects app) para el portal UMEIA.
 * No tiene selector de tenant: usa el apiSlug del tenant autenticado.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowDownLeft, ArrowUpRight, Search, X, ChevronRight,
  Hash, Clock, Inbox, RefreshCw, Radio,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { API_BASE, authHeaders } from "@/lib/apiClient";

// ─── Config ──────────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  respond:         "Respuesta automática",
  menu_navigation: "Menú navegado",
  escalate:        "Escalado a agente",
  move_column:     "Movimiento columna",
  ready_to_buy:    "Listo para comprar",
  query_system:    "Consulta a sistema",
  unknown:         "Sin determinar",
};

const ACTION_COLORS: Record<string, string> = {
  respond:         "#34d399",
  menu_navigation: "#34d399",
  escalate:        "#fb923c",
  move_column:     "#a78bfa",
  ready_to_buy:    "#f59e0b",
  query_system:    "#60a5fa",
  unknown:         "#6b7280",
};

const TIME_RANGES = [
  { label: "1h",  hours: 1 },
  { label: "6h",  hours: 6 },
  { label: "24h", hours: 24 },
  { label: "7d",  hours: 168 },
  { label: "30d", hours: 720 },
];

const MSG_LIMIT = 50;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMsg {
  id: number;
  channel: string;
  conversation_id: string | null;
  direction: "inbound" | "outbound";
  message: string;
  intent: string | null;
  action: string | null;
  created_at: string | null;
}

interface MessagesResponse {
  total: number;
  limit: number;
  offset: number;
  messages: ChatMsg[];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Skel({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-secondary ${className}`} />;
}

function IntentBadge({ intent }: { intent: string | null }) {
  if (!intent) return null;
  return (
    <span className="shrink-0 text-[10px] font-medium rounded px-1.5 py-0.5 bg-secondary text-muted-foreground capitalize">
      {intent.replace(/_/g, " ")}
    </span>
  );
}

function ActionBadge({ action }: { action: string | null }) {
  if (!action) return null;
  const color = ACTION_COLORS[action] ?? "#6b7280";
  return (
    <span
      className="shrink-0 text-[10px] font-medium rounded px-1.5 py-0.5"
      style={{ color, backgroundColor: `${color}18` }}
    >
      {ACTION_LABELS[action] ?? action}
    </span>
  );
}

function MessageRow({ msg, onClick }: { msg: ChatMsg; onClick: () => void }) {
  const isInbound = msg.direction === "inbound";
  const ts = msg.created_at
    ? new Date(msg.created_at).toLocaleString("es-AR", {
        month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

  return (
    <div
      onClick={onClick}
      className="flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 hover:bg-secondary/40 cursor-pointer transition-colors group"
    >
      <div className={`shrink-0 mt-0.5 flex items-center justify-center w-6 h-6 rounded-full ${
        isInbound ? "text-accent bg-accent/10" : "text-muted-foreground bg-secondary"
      }`}>
        {isInbound
          ? <ArrowDownLeft className="w-3 h-3" />
          : <ArrowUpRight  className="w-3 h-3" />}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-muted-foreground font-mono tabular-nums shrink-0">{ts}</span>
          <span className="text-[10px] font-medium text-muted-foreground bg-secondary rounded px-1.5 py-0.5 shrink-0">
            {msg.channel}
          </span>
          {msg.conversation_id && (
            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5 shrink-0">
              <Hash className="w-2.5 h-2.5" />{msg.conversation_id}
            </span>
          )}
          <IntentBadge intent={msg.intent} />
          <ActionBadge action={msg.action} />
        </div>
        <p className="text-xs text-foreground/80 truncate leading-relaxed">{msg.message}</p>
      </div>

      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 mt-1 group-hover:text-muted-foreground transition-colors" />
    </div>
  );
}

function MessageModal({ msg, onClose }: { msg: ChatMsg; onClose: () => void }) {
  const isInbound = msg.direction === "inbound";
  const ts = msg.created_at
    ? new Date(msg.created_at).toLocaleString("es-AR", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      })
    : "—";

  return (
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
            <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
              isInbound ? "text-accent bg-accent/10" : "text-muted-foreground bg-secondary"
            }`}>
              {isInbound ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
            </div>
            <span className="text-sm font-medium capitalize">{msg.direction}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{msg.channel}</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-px bg-border">
          {[
            { label: "ID",           value: `#${msg.id}` },
            { label: "Conversación", value: msg.conversation_id ?? "—" },
            { label: "Intent",       value: msg.intent?.replace(/_/g, " ") ?? "—" },
            { label: "Acción",       value: ACTION_LABELS[msg.action ?? ""] ?? msg.action ?? "—" },
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

        <div className="px-5 py-4">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Mensaje</p>
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function ChatExplorer({ apiSlug }: { apiSlug: string }) {
  const { accessToken, logout } = useAuth();
  const [hours,        setHours]        = useState(24);
  const [live,         setLive]         = useState(false);
  const [msgs,         setMsgs]         = useState<MessagesResponse | null>(null);
  const [msgsLoading,  setMsgsLoading]  = useState(false);
  const [msgSearch,    setMsgSearch]    = useState("");
  const [msgDirection, setMsgDirection] = useState<"all" | "inbound" | "outbound">("all");
  const [msgOffset,    setMsgOffset]    = useState(0);
  const [selectedMsg,  setSelectedMsg]  = useState<ChatMsg | null>(null);
  const [lastRefresh,  setLastRefresh]  = useState<Date | null>(null);

  const liveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async (
    opts: { h?: number; offset?: number; dir?: string; srch?: string } = {}
  ) => {
    const h    = opts.h      ?? hours;
    const off  = opts.offset ?? msgOffset;
    const dir  = opts.dir    ?? msgDirection;
    const srch = opts.srch   ?? msgSearch;

    if (!accessToken) return;
    setMsgsLoading(true);
    try {
      const params = new URLSearchParams({
        tenant_id: apiSlug,
        hours:     String(h),
        limit:     String(MSG_LIMIT),
        offset:    String(off),
      });
      if (dir !== "all")  params.set("direction", dir);
      if (srch.trim())    params.set("search", srch.trim());

      const res = await fetch(`${API_BASE}/api/metrics/chat/messages?${params}`, { headers: authHeaders(accessToken) });
      if (res.status === 401) { logout(); return; }
      if (res.ok) {
        setMsgs(await res.json());
        setLastRefresh(new Date());
      }
    } finally {
      setMsgsLoading(false);
    }
  }, [apiSlug, accessToken, logout, hours, msgOffset, msgDirection, msgSearch]);

  // Carga inicial + cambio de rango
  useEffect(() => {
    setMsgOffset(0);
    fetchMessages({ offset: 0 });
  }, [apiSlug, hours]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cambio de filtros
  useEffect(() => {
    setMsgOffset(0);
    fetchMessages({ offset: 0, dir: msgDirection, srch: msgSearch });
  }, [msgDirection, msgSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live polling (30s)
  useEffect(() => {
    if (liveRef.current) { clearInterval(liveRef.current); liveRef.current = null; }
    if (live) liveRef.current = setInterval(() => fetchMessages(), 30_000);
    return () => { if (liveRef.current) clearInterval(liveRef.current); };
  }, [live, fetchMessages]);

  return (
    <div className="premium-card overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-3 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <Inbox className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Mensajes recientes</span>
          {msgs && !msgsLoading && (
            <Badge variant="secondary" className="text-[11px]">{msgs.total}</Badge>
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

        {/* Direction filter */}
        <div className="flex items-center gap-0.5 bg-secondary rounded-md p-0.5">
          {(["all", "inbound", "outbound"] as const).map(d => (
            <button
              key={d}
              onClick={() => setMsgDirection(d)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                msgDirection === d
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {d === "all" ? "Todos" : d}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar en mensajes..."
            value={msgSearch}
            onChange={e => setMsgSearch(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-secondary border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {msgSearch && (
            <button
              onClick={() => setMsgSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {lastRefresh && (
            <span className="text-[11px] text-muted-foreground hidden md:block tabular-nums">
              {lastRefresh.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          {/* Live */}
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
          {/* Refresh */}
          <button
            onClick={() => fetchMessages()}
            disabled={msgsLoading}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md border border-border hover:bg-secondary transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${msgsLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Message list ── */}
      <div className="max-h-[480px] overflow-y-auto">
        {msgsLoading && !msgs ? (
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
        ) : !msgs?.messages?.length ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
            <Inbox className="w-7 h-7 opacity-30" />
            <p className="text-xs">Sin mensajes en este rango</p>
          </div>
        ) : (
          <>
            {msgs.messages.map(msg => (
              <MessageRow key={msg.id} msg={msg} onClick={() => setSelectedMsg(msg)} />
            ))}

            {/* Pagination */}
            {msgs.total > MSG_LIMIT && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/30">
                <span className="text-[11px] text-muted-foreground">
                  {msgOffset + 1}–{Math.min(msgOffset + MSG_LIMIT, msgs.total)} de {msgs.total}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={msgOffset === 0 || msgsLoading}
                    onClick={() => {
                      const next = Math.max(0, msgOffset - MSG_LIMIT);
                      setMsgOffset(next);
                      fetchMessages({ offset: next });
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 px-2 py-1 rounded border border-border hover:bg-secondary transition-colors"
                  >
                    ← Anterior
                  </button>
                  <button
                    disabled={msgOffset + MSG_LIMIT >= msgs.total || msgsLoading}
                    onClick={() => {
                      const next = msgOffset + MSG_LIMIT;
                      setMsgOffset(next);
                      fetchMessages({ offset: next });
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

      {selectedMsg && <MessageModal msg={selectedMsg} onClose={() => setSelectedMsg(null)} />}
    </div>
  );
}
