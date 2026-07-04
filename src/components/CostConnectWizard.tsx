import { useState } from "react";
import { createPortal } from "react-dom";
import {
  X, DollarSign, ExternalLink, ArrowRight, ArrowLeft,
  CheckCircle2, Loader2, KeyRound, Hash, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.DEV
  ? "/umeia-api"
  : (import.meta.env.VITE_API_URL ?? "https://umeia.space");

interface Props {
  apiSlug: string;
  onClose: () => void;
  onConnected: () => void;
}

/**
 * Mini wizard para conectar la cuenta de WhatsApp Business (Meta) del
 * cliente. La activación del módulo de costos SOLO ocurre si la conexión
 * se valida exitosamente contra Meta — sin conexión no hay módulo.
 */
export function CostConnectWizard({ apiSlug, onClose, onConnected }: Props) {
  const [step, setStep] = useState(0);
  const [wabaId, setWabaId] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wabaName, setWabaName] = useState<string | null>(null);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/metrics/costs/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: apiSlug, waba_id: wabaId.trim(), access_token: token.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.detail ?? "No se pudo validar la conexión. Revisá los datos e intentá de nuevo.");
        return;
      }
      setWabaName(json?.waba_name ?? null);
      setStep(3); // éxito
    } catch {
      setError("No se pudo contactar al servidor. Verificá tu conexión e intentá de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const STEPS = ["Qué necesitás", "Obtener los datos", "Conectar"];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 animate-fade-in max-h-[90vh] overflow-y-auto">

        {/* header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Activar Costos de WhatsApp</h3>
              <p className="text-xs text-muted-foreground">Conectá tu cuenta de Meta para ver costos reales</p>
            </div>
          </div>
          <button onClick={onClose} disabled={busy}
            className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* progress */}
        {step < 3 && (
          <div className="flex items-center gap-1.5 mb-5">
            {STEPS.map((label, i) => (
              <div key={label} className="flex-1">
                <div className={cn("h-1 rounded-full", i <= step ? "bg-warning" : "bg-secondary")} />
                <p className={cn("mt-1.5 text-[10px] font-medium",
                  i === step ? "text-foreground" : "text-muted-foreground")}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* PASO 0 — qué es y qué se necesita */}
        {step === 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Este módulo muestra el <span className="text-foreground font-medium">costo real</span> de
              tus mensajes de WhatsApp directamente desde Meta — sin estimaciones y sin salir del panel.
            </p>
            <div className="rounded-xl bg-secondary/40 border border-border p-4 space-y-2.5">
              <p className="text-xs font-semibold">Vas a necesitar (5 minutos):</p>
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck size={14} className="shrink-0 mt-0.5 text-info" />
                Acceso como administrador al Meta Business Suite de tu empresa.
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Hash size={14} className="shrink-0 mt-0.5 text-info" />
                El <span className="text-foreground">ID de tu cuenta de WhatsApp Business</span> (WABA ID).
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <KeyRound size={14} className="shrink-0 mt-0.5 text-info" />
                Un <span className="text-foreground">token de acceso</span> de usuario del sistema.
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              El token se guarda cifrado y solo se usa para leer los costos de tu cuenta.
              Podés revocarlo en cualquier momento desde Meta.
            </p>
            <button onClick={() => setStep(1)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-warning text-warning-foreground text-sm font-semibold py-2.5 hover:opacity-90 transition-opacity">
              Empezar <ArrowRight size={15} />
            </button>
          </div>
        )}

        {/* PASO 1 — instrucciones */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-xl bg-secondary/40 border border-border p-4 space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <Hash size={13} className="text-info" /> 1 · Copiá tu WABA ID
              </p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside leading-relaxed">
                <li>Entrá a <a href="https://business.facebook.com/wa/manage/home/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline inline-flex items-center gap-0.5">WhatsApp Manager <ExternalLink size={10} /></a></li>
                <li>Elegí tu cuenta de WhatsApp Business.</li>
                <li>En <span className="text-foreground">Configuración de la cuenta</span> vas a ver el <span className="text-foreground">Identificador de la cuenta</span> — ese número es tu WABA ID.</li>
              </ol>
            </div>
            <div className="rounded-xl bg-secondary/40 border border-border p-4 space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <KeyRound size={13} className="text-info" /> 2 · Generá el token
              </p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside leading-relaxed">
                <li>Entrá a <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline inline-flex items-center gap-0.5">Usuarios del sistema <ExternalLink size={10} /></a> en la configuración del negocio.</li>
                <li>Creá un usuario del sistema (o usá uno existente) con rol <span className="text-foreground">Administrador</span>.</li>
                <li>En <span className="text-foreground">Agregar activos</span>, asignale tu cuenta de WhatsApp con control total.</li>
                <li>Tocá <span className="text-foreground">Generar token</span>, elegí la app, marcá el permiso <span className="text-foreground font-mono text-[11px]">whatsapp_business_management</span> y elegí que no expire.</li>
                <li>Copiá el token (empieza con <span className="font-mono text-[11px]">EAA…</span>). Se muestra una sola vez.</li>
              </ol>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(0)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-border text-sm font-medium py-2.5 px-4 hover:bg-secondary transition-colors">
                <ArrowLeft size={14} /> Atrás
              </button>
              <button onClick={() => setStep(2)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-warning text-warning-foreground text-sm font-semibold py-2.5 hover:opacity-90 transition-opacity">
                Ya tengo los datos <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* PASO 2 — formulario */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">WABA ID</label>
              <input
                value={wabaId}
                onChange={e => setWabaId(e.target.value)}
                placeholder="p. ej. 102934857612345"
                inputMode="numeric"
                className="mt-1.5 w-full rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-warning/50"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                Es el <span className="text-foreground">Identificador de la cuenta de WhatsApp Business</span>,
                no el "Identificador del número de teléfono" (aparecen juntos y se confunden fácil).
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Token de acceso</label>
              <input
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="EAA…"
                type="password"
                autoComplete="off"
                className="mt-1.5 w-full rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-warning/50"
              />
            </div>
            {error && (
              <p className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-xl px-3.5 py-2.5 leading-relaxed">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} disabled={busy}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-border text-sm font-medium py-2.5 px-4 hover:bg-secondary transition-colors">
                <ArrowLeft size={14} /> Atrás
              </button>
              <button
                onClick={connect}
                disabled={busy || !wabaId.trim() || !token.trim()}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-warning text-warning-foreground text-sm font-semibold py-2.5 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                {busy ? <><Loader2 size={15} className="animate-spin" /> Validando con Meta…</> : "Conectar y activar"}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              Validamos la conexión con Meta antes de activar — si algo falla, no se guarda nada.
            </p>
          </div>
        )}

        {/* PASO 3 — éxito */}
        {step === 3 && (
          <div className="space-y-4 text-center py-4">
            <div className="w-14 h-14 rounded-full bg-success/15 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-success" />
            </div>
            <div>
              <h4 className="text-sm font-bold">¡Cuenta conectada!</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                {wabaName ? <>Conectamos <span className="text-foreground font-medium">{wabaName}</span>.</> : "Conexión validada con Meta."}{" "}
                El módulo de costos quedó activo — ya vas a ver la card en tu Resumen.
              </p>
            </div>
            <button onClick={() => { onConnected(); onClose(); }}
              className="w-full rounded-xl bg-success text-success-foreground text-sm font-semibold py-2.5 hover:opacity-90 transition-opacity">
              Listo
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
