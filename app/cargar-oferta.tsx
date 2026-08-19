import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { getLocation } from "@/lib/location-service";
import { submitCommunityOffer } from "@/constants/community-offers-store";

const STORE_TYPE_OPTIONS = [
  "Almacén",
  "Comercio",
  "Supermercado",
  "Verdulería",
  "Carnicería",
  "Granja",
  "Fiambrería",
  "Farmacia",
  "Limpieza",
  "Pet Shop",
  "Panadería",
  "Dietética",
  "Kiosco",
  "Pescadería",
];

type LocationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; latitude: number; longitude: number; address: string }
  | { status: "error"; message: string };

export default function CargarOfertaScreen() {
  const colors = useColors();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeType, setStoreType] = useState("Almacén");
  const [location, setLocation] = useState<LocationState>({ status: "idle" });
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  const utils = trpc.useUtils();

  const resolveLocation = async () => {
    setLocation({ status: "loading" });
    const gps = await getLocation();
    if (!gps) {
      setLocation({ status: "error", message: "No pudimos obtener tu ubicación. Activá el GPS e intentá de nuevo." });
      return;
    }
    try {
      const result = await utils.places.reverseGeocodeAddress.fetch({ lat: gps.latitude, lng: gps.longitude });
      setLocation({
        status: "ready",
        latitude: gps.latitude,
        longitude: gps.longitude,
        address: result.address || `${gps.latitude.toFixed(5)}, ${gps.longitude.toFixed(5)}`,
      });
    } catch {
      setLocation({
        status: "ready",
        latitude: gps.latitude,
        longitude: gps.longitude,
        address: `${gps.latitude.toFixed(5)}, ${gps.longitude.toFixed(5)}`,
      });
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setNotice("Necesitamos permiso de cámara para sacar la foto de la oferta.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: true });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      if (location.status === "idle") void resolveLocation();
    }
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setNotice("Necesitamos permiso para acceder a tus fotos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, allowsEditing: true, mediaTypes: ["images"] });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      if (location.status === "idle") void resolveLocation();
    }
  };

  const submit = async () => {
    const priceNumber = Number(price.replace(",", "."));
    if (!photoUri) {
      setNotice("Sacá o elegí una foto de la oferta antes de publicar.");
      return;
    }
    if (!productName.trim() || !Number.isFinite(priceNumber) || priceNumber <= 0) {
      setNotice("Completá el nombre del producto y un precio válido.");
      return;
    }
    if (!storeName.trim()) {
      setNotice("Ingresá el nombre del comercio donde viste la oferta.");
      return;
    }
    if (location.status !== "ready") {
      setNotice("Esperá a que se detecte tu ubicación (o volvé a intentar).");
      return;
    }

    setSubmitting(true);
    try {
      await submitCommunityOffer({
        photoUri,
        productName: productName.trim(),
        priceCents: Math.round(priceNumber * 100),
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        storeNameManual: storeName.trim(),
        storeTypeManual: storeType,
      });
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNotice("¡Oferta publicada! Otros usuarios van a poder confirmarla.");
      setTimeout(() => router.back(), 1200);
    } catch (error) {
      setNotice(`No se pudo publicar: ${error instanceof Error ? error.message : "error desconocido"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer className="px-5">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}>
        <ScrollView keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.backButton, { borderColor: colors.border }, pressed && styles.pressed]}>
              <Text style={[styles.backText, { color: colors.foreground }]}>←</Text>
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>OFERTA COMUNITARIA</Text>
              <Text className="text-2xl font-bold text-foreground">Cargá una oferta con foto</Text>
            </View>
          </View>

          {notice ? (
            <View style={[styles.notice, { backgroundColor: colors.primary + "14", borderColor: colors.primary }]}>
              <Text style={{ color: colors.foreground }}>{notice}</Text>
            </View>
          ) : null}

          <Text style={{ color: colors.foreground, fontWeight: "600", marginBottom: 8 }}>Foto de la oferta</Text>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          ) : (
            <View style={[styles.photoPlaceholder, { borderColor: colors.border }]}>
              <Text style={{ color: colors.muted }}>Sin foto todavía</Text>
            </View>
          )}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 10, marginBottom: 20 }}>
            <Pressable onPress={() => void takePhoto()} style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.primary }, pressed && styles.pressed]}>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>📷 Sacar foto</Text>
            </Pressable>
            <Pressable onPress={() => void pickFromGallery()} style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.border }, pressed && styles.pressed]}>
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>🖼️ Elegir de la galería</Text>
            </Pressable>
          </View>

          <Field label="Producto" value={productName} onChangeText={setProductName} placeholder="Ej.: Leche entera 1 L" colors={colors} />
          <Field label="Precio" value={price} onChangeText={setPrice} placeholder="1500" keyboardType="decimal-pad" colors={colors} />
          <Field label="Nombre del comercio" value={storeName} onChangeText={setStoreName} placeholder="Ej.: Almacén Don José" colors={colors} />

          <Text style={{ color: colors.foreground, fontWeight: "600", marginTop: 4, marginBottom: 6 }}>Tipo de comercio</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {STORE_TYPE_OPTIONS.map((option) => {
              const selected = storeType === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setStoreType(option)}
                  style={({ pressed }) => [
                    { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : "transparent" },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={{ color: selected ? "#fff" : colors.foreground }}>{option}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={{ color: colors.foreground, fontWeight: "600", marginBottom: 6 }}>Ubicación</Text>
          <View style={[styles.locationBox, { borderColor: colors.border }]}>
            {location.status === "idle" ? (
              <Pressable onPress={() => void resolveLocation()}>
                <Text style={{ color: colors.primary, fontWeight: "700" }}>📍 Detectar mi ubicación</Text>
              </Pressable>
            ) : location.status === "loading" ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <ActivityIndicator color={colors.primary} />
                <Text style={{ color: colors.muted }}>Buscando dirección...</Text>
              </View>
            ) : location.status === "error" ? (
              <View>
                <Text style={{ color: colors.error, marginBottom: 6 }}>{location.message}</Text>
                <Pressable onPress={() => void resolveLocation()}>
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>Reintentar</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={{ color: colors.foreground }}>{location.address}</Text>
            )}
          </View>

          <View style={{ marginTop: 24, marginBottom: 40 }}>
            {submitting ? (
              <View style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: 0.7 }]}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : (
              <Pressable onPress={() => void submit()} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
                <Text style={styles.primaryButtonText}>Publicar oferta</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function Field({ label, colors, ...props }: { label: string; colors: ReturnType<typeof useColors>; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: "default" | "decimal-pad" }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={colors.muted}
        style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
        returnKeyType="done"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  backButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  backText: { fontSize: 18 },
  headerCopy: { flex: 1 },
  eyebrow: { color: "#3B82F6", fontWeight: "800", fontSize: 12, letterSpacing: 1 },
  pressed: { opacity: 0.7 },
  notice: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  photoPreview: { width: "100%", height: 220, borderRadius: 12, backgroundColor: "#00000010" },
  photoPlaceholder: { width: "100%", height: 220, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  secondaryButton: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  field: { marginBottom: 14 },
  fieldLabel: { fontWeight: "600", marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  locationBox: { borderWidth: 1, borderRadius: 12, padding: 14 },
  primaryButton: { borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
