// Skeleton loader reutilizable para estados de carga

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-secondary/60",
        className
      )}
    />
  );
}

// KPI card skeleton
export function KpiSkeleton() {
  return (
    <div className="premium-card p-5 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

// Chart area skeleton
export function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div
      className="w-full rounded-xl bg-secondary/30 animate-pulse flex items-end gap-1.5 px-4 pb-4 pt-8"
      style={{ height }}
    >
      {[55, 70, 45, 85, 60, 90, 75, 50, 80, 65, 40, 72].map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-t bg-secondary/60"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

// Pie/donut skeleton
export function PieSkeleton({ size = 160 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center" style={{ height: size }}>
      <div
        className="rounded-full border-[20px] border-secondary/60 animate-pulse"
        style={{ width: size * 0.75, height: size * 0.75 }}
      />
    </div>
  );
}

// Tabla / lista skeleton
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
          <Skeleton className="h-5 w-12 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

// Empty state genérico para secciones sin datos de backend aún
export function ComingSoon({ title, description }: { title?: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-secondary/60 flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0h6M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-foreground mb-1">{title ?? "Datos no disponibles"}</p>
      <p className="text-xs text-muted-foreground max-w-xs">{description ?? "Esta sección se conectará al backend en una próxima versión."}</p>
    </div>
  );
}

// Estado vacío cuando hay datos reales pero el resultado es vacío
export function EmptyData({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[160px] text-center">
      <p className="text-xs text-muted-foreground">{message ?? "Sin datos en el período seleccionado"}</p>
    </div>
  );
}
