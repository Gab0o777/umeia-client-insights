import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Megaphone, Send, CheckCircle2, MessageSquare, MessagesSquare, Target,
  TrendingUp, Cloud, Server, Users, Filter, ArrowRight, Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import type { Campaign, CampaignContact } from "@/data/tenants";

// =================== Helpers ===================
function pct(num: number, den: number) {
  if (!den) return 0;
  return (num / den) * 100;
}

function rateTone(value: number, kind: "delivery" | "response" | "convo" | "lead") {
  // Umbrales razonables por etapa
  const thresholds = {
    delivery: [95, 88], // verde >=95, amarillo >=88
    response: [25, 12],
    convo: [70, 50],
    lead: [25, 12],
  }[kind];
  if (value >= thresholds[0]) return "success";
  if (value >= thresholds[1]) return "warning";
  return "destructive";
}

function ToneBadge({ value, kind, label }: { value: number; kind: "delivery" | "response" | "convo" | "lead"; label: string }) {
  const tone = rateTone(value, kind);
  const cls =
    tone === "success"
      ? "bg-success/15 text-success border-success/30"
      : tone === "warning"
      ? "bg-warning/15 text-warning border-warning/30"
      : "bg-destructive/15 text-destructive border-destructive/30";
  return (
    <div className={cn("rounded-xl border px-3 py-2", cls)}>
      <div className="text-[10px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-lg font-bold tabular-nums">{value.toFixed(1)}%</div>
    </div>
  );
}

// =================== Funnel ===================
function Funnel({ c }: { c: Campaign }) {
  const stages = [
    { key: "contacts", label: "Contactos enviados", value: c.contacts, icon: Send, color: "hsl(var(--primary))" },
    { key: "delivered", label: "Entregados", value: c.delivered, icon: CheckCircle2, color: "hsl(var(--info))" },
    { key: "responses", label: "Respuestas", value: c.responses, icon: MessageSquare, color: "hsl(var(--accent))" },
    { key: "conversations", label: "Conversaciones", value: c.conversations, icon: MessagesSquare, color: "hsl(var(--primary-glow))" },
    { key: "leads", label: "Leads / casos", value: c.leads, icon: Target, color: "hsl(var(--success))" },
  ];
  const max = c.contacts;
  return (
    <div className="space-y-2.5">
      {stages.map((s, i) => {
        const width = Math.max(8, (s.value / max) * 100);
        const prev = i === 0 ? null : stages[i - 1].value;
        const conv = prev ? pct(s.value, prev) : 100;
        return (
          <div
            key={s.key}
            className="group"
            style={{ animation: `fade-in 0.5s ease-out ${i * 0.08}s both` }}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <div className="flex items-center gap-2">
                <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{s.label}</span>
              </div>
              <div className="flex items-center gap-2 tabular-nums">
                <span className="font-semibold">{s.value.toLocaleString("es-AR")}</span>
                {i > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {conv.toFixed(0)}% vs etapa previa
                  </span>
                )}
              </div>
            </div>
            <div className="relative h-9 rounded-lg bg-secondary/60 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-lg transition-all"
                style={{
                  width: `${width}%`,
                  background: `linear-gradient(90deg, ${s.color}, ${s.color} 70%, ${s.color}80)`,
                  animation: `slide-in-right 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${i * 0.08}s both`,
                }}
              />
              <div className="relative h-full flex items-center px-3">
                <span className="text-[11px] font-semibold text-foreground/90 mix-blend-difference">
                  {((s.value / max) * 100).toFixed(1)}% del total
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =================== Campaign Card ===================
function CampaignCard({ c, index }: { c: Campaign; index: number }) {
  const [filter, setFilter] = useState<"todos" | "respondedores" | "leads" | "fallidos">("todos");

  const deliveryRate = pct(c.delivered, c.contacts);
  const responseRate = pct(c.responses, c.delivered);
  const convoRate = pct(c.conversations, c.responses);
  const leadRate = pct(c.leads, c.conversations);

  const filtered = useMemo<CampaignContact[]>(() => {
    switch (filter) {
      case "respondedores": return c.contactSample.filter((x) => x.responded);
      case "leads": return c.contactSample.filter((x) => x.generatedLead);
      case "fallidos": return c.contactSample.filter((x) => !x.delivered);
      default: return c.contactSample;
    }
  }, [filter, c.contactSample]);

  const isCloud = c.channel === "cloud-api";

  return (
    <div
      className="premium-card p-5 sm:p-6 space-y-5"
      style={{ animation: `fade-in 0.5s ease-out ${index * 0.1}s both` }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="h-9 w-9 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Megaphone className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold">{c.name}</h3>
            <Badge variant="outline" className="font-mono text-[10px]">{c.id}</Badge>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>📅 {c.date}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.audience}</span>
          </div>
        </div>
        <Badge
          className={cn(
            "border gap-1.5",
            isCloud
              ? "bg-info/15 text-info border-info/30 hover:bg-info/20"
              : "bg-accent/15 text-accent border-accent/30 hover:bg-accent/20",
          )}
        >
          {isCloud ? <Cloud className="h-3 w-3" /> : <Server className="h-3 w-3" />}
          {c.channelLabel}
        </Badge>
      </div>

      {/* Tasas de conversión */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <ToneBadge value={deliveryRate} kind="delivery" label="% Entrega" />
        <ToneBadge value={responseRate} kind="response" label="% Respuesta" />
        <ToneBadge value={convoRate} kind="convo" label="% Conversación" />
        <ToneBadge value={leadRate} kind="lead" label="% Lead" />
      </div>

      {/* Funnel + Outcomes */}
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Funnel
          </div>
          <Funnel c={c} />
        </div>

        <div className="lg:col-span-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Resultado generado
          </div>
          <div className="space-y-2.5">
            {c.outcomes.map((o, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-success/15 text-success flex items-center justify-center">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm">{o.label}</span>
                </div>
                <span className="text-base font-bold tabular-nums">{o.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detalle de contactos */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Detalle de contactos (muestra)
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList className="h-8">
              <TabsTrigger value="todos" className="text-[11px] gap-1"><Filter className="h-3 w-3" />Todos</TabsTrigger>
              <TabsTrigger value="respondedores" className="text-[11px]">Respondedores</TabsTrigger>
              <TabsTrigger value="leads" className="text-[11px]">Leads</TabsTrigger>
              <TabsTrigger value="fallidos" className="text-[11px]">Fallidos</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead className="text-center">Envío</TableHead>
                <TableHead className="text-center">Respondió</TableHead>
                <TableHead className="text-center">Conversación</TableHead>
                <TableHead className="text-center">Lead</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">
                    No hay contactos para este filtro.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.phone}</TableCell>
                    <TableCell className="text-center">
                      <Dot ok={p.delivered} okLabel="Entregado" badLabel="Falló" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Dot ok={p.responded} okLabel="Sí" badLabel="No" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Dot ok={p.generatedConvo} okLabel="Sí" badLabel="No" />
                    </TableCell>
                    <TableCell className="text-center">
                      <Dot ok={p.generatedLead} okLabel="Sí" badLabel="No" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function Dot({ ok, okLabel, badLabel }: { ok: boolean; okLabel: string; badLabel: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        ok ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", ok ? "bg-success" : "bg-muted-foreground/50")} />
      {ok ? okLabel : badLabel}
    </span>
  );
}

// =================== Page ===================
export default function Campanas() {
  const { tenant } = useAuth();
  if (!tenant) return null;

  const totals = tenant.campaigns.reduce(
    (acc, c) => ({
      contacts: acc.contacts + c.contacts,
      delivered: acc.delivered + c.delivered,
      responses: acc.responses + c.responses,
      conversations: acc.conversations + c.conversations,
      leads: acc.leads + c.leads,
    }),
    { contacts: 0, delivered: 0, responses: 0, conversations: 0, leads: 0 },
  );

  const isCloud = tenant.type === "cloud";

  const trendData = tenant.campaignTrends.map((t) => ({
    name: t.period,
    Enviadas: t.sent,
    Conversaciones: t.convos,
    Leads: t.leads,
  }));

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Campañas de WhatsApp"
        description={`Trazabilidad de cada campaña hasta el resultado final — ${tenant.name}.`}
        actions={
          <Badge
            className={cn(
              "border gap-1.5",
              isCloud
                ? "bg-info/15 text-info border-info/30 hover:bg-info/20"
                : "bg-accent/15 text-accent border-accent/30 hover:bg-accent/20",
            )}
          >
            {isCloud ? <Cloud className="h-3 w-3" /> : <Server className="h-3 w-3" />}
            {isCloud ? "Envío vía Cloud API" : "Envío vía nodo local"}
          </Badge>
        }
      />

      {/* Totales del período */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Contactos", value: totals.contacts, icon: Send, color: "primary" },
          { label: "Entregados", value: totals.delivered, icon: CheckCircle2, color: "info" },
          { label: "Respuestas", value: totals.responses, icon: MessageSquare, color: "accent" },
          { label: "Conversaciones", value: totals.conversations, icon: MessagesSquare, color: "primary" },
          { label: "Leads", value: totals.leads, icon: Target, color: "success" },
        ].map((s, i) => (
          <div
            key={s.label}
            className="premium-card p-4"
            style={{ animation: `fade-in 0.5s ease-out ${i * 0.06}s both` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon className={cn(
                "h-4 w-4",
                s.color === "primary" && "text-primary",
                s.color === "info" && "text-info",
                s.color === "accent" && "text-accent",
                s.color === "success" && "text-success",
              )} />
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums">{s.value.toLocaleString("es-AR")}</div>
          </div>
        ))}
      </div>

      {/* Vista global comparativa */}
      <div className="premium-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Impacto de campañas en el período</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Comparativa mes actual vs mes anterior</p>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Enviadas" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Conversaciones" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Leads" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lista de campañas */}
      <div className="space-y-5">
        {tenant.campaigns.map((c, i) => (
          <CampaignCard key={c.id} c={c} index={i} />
        ))}
      </div>

      {/* Nota CRM */}
      <div className="premium-card relative overflow-hidden p-5">
        <div className="absolute inset-0 bg-gradient-glow opacity-50 pointer-events-none" />
        <div className="relative flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shrink-0">
            <ArrowRight className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">Resultados sincronizados al CRM</div>
            <p className="text-xs text-muted-foreground mt-1">
              Cada respuesta, conversación y lead generado por estas campañas queda trazado en el CRM
              de {tenant.name}, listo para seguimiento comercial.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
