import { Text, View, Pressable, ActivityIndicator, Linking, Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { locationErrorMessage, type UseUserLocationResult } from "@/hooks/use-user-location";
import * as Haptics from "expo-haptics";

interface LocationPillProps {
  location: UseUserLocationResult;
}

/** Pill compacto de ubicación reutilizado en Inicio, Ofertas y Mapa. */
export function LocationPill({ location }: LocationPillProps) {
  const colors = useColors();
  const { status, currentCity, failureReason, retry } = location;

  const handlePress = async () => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (failureReason === "permission-blocked") {
      await Linking.openSettings();
      return;
    }
    await retry();
  };

  if (status === "idle") {
    return null;
  }

  if (status === "loading") {
    return (
      <View
        className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5 bg-surface"
        style={{ borderWidth: 1, borderColor: colors.border }}
      >
        <ActivityIndicator size="small" color={colors.tint} />
        <Text className="text-[10px] text-muted">Ubicando...</Text>
      </View>
    );
  }

  if (status === "located") {
    return (
      <View className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5" style={{ backgroundColor: colors.success + "20" }}>
        <Text style={{ fontSize: 12 }}>📍</Text>
        <Text className="text-[10px] font-semibold" style={{ color: colors.success }} numberOfLines={1}>
          {currentCity ?? "Cerca tuyo"}
        </Text>
      </View>
    );
  }

  const { label } = locationErrorMessage(failureReason);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => void handlePress()}
      className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
      style={{ backgroundColor: colors.warning + "20" }}
    >
      <Text style={{ fontSize: 12 }}>📍</Text>
      <Text className="text-[10px] font-semibold" style={{ color: colors.warning }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
