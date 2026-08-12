import { useState, useEffect, useCallback } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Linking,
  Platform,
  StyleSheet,
  Modal,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getLocation, startWatchingLocation, subscribeLocation, type UserLocation } from "@/lib/location-service";
import { useAllNearbyPlaces, useStoreOffers, type StorePlace } from "@/hooks/use-google-places";
import * as Haptics from "expo-haptics";
import { trpc } from "@/lib/trpc";
import {
  PRODUCTS,
  formatPrice,
  type Product,
} from "@/constants/mock-data";
import { addCustomProduct, getAllProducts } from "@/constants/product-store";
import { addProductToShoppingList } from "@/constants/shopping-list-store";

const RADIOS = [
  { value: 1000, label: "1 km" },
  { value: 2000, label: "2 km" },
  { value: 5000, label: "5 km" },
  { value: 10000, label: "10 km" },
  { value: 25000, label: "25 km" },
];

const TYPE_FILTERS: Array<{ value: string | null; label: string; icon: string }> = [
  { value: null, label: "Todos", icon: "🏪" },
  { value: "supermercado", label: "Supermercados", icon: "🛒" },
  { value: "mayorista", label: "Mayoristas", icon: "📦" },
  { value: "comercio", label: "Comercios", icon: "🏬" },
  { value: "almacen", label: "Almacenes", icon: "🧺" },
];

// Filtros por categoría de producto
const PRODUCT_CATEGORIES = [
  "Todos",
  "Frutas y Verduras",
  "Lácteos",
  "Carnes",
  "Almacén",
  "Panadería",
  "Bebidas",
  "Limpieza",
  "Hogar",
  "Snacks",
  "Conservas",
  "Proteínas",
];

const CATEGORY_ICONS: Record<string, string> = {
  "Todos": "🏷️",
  "Frutas y Verduras": "🍎",
  "Lácteos": "🥛",
  "Carnes": "🥩",
  "Almacén": "🍚",
  "Panadería": "🍞",
  "Bebidas": "☕",
  "Limpieza": "🧹",
  "Hogar": "🧻",
  "Snacks": "🍪",
  "Conservas": "🐟",
  "Proteínas": "🥚",
};

const TYPE_COLORS: Record<string, string> = {
  supermercado: "#16A34A",
  mayorista: "#F59E0B",
  comercio: "#3B82F6",
  almacen: "#EF4444",
};

interface StoreOfferItem {
  product: string;
  price: string;
}

interface SelectedOffer {
  offer: StoreOfferItem;
  store: StorePlace;
}

export default function OfertasScreen() {
  const colors = useColors();
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState(false);
  const [selectedRadius, setSelectedRadius] = useState(5000);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>("Todos");
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [currentCity, setCurrentCity] = useState<string | null>(null);
  const [addedProducts, setAddedProducts] = useState<Set<string>>(new Set());
  const [selectedOffer, setSelectedOffer] = useState<SelectedOffer | null>(null);

  // Reverse geocoding con Google API
  const geocodeQuery = trpc.places.reverseGeocode.useQuery(
    { lat: userLocation?.latitude ?? 0, lng: userLocation?.longitude ?? 0 },
    { enabled: !!userLocation && !currentCity }
  );

  useEffect(() => {
    if (geocodeQuery.data?.city) {
      setCurrentCity(geocodeQuery.data.city);
    }
  }, [geocodeQuery.data]);

  // Get location once
  useEffect(() => {
    let sub: (() => void) | undefined;
    let watch: { remove: () => void } | null = null;
    let mounted = true;

    (async () => {
      const loc = await getLocation();
      if (!mounted) return;
      if (loc) {
        setUserLocation(loc);
        setLocationLoading(false);
      } else {
        setLocationLoading(false);
        setLocationError(true);
      }
      sub = subscribeLocation((newLoc) => {
        setUserLocation(newLoc);
        setLocationError(false);
        setLocationLoading(false);
      });
      watch = await startWatchingLocation((newLoc) => {
        if (mounted) setUserLocation(newLoc);
      });
    })();
    return () => {
      mounted = false;
      if (sub) sub();
      watch?.remove();
    };
  }, []);

  const { data: places, isLoading, refetch } = useAllNearbyPlaces(
    userLocation?.latitude ?? 0,
    userLocation?.longitude ?? 0,
    selectedRadius,
    currentCity || undefined
  );

  const onRefresh = useCallback(async () => {
    setLocationLoading(true);
    const location = await getLocation();
    if (location) {
      setUserLocation(location);
      setLocationError(false);
    } else {
      setLocationError(true);
    }
    setLocationLoading(false);
    await refetch();
  }, [refetch]);

  const filteredPlaces = selectedType
    ? (places ?? []).filter((p: StorePlace) => p.storeType === selectedType)
    : (places ?? []);
  const sortedPlaces = [...(filteredPlaces ?? [])].sort((a, b) => a.distance - b.distance);

  const selectedStore = places?.find((p: StorePlace) => p.placeId === selectedStoreId) || null;
  const { data: selectedOffers, isLoading: offersLoading } = useStoreOffers(
    selectedStoreId
  );

  // Función para agregar producto en oferta al catálogo de productos
  const handleAddOfferProduct = async (offer: StoreOfferItem) => {
    const productName = offer.product;

    // Determinar categoría y ícono
    let category = "Almacén";
    let icon = "🛒";
    let unit = "un";

    const lowerName = productName.toLowerCase();
    if (lowerName.includes("leche") || lowerName.includes("yogur") || lowerName.includes("queso")) {
      category = "Lácteos"; icon = "🥛"; unit = "lt";
    } else if (lowerName.includes("pan") || lowerName.includes("factura")) {
      category = "Panadería"; icon = "🍞"; unit = "paq";
    } else if (lowerName.includes("fruta") || lowerName.includes("verdura") || lowerName.includes("banana") || lowerName.includes("manzana")) {
      category = "Frutas y Verduras"; icon = "🍎"; unit = "kg";
    } else if (lowerName.includes("carne") || lowerName.includes("pollo") || lowerName.includes("milanesa")) {
      category = "Carnes"; icon = "🥩"; unit = "kg";
    } else if (lowerName.includes("detergente") || lowerName.includes("lavandina") || lowerName.includes("jabón")) {
      category = "Limpieza"; icon = "🧹"; unit = "lt";
    } else if (lowerName.includes("papel") || lowerName.includes("jabón mano")) {
      category = "Hogar"; icon = "🧻"; unit = "paq";
    } else if (lowerName.includes("galleta") || lowerName.includes("papas fritas")) {
      category = "Snacks"; icon = "🍪"; unit = "paq";
    } else if (lowerName.includes("coca") || lowerName.includes("agua") || lowerName.includes("cerveza") || lowerName.includes("jugo")) {
      category = "Bebidas"; icon = "🥤"; unit = "lt";
    }

    // Extraer precio numérico
    let price = 0;
    const priceMatch = offer.price.match(/\d+[.,]?\d*/);
    if (priceMatch) {
      price = parseFloat(priceMatch[0].replace(".", "").replace(",", "."));
    }

    const newProduct: Product = {
      id: `offer-${Date.now()}`,
      name: productName,
      category,
      unit,
      icon,
    };

    // Conserva el producto para futuras listas y usa el existente si ya estaba en catálogo.
    const catalog = await getAllProducts();
    const existingProduct = catalog.find((product) => product.name.trim().toLowerCase() === productName.trim().toLowerCase());
    const productToAdd = existingProduct ?? newProduct;
    if (!existingProduct) await addCustomProduct(newProduct);
    await addProductToShoppingList(productToAdd, price);
    setAddedProducts(prev => new Set(prev).add(productName));
    setSelectedOffer(null);

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const openNavigation = (place: StorePlace) => {
    const url = Platform.select({
      ios: `maps://app?daddr=${place.lat},${place.lng}`,
      android: `google.navigation:q=${place.lat},${place.lng}`,
      web: `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`,
    });
    if (url) Linking.openURL(url);
  };

  const openGoogleMaps = (place: StorePlace) => {
    Linking.openURL(`https://www.google.com/maps/place/?q=place_id:${place.placeId}`);
  };

  return (
    <ScreenContainer>
      <ScrollView
        className="flex-1 px-5"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.tint} />}
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        {/* Header */}
        <View className="pt-4 pb-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-foreground">Ofertas Cerca</Text>
            {locationLoading ? (
              <View className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5 bg-surface" style={{ borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 12 }}>📍</Text>
                <Text className="text-xs text-muted">Detectando GPS...</Text>
              </View>
            ) : locationError ? (
              <TouchableOpacity onPress={onRefresh} className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5" style={{ backgroundColor: colors.warning + '20' }}>
                <Text style={{ fontSize: 12 }}>⚠️</Text>
                <Text className="text-xs font-medium" style={{ color: colors.warning }}>Activar GPS</Text>
              </TouchableOpacity>
            ) : userLocation ? (
              <View className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5" style={{ backgroundColor: colors.success + '20' }}>
                <Text style={{ fontSize: 12 }}>📍</Text>
                <Text className="text-xs font-semibold" style={{ color: colors.success }}>
                  {currentCity || `${userLocation.latitude.toFixed(3)}, ${userLocation.longitude.toFixed(3)}`}
                </Text>
              </View>
            ) : null}
          </View>
          <Text className="text-sm text-muted mt-1">
            {isLoading ? "Buscando comercios..." : `${sortedPlaces.length} comercios con ofertas`}
          </Text>
        </View>

        {/* Radio filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerStyle={{ paddingRight: 20 }}>
          <View className="flex-row gap-2">
            {RADIOS.map((r) => (
              <TouchableOpacity
                key={r.value}
                onPress={() => setSelectedRadius(r.value)}
                className={`px-4 py-2 rounded-full ${selectedRadius === r.value ? "bg-primary" : "bg-surface"}`}
                style={selectedRadius !== r.value ? { borderWidth: 1, borderColor: colors.border } : {}}
              >
                <Text className={`text-xs font-medium ${selectedRadius === r.value ? "text-background" : "text-foreground"}`}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Type filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerStyle={{ paddingRight: 20 }}>
          <View className="flex-row gap-2">
            {TYPE_FILTERS.map((f) => {
              const active = (f.value === null && selectedType === null) || selectedType === f.value;
              return (
                <TouchableOpacity
                  key={f.value ?? "all"}
                  onPress={() => setSelectedType(f.value)}
                  className={`px-3 py-2 rounded-full ${active ? "bg-primary" : "bg-surface"}`}
                  style={active ? {} : { borderWidth: 1, borderColor: colors.border }}
                >
                  <Text style={{ fontSize: 14 }}>{f.icon}</Text>
                  <Text className={`text-xs font-medium ${active ? "text-background" : "text-foreground"}`}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Product category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerStyle={{ paddingRight: 20 }}>
          <View className="flex-row gap-2">
            {PRODUCT_CATEGORIES.map((cat) => {
              const active = selectedProductCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedProductCategory(cat)}
                  className={`px-3 py-2 rounded-full ${active ? "bg-primary" : "bg-surface"}`}
                  style={active ? {} : { borderWidth: 1, borderColor: colors.border }}
                >
                  <Text style={{ fontSize: 14 }}>{CATEGORY_ICONS[cat] || "🏷️"}</Text>
                  <Text className={`text-xs font-medium ${active ? "text-background" : "text-foreground"}`}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Loading */}
        {isLoading && (
          <View className="items-center py-12">
            <ActivityIndicator size="large" color={colors.tint} />
            <Text className="mt-4 text-muted">Buscando comercios cerca de ti...</Text>
          </View>
        )}

        {/* No results */}
        {!isLoading && sortedPlaces.length === 0 && (
          <View className="items-center py-12">
            <Text style={{ fontSize: 40 }}>🏪</Text>
            <Text className="text-sm font-semibold text-foreground mt-3">No hay comercios en este radio</Text>
            <Text className="text-xs text-muted mt-1">Amplá el área de búsqueda</Text>
          </View>
        )}

        {/* Stores with offers */}
        {!isLoading && sortedPlaces.length > 0 && (
          <View className="mt-4">
            <Text className="text-base font-bold text-foreground mb-3">
              Comercios ({sortedPlaces.length})
            </Text>
            {sortedPlaces.map((place) => {
              const typeColor = TYPE_COLORS[place.storeType] || "#666";
              const isSelected = selectedStoreId === place.placeId;
              return (
                <TouchableOpacity
                  key={place.placeId}
                  onPress={() => {
                    setSelectedStoreId(isSelected ? null : place.placeId);
                    if (isSelected) setSelectedOffer(null);
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.storeCard,
                    {
                      backgroundColor: isSelected ? typeColor + '10' : colors.surface,
                      borderColor: isSelected ? typeColor : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <View className="p-4">
                    <View className="flex-row items-start">
                      <View className="w-12 h-12 rounded-2xl items-center justify-center mr-3" style={{ backgroundColor: typeColor + '10' }}>
                        <Text style={{ fontSize: 24 }}>{place.icon}</Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>{place.name}</Text>
                        <Text className="text-xs text-muted mt-0.5">{place.address}</Text>
                        <View className="flex-row items-center gap-3 mt-1">
                          <Text className="text-xs text-muted">📍 {place.distance < 1 ? `${Math.round(place.distance * 1000)}m` : `${place.distance.toFixed(1)} km`}</Text>
                          {place.rating > 0 && <Text className="text-xs text-muted">⭐ {place.rating.toFixed(1)} ({place.reviewCount})</Text>}
                          {place.isOpen !== null && (
                            <Text className={`text-xs font-medium ${place.isOpen ? "text-success" : "text-error"}`}>
                              {place.isOpen ? "● Abierto" : "● Cerrado"}
                            </Text>
                          )}
                        </View>
                        <View className="mt-1">
                          <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: typeColor + '15' }}>
                            <Text className="text-[10px] font-bold" style={{ color: typeColor }}>{place.storeType.toUpperCase()}</Text>
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={(e) => { e.stopPropagation(); openNavigation(place); }}
                        className="rounded-xl px-3 py-2 ml-2"
                        style={{ backgroundColor: typeColor }}
                      >
                        <Text className="text-white text-xs font-bold">Ir</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Offers section */}
                    {isSelected && (
                      <View className="mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
                        <TouchableOpacity
                          onPress={() => openGoogleMaps(place)}
                          className="mb-3 py-2 rounded-lg bg-surface items-center"
                          style={{ borderWidth: 1, borderColor: colors.border }}
                        >
                          <Text className="text-xs font-medium text-primary">🌐 Ver en Google Maps (ofertas publicadas)</Text>
                        </TouchableOpacity>
                        <StoreOffersInline
                          placeId={place.placeId}
                          colors={colors}
                          productCategory={selectedProductCategory}
                          addedProducts={addedProducts}
                          onAddProduct={handleAddOfferProduct}
                          store={place}
                          onSelectOffer={(offer) => setSelectedOffer({ offer, store: place })}
                        />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Bottom sheet for selected store */}
      {selectedStore && (
        <View className="absolute bottom-0 left-0 right-0 bg-background border-t pb-8" style={{ borderColor: colors.border, borderTopWidth: 1 }}>
          <View className="px-5 pt-4 pb-3">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-3">
                <Text style={{ fontSize: 32 }}>{selectedStore.icon}</Text>
                <View className="flex-1">
                  <Text className="text-base font-bold text-foreground">{selectedStore.name}</Text>
                  <Text className="text-xs text-muted">{selectedStore.address}</Text>
                  <Text className="text-xs text-muted mt-1">
                    📍 {selectedStore.distance < 1 ? `${Math.round(selectedStore.distance * 1000)}m` : `${selectedStore.distance.toFixed(1)} km`}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedStoreId(null)}>
                <Text className="text-sm font-semibold text-muted">✕</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => openNavigation(selectedStore)}
              className="flex-row items-center justify-center py-3 rounded-xl bg-primary"
            >
              <Text className="text-background font-semibold">🧭 Navegar a {selectedStore.name}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal
        visible={Boolean(selectedOffer)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOffer(null)}
      >
        <View style={styles.offerModalBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setSelectedOffer(null)} />
          {selectedOffer && (
            <View className="rounded-t-[28px] px-5 pt-4 pb-8" style={{ backgroundColor: colors.background }}>
              <View className="items-center mb-4">
                <View className="w-10 h-1 rounded-full" style={{ backgroundColor: colors.border }} />
              </View>
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-xs font-bold text-primary uppercase tracking-wide">Oferta seleccionada</Text>
                  <Text className="text-2xl font-bold text-foreground mt-1" numberOfLines={2}>{selectedOffer.offer.product}</Text>
                  <Text className="text-xl font-bold text-success mt-1">{selectedOffer.offer.price}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedOffer(null)} className="w-9 h-9 rounded-full items-center justify-center bg-surface">
                  <Text className="text-base text-muted">✕</Text>
                </TouchableOpacity>
              </View>

              <View className="rounded-2xl mt-5 p-4" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                <View className="flex-row items-center">
                  <Text style={{ fontSize: 28 }}>{selectedOffer.store.icon}</Text>
                  <View className="flex-1 ml-3">
                    <Text className="text-base font-bold text-foreground" numberOfLines={1}>{selectedOffer.store.name}</Text>
                    <Text className="text-sm text-muted mt-0.5" numberOfLines={2}>{selectedOffer.store.address}</Text>
                    <Text className="text-sm font-semibold text-primary mt-2">
                      📍 {selectedOffer.store.distance < 1 ? `${Math.round(selectedOffer.store.distance * 1000)} m` : `${selectedOffer.store.distance.toFixed(1)} km`} de distancia
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => handleAddOfferProduct(selectedOffer.offer)}
                className="items-center justify-center py-4 rounded-2xl bg-primary mt-5"
              >
                <Text className="text-background font-bold text-base">+ Agregar a mi lista</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => openNavigation(selectedOffer.store)}
                className="items-center justify-center py-4 rounded-2xl mt-3"
                style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
              >
                <Text className="text-primary font-bold text-base">🧭 Ir al comercio</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function StoreOffersInline({
  placeId,
  colors,
  productCategory,
  addedProducts,
  onAddProduct,
  store,
  onSelectOffer,
}: {
  placeId: string;
  colors: any;
  productCategory: string;
  addedProducts: Set<string>;
  onAddProduct: (offer: StoreOfferItem) => void;
  store: StorePlace;
  onSelectOffer: (offer: StoreOfferItem) => void;
}) {
  const { data: offers, isLoading } = useStoreOffers(placeId);

  if (isLoading) {
    return (
      <View className="items-center py-3">
        <ActivityIndicator size="small" color={colors.tint} />
        <Text className="text-xs text-muted mt-1">Buscando ofertas...</Text>
      </View>
    );
  }

  if (!offers) return null;

  if (offers.offers && offers.offers.length > 0) {
    // Filtrar por categoría de producto
    const filteredOffers = productCategory === "Todos"
      ? offers.offers
      : offers.offers.filter((o: StoreOfferItem) => {
          const name = o.product.toLowerCase();
          switch (productCategory) {
            case "Lácteos": return name.includes("leche") || name.includes("yogur") || name.includes("queso");
            case "Carnes": return name.includes("carne") || name.includes("pollo") || name.includes("milanesa") || name.includes("jamón");
            case "Frutas y Verduras": return name.includes("fruta") || name.includes("verdura") || name.includes("banana") || name.includes("manzana") || name.includes("papa") || name.includes("tomate") || name.includes("cebolla");
            case "Almacén": return name.includes("arroz") || name.includes("fideo") || name.includes("aceite") || name.includes("azúcar") || name.includes("sal") || name.includes("harina");
            case "Panadería": return name.includes("pan") || name.includes("factura") || name.includes("medialuna");
            case "Bebidas": return name.includes("coca") || name.includes("agua") || name.includes("cerveza") || name.includes("jugo") || name.includes("café");
            case "Limpieza": return name.includes("detergente") || name.includes("lavandina") || name.includes("jabón") || name.includes("suavizante");
            case "Hogar": return name.includes("papel") || name.includes("toalla");
            case "Snacks": return name.includes("galleta") || name.includes("papas") || name.includes("chocolate");
            case "Conservas": return name.includes("atún") || name.includes("tomate") || name.includes("arvejas");
            case "Proteínas": return name.includes("huevo") || name.includes("atún");
            default: return true;
          }
        });

    if (filteredOffers.length === 0) {
      return (
        <Text className="text-xs text-muted text-center py-2">
          No hay ofertas en la categoría "{productCategory}"
        </Text>
      );
    }

    return (
      <View>
        <Text className="text-xs font-bold text-foreground mb-2">
          🏷️ Ofertas encontradas ({filteredOffers.length}):
        </Text>
        {filteredOffers.slice(0, 10).map((offer: StoreOfferItem, i: number) => {
          const isAdded = addedProducts.has(offer.product);
          return (
            <TouchableOpacity key={i} onPress={() => onSelectOffer(offer)} className="flex-row items-center py-2 border-b" style={{ borderColor: colors.border }}>
              <View className="flex-1 flex-row items-center">
                <Text className="text-xs text-foreground flex-1" numberOfLines={1}>{offer.product}</Text>
                <Text className="text-xs font-bold text-success ml-2">{offer.price}</Text>
              </View>
              <TouchableOpacity
                onPress={(event) => { event.stopPropagation(); void onAddProduct(offer); }}
                className="ml-2 rounded-lg px-2 py-1"
                style={{
                  backgroundColor: isAdded ? colors.success + '20' : colors.primary + '15',
                  borderWidth: 1,
                  borderColor: isAdded ? colors.success : colors.primary,
                }}
              >
                <Text className="text-[10px] font-bold" style={{ color: isAdded ? colors.success : colors.primary }}>
                  {isAdded ? "✓ Agregado" : "+ Agregar"}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
        {(offers as any).website && (
          <Text className="text-[10px] text-muted mt-2">Fuente: {(offers as any).website}</Text>
        )}
      </View>
    );
  }

  if ((offers as any).website) {
    return (
      <Text className="text-xs text-muted text-center py-2">
        No se encontraron ofertas en su página web. Tocá "Ver en Google Maps" para ver ofertas publicadas por el negocio.
      </Text>
    );
  }

  return (
    <Text className="text-xs text-muted text-center py-2">
      Este comercio no tiene página web. Buscalo en Google Maps para ver sus ofertas publicadas.
    </Text>
  );
}

const styles = StyleSheet.create({
  storeCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
  },
  offerModalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
});
