import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { KpiCard } from "@/components/KpiCard";
import { DollarSign, Cpu, MessageCircle, TrendingDown, TrendingUp } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { cn } from "@/lib/utils";

export default function Costos() {
  const { tenant } = useAuth();
  if (!tenant) return null;

  const total = tenant.costs.aiCost + tenant.costs.waCost + tenant.costs.other;
  const perInteraction = total / tenant.kpis.messages;
  const delta = tenant.kpis.monthlyCost - tenant.kpis.prevMonthlyCost;
  const deltaPct = (delta / tenant.kpis.prevMonthlyCost) * 100;
  const better = delta < 0;

  const data = [
    { name: "IA", value: tenant.costs.aiCost, color: "hsl(var(--primary))" },
    { name: "WhatsApp", value: tenant.costs.waCost, color: "hsl(var(--success))" },
    { name: "Otros", value: tenant.costs.other, color: "hsl(var(--accent))" },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader title="Costos" description="Cuánto cuesta operar tu plataforma UMEIA." />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Costo mensual total" value={tenant.kpis.monthlyCost} prefix="USD " icon={DollarSign} accent="primary" />
        <KpiCard label="Costo por interacción" value={perInteraction} prefix="USD " decimals={3} icon={MessageCircle} accent="info" />
        <KpiCard label="Mes anterior" value={tenant.kpis.prevMonthlyCost} prefix="USD " icon={Cpu} accent="accent" />
      </div>

      <div className={cn("premium-card flex items-center gap-4 p-5", better ? "border-success/30" : "border-warning/30")}>
        <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", better ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
          {better ? <TrendingDown className="h-6 w-6" /> : <TrendingUp className="h-6 w-6" />}
        </div>
        <div>
          <div className="text-sm font-semibold">
            {better ? "Reducción" : "Incremento"} de {Math.abs(deltaPct).toFixed(1)}% vs mes anterior
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Diferencia: USD {Math.abs(delta).toLocaleString("es-AR")} {better ? "menos" : "más"}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="premium-card p-5">
          <h3 className="text-sm font-semibold mb-4">Distribución de costos</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3} label={(e) => `USD ${e.value}`}>
                  {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="premium-card p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" /> Inteligencia Artificial
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Proveedor</span><span className="font-medium">{tenant.costs.aiProvider}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Modelo</span><span className="font-mono text-xs">{tenant.costs.aiModel}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Costo</span><span className="font-bold text-primary">USD {tenant.costs.aiCost}</span></div>
            </div>
          </div>

          <div className="premium-card p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-success" /> WhatsApp
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Número conectado</span><span className="font-mono text-xs">{tenant.whatsapp.number}</span></div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cloud API</span>
                <span className={cn("font-semibold", tenant.whatsapp.cloudApi ? "text-success" : "text-muted-foreground")}>
                  {tenant.whatsapp.cloudApi ? "Activa" : "No activa"}
                </span>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Costo</span><span className="font-bold text-success">USD {tenant.costs.waCost}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
