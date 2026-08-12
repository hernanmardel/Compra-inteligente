import { describe, expect, it } from "vitest";
import { isUsableLocation } from "../lib/location-validation";

describe("isUsableLocation", () => {
  it("acepta una coordenada GPS válida", () => {
    expect(
      isUsableLocation({ latitude: -38.0055, longitude: -57.5426, accuracy: 24 }),
    ).toBe(true);
  });

  it("rechaza coordenadas fuera de los límites geográficos", () => {
    expect(isUsableLocation({ latitude: -100, longitude: -57.5, accuracy: 12 })).toBe(false);
    expect(isUsableLocation({ latitude: -38, longitude: 200, accuracy: 12 })).toBe(false);
  });

  it("rechaza una ubicación inexistente", () => {
    expect(isUsableLocation(null)).toBe(false);
  });
});
