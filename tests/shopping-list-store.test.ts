import { describe, expect, it } from "vitest";
import { PRODUCTS, type ShoppingListItem } from "../constants/mock-data";

describe("productos de oferta", () => {
  it("puede construir un ítem de compra a partir de un producto de catálogo", () => {
    const item: ShoppingListItem = {
      id: "test-item",
      product: PRODUCTS[0],
      quantity: 1,
      checked: false,
      estimatedPrice: 1500,
    };

    expect(item.product.name).toBeTruthy();
    expect(item.estimatedPrice).toBe(1500);
    expect(item.checked).toBe(false);
  });
});
