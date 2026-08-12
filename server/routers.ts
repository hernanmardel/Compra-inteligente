import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  searchAllNearbyPlaces as searchGooglePlacesAll,
  searchNearbyPlaces as searchGooglePlaces,
  getPlaceDetails as getGooglePlaceDetails,
  getPlacePhotoUrl,
  classifyStoreType as classifyGoogleStoreType,
  getStoreIcon as getGoogleStoreIcon,
  calculateDistance as googleCalculateDistance,
} from "./_core/google-places";
import {
  searchAllNearbyPlaces as searchOSMPlaces,
  getPlaceDetails as getOSMPlaceDetails,
  reverseGeocode,
  calculateDistance as osmCalculateDistance,
} from "./_core/openstreetmap";
import {
  PRODUCTS,
  generateFallbackStores,
  generateFallbackOffers,
} from "../constants/mock-data";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  places: router({
    // Buscar comercios cercanos por GPS - PRIORIDAD: Google Places > OpenStreetMap > Fallback Mock
    nearby: publicProcedure
      .input(
        z.object({
          lat: z.number(),
          lng: z.number(),
          radius: z.number().default(5000),
          type: z.enum(['supermercado', 'mayorista', 'comercio', 'almacen']).optional(),
        })
      )
      .query(async ({ input }) => {
        const { lat, lng, radius, type } = input;

        // 1. Intentar Google Places API primero
        let googlePlaces: any[] = [];
        try {
          if (process.env.GOOGLE_PLACES_API_KEY) {
            const searchType = type === 'supermercado' ? 'supermarket' : 
                              type === 'mayorista' ? 'grocery_or_supermarket' : 'store';
            googlePlaces = await searchGooglePlaces(lat, lng, radius, searchType);
          }
        } catch {
          console.log('Google Places failed, falling back to OSM');
        }

        // 2. Si Google no devolvió nada, intentar OpenStreetMap
        let osmPlaces: any[] = [];
        if (googlePlaces.length === 0) {
          try {
            osmPlaces = await searchOSMPlaces(lat, lng, radius);
          } catch {
            console.log('OSM failed, falling back to mock');
          }
        }

        // 3. Mapear Google Places al formato StorePlace
        const gPlaces = googlePlaces.map(result => ({
          placeId: result.place_id,
          name: result.name,
          address: result.vicinity || '',
          lat: result.geometry?.location?.lat || 0,
          lng: result.geometry?.location?.lng || 0,
          distance: googleCalculateDistance(lat, lng, result.geometry?.location?.lat || 0, result.geometry?.location?.lng || 0),
          rating: result.rating || 0,
          reviewCount: result.user_ratings_total || 0,
          isOpen: result.opening_hours?.open_now ?? null,
          types: result.types || [],
          storeType: classifyGoogleStoreType(result.types || []),
          icon: getGoogleStoreIcon(classifyGoogleStoreType(result.types || [])),
          businessStatus: result.business_status || 'OPERATIONAL',
          photoReference: result.photos?.[0]?.photo_reference || null,
          website: null,
          phone: null,
          openingHours: null,
        }));

        // 4. Mapear OpenStreetMap al formato StorePlace
        const oPlaces = osmPlaces.map(place => ({
          placeId: place.osmId,
          name: place.name,
          address: place.address,
          lat: place.lat,
          lng: place.lng,
          distance: place.distance,
          rating: place.rating,
          reviewCount: place.reviewCount,
          isOpen: place.isOpen,
          types: place.types,
          storeType: place.storeType,
          icon: place.icon,
          businessStatus: 'OPERATIONAL',
          photoReference: null,
          website: place.website || null,
          phone: place.phone || null,
          openingHours: place.openingHours || null,
        }));

        // Combinar resultados
        const allPlaces = [...gPlaces, ...oPlaces];

        // Filtrar por tipo si se especifica
        const filtered = type
          ? allPlaces.filter(p => p.storeType === type)
          : allPlaces;

        // Filtrar solo comercios relevantes dentro del radio
        const relevantTypes = ['supermercado', 'mayorista', 'almacen', 'comercio'];
        const finalPlaces = filtered.filter(p =>
          relevantTypes.includes(p.storeType) && p.distance <= radius / 1000
        );

        // Ordenar por distancia
        finalPlaces.sort((a, b) => a.distance - b.distance);

        return finalPlaces.slice(0, 20);
      }),

    // Obtener detalles de un lugar específico
    details: publicProcedure
      .input(z.object({ placeId: z.string() }))
      .query(async ({ input }) => {
        // Intentar Google Places Details primero
        if (process.env.GOOGLE_PLACES_API_KEY && input.placeId.startsWith('ChI')) {
          const details = await getGooglePlaceDetails(input.placeId);
          if (details) {
            return {
              placeId: input.placeId,
              name: details.name,
              address: details.formatted_address || '',
              phone: details.formatted_phone_number || null,
              website: details.website || null,
              googleMapsUrl: details.url,
              rating: details.rating || 0,
              reviewCount: details.user_ratings_total || 0,
              isOpen: details.opening_hours?.open_now ?? null,
              hours: details.opening_hours?.weekday_text || [],
              lat: details.geometry?.location?.lat,
              lng: details.geometry?.location?.lng,
              businessStatus: details.business_status || 'OPERATIONAL',
              photoReference: details.photos?.[0]?.photo_reference || null,
            };
          }
        }

        // Fallback a OpenStreetMap
        const details = await getOSMPlaceDetails(input.placeId);
        if (!details) return null;

        return {
          placeId: details.osmId,
          name: details.name,
          address: details.address,
          phone: details.phone || null,
          website: details.website || null,
          googleMapsUrl: `https://www.openstreetmap.org/?mlat=${details.lat}&mlon=${details.lng}`,
          rating: details.rating,
          reviewCount: details.reviewCount,
          isOpen: details.isOpen,
          hours: details.openingHours ? [details.openingHours] : [],
          lat: details.lat,
          lng: details.lng,
          businessStatus: 'OPERATIONAL',
          photoReference: null,
        };
      }),

    // Obtener foto
    photo: publicProcedure
      .input(z.object({ photoReference: z.string() }))
      .query(async ({ input }) => {
        return getPlacePhotoUrl(input.photoReference);
      }),

    // Buscar ofertas en la web de un comercio
    offers: publicProcedure
      .input(z.object({ placeId: z.string() }))
      .query(async ({ input }) => {
        // Intentar con Google Places primero
        if (process.env.GOOGLE_PLACES_API_KEY && input.placeId.startsWith('ChI')) {
          const details = await getGooglePlaceDetails(input.placeId);
          if (details?.website) {
            return await (await import('./_core/google-places')).searchStoreOffers(details.website, details.name);
          }
        }

        // Fallback a OpenStreetMap
        const details = await getOSMPlaceDetails(input.placeId);
        if (!details?.website) {
          return { storeName: details?.name || 'Desconocido', website: null, offers: [] };
        }

        return await (await import('./_core/google-places')).searchStoreOffers(details.website, details.name);
      }),

    // Reverse geocoding: obtener nombre de ciudad por coordenadas
    reverseGeocode: publicProcedure
      .input(z.object({
        lat: z.number(),
        lng: z.number(),
      }))
      .query(async ({ input }) => {
        // Intentar Google Geocoding primero
        if (process.env.GOOGLE_PLACES_API_KEY) {
          try {
            const axios = (await import('axios')).default;
            const url = 'https://maps.googleapis.com/maps/api/geocode/json';
            const response = await axios.get(url, {
              params: {
                latlng: `${input.lat},${input.lng}`,
                key: process.env.GOOGLE_PLACES_API_KEY,
                language: 'es',
              },
              timeout: 10000,
            });

            if (response.data.status === 'OK' && response.data.results?.length) {
              const result = response.data.results[0];
              let city = '';
              let region = '';
              let country = '';

              for (const component of result.address_components || []) {
                if (component.types.includes('locality') || component.types.includes('administrative_area_level_3')) {
                  city = component.long_name;
                } else if (component.types.includes('administrative_area_level_1')) {
                  region = component.long_name;
                } else if (component.types.includes('country')) {
                  country = component.long_name;
                }
              }

              if (city) {
                return { city, region, country };
              }
            }
          } catch {
            // Fall back to OSM
          }
        }

        // Fallback a Nominatim
        return await reverseGeocode(input.lat, input.lng);
      }),

    // Buscar comercios de múltiples tipos a la vez (endpoint principal)
    allNearby: publicProcedure
      .input(
        z.object({
          lat: z.number(),
          lng: z.number(),
          radius: z.number().default(5000),
          cityName: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const { lat, lng, radius, cityName } = input;

        // 1. Intentar Google Places API primero (múltiples tipos)
        let googlePlaces: any[] = [];
        let isGoogleWorking = false;
        try {
          if (process.env.GOOGLE_PLACES_API_KEY) {
            googlePlaces = await searchGooglePlacesAll(lat, lng, radius);
            isGoogleWorking = googlePlaces.length > 0;
          }
        } catch {
          console.log('Google Places All failed, trying OSM...');
        }

        // 2. Si Google funciona y tiene resultados, usarlos
        if (isGoogleWorking && googlePlaces.length > 0) {
          const places = googlePlaces.map(result => ({
            placeId: result.place_id,
            name: result.name,
            address: result.vicinity || '',
            lat: result.geometry?.location?.lat || 0,
            lng: result.geometry?.location?.lng || 0,
            distance: googleCalculateDistance(lat, lng, result.geometry?.location?.lat || 0, result.geometry?.location?.lng || 0),
            rating: result.rating || 0,
            reviewCount: result.user_ratings_total || 0,
            isOpen: result.opening_hours?.open_now ?? null,
            types: result.types || [],
            storeType: classifyGoogleStoreType(result.types || []),
            icon: getGoogleStoreIcon(classifyGoogleStoreType(result.types || [])),
            businessStatus: result.business_status || 'OPERATIONAL',
            photoReference: result.photos?.[0]?.photo_reference || null,
            website: null,
            phone: null,
            openingHours: null,
          }));

          // Filtrar y ordenar
          const relevantTypes = ['supermercado', 'mayorista', 'almacen', 'comercio'];
          places.sort((a, b) => a.distance - b.distance);
          const final = places.filter(p => relevantTypes.includes(p.storeType) && p.distance <= radius / 1000);

          return {
            places: final.slice(0, 20),
            offers: [],
            isFallback: false,
          };
        }

        // 3. Si Google no funciona o no tiene resultados, intentar OpenStreetMap
        let osmPlaces: any[] = [];
        try {
          osmPlaces = await searchOSMPlaces(lat, lng, radius);
        } catch {
          console.log('OSM failed, falling back to mock');
        }

        const oPlaces = osmPlaces.map(place => ({
          placeId: place.osmId,
          name: place.name,
          address: place.address,
          lat: place.lat,
          lng: place.lng,
          distance: place.distance,
          rating: place.rating,
          reviewCount: place.reviewCount,
          isOpen: place.isOpen,
          types: place.types,
          storeType: place.storeType,
          icon: place.icon,
          businessStatus: 'OPERATIONAL',
          photoReference: null,
          website: place.website || null,
          phone: place.phone || null,
          openingHours: place.openingHours || null,
        }));

        if (oPlaces.length > 0) {
          const relevantTypes = ['supermercado', 'mayorista', 'almacen', 'comercio'];
          oPlaces.sort((a, b) => a.distance - b.distance);
          const final = oPlaces.filter(p => relevantTypes.includes(p.storeType) && p.distance <= radius / 1000);

          return {
            places: final.slice(0, 20),
            offers: [],
            isFallback: false,
          };
        }

        // 4. Si todo falla, usar fallback mock basado en ciudad
        const radiusKm = radius / 1000;
        const mockStores = generateFallbackStores(lat, lng, radiusKm, cityName);
        const mockOffers = generateFallbackOffers(mockStores, PRODUCTS);

        return {
          places: mockStores.map(s => ({
            placeId: s.id,
            name: s.name,
            address: s.address,
            lat: s.lat,
            lng: s.lng,
            distance: s.distance,
            rating: 0,
            reviewCount: 0,
            isOpen: null as boolean | null,
            types: [],
            storeType: s.type,
            icon: s.logo,
            businessStatus: 'OPERATIONAL',
            photoReference: null,
          })),
          offers: mockOffers,
          isFallback: true,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
