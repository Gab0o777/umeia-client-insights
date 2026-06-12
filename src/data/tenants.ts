// Datos demo de los 2 tenants UMEIA. Todo mock — sin backend.

export type TenantId = "electro-rai" | "centro-copacabana";
export type TenantType = "cloud" | "on-premise";

export interface Tenant {
  apiSlug: string;   // slug real en el backend (e.g. "electrorai")
  id: TenantId;
  name: string;
  type: TenantType;
  vertical: string;
  verticalLabel: string;
  description: string;
  whatsapp: {
    number: string;
    connected: boolean;
    cloudApi: boolean;
    mode: string;
    lastSync: string;
  };
  kpis: {
    messages: number;
    activeConvos: number;
    automation: number; // %
    human: number; // %
    leads: number;
    avgResponseSec: number;
    hoursSaved: number;
    monthlyCost: number;
    prevMonthlyCost: number;
  };
  // mensajes por día (últimos 14 días)
  messagesByDay: { day: string; auto: number; human: number }[];
  // origen
  origin: { source: string; campaign: string; ad: string; landing: string; volume: number; conversions: number }[];
  // top consultas
  topQueries: { label: string; count: number }[];
  // canal
  byChannel: { name: string; value: number }[];
  // por horario
  byHour: { hour: string; value: number }[];
  // por intención
  byIntent: { intent: string; value: number }[];
  // automatización por proceso
  processes: { name: string; auto: number; human: number }[];
  // costos
  costs: {
    aiProvider: string;
    aiModel: string;
    aiCost: number;
    waCost: number;
    other: number;
  };
  // módulos
  modules: { name: string; status: "active" | "inactive" | "partial"; description: string }[];
  // insights
  insights: { title: string; description: string; type: "info" | "success" | "warning" }[];
  recommendations: string[];
  // tickets
  tickets: {
    id: string;
    subject: string;
    type: string;
    priority: "baja" | "media" | "alta";
    status: "abierto" | "en_proceso" | "resuelto";
    date: string;
    messages: { from: "cliente" | "umeia"; text: string; date: string }[];
  }[];
  // alertas
  alerts: { type: "info" | "warning" | "success"; title: string; description: string }[];
  // campañas WhatsApp
  campaigns: Campaign[];
  campaignTrends: { period: string; sent: number; convos: number; leads: number }[];
}

export type CampaignStatus = "enviada" | "en_curso" | "programada";
export type CampaignChannel = "cloud-api" | "local";

export interface CampaignContact {
  name: string;
  phone: string;
  delivered: boolean;
  responded: boolean;
  generatedConvo: boolean;
  generatedLead: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  date: string;
  status: CampaignStatus;
  channel: CampaignChannel; // cloud-api | local (on-premise)
  channelLabel: string;
  audience: string;
  // funnel
  contacts: number;
  delivered: number;
  responses: number;
  conversations: number;
  leads: number;
  // resultado generado (depende del vertical)
  outcomes: { label: string; value: number }[];
  // muestra de contactos
  contactSample: CampaignContact[];
}

export const TENANTS: Record<TenantId, Tenant> = {
  "electro-rai": {
    id: "electro-rai",
    apiSlug: "electrorai",
    name: "Electro Rai",
    type: "cloud",
    vertical: "ecommerce",
    verticalLabel: "E-commerce de electrodomésticos",
    description: "Operación 100% en cloud UMEIA con WhatsApp Cloud API activa.",
    whatsapp: {
      number: "+54 11 5555 1100",
      connected: true,
      cloudApi: true,
      mode: "Cloud API directa",
      lastSync: "hace 1 min",
    },
    kpis: {
      messages: 1580,
      activeConvos: 47,
      automation: 68,
      human: 32,
      leads: 184,
      avgResponseSec: 12,
      hoursSaved: 52,
      monthlyCost: 78,
      prevMonthlyCost: 92,
    },
    messagesByDay: [
      { day: "Lun", auto: 78, human: 32 },
      { day: "Mar", auto: 92, human: 28 },
      { day: "Mié", auto: 110, human: 41 },
      { day: "Jue", auto: 88, human: 36 },
      { day: "Vie", auto: 134, human: 52 },
      { day: "Sáb", auto: 156, human: 68 },
      { day: "Dom", auto: 102, human: 44 },
      { day: "Lun", auto: 88, human: 30 },
      { day: "Mar", auto: 96, human: 34 },
      { day: "Mié", auto: 118, human: 38 },
      { day: "Jue", auto: 124, human: 40 },
      { day: "Vie", auto: 142, human: 56 },
      { day: "Sáb", auto: 168, human: 72 },
      { day: "Dom", auto: 110, human: 48 },
    ],
    origin: [
      { source: "Meta Ads", campaign: "Heladeras Verano 25", ad: "Carrusel — 3 modelos", landing: "/heladeras", volume: 612, conversions: 88 },
      { source: "Google Ads", campaign: "Shopping Electro", ad: "Smart shopping", landing: "/productos", volume: 484, conversions: 71 },
      { source: "Orgánico", campaign: "—", ad: "—", landing: "/", volume: 312, conversions: 18 },
      { source: "Directo", campaign: "—", ad: "—", landing: "/", volume: 172, conversions: 7 },
    ],
    topQueries: [
      { label: "Precio del producto", count: 412 },
      { label: "Stock disponible", count: 358 },
      { label: "Costo de envío", count: 287 },
      { label: "Medios de pago", count: 241 },
      { label: "Seguimiento de pedido", count: 196 },
    ],
    byChannel: [
      { name: "WhatsApp", value: 1230 },
      { name: "Web Chat", value: 248 },
      { name: "Instagram", value: 102 },
    ],
    byHour: [
      { hour: "00", value: 25 }, { hour: "03", value: 13 }, { hour: "06", value: 38 },
      { hour: "09", value: 184 }, { hour: "12", value: 298 }, { hour: "15", value: 352 },
      { hour: "18", value: 411 }, { hour: "21", value: 259 },
    ],
    byIntent: [
      { intent: "Consulta producto", value: 600 },
      { intent: "Postventa", value: 348 },
      { intent: "Compra", value: 284 },
      { intent: "Logística", value: 221 },
      { intent: "Reclamo", value: 127 },
    ],
    processes: [
      { name: "Responder consulta", auto: 82, human: 18 },
      { name: "Derivar a humano", auto: 0, human: 100 },
      { name: "Crear lead", auto: 74, human: 26 },
      { name: "Pedir datos", auto: 90, human: 10 },
      { name: "Consulta producto", auto: 88, human: 12 },
    ],
    costs: { aiProvider: "OpenAI (mock)", aiModel: "gpt-4o-mini", aiCost: 38, waCost: 28, other: 12 },
    modules: [
      { name: "WhatsApp", status: "active", description: "Cloud API directa" },
      { name: "Formularios", status: "active", description: "3 formularios activos" },
      { name: "CRM", status: "active", description: "Sincronizado" },
      { name: "IA", status: "active", description: "OpenAI mock" },
      { name: "Automatización", status: "active", description: "12 flujos activos" },
      { name: "Ads tracking", status: "active", description: "Meta + Google" },
      { name: "Cost control", status: "active", description: "Budget USD 120/mes" },
      { name: "Integración interna", status: "partial", description: "API e-commerce" },
      { name: "Nodo local", status: "inactive", description: "Operación cloud" },
      { name: "Derivación humana", status: "active", description: "2 agentes" },
    ],
    insights: [
      { title: "Producto más consultado", description: "Heladera no-frost 410L lidera con 198 consultas esta semana.", type: "info" },
      { title: "Pico de consultas", description: "Entre 18:00 y 21:00 se concentra el 41% del tráfico.", type: "info" },
      { title: "Canal dominante", description: "WhatsApp representa el 75% de las interacciones.", type: "success" },
      { title: "Oportunidad", description: "El 22% de consultas de stock podría automatizarse al 100% conectando inventario.", type: "warning" },
      { title: "Impacto de campañas", description: "Las campañas generaron el 32% de las conversaciones del período.", type: "success" },
      { title: "Alta tasa de respuesta", description: "Las últimas 3 campañas superan el 25% de respuesta — muy por encima del promedio.", type: "success" },
      { title: "Oportunidad de conversión a lead", description: "Sólo el 38% de las conversaciones de campañas se convierten en lead. Hay margen.", type: "warning" },
    ],
    recommendations: [
      "Activar módulo de catálogo dinámico para automatizar consultas de stock.",
      "Optimizar respuesta de medios de pago con plantilla rápida.",
      "Crear campaña de retargeting para consultas no convertidas.",
      "Mejorar el flujo post-respuesta de campañas para subir la tasa de conversión a lead.",
    ],
    tickets: [
      {
        id: "TCK-1042",
        subject: "Ajuste de respuesta automática para envíos",
        type: "Configuración",
        priority: "media",
        status: "en_proceso",
        date: "2025-04-14",
        messages: [
          { from: "cliente", text: "Hola, queremos que la respuesta de envíos incluya el costo a CABA.", date: "2025-04-14 10:21" },
          { from: "umeia", text: "Hola! Estamos preparando la plantilla. La activamos en 24hs.", date: "2025-04-14 11:05" },
        ],
      },
      {
        id: "TCK-1039",
        subject: "Nueva integración con CRM",
        type: "Integración",
        priority: "alta",
        status: "abierto",
        date: "2025-04-12",
        messages: [
          { from: "cliente", text: "Necesitamos exportar leads al CRM nuevo.", date: "2025-04-12 09:00" },
        ],
      },
      {
        id: "TCK-1031",
        subject: "Reporte mensual de campañas",
        type: "Reporte",
        priority: "baja",
        status: "resuelto",
        date: "2025-04-08",
        messages: [
          { from: "cliente", text: "¿Pueden enviar el reporte de marzo?", date: "2025-04-08 14:30" },
          { from: "umeia", text: "Adjuntamos el PDF con el detalle por campaña.", date: "2025-04-08 16:12" },
        ],
      },
    ],
    alerts: [
      { type: "success", title: "Automatización óptima", description: "Superaste el 65% de respuestas automáticas este mes." },
      { type: "info", title: "Nueva campaña detectada", description: "Meta Ads 'Heladeras Verano 25' generó +88 conversiones." },
    ],
    campaigns: [
      {
        id: "CMP-ER-014",
        name: "Promo Invierno · Heladeras",
        date: "2025-04-12",
        status: "enviada",
        channel: "cloud-api",
        channelLabel: "WhatsApp Cloud API · envío directo UMEIA",
        audience: "Clientes recientes + carrito abandonado",
        contacts: 320,
        delivered: 300,
        responses: 84,
        conversations: 70,
        leads: 28,
        outcomes: [
          { label: "Consultas de producto", value: 52 },
          { label: "Carritos iniciados (mock)", value: 19 },
          { label: "Intención de compra", value: 11 },
        ],
        contactSample: [
          { name: "Lucía Ramírez", phone: "+54 11 5544 1201", delivered: true, responded: true, generatedConvo: true, generatedLead: true },
          { name: "Martín Suárez", phone: "+54 11 5544 1202", delivered: true, responded: true, generatedConvo: true, generatedLead: false },
          { name: "Camila Ortiz", phone: "+54 11 5544 1203", delivered: true, responded: false, generatedConvo: false, generatedLead: false },
          { name: "Diego Fernández", phone: "+54 11 5544 1204", delivered: false, responded: false, generatedConvo: false, generatedLead: false },
          { name: "Sofía Núñez", phone: "+54 11 5544 1205", delivered: true, responded: true, generatedConvo: true, generatedLead: true },
          { name: "Tomás Vega", phone: "+54 11 5544 1206", delivered: true, responded: true, generatedConvo: false, generatedLead: false },
          { name: "Paula Méndez", phone: "+54 11 5544 1207", delivered: true, responded: true, generatedConvo: true, generatedLead: true },
          { name: "Ignacio Bravo", phone: "+54 11 5544 1208", delivered: true, responded: false, generatedConvo: false, generatedLead: false },
        ],
      },
      {
        id: "CMP-ER-013",
        name: "Lanzamiento Smart TV 55\"",
        date: "2025-04-05",
        status: "enviada",
        channel: "cloud-api",
        channelLabel: "WhatsApp Cloud API · envío directo UMEIA",
        audience: "Segmento high-ticket",
        contacts: 480,
        delivered: 462,
        responses: 138,
        conversations: 112,
        leads: 47,
        outcomes: [
          { label: "Consultas de producto", value: 84 },
          { label: "Carritos iniciados (mock)", value: 31 },
          { label: "Intención de compra", value: 22 },
        ],
        contactSample: [
          { name: "Andrea López", phone: "+54 11 5544 1310", delivered: true, responded: true, generatedConvo: true, generatedLead: true },
          { name: "Federico Paz", phone: "+54 11 5544 1311", delivered: true, responded: true, generatedConvo: true, generatedLead: false },
          { name: "Romina Castro", phone: "+54 11 5544 1312", delivered: true, responded: false, generatedConvo: false, generatedLead: false },
          { name: "Esteban Rivas", phone: "+54 11 5544 1313", delivered: false, responded: false, generatedConvo: false, generatedLead: false },
          { name: "Valentina Gil", phone: "+54 11 5544 1314", delivered: true, responded: true, generatedConvo: true, generatedLead: true },
        ],
      },
      {
        id: "CMP-ER-012",
        name: "Cyber · Día del Padre",
        date: "2025-03-22",
        status: "enviada",
        channel: "cloud-api",
        channelLabel: "WhatsApp Cloud API · envío directo UMEIA",
        audience: "Base completa opt-in",
        contacts: 1240,
        delivered: 1188,
        responses: 296,
        conversations: 248,
        leads: 92,
        outcomes: [
          { label: "Consultas de producto", value: 168 },
          { label: "Carritos iniciados (mock)", value: 62 },
          { label: "Intención de compra", value: 41 },
        ],
        contactSample: [
          { name: "Marina Acosta", phone: "+54 11 5544 1410", delivered: true, responded: true, generatedConvo: true, generatedLead: true },
          { name: "Bruno Salgado", phone: "+54 11 5544 1411", delivered: true, responded: true, generatedConvo: false, generatedLead: false },
          { name: "Clara Domínguez", phone: "+54 11 5544 1412", delivered: false, responded: false, generatedConvo: false, generatedLead: false },
        ],
      },
    ],
    campaignTrends: [
      { period: "Mes anterior", sent: 1620, convos: 312, leads: 118 },
      { period: "Mes actual", sent: 2040, convos: 430, leads: 167 },
    ],
  },

  "centro-copacabana": {
    id: "centro-copacabana",
    apiSlug: "copacabana",
    name: "Centro Médico Copacabana",
    type: "on-premise",
    vertical: "clinica",
    verticalLabel: "Clínica médica",
    description: "Nodo local instalado en infraestructura del cliente, sincronizado con Core UMEIA.",
    whatsapp: {
      number: "+54 11 5555 2200",
      connected: true,
      cloudApi: false,
      mode: "Integración local / proveedor externo",
      lastSync: "hace 2 min",
    },
    kpis: {
      messages: 2420,
      activeConvos: 68,
      automation: 54,
      human: 46,
      leads: 312,
      avgResponseSec: 18,
      hoursSaved: 71,
      monthlyCost: 102,
      prevMonthlyCost: 118,
    },
    messagesByDay: [
      { day: "Lun", auto: 142, human: 118 },
      { day: "Mar", auto: 156, human: 132 },
      { day: "Mié", auto: 168, human: 144 },
      { day: "Jue", auto: 158, human: 138 },
      { day: "Vie", auto: 174, human: 156 },
      { day: "Sáb", auto: 92, human: 78 },
      { day: "Dom", auto: 48, human: 32 },
      { day: "Lun", auto: 152, human: 124 },
      { day: "Mar", auto: 162, human: 138 },
      { day: "Mié", auto: 178, human: 152 },
      { day: "Jue", auto: 184, human: 158 },
      { day: "Vie", auto: 196, human: 168 },
      { day: "Sáb", auto: 102, human: 84 },
      { day: "Dom", auto: 56, human: 38 },
    ],
    origin: [
      { source: "Meta Ads", campaign: "Turnos Cardiología", ad: "Video — Dr. Pérez", landing: "/turnos", volume: 884, conversions: 142 },
      { source: "Google Search", campaign: "Especialidades", ad: "Búsqueda exacta", landing: "/especialidades", volume: 712, conversions: 118 },
      { source: "Orgánico", campaign: "—", ad: "—", landing: "/", volume: 524, conversions: 38 },
      { source: "Directo", campaign: "—", ad: "—", landing: "/", volume: 300, conversions: 14 },
    ],
    topQueries: [
      { label: "Turnos disponibles", count: 712 },
      { label: "Especialidades", count: 564 },
      { label: "Horarios de atención", count: 412 },
      { label: "Ubicación / sucursales", count: 318 },
      { label: "Cobertura médica", count: 286 },
    ],
    byChannel: [
      { name: "WhatsApp", value: 1820 },
      { name: "Web Chat", value: 312 },
      { name: "Teléfono", value: 198 },
      { name: "Email", value: 90 },
    ],
    byHour: [
      { hour: "00", value: 18 }, { hour: "03", value: 9 }, { hour: "06", value: 74 },
      { hour: "09", value: 618 }, { hour: "12", value: 719 }, { hour: "15", value: 456 },
      { hour: "18", value: 360 }, { hour: "21", value: 166 },
    ],
    byIntent: [
      { intent: "Solicitar turno", value: 1016 },
      { intent: "Consulta especialidad", value: 581 },
      { intent: "Cobertura/obra social", value: 387 },
      { intent: "Resultado estudios", value: 290 },
      { intent: "Otros", value: 146 },
    ],
    processes: [
      { name: "Responder consulta", auto: 68, human: 32 },
      { name: "Derivar a humano", auto: 0, human: 100 },
      { name: "Crear lead", auto: 62, human: 38 },
      { name: "Pedir datos", auto: 78, human: 22 },
      { name: "Agendar turno", auto: 58, human: 42 },
    ],
    costs: { aiProvider: "Gemini (mock)", aiModel: "gemini-1.5-flash", aiCost: 42, waCost: 38, other: 22 },
    modules: [
      { name: "WhatsApp", status: "active", description: "Sin Cloud API — proveedor local" },
      { name: "Formularios", status: "active", description: "5 formularios activos" },
      { name: "CRM", status: "partial", description: "Integración interna" },
      { name: "IA", status: "active", description: "Gemini mock" },
      { name: "Automatización", status: "active", description: "9 flujos activos" },
      { name: "Ads tracking", status: "active", description: "Meta + Google Search" },
      { name: "Cost control", status: "active", description: "Budget USD 150/mes" },
      { name: "Integración interna", status: "active", description: "Sistema de turnos" },
      { name: "Nodo local", status: "active", description: "Servidor on-premise" },
      { name: "Derivación humana", status: "active", description: "4 agentes" },
    ],
    insights: [
      { title: "Consulta repetida", description: "Turnos para Cardiología representan el 31% de las consultas.", type: "info" },
      { title: "Horario pico", description: "El 58% de las consultas llegan entre 9:00 y 13:00.", type: "info" },
      { title: "Especialidad demandada", description: "Cardiología, Clínica y Pediatría concentran 70% del volumen.", type: "success" },
      { title: "Intervención humana alta", description: "El 46% de las conversaciones requieren agente. Hay margen de mejora.", type: "warning" },
      { title: "Impacto de campañas", description: "Las campañas generaron el 41% de las conversaciones recientes.", type: "success" },
      { title: "Alta tasa de respuesta", description: "La campaña de Vacunación Antigripal alcanzó 33% de respuesta.", type: "success" },
      { title: "Oportunidad de conversión", description: "El paso de conversación a turno solicitado puede mejorarse con flujo automático.", type: "warning" },
    ],
    recommendations: [
      "Conectar agenda de turnos con UMEIA para automatizar reservas simples.",
      "Crear flujo automático para consultas de cobertura por obra social.",
      "Activar respuestas rápidas para horarios y ubicaciones.",
      "Sumar plantilla de confirmación automática post-campaña para acelerar conversión a turno.",
    ],
    tickets: [
      {
        id: "TCK-2087",
        subject: "Sincronización con sistema de turnos",
        type: "Integración",
        priority: "alta",
        status: "en_proceso",
        date: "2025-04-15",
        messages: [
          { from: "cliente", text: "El nodo local pierde sync cada noche a las 3 AM.", date: "2025-04-15 08:14" },
          { from: "umeia", text: "Detectamos un timeout en el cron. Aplicamos parche, monitoreamos.", date: "2025-04-15 10:02" },
        ],
      },
      {
        id: "TCK-2079",
        subject: "Nuevo flujo para Pediatría",
        type: "Automatización",
        priority: "media",
        status: "abierto",
        date: "2025-04-13",
        messages: [
          { from: "cliente", text: "Queremos un flujo específico para consultas pediátricas.", date: "2025-04-13 11:40" },
        ],
      },
      {
        id: "TCK-2065",
        subject: "Reporte de cobertura por obra social",
        type: "Reporte",
        priority: "baja",
        status: "resuelto",
        date: "2025-04-09",
        messages: [
          { from: "cliente", text: "¿Pueden discriminar consultas por obra social?", date: "2025-04-09 09:22" },
          { from: "umeia", text: "Listo, agregamos el desglose en el dashboard de Insights.", date: "2025-04-09 17:48" },
        ],
      },
    ],
    alerts: [
      { type: "warning", title: "Intervención humana sobre objetivo", description: "El % humano (46%) supera el target del 40%. Revisá automatizaciones." },
      { type: "info", title: "Nodo local saludable", description: "Última sync hace 2 min. Latencia promedio 320ms." },
    ],
    campaigns: [
      {
        id: "CMP-CMC-021",
        name: "Recordatorio Chequeo Anual",
        date: "2025-04-14",
        status: "enviada",
        channel: "local",
        channelLabel: "Integración local · proveedor externo",
        audience: "Pacientes con último turno > 12 meses",
        contacts: 540,
        delivered: 502,
        responses: 168,
        conversations: 142,
        leads: 64,
        outcomes: [
          { label: "Consultas médicas", value: 98 },
          { label: "Turnos solicitados", value: 51 },
          { label: "Pacientes interesados", value: 64 },
        ],
        contactSample: [
          { name: "María Pereira", phone: "+54 11 5566 2101", delivered: true, responded: true, generatedConvo: true, generatedLead: true },
          { name: "Jorge Almada", phone: "+54 11 5566 2102", delivered: true, responded: true, generatedConvo: true, generatedLead: false },
          { name: "Silvia Rocha", phone: "+54 11 5566 2103", delivered: true, responded: false, generatedConvo: false, generatedLead: false },
          { name: "Ramiro Quiroga", phone: "+54 11 5566 2104", delivered: false, responded: false, generatedConvo: false, generatedLead: false },
          { name: "Noelia Iturri", phone: "+54 11 5566 2105", delivered: true, responded: true, generatedConvo: true, generatedLead: true },
          { name: "Hernán Bustos", phone: "+54 11 5566 2106", delivered: true, responded: true, generatedConvo: true, generatedLead: true },
          { name: "Laura Vidal", phone: "+54 11 5566 2107", delivered: true, responded: false, generatedConvo: false, generatedLead: false },
        ],
      },
      {
        id: "CMP-CMC-020",
        name: "Campaña Cardiología · Dr. Pérez",
        date: "2025-04-08",
        status: "enviada",
        channel: "local",
        channelLabel: "Integración local · proveedor externo",
        audience: "Pacientes mayores de 45 años",
        contacts: 820,
        delivered: 768,
        responses: 234,
        conversations: 198,
        leads: 88,
        outcomes: [
          { label: "Consultas médicas", value: 142 },
          { label: "Turnos solicitados", value: 76 },
          { label: "Pacientes interesados", value: 88 },
        ],
        contactSample: [
          { name: "Carlos Méndez", phone: "+54 11 5566 2210", delivered: true, responded: true, generatedConvo: true, generatedLead: true },
          { name: "Patricia Soria", phone: "+54 11 5566 2211", delivered: true, responded: true, generatedConvo: true, generatedLead: false },
          { name: "Esteban Funes", phone: "+54 11 5566 2212", delivered: true, responded: false, generatedConvo: false, generatedLead: false },
          { name: "Verónica Lara", phone: "+54 11 5566 2213", delivered: false, responded: false, generatedConvo: false, generatedLead: false },
          { name: "Roberto Aguirre", phone: "+54 11 5566 2214", delivered: true, responded: true, generatedConvo: true, generatedLead: true },
        ],
      },
      {
        id: "CMP-CMC-019",
        name: "Vacunación Antigripal 2025",
        date: "2025-03-28",
        status: "enviada",
        channel: "local",
        channelLabel: "Integración local · proveedor externo",
        audience: "Pacientes de riesgo + adultos mayores",
        contacts: 1480,
        delivered: 1392,
        responses: 472,
        conversations: 388,
        leads: 184,
        outcomes: [
          { label: "Consultas médicas", value: 268 },
          { label: "Turnos solicitados", value: 152 },
          { label: "Pacientes interesados", value: 184 },
        ],
        contactSample: [
          { name: "Élida Romero", phone: "+54 11 5566 2310", delivered: true, responded: true, generatedConvo: true, generatedLead: true },
          { name: "Gustavo Pizzi", phone: "+54 11 5566 2311", delivered: true, responded: true, generatedConvo: false, generatedLead: false },
          { name: "Adriana Valle", phone: "+54 11 5566 2312", delivered: false, responded: false, generatedConvo: false, generatedLead: false },
        ],
      },
    ],
    campaignTrends: [
      { period: "Mes anterior", sent: 2180, convos: 568, leads: 248 },
      { period: "Mes actual", sent: 2840, convos: 728, leads: 336 },
    ],
  },
};

// Mapeo email -> tenant
export const USER_CREDENTIALS: Record<string, { password: string; tenantId: TenantId; displayName: string }> = {
  "gabo@demo.com": { password: "123456", tenantId: "electro-rai", displayName: "Gabo" },
  "onpremise@demo.umeia.io": { password: "demo1234", tenantId: "centro-copacabana", displayName: "On-Premise Demo" },
};
