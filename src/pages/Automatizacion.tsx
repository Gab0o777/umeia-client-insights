import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { KpiCard } from "@/components/KpiCard";
import { Bot, User, Layers } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export default function Automatizacion() {
  const { tenant } = useAuth();
  if (!tenant) return null;

  const total = tenant.kpis.messages;
  const autoCount = Math.round(total * (tenant.kpis.automation / 100));
  const humanCount = total - autoCount;
  const mixedCount = Math.round(total * 0.12);

  return (
    <div className="space-y-6">
      <SectionHeader title="Automatización" description="Cuánto automatiza UMEIA y dónde interviene el humano." />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Respuestas automáticas" value={autoCount} icon={Bot} accent="success" />
        <KpiCard label="Respuestas humanas" value={humanCount} icon={User} accent="accent" />
        <KpiCard label="Mixtas (auto + humano)" value={mixedCount} icon={Layers} accent="info" />
      </div>

      <div className="premium-card p-5">
        <h3 className="text-sm font-semibold mb-1">Automatización vs humano por tipo de proceso</h3>
        <p className="text-xs text-muted-foreground mb-4">Procesos clave de tu vertical: {tenant.verticalLabel}</p>
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tenant.processes} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} angle={-15} textAnchor="end" height={70} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} unit="%" />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="auto" name="Automático" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
              <Bar dataKey="human" name="Humano" stackId="a" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tenant.processes.map((p, i) => (
          <div key={p.name} className="premium-card p-5" style={{ animation: `fade-in 0.5s ease-out ${i * 0.06}s both` }}>
            <div className="text-sm font-semibold mb-3">{p.name}</div>
            <div className="flex h-2 rounded-full overflow-hidden bg-secondary">
              <div className="bg-primary transition-all" style={{ width: `${p.auto}%` }} />
              <div className="bg-accent transition-all" style={{ width: `${p.human}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-primary font-semibold">{p.auto}% auto</span>
              <span className="text-accent font-semibold">{p.human}% humano</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
