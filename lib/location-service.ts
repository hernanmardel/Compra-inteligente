import { Platform } from "react-native";
import * as Location from "expo-location";
import { isUsableLocation } from "./location-validation";

export { isUsableLocation } from "./location-validation";

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export type LocationFailureReason =
  | "permission-denied"
  | "permission-blocked"
  | "services-disabled"
  | "timeout"
  | "unavailable"
  | null;

const GPS_TIMEOUT_MS = 15_000;
const MAX_LAST_KNOWN_AGE_MS = 10 * 60 * 1000;

let currentLocation: UserLocation | null = null;
let lastLocationFailure: LocationFailureReason = null;
const locationSubscribers = new Set<(loc: UserLocation) => void>();

function publishLocation(location: UserLocation) {
  currentLocation = location;
  lastLocationFailure = null;
  locationSubscribers.forEach((callback) => callback(location));
}

function toUserLocation(location: Location.LocationObject): UserLocation {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy ?? 100,
    timestamp: location.timestamp ?? Date.now(),
  };
}

export function subscribeLocation(callback: (loc: UserLocation) => void) {
  locationSubscribers.add(callback);
  if (currentLocation) callback(currentLocation);

  return () => {
    locationSubscribers.delete(callback);
  };
}

export function getCachedLocation(): UserLocation | null {
  return currentLocation;
}

export function getLastLocationFailure(): LocationFailureReason {
  return lastLocationFailure;
}

/**
 * Obtiene la posición real del dispositivo. En Android solicita el permiso de
 * ubicación al abrir la app y pide activar los servicios de ubicación si están apagados.
 */
export async function getLocation(): Promise<UserLocation | null> {
  if (Platform.OS === "web") return getWebLocation();
  return getNativeLocation();
}

async function ensureNativeLocationPermission(): Promise<boolean> {
  const existing = await Location.getForegroundPermissionsAsync();
  if (existing.granted) return true;

  const requested = await Location.requestForegroundPermissionsAsync();
  if (requested.granted) return true;

  lastLocationFailure = requested.canAskAgain ? "permission-denied" : "permission-blocked";
  return false;
}

function getWebLocation(): Promise<UserLocation | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      lastLocationFailure = "unavailable";
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp || Date.now(),
        };
        publishLocation(location);
        resolve(location);
      },
      () => {
        lastLocationFailure = "unavailable";
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: GPS_TIMEOUT_MS, maximumAge: 60_000 },
    );
  });
}

async function getRecentLastKnownLocation(): Promise<UserLocation | null> {
  try {
    const lastKnown = await Location.getLastKnownPositionAsync({
      maxAge: MAX_LAST_KNOWN_AGE_MS,
      requiredAccuracy: 1_000,
    });
    return lastKnown ? toUserLocation(lastKnown) : null;
  } catch {
    return null;
  }
}

async function getNativeLocation(): Promise<UserLocation | null> {
  try {
    const hasPermission = await ensureNativeLocationPermission();
    if (!hasPermission) return null;

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      lastLocationFailure = "services-disabled";
      return null;
    }

    // Priorizamos una ubicación fresca. No se devuelve una coordenada antigua
    // como resultado principal porque podría corresponder a otra ciudad.
    try {
      const current = (await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          mayShowUserSettingsDialog: true,
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("gps-timeout")), GPS_TIMEOUT_MS);
        }),
      ])) as Location.LocationObject;

      const location = toUserLocation(current);
      publishLocation(location);
      return location;
    } catch {
      const recentLocation = await getRecentLastKnownLocation();
      if (recentLocation) {
        publishLocation(recentLocation);
        return recentLocation;
      }

      lastLocationFailure = "timeout";
      return null;
    }
  } catch {
    lastLocationFailure = "unavailable";
    return null;
  }
}

/** Mantiene la ubicación actualizada mientras la pantalla esté abierta. */
export async function startWatchingLocation(
  onUpdate: (loc: UserLocation) => void,
): Promise<Location.LocationSubscription | null> {
  if (Platform.OS === "web") return null;

  try {
    const hasPermission = await ensureNativeLocationPermission();
    if (!hasPermission) return null;

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      lastLocationFailure = "services-disabled";
      return null;
    }

    return await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 50,
        timeInterval: 60_000,
        mayShowUserSettingsDialog: true,
      },
      (position) => {
        const location = toUserLocation(position);
        publishLocation(location);
        onUpdate(location);
      },
    );
  } catch {
    lastLocationFailure = "unavailable";
    return null;
  }
}
