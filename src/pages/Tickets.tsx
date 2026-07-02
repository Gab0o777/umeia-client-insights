import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { supabase } from "@/lib/supabase";
import { notifyTicket } from "@/lib/notifyTicket";
import {
  Plus, LifeBuoy, Clock, CheckCircle2, AlertCircle,
  Loader2, RefreshCw, X, User,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────

interface SupportTicket {
  id: string;
  tenant_id: string;
  category: string;
  message: string;
  status: "abierto" | "en_progreso" | "cerrado";
  assigned_to: string;
  created_by_email: string;
  created_by_name: string;
  resolution_note: string;
  created_at: string;
  updated_at: string;
}

// ─── Config ───────────────────────────────────────────────────

const CATEGORIES = ["Técnico", "Funcional", "Facturación", "Otro"] as const;

const STATUS_CONFIG: Record<
  SupportTicket["status"],
  { label: string; color: string; icon: typeof AlertCircle }
> = {
  abierto:     { label: "Abierto",      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",      icon: AlertCircle   },
  en_progreso: { label: "En progreso",  color: "text-amber-400 bg-amber-500/10 border-amber-500/20",   icon: Clock         },
  cerrado:     { label: "Cerrado",      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2  },
};

// ─── Helpers ──────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Subcomponents ────────────────────────────────────────────

function StatusBadge({ status }: { status: SupportTicket["status"] }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border", cfg.color)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full bg-secondary/60 text-muted-foreground border border-border/50">
      {category}
    </span>
  );
}

function TicketCard({ ticket }: { ticket: SupportTicket }) {
  const updatedAt = ticket.updated_at !== ticket.created_at ? ticket.updated_at : null;

  return (
    <div className={cn(
      "premium-card p-4 space-y-3 transition-all",
      ticket.status === "cerrado" && "opacity-60",
    )}>
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={ticket.status} />
          <CategoryBadge category={ticket.category} />
        </div>
        <span className="text-[11px] text-muted-foreground shrink-0">
          {formatDate(ticket.created_at)}
        </span>
      </div>

      {/* Message */}
      <p className="text-sm text-foreground leading-relaxed">{ticket.message}</p>

      {/* Resolution note (visible once closed) */}
      {ticket.status === "cerrado" && ticket.resolution_note && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1">
            Resolución del equipo
          </p>
          <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {ticket.resolution_note}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50">
        <div className="flex items-center gap-3">
          {ticket.assigned_to ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="w-3 h-3" />
              <span>Asignado a <span className="font-medium text-foreground">{ticket.assigned_to}</span></span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Sin asignar</span>
          )}
        </div>
        {updatedAt && (
          <span className="text-[11px] text-muted-foreground">
            Actualizado {formatDate(updatedAt)}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Create Ticket Form ───────────────────────────────────────

interface CreateFormProps {
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
  tenantName: string;
  userEmail: string;
  userName: string;
}

function CreateTicketForm({ onClose, onSuccess, tenantId, tenantName, userEmail, userName }: CreateFormProps) {
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError("El mensaje no puede estar vacío.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("support_tickets")
        .insert({
          tenant_id:        tenantId,
          category,
          message:          message.trim(),
          status:           "abierto",
          assigned_to:      "",
          created_by_email: userEmail,
          created_by_name:  userName,
        })
        .select()
        .single();
      if (err) throw err;

      notifyTicket({
        event: 'created',
        ticket: { ...data, tenant_name: tenantName },
      });

      onSuccess();
    } catch (e) {
      console.error(e);
      setError("No se pudo crear el ticket. Intentá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="premium-card p-5 space-y-4 border-accent/30">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <LifeBuoy className="w-4 h-4 text-accent" />
          Nuevo ticket de soporte
        </h3>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Category */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          Categoría
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                category === cat
                  ? "bg-accent text-accent-foreground border-accent"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50",
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
          Mensaje <span className="text-destructive">*</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describí tu problema o consulta con el mayor detalle posible..."
          rows={5}
          className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none placeholder:text-muted-foreground/50"
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          El equipo te va a responder lo antes posible.
        </p>
      </div>

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-secondary/50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting || !message.trim()}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-accent text-accent-foreground font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Enviar ticket
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function Tickets() {
  const { tenant, user } = useAuth();
  const [tickets, setTickets]     = useState<SupportTicket[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadTickets = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("tenant_id", user.tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets((data ?? []) as SupportTicket[]);
    } catch (err) {
      console.error("[tickets] error loading:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  if (!tenant || !user) return null;

  const openTickets   = tickets.filter((t) => t.status !== "cerrado");
  const closedTickets = tickets.filter((t) => t.status === "cerrado");

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Tickets de Soporte"
        description={`Consultás y seguís el estado de tus tickets con el equipo de UMEIA.`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadTickets(true)}
              disabled={refreshing}
              className="w-8 h-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo ticket
            </button>
          </div>
        }
      />

      {/* Create form */}
      {showForm && (
        <CreateTicketForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            loadTickets(true);
          }}
          tenantId={user.tenantId}
          tenantName={tenant.name}
          userEmail={user.email}
          userName={user.displayName}
        />
      )}

      {/* Loading state */}
      {loading ? (
        <div className="premium-card p-10 flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Cargando tickets...</span>
        </div>
      ) : tickets.length === 0 ? (
        /* Empty state */
        <div className="premium-card p-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-secondary/60 flex items-center justify-center">
            <LifeBuoy className="w-7 h-7 text-muted-foreground/40" />
          </div>
          <div>
            <p className="text-sm font-semibold mb-1">Sin tickets aún</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Cuando tengas una consulta o problema, creá un ticket y el equipo de soporte te va a responder.
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Crear mi primer ticket
          </button>
        </div>
      ) : (
        /* Ticket list */
        <div className="space-y-6">
          {openTickets.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Activos · {openTickets.length}
              </h2>
              {openTickets.map((t) => <TicketCard key={t.id} ticket={t} />)}
            </section>
          )}

          {closedTickets.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Cerrados · {closedTickets.length}
              </h2>
              {closedTickets.map((t) => <TicketCard key={t.id} ticket={t} />)}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
