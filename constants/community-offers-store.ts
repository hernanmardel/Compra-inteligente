import { supabase, isSupabaseConfigured, ensureUserId } from "@/lib/supabase-client";

/**
 * Ofertas cargadas por usuarios con foto (ver notes/ofertas-comunidad-fotos.md).
 * Versión simple: sin OCR (el usuario carga producto/precio a mano), sin fechas
 * de vigencia manuales (la vigencia se resuelve con el voto sí/no de la comunidad,
 * que se implementa en una etapa aparte). La dirección se completa sola por GPS.
 *
 * Requiere el bucket de Storage "community-offer-photos" creado en Supabase
 * (ver supabase/migrations/0002_community_offer_photos_bucket.sql).
 */

export type NewCommunityOffer = {
  photoUri: string; // uri local del archivo (file://... o content://...)
  productName: string;
  priceCents: number;
  latitude: number;
  longitude: number;
  address: string;
  storeNameManual: string;
  storeTypeManual: string;
};

const PHOTOS_BUCKET = "community-offer-photos";

async function uploadOfferPhoto(userId: string, photoUri: string): Promise<string> {
  const response = await fetch(photoUri);
  const arrayBuffer = await response.arrayBuffer();

  const extensionMatch = photoUri.match(/\.(\w+)$/);
  const extension = extensionMatch ? extensionMatch[1].toLowerCase() : "jpg";
  const path = `${userId}/${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, arrayBuffer, {
    contentType: `image/${extension === "jpg" ? "jpeg" : extension}`,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function submitCommunityOffer(offer: NewCommunityOffer) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase no está configurado, no se puede publicar la oferta.");
  }

  const userId = await ensureUserId();
  const photoUrl = await uploadOfferPhoto(userId, offer.photoUri);

  const { error } = await supabase.from("community_offers").insert({
    submitted_by: userId,
    photo_url: photoUrl,
    product_name: offer.productName,
    price_cents: offer.priceCents,
    store_name_manual: offer.storeNameManual,
    store_type_manual: offer.storeTypeManual,
    latitude: offer.latitude,
    longitude: offer.longitude,
    address: offer.address,
    status: "sin_confirmar",
  });
  if (error) throw error;
}

// --- Mostrar ofertas cercanas y confirmarlas/desmentirlas (voto sí/no) ---
// Ver notes/ofertas-comunidad-fotos.md para el diseño completo.

export type CommunityOffer = {
  id: string;
  photoUrl: string;
  productName: string;
  priceCents: number;
  storeNameManual: string | null;
  storeTypeManual: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  status: "vigente" | "en_revision" | "retirada" | "sin_confirmar";
  createdAt: string;
  lastConfirmedAt: string | null;
  distanceMeters: number;
};

/** Distancia en metros entre dos coordenadas (fórmula de haversine). */
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const AUTO_EXPIRE_DAYS = 7;

/**
 * Ofertas comunitarias dentro de un radio, listas para mostrar en la pestaña Ofertas.
 * Excluye "retirada" (2do "no" sin "sí" en el medio) y aplica el vencimiento automático
 * de 7 días sin confirmar (red de seguridad del diseño) calculándolo al leer, sin
 * necesidad de un cron aparte.
 */
export async function fetchNearbyCommunityOffers(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<CommunityOffer[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from("community_offers")
    .select("*")
    .neq("status", "retirada")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const now = Date.now();
  const expireMs = AUTO_EXPIRE_DAYS * 24 * 60 * 60 * 1000;

  return (data ?? [])
    .map((row) => {
      const dist = distanceMeters(lat, lng, row.latitude, row.longitude);
      const lastActivity = new Date(row.last_confirmed_at ?? row.created_at).getTime();
      const expired = now - lastActivity > expireMs;
      const effectiveStatus = expired && row.status === "vigente" ? "sin_confirmar" : row.status;
      return {
        id: row.id,
        photoUrl: row.photo_url,
        productName: row.product_name,
        priceCents: row.price_cents,
        storeNameManual: row.store_name_manual,
        storeTypeManual: row.store_type_manual,
        latitude: row.latitude,
        longitude: row.longitude,
        address: row.address,
        status: effectiveStatus as CommunityOffer["status"],
        createdAt: row.created_at,
        lastConfirmedAt: row.last_confirmed_at,
        distanceMeters: dist,
      };
    })
    .filter((offer) => offer.distanceMeters <= radiusMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

/**
 * Vota si una oferta sigue vigente o no. Solo se le pregunta esto a alguien físicamente
 * cerca (ya filtrado en la UI por el mismo radio de Ofertas). Un voto por usuario por día.
 * Recalcula el estado según la racha de "no" desde el último "sí" (ver diseño).
 */
export async function voteCommunityOffer(offerId: string, vote: boolean): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase no está configurado.");
  }
  const userId = await ensureUserId();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: alreadyVoted, error: checkError } = await supabase
    .from("community_offer_votes")
    .select("id")
    .eq("offer_id", offerId)
    .eq("user_id", userId)
    .gte("voted_at", todayStart.toISOString())
    .maybeSingle();
  if (checkError) throw checkError;
  if (alreadyVoted) {
    throw new Error("Ya confirmaste esta oferta hoy. Probá de nuevo mañana.");
  }

  const { error: insertError } = await supabase.from("community_offer_votes").insert({
    offer_id: offerId,
    user_id: userId,
    vote,
  });
  if (insertError) throw insertError;

  const { data: history, error: historyError } = await supabase
    .from("community_offer_votes")
    .select("vote, voted_at")
    .eq("offer_id", offerId)
    .order("voted_at", { ascending: true });
  if (historyError) throw historyError;

  let trailingNo = 0;
  for (let i = (history ?? []).length - 1; i >= 0; i--) {
    if (history![i].vote === false) trailingNo++;
    else break;
  }

  let newStatus: string;
  const updates: Record<string, unknown> = {};
  if (trailingNo === 0) {
    newStatus = "vigente";
    updates.last_confirmed_at = new Date().toISOString();
  } else if (trailingNo === 1) {
    newStatus = "en_revision";
  } else {
    newStatus = "retirada";
  }
  updates.status = newStatus;

  const { error: updateError } = await supabase
    .from("community_offers")
    .update(updates)
    .eq("id", offerId);
  if (updateError) throw updateError;
}
