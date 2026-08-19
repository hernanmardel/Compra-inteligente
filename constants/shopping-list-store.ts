import AsyncStorage from "@react-native-async-storage/async-storage";

import { PRODUCTS, type Product, type ShoppingListItem } from "./mock-data";

const SHOPPING_LIST_KEY = "shopping_list_items";

const DEFAULT_LIST: ShoppingListItem[] = [
  { id: "starter-milk", product: PRODUCTS[0], quantity: 2, checked: false, estimatedPrice: 1780 },
  { id: "starter-bread", product: PRODUCTS[3], quantity: 1, checked: false, estimatedPrice: 990 },
  { id: "starter-eggs", product: PRODUCTS[6], quantity: 1, checked: true, estimatedPrice: 1990 },
];

// Suscriptores que quieren enterarse cuando cambia la lista (ej. el badge del
// tab "Lista" en la barra inferior), sin tener que abrir esa pantalla.
const listeners = new Set<(items: ShoppingListItem[]) => void>();

export function subscribeShoppingList(callback: (items: ShoppingListItem[]) => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notifyListeners(items: ShoppingListItem[]) {
  listeners.forEach((callback) => callback(items));
}

export async function getShoppingListItems(): Promise<ShoppingListItem[]> {
  const saved = await AsyncStorage.getItem(SHOPPING_LIST_KEY);
  if (!saved) return DEFAULT_LIST;

  try {
    const parsed = JSON.parse(saved) as ShoppingListItem[];
    return Array.isArray(parsed) ? parsed : DEFAULT_LIST;
  } catch {
    return DEFAULT_LIST;
  }
}

export async function saveShoppingListItems(items: ShoppingListItem[]): Promise<void> {
  await AsyncStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(items));
  notifyListeners(items);
}

/** Inserta el producto en la lista o aumenta su cantidad si ya estaba pendiente.
 * normalPrice y storeName son opcionales: solo se conocen cuando el producto viene de una oferta real,
 * y son los que permiten calcular ahorro genuino en la pantalla de Ahorros. */
export async function addProductToShoppingList(
  product: Product,
  estimatedPrice: number,
  normalPrice?: number,
  storeName?: string,
): Promise<ShoppingListItem[]> {
  const items = await getShoppingListItems();
  const existingIndex = items.findIndex((item) => item.product.id === product.id && !item.checked);

  const nextItems = existingIndex >= 0
    ? items.map((item, index) => index === existingIndex ? { ...item, quantity: item.quantity + 1, estimatedPrice, normalPrice: normalPrice ?? item.normalPrice, storeName: storeName ?? item.storeName } : item)
    : [
        ...items,
        {
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          product,
          quantity: 1,
          checked: false,
          estimatedPrice,
          normalPrice,
          storeName,
        },
      ];

  await saveShoppingListItems(nextItems);
  return nextItems;
}
