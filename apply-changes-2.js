const fs = require('fs');

function applyOps(path, ops) {
  let content = fs.readFileSync(path, 'utf8');
  ops.forEach((op, i) => {
    const count = content.split(op.anchor).length - 1;
    if (count !== 1) {
      console.error(`ERROR en ${path}, cambio #${i + 1}: se esperaba encontrar el texto ancla 1 vez, se encontró ${count} veces.`);
      console.error(`Ancla: ${op.anchor.slice(0, 100)}`);
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
  { type: 'insertAfter', anchor: `unitType: "unidad" | "gramos" | "kilo";`, content: `\n  baseQuantity: number;` },
  { type: 'insertAfter', anchor: `unitType: r.unit_type ?? "unidad",`, content: `\n      baseQuantity: r.base_quantity ?? 1,` },
  { type: 'insertAfter', anchor: `unit_type: item.unitType,`, content: `\n    base_quantity: item.baseQuantity,` },
];

const portalOps = [
  { type: 'insertAfter', anchor: `const [productUnitType, setProductUnitType] = useState("unidad");`, content: `\n  const [productBaseQuantity, setProductBaseQuantity] = useState("100");` },
  { type: 'replace', anchor: `const previewOriginal = Number(offerOriginal) || selectedProduct?.regularPrice || 0;\n  const previewOffer = Number(offerPrice) || 0;\n  const previewDiscount = previewOriginal > 0 && previewOffer > 0 ? Math.max(0, Math.round((1 - previewOffer / previewOriginal) * 100)) : 0;`, content: `const previewOriginal = Number(offerOriginal) || selectedProduct?.regularPrice || 0;\n  const previewOffer = Number(offerPrice) || 0;\n  const previewQuantityNumber = Number(offerQuantity) || 0;\n  const previewOriginalPerUnit = selectedProduct && selectedProduct.unitType !== "unidad" ? previewOriginal / (selectedProduct.baseQuantity || 1) : previewOriginal;\n  const previewOfferPerUnit = selectedProduct && selectedProduct.unitType !== "unidad" ? (previewQuantityNumber > 0 ? previewOffer / previewQuantityNumber : 0) : previewOffer;\n  const previewDiscount = previewOriginalPerUnit > 0 && previewOfferPerUnit > 0 ? Math.max(0, Math.round((1 - previewOfferPerUnit / previewOriginalPerUnit) * 100)) : 0;` },
  { type: 'insertAfter', anchor: `unitType: productUnitType,`, content: `\n      baseQuantity: productUnitType === "unidad" ? 1 : (Number(productBaseQuantity) || 1),` },
  { type: 'insertAfter', anchor: `setProductUnitType("unidad");`, content: `\n    setProductBaseQuantity("100");` },
  { type: 'replace', anchor: `if (!selectedProduct || previewOriginal <= 0 || previewOffer <= 0 || previewOffer >= previewOriginal) {\n      setNotice("Elegí un producto e ingresá un precio de oferta menor al precio habitual.");\n      return;\n    }`, content: `if (!selectedProduct || previewOriginalPerUnit <= 0 || previewOfferPerUnit <= 0 || previewOfferPerUnit >= previewOriginalPerUnit) {\n      setNotice("Elegí un producto e ingresá un precio de oferta menor al precio habitual (comparando por gramo o kilo).");\n      return;\n    }` },
  { type: 'insertBefore', anchor: `<Field label="Precio habitual" value={productPrice} onChangeText={setProductPrice} placeholder="1500" keyboardType="decimal-pad" colors={colors} />`, content: `{productUnitType !== "unidad" ? (\n              <Field label={"Ese precio es cada cuántos " + productUnitType} value={productBaseQuantity} onChangeText={setProductBaseQuantity} keyboardType="number-pad" placeholder="100" colors={colors} />\n            ) : null}\n            ` },
  { type: 'replace', anchor: `<Text style={[styles.priceText, { color: colors.primary }]}>{money(item.regularPrice)}{item.unitType !== "unidad" ? " / " + item.unitType : ""}</Text>`, content: `<Text style={[styles.priceText, { color: colors.primary }]}>{money(item.regularPrice)}{item.unitType !== "unidad" ? " cada " + item.baseQuantity + " " + item.unitType : ""}</Text>` },
  { type: 'replace', anchor: `<Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700", marginTop: 6 }}>{money(product.regularPrice)}{product.unitType !== "unidad" ? " / " + product.unitType : ""}</Text>`, content: `<Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700", marginTop: 6 }}>{money(product.regularPrice)}{product.unitType !== "unidad" ? " cada " + product.baseQuantity + " " + product.unitType : ""}</Text>` },
];

applyOps('constants/merchant-portal-store.ts', storeOps);
applyOps('app/portal-comercios.tsx', portalOps);
