import { Tenant, TENANTS } from "@/data/tenants";

const PANEL_MANIFEST = {
  product: "Portal Cliente UMEIA",
  version: "1.0.0",
  description:
    "Panel de visualización exclusivo para clientes finales de UMEIA. 100% read-only: muestra métricas de operación de un asistente WhatsApp con IA (automatización, intervención humana, origen del tráfico, costos, módulos activos, infraestructura, campañas y tickets).",
  stack: {
    framework: "React 18 + Vite 5",
    language: "TypeScript 5",
    ui: "Tailwind CSS v3 + shadcn/ui",
    charts: "Recharts + visuales custom (SVG)",
    state: "React Context (Auth, Theme) + hooks locales",
    auth: "Mock local (localStorage) — sin backend real",
    data: "Datos demo en src/data/tenants.ts + simulación en vivo (useLiveTraffic, useCountUp)",
  },
  capabilities: [
    "Multi-tenant (Cloud vs On-Premise) con toggle de tema dual (light/dark)",
    "Simulación de tráfico en tiempo real con animaciones de KPIs",
    "Trazabilidad completa de campañas WhatsApp: enviados → entregados → respondidos → conversación → lead",
    "Diagrama de infraestructura diferenciado: WhatsApp Cloud API vs Integración Local",
    "Visualización de costos (IA, WhatsApp, infra) y horas ahorradas",
    "Tickets con respuestas e insights/recomendaciones",
  ],
  constraints: [
    "Sin acciones operativas (no se envían campañas, no se modifican datos)",
    "Sin credenciales ni datos técnicos sensibles expuestos",
    "Sin backend real: toda la data es mock",
  ],
  routes: [
    { path: "/login", title: "Login", purpose: "Acceso mock por email/password" },
    { path: "/", title: "Resumen", purpose: "KPIs principales + resumen de campañas y actividad" },
    { path: "/conversaciones", title: "Conversaciones", purpose: "Listado de interacciones con badge de origen (incluye Campaña WhatsApp)" },
    { path: "/campanas", title: "Campañas", purpose: "Funnel animado, conversiones, leads y comparativo período actual vs anterior" },
    { path: "/automatizacion", title: "Automatización", purpose: "% de procesos automatizados vs humanos" },
    { path: "/origen", title: "Origen", purpose: "De dónde vienen las consultas (ads, campañas, orgánico, WhatsApp)" },
    { path: "/costos", title: "Costos", purpose: "Costo IA, WhatsApp, infraestructura y comparativo mensual" },
    { path: "/modulos", title: "Módulos", purpose: "Módulos activos del asistente" },
    { path: "/infraestructura", title: "Infraestructura", purpose: "Diagrama de arquitectura Cloud o On-Premise" },
    { path: "/insights", title: "Insights", purpose: "Hallazgos y recomendaciones de optimización" },
    { path: "/tickets", title: "Tickets", purpose: "Tickets con respuestas del asistente" },
  ],
  tenants: ["electro-rai", "centro-copacabana"],
};

export function buildPanelExport(tenant: Tenant) {
  return {
    manifest: PANEL_MANIFEST,
    exportedAt: new Date().toISOString(),
    currentTenant: tenant,
    allTenantsSummary: Object.values(TENANTS).map((t) => ({
      id: t.id,
      name: t.name,
      type: t.type,
      vertical: t.verticalLabel,
      whatsapp: t.whatsapp,
      kpis: t.kpis,
    })),
    note:
      "Este JSON describe la estructura, capacidades y datos demo del Portal Cliente UMEIA. Pegalo en ChatGPT (u otra IA) para que entienda qué está construido, qué módulos hay, qué métricas se muestran y cómo se relacionan los tenants Cloud vs On-Premise.",
  };
}

export function downloadPanelJson(tenant: Tenant) {
  const data = buildPanelExport(tenant);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `umeia-portal-${tenant.id}-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
