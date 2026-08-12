export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

/** Determina si una coordenada puede utilizarse para una búsqueda geográfica. */
export function isUsableLocation(
  location: LocationCoordinates | null | undefined,
): location is LocationCoordinates {
  return Boolean(
    location &&
      Number.isFinite(location.latitude) &&
      Number.isFinite(location.longitude) &&
      location.latitude >= -90 &&
      location.latitude <= 90 &&
      location.longitude >= -180 &&
      location.longitude <= 180 &&
      location.accuracy >= 0,
  );
}
