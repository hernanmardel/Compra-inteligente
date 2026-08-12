import axios from 'axios';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY ?? '';

interface PlaceResult {
  place_id: string;
  name: string;
  vicinity: string;
  types: string[];
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: {
    open_now?: boolean;
  };
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  photos?: Array<{
    photo_reference: string;
    width: number;
    height: number;
  }>;
  business_status?: string;
}

interface NearbySearchResponse {
  results: PlaceResult[];
  status: string;
}

// Buscar comercios cercanos usando Google Places API (Nearby Search)
export async function searchNearbyPlaces(
  lat: number,
  lng: number,
  radius: number, // en metros
  type: string = 'store'
): Promise<PlaceResult[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    console.log('Google Places API Key not configured');
    return [];
  }

  try {
    const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
    const response = await axios.get<NearbySearchResponse>(url, {
      params: {
        location: `${lat},${lng}`,
        radius: Math.min(radius, 50000),
        type,
        key: GOOGLE_PLACES_API_KEY,
        language: 'es',
      },
      timeout: 15000,
    });

    if (response.data.status !== 'OK') {
      console.error(`Google Places error: ${response.data.status}`);
      return [];
    }

    return response.data.results;
  } catch (error) {
    console.error('Error buscando comercios cercanos:', error);
    return [];
  }
}

// Buscar comercios de múltiples tipos a la vez
export async function searchAllNearbyPlaces(
  lat: number,
  lng: number,
  radius: number
): Promise<PlaceResult[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    return [];
  }

  const allResults: PlaceResult[] = [];
  const searchTypes = ['supermarket', 'grocery_or_supermarket', 'food', 'convenience_store'];

  for (const type of searchTypes) {
    try {
      const results = await searchNearbyPlaces(lat, lng, radius, type);
      for (const result of results) {
        // Avoid duplicates
        if (!allResults.some(r => r.place_id === result.place_id)) {
          allResults.push(result);
        }
      }
    } catch {
      continue;
    }
  }

  return allResults;
}

// Obtener detalles de un lugar específico
interface PlaceDetailsResponse {
  result: {
    place_id: string;
    name: string;
    formatted_address: string;
    formatted_phone_number?: string;
    website?: string;
    url: string;
    rating?: number;
    user_ratings_total?: number;
    opening_hours?: {
      weekday_text: string[];
      open_now?: boolean;
    };
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    photos?: Array<{
      photo_reference: string;
    }>;
    business_status?: string;
  };
  status: string;
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetailsResponse['result'] | null> {
  if (!GOOGLE_PLACES_API_KEY) {
    return null;
  }

  try {
    const url = 'https://maps.googleapis.com/maps/api/place/details/json';
    const response = await axios.get<PlaceDetailsResponse>(url, {
      params: {
        place_id: placeId,
        key: GOOGLE_PLACES_API_KEY,
        language: 'es',
        fields: 'name,formatted_address,formatted_phone_number,website,url,rating,user_ratings_total,opening_hours,geometry,photos,business_status',
      },
      timeout: 10000,
    });

    if (response.data.status !== 'OK') {
      return null;
    }

    return response.data.result;
  } catch (error) {
    console.error('Error obteniendo detalles del lugar:', error);
    return null;
  }
}

// Obtener URL de foto de Google Places
export function getPlacePhotoUrl(photoReference: string, maxWidth: number = 400): string {
  if (!GOOGLE_PLACES_API_KEY) return '';
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
}

// Buscar ofertas en la página web de un comercio (web scraping básico)
interface OfferSearchResult {
  storeName: string;
  storeWebsite: string;
  offers: Array<{
    product: string;
    price: string;
    description?: string;
  }>;
}

export async function searchStoreOffers(website: string, storeName: string): Promise<OfferSearchResult> {
  const result: OfferSearchResult = {
    storeName,
    storeWebsite: website,
    offers: [],
  };

  try {
    const response = await axios.get(website, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CompraInteligente/1.0)',
      },
    });

    const html = response.data;
    
    const offerPatterns = [
      /\$[\d.,]+\s*(?:ARS|pesos)?/gi,
      /(?:oferta|promo|descuento|rebaja|sale)[^<]{0,200}(?:\$[\d.,]+)/gi,
      /(?:desde|a\s+\$?|por\s+\$?)[\d.,]+/gi,
    ];

    const foundOffers: Set<string> = new Set();
    
    for (const pattern of offerPatterns) {
      const matches = html.match(pattern);
      if (matches) {
        for (const match of matches) {
          const cleaned = match.replace(/<[^>]*>/g, '').trim();
          if (cleaned.length > 3 && cleaned.length < 100 && !foundOffers.has(cleaned)) {
            foundOffers.add(cleaned);
            result.offers.push({
              product: cleaned,
              price: cleaned.match(/\$[\d.,]+/)?.[0] || cleaned,
              description: cleaned.replace(/\$[\d.,]+/, '').trim() || undefined,
            });
          }
        }
      }
    }

    result.offers = result.offers.slice(0, 10);
  } catch (error) {
    console.log(`No se pudieron obtener ofertas de ${storeName}: ${(error as Error).message}`);
  }

  return result;
}

// Clasificar tipo de comercio basado en los tipos de Google
export function classifyStoreType(types: string[]): 'supermercado' | 'mayorista' | 'comercio' | 'almacen' {
  const typeStr = types.join(',').toLowerCase();
  
  if (typeStr.includes('supermarket') || typeStr.includes('grocery_or_supermarket')) {
    return 'supermercado';
  }
  if (typeStr.includes('wholesale') || typeStr.includes('distribution')) {
    return 'mayorista';
  }
  if (typeStr.includes('convenience_store') || typeStr.includes('food') || typeStr.includes('store')) {
    return 'almacen';
  }
  return 'comercio';
}

// Obtener ícono según tipo de comercio
export function getStoreIcon(type: string): string {
  switch (type) {
    case 'supermercado': return '🛒';
    case 'mayorista': return '📦';
    case 'almacen': return '🏪';
    default: return '🏬';
  }
}

// Calcular distancia usando fórmula de Haversine
export function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
