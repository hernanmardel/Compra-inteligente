import { supabase, isSupabaseConfigured } from "@/lib/supabase-client";

/**
 * Portal de comercios — migrado de AsyncStorage (local al celular) a Supabase (compartido).
 * Se mantiene exactamente la misma forma de datos y las mismas funciones exportadas que
 * usaba la versión local, para que app/portal-comercios.tsx no necesite cambios.
 *
 * Identidad del comerciante: login anónimo de Supabase. No hace falta pedirle usuario ni
 * contraseña a nadie - cada dispositivo obtiene una sesión real y persistente la primera vez
 * que abre el portal, y esa es la identidad "dueña" de su comercio (RLS en
 * supabase/migrations/0001_initial_schema.sql). Si en Supabase el login anónimo apareciera
 * desactivado, hay que habilitarlo en Authentication → Settings → "Allow anonymous sign-ins".
 *
 * Precios: acá se manejan en pesos (igual que la UI, sin cambios) - la conversión a centavos
 * para la base pasa solo en el borde de este archivo (toCents/fromCents).
 */

export type MerchantProfile = {
  name: string;
  category: string;
  address: string;
  city: string;
  phone: string;
  schedule: string;
};

export type MerchantCatalogItem = {
  id: string;
  name: string;
  category: string;
  barcode: string;
  regularPrice: number;
  updatedAt: string;
};

export type MerchantOffer = {
  id: string;
  productId: string;
  originalPrice: number;
  offerPrice: number;
  startsAt: string;
  endsAt: string;
  stock: string;
  active: boolean;
  updatedAt: string;
};

export type MerchantPortalState = {
  profile: MerchantProfile;
  catalog: MerchantCatalogItem[];
  offers: MerchantOffer[];
};

const emptyProfile: MerchantProfile = {
  name: "",
  category: "Supermercado",
  address: "",
  city: "",
  phone: "",
  schedule: "",
};

const emptyState: MerchantPortalState = {
  profile: emptyProfile,
  catalog: [],
  offers: [],
};

function toCents(pesos: number): number {
  return Math.round((pesos || 0) * 100);
}

function fromCents(cents: number | null | undefined): number {
  return (cents ?? 0) / 100;
}

function assertConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "El portal de comercios necesita Supabase configurado (ver .env.example). " +
      "Sin eso no hay dónde guardar lo que cargues."
    );
  }
}

/** Devuelve el user id de la sesión actual, creando una sesión anónima si hace falta. */
async function ensureUserId(): Promise<string> {
  assertConfigured();
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user?.id) {
    return sessionData.session.user.id;
  }
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error(
      `No se pudo crear una sesión para el portal de comercios: ${error?.message ?? "sin usuario"}. ` +
      "Si el error menciona 'anonymous sign-ins', hay que habilitarlos en el panel de Supabase " +
      "(Authentication → Settings → Allow anonymous sign-ins)."
    );
  }
  return data.user.id;
}

/** Busca el comercio del usuario actual (asume 1 comercio por sesión, como hoy). */
async function getOwnStoreId(): Promise<string | null> {
  const userId = await ensureUserId();
  const { data, error } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export async function getMerchantPortalState(): Promise<MerchantPortalState> {
  if (!isSupabaseConfigured) return emptyState;

  const userId = await ensureUserId();
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("*")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();
  if (storeError) throw storeError;
  if (!store) return emptyState;

  const [{ data: catalogRows, error: catalogError }, { data: offerRows, error: offersError }] = await Promise.all([
    supabase.from("store_catalog_items").select("*").eq("store_id", store.id).order("updated_at", { ascending: false }),
    supabase.from("store_offers").select("*").eq("store_id", store.id).order("updated_at", { ascending: false }),
  ]);
  if (catalogError) throw catalogError;
  if (offersError) throw offersError;

  return {
    profile: {
      name: store.name ?? "",
      category: store.category ?? "Supermercado",
      address: store.address ?? "",
      city: store.city ?? "",
      phone: store.phone ?? "",
      schedule: store.schedule ?? "",
    },
    catalog: (catalogRows ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category ?? "",
      barcode: r.barcode ?? "",
      regularPrice: fromCents(r.regular_price),
      updatedAt: r.updated_at,
    })),
    offers: (offerRows ?? []).map((r) => ({
      id: r.id,
      productId: r.catalog_item_id,
      originalPrice: fromCents(r.original_price),
      offerPrice: fromCents(r.offer_price),
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      stock: r.stock ?? "",
      active: r.active,
      updatedAt: r.updated_at,
    })),
  };
}

export async function saveMerchantProfile(profile: MerchantProfile) {
  const userId = await ensureUserId();
  const existingId = await getOwnStoreId();

  const row = {
    owner_id: userId,
    name: profile.name,
    category: profile.category,
    address: profile.address,
    city: profile.city,
    phone: profile.phone,
    schedule: profile.schedule,
    updated_at: new Date().toISOString(),
  };

  const { error } = existingId
    ? await supabase.from("stores").update(row).eq("id", existingId)
    : await supabase.from("stores").insert(row);
  if (error) throw error;

  return getMerchantPortalState();
}

export async function addMerchantCatalogItem(
  item: Omit<MerchantCatalogItem, "id" | "updatedAt">,
) {
  let storeId = await getOwnStoreId();
  if (!storeId) {
    // No debería pasar (el perfil se guarda antes de cargar catálogo), pero por si acaso
    // no se pierde el producto: se crea un comercio vacío para poder asociarlo.
    await saveMerchantProfile(emptyProfile);
    storeId = await getOwnStoreId();
  }

  const { error } = await supabase.from("store_catalog_items").insert({
    store_id: storeId,
    name: item.name,
    category: item.category,
    barcode: item.barcode,
    regular_price: toCents(item.regularPrice),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;

  return getMerchantPortalState();
}

export async function removeMerchantCatalogItem(id: string) {
  const { error: e1 } = await supabase.from("store_offers").delete().eq("catalog_item_id", id);
  if (e1) throw e1;
  const { error: e2 } = await supabase.from("store_catalog_items").delete().eq("id", id);
  if (e2) throw e2;
  return getMerchantPortalState();
}

export async function addMerchantOffer(
  offer: Omit<MerchantOffer, "id" | "active" | "updatedAt">,
) {
  const storeId = await getOwnStoreId();
  if (!storeId) throw new Error("Guardá primero el perfil del comercio antes de cargar una oferta.");

  const { error } = await supabase.from("store_offers").insert({
    store_id: storeId,
    catalog_item_id: offer.productId,
    original_price: toCents(offer.originalPrice),
    offer_price: toCents(offer.offerPrice),
    starts_at: offer.startsAt,
    ends_at: offer.endsAt,
    stock: offer.stock,
    active: true,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;

  return getMerchantPortalState();
}

export async function setMerchantOfferActive(id: string, active: boolean) {
  const { error } = await supabase
    .from("store_offers")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  return getMerchantPortalState();
}

export async function removeMerchantOffer(id: string) {
  const { error } = await supabase.from("store_offers").delete().eq("id", id);
  if (error) throw error;
  return getMerchantPortalState();
}
