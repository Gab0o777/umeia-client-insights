import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { Lightbulb, Sparkles, AlertTriangle, CheckCircle2, Info, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_STYLE = {
  info: { icon: Info, cls: "border-info/30 bg-info/5", iconCls: "text-info bg-info/10" },
  warning: { icon: AlertTriangle, cls: "border-warning/30 bg-warning/5", iconCls: "text-warning bg-warning/10" },
  success: { icon: CheckCircle2, cls: "border-success/30 bg-success/5", iconCls: "text-success bg-success/10" },
};

export default function Insights() {
  const { tenant } = useAuth();
  if (!tenant) return null;

  return (
    <div className="space-y-6">
      <SectionHeader title="Insights & recomendaciones" description="Lo que UMEIA detectó automáticamente en tu operación." />

      <div className="grid gap-4 md:grid-cols-2">
        {tenant.insights.map((ins, i) => {
          const S = TYPE_STYLE[ins.type];
          return (
            <div
              key={i}
              className={cn("premium-card border p-5 flex gap-4", S.cls)}
              style={{ animation: `fade-in 0.5s ease-out ${i * 0.08}s both` }}
            >
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", S.iconCls)}>
                <S.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">{ins.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{ins.description}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="premium-card relative overflow-hidden p-6">
        <div className="absolute inset-0 bg-gradient-glow opacity-50 pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-primary text-primary-foreground px-3 py-1 text-xs font-semibold mb-4">
            <Sparkles className="h-3 w-3" /> Recomendaciones de UMEIA
          </div>
          <div className="space-y-3">
            {tenant.recommendations.map((r, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl border border-border bg-card/80 p-4 backdrop-blur hover:border-primary/40 transition-colors"
                style={{ animation: `slide-in-right 0.4s ease-out ${i * 0.08}s both` }}
              >
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Lightbulb className="h-4 w-4" />
                </div>
                <p className="text-sm flex-1 pt-1">{r}</p>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1.5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
