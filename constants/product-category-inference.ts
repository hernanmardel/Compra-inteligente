/**
 * SEPA y las ofertas cargadas por foto traen el nombre real del producto, pero no una
 * categoría de góndola (SEPA solo tiene el nombre de la cadena, no una categoría útil).
 * Esto adivina la categoría por palabras clave del nombre, para que esos productos
 * puedan mostrarse mezclados con el catálogo normal en vez de quedar sueltos.
 */
export function inferProductCategory(productName: string): { category: string; icon: string; unit: string } {
  const name = productName.toLowerCase();

  if (name.includes("leche") || name.includes("yogur") || name.includes("queso")) {
    return { category: "Lácteos", icon: "🥛", unit: "lt" };
  }
  if (name.includes("pan") || name.includes("factura")) {
    return { category: "Panadería", icon: "🍞", unit: "paq" };
  }
  if (name.includes("fruta") || name.includes("verdura") || name.includes("banana") || name.includes("manzana")) {
    return { category: "Frutas y Verduras", icon: "🍎", unit: "kg" };
  }
  if (name.includes("carne") || name.includes("pollo") || name.includes("milanesa")) {
    return { category: "Carnes", icon: "🥩", unit: "kg" };
  }
  if (name.includes("detergente") || name.includes("lavandina") || name.includes("jabón")) {
    return { category: "Limpieza", icon: "🧹", unit: "lt" };
  }
  if (name.includes("papel") || name.includes("jabón mano")) {
    return { category: "Hogar", icon: "🧻", unit: "paq" };
  }
  if (name.includes("galleta") || name.includes("papas fritas")) {
    return { category: "Snacks", icon: "🍪", unit: "paq" };
  }
  if (name.includes("coca") || name.includes("agua") || name.includes("cerveza") || name.includes("jugo")) {
    return { category: "Bebidas", icon: "🥤", unit: "lt" };
  }
  if (name.includes("atún") || name.includes("sardina") || name.includes("conserva")) {
    return { category: "Conservas", icon: "🐟", unit: "un" };
  }

  return { category: "Almacén", icon: "🛒", unit: "un" };
}
