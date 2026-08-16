import { useCallback, useEffect, useState } from "react";
import {
  getLocation,
  startWatchingLocation,
  subscribeLocation,
  getLastLocationFailure,
  type UserLocation,
  type LocationFailureReason,
} from "@/lib/location-service";
import { trpc } from "@/lib/trpc";

export type LocationStatus = "loading" | "located" | "error";

export interface UseUserLocationResult {
  status: LocationStatus;
  userLocation: UserLocation | null;
  /** Ciudad detectada por reverse geocoding. Puede tardar un poco más en llegar que las coordenadas. */
  currentCity: string | null;
  /** Provincia/región detectada por reverse geocoding - usada para traer precios SEPA de la zona. */
  currentRegion: string | null;
  /** Motivo puntual del fallo, para mostrar un mensaje accionable en vez de uno genérico. */
  failureReason: LocationFailureReason;
  retry: () => Promise<void>;
}

/** Texto corto y accionable según la causa real del fallo de GPS. */
export function locationErrorMessage(reason: LocationFailureReason): { label: string; actionable: boolean } {
  switch (reason) {
    case "permission-blocked":
      return { label: "Activar en Ajustes", actionable: true };
    case "permission-denied":
      return { label: "Dar permiso de ubicación", actionable: true };
    case "services-disabled":
      return { label: "Prender el GPS del celular", actionable: true };
    case "timeout":
      return { label: "Señal débil, reintentar", actionable: true };
    default:
      return { label: "Reintentar", actionable: true };
  }
}

/**
 * Estado único de ubicación + ciudad, compartido entre Inicio, Ofertas y Mapa.
 * Colapsa a 3 estados visuales (loading / located / error) en vez de las 4 variantes
 * ad-hoc que tenía cada pantalla, para evitar el parpadeo entre "Buscando GPS" →
 * "Detectando..." → ciudad que se veía en los primeros segundos.
 */
export function useUserLocation(): UseUserLocationResult {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [currentCity, setCurrentCity] = useState<string | null>(null);
  const [currentRegion, setCurrentRegion] = useState<string | null>(null);
  const [status, setStatus] = useState<LocationStatus>("loading");
  const [failureReason, setFailureReason] = useState<LocationFailureReason>(null);

  const geocodeQuery = trpc.places.reverseGeocode.useQuery(
    { lat: userLocation?.latitude ?? 0, lng: userLocation?.longitude ?? 0 },
    { enabled: !!userLocation && !currentCity },
  );

  useEffect(() => {
    if (geocodeQuery.data?.city) {
      setCurrentCity(geocodeQuery.data.city);
    }
    if (geocodeQuery.data?.region) {
      setCurrentRegion(geocodeQuery.data.region);
    }
  }, [geocodeQuery.data]);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;
    let watch: { remove: () => void } | null = null;

    (async () => {
      const loc = await getLocation();
      if (!mounted) return;
      if (loc) {
        setUserLocation(loc);
        setStatus("located");
      } else {
        setFailureReason(getLastLocationFailure());
        setStatus("error");
      }

      unsubscribe = subscribeLocation((newLoc) => {
        setUserLocation(newLoc);
        setStatus("located");
      });
      watch = await startWatchingLocation((newLoc) => {
        if (mounted) setUserLocation(newLoc);
      });
    })();

    return () => {
      mounted = false;
      unsubscribe?.();
      watch?.remove();
    };
  }, []);

  const retry = useCallback(async () => {
    setStatus("loading");
    const loc = await getLocation();
    if (loc) {
      setUserLocation(loc);
      setStatus("located");
    } else {
      setFailureReason(getLastLocationFailure());
      setStatus("error");
    }
  }, []);

  return { status, userLocation, currentCity, currentRegion, failureReason, retry };
}
