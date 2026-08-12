import axios from 'axios';

// ========================================
// OpenStreetMap: Nominatim + Overpass API
// Gratis, sin API Key, sin tarjeta de crédito
// ========================================

const USER_AGENT = 'CompraInteligente/1.0';

// ========================================
// Tipos
// ========================================

interface OSMNode {
  id: number;
  type: 'node' | 'way' | 'relation';
  lat?: number;
  lon?: number;
  tags: { [key: string]: string };
  center?: { lat: number; lon: number };
}

interface OSMOverpassResponse {
  elements: OSMNode[];
}

export interface OSMPlace {
  osmId: string;
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
  website?: string;
  phone?: string;
  openingHours?: string;
}

// ========================================
// Calcular distancia (Haversine)
// ========================================

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

// ========================================
// Construir query Overpass optimizada
// ========================================

function buildOverpassQuery(lat: number, lng: number, radius: number): string {
  // Query optimizada: menos tipos, más rápido
  // Buscamos los tipos de comercio más relevantes para la compra inteligente
  return `[out:json][timeout:15];(
    node["shop"="supermarket"](around:${radius},${lat},${lng});
    node["shop"="convenience"](around:${radius},${lat},${lng});
    node["shop"="wholesale"](around:${radius},${lat},${lng});
    node["shop"="greengrocer"](around:${radius},${lat},${lng});
    node["shop"="butcher"](around:${radius},${lat},${lng});
    node["shop"="bakery"](around:${radius},${lat},${lng});
    way["shop"="supermarket"](around:${radius},${lat},${lng});
    way["shop"="convenience"](around:${radius},${lat},${lng});
  );out body;`;
}

// ========================================
// Buscar comercios cercanos usando Overpass API
// ========================================

export async function searchNearbyPlaces(
  lat: number,
  lng: number,
  radius: number,
  shopType?: string
): Promise<OSMPlace[]> {
  const query = buildOverpassQuery(lat, lng, radius);

  // Try multiple Overpass mirrors for reliability
  const endpoints = [
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://overpass.osm.be/api/interpreter',
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint, {
        params: { data: query },
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json',
        },
        timeout: 15000,
      });

      const data: OSMOverpassResponse = response.data;
      const results: OSMPlace[] = [];

      for (const element of data.elements) {
        const elementLat = element.lat ?? element.center?.lat;
        const elementLng = element.lon ?? element.center?.lon;
        if (!elementLat || !elementLng) continue;

        const name = element.tags?.name || element.tags?.['name:es'] || '';
        if (!name) continue;

        const tags = element.tags;
        const shopTag = tags?.shop || tags?.amenity || '';
        const storeType = classifyOSMStoreType(shopTag, name);
        const icon = getStoreIcon(storeType);
        const distance = calculateDistance(lat, lng, elementLat, elementLng);
        const address = buildAddress(tags, elementLat, elementLng);

        results.push({
          osmId: `osm_${element.type}_${element.id}`,
          name,
          address,
          lat: elementLat,
          lng: elementLng,
          distance,
          rating: 0,
          reviewCount: 0,
          isOpen: null,
          types: [shopTag],
          storeType,
          icon,
          website: tags?.website || tags?.['contact:website'] || undefined,
          phone: tags?.phone || tags?.['contact:phone'] || undefined,
          openingHours: tags?.opening_hours || undefined,
        });
      }

      results.sort((a, b) => a.distance - b.distance);
      return results.slice(0, 20);
    } catch (error: any) {
      console.log(`Overpass endpoint ${endpoint} failed: ${error.message}, trying next...`);
      continue;
    }
  }

  console.error('All Overpass endpoints failed');
  return [];
}

// ========================================
// Buscar comercios de múltiples tipos a la vez
// ========================================

export async function searchAllNearbyPlaces(
  lat: number,
  lng: number,
  radius: number
): Promise<OSMPlace[]> {
  try {
    return await searchNearbyPlaces(lat, lng, radius);
  } catch (error: any) {
    console.error('Error searching all nearby places:', error.message);
    return [];
  }
}

// ========================================
// Obtener detalles de un lugar (Overpass)
// ========================================

export async function getPlaceDetails(osmId: string): Promise<OSMPlace | null> {
  const parts = osmId.replace('osm_', '').split('_');
  const type = parts[0];
  const id = parts[1];

  if (!type || !id) return null;

  const endpoints = [
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass-api.de/api/interpreter',
  ];

  for (const endpoint of endpoints) {
    try {
      const query = `[out:json][timeout:10];(${type}(${id}););out body;`;
      const response = await axios.get(endpoint, {
        params: { data: query },
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json',
        },
        timeout: 10000,
      });

      const data: OSMOverpassResponse = response.data;
      if (data.elements.length === 0) return null;

      const element = data.elements[0];
      const elementLat = element.lat ?? element.center?.lat;
      const elementLng = element.lon ?? element.center?.lon;
      if (!elementLat || !elementLng) return null;

      const tags = element.tags;
      const shopTag = tags?.shop || tags?.amenity || '';
      const storeType = classifyOSMStoreType(shopTag, tags?.name || '');

      return {
        osmId,
        name: tags?.name || tags?.['name:es'] || 'Desconocido',
        address: buildAddress(tags, elementLat, elementLng),
        lat: elementLat,
        lng: elementLng,
        distance: 0,
        rating: 0,
        reviewCount: 0,
        isOpen: null,
        types: [shopTag],
        storeType,
        icon: getStoreIcon(storeType),
        website: tags?.website || tags?.['contact:website'],
        phone: tags?.phone || tags?.['contact:phone'],
        openingHours: tags?.opening_hours,
      };
    } catch (error: any) {
      console.log(`Place details endpoint ${endpoint} failed: ${error.message}`);
      continue;
    }
  }

  return null;
}

// ========================================
// Reverse geocoding con Nominatim
// ========================================

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ city: string; region: string; country: string } | null> {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        format: 'json',
        lat,
        lon: lng,
        zoom: 10,
        addressdetails: 1,
        'accept-language': 'es',
      },
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    const addr = response.data.address || {};

    return {
      city: addr.city || addr.town || addr.village || addr.suburb || '',
      region: addr.state || '',
      country: addr.country || '',
    };
  } catch (error: any) {
    console.error('Nominatim reverse geocode error:', error.message);
    return null;
  }
}

// ========================================
// Helpers
// ========================================

function classifyOSMStoreType(shopTag: string, name: string): 'supermercado' | 'mayorista' | 'comercio' | 'almacen' {
  const tag = shopTag.toLowerCase();
  const nameLower = name.toLowerCase();

  if (tag === 'supermarket') return 'supermercado';
  if (tag === 'department_store') return 'supermercado';
  if (tag === 'wholesale') return 'mayorista';
  if (nameLower.includes('mayorista') || nameLower.includes('distribuidora')) return 'mayorista';
  if (tag === 'convenience') return 'almacen';
  if (tag === 'general') return 'almacen';
  if (tag === 'greengrocer') return 'almacen';
  if (tag === 'deli') return 'almacen';
  if (tag === 'bakery') return 'almacen';
  if (tag === 'butcher') return 'almacen';
  if (tag === 'marketplace') return 'almacen';

  return 'comercio';
}

function getStoreIcon(type: string): string {
  switch (type) {
    case 'supermercado': return '🛒';
    case 'mayorista': return '📦';
    case 'almacen': return '🏪';
    default: return '🏬';
  }
}

function buildAddress(tags: { [key: string]: string }, lat: number, lng: number): string {
  const street = tags?.['addr:street'] || tags?.['addr:housename'];
  const number = tags?.['addr:housenumber'];
  const city = tags?.['addr:city'] || tags?.['addr:town'] || tags?.['addr:village'];

  if (street && number) {
    return `${street} ${number}${city ? `, ${city}` : ''}`;
  } else if (street) {
    return `${street}${number ? ` ${number}` : ''}${city ? `, ${city}` : ''}`;
  } else if (city) {
    return `${city} (coordenadas aprox.)`;
  } else {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}
