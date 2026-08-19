/**
 * Sincroniza precios de SEPA/Precios Claros a Supabase - "bajo demanda" por provincia
 * (ver notes/sepa-precios-claros-integracion.md): solo procesa las provincias que ya fueron
 * pedidas por algún usuario real (tabla sepa_synced_provinces), no las 24 de una, para no
 * exceder el límite gratuito de la base.
 *
 * Sigue sin requerir un servidor propio corriendo 24/7: este script corre 1 vez por día
 * en GitHub Actions (gratis, programado) y escribe directo en Supabase con la
 * service_role key. La app nunca usa esta clave, solo la anon key de lectura pública.
 *
 * IMPORTANTE - lo que no pude verificar sin acceso a internet al escribir este script:
 * el nombre exacto de las columnas del CSV de SEPA. Por eso el mapeo de columnas es por
 * PALABRAS CLAVE en el header (findColumn), no por posición fija - así se auto-ajusta
 * aunque el nombre exacto varíe un poco. Si falla el mapeo, el script lo imprime en el log
 * de GitHub Actions con el header real encontrado, para poder corregir findColumn() acá abajo.
 *
 * Correr manualmente para probar: pnpm tsx scripts/sync-sepa-prices.ts
 */
import { parse } from "csv-parse/sync";
import unzipper from "unzipper";
import { createClient } from "@supabase/supabase-js";
import { slugifyProvince, SEPA_TARGET_PROVINCES } from "../constants/sepa-provinces";

const CKAN_PACKAGE_URL = "https://datos.produccion.gob.ar/api/3/action/package_show?id=sepa-precios";
const BATCH_SIZE = 500;

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "[sync-sepa] Faltan EXPO_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. " +
    "En GitHub Actions hay que cargarlas como Secrets del repositorio."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface ParsedRow {
  province: string;
  chain: string;
  address: string;
  lat?: string;
  lng?: string;
  productName: string;
  productId: string;
  listPrice: number;   // centavos
  promoPrice?: number;  // centavos
  reportedDate: string;
}

interface CsvColumnMap {
  province: number;
  chain: number;
  address: number;
  lat?: number;
  lng?: number;
  productName: number;
  productId: number;
  listPrice: number;
  promoPrice?: number;
}

function findColumn(header: string[], keywords: string[]): number {
  const normalized = header.map((h) =>
    h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  );
  for (const kw of keywords) {
    const idx = normalized.findIndex((h) => h.includes(kw));
    if (idx !== -1) return idx;
  }
  return -1;
}

function mapColumns(header: string[]): CsvColumnMap | null {
  const map: Partial<CsvColumnMap> = {
    province: findColumn(header, ["provincia"]),
    chain: findColumn(header, ["comercio_bandera", "bandera", "cadena", "comercio_razon_social", "razon_social"]),
    address: findColumn(header, ["sucursales_direccion", "direccion", "domicilio"]),
    lat: findColumn(header, ["sucursales_lat", "latitud", "lat"]),
    lng: findColumn(header, ["sucursales_lng", "sucursales_long", "longitud", "lng", "long"]),
    productName: findColumn(header, ["productos_descripcion", "producto_descripcion", "descripcion", "nombre_producto"]),
    productId: findColumn(header, ["productos_ean", "producto_id", "id_producto", "ean"]),
    listPrice: findColumn(header, ["productos_precio_lista", "precio_lista", "precio_unitario", "precio"]),
    promoPrice: findColumn(header, ["precio_promo1", "precio_referencia_promo", "promo1", "precio_oferta"]),
  };

  const required: (keyof CsvColumnMap)[] = ["province", "chain", "address", "productName", "productId", "listPrice"];
  const missing = required.filter((k) => (map[k] ?? -1) === -1);

  if (missing.length > 0) {
    console.error(`[sync-sepa] No se pudo mapear columnas obligatorias: ${missing.join(", ")}`);
    console.error(`[sync-sepa] Header real recibido: ${JSON.stringify(header)}`);
    console.error(`[sync-sepa] Ajustar findColumn() en scripts/sync-sepa-prices.ts con los nombres reales de arriba.`);
    return null;
  }

  return map as CsvColumnMap;
}

function parseRow(row: string[], map: CsvColumnMap, reportedDate: string): ParsedRow | null {
  const listPriceRaw = row[map.listPrice]?.replace(",", ".");
  const listPrice = Math.round(parseFloat(listPriceRaw) * 100);
  if (!row[map.productName] || !row[map.province] || isNaN(listPrice)) return null;

  const promoRaw = map.promoPrice !== undefined ? row[map.promoPrice]?.replace(",", ".") : undefined;
  const promoPrice = promoRaw ? Math.round(parseFloat(promoRaw) * 100) : undefined;

  return {
    province: row[map.province],
    chain: (row[map.chain] ?? "").trim() || "Sin nombre",
    address: row[map.address] ?? "",
    lat: map.lat !== undefined ? row[map.lat] : undefined,
    lng: map.lng !== undefined ? row[map.lng] : undefined,
    productName: row[map.productName],
    productId: row[map.productId] ?? "",
    listPrice,
    promoPrice: promoPrice && promoPrice > 0 && promoPrice < listPrice ? promoPrice : undefined,
    reportedDate,
  };
}

// Muchos sitios gubernamentales (CKAN incluido) devuelven 403 a pedidos sin
// User-Agent, tratándolos como bots. Con headers de navegador normal, pasan.
const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept": "application/json, */*",
};

async function findLatestZipUrl(): Promise<{ url: string; date: string }> {
  const res = await fetch(CKAN_PACKAGE_URL, { headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`No se pudo consultar el catálogo CKAN: ${res.status}`);
  const data = await res.json();
  const resources: any[] = data?.result?.resources ?? [];
  const zips = resources.filter((r) => (r.format ?? "").toLowerCase() === "zip");
  if (zips.length === 0) throw new Error("No se encontró ningún recurso ZIP en el dataset de SEPA");

  zips.sort((a, b) => new Date(b.last_modified ?? b.created).getTime() - new Date(a.last_modified ?? a.created).getTime());
  const latest = zips[0];
  return { url: latest.url, date: latest.last_modified ?? latest.created ?? new Date().toISOString() };
}

/** Provincias a procesar: intersección entre las soportadas y las que algún usuario real
 * pidió (tabla sepa_synced_provinces) - el corazón del "sync bajo demanda". */
async function getProvincesToSync(): Promise<Set<string>> {
  const { data, error } = await supabase.from("sepa_synced_provinces").select("province");
  if (error) throw error;
  const requested = new Set((data ?? []).map((r) => slugifyProvince(r.province)));
  const supported = new Set(SEPA_TARGET_PROVINCES.map(slugifyProvince));
  return new Set([...requested].filter((p) => supported.has(p)));
}

async function upsertChain(cache: Map<string, number>, name: string): Promise<number> {
  if (cache.has(name)) return cache.get(name)!;
  const { data, error } = await supabase
    .from("sepa_chains")
    .upsert({ name }, { onConflict: "name" })
    .select("id")
    .single();
  if (error) throw error;
  cache.set(name, data.id);
  return data.id;
}

async function main() {
  const provincesToSync = await getProvincesToSync();
  if (provincesToSync.size === 0) {
    console.log("[sync-sepa] Todavía nadie pidió ninguna provincia - no hay nada que sincronizar.");
    return;
  }
  console.log(`[sync-sepa] Provincias a sincronizar hoy: ${[...provincesToSync].join(", ")}`);

  console.log("[sync-sepa] Buscando el último archivo publicado...");
  const { url, date } = await findLatestZipUrl();
  console.log(`[sync-sepa] Descargando: ${url}`);

  const zipRes = await fetch(url, { headers: FETCH_HEADERS });
  if (!zipRes.ok || !zipRes.body) throw new Error(`Falló la descarga del ZIP: ${zipRes.status}`);
  const zipBuffer = Buffer.from(await zipRes.arrayBuffer());

  const directory = await unzipper.Open.buffer(zipBuffer);
  const csvFiles = directory.files.filter((f) => f.path.toLowerCase().endsWith(".csv"));
  console.log(`[sync-sepa] ${csvFiles.length} archivo(s) CSV encontrados dentro del ZIP`);

  const rowsByProvince = new Map<string, ParsedRow[]>();
  let totalRows = 0;

  for (const file of csvFiles) {
    const content = (await file.buffer()).toString("utf-8");
    const rows: string[][] = parse(content, { skip_empty_lines: true });
    if (rows.length === 0) continue;

    const map = mapColumns(rows[0]);
    if (!map) continue;

    for (const row of rows.slice(1)) {
      const record = parseRow(row, map, date);
      if (!record) continue;
      const slug = slugifyProvince(record.province);
      if (!provincesToSync.has(slug)) continue;

      totalRows++;
      if (!rowsByProvince.has(slug)) rowsByProvince.set(slug, []);
      rowsByProvince.get(slug)!.push(record);
    }
  }

  console.log(`[sync-sepa] ${totalRows} filas relevantes encontradas (de las provincias pedidas)`);

  if (totalRows === 0) {
    console.error("[sync-sepa] ADVERTENCIA: no se encontró ninguna fila para las provincias pedidas. Revisar el mapeo de columnas arriba.");
    process.exitCode = 1;
    return;
  }

  const chainCache = new Map<string, number>();

  for (const [slug, records] of rowsByProvince) {
    console.log(`[sync-sepa] Procesando ${slug}: ${records.length} registros...`);

    // Se pisa el precio anterior en vez de acumular historial (ver nota de diseño) - se
    // borran los precios viejos de esta provincia antes de insertar los nuevos.
    const { error: delError } = await supabase.from("sepa_prices").delete().eq("province", slug);
    if (delError) throw delError;

    const rowsToInsert: any[] = [];
    for (const r of records) {
      const chainId = await upsertChain(chainCache, r.chain);

      const { data: productRow, error: prodError } = await supabase
        .from("sepa_products")
        .upsert(
          { external_id: r.productId, name: r.productName },
          { onConflict: "external_id" }
        )
        .select("id")
        .single();
      if (prodError) throw prodError;

      rowsToInsert.push({
        product_id: productRow.id,
        chain_id: chainId,
        province: slug,
        sucursal_address: r.address,
        sucursal_lat: r.lat ? Number(r.lat) : null,
        sucursal_lng: r.lng ? Number(r.lng) : null,
        list_price: r.listPrice,
        promo_price: r.promoPrice ?? null,
        reported_date: r.reportedDate.slice(0, 10),
      });
    }

    for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
      const batch = rowsToInsert.slice(i, i + BATCH_SIZE);
      const { error: insError } = await supabase.from("sepa_prices").insert(batch);
      if (insError) throw insError;
    }

    const { error: updError } = await supabase
      .from("sepa_synced_provinces")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("province", slug);
    if (updError) throw updError;

    console.log(`[sync-sepa] ${slug}: ${rowsToInsert.length} precios guardados.`);
  }

  console.log("[sync-sepa] Listo.");
}

main().catch((err) => {
  console.error("[sync-sepa] Error fatal:", err);
  process.exitCode = 1;
});
