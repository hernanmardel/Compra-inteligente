import { beforeEach, describe, expect, it, vi } from "vitest";

const { memory } = vi.hoisted(() => ({ memory: new Map<string, string>() }));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => memory.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      memory.set(key, value);
    }),
  },
}));

import {
  addMerchantCatalogItem,
  addMerchantOffer,
  getMerchantPortalState,
  removeMerchantCatalogItem,
  saveMerchantProfile,
  setMerchantOfferActive,
} from "../constants/merchant-portal-store";

describe("merchant portal local store", () => {
  beforeEach(() => {
    memory.clear();
  });

  it("persiste un perfil, un producto y permite pausar una oferta", async () => {
    await saveMerchantProfile({
      name: "Mercado Central",
      category: "Mayorista",
      address: "Av. Colón 1234",
      city: "Mar del Plata",
      phone: "0223 555 1000",
      schedule: "Lun a sáb 8 a 21 h",
    });

    const afterCatalog = await addMerchantCatalogItem({
      name: "Leche entera 1 L",
      category: "Lácteos",
      barcode: "7790000000001",
      regularPrice: 1800,
    });
    const product = afterCatalog.catalog[0];

    const afterOffer = await addMerchantOffer({
      productId: product.id,
      originalPrice: 1800,
      offerPrice: 1450,
      startsAt: "2026-08-01",
      endsAt: "2026-08-31",
      stock: "100 unidades",
    });

    await setMerchantOfferActive(afterOffer.offers[0].id, false);
    const finalState = await getMerchantPortalState();

    expect(finalState.profile.name).toBe("Mercado Central");
    expect(finalState.catalog).toHaveLength(1);
    expect(finalState.offers).toHaveLength(1);
    expect(finalState.offers[0].active).toBe(false);
  });

  it("eliminar un producto también elimina sus ofertas asociadas", async () => {
    const state = await addMerchantCatalogItem({
      name: "Yerba 500 g",
      category: "Almacén",
      barcode: "",
      regularPrice: 2400,
    });
    const product = state.catalog[0];
    await addMerchantOffer({
      productId: product.id,
      originalPrice: 2400,
      offerPrice: 1990,
      startsAt: "2026-08-01",
      endsAt: "2026-08-31",
      stock: "Stock limitado",
    });

    const finalState = await removeMerchantCatalogItem(product.id);

    expect(finalState.catalog).toHaveLength(0);
    expect(finalState.offers).toHaveLength(0);
  });
});
