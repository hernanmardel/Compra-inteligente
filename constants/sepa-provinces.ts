/**
 * Normaliza el nombre de una provincia (como lo devuelve Google Geocoding, Nominatim,
 * o el propio dataset de SEPA) a un slug estable, usado como nombre de archivo:
 * data/sepa/<slug>.json
 *
 * Distintas fuentes devuelven el nombre de forma distinta ("Buenos Aires",
 * "Provincia de Buenos Aires", "Ciudad Autónoma de Buenos Aires"), por eso se
 * normaliza en vez de comparar el string tal cual.
 */
export function slugifyProvince(rawName: string): string {
  const noAccents = rawName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const cleaned = noAccents
    .toLowerCase()
    .replace(/^ciudad autonoma de buenos aires$/i, "caba")
    .replace(/^provincia de\s+/i, "")
    .trim();

  return cleaned
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Provincias que el sync de SEPA procesa por defecto. */
export const SEPA_TARGET_PROVINCES = [
  "Buenos Aires",
  "Ciudad Autónoma de Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
] as const;
