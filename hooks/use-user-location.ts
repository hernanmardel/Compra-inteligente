import { useCallback, useEffect, useRef, useState } from "react";
import {
  getLocation,
  startWatchingLocation,
  subscribeLocation,
  getLastLocationFailure,
  type UserLocation,
  type LocationFailureReason,
} from "@/lib/location-service";
import { trpc } from "@/lib/trpc";

export type LocationStatus = "idle" | "loading" | "located" | "error";

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
 * Colapsa a 4 estados visuales (idle / loading / located / error).
 *
 * `autoRequest` (default true, igual que antes): si es false, no dispara el
 * pedido de permiso de GPS del sistema apenas se monta - se queda en "idle"
 * hasta que el componente decida pedirlo (ver Ofertas: primero se explica
 * por qué hace falta la ubicación, y recién ahí se llama a retry()).
 */
export function useUserLocation(options?: { autoRequest?: boolean }): UseUserLocationResult {
  const autoRequest = options?.autoRequest ?? true;
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [currentCity, setCurrentCity] = useState<string | null>(null);
  const [currentRegion, setCurrentRegion] = useState<string | null>(null);
  const [status, setStatus] = useState<LocationStatus>(autoRequest ? "loading" : "idle");
  const [failureReason, setFailureReason] = useState<LocationFailureReason>(null);
  const watchRef = useRef<{ remove: () => void } | null>(null);

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

  const startWatch = useCallback(async () => {
    if (watchRef.current) return;
    watchRef.current = await startWatchingLocation((newLoc) => {
      setUserLocation(newLoc);
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = subscribeLocation((newLoc) => {
      setUserLocation(newLoc);
      setStatus("located");
    });

    if (autoRequest) {
      (async () => {
        setStatus("loading");
        const loc = await getLocation();
        if (!mounted) return;
        if (loc) {
          setUserLocation(loc);
          setStatus("located");
        } else {
          setFailureReason(getLastLocationFailure());
          setStatus("error");
        }
        await startWatch();
      })();
    }

    return () => {
      mounted = false;
      unsubscribe();
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, [autoRequest, startWatch]);

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
    await startWatch();
  }, [startWatch]);

  return { status, userLocation, currentCity, currentRegion, failureReason, retry };
}
