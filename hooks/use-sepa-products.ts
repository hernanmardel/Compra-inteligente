import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, isSupabaseConfigured } from "@/lib/supabase-client";
import { slugifyProvince } from "@/constants/sepa-provinces";

export interface SepaRecord {
  province: string;
  chain: string;
  address: string;
  lat?: string;
  lng?: string;
  productName: string;
  productId: string;
  listPrice: number; // en centavos
  promoPrice?: number;
  reportedDate: string;
}

const CACHE_TTL_MS = 20 * 60 * 60 * 1000; // 20hs - el sync corre 1 vez/día, no hace falta pedir más seguido
const CACHE_KEY_PREFIX = "sepa_prices_cache_";
const MAX_ROWS = 3000; // tope prudente para no bajar un payload gigante en datos móviles

/**
 * Trae los precios de SEPA de Supabase para la provincia del usuario, y de paso "pide" esa
 * provincia si es la primera vez que alguien la necesita (sepa_synced_provinces) - así el
 * próximo sync diario (scripts/sync-sepa-prices.ts, vía GitHub Actions) la va a incluir.
 * Ver notes/sepa-precios-claros-integracion.md para el diseño completo del "sync bajo demanda".
 */
export function useSepaProducts(provinceName: string | null) {
  const [records, setRecords] = useState<SepaRecord[]>([]);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<"not-configured" | "not-available" | "network" | null>(null);

  const load = useCallback(async (province: string) => {
    const slug = slugifyProvince(province);
    const cacheKey = CACHE_KEY_PREFIX + slug;

    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed: { fetchedAt: number; records: SepaRecord[]; syncedAt: string | null } = JSON.parse(cached);
        if (Date.now() - parsed.fetchedAt < CACHE_TTL_MS) {
          setRecords(parsed.records);
          setSyncedAt(parsed.syncedAt);
          setError(null);
          return;
        }
      }
    } catch {
      // cache corrupto, seguir al fetch de red
    }

    if (!isSupabaseConfigured) {
      setError("not-configured");
      return;
    }

    setLoading(true);
    try {
      // "Pedir" la provincia - si es la primera vez, queda anotada para el próximo sync diario.
      // Si ya existía, solo actualiza cuándo fue el último pedido (sin pisar last_synced_at).
      await supabase
        .from("sepa_synced_provinces")
        .upsert({ province: slug, last_requested_at: new Date().toISOString() }, { onConflict: "province", ignoreDuplicates: false })
        .select();

      const { data, error: queryError } = await supabase
        .from("sepa_prices")
        .select("list_price, promo_price, sucursal_address, sucursal_lat, sucursal_lng, reported_date, synced_at, sepa_products(name, external_id), sepa_chains(name)")
        .eq("province", slug)
        .limit(MAX_ROWS);

      if (queryError) throw queryError;

      if (!data || data.length === 0) {
        // No es un error de verdad: puede ser la primera vez que se pide esta provincia,
        // recién va a tener datos después del próximo sync diario (hasta 24hs).
        setError("not-available");
        setRecords([]);
        setLoading(false);
        return;
      }

      const mapped: SepaRecord[] = data.map((row: any) => ({
        province: slug,
        chain: row.sepa_chains?.name ?? "",
        address: row.sucursal_address ?? "",
        lat: row.sucursal_lat != null ? String(row.sucursal_lat) : undefined,
        lng: row.sucursal_lng != null ? String(row.sucursal_lng) : undefined,
        productName: row.sepa_products?.name ?? "",
        productId: row.sepa_products?.external_id ?? "",
        listPrice: row.list_price,
        promoPrice: row.promo_price ?? undefined,
        reportedDate: row.reported_date,
      }));

      const lastSync = data[0]?.synced_at ?? null;
      setRecords(mapped);
      setSyncedAt(lastSync);
      setError(null);
      await AsyncStorage.setItem(cacheKey, JSON.stringify({ fetchedAt: Date.now(), records: mapped, syncedAt: lastSync }));
    } catch {
      setError("network");
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          setRecords(parsed.records);
          setSyncedAt(parsed.syncedAt);
        }
      } catch {
        // no había cache tampoco
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (provinceName) void load(provinceName);
  }, [provinceName, load]);

  return { records, syncedAt, loading, error };
}
