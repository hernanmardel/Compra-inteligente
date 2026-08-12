# Overpass API + Nominatim - Notas de investigación

## Overpass API
- Endpoint: https://overpass-api.de/api/interpreter
- Consulta por radio alrededor de coordenadas
- Query example for supermarkets:
  ```
  [out:json][timeout:25];
  (
    node["shop"="supermarket"](around:5000,-38.0418,-57.5466);
    node["shop"="convenience"](around:5000,-38.0418,-57.5466);
    node["amenity"="marketplace"](around:5000,-38.0418,-57.5466);
  );
  out body;
  ```

## Shop types to search:
- shop=supermarket (supermercados)
- shop=convenience (almacenes/kioscos)
- shop=department_store (tiendas por departamento)
- shop=wholesale (mayoristas)
- shop=greengrocer (verdulerías)
- shop=bakery (panaderías)
- shop=butcher (carnicerías)
- amenity=marketplace (mercados)

## Nominatim (reverse geocoding)
- Endpoint: https://nominatim.openstreetmap.org/reverse
- Format: https://nominatim.openstreetmap.org/reverse?format=json&lat=-38.0418&lon=-57.5466&zoom=10&addressdetails=1
- Returns: city, region, country, etc.
- Rate limit: 1 request/second
- User-Agent required

## Overpass API URL format
- https://overpass-api.de/api/interpreter?data=[your-query-here]
- Response includes nodes with lat, lon, tags (name, shop type, etc.)
