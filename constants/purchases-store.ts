import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ShoppingListItem } from "./mock-data";

const PURCHASE_HISTORY_KEY = "purchase_history";

export interface PurchaseHistoryItem {
  productName: string;
  productIcon: string;
  quantity: number;
  /** Precio unitario efectivamente pagado. */
  unitPrice: number;
  /** Precio normal (sin oferta) si se conocía al momento de agregar el producto. */
  normalUnitPrice?: number;
}

export interface Purchase {
  id: string;
  /** Fecha ISO de cuando se finalizó la compra. */
  date: string;
  /** Comercio más frecuente entre los items de esta compra, si se conocía. */
  store?: string;
  items: PurchaseHistoryItem[];
  totalPaid: number;
  /** Ahorro real: suma de (normalUnitPrice - unitPrice) * quantity solo para items con normalUnitPrice conocido. */
  totalSaved: number;
}

export async function getPurchaseHistory(): Promise<Purchase[]> {
  const saved = await AsyncStorage.getItem(PURCHASE_HISTORY_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved) as Purchase[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function savePurchaseHistory(purchases: Purchase[]): Promise<void> {
  await AsyncStorage.setItem(PURCHASE_HISTORY_KEY, JSON.stringify(purchases));
}

/** Archiva los productos tildados de la lista actual como una compra finalizada. */
export async function archivePurchase(checkedItems: ShoppingListItem[]): Promise<Purchase> {
  const items: PurchaseHistoryItem[] = checkedItems.map((item) => ({
    productName: item.product.name,
    productIcon: item.product.icon,
    quantity: item.quantity,
    unitPrice: item.estimatedPrice,
    normalUnitPrice: item.normalPrice,
  }));

  const totalPaid = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const totalSaved = items.reduce((sum, i) => {
    if (i.normalUnitPrice && i.normalUnitPrice > i.unitPrice) {
      return sum + (i.normalUnitPrice - i.unitPrice) * i.quantity;
    }
    return sum;
  }, 0);

  const storeNames = checkedItems.map((i) => i.storeName).filter((s): s is string => !!s);
  const store = storeNames.length > 0
    ? storeNames.sort((a, b) => storeNames.filter((s) => s === b).length - storeNames.filter((s) => s === a).length)[0]
    : undefined;

  const purchase: Purchase = {
    id: `purchase-${Date.now()}`,
    date: new Date().toISOString(),
    store,
    items,
    totalPaid,
    totalSaved,
  };

  const history = await getPurchaseHistory();
  await savePurchaseHistory([purchase, ...history]);
  return purchase;
}
