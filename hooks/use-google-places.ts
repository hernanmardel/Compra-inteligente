import { useQuery } from '@tanstack/react-query';
import { trpc } from '@/lib/trpc';

export interface StorePlace {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance: number;
  rating: number;
  reviewCount: number;
  isOpen: boolean | null;
  types: string[];
  storeType: 'supermercado' | 'mayorista' | 'comercio' | 'almacen';
  icon: string;
  businessStatus: string;
  photoReference: string | null;
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  googleMapsUrl: string;
  rating: number;
  reviewCount: number;
  isOpen: boolean | null;
  hours: string[];
  lat: number;
  lng: number;
  businessStatus: string;
  photoReference: string | null;
}

export interface OfferResult {
  storeName: string;
  website: string | null;
  offers: Array<{
    product: string;
    price: string;
    description?: string;
  }>;
}

// Tipo de respuesta del allNearby endpoint (ahora incluye fallback)
export interface AllNearbyResponse {
  places: StorePlace[];
  offers: any[];
  isFallback: boolean;
}

// Buscar comercios cercanos
export function useNearbyPlaces(params: {
  lat: number;
  lng: number;
  radius: number;
  type?: 'supermercado' | 'mayorista' | 'comercio' | 'almacen';
}) {
  return trpc.places.nearby.useQuery(params, {
    enabled: params.lat !== 0 && params.lng !== 0,
    staleTime: 2 * 60 * 1000,
  });
}

// Buscar todos los comercios cercanos (con fallback automático)
export function useAllNearbyPlaces(lat: number, lng: number, radius: number, cityName?: string) {
  return trpc.places.allNearby.useQuery(
    { lat, lng, radius, cityName },
    {
      enabled: lat !== 0 && lng !== 0,
      staleTime: 2 * 60 * 1000,
      select: (data: any) => {
        if (data?.places) {
          return data.places;
        }
        // Legacy response (antes del cambio) - era un array directo
        if (Array.isArray(data)) {
          return data;
        }
        return [];
      },
    }
  );
}

// Obtener detalles de un lugar
export function usePlaceDetails(placeId: string | null) {
  return trpc.places.details.useQuery(
    { placeId: placeId! },
    {
      enabled: !!placeId,
      staleTime: 10 * 60 * 1000,
    }
  );
}

// Buscar ofertas en la web de un comercio
export function useStoreOffers(placeId: string | null) {
  return trpc.places.offers.useQuery(
    { placeId: placeId! },
    {
      enabled: !!placeId,
      staleTime: 30 * 60 * 1000,
    }
  );
}

// Obtener URL de foto
export function usePlacePhoto(photoReference: string | null) {
  return trpc.places.photo.useQuery(
    { photoReference: photoReference! },
    {
      enabled: !!photoReference,
      staleTime: 60 * 60 * 1000,
    }
  );
}
