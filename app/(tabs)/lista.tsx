import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Text,
  View,
  TextInput,
  Pressable,
  FlatList,
  ScrollView,
  StyleSheet,
  Modal,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  PRODUCTS,
  formatPrice,
  type ShoppingListItem,
  type Product,
} from "@/constants/mock-data";
import {
  getAllProducts,
  addCustomProduct,
  updateCustomProduct,
  deleteCustomProduct,
  generateProductId,
} from "@/constants/product-store";
import { getShoppingListItems, saveShoppingListItems } from "@/constants/shopping-list-store";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "@react-navigation/native";

let counter = 0;
const genId = () => `item-${++counter}`;

// Categorized product groups with emoji category icons
const QUICK_CATEGORIES = [
  { label: "Lácteos", icon: "🥛", products: PRODUCTS.filter((p) => p.category === "Lácteos") },
  { label: "Pan", icon: "🍞", products: PRODUCTS.filter((p) => p.category === "Panadería") },
  { label: "Frutas", icon: "🍎", products: PRODUCTS.filter((p) => p.category === "Frutas y Verduras") },
  { label: "Carnes", icon: "🍗", products: PRODUCTS.filter((p) => p.category === "Carnes") },
  { label: "Almacén", icon: "🍚", products: PRODUCTS.filter((p) => p.category === "Almacén") },
  { label: "Bebidas", icon: "☕", products: PRODUCTS.filter((p) => p.category === "Bebidas") },
  { label: "Limpieza", icon: "🧹", products: PRODUCTS.filter((p) => p.category === "Limpieza") },
  { label: "Hogar", icon: "🧻", products: PRODUCTS.filter((p) => p.category === "Hogar") },
  { label: "Snacks", icon: "🍪", products: PRODUCTS.filter((p) => p.category === "Snacks") },
  { label: "Conservas", icon: "🐟", products: PRODUCTS.filter((p) => p.category === "Conservas") },
  { label: "Proteínas", icon: "🥩", products: PRODUCTS.filter((p) => p.category === "Proteínas") },
];

const ALL_CATEGORIES = [
  "Frutas y Verduras", "Lácteos", "Carnes", "Almacén", "Panadería",
  "Bebidas", "Limpieza", "Hogar", "Snacks", "Conservas", "Proteínas",
  "Frescos", "Higiene personal", "Mascotas", "Otro",
];

const ICON_OPTIONS = [
  "🛒", "🥛", "🍞", "🥚", "🍚", "🍝", "🫒", "🍅", "🍌", "🍎",
  "🍗", "🥩", "🥔", "🧅", "🧀", "☕", "🥄", "🧂", "🧴", "🧻",
  "🥕", "🥬", "🐟", "🍪", "🧃", "🍺", "🥤", "🧹", "🐾",
  "🥦", "🫑", "🍋", "🧄", "🍫", "🧇", "🥣", "🍿",
];

export default function ListaScreen() {
  const colors = useColors();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [allProducts, setAllProducts] = useState<Product[]>(PRODUCTS);
  const inputRef = useRef<TextInput>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState(ALL_CATEGORIES[0]);
  const [formUnit, setFormUnit] = useState("un");
  const [formIcon, setFormIcon] = useState("🛒");
  const [formPrice, setFormPrice] = useState("");

  const loadAllProducts = async () => {
    const products = await getAllProducts();
    setAllProducts(products);
  };

  const loadShoppingList = useCallback(async () => {
    const savedItems = await getShoppingListItems();
    setItems(savedItems);
  }, []);

  useEffect(() => {
    void loadAllProducts();
    void loadShoppingList();
  }, [loadShoppingList]);

  useFocusEffect(
    useCallback(() => {
      void loadShoppingList();
    }, [loadShoppingList]),
  );

  const commitItems = (nextItems: ShoppingListItem[]) => {
    setItems(nextItems);
    void saveShoppingListItems(nextItems);
  };

  // Filtered suggestions
  const suggestions = useMemo(() => {
    if (searchText.trim().length === 0) return [];
    return allProducts
      .filter((p) => p.name.toLowerCase().includes(searchText.toLowerCase()))
      .slice(0, 8);
  }, [searchText, allProducts]);

  const totalEstimated = items.reduce((sum, i) => sum + i.estimatedPrice * i.quantity, 0);
  const checkedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const addItem = (product: Product, price?: number) => {
    // Check if already in list
    const exists = items.find((i) => i.product.id === product.id && !i.checked);
    if (exists) {
      // Increment quantity
      const nextItems = items.map((item) => item.id === exists.id ? { ...item, quantity: item.quantity + 1 } : item);
      commitItems(nextItems);
      setSearchText("");
      setShowAdd(false);
      return;
    }
    const newItem: ShoppingListItem = {
      id: genId(),
      product,
      quantity: 1,
      checked: false,
      estimatedPrice: price ?? Math.floor(Math.random() * 3000) + 500,
    };
    commitItems([...items, newItem]);
    setSearchText("");
    setShowAdd(false);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleCreateProduct = async () => {
    if (!formName.trim()) return;
    const newProduct: Product = {
      id: generateProductId(),
      name: formName.trim(),
      category: formCategory,
      unit: formUnit,
      icon: formIcon,
    };
    await addCustomProduct(newProduct);
    setAllProducts([...allProducts, newProduct]);
    addItem(newProduct, formPrice ? parseInt(formPrice) : undefined);
    setShowCreateModal(false);
    setFormName("");
    setFormPrice("");
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editProduct || !formName.trim()) return;
    const updated: Product = {
      ...editProduct,
      name: formName.trim(),
      category: formCategory,
      unit: formUnit,
      icon: formIcon,
    };
    await updateCustomProduct(updated);
    setAllProducts(allProducts.map((p) => (p.id === updated.id ? updated : p)));
    commitItems(items.map((i) =>
      i.product.id === updated.id ? { ...i, product: updated } : i
    ));
    setShowEditModal(false);
    setEditProduct(null);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    await deleteCustomProduct(product.id);
    setAllProducts(allProducts.filter((p) => p.id !== product.id));
    commitItems(items.filter((i) => i.product.id !== product.id));
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const openEditFor = (product: Product, price: number) => {
    setEditProduct({ ...product });
    setFormName(product.name);
    setFormCategory(product.category);
    setFormUnit(product.unit);
    setFormIcon(product.icon);
    setFormPrice(price.toString());
    setShowEditModal(true);
  };

  const toggleCheck = (id: string) => {
    commitItems(items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    commitItems(
      items.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
      )
    );
  };

  const removeItem = (id: string) => {
    commitItems(items.filter((i) => i.id !== id));
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const renderItem = ({ item }: { item: ShoppingListItem }) => {
    const isCustom = !item.product.id.startsWith("p");
    return (
      <View
        className="flex-row items-center px-4 py-3.5 rounded-2xl mb-2.5"
        style={{
          backgroundColor: colors.surface,
          borderWidth: 1.5,
          borderColor: item.checked ? colors.success + '40' : colors.border,
          opacity: item.checked ? 0.55 : 1,
          transform: [{ scale: item.checked ? 0.98 : 1 }],
        }}
      >
        {/* Checkbox */}
        <Pressable onPress={() => toggleCheck(item.id)} style={{ padding: 4 }}>
          <View
            className="w-7 h-7 rounded-full items-center justify-center"
            style={{
              backgroundColor: item.checked ? colors.success : "transparent",
              borderWidth: 2.5,
              borderColor: item.checked ? colors.success : colors.border,
            }}
          >
            {item.checked && <Text style={{ color: "white", fontSize: 15, fontWeight: "bold", marginTop: -1 }}>✓</Text>}
          </View>
        </Pressable>

        {/* Icon + Name */}
        <Pressable onPress={() => openEditFor(item.product, item.estimatedPrice)} style={{ marginLeft: 10, flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Text style={{ fontSize: 26 }}>{item.product.icon}</Text>
          <View className="flex-1 ml-3">
            <Text
              className="text-base font-semibold text-foreground"
              style={{ textDecorationLine: item.checked ? "line-through" : "none" }}
              numberOfLines={1}
            >
              {item.product.name}
            </Text>
            <Text className="text-xs" style={{ color: colors.primary, fontWeight: '600' }}>
              {formatPrice(item.estimatedPrice * item.quantity)}
              <Text className="text-muted" style={{ fontWeight: '400' }}> ({formatPrice(item.estimatedPrice)} x{item.quantity})</Text>
            </Text>
          </View>
          {isCustom && (
            <View className="rounded-full px-2 py-0.5 mr-2" style={{ backgroundColor: colors.primary + '15' }}>
              <Text style={{ fontSize: 9, color: colors.primary, fontWeight: '600' }}>CUSTOM</Text>
            </View>
          )}
        </Pressable>

        {/* Quantity */}
        <View className="flex-row items-center gap-1.5 mr-2">
          <Pressable
            onPress={() => updateQuantity(item.id, -1)}
            style={({ pressed }) => [
              styles.qtyBtn,
              { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text className="text-lg font-bold" style={{ color: colors.foreground, marginBottom: -2 }}>−</Text>
          </Pressable>
          <Text className="text-base font-bold text-foreground w-7 text-center">{item.quantity}</Text>
          <Pressable
            onPress={() => updateQuantity(item.id, 1)}
            style={({ pressed }) => [
              styles.qtyBtn,
              { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text className="text-lg font-bold" style={{ color: colors.foreground, marginBottom: -2 }}>+</Text>
          </Pressable>
        </View>

        {/* Delete */}
        <Pressable onPress={() => removeItem(item.id)} style={{ padding: 8 }}>
          <Text style={{ fontSize: 18, color: colors.error, fontWeight: '600' }}>✕</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <ScreenContainer className="px-5">
      {/* Header with progress */}
      <View className="pt-4 pb-3">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-foreground">Mi Lista</Text>
            <Text className="text-sm mt-0.5" style={{ color: progressPercent === 100 ? colors.success : colors.muted }}>
              {progressPercent === 100
                ? "¡Todo listo! ¡Felices compras! 🎉"
                : `${checkedCount} de ${totalCount} comprado${totalCount !== 1 ? 's' : ''}`}
            </Text>
          </View>
          <Pressable
            onPress={() => setShowManageModal(true)}
            style={({ pressed }) => [
              styles.manageBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={{ fontSize: 16, color: colors.primary }}>⚙️</Text>
          </Pressable>
        </View>

        {/* Progress bar */}
        {totalCount > 0 && (
          <View className="mt-3 h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: colors.border }}>
            <View
              className="h-full rounded-full"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: progressPercent === 100 ? colors.success : colors.primary,
              }}
            />
          </View>
        )}
      </View>

      {/* BIG ADD BUTTON - always visible and prominent */}
      <Pressable
        onPress={() => {
          setShowAdd(!showAdd);
          if (!showAdd) {
            setTimeout(() => inputRef.current?.focus(), 150);
          }
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }}
        style={({ pressed }) => [
          styles.bigAddBtn,
          {
            backgroundColor: showAdd ? colors.surface : colors.primary,
            borderColor: showAdd ? colors.border : colors.primary,
            borderWidth: 1.5,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <View className="flex-row items-center justify-center gap-3">
          <Text style={{ fontSize: 24, color: showAdd ? colors.primary : 'white', fontWeight: 'bold' }}>
            {showAdd ? '×' : '+'}
          </Text>
          <Text className="text-base font-bold" style={{ color: showAdd ? colors.primary : 'white' }}>
            {showAdd ? 'Cerrar buscador' : 'Agregar producto'}
          </Text>
        </View>
      </Pressable>

      {/* Search + Suggestions (shown when add is active) */}
      {showAdd && (
        <View className="mt-3">
          <View
            className="flex-row items-center rounded-2xl px-4 py-3.5"
            style={{ backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary }}
          >
            <Text style={{ fontSize: 20, marginRight: 10 }}>🔍</Text>
            <TextInput
              ref={inputRef}
              className="flex-1 text-base text-foreground font-medium"
              placeholder="¿Qué necesitás?"
              placeholderTextColor={colors.muted}
              value={searchText}
              onChangeText={(text) => setSearchText(text)}
              onFocus={() => true}
              returnKeyType="search"
              onSubmitEditing={() => {
                if (suggestions.length > 0) {
                  addItem(suggestions[0]);
                } else if (searchText.trim().length > 0) {
                  setFormName(searchText.trim());
                  setFormCategory(ALL_CATEGORIES[0]);
                  setFormUnit("un");
                  setFormIcon("🛒");
                  setFormPrice("");
                  setShowCreateModal(true);
                  setSearchText("");
                  setShowAdd(false);
                }
              }}
              clearButtonMode="while-editing"
            />
          </View>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <View
              className="mt-2 rounded-2xl overflow-hidden"
              style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
            >
              {suggestions.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => addItem(s)}
                  style={({ pressed }) => [
                    styles.suggestionItem,
                    { borderBottomColor: colors.border },
                    pressed && { backgroundColor: colors.primary + '08' },
                  ]}
                >
                  <Text style={{ fontSize: 24, marginRight: 12 }}>{s.icon}</Text>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-foreground">{s.name}</Text>
                    <Text className="text-xs text-muted">{s.category} • {s.unit}</Text>
                  </View>
                  <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: colors.primary }}>
                    <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold', marginTop: -1 }}>+</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {/* No match - create new */}
          {suggestions.length === 0 && searchText.trim().length > 2 && (
            <Pressable
              onPress={() => {
                setFormName(searchText.trim());
                setFormCategory(ALL_CATEGORIES[0]);
                setFormUnit("un");
                setFormIcon("🛒");
                setFormPrice("");
                setShowCreateModal(true);
                setSearchText("");
                setShowAdd(false);
              }}
              className="mt-2 rounded-2xl py-4 items-center"
              style={{ backgroundColor: colors.primary + '10', borderWidth: 1.5, borderColor: colors.primary }}
            >
              <Text style={{ color: colors.primary, fontSize: 15, fontWeight: 'bold' }}>
                + Crear &#39;{searchText.trim()}&#39; como producto nuevo
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Quick categories row - shown when add is active */}
      {showAdd && !searchText.trim() && (
        <View className="mt-3">
          <Text className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Agregar por categoría</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
            <View className="flex-row gap-2 pr-4">
              {QUICK_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.label}
                  onPress={() => {
                    if (expandedCategory === cat.label) {
                      setExpandedCategory(null);
                    } else {
                      setExpandedCategory(cat.label);
                    }
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.quickCat,
                    {
                      backgroundColor: expandedCategory === cat.label ? colors.primary : colors.surface,
                      borderColor: expandedCategory === cat.label ? colors.primary : colors.border,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={{ fontSize: 20 }}>{cat.icon}</Text>
                  <Text className="text-xs font-semibold mt-1" style={{ color: expandedCategory === cat.label ? 'white' : colors.foreground }}>{cat.label}</Text>
                  <Text className="text-xs" style={{ color: expandedCategory === cat.label ? 'white' : colors.muted }}>{cat.products.length}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Expanded products list for selected category */}
          {expandedCategory && (
            <View
              className="rounded-2xl overflow-hidden mt-2"
              style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, maxHeight: 220 }}
            >
              <View className="px-4 py-2.5 border-b flex-row items-center justify-between" style={{ borderColor: colors.border }}>
                <Text className="text-sm font-semibold text-foreground">{expandedCategory}</Text>
                <Pressable onPress={() => setExpandedCategory(null)}>
                  <Text className="text-sm text-muted">✕</Text>
                </Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 180 }}>
                <View className="px-3 py-1">
                  {QUICK_CATEGORIES.find(c => c.label === expandedCategory)?.products.map((product) => {
                    const alreadyInList = items.some(i => i.product.id === product.id && !i.checked);
                    return (
                      <Pressable
                        key={product.id}
                        onPress={() => addItem(product)}
                        style={({ pressed }) => [
                          { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
                          { backgroundColor: alreadyInList ? colors.success + '15' : 'transparent' },
                          { borderBottomWidth: 0.5, borderBottomColor: colors.border + '40' },
                          pressed && { opacity: 0.6 },
                        ]}
                      >
                        <Text style={{ fontSize: 18, marginRight: 10 }}>{product.icon}</Text>
                        <Text className="text-sm font-medium text-foreground flex-1">{product.name}</Text>
                        {alreadyInList ? (
                          <View className="w-5 h-5 rounded-full items-center justify-center" style={{ backgroundColor: colors.success }}>
                            <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                          </View>
                        ) : (
                          <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: colors.primary }}>
                            <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold', marginTop: -1 }}>+</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* List */}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <Text style={{ fontSize: 56 }}>📝</Text>
            <Text className="text-base font-semibold text-foreground mt-4">Tu lista está vacía</Text>
            <Text className="text-sm text-muted mt-2 text-center">
              Tocá el botón verde para{"\n"}agregar tu primer producto
            </Text>
          </View>
        }
      />

      {/* Bottom bar with total */}
      <View
        className="absolute bottom-0 left-0 right-0 px-5 pt-3 pb-6"
        style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}
      >
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-xs text-muted">Total estimado</Text>
            <Text className="text-2xl font-bold" style={{ color: colors.primary }}>
              {formatPrice(totalEstimated)}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-xs text-muted">{totalCount} productos</Text>
            <Text className="text-xs font-semibold" style={{ color: colors.success }}>
              {checkedCount} ya comprados
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.push("/(tabs)/ofertas" as never)}
          style={({ pressed }: { pressed: boolean }) => [
            styles.findOffersBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text className="text-white font-semibold text-base">Ver ofertas cercanas →</Text>
        </Pressable>
      </View>

      {/* CREATE MODAL */}
      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet">
        <ScreenContainer className="px-5">
          <View className="flex-row items-center justify-between py-3 border-b" style={{ borderColor: colors.border }}>
            <Pressable onPress={() => setShowCreateModal(false)}>
              <Text style={{ color: colors.muted, fontSize: 16 }}>Cancelar</Text>
            </Pressable>
            <Text className="text-lg font-bold text-foreground">Nuevo producto</Text>
            <Pressable
              onPress={handleCreateProduct}
              style={({ pressed }) => [
                styles.saveBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text className="text-white text-sm font-semibold">Guardar</Text>
            </Pressable>
          </View>
          <ProductFormModal
            colors={colors}
            formName={formName}
            setFormName={setFormName}
            formCategory={formCategory}
            setFormCategory={setFormCategory}
            formUnit={formUnit}
            setFormUnit={setFormUnit}
            formIcon={formIcon}
            setFormIcon={setFormIcon}
            formPrice={formPrice}
            setFormPrice={setFormPrice}
          />
        </ScreenContainer>
      </Modal>

      {/* EDIT MODAL */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <ScreenContainer className="px-5">
          <View className="flex-row items-center justify-between py-3 border-b" style={{ borderColor: colors.border }}>
            <Pressable onPress={() => setShowEditModal(false)}>
              <Text style={{ color: colors.muted, fontSize: 16 }}>Cancelar</Text>
            </Pressable>
            <Text className="text-lg font-bold text-foreground">Editar producto</Text>
            <Pressable
              onPress={handleUpdateProduct}
              style={({ pressed }) => [
                styles.saveBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text className="text-white text-sm font-semibold">Guardar</Text>
            </Pressable>
          </View>
          <ProductFormModal
            colors={colors}
            formName={formName}
            setFormName={setFormName}
            formCategory={formCategory}
            setFormCategory={setFormCategory}
            formUnit={formUnit}
            setFormUnit={setFormUnit}
            formIcon={formIcon}
            setFormIcon={setFormIcon}
            formPrice={formPrice}
            setFormPrice={setFormPrice}
          />
          {editProduct && !editProduct.id.startsWith("p") && (
            <View className="px-5 mt-4">
              <Pressable
                onPress={() => { handleDeleteProduct(editProduct); setShowEditModal(false); }}
                className="rounded-xl py-3 items-center"
                style={{ backgroundColor: colors.error + '10', borderWidth: 1, borderColor: colors.error }}
              >
                <Text style={{ color: colors.error, fontSize: 14, fontWeight: '600' }}>Eliminar producto</Text>
              </Pressable>
            </View>
          )}
        </ScreenContainer>
      </Modal>

      {/* MANAGE MODAL */}
      <Modal visible={showManageModal} animationType="slide" presentationStyle="pageSheet">
        <ScreenContainer className="px-5">
          <View className="flex-row items-center justify-between py-3 border-b" style={{ borderColor: colors.border }}>
            <Text className="text-lg font-bold text-foreground">Mis productos</Text>
            <Pressable onPress={() => setShowManageModal(false)}>
              <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>Cerrar</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => {
              setShowManageModal(false);
              setFormName("");
              setFormCategory(ALL_CATEGORIES[0]);
              setFormUnit("un");
              setFormIcon("🛒");
              setFormPrice("");
              setShowCreateModal(true);
            }}
            className="mt-3 rounded-xl py-3.5 items-center flex-row justify-center gap-2"
            style={({ pressed }) => [{ backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={{ color: "white", fontSize: 22 }}>+</Text>
            <Text className="text-white font-bold text-sm">Crear producto nuevo</Text>
          </Pressable>

          <FlatList
            data={allProducts}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setFormName(item.name);
                  setFormCategory(item.category);
                  setFormUnit(item.unit);
                  setFormIcon(item.icon);
                  setFormPrice("");
                  setEditProduct(item);
                  setShowManageModal(false);
                  setShowEditModal(true);
                }}
                style={({ pressed }) => [
                  styles.manageItem,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View className="flex-row items-center p-3">
                  <Text style={{ fontSize: 24, marginRight: 10 }}>{item.icon}</Text>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-foreground">{item.name}</Text>
                    <Text className="text-xs text-muted">{item.category} • {item.unit}</Text>
                  </View>
                  <Text style={{ color: colors.primary, fontSize: 20 }}>→</Text>
                </View>
              </Pressable>
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          />
        </ScreenContainer>
      </Modal>
    </ScreenContainer>
  );
}

// Shared Product Form Component
function ProductFormModal({
  colors,
  formName, setFormName,
  formCategory, setFormCategory,
  formUnit, setFormUnit,
  formIcon, setFormIcon,
  formPrice, setFormPrice,
}: {
  colors: any;
  formName: string;
  setFormName: (v: string) => void;
  formCategory: string;
  setFormCategory: (v: string) => void;
  formUnit: string;
  setFormUnit: (v: string) => void;
  formIcon: string;
  setFormIcon: (v: string) => void;
  formPrice: string;
  setFormPrice: (v: string) => void;
}) {
  return null;
}

function _ProductFormModal_OLD({
  colors,
  formName, setFormName,
  formCategory, setFormCategory,
  formUnit, setFormUnit,
  formIcon, setFormIcon,
  formPrice, setFormPrice,
}: {

  colors: ReturnType<typeof useColors>;
  formName: string;
  setFormName: (v: string) => void;
  formCategory: string;
  setFormCategory: (v: string) => void;
  formUnit: string;
  setFormUnit: (v: string) => void;
  formIcon: string;
  setFormIcon: (v: string) => void;
  formPrice: string;
  setFormPrice: (v: string) => void;
}) {
  return (
    <ScrollView className="px-5 py-4" style={{ maxHeight: "75%" }}>
      <Text className="text-sm font-semibold text-foreground mb-1">Nombre del producto *</Text>
      <TextInput
        className="rounded-xl px-4 py-3.5 text-base text-foreground mb-4"
        style={{ backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border }}
        placeholder="Ej: Leche descremada"
        placeholderTextColor={colors.muted}
        value={formName}
        onChangeText={setFormName}
        autoFocus
      />

      <Text className="text-sm font-semibold text-foreground mb-1">Categoría</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
        <View className="flex-row gap-2 pr-4">
          {ALL_CATEGORIES.map((cat) => {
            const active = formCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setFormCategory(cat)}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text className="text-xs font-semibold" style={{ color: active ? "white" : colors.foreground }}>{cat}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Text className="text-sm font-semibold text-foreground mb-1">Unidad</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
        <View className="flex-row gap-2 pr-4">
          {["un", "kg", "lt", "g", "ml", "doc", "paq", "lata", "bot"].map((u) => {
            const active = formUnit === u;
            return (
              <Pressable
                key={u}
                onPress={() => setFormUnit(u)}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text className="text-xs font-semibold" style={{ color: active ? "white" : colors.foreground }}>{u}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Text className="text-sm font-semibold text-foreground mb-1">Ícono</Text>
      <View className="flex-row flex-wrap gap-2 mb-4">
        {ICON_OPTIONS.map((ic) => {
          const active = formIcon === ic;
          return (
            <Pressable
              key={ic}
              onPress={() => setFormIcon(ic)}
              style={[
                styles.iconChip,
                { backgroundColor: active ? colors.primary + '20' : colors.surface, borderColor: active ? colors.primary : colors.border },
              ]}
            >
              <Text style={{ fontSize: 22 }}>{ic}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="text-sm font-semibold text-foreground mb-1">Precio estimado (opcional)</Text>
      <View className="flex-row items-center rounded-xl px-4 py-3.5 mb-4" style={{ backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border }}>
        <Text className="text-base text-muted mr-2 font-semibold">$</Text>
        <TextInput
          className="flex-1 text-base text-foreground font-semibold"
          placeholder="0"
          placeholderTextColor={colors.muted}
          value={formPrice}
          onChangeText={setFormPrice}
          keyboardType="numeric"
          returnKeyType="done"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bigAddBtn: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  quickCat: {
    width: 72,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  manageBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  findOffersBtn: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  iconChip: {
    width: 46,
    height: 46,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  manageItem: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
