import { useCallback, useState } from "react";
import { ScrollView, Text, View, Pressable, ActivityIndicator, Modal, Platform, StyleSheet } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { OFFERS, STORES, formatPrice, calculateSavings, calculateSavingsPercentage, updateDistancesByLocation, type Offer, type ShoppingListItem } from "@/constants/mock-data";
import { useUserLocation } from "@/hooks/use-user-location";
import { LocationPill } from "@/components/location-pill";
import { DataSourceBanner } from "@/components/data-source-banner";
import { useAllNearbyPlaces } from "@/hooks/use-google-places";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { addProductToShoppingList, getShoppingListItems } from "@/constants/shopping-list-store";
import { getPurchaseHistory } from "@/constants/purchases-store";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";

export default function HomeScreen() {
  const colors = useColors();
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [addedOfferIds, setAddedOfferIds] = useState<Set<string>>(new Set());
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [weeklySavings, setWeeklySavings] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      void getShoppingListItems().then((items) => {
        if (active) setShoppingList(items);
      });

      void getPurchaseHistory().then((history) => {
        if (!active) return;
        const now = new Date();
        const day = now.getDay();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
        weekStart.setHours(0, 0, 0, 0);
        const total = history
          .filter((p) => new Date(p.date) >= weekStart)
          .reduce((sum, p) => sum + p.totalSaved, 0);
        setWeeklySavings(total);
      });

      return () => {
        active = false;
      };
    }, []),
  );

  // Reverse geocoding con Google API (solo cuando tenemos ubicación)
  const userLocationState = useUserLocation();
  const { userLocation, currentCity } = userLocationState;

  // Obtener comercios cercanos desde el servidor (Overpass API / OpenStreetMap)
  const { data: nearbyData, isLoading: placesLoading, isFallback: placesFallback, isError: placesError, refetch: refetchPlaces } = useAllNearbyPlaces(
    userLocation?.latitude ?? 0,
    userLocation?.longitude ?? 0,
    5000,
    currentCity || undefined
  );

  // Actualizar distancias y ofertas según ubicación real
  const userLat = userLocation?.latitude ?? 0;
  const userLng = userLocation?.longitude ?? 0;
  const { stores: updatedStores, offers: updatedOffers } = updateDistancesByLocation(userLat, userLng, STORES, OFFERS);

  // Si tenemos datos del servidor (reales o fallback), usar esos; sino usar mock actualizado
  const nearbyPlaces = nearbyData ?? [];
  const topStores = nearbyPlaces.length > 0
    ? [...nearbyPlaces].sort((a, b) => a.distance - b.distance).slice(0, 3)
    : userLocation ? updatedStores.sort((a, b) => a.distance - b.distance).slice(0, 3) : [];

  const topOffers = userLocation ? updatedOffers
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 4) : [];

  const totalSavingsThisWeek = weeklySavings;
  const pendingItems = shoppingList.filter((item) => !item.checked);
  const completedItems = shoppingList.length - pendingItems.length;
  const listProgress = shoppingList.length > 0 ? completedItems / shoppingList.length : 0;
  const selectedOfferStore = selectedOffer
    ? updatedStores.find((store) => store.id === selectedOffer.storeId) ?? STORES.find((store) => store.id === selectedOffer.storeId)
    : null;

  const addSelectedOfferToList = async () => {
    if (!selectedOffer) return;

    await addProductToShoppingList(selectedOffer.product, selectedOffer.offerPrice, selectedOffer.normalPrice, selectedOffer.store);
    setAddedOfferIds((current) => new Set(current).add(selectedOffer.id));
    setSelectedOffer(null);

    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const navigateToSelectedOfferStore = async () => {
    if (!selectedOfferStore) return;

    const destination = `${selectedOfferStore.lat},${selectedOfferStore.lng}`;
    const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    const navigationUrl = Platform.select({
      ios: `http://maps.apple.com/?daddr=${destination}`,
      android: `google.navigation:q=${destination}`,
      default: fallbackUrl,
    }) ?? fallbackUrl;

    try {
      await Linking.openURL(navigationUrl);
    } catch {
      await Linking.openURL(fallbackUrl);
    }
  };

  return (
    <ScreenContainer className="px-5">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Header */}
        <View className="pt-4 pb-2">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-foreground">Hola! 👋</Text>
              <Text className="text-sm text-muted mt-1">Vamos a ahorrar en tus compras de hoy</Text>
            </View>
            <LocationPill location={userLocationState} />
          </View>
        </View>

        {/* Primary starting point */}
        <View className="mt-4" style={[styles.startCard, { backgroundColor: colors.primary }]}>
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-white text-2xl font-bold">¿Qué necesitás hoy?</Text>
              <Text className="text-white text-sm mt-1" style={{ opacity: 0.86 }}>Armá tu lista y encontrá las mejores ofertas cerca tuyo.</Text>
            </View>
            <View style={styles.startCardIcon}>
              <Text style={{ fontSize: 27 }}>🛒</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Armar mi compra"
            onPress={() => router.push("/(tabs)/lista" as never)}
            style={({ pressed }) => [styles.startPrimaryAction, pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }]}
          >
            <Text className="font-bold" style={{ color: colors.primary }}>Armar mi compra</Text>
            <Text style={{ color: colors.primary, fontSize: 18, fontWeight: "700" }}>→</Text>
          </Pressable>
          <View className="flex-row items-center mt-4">
            <Text className="text-xs text-white" style={{ opacity: 0.8 }}>Ahorro de esta semana</Text>
            <Text className="text-xs text-white font-bold ml-2">{formatPrice(totalSavingsThisWeek)}</Text>
          </View>
        </View>

        {/* Shopping-list at a glance */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir mi lista de compras"
          onPress={() => router.push("/(tabs)/lista" as never)}
          style={({ pressed }) => [
            styles.listOverview,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && { transform: [{ scale: 0.98 }], opacity: 0.88 },
          ]}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 pr-3">
              <View className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: colors.primary + "16" }}>
                <Text style={{ fontSize: 21 }}>✓</Text>
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-base font-bold text-foreground">Tu lista</Text>
                <Text className="text-xs text-muted mt-0.5">
                  {shoppingList.length === 0
                    ? "Empezá agregando los productos que necesitás"
                    : `${pendingItems.length} ${pendingItems.length === 1 ? "producto pendiente" : "productos pendientes"}`}
                </Text>
              </View>
            </View>
            <Text style={{ color: colors.primary, fontSize: 19, fontWeight: "700" }}>→</Text>
          </View>
          {shoppingList.length > 0 && (
            <View className="mt-3">
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.progressFill, { backgroundColor: colors.success, width: `${Math.round(listProgress * 100)}%` }]} />
              </View>
              <Text className="text-[10px] text-muted mt-1">{completedItems} de {shoppingList.length} productos comprados</Text>
            </View>
          )}
        </Pressable>

        {/* Two direct shortcuts */}
        <View className="mt-4 flex-row gap-3">
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(tabs)/lista" as never)}
            style={({ pressed }) => [styles.shortcutCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.78 }]}
          >
            <Text style={{ fontSize: 22 }}>＋</Text>
            <Text className="text-sm font-bold text-foreground mt-2">Agregar productos</Text>
            <Text className="text-[11px] text-muted mt-1">A tu lista</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/(tabs)/ofertas" as never)}
            style={({ pressed }) => [styles.shortcutCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.78 }]}
          >
            <Text style={{ fontSize: 22 }}>🏷️</Text>
            <Text className="text-sm font-bold text-foreground mt-2">Buscar ofertas</Text>
            <Text className="text-[11px] text-muted mt-1">Cerca de vos</Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir portal de comercios"
          onPress={() => router.push("/portal-comercios" as never)}
          style={({ pressed }) => [
            styles.businessPortalEntry,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
          ]}
        >
          <View style={styles.businessPortalBadge}><Text style={{ fontSize: 18 }}>🏪</Text></View>
          <View style={{ flex: 1 }}>
            <Text className="text-sm font-bold text-foreground">¿Tenés un comercio?</Text>
            <Text className="text-xs text-muted mt-0.5">Cargá precios y publicá tus ofertas</Text>
          </View>
          <Text style={{ color: colors.primary, fontSize: 18, fontWeight: "800" }}>→</Text>
        </Pressable>

        {/* Section: Ofertas destacadas */}
        <View className="mt-6 flex-row items-center justify-between">
          <Text className="text-lg font-bold text-foreground">Ofertas cerca de ti</Text>
          <Pressable onPress={() => router.push("/(tabs)/ofertas" as never)}>
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>Ver todas</Text>
          </Pressable>
        </View>

        {/* Offers horizontal scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerStyle={{ paddingRight: 20 }}
        >
          {topOffers.map((offer) => {
            const savings = calculateSavings(offer.normalPrice, offer.offerPrice);
            const pct = calculateSavingsPercentage(offer.normalPrice, offer.offerPrice);
            const isAdded = addedOfferIds.has(offer.id);
            return (
              <Pressable
                key={offer.id}
                accessibilityRole="button"
                accessibilityLabel={`Ver oferta de ${offer.product.name} en ${offer.store}`}
                onPress={() => setSelectedOffer(offer)}
                style={({ pressed }) => [
                  styles.offerCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                ]}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text style={{ fontSize: 28 }}>{offer.product.icon}</Text>
                  <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: colors.error + '15' }}>
                    <Text style={{ color: colors.error, fontSize: 11, fontWeight: 'bold' }}>-{pct}%</Text>
                  </View>
                </View>
                <Text className="text-sm font-semibold text-foreground" numberOfLines={2}>{offer.product.name}</Text>
                <Text className="text-xs text-muted mt-1">{offer.store}</Text>
                <View className="flex-row items-baseline gap-2 mt-2">
                  <Text className="text-lg font-bold" style={{ color: colors.primary }}>{formatPrice(offer.offerPrice)}</Text>
                  <Text className="text-xs text-muted line-through">{formatPrice(offer.normalPrice)}</Text>
                </View>
                <View className="mt-2 pt-2 border-t" style={{ borderTopColor: colors.border }}>
                  <Text className="text-xs font-semibold" style={{ color: colors.success }}>
                    Ahorras {formatPrice(savings)}
                  </Text>
                </View>
                <Text className="text-[10px] text-muted mt-1">📍 {offer.distance < 1 ? `${Math.round(offer.distance * 1000)}m` : `${offer.distance.toFixed(1)} km`}</Text>
                <Text className="text-[10px] font-semibold mt-2" style={{ color: isAdded ? colors.success : colors.primary }}>
                  {isAdded ? "✓ Agregada a tu lista" : "Tocá para ver opciones"}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Section: Tips */}
        <View className="mt-6 rounded-2xl p-4" style={{ backgroundColor: colors.surface }}>
          <View className="flex-row items-center gap-2 mb-2">
            <Text style={{ fontSize: 18 }}>💡</Text>
            <Text className="text-sm font-semibold text-foreground">Tip del día</Text>
          </View>
          <Text className="text-sm text-muted leading-relaxed">
            Comprar productos de marca blanca puede ahorrarte hasta 30% sin perder calidad. ¡Pruébalo en tu próxima compra!
          </Text>
        </View>

        {/* Section: Supermercados cercanos */}
        <View className="mt-6 flex-row items-center justify-between">
          <Text className="text-lg font-bold text-foreground">Supermercados cercanos</Text>
          <Pressable onPress={() => router.push("/(tabs)/mapa" as never)}>
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>Ver mapa</Text>
          </Pressable>
        </View>

        {!placesLoading && (
          <DataSourceBanner
            isFallback={placesFallback}
            isError={placesError}
            onRetry={() => void refetchPlaces()}
          />
        )}

        {placesLoading ? (
          <View className="items-center py-6">
            <ActivityIndicator size="small" color={colors.tint} />
            <Text className="text-xs text-muted mt-2">Cargando comercios cerca de ti...</Text>
          </View>
        ) : (
          <View className="mt-3 gap-2">
            {topStores.map((store, i) => {
              const distText = store.distance < 1
                ? `${Math.round(store.distance * 1000)}m`
                : `${store.distance.toFixed(1)} km`;
              return (
                <Pressable
                  key={store.placeId || `store-${i}`}
                  onPress={() => router.push("/(tabs)/mapa" as never)}
                  style={({ pressed }) => [
                    styles.storeRow,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <View className="flex-row items-center justify-between px-4 py-3">
                    <View className="flex-row items-center gap-3">
                      <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: colors.primary + '10' }}>
                        <Text style={{ fontSize: 20 }}>{(store as any).icon || '🛒'}</Text>
                      </View>
                      <View>
                        <Text className="text-sm font-semibold text-foreground">{store.name}</Text>
                        <Text className="text-xs text-muted">{distText} • {(store as any).address || currentCity || 'Tu zona'}</Text>
                      </View>
                    </View>
                    <Text style={{ color: colors.primary, fontSize: 18 }}>→</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={!!selectedOffer}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOffer(null)}
      >
        <View style={styles.offerModalBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar detalle de oferta"
            onPress={() => setSelectedOffer(null)}
            style={StyleSheet.absoluteFill}
          />
          {selectedOffer && (
            <View style={[styles.offerSheet, { backgroundColor: colors.background }]}>
              <View style={styles.offerSheetHandle} />
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-xs font-bold" style={{ color: colors.success }}>OFERTA CERCA DE TI</Text>
                  <Text className="text-xl font-bold text-foreground mt-1" numberOfLines={2}>{selectedOffer.product.name}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                  onPress={() => setSelectedOffer(null)}
                  style={({ pressed }) => [styles.closeButton, { backgroundColor: colors.surface }, pressed && { opacity: 0.65 }]}
                >
                  <Text className="text-base text-foreground">×</Text>
                </Pressable>
              </View>

              <View className="flex-row items-end gap-2 mt-4">
                <Text className="text-3xl font-bold" style={{ color: colors.primary }}>{formatPrice(selectedOffer.offerPrice)}</Text>
                <Text className="text-sm text-muted line-through mb-1">{formatPrice(selectedOffer.normalPrice)}</Text>
                <Text className="text-xs font-bold mb-1" style={{ color: colors.success }}>Ahorrás {formatPrice(calculateSavings(selectedOffer.normalPrice, selectedOffer.offerPrice))}</Text>
              </View>

              <View className="flex-row items-center mt-5 rounded-2xl p-3" style={{ backgroundColor: colors.surface }}>
                <View className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: colors.primary + "18" }}>
                  <Text style={{ fontSize: 21 }}>{selectedOfferStore?.logo ?? "🏪"}</Text>
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-sm font-bold text-foreground" numberOfLines={1}>{selectedOffer.store}</Text>
                  <Text className="text-xs text-muted mt-0.5" numberOfLines={2}>{selectedOfferStore?.address ?? "Dirección del comercio"}</Text>
                  <Text className="text-xs font-semibold mt-1" style={{ color: colors.primary }}>
                    📍 {selectedOffer.distance < 1 ? `${Math.round(selectedOffer.distance * 1000)} m` : `${selectedOffer.distance.toFixed(1)} km`} de distancia
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => void addSelectedOfferToList()}
                style={({ pressed }) => [styles.primaryOfferAction, { backgroundColor: colors.primary }, pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 }]}
              >
                <Text className="text-background font-bold text-base">+ Agregar a mi lista</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={!selectedOfferStore}
                onPress={() => void navigateToSelectedOfferStore()}
                style={({ pressed }) => [
                  styles.secondaryOfferAction,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  !selectedOfferStore && { opacity: 0.45 },
                  pressed && selectedOfferStore && { transform: [{ scale: 0.98 }], opacity: 0.8 },
                ]}
              >
                <Text className="font-bold text-base" style={{ color: colors.primary }}>🧭 Ir al comercio</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  startCard: {
    borderRadius: 24,
    padding: 20,
  },
  startCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  startPrimaryAction: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginTop: 18,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  listOverview: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  shortcutCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 116,
    padding: 14,
  },
  offerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    width: 160,
    marginRight: 12,
  },
  storeRow: {
    borderRadius: 14,
    borderWidth: 1,
  },
  offerModalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.48)",
  },
  offerSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  offerSheetHandle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#9CA3AF",
    marginBottom: 18,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryOfferAction: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    borderRadius: 16,
    marginTop: 20,
  },
  secondaryOfferAction: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
  },
});
