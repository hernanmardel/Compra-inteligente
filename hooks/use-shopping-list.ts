import { useState, useCallback } from "react";
import {
  PRODUCTS,
  type ShoppingListItem,
  type Product,
} from "@/constants/mock-data";

let counter = 0;
const genId = () => `item-${++counter}`;

// Product prices map (since Product doesn't have a price field)
const PRODUCT_PRICES: Record<string, number> = {
  p1: 1780, p2: 2500, p3: 3800, p4: 1500, p5: 1800, p6: 2200, p7: 1990,
  p8: 890, p9: 1200, p10: 3500, p11: 4200, p12: 750, p13: 600, p14: 2800,
  p15: 1500, p16: 3200, p17: 950, p18: 450, p19: 1800, p20: 2400,
  p21: 3600, p22: 1100, p23: 2900, p24: 1400, p25: 2100,
};

// Global list state - shared across all screens
let globalListItems: ShoppingListItem[] = [
  { id: genId(), product: PRODUCTS[0], quantity: 2, checked: false, estimatedPrice: 3560 },
  { id: genId(), product: PRODUCTS[3], quantity: 1, checked: false, estimatedPrice: 1500 },
  { id: genId(), product: PRODUCTS[6], quantity: 1, checked: true, estimatedPrice: 1990 },
];

const listeners = new Set<(items: ShoppingListItem[]) => void>();

export function useShoppingList() {
  const [listItems, setListItems] = useState<ShoppingListItem[]>(globalListItems);

  const notify = useCallback(() => {
    listeners.forEach((l) => l(globalListItems));
  }, []);

  const addItem = useCallback((product: Product, price?: number) => {
    const productPrice = price ?? PRODUCT_PRICES[product.id] ?? 0;
    const exists = globalListItems.find(
      (i) => i.product.id === product.id && !i.checked
    );
    if (exists) {
      exists.quantity += 1;
      exists.estimatedPrice = exists.quantity * productPrice;
    } else {
      globalListItems.push({
        id: genId(),
        product,
        quantity: 1,
        checked: false,
        estimatedPrice: productPrice,
      });
    }
    globalListItems = [...globalListItems];
    notify();
  }, [notify]);

  const removeItem = useCallback((id: string) => {
    globalListItems = globalListItems.filter((i) => i.id !== id);
    notify();
  }, [notify]);

  const toggleCheck = useCallback((id: string) => {
    const item = globalListItems.find((i) => i.id === id);
    if (item) {
      item.checked = !item.checked;
      globalListItems = [...globalListItems];
      notify();
    }
  }, [notify]);

  const updateQuantity = useCallback((id: string, delta: number) => {
    const item = globalListItems.find((i) => i.id === id);
    if (item) {
      item.quantity = Math.max(1, item.quantity + delta);
      const price = PRODUCT_PRICES[item.product.id] || 0;
      item.estimatedPrice = item.quantity * price;
      globalListItems = [...globalListItems];
      notify();
    }
  }, [notify]);

  const clearList = useCallback(() => {
    globalListItems = globalListItems.filter((i) => !i.checked);
    notify();
  }, [notify]);

  return {
    listItems,
    addItem,
    removeItem,
    toggleCheck,
    updateQuantity,
    clearList,
  };
}
