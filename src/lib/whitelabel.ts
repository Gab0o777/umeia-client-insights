// White-label: algunos textos de la app (ej. "Qué hizo UMEIA por...") deben
// mostrar la marca del dominio desde el que se accede, no siempre "UMEIA".
//
// Por defecto (dominios *.umeia.io, localhost, o cualquier dominio no
// mapeado) se muestra "UMEIA". Para un cliente con dominio propio, agregar
// una entrada en CUSTOM_BRANDS — no hace falta tocar nada más, todo lo que
// use getBrandName() se actualiza solo.

export interface BrandConfig {
  name: string;
  /**
   * Hostnames (sin protocolo) que muestran esta marca. Hace match exacto o
   * por subdominio: "metodoclinico.com" también matchea
   * "app.metodoclinico.com" o "x.metodoclinico.com".
   */
  domains: string[];
}

const DEFAULT_BRAND_NAME = "UMEIA";

// Clientes con dominio propio (white-label). Agregar acá cuando un cliente
// pida mostrar la app bajo su propia marca en vez de *.umeia.io.
const CUSTOM_BRANDS: BrandConfig[] = [
  { name: "Metodo Clinico", domains: ["metodoclinico.com"] },
];

function hostnameMatchesDomain(hostname: string, domain: string): boolean {
  const h = hostname.toLowerCase().trim();
  const d = domain.toLowerCase().trim().replace(/^\*\./, "");
  if (!h || !d) return false;
  return h === d || h.endsWith(`.${d}`);
}

/**
 * Nombre de marca a mostrar según el hostname actual. Acepta un hostname
 * explícito (útil para tests); si no se pasa ninguno, usa
 * window.location.hostname.
 */
export function getBrandName(hostname?: string): string {
  const host = hostname ?? (typeof window !== "undefined" ? window.location.hostname : "");
  for (const brand of CUSTOM_BRANDS) {
    if (brand.domains.some(domain => hostnameMatchesDomain(host, domain))) {
      return brand.name;
    }
  }
  return DEFAULT_BRAND_NAME;
}
