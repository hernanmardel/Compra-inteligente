import AsyncStorage from "@react-native-async-storage/async-storage";
import { type Product, PRODUCTS } from "./mock-data";

const STORAGE_KEY = "custom_products";
const DEFAUL_PRODUCTS_KEY = "default_products";

// Get all products (default + custom)
export const getAllProducts = async (): Promise<Product[]> => {
  const customJson = await AsyncStorage.getItem(STORAGE_KEY);
  const customProducts: Product[] = customJson ? JSON.parse(customJson) : [];
  return [...PRODUCTS, ...customProducts];
};

// Get custom products only
export const getCustomProducts = async (): Promise<Product[]> => {
  const customJson = await AsyncStorage.getItem(STORAGE_KEY);
  return customJson ? JSON.parse(customJson) : [];
};

// Add a custom product
export const addCustomProduct = async (product: Product): Promise<Product[]> => {
  const customProducts = await getCustomProducts();
  customProducts.push(product);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(customProducts));
  return customProducts;
};

// Update a custom product
export const updateCustomProduct = async (product: Product): Promise<Product[]> => {
  const customProducts = await getCustomProducts();
  const index = customProducts.findIndex((p) => p.id === product.id);
  if (index !== -1) {
    customProducts[index] = product;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(customProducts));
  }
  return customProducts;
};

// Delete a custom product
export const deleteCustomProduct = async (productId: string): Promise<Product[]> => {
  const customProducts = await getCustomProducts();
  const filtered = customProducts.filter((p) => p.id !== productId);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return filtered;
};

// Add default product as custom (for editing)
export const addDefaultAsCustom = async (product: Product): Promise<Product[]> => {
  const customProducts = await getCustomProducts();
  // Avoid duplicates
  const exists = customProducts.some((p) => p.id === product.id);
  if (!exists) {
    customProducts.push(product);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(customProducts));
  }
  return customProducts;
};

// Get all categories (from default + custom)
export const getAllCategories = async (): Promise<string[]> => {
  const allProducts = await getAllProducts();
  const categories = [...new Set(allProducts.map((p) => p.category))];
  return categories.sort();
};

// Generate unique ID
export const generateProductId = (): string => {
  return `custom-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
};
