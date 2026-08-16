import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const GOOGLE_PLAY_URL =
  "https://play.google.com/store/apps/details?id=com.app.compra.inteligente";

const benefits = [
  {
    icon: "list-alt" as const,
    title: "Tu compra, en orden",
    description: "Armá tu lista por categorías y marcá lo que ya llevaste.",
  },
  {
    icon: "local-offer" as const,
    title: "Ofertas cerca tuyo",
    description: "Encontrá productos y comercios según tu ubicación.",
  },
  {
    icon: "savings" as const,
    title: "Cada compra cuenta",
    description: "Detectá alternativas para cuidar mejor tu presupuesto.",
  },
];

const steps = [
  "Descargá CompraInteligente desde Google Play.",
  "Agregá lo que necesitás para tu casa.",
  "Revisá ofertas y elegí dónde te conviene comprar.",
];

export default function LandingScreen() {
  const openGooglePlay = async () => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      await Linking.openURL(GOOGLE_PLAY_URL);
    } catch {
      Alert.alert(
        "Google Play",
        "La página de descarga estará disponible cuando la app sea publicada en Google Play.",
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Volver a la aplicación"
              accessibilityRole="button"
              onPress={() => router.replace("/")}
              style={({ pressed }) => [styles.brand, pressed && styles.pressed]}
            >
              <View style={styles.brandMark}>
                <MaterialIcons color="#FFFFFF" name="shopping-cart" size={18} />
              </View>
              <Text style={styles.brandText}>CompraInteligente</Text>
            </Pressable>
            <View style={styles.freeChip}>
              <Text style={styles.freeChipText}>Gratis, para siempre</Text>
            </View>
          </View>

          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>COMPRAS MÁS CLARAS</Text>
            <Text style={styles.title}>Comprá lo que necesitás, sin perder de vista tu bolsillo.</Text>
            <Text style={styles.subtitle}>
              La app que reúne tu lista, ofertas cercanas y comercios para decidir tu compra con más tranquilidad.
            </Text>
          </View>

          <Pressable
            accessibilityLabel="Descargar CompraInteligente desde Google Play"
            accessibilityRole="link"
            onPress={openGooglePlay}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}
          >
            <MaterialIcons color="#FFFFFF" name="play-arrow" size={23} />
            <Text style={styles.primaryButtonText}>Probar gratis en Google Play</Text>
          </Pressable>
          <Text style={styles.microcopy}>Sin tarjeta. Sin costo ahora ni después.</Text>

          <View style={[styles.heroImageFrame, styles.heroImageFallback]}>
            <View style={styles.heroImageShade}>
              <View style={styles.imageBadge}>
                <MaterialIcons color="#FFFFFF" name="verified" size={17} />
                <Text style={styles.imageBadgeText}>Tu compra, a un toque</Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeading}>
            <Text style={styles.sectionKicker}>HECHA PARA EL DÍA A DÍA</Text>
            <Text style={styles.sectionTitle}>Menos vueltas antes de salir a comprar.</Text>
          </View>

          <View style={styles.benefitList}>
            {benefits.map((benefit) => (
              <View key={benefit.title} style={styles.benefitCard}>
                <View style={styles.benefitIcon}>
                  <MaterialIcons color="#0A9543" name={benefit.icon} size={23} />
                </View>
                <View style={styles.benefitTextWrap}>
                  <Text style={styles.benefitTitle}>{benefit.title}</Text>
                  <Text style={styles.benefitDescription}>{benefit.description}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.stepsSection}>
            <Text style={styles.sectionKicker}>EMPEZÁ HOY</Text>
            <Text style={styles.sectionTitle}>Tu primera compra se organiza en minutos.</Text>
            {steps.map((step, index) => (
              <View key={step} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>0{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          <View style={styles.ctaCard}>
            <MaterialIcons color="#D9F9E5" name="shopping-basket" size={31} />
            <Text style={styles.ctaTitle}>Organizá tu compra sin pagar nada, nunca.</Text>
            <Text style={styles.ctaDescription}>
              Bajá la app, armá tu lista y conocé las ofertas disponibles cerca tuyo.
            </Text>
            <Pressable
              accessibilityLabel="Descargar sin costo en Google Play"
              accessibilityRole="link"
              onPress={openGooglePlay}
              style={({ pressed }) => [styles.inverseButton, pressed && styles.inversePressed]}
            >
              <Text style={styles.inverseButtonText}>Descargar sin costo</Text>
              <MaterialIcons color="#087C39" name="arrow-forward" size={19} />
            </Pressable>
          </View>

          <View style={styles.merchantCard}>
            <View style={styles.merchantBadge}>
              <MaterialIcons color="#0A9543" name="storefront" size={20} />
            </View>
            <Text style={styles.merchantTitle}>¿Tenés un comercio?</Text>
            <Text style={styles.merchantDescription}>
              Cargá tu local y tus ofertas gratis, y aparecé ante gente de tu zona que está
              buscando precios en este momento. Sumarte no cuesta nada — más adelante vas a
              poder pagar para destacar una oferta puntual si querés, pero nunca por estar.
            </Text>
            <Pressable
              accessibilityLabel="Ir al portal de comercios"
              accessibilityRole="link"
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/portal-comercios" as never);
              }}
              style={({ pressed }) => [styles.merchantButton, pressed && styles.merchantButtonPressed]}
            >
              <Text style={styles.merchantButtonText}>Cargar mi comercio</Text>
              <MaterialIcons color="#087C39" name="arrow-forward" size={18} />
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerTitle}>CompraInteligente</Text>
            <Text style={styles.footerText}>Organizá tu compra. Elegí con información.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FAFBFC",
  },
  scrollContent: {
    alignItems: "center",
    backgroundColor: "#FAFBFC",
  },
  page: {
    width: "100%",
    maxWidth: 720,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 42,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  brand: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
  },
  brandMark: {
    alignItems: "center",
    backgroundColor: "#0A9543",
    borderRadius: 11,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  brandText: {
    color: "#1A1D1F",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  freeChip: {
    backgroundColor: "#E5F7EB",
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  freeChipText: {
    color: "#087C39",
    fontSize: 12,
    fontWeight: "800",
  },
  heroCopy: {
    marginTop: 48,
  },
  eyebrow: {
    color: "#0A9543",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  title: {
    color: "#15211A",
    fontSize: 37,
    fontWeight: "800",
    letterSpacing: -1.2,
    lineHeight: 42,
    marginTop: 12,
  },
  subtitle: {
    color: "#5D6861",
    fontSize: 17,
    lineHeight: 25,
    marginTop: 16,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#0A9543",
    borderRadius: 16,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    marginTop: 27,
    minHeight: 56,
    paddingHorizontal: 20,
  },
  primaryPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  microcopy: {
    color: "#7B857F",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
    textAlign: "center",
  },
  heroImageFrame: {
    height: 270,
    marginTop: 30,
    overflow: "hidden",
    borderRadius: 24,
  },
  heroImageFallback: {
    // Reemplaza la imagen remota rota (apuntaba a almacenamiento interno de Manus,
    // inaccesible fuera de ese entorno) por un fondo propio, sin depender de nada externo.
    backgroundColor: "#0A9543",
  },
  heroImageShade: {
    backgroundColor: "rgba(6, 63, 29, 0.18)",
    flex: 1,
    justifyContent: "flex-end",
    padding: 18,
  },
  imageBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(8, 74, 33, 0.88)",
    borderRadius: 100,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  imageBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  sectionHeading: {
    marginTop: 52,
  },
  sectionKicker: {
    color: "#0A9543",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  sectionTitle: {
    color: "#1A1D1F",
    fontSize: 27,
    fontWeight: "800",
    letterSpacing: -0.7,
    lineHeight: 33,
    marginTop: 8,
  },
  benefitList: {
    gap: 12,
    marginTop: 22,
  },
  benefitCard: {
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderColor: "#E7ECE8",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 17,
  },
  benefitIcon: {
    alignItems: "center",
    backgroundColor: "#E8F8EE",
    borderRadius: 13,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  benefitTextWrap: {
    flex: 1,
    paddingTop: 1,
  },
  benefitTitle: {
    color: "#1A1D1F",
    fontSize: 16,
    fontWeight: "800",
  },
  benefitDescription: {
    color: "#69736D",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  stepsSection: {
    marginTop: 54,
  },
  stepRow: {
    alignItems: "center",
    borderBottomColor: "#E5EAE6",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 14,
    paddingVertical: 16,
  },
  stepNumber: {
    alignItems: "center",
    backgroundColor: "#15211A",
    borderRadius: 100,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  stepNumberText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  stepText: {
    color: "#344039",
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
  },
  ctaCard: {
    alignItems: "flex-start",
    backgroundColor: "#087C39",
    borderRadius: 24,
    marginTop: 52,
    padding: 25,
  },
  ctaTitle: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "800",
    letterSpacing: -0.6,
    lineHeight: 33,
    marginTop: 13,
  },
  ctaDescription: {
    color: "#DCF7E5",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 9,
  },
  inverseButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 22,
    minHeight: 51,
    paddingHorizontal: 18,
    width: "100%",
  },
  inversePressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  inverseButtonText: {
    color: "#087C39",
    fontSize: 15,
    fontWeight: "800",
  },
  merchantCard: {
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderColor: "#D7E4DC",
    borderRadius: 24,
    borderWidth: 1.5,
    marginTop: 22,
    padding: 25,
  },
  merchantBadge: {
    alignItems: "center",
    backgroundColor: "#E8F7EE",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  merchantTitle: {
    color: "#1A1D1F",
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginTop: 14,
  },
  merchantDescription: {
    color: "#5B6469",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 9,
  },
  merchantButton: {
    alignItems: "center",
    backgroundColor: "#E8F7EE",
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 51,
    paddingHorizontal: 18,
    width: "100%",
  },
  merchantButtonPressed: {
    opacity: 0.85,
  },
  merchantButtonText: {
    color: "#087C39",
    fontSize: 15,
    fontWeight: "800",
  },
  footer: {
    alignItems: "center",
    marginTop: 38,
  },
  footerTitle: {
    color: "#29322D",
    fontSize: 14,
    fontWeight: "800",
  },
  footerText: {
    color: "#7A847E",
    fontSize: 13,
    marginTop: 6,
  },
  pressed: {
    opacity: 0.7,
  },
});

