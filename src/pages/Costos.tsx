import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { KpiCard } from "@/components/KpiCard";
import { useCosts, costPrefix } from "@/hooks/useCosts";
import { DollarSign, MessagesSquare, Calculator, Info, ExternalLink, AlertTriangle } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { KpiSkeleton, ChartSkeleton, EmptyData } from "@/components/Skeleton";

const TOOLTIP_STYLE = {
  background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))",
  borderRadius: 8, fontSize: 12,
};
const TIME_RANGES = [
  { label: "24h", hours: 24  }, { label: "7d",  hours: 168 },
  { label: "30d", hours: 720 }, { label: "90d", hours: 2160 },
];
const CATEGORY_LABELS: Record<string, string> = {
  marketing: "Marketing",
  marketing_lite: "Marketing - Lite",
  utility: "Utilidad",
  authentication: "Autenticación",
  "authentication-international": "Autenticación internacional",
  authentication_international: "Autenticación internacional",
  service: "Servicio",
  referral_conversion: "Referral",
  unknown: "Otros",
};

export default function Costos() {
  const { tenant } = useAuth();
  const [hours, setHours] = useState(720);
  const { data, loading } = useCosts(tenant?.apiSlug, hours);
  if (!tenant) return null;

  const hasData = !!data?.module_enabled && !data.error && data.total_cost_usd != null;
  const perMessage = data?.pricing_model === "per_message";
  const billableUnits = perMessage
    ? (data?.total_paid_messages ?? null)
    : (data?.total_conversations ?? null);
  const avgPerUnit =
    hasData && billableUnits
      ? (data!.total_cost_usd as number) / billableUnits
      : null;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Costos"
        description={`Costos reales de WhatsApp de ${tenant.name}.`}
        actions={
          <div className="flex items-center gap-0.5 bg-secondary rounded-md p-0.5">
            {TIME_RANGES.map(r => (
              <button key={r.label} onClick={() => setHours(r.hours)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  hours === r.hours
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}>
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {loading && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiSkeleton /><KpiSkeleton /><KpiSkeleton />
          </div>
          <div className="premium-card p-5"><ChartSkeleton height={260} /></div>
        </>
      )}

      {/* Módulo no activo / cuenta no conectada */}
      {!loading && data && !data.module_enabled && (
        <div className="premium-card p-8 text-center space-y-3">
          <p className="text-sm font-medium">El módulo de costos no está activo.</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Para ver el costo real de tus mensajes de WhatsApp necesitás conectar tu cuenta de
            Meta. Se hace una sola vez, en unos 5 minutos, desde la sección de módulos.
          </p>
          <Link to="/modulos" className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline">
            Ir a Módulos y conectar <ExternalLink size={12} />
          </Link>
        </div>
      )}

      {/* Módulo activo pero Meta falló — nunca mostramos números inexactos */}
      {!loading && data?.module_enabled && data.error && (
        <div className="premium-card p-8 text-center space-y-3">
          <AlertTriangle size={24} className="text-warning mx-auto" />
          {data.error === "cost_unavailable" ? (
            <>
              <p className="text-sm font-medium">Meta no expone el costo de esta cuenta por API.</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                Tu cuenta de WhatsApp Business está facturada a través de la línea de crédito de un
                partner de Meta, y en ese caso Meta no publica los importes por API (solo los
                volúmenes de mensajes). El costo real está disponible en la facturación de tu
                proveedor o en WhatsApp Manager. Preferimos no mostrarte un número inventado.
              </p>
              {data.total_paid_messages != null && (
                <p className="text-xs text-muted-foreground">
                  En el período: {data.total_paid_messages.toLocaleString()} mensajes facturables
                  {data.total_free_messages != null
                    ? ` y ${data.total_free_messages.toLocaleString()} gratuitos`
                    : ""}.
                </p>
              )}
            </>
          ) : data.error === "reconnect_required" ? (
            <>
              <p className="text-sm font-medium">La conexión con Meta expiró.</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                El token de acceso dejó de ser válido (puede haber sido revocado o vencido).
                Volvé a conectar tu cuenta para seguir viendo los costos.
              </p>
              <Link to="/modulos" className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline">
                Reconectar en Módulos <ExternalLink size={12} />
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">No pudimos obtener los datos de Meta.</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                Es un problema temporal de comunicación con Meta. Probá de nuevo en unos minutos —
                preferimos no mostrarte números que no sean exactos.
              </p>
            </>
          )}
        </div>
      )}

      {/* Datos reales */}
      {!loading && hasData && data && (
        <>
          <div className="premium-card p-4 border-success/30 bg-success/5 flex items-start gap-3">
            <Info size={16} className="text-success shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">Costo real</span> — datos obtenidos
              directamente de tu cuenta de WhatsApp Business
              {data.waba_name ? <> (<span className="text-foreground">{data.waba_name}</span>)</> : null}.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard
              label="Costo total"
              value={data.total_cost_usd ?? null}
              prefix={costPrefix(data.currency)} decimals={2}
              icon={DollarSign} accent="warning"
              subtitle="del período seleccionado"
            />
            <KpiCard
              label={perMessage ? "Mensajes pagos" : "Conversaciones"}
              value={billableUnits}
              icon={MessagesSquare} accent="primary"
              subtitle={
                perMessage
                  ? (data.total_free_messages != null
                      ? `+ ${data.total_free_messages.toLocaleString()} gratuitos (servicio)`
                      : "facturables por Meta")
                  : "facturables por Meta"
              }
            />
            <KpiCard
              label="Costo promedio"
              value={avgPerUnit}
              prefix={costPrefix(data.currency)} decimals={4}
              icon={Calculator} accent="info"
              subtitle={perMessage ? "por mensaje pago" : "por conversación"}
            />
          </div>

          <div className="premium-card p-5">
            <h3 className="text-sm font-semibold mb-4">Costo por día</h3>
            <div className="h-[260px]">
              {data.by_day && data.by_day.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.by_day} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11}
                      tickFormatter={(v: number) => `$${v}`} />
                    <Tooltip contentStyle={TOOLTIP_STYLE}
                      formatter={(v: number) => [`${costPrefix(data.currency)}${Number(v).toFixed(2)}`, "Costo"]} />
                    <Bar dataKey="cost_usd" fill="hsl(var(--warning))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyData message="Sin costos registrados en este período." />
              )}
            </div>
          </div>

          {data.by_category && data.by_category.length > 0 && (
            <div className="premium-card p-5">
              <h3 className="text-sm font-semibold mb-4">
                {perMessage ? "Por categoría de mensaje" : "Por tipo de conversación"}
              </h3>
              <div className="space-y-2">
                {data.by_category.map(c => {
                  const units = c.messages ?? c.conversations ?? 0;
                  const unitLabel = perMessage ? "mensajes" : "conversaciones";
                  return (
                    <div key={c.category}
                      className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-4 py-3">
                      <div>
                        <span className="text-sm font-medium">
                          {CATEGORY_LABELS[c.category] ?? c.category}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {units.toLocaleString()} {unitLabel}
                        </span>
                      </div>
                      <span className="text-sm font-semibold">{costPrefix(data.currency)}{c.cost_usd.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
