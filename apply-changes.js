const fs = require('fs');

function applyOps(path, ops) {
  let content = fs.readFileSync(path, 'utf8');
  ops.forEach((op, i) => {
    const count = content.split(op.anchor).length - 1;
    if (count !== 1) {
      console.error(`ERROR en ${path}, cambio #${i + 1}: se esperaba encontrar el texto ancla 1 vez, se encontró ${count} veces.`);
      console.error(`Ancla: ${op.anchor.slice(0, 80)}`);
      process.exit(1);
    }
    if (op.type === 'insertAfter') {
      content = content.replace(op.anchor, op.anchor + op.content);
    } else if (op.type === 'insertBefore') {
      content = content.replace(op.anchor, op.content + op.anchor);
    } else if (op.type === 'replace') {
      content = content.replace(op.anchor, op.content);
    }
  });
  fs.writeFileSync(path, content, 'utf8');
  console.log(`OK: ${path} actualizado (${ops.length} cambios aplicados)`);
}

const storeOps = [
  { type: 'insertAfter', anchor: `barcode: string;`, content: `\n  unitType: "unidad" | "gramos" | "kilo";` },
  { type: 'insertAfter', anchor: `offerPrice: number;`, content: `\n  quantity: number;` },
  { type: 'insertAfter', anchor: `barcode: r.barcode ?? "",`, content: `\n      unitType: r.unit_type ?? "unidad",` },
  { type: 'insertAfter', anchor: `offerPrice: fromCents(r.offer_price),`, content: `\n      quantity: r.quantity ?? 1,` },
  { type: 'insertAfter', anchor: `barcode: item.barcode,`, content: `\n    unit_type: item.unitType,` },
  { type: 'insertAfter', anchor: `offer_price: toCents(offer.offerPrice),`, content: `\n    quantity: offer.quantity,` },
];

const portalOps = [
  { type: 'replace', anchor: `import { useCallback, useMemo, useState } from "react";`, content: `import { useCallback, useEffect, useMemo, useState } from "react";` },
  { type: 'insertAfter', anchor: `const [productPrice, setProductPrice] = useState("");`, content: `\n  const [productUnitType, setProductUnitType] = useState("unidad");` },
  { type: 'insertAfter', anchor: `const [offerStock, setOfferStock] = useState("Stock limitado");`, content: `\n  const [offerQuantity, setOfferQuantity] = useState("");` },
  { type: 'insertBefore', anchor: `const reload = useCallback(async () => {`, content: `useEffect(() => {\n    setProductCategory(state.profile.category);\n  }, [state.profile.category]);\n\n  ` },
  { type: 'insertAfter', anchor: `barcode: productBarcode.trim(),`, content: `\n      unitType: productUnitType,` },
  { type: 'insertAfter', anchor: `setProductPrice("");`, content: `\n    setProductUnitType("unidad");` },
  { type: 'insertAfter', anchor: `setOfferOriginal(String(product.regularPrice));`, content: `\n    setOfferQuantity(product.unitType === "unidad" ? "1" : "");` },
  { type: 'insertAfter', anchor: `menor al precio habitual.");\n      return;\n    }`, content: `\n    const quantityNumber = Number(offerQuantity);\n    if (selectedProduct.unitType !== "unidad" && (!Number.isFinite(quantityNumber) || quantityNumber <= 0)) {\n      setNotice("Ingresá la cantidad en " + selectedProduct.unitType + " para esta oferta.");\n      return;\n    }` },
  { type: 'insertAfter', anchor: `offerPrice: previewOffer,`, content: `\n      quantity: selectedProduct.unitType === "unidad" ? 1 : quantityNumber,` },
  { type: 'insertAfter', anchor: `setOfferPrice("");`, content: `\n    setOfferQuantity("");` },
  { type: 'insertBefore', anchor: `<Field label="Precio habitual" value={productPrice} onChangeText={setProductPrice} placeholder="1500" keyboardType="decimal-pad" colors={colors} />`, content: `<Text style={{ color: colors.foreground, fontWeight: "600", marginTop: 12, marginBottom: 6 }}>Se vende por</Text>\n            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>\n              {["unidad", "gramos", "kilo"].map((option) => {\n                const selected = productUnitType === option;\n                return (\n                  <Pressable\n                    key={option}\n                    onPress={() => setProductUnitType(option)}\n                    style={({ pressed }) => [\n                      { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : "transparent" },\n                      pressed && { opacity: 0.7 },\n                    ]}\n                  >\n                    <Text style={{ color: selected ? "#fff" : colors.foreground, textTransform: "capitalize" }}>{option}</Text>\n                  </Pressable>\n                );\n              })}\n            </View>\n            ` },
  { type: 'replace', anchor: `<Text style={[styles.priceText, { color: colors.primary }]}>{money(item.regularPrice)}</Text>`, content: `<Text style={[styles.priceText, { color: colors.primary }]}>{money(item.regularPrice)}{item.unitType !== "unidad" ? " / " + item.unitType : ""}</Text>` },
  { type: 'replace', anchor: `<Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700", marginTop: 6 }}>{money(product.regularPrice)}</Text>`, content: `<Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700", marginTop: 6 }}>{money(product.regularPrice)}{product.unitType !== "unidad" ? " / " + product.unitType : ""}</Text>` },
  { type: 'insertAfter', anchor: `<Field label="Precio de oferta" value={offerPrice} onChangeText={setOfferPrice} keyboardType="decimal-pad" placeholder="0" colors={colors} />`, content: `\n                {selectedProduct.unitType !== "unidad" ? (\n                  <Field label={"Cantidad (en " + selectedProduct.unitType + ")"} value={offerQuantity} onChangeText={setOfferQuantity} keyboardType="number-pad" placeholder={selectedProduct.unitType === "kilo" ? "1" : "250"} colors={colors} />\n                ) : null}` },
  { type: 'replace', anchor: `<Text className="text-base font-bold text-foreground">{selectedProduct.name}</Text>`, content: `<Text className="text-base font-bold text-foreground">{selectedProduct.name}{selectedProduct.unitType !== "unidad" && offerQuantity ? " (" + offerQuantity + " " + selectedProduct.unitType + ")" : ""}</Text>` },
];

applyOps('constants/merchant-portal-store.ts', storeOps);
applyOps('app/portal-comercios.tsx', portalOps);
