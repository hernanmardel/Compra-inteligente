import { useState, useEffect, useCallback, useRef } from "react";
import {
  Text,
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Linking,
  Platform,
  StyleSheet,
  Modal,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useUserLocation } from "@/hooks/use-user-location";
import { LocationPill } from "@/components/location-pill";
import { DataSourceBanner } from "@/components/data-source-banner";
import { useAllNearbyPlaces, useStoreOffers, type StorePlace } from "@/hooks/use-google-places";
import * as Haptics from "expo-haptics";
import { trpc } from "@/lib/trpc";
import {
  PRODUCTS,
  formatPrice,
  type Product,
} from "@/constants/mock-data";
import { addCustomProduct, getAllProducts } from "@/constants/product-store";
import { inferProductCategory } from "@/constants/product-category-inference";
import { addProductToShoppingList } from "@/constants/shopping-list-store";
import { fetchNearbyCommunityOffers, voteCommunityOffer, type CommunityOffer } from "@/constants/community-offers-store";

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

const LOCATION_PRIMER_KEY = "location_primer_seen_v1";

export default function OfertasScreen() {
  const colors = useColors();
  // Primero se explica por qué hace falta la ubicación (ver cartel más abajo) y
  // recién cuando el usuario lo confirma se pide el permiso real del sistema.
  // null = todavía no se leyó AsyncStorage, false = hay que mostrar el cartel.
  const [locationPrimerSeen, setLocationPrimerSeen] = useState<boolean | null>(null);
  useEffect(() => {
    void AsyncStorage.getItem(LOCATION_PRIMER_KEY).then((value) => {
      setLocationPrimerSeen(value === "1");
    });
  }, []);
  const userLocationState = useUserLocation({ autoRequest: locationPrimerSeen === true });
  const { userLocation, currentCity } = userLocationState;
  const [selectedRadius, setSelectedRadius] = useState(5000);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>("Todos");
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [addedProducts, setAddedProducts] = useState<Set<string>>(new Set());
  const [selectedOffer, setSelectedOffer] = useState<SelectedOffer | null>(null);
  const [communityOffers, setCommunityOffers] = useState<CommunityOffer[]>([]);
  const [communityOffersLoading, setCommunityOffersLoading] = useState(false);
  const [votingOfferId, setVotingOfferId] = useState<string | null>(null);
  const [communityNotice, setCommunityNotice] = useState("");
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const activeFilterCount = (selectedType !== null ? 1 : 0) + (selectedProductCategory !== "Todos" ? 1 : 0) + (selectedRadius !== 5000 ? 1 : 0);

  const acceptLocationPrimer = useCallback(() => {
    void AsyncStorage.setItem(LOCATION_PRIMER_KEY, "1");
    setLocationPrimerSeen(true);
  }, []);

  const { data: places, isLoading, isFallback: placesFallback, isError: placesError, refetch } = useAllNearbyPlaces(
    userLocation?.latitude ?? 0,
    userLocation?.longitude ?? 0,
    selectedRadius,
    currentCity || undefined
  );

  const loadCommunityOffers = useCallback(async () => {
    if (!userLocation) return;
    setCommunityOffersLoading(true);
    try {
      const offers = await fetchNearbyCommunityOffers(userLocation.latitude, userLocation.longitude, selectedRadius);
      setCommunityOffers(offers);
    } catch {
      // Si falla, simplemente no se muestra esta sección - no es crítico para el resto de la pantalla
    } finally {
      setCommunityOffersLoading(false);
    }
  }, [userLocation, selectedRadius]);

  const onRefresh = useCallback(async () => {
    await userLocationState.retry();
    await refetch();
    await loadCommunityOffers();
  }, [refetch, userLocationState, loadCommunityOffers]);

  useEffect(() => {
    void loadCommunityOffers();
  }, [loadCommunityOffers]);

  const handleVote = async (offerId: string, vote: boolean) => {
    setVotingOfferId(offerId);
    setCommunityNotice("");
    try {
      await voteCommunityOffer(offerId, vote);
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCommunityNotice(vote ? "¡Gracias por confirmar!" : "Gracias, lo marcamos para revisión.");
      await loadCommunityOffers();
    } catch (error) {
      setCommunityNotice(error instanceof Error ? error.message : "No se pudo registrar el voto.");
    } finally {
      setVotingOfferId(null);
    }
  };

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
    const { category, icon, unit } = inferProductCategory(productName);

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
            <LocationPill location={userLocationState} />
          </View>
          <Text className="text-sm text-muted mt-1">
            {locationPrimerSeen === false
              ? "Descuentos reales de comercios cerca tuyo"
              : isLoading ? "Buscando comercios..." : `${sortedPlaces.length} comercios con ofertas`}
          </Text>
          {locationPrimerSeen === true && !isLoading && (
            <DataSourceBanner isFallback={placesFallback} isError={placesError} onRetry={() => void onRefresh()} />
          )}
          <TouchableOpacity
            onPress={() => router.push("/cargar-oferta")}
            className="flex-row items-center justify-center gap-2 rounded-2xl mt-3 py-3"
            style={{ backgroundColor: colors.tint }}
          >
            <Text style={{ color: "#fff", fontWeight: "800" }}>📷 Cargar una oferta con foto</Text>
          </TouchableOpacity>
        </View>

        {locationPrimerSeen === false ? (
          <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 18, padding: 18, marginTop: 8 }}>
            <Text style={{ fontSize: 30 }}>📍</Text>
            <Text className="text-lg font-bold text-foreground mt-2">Activá tu ubicación</Text>
            <Text className="text-sm text-muted mt-1" style={{ lineHeight: 19 }}>
              La necesitamos para mostrarte ofertas reales de comercios cerca tuyo, no genéricas. Nunca la
              compartimos ni la usamos para otra cosa.
            </Text>
            <TouchableOpacity
              onPress={acceptLocationPrimer}
              className="rounded-2xl mt-4 py-3 items-center"
              style={{ backgroundColor: colors.primary }}
            >
              <Text style={{ color: "#fff", fontWeight: "800" }}>Ver ofertas cerca mío</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Toggle de filtros: colapsados por defecto para mostrar ofertas antes que decisiones */}
            <TouchableOpacity
              onPress={() => setFiltersExpanded((v) => !v)}
              className="flex-row items-center justify-between mt-3 px-1"
            >
              <Text className="text-sm font-bold text-foreground">
                Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </Text>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>{filtersExpanded ? "Ocultar ▲" : "Mostrar ▼"}</Text>
            </TouchableOpacity>

            {filtersExpanded && (
              <>
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
              </>
            )}

        {/* Ofertas comunitarias (cargadas por usuarios con foto) */}
        {communityOffers.length > 0 && (
          <View className="mt-5">
            <Text className="text-base font-bold text-foreground mb-2">Ofertas de la comunidad</Text>
            {communityNotice ? (
              <View style={{ borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primary + "14", borderRadius: 12, padding: 10, marginBottom: 10 }}>
                <Text style={{ color: colors.foreground }}>{communityNotice}</Text>
              </View>
            ) : null}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20, gap: 12 }}>
              {communityOffers.map((offer) => (
                <View key={offer.id} style={{ width: 220, borderWidth: 1, borderColor: colors.border, borderRadius: 16, overflow: "hidden", backgroundColor: colors.surface }}>
                  <Image source={{ uri: offer.photoUrl }} style={{ width: "100%", height: 130 }} />
                  <View style={{ padding: 10 }}>
                    <Text className="text-sm font-bold text-foreground" numberOfLines={2}>{offer.productName}</Text>
                    <Text style={{ color: colors.tint, fontWeight: "800", fontSize: 16, marginTop: 4 }}>{formatPrice(offer.priceCents / 100)}</Text>
                    <Text className="text-xs text-muted mt-1" numberOfLines={1}>
                      {offer.storeNameManual}{offer.storeTypeManual ? ` · ${offer.storeTypeManual}` : ""}
                    </Text>
                    <Text className="text-xs text-muted mt-1">📍 {(offer.distanceMeters / 1000).toFixed(1)} km</Text>
                    <View
                      style={{
                        alignSelf: "flex-start",
                        marginTop: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 10,
                        backgroundColor:
                          offer.status === "vigente" ? colors.success + "22" : offer.status === "en_revision" ? "#F59E0B22" : colors.muted + "22",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: offer.status === "vigente" ? colors.success : offer.status === "en_revision" ? "#F59E0B" : colors.muted,
                        }}
                      >
                        {offer.status === "vigente" ? "✓ Confirmada" : offer.status === "en_revision" ? "En revisión" : "Sin confirmar"}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                      <TouchableOpacity
                        disabled={votingOfferId === offer.id}
                        onPress={() => void handleVote(offer.id, true)}
                        style={{ flex: 1, borderWidth: 1, borderColor: colors.success, borderRadius: 10, paddingVertical: 8, alignItems: "center", opacity: votingOfferId === offer.id ? 0.5 : 1 }}
                      >
                        <Text style={{ color: colors.success, fontWeight: "700", fontSize: 12 }}>👍 Sigue</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        disabled={votingOfferId === offer.id}
                        onPress={() => void handleVote(offer.id, false)}
                        style={{ flex: 1, borderWidth: 1, borderColor: colors.error, borderRadius: 10, paddingVertical: 8, alignItems: "center", opacity: votingOfferId === offer.id ? 0.5 : 1 }}
                      >
                        <Text style={{ color: colors.error, fontWeight: "700", fontSize: 12 }}>👎 Ya no</Text>
                      </TouchableOpacity>
                    </View>
                    <AddToListButton
                      isAdded={addedProducts.has(offer.productName)}
                      onPress={() => void handleAddOfferProduct({ product: offer.productName, price: formatPrice(offer.priceCents / 100) })}
                      colors={colors}
                    />
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

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
          </>
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

              <AddToListButton
                isAdded={addedProducts.has(selectedOffer.offer.product)}
                onPress={() => handleAddOfferProduct(selectedOffer.offer)}
                colors={colors}
              />
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

/** Botón de "Agregar a la lista" con feedback inmediato: al tocar, un "+1" sube
 * y se desvanece sobre el propio botón (en vez de animar algo volando hasta la
 * pestaña Lista, que cruza pantallas y es más frágil). El número real ya lo
 * actualiza el badge rojo del carrito abajo, en el mismo instante. */
function AddToListButton({
  isAdded,
  onPress,
  colors,
  compact,
}: {
  isAdded: boolean;
  onPress: () => void;
  colors: any;
  compact?: boolean;
}) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const [showFloat, setShowFloat] = useState(false);

  const handlePress = (event?: any) => {
    event?.stopPropagation?.();
    if (isAdded) return;
    onPress();
    setShowFloat(true);
    floatAnim.setValue(0);
    Animated.timing(floatAnim, { toValue: 1, duration: 650, useNativeDriver: true }).start(() => {
      setShowFloat(false);
    });
  };

  return (
    <View style={{ position: "relative" }}>
      {showFloat && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            alignSelf: "center",
            top: 0,
            opacity: floatAnim.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }),
            transform: [{ translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -26] }) }],
          }}
        >
          <Text style={{ color: colors.success, fontWeight: "800", fontSize: 13 }}>+1 🛒</Text>
        </Animated.View>
      )}
      <TouchableOpacity
        onPress={handlePress}
        disabled={isAdded}
        className={compact ? "ml-2 rounded-lg px-2 py-1" : "items-center justify-center py-4 rounded-2xl mt-5"}
        style={
          compact
            ? { backgroundColor: isAdded ? colors.success + "20" : colors.primary + "15", borderWidth: 1, borderColor: isAdded ? colors.success : colors.primary }
            : { backgroundColor: isAdded ? colors.success + "20" : colors.primary }
        }
      >
        <Text
          className={compact ? "text-[10px] font-bold" : "font-bold text-base"}
          style={{ color: compact ? (isAdded ? colors.success : colors.primary) : isAdded ? colors.success : "#fff" }}
        >
          {isAdded ? "✓ Agregado" : compact ? "+ Agregar" : "+ Agregar a mi lista"}
        </Text>
      </TouchableOpacity>
    </View>
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
              <AddToListButton
                isAdded={isAdded}
                onPress={() => onAddProduct(offer)}
                colors={colors}
                compact
              />
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
