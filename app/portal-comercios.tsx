import { useCallback, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SvgXml } from "react-native-svg";
import QRCode from "qrcode";
  const CATEGORY_OPTIONS = ["Almacén", "Comercio", "Supermercado", "Verdulería", "Carnicería", "Granja", "Fiambreria", "Farmacia", "Limpieza", "Pet Shop", "Panadería", "Dietética", "Kiosco", "Pescadería"];
  const PRODUCT_CATEGORY_OPTIONS = ["Lácteos", "Panadería", "Carnes", "Fiambres y quesos", "Frutas y verduras", "Almacén", "Bebidas", "Limpieza", "Perfumería e higiene", "Congelados", "Snacks y golosinas", "Pastas", "Mascotas", "Otro"];

import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  addMerchantCatalogItem,
  addMerchantOffer,
  claimStoreByCode,
  getMerchantPortalState,
  removeMerchantCatalogItem,
  removeMerchantOffer,
  saveMerchantProfile,
  setMerchantOfferActive,
  type MerchantCatalogItem,
  type MerchantOffer,
  type MerchantPortalState,
} from "@/constants/merchant-portal-store";

type Section = "perfil" | "catalogo" | "ofertas" | "referidos";

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const money = (value: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);

function isProfileComplete(state: MerchantPortalState) {
  const profile = state.profile;
  return Boolean(profile.name && profile.category && profile.address && profile.city && profile.schedule);
}

function isActiveOffer(offer: MerchantOffer) {
  return offer.active && offer.startsAt <= today() && offer.endsAt >= today();
}

export default function MerchantPortalScreen() {
  const colors = useColors();
  const [state, setState] = useState<MerchantPortalState>({
    profile: { name: "", category: "Supermercado", address: "", city: "", phone: "", schedule: "" },
    catalog: [],
    offers: [],
  });
  const [section, setSection] = useState<Section>("perfil");
  const [notice, setNotice] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const [productName, setProductName] = useState("");
  const [productCategory, setProductCategory] = useState("Almacén");
  const [productBarcode, setProductBarcode] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productUnitType, setProductUnitType] = useState("unidad");
  const [productBaseQuantity, setProductBaseQuantity] = useState("100");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [offerOriginal, setOfferOriginal] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [offerStarts, setOfferStarts] = useState(today());
  const [offerEnds, setOfferEnds] = useState(addDays(7));
  const [offerStock, setOfferStock] = useState("Stock limitado");
  const [offerQuantity, setOfferQuantity] = useState("");
  const [claimCode, setClaimCode] = useState("");
  const [claimingCode, setClaimingCode] = useState(false);

  const reload = useCallback(async () => {
    setState(await getMerchantPortalState());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const profileComplete = isProfileComplete(state);
  const hasFreshCatalog = state.catalog.some((item) => Date.now() - new Date(item.updatedAt).getTime() < 7 * 24 * 60 * 60 * 1000);
  const activeOffers = state.offers.filter(isActiveOffer);
  const checklist = [
    { label: "Perfil comercial", ready: profileComplete },
    { label: "Catálogo con precios", ready: state.catalog.length > 0 && hasFreshCatalog },
    { label: "Oferta vigente", ready: activeOffers.length > 0 },
  ];
  const checklistDone = checklist.filter((item) => item.ready).length;
  const selectedProduct = state.catalog.find((product) => product.id === selectedProductId) ?? null;
  const previewOriginal = Number(offerOriginal) || selectedProduct?.regularPrice || 0;
  const previewOffer = Number(offerPrice) || 0;
  const previewQuantityNumber = Number(offerQuantity) || 0;
  const previewOriginalPerUnit = selectedProduct && selectedProduct.unitType !== "unidad" ? previewOriginal / (selectedProduct.baseQuantity || 1) : previewOriginal;
  const previewOfferPerUnit = selectedProduct && selectedProduct.unitType !== "unidad" ? (previewQuantityNumber > 0 ? previewOffer / previewQuantityNumber : 0) : previewOffer;
  const previewDiscount = previewOriginalPerUnit > 0 && previewOfferPerUnit > 0 ? Math.max(0, Math.round((1 - previewOfferPerUnit / previewOriginalPerUnit) * 100)) : 0;

  const profileMessage = useMemo(() => {
    if (!profileComplete) return "Completá el perfil para que los usuarios puedan identificar tu comercio.";
    return "Tu perfil está listo. Mantené horarios y teléfono actualizados.";
  }, [profileComplete]);

  const showNotice = (message: string) => {
    setNotice(message);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const feedback = (message: string) => {
    showNotice(message);
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const saveProfile = async () => {
    if (!state.profile.name.trim() || !state.profile.address.trim() || !state.profile.city.trim() || !state.profile.schedule.trim()) {
      showNotice("Completá nombre, dirección, ciudad y horario antes de guardar. El teléfono es opcional.");
      return;
    }
    try {
      await saveMerchantProfile(state.profile);
      await reload();
      feedback("Perfil guardado. Ya podés cargar productos y ofertas.");
    } catch (error) {
      showNotice(`No se pudo guardar el perfil: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const addProduct = async () => {
    const regularPrice = Number(productPrice.replace(",", "."));
    if (!productName.trim() || !Number.isFinite(regularPrice) || regularPrice <= 0) {
      showNotice("Ingresá un producto y un precio válido para incorporarlo al catálogo.");
      return;
    }
    try {
      await addMerchantCatalogItem({
        name: productName.trim(),
        category: productCategory.trim() || "Otro",
        barcode: productBarcode.trim(),
        unitType: productUnitType,
        baseQuantity: productUnitType === "unidad" ? 1 : (Number(productBaseQuantity) || 1),
        regularPrice,
      });
      setProductName("");
      setProductBarcode("");
      setProductPrice("");
      setProductUnitType("unidad");
      setProductBaseQuantity("100");
      await reload();
      feedback("Producto y precio guardados en el catálogo.");
    } catch (error) {
      showNotice(`No se pudo guardar el producto: ${error instanceof Error ? error.message : "error desconocido"}`);
    }
  };

  const chooseProduct = (product: MerchantCatalogItem) => {
    setSelectedProductId(product.id);
    setOfferOriginal(String(product.regularPrice));
    setOfferQuantity(product.unitType === "unidad" ? "1" : "");
    showNotice(`Preparando una oferta para ${product.name}.`);
  };

  const publishOffer = async () => {
    if (!selectedProduct || previewOriginalPerUnit <= 0 || previewOfferPerUnit <= 0 || previewOfferPerUnit >= previewOriginalPerUnit) {
      showNotice("Elegí un producto e ingresá un precio de oferta menor al precio habitual (comparando por gramo o kilo).");
      return;
    }
    const quantityNumber = Number(offerQuantity);
    if (selectedProduct.unitType !== "unidad" && (!Number.isFinite(quantityNumber) || quantityNumber <= 0)) {
      showNotice("Ingresá la cantidad en " + selectedProduct.unitType + " para esta oferta.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(offerStarts) || !/^\d{4}-\d{2}-\d{2}$/.test(offerEnds) || offerEnds < offerStarts) {
      showNotice("Usá fechas válidas con formato AAAA-MM-DD y una fecha final posterior a la inicial.");
      return;
    }
    try {
      await addMerchantOffer({
        productId: selectedProduct.id,
        originalPrice: previewOriginal,
        offerPrice: previewOffer,
        quantity: selectedProduct.unitType === "unidad" ? 1 : quantityNumber,
        startsAt: offerStarts,
        endsAt: offerEnds,
        stock: offerStock.trim() || "Consultar disponibilidad",
      });
      setOfferPrice("");
      setOfferQuantity("");
      setSelectedProductId(null);
      await reload();
      feedback("Oferta publicada. La vista previa coincide con la tarjeta que verá el usuario.");
    } catch (error) {
      showNotice(`No se pudo publicar la oferta: ${error instanceof Error ? error.message : "error desconocido"}`);
    }
  };

  const openGoogleBusiness = async () => {
    await Linking.openURL("https://business.google.com/");
  };

  const handleClaimCode = async () => {
    if (!claimCode.trim()) return;
    setClaimingCode(true);
    try {
      const next = await claimStoreByCode(claimCode);
      setState(next);
      setClaimCode("");
      Keyboard.dismiss();
      showNotice("¡Listo! Ya podés cargar tu catálogo y tus ofertas en tu comercio.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "No se pudo vincular el código. Revisalo e intentá de nuevo.");
    } finally {
      setClaimingCode(false);
    }
  };

  return (
      <ScreenContainer className="px-5">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}>
        <ScrollView ref={scrollRef} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.backButton, { borderColor: colors.border }, pressed && styles.pressed]}>
            <Text style={[styles.backText, { color: colors.foreground }]}>←</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>PORTAL DE COMERCIOS</Text>
            <Text className="text-2xl font-bold text-foreground">Publicá tus precios</Text>
          </View>
        </View>

        <View style={[styles.checklistCard, { backgroundColor: colors.primary }]}> 
          <View style={styles.checklistTop}>
            <View>
              <Text style={styles.checklistTitle}>Estado de publicación</Text>
              <Text style={styles.checklistDescription}>{checklistDone} de {checklist.length} pasos completados</Text>
            </View>
            <Text style={styles.checklistNumber}>{Math.round((checklistDone / checklist.length) * 100)}%</Text>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${(checklistDone / checklist.length) * 100}%` }]} /></View>
          {checklist.map((item) => (
            <View key={item.label} style={styles.checklistLine}>
              <Text style={styles.checkIcon}>{item.ready ? "✓" : "○"}</Text>
              <Text style={styles.checkText}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.sectionTabs, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {([
            ["perfil", "Perfil"],
            ["catalogo", "Catálogo"],
            ["ofertas", "Ofertas"],
            ["referidos", "Referidos"],
          ] as [Section, string][]).map(([key, label]) => (
            <Pressable key={key} onPress={() => setSection(key)} style={({ pressed }) => [styles.tabButton, section === key && { backgroundColor: colors.primary }, pressed && styles.pressed]}>
              <Text style={[styles.tabText, { color: section === key ? "#fff" : colors.muted }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {notice ? <View style={[styles.notice, { backgroundColor: colors.primary + "14", borderColor: colors.primary + "35" }]}><Text style={[styles.noticeText, { color: colors.foreground }]}>{notice}</Text></View> : null}

        {section === "perfil" && !state.profile.name ? (
          <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 12 }]}>
            <Text className="text-lg font-bold text-foreground">¿Ya cargamos tu comercio?</Text>
            <Text className="text-sm text-muted mt-1">
              Si un representante de CompraInteligente pasó por tu local y te dejó un código, ingresalo acá para
              empezar a cargar tu catálogo y tus ofertas.
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              <TextInput
                value={claimCode}
                onChangeText={setClaimCode}
                placeholder="Ej.: CI-4F7B"
                autoCapitalize="characters"
                placeholderTextColor={colors.muted}
                style={[styles.input, { flex: 1, borderColor: colors.border, color: colors.foreground }]}
              />
              <Pressable
                accessibilityRole="button"
                disabled={claimingCode || !claimCode.trim()}
                onPress={handleClaimCode}
                style={({ pressed }) => [
                  styles.claimButton,
                  { backgroundColor: colors.primary, opacity: claimingCode || !claimCode.trim() ? 0.5 : 1 },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.claimButtonText}>{claimingCode ? "..." : "Vincular"}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {section === "perfil" ? (
          <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text className="text-lg font-bold text-foreground">Datos del comercio</Text>
            <Text className="text-sm text-muted mt-1">{profileMessage}</Text>
            <Field label="Nombre comercial" value={state.profile.name} onChangeText={(value) => setState((current) => ({ ...current, profile: { ...current.profile, name: value } }))} placeholder="Ej.: Mercado del Barrio" colors={colors} />
            <View style={{ marginBottom: 12 }}>
  <Text style={{ color: colors.foreground, fontWeight: "600", marginBottom: 6 }}>Rubro</Text>
  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
    {CATEGORY_OPTIONS.map((option) => {
      const selected = state.profile.category === option;
      return (
        <Pressable
          key={option}
          onPress={() => setState((current) => ({ ...current, profile: { ...current.profile, category: option } }))}
          style={({ pressed }) => [
            {
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: selected ? colors.primary : colors.border,
              backgroundColor: selected ? colors.primary : "transparent",
            },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={{ color: selected ? "#fff" : colors.foreground }}>{option}</Text>
        </Pressable>
      );
    })}
  </View>
</View>
            <Field label="Dirección con numeración" value={state.profile.address} onChangeText={(value) => setState((current) => ({ ...current, profile: { ...current.profile, address: value } }))} placeholder="Av. Colón 1234" colors={colors} />
            <Field label="Ciudad" value={state.profile.city} onChangeText={(value) => setState((current) => ({ ...current, profile: { ...current.profile, city: value } }))} placeholder="Mar del Plata" colors={colors} />
            <Field label="Teléfono" value={state.profile.phone} onChangeText={(value) => setState((current) => ({ ...current, profile: { ...current.profile, phone: value } }))} placeholder="0223 000 0000" keyboardType="phone-pad" colors={colors} />
            <Field label="Horario" value={state.profile.schedule} onChangeText={(value) => setState((current) => ({ ...current, profile: { ...current.profile, schedule: value } }))} placeholder="Lun a sáb 8 a 21 h" colors={colors} />
            <PrimaryButton label="Guardar perfil" onPress={() => void saveProfile()} color={colors.primary} />
            <Pressable onPress={() => void openGoogleBusiness()} style={({ pressed }) => [styles.googleHelp, { borderColor: colors.border }, pressed && styles.pressed]}>
              <Text style={[styles.googleHelpTitle, { color: colors.foreground }]}>Google Maps: iniciar verificación (opcional)</Text>
              <Text style={[styles.googleHelpText, { color: colors.muted }]}>Abrí Perfil de Negocio de Google para reclamar o agregar el local. Google verifica al titular.</Text>
            </Pressable>
          </View>
        ) : null}

        {section === "catalogo" ? (
          <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text className="text-lg font-bold text-foreground">Agregar producto</Text>
            <Text className="text-sm text-muted mt-1">Cargá un producto a la vez. Para catálogos grandes, el siguiente paso será importar un CSV validado.</Text>
            <Field label="Producto" value={productName} onChangeText={setProductName} placeholder="Ej.: Leche entera 1 L" colors={colors} />
            <Text style={{ color: colors.foreground, fontWeight: "600", marginTop: 12, marginBottom: 6 }}>Categoría del producto</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {PRODUCT_CATEGORY_OPTIONS.map((option) => {
                const selected = productCategory === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setProductCategory(option)}
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
            <Field label="Código de barras (opcional)" value={productBarcode} onChangeText={setProductBarcode} placeholder="779..." keyboardType="number-pad" colors={colors} />
            <Text style={{ color: colors.foreground, fontWeight: "600", marginTop: 12, marginBottom: 6 }}>Se vende por</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              {["unidad", "gramos", "kilo"].map((option) => {
                const selected = productUnitType === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setProductUnitType(option)}
                    style={({ pressed }) => [
                      { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : "transparent" },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={{ color: selected ? "#fff" : colors.foreground, textTransform: "capitalize" }}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>
            {productUnitType !== "unidad" ? (
              <Field label={"Ese precio es cada cuántos " + productUnitType} value={productBaseQuantity} onChangeText={setProductBaseQuantity} keyboardType="number-pad" placeholder="100" colors={colors} />
            ) : null}
            <Field label="Precio habitual" value={productPrice} onChangeText={setProductPrice} placeholder="1500" keyboardType="decimal-pad" colors={colors} />
            <PrimaryButton label="Agregar al catálogo" onPress={() => void addProduct()} color={colors.primary} />
            <Text className="text-base font-bold text-foreground mt-6">Productos cargados ({state.catalog.length})</Text>
            {state.catalog.length === 0 ? <EmptyState text="Todavía no cargaste productos. Agregá el primero para crear una oferta." colors={colors} /> : null}
            {state.catalog.map((item) => (
              <View key={item.id} style={[styles.itemCard, { borderColor: colors.border }]}>
                <View style={styles.itemCopy}>
                  <Text className="text-sm font-bold text-foreground">{item.name}</Text>
                  <Text className="text-xs text-muted mt-1">{item.category}{item.barcode ? ` · EAN ${item.barcode}` : ""}</Text>
                  <Text style={[styles.priceText, { color: colors.primary }]}>{money(item.regularPrice)}{item.unitType !== "unidad" ? " cada " + item.baseQuantity + " " + item.unitType : ""}</Text>
                </View>
                <Pressable onPress={() => void removeMerchantCatalogItem(item.id).then(reload)} style={({ pressed }) => [styles.deleteButton, { backgroundColor: colors.error + "14" }, pressed && styles.pressed]}><Text style={{ color: colors.error, fontWeight: "800" }}>×</Text></Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {section === "ofertas" ? (
          <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text className="text-lg font-bold text-foreground">Crear una oferta</Text>
            <Text className="text-sm text-muted mt-1">Elegí un producto y revisá la tarjeta antes de publicarla.</Text>
            {state.catalog.length === 0 ? <EmptyState text="Primero cargá al menos un producto y su precio en Catálogo." colors={colors} /> : null}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productChoices}>
              {state.catalog.map((product) => (
                <Pressable key={product.id} onPress={() => chooseProduct(product)} style={({ pressed }) => [styles.productChoice, { borderColor: selectedProductId === product.id ? colors.primary : colors.border, backgroundColor: selectedProductId === product.id ? colors.primary + "12" : colors.background }, pressed && styles.pressed]}>
                  <Text className="text-sm font-bold text-foreground" numberOfLines={2}>{product.name}</Text>
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700", marginTop: 6 }}>{money(product.regularPrice)}{product.unitType !== "unidad" ? " cada " + product.baseQuantity + " " + product.unitType : ""}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {selectedProduct ? (
              <>
                <Field label="Precio habitual" value={offerOriginal} onChangeText={setOfferOriginal} keyboardType="decimal-pad" placeholder="0" colors={colors} />
                <Field label="Precio de oferta" value={offerPrice} onChangeText={setOfferPrice} keyboardType="decimal-pad" placeholder="0" colors={colors} />
                {selectedProduct.unitType !== "unidad" ? (
                  <Field label={"Cantidad (en " + selectedProduct.unitType + ")"} value={offerQuantity} onChangeText={setOfferQuantity} keyboardType="number-pad" placeholder={selectedProduct.unitType === "kilo" ? "1" : "250"} colors={colors} />
                ) : null}
                <Field label="Inicio (AAAA-MM-DD)" value={offerStarts} onChangeText={setOfferStarts} placeholder="2026-08-13" colors={colors} />
                <Field label="Finalización (AAAA-MM-DD)" value={offerEnds} onChangeText={setOfferEnds} placeholder="2026-08-20" colors={colors} />
                <Field label="Disponibilidad" value={offerStock} onChangeText={setOfferStock} placeholder="Stock limitado" colors={colors} />
                <View style={[styles.preview, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.previewEyebrow, { color: colors.muted }]}>VISTA PREVIA PARA USUARIOS</Text>
                  <Text className="text-base font-bold text-foreground">{selectedProduct.name}{selectedProduct.unitType !== "unidad" && offerQuantity ? " (" + offerQuantity + " " + selectedProduct.unitType + ")" : ""}</Text>
                  <View style={styles.previewPriceRow}><Text style={[styles.previewPrice, { color: colors.primary }]}>{previewOffer > 0 ? money(previewOffer) : "Ingresá el precio"}</Text>{previewOriginal > 0 ? <Text className="text-xs text-muted line-through">{money(previewOriginal)}</Text> : null}</View>
                  <Text style={[styles.previewSave, { color: colors.success }]}>{previewDiscount > 0 ? `Ahorran ${previewDiscount}%` : "Ingresá un precio menor para mostrar el ahorro"}</Text>
                  <Text className="text-xs text-muted mt-2">Válida del {offerStarts} al {offerEnds} · {offerStock}</Text>
                </View>
                <PrimaryButton label="Publicar oferta" onPress={() => void publishOffer()} color={colors.primary} />
              </>
            ) : null}
            <Text className="text-base font-bold text-foreground mt-6">Ofertas cargadas ({state.offers.length})</Text>
            {state.offers.length === 0 ? <EmptyState text="Aún no hay ofertas publicadas." colors={colors} /> : null}
            {state.offers.map((offer) => {
              const product = state.catalog.find((item) => item.id === offer.productId);
              const status = isActiveOffer(offer) ? "Vigente" : offer.active ? "Programada o vencida" : "Pausada";
              return (
                <View key={offer.id} style={[styles.offerItem, { borderColor: colors.border }]}>
                  <View style={styles.itemCopy}>
                    <Text className="text-sm font-bold text-foreground">{product?.name ?? "Producto eliminado"}</Text>
                    <Text style={[styles.priceText, { color: colors.primary }]}>{money(offer.offerPrice)}{offer.quantity && offer.quantity !== 1 ? ` (${offer.quantity})` : ""} <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "400" }}>antes {money(offer.originalPrice)}</Text></Text>
                    <Text className="text-xs text-muted">{status} · hasta {offer.endsAt}</Text>
                  </View>
                  <View style={styles.offerActions}>
                    <Pressable onPress={() => void setMerchantOfferActive(offer.id, !offer.active).then(reload)} style={({ pressed }) => [styles.smallAction, { backgroundColor: colors.primary + "14" }, pressed && styles.pressed]}><Text style={{ color: colors.primary, fontWeight: "700" }}>{offer.active ? "Pausar" : "Activar"}</Text></Pressable>
                    <Pressable onPress={() => void removeMerchantOffer(offer.id).then(reload)} style={({ pressed }) => [styles.smallAction, { backgroundColor: colors.error + "14" }, pressed && styles.pressed]}><Text style={{ color: colors.error, fontWeight: "700" }}>Quitar</Text></Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {section === "referidos" ? (
          <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text className="text-lg font-bold text-foreground">Sumá clientes nuevos</Text>
            {!state.referrals ? (
              <Text className="text-sm text-muted mt-1">
                Esta sección se activa una vez que tu comercio quedó vinculado con un código (pestaña Perfil).
              </Text>
            ) : (
              <>
                <Text className="text-sm text-muted mt-1">
                  Compartí tu código o el QR para que clientes nuevos se sumen a CompraInteligente por vos. Cada
                  10 clientes que sumes, más adelante vas a poder destacar una oferta gratis durante una semana.
                </Text>
                <View style={{ alignItems: "center", marginVertical: 16 }}>
                  <ReferralQrCode code={state.referrals.code} colors={colors} />
                  <Text style={{ fontSize: 22, fontWeight: "800", letterSpacing: 2, color: colors.foreground, marginTop: 12 }}>
                    {state.referrals.code}
                  </Text>
                </View>
                <View style={[styles.preview, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text className="text-base font-bold text-foreground">{state.referrals.total} cliente{state.referrals.total === 1 ? "" : "s"} sumado{state.referrals.total === 1 ? "" : "s"}</Text>
                  <Text className="text-xs text-muted mt-1">
                    Faltan {10 - state.referrals.progressToNext === 10 ? 0 : 10 - state.referrals.progressToNext} para el próximo hito de 10.
                  </Text>
                </View>
                <Text className="text-xs text-muted mt-4">
                  Por ahora el QR queda listo para cuando esté disponible el punto de entrada en la app para el cliente nuevo.
                </Text>
              </>
            )}
          </View>
        ) : null}
      </ScrollView>
</KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function Field({ label, colors, ...props }: { label: string; colors: ReturnType<typeof useColors>; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: "default" | "phone-pad" | "number-pad" | "decimal-pad" }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={colors.muted}
        style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
        blurOnSubmit
      />
    </View>
  );
}

function PrimaryButton({ label, onPress, color }: { label: string; onPress: () => void; color: string }) {
  // onPressIn (no onPress): en Android, si hay un TextInput enfocado, cerrar el
  // teclado reacomoda la pantalla mientras el dedo sigue apoyado, y el sistema
  // cancela el toque como si se hubiera salido del botón. Reaccionar al inicio
  // del toque evita ese problema y no requiere un segundo toque.
  return <Pressable accessibilityRole="button" onPressIn={onPress} style={({ pressed }) => [styles.primaryButton, { backgroundColor: color }, pressed && styles.pressed]}><Text style={styles.primaryButtonText}>{label}</Text></Pressable>;
}

function ReferralQrCode({ code, colors }: { code: string; colors: ReturnType<typeof useColors> }) {
  // Se genera como SVG (texto plano) en vez de PNG/data-URL: el paquete "qrcode"
  // necesita <canvas> para PNG, que no existe en apps nativas de RN. El modo SVG
  // es JS puro y se renderiza con react-native-svg, que ya usa el resto de la app.
  const [svg, setSvg] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      QRCode.toString(code, { type: "svg", margin: 1 })
        .then((markup) => { if (!cancelled) setSvg(markup); })
        .catch(() => { if (!cancelled) setSvg(null); });
      return () => { cancelled = true; };
    }, [code]),
  );

  if (!svg) {
    return (
      <View style={{ width: 200, height: 200, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Generando QR...</Text>
      </View>
    );
  }

  return (
    <View style={{ width: 200, height: 200, borderRadius: 16, padding: 8, backgroundColor: "#fff" }}>
      <SvgXml xml={svg} width="100%" height="100%" />
    </View>
  );
}

function EmptyState({ text, colors }: { text: string; colors: ReturnType<typeof useColors> }) {
  return <View style={[styles.empty, { backgroundColor: colors.background, borderColor: colors.border }]}><Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  content: { paddingTop: 18, paddingBottom: 34 }, headerRow: { flexDirection: "row", alignItems: "center", gap: 12 }, backButton: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" }, backText: { fontSize: 26, lineHeight: 28 }, headerCopy: { flex: 1 }, eyebrow: { fontSize: 10, letterSpacing: 1.1, color: "#0A7EA4", fontWeight: "800", marginBottom: 2 }, checklistCard: { borderRadius: 24, padding: 18, marginTop: 20 }, checklistTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }, checklistTitle: { color: "#fff", fontSize: 18, fontWeight: "800" }, checklistDescription: { color: "#fff", fontSize: 13, marginTop: 4, opacity: 0.88 }, checklistNumber: { color: "#fff", fontSize: 25, fontWeight: "900" }, progressTrack: { height: 7, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.27)", marginTop: 16, overflow: "hidden" }, progressFill: { height: "100%", borderRadius: 999, backgroundColor: "#fff" }, checklistLine: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }, checkIcon: { color: "#fff", fontSize: 15, fontWeight: "800" }, checkText: { color: "#fff", fontSize: 13, fontWeight: "600" }, sectionTabs: { padding: 4, borderWidth: 1, borderRadius: 14, flexDirection: "row", marginTop: 16 }, tabButton: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" }, tabText: { fontSize: 13, fontWeight: "800" }, notice: { borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 14 }, noticeText: { fontSize: 13, lineHeight: 19 }, panel: { borderWidth: 1, borderRadius: 22, padding: 16, marginTop: 14 }, field: { marginTop: 14 }, fieldLabel: { fontSize: 13, fontWeight: "700", marginBottom: 7 }, input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, fontSize: 15 }, primaryButton: { borderRadius: 13, alignItems: "center", paddingVertical: 14, marginTop: 18 }, primaryButtonText: { color: "#fff", fontWeight: "800", fontSize: 15 }, googleHelp: { borderWidth: 1, borderRadius: 14, padding: 13, marginTop: 14 }, googleHelpTitle: { fontSize: 14, fontWeight: "800" }, googleHelpText: { fontSize: 12, lineHeight: 18, marginTop: 4 }, empty: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 14 }, itemCard: { borderTopWidth: 1, paddingVertical: 13, flexDirection: "row", alignItems: "center", marginTop: 8 }, itemCopy: { flex: 1, paddingRight: 10 }, priceText: { fontSize: 15, fontWeight: "800", marginTop: 5 }, deleteButton: { height: 32, width: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" }, productChoices: { gap: 10, paddingTop: 16, paddingBottom: 2 }, productChoice: { width: 142, minHeight: 82, padding: 12, borderRadius: 14, borderWidth: 1, justifyContent: "center" }, preview: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 16 }, previewEyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8, marginBottom: 7 }, previewPriceRow: { flexDirection: "row", alignItems: "baseline", gap: 9, marginTop: 8 }, previewPrice: { fontSize: 23, fontWeight: "900" }, previewSave: { fontSize: 13, fontWeight: "800", marginTop: 5 }, offerItem: { borderTopWidth: 1, paddingVertical: 13, marginTop: 8 }, offerActions: { flexDirection: "row", gap: 8, marginTop: 10 }, smallAction: { paddingVertical: 8, paddingHorizontal: 11, borderRadius: 10 }, pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] }, claimButton: { borderRadius: 12, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" }, claimButtonText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
