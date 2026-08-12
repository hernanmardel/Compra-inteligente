import { describe, it, expect } from 'vitest';
import axios from 'axios';

// Test that the Google Places API key works
describe('Google Places API Key', () => {
  it('should return valid results for Mar del Plata coordinates', async () => {
    // Use the API key from env
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_PLACES_API_KEY not set');
    }

    // Test with Mar del Plata coordinates
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
      params: {
        location: '-38.0420,-57.5470',
        radius: 5000,
        type: 'store',
        key: apiKey,
        language: 'es',
      },
      timeout: 15000,
    });

    // Check that the response is OK
    expect(response.data.status).toBe('OK');
    
    // Check that we got some results
    expect(Array.isArray(response.data.results)).toBe(true);
    expect(response.data.results.length).toBeGreaterThan(0);

    // Check that results have the expected structure
    const firstResult = response.data.results[0];
    expect(firstResult).toHaveProperty('place_id');
    expect(firstResult).toHaveProperty('name');
    expect(firstResult).toHaveProperty('geometry');
    expect(firstResult.geometry).toHaveProperty('location');
    expect(firstResult.geometry.location).toHaveProperty('lat');
    expect(firstResult.geometry.location).toHaveProperty('lng');
  }, { timeout: 30000 });

  it('should work for geocoding (reverse geocoding)', async () => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_PLACES_API_KEY not set');
    }

    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        latlng: '-38.0420,-57.5470',
        key: apiKey,
        language: 'es',
      },
      timeout: 15000,
    });

    expect(response.data.status).toBe('OK');
    expect(Array.isArray(response.data.results)).toBe(true);
    expect(response.data.results.length).toBeGreaterThan(0);
  }, { timeout: 30000 });
});
