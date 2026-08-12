import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
  StyleSheet,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getLocation, startWatchingLocation, subscribeLocation, type UserLocation } from "@/lib/location-service";
import { useAllNearbyPlaces, type StorePlace } from "@/hooks/use-google-places";
import * as Haptics from "expo-haptics";
import { trpc } from "@/lib/trpc";

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

const TYPE_COLORS: Record<string, string> = {
  supermercado: "#16A34A",
  mayorista: "#F59E0B",
  comercio: "#3B82F6",
  almacen: "#EF4444",
};

export default function MapaScreen() {
  const colors = useColors();
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState(false);
  const [selectedRadius, setSelectedRadius] = useState(5000);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [currentCity, setCurrentCity] = useState<string | null>(null);

  // Detectar ciudad usando el API del servidor
  const reverseGeocodeQuery = trpc.places.reverseGeocode.useQuery(
    { lat: userLocation?.latitude ?? 0, lng: userLocation?.longitude ?? 0 },
    { enabled: !!userLocation && !currentCity }
  );

  useEffect(() => {
    if (reverseGeocodeQuery.data?.city) {
      setCurrentCity(reverseGeocodeQuery.data.city);
    }
  }, [reverseGeocodeQuery.data]);

  // Get location once on mount
  useEffect(() => {
    let sub: (() => void) | undefined;
    let watch: { remove: () => void } | null = null;
    let mounted = true;

    (async () => {
      // Get location immediately with timeout
      const loc = await getLocation();
      if (!mounted) return;
      
      if (loc) {
        setUserLocation(loc);
        setLocationError(false);
        setLocationLoading(false);
      } else {
        setLocationLoading(false);
        setLocationError(true);
      }

      // Subscribe for future updates
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
    // Try to get location again
    const loc = await getLocation();
    if (loc) {
      setUserLocation(loc);
      setLocationError(false);
    }
    setLocationError(!loc);
    setLocationLoading(false);
    await refetch();
  }, [refetch]);

  const filteredPlaces = selectedType
    ? (places ?? []).filter((p: StorePlace) => p.storeType === selectedType)
    : (places ?? []);
  const sortedPlaces = [...(filteredPlaces ?? [])].sort((a, b) => a.distance - b.distance);

  const selectedStore = places?.find((p: StorePlace) => p.placeId === selectedStoreId) || null;

  const openGoogleMaps = (place: StorePlace) => {
    // Open in Google Maps app or web
    const lat = place.lat;
    const lng = place.lng;
    const label = encodeURIComponent(place.name);
    
    if (Platform.OS === "web") {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
    } else {
      // Try to open Google Maps app
      const scheme = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
      Linking.canOpenURL(scheme)
        .then((supported) => {
          if (supported) {
            Linking.openURL(scheme);
          } else {
            // Fallback to web URL
            Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
          }
        })
        .catch(() => {
          Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
        });
    }
  };

  const openGoogleMapsSearch = () => {
    // Open Google Maps showing all nearby supermarkets
    if (userLocation) {
      Linking.openURL(`https://www.google.com/maps/search/supermercado+cerca+de+mí/@${userLocation.latitude},${userLocation.longitude},15z`);
    } else {
      Linking.openURL(`https://www.google.com/maps/search/supermercado`);
    }
  };

  const handleStorePress = useCallback((placeId: string) => {
    setSelectedStoreId(placeId);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  return (
    <ScreenContainer edges={["top", "left", "right"]} className="flex-col">
      {/* Top bar */}
      <View className="px-5 pt-4 pb-2 bg-background" style={{ zIndex: 10 }}>
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-foreground">Comercios</Text>
          {locationLoading ? (
            <View className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5 bg-surface" style={{ borderWidth: 1, borderColor: colors.border }}>
              <ActivityIndicator size="small" color={colors.tint} />
              <Text className="text-xs text-muted">GPS...</Text>
            </View>
          ) : userLocation ? (
            <View className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5" style={{ backgroundColor: colors.success + '20' }}>
              <Text style={{ fontSize: 12 }}>📍</Text>
              <Text className="text-xs font-semibold" style={{ color: colors.success }}>
                {currentCity || `${userLocation.latitude.toFixed(3)}, ${userLocation.longitude.toFixed(3)}`}
              </Text>
            </View>
          ) : (
            <TouchableOpacity onPress={onRefresh} className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5" style={{ backgroundColor: colors.warning + '20' }}>
              <Text style={{ fontSize: 12 }}>⚠️</Text>
              <Text className="text-xs font-medium" style={{ color: colors.warning }}>{locationError ? "Activar GPS" : "Reintentar GPS"}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Open Google Maps button */}
        <TouchableOpacity
          onPress={openGoogleMapsSearch}
          className="mt-3 flex-row items-center justify-center gap-2 rounded-xl py-3"
          style={{ backgroundColor: '#4285F4' }}
        >
          <Text style={{ fontSize: 16 }}>🗺️</Text>
          <Text className="text-sm font-bold text-white">Ver en Google Maps</Text>
        </TouchableOpacity>

        {/* Radio filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
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
      </View>

      {/* Legend */}
      <View className="mx-5 flex-row gap-3 flex-wrap mt-2">
        <View className="flex-row items-center gap-1"><View className="w-3 h-3 rounded-full" style={{ backgroundColor: TYPE_COLORS.supermercado }} /><Text className="text-[10px] text-muted">Supermercados</Text></View>
        <View className="flex-row items-center gap-1"><View className="w-3 h-3 rounded-full" style={{ backgroundColor: TYPE_COLORS.mayorista }} /><Text className="text-[10px] text-muted">Mayoristas</Text></View>
        <View className="flex-row items-center gap-1"><View className="w-3 h-3 rounded-full" style={{ backgroundColor: TYPE_COLORS.comercio }} /><Text className="text-[10px] text-muted">Comercios</Text></View>
        <View className="flex-row items-center gap-1"><View className="w-3 h-3 rounded-full" style={{ backgroundColor: TYPE_COLORS.almacen }} /><Text className="text-[10px] text-muted">Almacenes</Text></View>
      </View>

      {/* Stores list */}
      <ScrollView
        className="flex-1 px-5 mt-2"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.tint} />}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {locationLoading || isLoading ? (
          <View className="items-center py-12">
            <ActivityIndicator size="large" color={colors.tint} />
            <Text className="mt-4 text-muted">Buscando comercios cerca de ti...</Text>
          </View>
        ) : sortedPlaces.length === 0 ? (
          <View className="items-center py-12">
            <Text style={{ fontSize: 40 }}>📍</Text>
            <Text className="text-sm font-semibold text-foreground mt-3">No hay comercios en este radio</Text>
            <Text className="text-xs text-muted mt-1">Amplá el área de búsqueda o tocá "Ver en Google Maps"</Text>
          </View>
        ) : (
          <View>
            <Text className="text-base font-bold text-foreground mb-3">
              Comercios cercanos ({sortedPlaces.length})
            </Text>
            {sortedPlaces.map((place) => {
              const typeColor = TYPE_COLORS[place.storeType] || "#666";
              const isSelected = selectedStoreId === place.placeId;
              return (
                <TouchableOpacity
                  key={place.placeId}
                  onPress={() => {
                    handleStorePress(isSelected ? "" : place.placeId);
                    if (isSelected) setSelectedStoreId(null);
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
                  <View className="flex-row items-center p-3">
                    <View className="w-12 h-12 rounded-2xl items-center justify-center mr-3" style={{ backgroundColor: typeColor + '10' }}>
                      <Text style={{ fontSize: 24 }}>{place.icon}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>{place.name}</Text>
                      <Text className="text-xs text-muted">{place.address}</Text>
                      <View className="flex-row items-center gap-3 mt-1">
                        <Text className="text-xs text-muted">📍 {place.distance < 1 ? `${Math.round(place.distance * 1000)}m` : `${place.distance.toFixed(1)} km`}</Text>
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
                      onPress={(e) => { e.stopPropagation(); openGoogleMaps(place); }}
                      className="rounded-xl px-3 py-2 ml-2"
                      style={{ backgroundColor: typeColor }}
                    >
                      <Text className="text-white text-xs font-bold">Ir</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  storeCard: {
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
});
