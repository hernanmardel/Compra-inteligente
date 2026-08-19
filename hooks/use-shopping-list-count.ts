import { useEffect, useState } from "react";
import { getShoppingListItems, subscribeShoppingList } from "@/constants/shopping-list-store";

/** Cantidad de productos pendientes (no tildados) en la lista de compras.
 * Se actualiza solo cuando se agrega/saca/tilda algo desde cualquier pantalla -
 * lo usa el badge rojo del tab "Lista" en la barra inferior. */
export function useShoppingListCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    getShoppingListItems().then((items) => {
      if (mounted) setCount(items.filter((item) => !item.checked).length);
    });

    const unsubscribe = subscribeShoppingList((items) => {
      if (mounted) setCount(items.filter((item) => !item.checked).length);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return count;
}
