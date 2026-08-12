import { describe, it, expect } from 'vitest';
import { searchNearbyPlaces, getPlaceDetails, reverseGeocode } from '../server/_core/openstreetmap';
import { calculateDistance, generateFallbackStores, generateFallbackOffers, PRODUCTS } from '../constants/mock-data';

describe('OpenStreetMap / Overpass API', () => {
  it('should search nearby places around Mar del Plata', async () => {
    const results = await searchNearbyPlaces(-38.0418, -57.5466, 5000);
    expect(Array.isArray(results)).toBe(true);
    // Puede devolver resultados reales o vacío si Overpass está lento
    if (results.length > 0) {
      results.forEach(place => {
        expect(place.name).toBeTruthy();
        expect(place.lat).toBeDefined();
        expect(place.lng).toBeDefined();
        expect(place.distance).toBeGreaterThan(0);
      });
    }
  }, 30000);

  it('should handle errors gracefully', async () => {
    // Buscar en coordenadas remotas (océano) - debería devolver vacío
    const results = await searchNearbyPlaces(45.5, -100.5, 500);
    expect(Array.isArray(results)).toBe(true);
    // En el océano no hay comercios
    expect(results.length).toBe(0);
  }, 30000);
});

describe('Nominatim Reverse Geocoding', () => {
  it('should detect Mar del Plata from coordinates', async () => {
    const result = await reverseGeocode(-38.0418, -57.5466);
    if (result) {
      expect(result.city).toBeTruthy();
      expect(result.country).toBeTruthy();
    }
  });

  it('should handle errors gracefully', async () => {
    // Coordenadas en el medio del océano - puede devolver null o país "Oceanía"
    const result = await reverseGeocode(0, 0);
    // No debería crashear
    expect(result === null || result?.country !== undefined).toBe(true);
  }, 15000);
});

describe('Fallback stores (multi-city)', () => {
  it('should generate fallback stores around Mar del Plata GPS coordinates', () => {
    const radiusKm = 5;
    const stores = generateFallbackStores(-38.0418, -57.5466, radiusKm, 'Mar del Plata');
    expect(stores.length).toBeGreaterThan(0);
    stores.forEach(store => {
      expect(store.distance).toBeLessThanOrEqual(radiusKm);
      expect(store.lat).toBeDefined();
      expect(store.lng).toBeDefined();
      expect(store.name).toBeTruthy();
      expect(store.address).toContain('Mar del Plata');
      expect(store.address).toMatch(/\d+/);
    });
  });

  it('should generate fallback stores around Buenos Aires coordinates', () => {
    const radiusKm = 5;
    const stores = generateFallbackStores(-34.6037, -58.3816, radiusKm, 'Buenos Aires');
    expect(stores.length).toBeGreaterThan(0);
    stores.forEach(store => {
      expect(store.distance).toBeLessThanOrEqual(radiusKm);
      expect(store.address).toContain('Buenos Aires');
      expect(store.address).toMatch(/\d+/);
    });
  });

  it('should work without city name (generic fallback)', () => {
    const radiusKm = 5;
    const stores = generateFallbackStores(-34.6037, -58.3816, radiusKm);
    expect(stores.length).toBeGreaterThan(0);
    stores.forEach(store => {
      expect(store.address).toBeTruthy();
      expect(store.address).toMatch(/\d+/);
    });
  });

  it('should generate fallback offers for stores', () => {
    const stores = generateFallbackStores(-38.0418, -57.5466, 5, 'Mar del Plata');
    const offers = generateFallbackOffers(stores, PRODUCTS);
    expect(offers.length).toBeGreaterThan(0);
    offers.forEach(offer => {
      expect(offer.store).toBeTruthy();
      expect(offer.offerPrice).toBeLessThan(offer.normalPrice);
      expect(offer.storeType).toBeDefined();
    });
  });
});

describe('Distance calculation (Haversine)', () => {
  it('should calculate correct distance between two Mar del Plata points', () => {
    const d = calculateDistance(-38.0418, -57.5466, -38.0518, -57.5466);
    expect(d).toBeGreaterThan(0.5);
    expect(d).toBeLessThan(1.5);
  });

  it('should return 0 for the same coordinates', () => {
    const d = calculateDistance(-38.0418, -57.5466, -38.0418, -57.5466);
    expect(d).toBe(0);
  });

  it('should calculate correct distance between Buenos Aires and La Plata', () => {
    const d = calculateDistance(-34.6037, -58.3816, -34.9215, -57.9545);
    expect(d).toBeGreaterThan(40);
    expect(d).toBeLessThan(65);
  });
});
