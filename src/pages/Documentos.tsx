import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { KpiSkeleton, EmptyData } from "@/components/Skeleton";
import { API_BASE, authHeaders } from "@/lib/apiClient";
import {
  FileCheck2, Clock, CheckCircle2, XCircle, Loader2,
  RefreshCw, ExternalLink, LifeBuoy,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────

type DocumentoStatus = "recibido" | "pendiente_revision" | "aprobado" | "rechazado";

interface Documento {
  id: number;
  tenant_id: string;
  conversation_id: string;
  node_id: string;
  file_slot_id: string;
  label: string;
  file_url: string;
  solicitante_nombre: string | null;
  solicitante_dni: string | null;
  status: DocumentoStatus;
  rejection_reason: string | null;
  received_at: string;
  reviewed_at: string | null;
}

interface Solicitud {
  id: number;
  tenant_id: string;
  conversation_id: string;
  plataforma: string | null;
  tipo_problema: string | null;
  descripcion: string | null;
  captura_url: string | null;
  status: "abierto" | "en_progreso" | "cerrado";
  responsible_user: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Config ───────────────────────────────────────────────────

const DOC_STATUS_CONFIG: Record<DocumentoStatus, { label: string; color: string; icon: typeof Clock }> = {
  recibido:            { label: "Recibido",            color: "text-blue-400 bg-blue-500/10 border-blue-500/20",       icon: FileCheck2 },
  pendiente_revision:  { label: "Pendiente de revisión", color: "text-amber-400 bg-amber-500/10 border-amber-500/20",   icon: Clock },
  aprobado:            { label: "Aprobado",             color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
  rechazado:           { label: "Rechazado",            color: "text-red-400 bg-red-500/10 border-red-500/20",        icon: XCircle },
};

const SOLICITUD_STATUS_CONFIG: Record<Solicitud["status"], { label: string; color: string }> = {
  abierto:      { label: "Abierto",      color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  en_progreso:  { label: "En progreso",  color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  cerrado:      { label: "Cerrado",      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Subcomponents ────────────────────────────────────────────

function DocStatusBadge({ status }: { status: DocumentoStatus }) {
  const cfg = DOC_STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border", cfg.color)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function DocumentoCard({ doc, onDecide }: { doc: Documento; onDecide: (id: number, status: DocumentoStatus, reason?: string) => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const pending = doc.status === "recibido" || doc.status === "pendiente_revision";

  return (
    <div className={cn("premium-card p-4 space-y-3", doc.status === "rechazado" && "opacity-70")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <DocStatusBadge status={doc.status} />
          <span className="text-[11px] text-muted-foreground">{doc.node_id}</span>
        </div>
        <span className="text-[11px] text-muted-foreground shrink-0">{formatDate(doc.received_at)}</span>
      </div>

      <div className="text-sm font-medium">{doc.label}</div>
      {(doc.solicitante_nombre || doc.solicitante_dni) && (
        <div className="text-xs text-muted-foreground">
          {doc.solicitante_nombre ?? "—"} {doc.solicitante_dni ? `· DNI ${doc.solicitante_dni}` : ""}
        </div>
      )}
      <div className="text-[11px] text-muted-foreground">Conversación: {doc.conversation_id}</div>

      <a
        href={doc.file_url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        Ver archivo <ExternalLink className="w-3 h-3" />
      </a>

      {doc.status === "rechazado" && doc.rejection_reason && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1">Motivo de rechazo</p>
          <p className="text-xs text-foreground/90 leading-relaxed">{doc.rejection_reason}</p>
        </div>
      )}

      {pending && !rejecting && (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onDecide(doc.id, "aprobado")}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
          >
            Aprobar
          </button>
          <button
            onClick={() => setRejecting(true)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
          >
            Rechazar
          </button>
        </div>
      )}

      {pending && rejecting && (
        <div className="space-y-2 pt-1">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo del rechazo (obligatorio)..."
            className="w-full text-xs rounded-lg border border-border bg-secondary/40 px-3 py-2 resize-none"
            rows={2}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => reason.trim() && onDecide(doc.id, "rechazado", reason.trim())}
              disabled={!reason.trim()}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirmar rechazo
            </button>
            <button
              onClick={() => { setRejecting(false); setReason(""); }}
              className="text-xs font-medium px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-secondary/60 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SolicitudCard({ s }: { s: Solicitud }) {
  const cfg = SOLICITUD_STATUS_CONFIG[s.status];
  return (
    <div className="premium-card p-4 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className={cn("inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border", cfg.color)}>
          {cfg.label}
        </span>
        <span className="text-[11px] text-muted-foreground">{formatDate(s.created_at)}</span>
      </div>
      <div className="text-sm font-medium">{s.plataforma ?? "—"} · {s.tipo_problema ?? "Sin categoría"}</div>
      {s.descripcion && <p className="text-xs text-muted-foreground leading-relaxed">{s.descripcion}</p>}
      {s.captura_url && (
        <a href={s.captura_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          Ver captura <ExternalLink className="w-3 h-3" />
        </a>
      )}
      <div className="text-[11px] text-muted-foreground">Conversación: {s.conversation_id}</div>
      {s.responsible_user && <div className="text-[11px] text-muted-foreground">Asignado a: {s.responsible_user}</div>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function Documentos() {
  const { tenant, accessToken } = useAuth();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"documentos" | "solicitudes">("documentos");

  const load = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      const [docsRes, solsRes] = await Promise.all([
        fetch(`${API_BASE}/api/documentos?tenant_id=${encodeURIComponent(tenant.apiSlug)}`, { headers: authHeaders(accessToken) }),
        fetch(`${API_BASE}/api/solicitudes?tenant_id=${encodeURIComponent(tenant.apiSlug)}`, { headers: authHeaders(accessToken) }),
      ]);
      const docsData = await docsRes.json();
      const solsData = await solsRes.json();
      setDocumentos(docsData.documentos ?? []);
      setSolicitudes(solsData.solicitudes ?? []);
    } finally {
      setLoading(false);
    }
  }, [tenant, accessToken]);

  useEffect(() => { load(); }, [load]);

  const handleDecide = useCallback(async (id: number, status: DocumentoStatus, reason?: string) => {
    if (!tenant) return;
    setDocumentos((prev) => prev.map((d) => (d.id === id ? { ...d, status, rejection_reason: reason ?? null } : d)));
    await fetch(`${API_BASE}/api/documentos/${id}?tenant_id=${encodeURIComponent(tenant.apiSlug)}`, {
      method: "PATCH",
      headers: { ...authHeaders(accessToken), "Content-Type": "application/json" },
      body: JSON.stringify({ status, rejection_reason: reason ?? null }),
    });
    load();
  }, [tenant, accessToken, load]);

  const pendingCount = documentos.filter((d) => d.status === "recibido" || d.status === "pendiente_revision").length;
  const openSolicitudes = solicitudes.filter((s) => s.status !== "cerrado").length;

  return (
    <div>
      <SectionHeader
        title="Documentos y solicitudes"
        description="Documentación recibida por el bot y solicitudes de soporte que necesitan revisión humana."
        actions={
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-secondary/60 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Actualizar
          </button>
        }
      />

      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setTab("documentos")}
          className={cn(
            "text-sm font-medium px-4 py-2 rounded-lg transition-colors",
            tab === "documentos" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/60",
          )}
        >
          Documentos {pendingCount > 0 && <span className="ml-1 text-[10px] font-bold">({pendingCount})</span>}
        </button>
        <button
          onClick={() => setTab("solicitudes")}
          className={cn(
            "text-sm font-medium px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-1.5",
            tab === "solicitudes" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/60",
          )}
        >
          <LifeBuoy className="w-3.5 h-3.5" />
          Solicitudes de soporte {openSolicitudes > 0 && <span className="ml-1 text-[10px] font-bold">({openSolicitudes})</span>}
        </button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}
        </div>
      ) : tab === "documentos" ? (
        documentos.length === 0 ? (
          <EmptyData message="Todavía no se recibió documentación por este canal." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {documentos.map((doc) => <DocumentoCard key={doc.id} doc={doc} onDecide={handleDecide} />)}
          </div>
        )
      ) : solicitudes.length === 0 ? (
        <EmptyData message="No hay solicitudes de soporte." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {solicitudes.map((s) => <SolicitudCard key={s.id} s={s} />)}
        </div>
      )}
    </div>
  );
}
