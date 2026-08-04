import { LucideIcon } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: number | null | undefined;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  icon?: LucideIcon;
  trend?: { value: number; positive?: boolean };
  accent?: "primary" | "info" | "success" | "warning" | "accent";
  subtitle?: string;
  className?: string;
}

const ACCENT_BG: Record<NonNullable<Props["accent"]>, string> = {
  primary: "bg-primary/10 text-primary",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  accent: "bg-accent/10 text-accent",
};

function AnimatedValue({ value, prefix, suffix, decimals = 0 }: {
  value: number; prefix?: string; suffix?: string; decimals?: number;
}) {
  const v = useCountUp(value, { decimals, duration: 1400 });

  // El tamaño se calcula sobre el valor FINAL (no el que está animando) para
  // que la tipografía no salte de tamaño mientras el contador sube.
  const finalFormatted = value.toLocaleString("es-AR", {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  });
  const totalLength = (prefix?.length ?? 0) + finalFormatted.length + (suffix?.length ?? 0);
  const valueSize =
    totalLength > 17 ? "text-lg"
    : totalLength > 13 ? "text-xl"
    : totalLength > 9  ? "text-2xl"
    : "text-3xl";
  const prefixSize = totalLength > 9 ? "text-sm" : "text-lg";

  return (
    <>
      {prefix && <span className={cn("font-semibold text-muted-foreground shrink-0", prefixSize)}>{prefix}</span>}
      <span className={cn(valueSize, "font-bold tracking-tight animate-counter break-all")}>
        {v.toLocaleString("es-AR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      </span>
      {suffix && <span className="text-base font-semibold text-muted-foreground shrink-0">{suffix}</span>}
    </>
  );
}

export function KpiCard({
  label, value, prefix, suffix, decimals = 0, icon: Icon, trend, accent = "primary", subtitle, className,
}: Props) {
  const isReal = value !== null && value !== undefined;

  return (
    <div className={cn("premium-card p-5 group relative overflow-hidden", className)}>
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-glow opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider break-words">{label}</div>
          <div className="mt-2 flex flex-wrap items-baseline gap-1">
            {isReal ? (
              <AnimatedValue value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
            ) : (
              <span className="text-3xl font-bold tracking-tight text-muted-foreground/40">—</span>
            )}
          </div>
          {subtitle && <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>}
          {trend && isReal && (
            <div className={cn("mt-2 inline-flex items-center gap-1 text-xs font-semibold", trend.positive ? "text-success" : "text-destructive")}>
              <span>{trend.positive ? "▲" : "▼"}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground font-normal">vs mes ant.</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", ACCENT_BG[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
