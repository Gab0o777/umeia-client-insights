// Configuración de tenants — solo datos de setup, CERO datos de métricas.
// Los números reales vienen de useRealMetrics → umeia.space/api/metrics/*

export type TenantId   = "electro-rai" | "centro-copacabana";
export type TenantType = "cloud" | "on-premise";

export interface TenantConfig {
  id:            TenantId;
  apiSlug:       string;      // slug que usa el backend (e.g. "electrorai")
  name:          string;
  type:          TenantType;
  vertical:      string;
  verticalLabel: string;
  whatsapp: {
    number:    string;
    connected: boolean;
    cloudApi:  boolean;
    mode:      string;
  };
}

// Alias para compatibilidad con AuthContext
export type Tenant = TenantConfig;

export const TENANTS: Record<TenantId, TenantConfig> = {
  "electro-rai": {
    id:            "electro-rai",
    apiSlug:       "electrorai",
    name:          "Electro Rai",
    type:          "cloud",
    vertical:      "ecommerce",
    verticalLabel: "E-commerce de electrodomésticos",
    whatsapp: {
      number:    "+54 11 5555 1100",
      connected: true,
      cloudApi:  true,
      mode:      "Cloud API directa",
    },
  },
  "centro-copacabana": {
    id:            "centro-copacabana",
    apiSlug:       "copacabana",
    name:          "Centro Médico Copacabana",
    type:          "on-premise",
    vertical:      "clinica",
    verticalLabel: "Clínica médica",
    whatsapp: {
      number:    "+54 11 5555 2200",
      connected: true,
      cloudApi:  false,
      mode:      "Integración local / proveedor externo",
    },
  },
};

// Credenciales demo hardcodeadas (fallback cuando Supabase no está disponible)
export const USER_CREDENTIALS: Record<string, { password: string; tenantId: TenantId; displayName: string }> = {
  "gabo@demo.com":            { password: "123456",   tenantId: "electro-rai",       displayName: "Gabo" },
  "onpremise@demo.umeia.io":  { password: "demo1234", tenantId: "centro-copacabana", displayName: "On-Premise Demo" },
};
