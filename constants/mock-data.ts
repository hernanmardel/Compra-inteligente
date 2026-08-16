// Datos mock para CompraInteligente - con mayoristas, supermercados y comercios por ubicación
// Fallback cuando Google Places API no está disponible (REQUEST_DENIED, etc.)

export interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  icon: string;
}

export interface ShoppingListItem {
  id: string;
  product: Product;
  quantity: number;
  checked: boolean;
  estimatedPrice: number;
  bestPrice?: number;
  bestStore?: string;
  /** Precio normal (sin oferta) del producto, si se agregó desde una oferta real. Sin esto no se puede calcular ahorro genuino. */
  normalPrice?: number;
  /** Nombre del comercio, si se agregó desde una oferta con comercio conocido. */
  storeName?: string;
}

export type StoreType = "supermercado" | "mayorista" | "comercio" | "almacen";

export interface Offer {
  id: string;
  product: Product;
  normalPrice: number;
  offerPrice: number;
  store: string;
  storeId: string;
  storeType: StoreType;
  distance: number;
  validUntil: string;
  category: string;
  minQuantity?: number; // Mayoristas pueden requerir cantidad mínima
  bulkPrice?: number; // Precio al por mayor
}

export interface Store {
  id: string;
  name: string;
  address: string;
  distance: number;
  lat: number;
  lng: number;
  activeOffers: number;
  logo: string;
  type: StoreType;
  description?: string;
}

export const PRODUCTS: Product[] = [
  // === LÁCTEOS (8) ===
  { id: 'p1', name: 'Leche entera 1L', category: 'Lácteos', unit: 'lt', icon: '🥛' },
  { id: 'p2', name: 'Leche descremada 1L', category: 'Lácteos', unit: 'lt', icon: '🥛' },
  { id: 'p3', name: 'Leche en polvo', category: 'Lácteos', unit: 'paq', icon: '🥛' },
  { id: 'p14', name: 'Queso cremoso 200g', category: 'Lácteos', unit: 'g', icon: '🧀' },
  { id: 'p26', name: 'Queso duro (Parmesano)', category: 'Lácteos', unit: 'g', icon: '🧀' },
  { id: 'p27', name: 'Queso mozzarella', category: 'Lácteos', unit: 'g', icon: '🧀' },
  { id: 'p15', name: 'Yogur natural 1L', category: 'Lácteos', unit: 'lt', icon: '🥛' },
  { id: 'p28', name: 'Yogur frutas x6', category: 'Lácteos', unit: 'paq', icon: '🥛' },
  { id: 'p29', name: 'Dulce de leche 400g', category: 'Lácteos', unit: 'g', icon: '🍫' },
  { id: 'p30', name: 'Manteca 200g', category: 'Lácteos', unit: 'g', icon: '🧈' },
  { id: 'p31', name: 'Crema de leche', category: 'Lácteos', unit: 'lt', icon: '🥛' },
  { id: 'p32', name: 'Postre chocolate x4', category: 'Lácteos', unit: 'paq', icon: '🍮' },

  // === PANADERÍA (5) ===
  { id: 'p4', name: 'Pan de molde', category: 'Panadería', unit: 'paq', icon: '🍞' },
  { id: 'p33', name: 'Pan francés 1kg', category: 'Panadería', unit: 'kg', icon: '🥖' },
  { id: 'p34', name: 'Pan rallado', category: 'Panadería', unit: 'paq', icon: '🍞' },
  { id: 'p35', name: 'Galletitas saladas', category: 'Panadería', unit: 'paq', icon: '🍪' },
  { id: 'p36', name: 'Tostadas', category: 'Panadería', unit: 'paq', icon: '🍞' },

  // === FRUTAS Y VERDURAS (15) ===
  { id: 'p7', name: 'Tomate perita 1kg', category: 'Frutas y Verduras', unit: 'kg', icon: '🍅' },
  { id: 'p8', name: 'Banana 1kg', category: 'Frutas y Verduras', unit: 'kg', icon: '🍌' },
  { id: 'p9', name: 'Manzana 1kg', category: 'Frutas y Verduras', unit: 'kg', icon: '🍎' },
  { id: 'p12', name: 'Papas 1kg', category: 'Frutas y Verduras', unit: 'kg', icon: '🥔' },
  { id: 'p13', name: 'Cebolla 1kg', category: 'Frutas y Verduras', unit: 'kg', icon: '🧅' },
  { id: 'p22', name: 'Zanahoria 1kg', category: 'Frutas y Verduras', unit: 'kg', icon: '🥕' },
  { id: 'p23', name: 'Lechuga', category: 'Frutas y Verduras', unit: 'un', icon: '🥬' },
  { id: 'p37', name: 'Naranja 1kg', category: 'Frutas y Verduras', unit: 'kg', icon: '🍊' },
  { id: 'p38', name: 'Limón 1kg', category: 'Frutas y Verduras', unit: 'kg', icon: '🍋' },
  { id: 'p39', name: 'Pera 1kg', category: 'Frutas y Verduras', unit: 'kg', icon: '🍐' },
  { id: 'p40', name: 'Ajo (cabeza)', category: 'Frutas y Verduras', unit: 'un', icon: '🧄' },
  { id: 'p41', name: 'Morron 1kg', category: 'Frutas y Verduras', unit: 'kg', icon: '🫑' },
  { id: 'p42', name: 'Zapallo', category: 'Frutas y Verduras', unit: 'kg', icon: '🎃' },
  { id: 'p43', name: 'Berenjena', category: 'Frutas y Verduras', unit: 'kg', icon: '🍆' },
  { id: 'p44', name: 'Calabacita', category: 'Frutas y Verduras', unit: 'kg', icon: '🥒' },
  { id: 'p45', name: 'Espinaca', category: 'Frutas y Verduras', unit: 'atado', icon: '🥬' },
  { id: 'p46', name: 'Acelga', category: 'Frutas y Verduras', unit: 'atado', icon: '🥬' },
  { id: 'p47', name: 'Frutilla 250g', category: 'Frutas y Verduras', unit: 'g', icon: '🍓' },
  { id: 'p48', name: 'Palta', category: 'Frutas y Verduras', unit: 'un', icon: '🥑' },
  { id: 'p49', name: 'Mandarina 1kg', category: 'Frutas y Verduras', unit: 'kg', icon: '🍊' },

  // === CARNES (8) ===
  { id: 'p10', name: 'Pollo entero 1kg', category: 'Carnes', unit: 'kg', icon: '🍗' },
  { id: 'p11', name: 'Carne molida 500g', category: 'Carnes', unit: 'g', icon: '🥩' },
  { id: 'p50', name: 'Milanesas 500g', category: 'Carnes', unit: 'g', icon: '🥩' },
  { id: 'p51', name: 'Carne para guiso 1kg', category: 'Carnes', unit: 'kg', icon: '🥩' },
  { id: 'p52', name: 'Pechuga de pollo 1kg', category: 'Carnes', unit: 'kg', icon: '🍗' },
  { id: 'p53', name: 'Jamón cocido 500g', category: 'Carnes', unit: 'g', icon: '🍖' },
  { id: 'p54', name: 'Salchicha (paquete)', category: 'Carnes', unit: 'paq', icon: '🌭' },
  { id: 'p55', name: 'Pescado (merluza) 1kg', category: 'Carnes', unit: 'kg', icon: '🐟' },

  // === ALMACÉN (18) ===
  { id: 'p5', name: 'Arroz 1kg', category: 'Almacén', unit: 'kg', icon: '🍚' },
  { id: 'p6', name: 'Fideos 500g', category: 'Almacén', unit: 'paq', icon: '🍝' },
  { id: 'p16', name: 'Aceite de girasol 1L', category: 'Almacén', unit: 'lt', icon: '🫒' },
  { id: 'p17', name: 'Azúcar 1kg', category: 'Almacén', unit: 'kg', icon: '🥄' },
  { id: 'p18', name: 'Sal fina 500g', category: 'Almacén', unit: 'g', icon: '🧂' },
  { id: 'p56', name: 'Harina 1kg', category: 'Almacén', unit: 'kg', icon: '🌾' },
  { id: 'p57', name: 'Lentejas 500g', category: 'Almacén', unit: 'g', icon: '🫘' },
  { id: 'p58', name: 'Porotos 500g', category: 'Almacén', unit: 'g', icon: '🫘' },
  { id: 'p59', name: 'Garbanzos 500g', category: 'Almacén', unit: 'g', icon: '🫘' },
  { id: 'p60', name: 'Maíz pisingallo', category: 'Almacén', unit: 'g', icon: '🌽' },
  { id: 'p61', name: 'Vinagre', category: 'Almacén', unit: 'lt', icon: '🫗' },
  { id: 'p62', name: 'Mostaza', category: 'Almacén', unit: 'paq', icon: '🌿' },
  { id: 'p63', name: 'Ketchup', category: 'Almacén', unit: 'paq', icon: '🍅' },
  { id: 'p64', name: 'Mayonesa', category: 'Almacén', unit: 'paq', icon: '🫙' },
  { id: 'p65', name: 'Tomate triturado', category: 'Almacén', unit: 'lata', icon: '🍅' },
  { id: 'p66', name: 'Puré de tomate', category: 'Almacén', unit: 'lata', icon: '🍅' },
  { id: 'p67', name: 'Caldo de carne', category: 'Almacén', unit: 'cubos', icon: '🫕' },
  { id: 'p68', name: 'Chocolate en polvo', category: 'Almacén', unit: 'paq', icon: '🍫' },
  { id: 'p69', name: 'Gelatina', category: 'Almacén', unit: 'paq', icon: '🍮' },
  { id: 'p70', name: 'Levadura seca', category: 'Almacén', unit: 'paq', icon: '🧁' },
  { id: 'p71', name: 'Galletitas de agua', category: 'Almacén', unit: 'paq', icon: '🍪' },

  // === BEBIDAS (8) ===
  { id: 'p16b', name: 'Café molido 250g', category: 'Bebidas', unit: 'g', icon: '☕' },
  { id: 'p72', name: 'Té x100 saquitos', category: 'Bebidas', unit: 'paq', icon: '🍵' },
  { id: 'p73', name: 'Mate cocido', category: 'Bebidas', unit: 'paq', icon: '🧉' },
  { id: 'p74', name: 'Yerba mate 1kg', category: 'Bebidas', unit: 'kg', icon: '🧉' },
  { id: 'p75', name: 'Coca-Cola 1.5L', category: 'Bebidas', unit: 'lt', icon: '🥤' },
  { id: 'p76', name: 'Agua mineral 1.5L', category: 'Bebidas', unit: 'lt', icon: '💧' },
  { id: 'p77', name: 'Jugo de naranja 1L', category: 'Bebidas', unit: 'lt', icon: '🧃' },
  { id: 'p78', name: 'Cerveza (pack x6)', category: 'Bebidas', unit: 'pack', icon: '🍺' },

  // === LIMPIEZA (12) ===
  { id: 'p19', name: 'Detergente 1L', category: 'Limpieza', unit: 'lt', icon: '🧴' },
  { id: 'p79', name: 'Lavandina 1L', category: 'Limpieza', unit: 'lt', icon: '🧹' },
  { id: 'p80', name: 'Desodorante de pisos 1L', category: 'Limpieza', unit: 'lt', icon: '🫧' },
  { id: 'p81', name: 'Suavizante 1L', category: 'Limpieza', unit: 'lt', icon: '🧺' },
  { id: 'p82', name: 'Jabón en polvo 1kg', category: 'Limpieza', unit: 'kg', icon: '🫧' },
  { id: 'p83', name: 'Jabón para platos', category: 'Limpieza', unit: 'lt', icon: '🧴' },
  { id: 'p84', name: 'Estopa (paquete)', category: 'Limpieza', unit: 'paq', icon: '🧽' },
  { id: 'p85', name: 'Guantes de limpieza', category: 'Limpieza', unit: 'par', icon: '🧤' },
  { id: 'p86', name: 'Escoba', category: 'Limpieza', unit: 'un', icon: '🧹' },
  { id: 'p87', name: 'Bolsas de residuo x10', category: 'Limpieza', unit: 'paq', icon: '🗑️' },
  { id: 'p88', name: 'Alcohol en gel', category: 'Limpieza', unit: 'lt', icon: '🧴' },
  { id: 'p89', name: 'Limpiavidrios', category: 'Limpieza', unit: 'lt', icon: '🪟' },

  // === HOGAR (10) ===
  { id: 'p20', name: 'Papel higiénico x4', category: 'Hogar', unit: 'paq', icon: '🧻' },
  { id: 'p90', name: 'Toalla de cocina x2', category: 'Hogar', unit: 'paq', icon: '🧻' },
  { id: 'p91', name: 'Servilletas', category: 'Hogar', unit: 'paq', icon: '🍽️' },
  { id: 'p92', name: 'Papel film', category: 'Hogar', unit: 'un', icon: '📦' },
  { id: 'p93', name: 'Aluminio (rollo)', category: 'Hogar', unit: 'un', icon: '🫙' },
  { id: 'p94', name: 'Encendedores x2', category: 'Hogar', unit: 'paq', icon: '🔥' },
  { id: 'p95', name: 'Pilas AA x4', category: 'Hogar', unit: 'paq', icon: '🔋' },
  { id: 'p96', name: 'Fósforos', category: 'Hogar', unit: 'paq', icon: '🔥' },
  { id: 'p97', name: 'Veladora (pack)', category: 'Hogar', unit: 'paq', icon: '🕯️' },
  { id: 'p98', name: 'Cinta adhesiva', category: 'Hogar', unit: 'un', icon: '📦' },

  // === HIGIENE PERSONAL (10) ===
  { id: 'p99', name: 'Jabón de tocador x3', category: 'Higiene personal', unit: 'paq', icon: '🧼' },
  { id: 'p100', name: 'Shampoo 400ml', category: 'Higiene personal', unit: 'lt', icon: '🧴' },
  { id: 'p101', name: 'Acondicionador', category: 'Higiene personal', unit: 'lt', icon: '🧴' },
  { id: 'p102', name: 'Pasta dental', category: 'Higiene personal', unit: 'un', icon: '🦷' },
  { id: 'p103', name: 'Cepillo dental', category: 'Higiene personal', unit: 'un', icon: '🪥' },
  { id: 'p104', name: 'Desodorante roll-on', category: 'Higiene personal', unit: 'un', icon: '🧴' },
  { id: 'p105', name: 'Cremas para manos', category: 'Higiene personal', unit: 'un', icon: '🧴' },
  { id: 'p106', name: 'Algodón (paquete)', category: 'Higiene personal', unit: 'paq', icon: '🤍' },
  { id: 'p107', name: 'Toallitas húmedas', category: 'Higiene personal', unit: 'paq', icon: '🧻' },
  { id: 'p108', name: 'Rastrillo/maquinilla', category: 'Higiene personal', unit: 'un', icon: '🪒' },

  // === SNACKS (8) ===
  { id: 'p25', name: 'Galletas dulces', category: 'Snacks', unit: 'paq', icon: '🍪' },
  { id: 'p109', name: 'Papas fritas', category: 'Snacks', unit: 'paq', icon: '🥔' },
  { id: 'p110', name: 'Maní salado', category: 'Snacks', unit: 'paq', icon: '🥜' },
  { id: 'p111', name: 'Chocolates', category: 'Snacks', unit: 'paq', icon: '🍫' },
  { id: 'p112', name: 'Caramelos', category: 'Snacks', unit: 'paq', icon: '🍬' },
  { id: 'p113', name: 'Gomitas', category: 'Snacks', unit: 'paq', icon: '🍭' },
  { id: 'p114', name: 'Palitos de queso', category: 'Snacks', unit: 'paq', icon: '🧀' },
  { id: 'p115', name: 'Galletitas rellenas', category: 'Snacks', unit: 'paq', icon: '🍪' },

  // === CONSERVAS (8) ===
  { id: 'p24', name: 'Atún en lata', category: 'Conservas', unit: 'lata', icon: '🐟' },
  { id: 'p116', name: 'Arvejas en lata', category: 'Conservas', unit: 'lata', icon: '🥫' },
  { id: 'p117', name: 'Choclo en lata', category: 'Conservas', unit: 'lata', icon: '🥫' },
  { id: 'p118', name: 'Duraznos en lata', category: 'Conservas', unit: 'lata', icon: '🍑' },
  { id: 'p119', name: 'Ananá en lata', category: 'Conservas', unit: 'lata', icon: '🍍' },
  { id: 'p120', name: 'Aceitunas', category: 'Conservas', unit: 'lata', icon: '🫒' },
  { id: 'p121', name: 'Mermelada', category: 'Conservas', unit: 'frasco', icon: '🍓' },
  { id: 'p122', name: 'Miel', category: 'Conservas', unit: 'frasco', icon: '🍯' },

  // === PROTEÍNAS (5) ===
  { id: 'p3', name: 'Huevos (docena)', category: 'Proteínas', unit: 'doc', icon: '🥚' },
  { id: 'p123', name: 'Salchichas de carne', category: 'Proteínas', unit: 'paq', icon: '🌭' },
  { id: 'p124', name: 'Mortadela 500g', category: 'Proteínas', unit: 'g', icon: '🍖' },
  { id: 'p125', name: 'Queso untable', category: 'Proteínas', unit: 'g', icon: '🧀' },
  { id: 'p126', name: 'Pate', category: 'Proteínas', unit: 'un', icon: '🍖' },

  // === MASCOTAS (5) ===
  { id: 'p127', name: 'Alimento perro 15kg', category: 'Mascotas', unit: 'kg', icon: '🐕' },
  { id: 'p128', name: 'Alimento gato 3kg', category: 'Mascotas', unit: 'kg', icon: '🐈' },
  { id: 'p129', name: 'Arena sanitaria gato', category: 'Mascotas', unit: 'kg', icon: '🐱' },
  { id: 'p130', name: 'Snacks para perro', category: 'Mascotas', unit: 'paq', icon: '🦴' },
  { id: 'p131', name: 'Pañales para perro', category: 'Mascotas', unit: 'paq', icon: '🐾' },

  // === BEBÉS (5) ===
  { id: 'p132', name: 'Pañales (pack)', category: 'Bebés', unit: 'paq', icon: '👶' },
  { id: 'p133', name: 'Toallitas para bebé', category: 'Bebés', unit: 'paq', icon: '🧻' },
  { id: 'p134', name: 'Leche en polvo bebé', category: 'Bebés', unit: 'lata', icon: '🍼' },
  { id: 'p135', name: 'Papilla de frutas', category: 'Bebés', unit: 'frasco', icon: '🫙' },
  { id: 'p136', name: 'Shampoo bebé', category: 'Bebés', unit: 'lt', icon: '🧴' },

  // === FRESCOS (5) ===
  { id: 'p137', name: 'Puré de papas instantáneo', category: 'Frescos', unit: 'paq', icon: '🥔' },
  { id: 'p138', name: 'Empanadas x6', category: 'Frescos', unit: 'paq', icon: '🥟' },
  { id: 'p139', name: 'Pizza congelada', category: 'Frescos', unit: 'un', icon: '🍕' },
  { id: 'p140', name: 'Helado 1L', category: 'Frescos', unit: 'lt', icon: '🍨' },
  { id: 'p141', name: 'Papas fritas congeladas', category: 'Frescos', unit: 'paq', icon: '🍟' },
];

// Centro de Mar del Plata (zona sur)
const MDP_CENTER = { lat: -38.0418, lng: -57.5466 };

// Supermercados reales de Mar del Plata (direcciones verificadas)
export const STORES: Store[] = [
  // Supermercados
  { id: 's1', name: 'Día Supermarket', address: 'Av. Colón 3755, Mar del Plata', distance: 0.5, lat: -38.0398, lng: -57.5428, activeOffers: 8, logo: '🛒', type: 'supermercado', description: 'Supermercado de barrio' },
  { id: 's2', name: 'Día Supermarket', address: 'Pedro Luro 3411, Mar del Plata', distance: 1.2, lat: -38.0385, lng: -57.5480, activeOffers: 6, logo: '🛒', type: 'supermercado', description: 'Supermercado de barrio' },
  { id: 's3', name: 'Carrefour', address: 'Av. Constitución y Dellia, Mar del Plata', distance: 2.5, lat: -38.0455, lng: -57.5490, activeOffers: 12, logo: '🏪', type: 'supermercado', description: 'Cadena de supermercados' },
  { id: 's4', name: 'Vea Supermercados', address: 'Av. Independencia 3705, Mar del Plata', distance: 1.5, lat: -38.0445, lng: -57.5435, activeOffers: 6, logo: '🛍️', type: 'supermercado', description: 'Supermercado con delivery' },
  { id: 's5', name: 'Disco', address: 'Av. Juan B. Justo 2376, Mar del Plata', distance: 2.8, lat: -38.0370, lng: -57.5450, activeOffers: 7, logo: '🏪', type: 'supermercado', description: 'Supermercado de cadena' },
  // Mayoristas
  { id: 's6', name: 'Mayorista Wally', address: 'Ruta 88 N° 995, Mar del Plata', distance: 3.5, lat: -38.0490, lng: -57.5420, activeOffers: 20, logo: '📦', type: 'mayorista', description: 'Mayorista - Precios al por mayor' },
  { id: 's7', name: 'Valor X Mayor', address: 'Av. Champagnat 1775, Mar del Plata', distance: 2.0, lat: -38.0425, lng: -57.5410, activeOffers: 15, logo: '📦', type: 'mayorista', description: 'Mayorista - Compra mínima $15.000' },
  { id: 's8', name: 'Rimoldi Mayorista', address: 'Av. Colón 7343, Mar del Plata', distance: 4.0, lat: -38.0510, lng: -57.5360, activeOffers: 12, logo: '🏬', type: 'mayorista', description: 'Mayorista - Desde 6 unidades' },
  // Comercios de barrio
  { id: 's9', name: 'Almacén Aurelia', address: 'Av. Luro 3009, Mar del Plata', distance: 0.3, lat: -38.0415, lng: -57.5460, activeOffers: 3, logo: '🏪', type: 'almacen', description: 'Almacén de barrio' },
  { id: 's10', name: 'Verdulería Maxnic', address: 'Av. Independencia 1063, Mar del Plata', distance: 0.6, lat: -38.0440, lng: -57.5475, activeOffers: 5, logo: '🥦', type: 'comercio', description: 'Frutas y verduras frescas' },
  { id: 's11', name: 'Verdulería La Huerta', address: 'Av. Libertad 5159, Mar del Plata', distance: 0.8, lat: -38.0400, lng: -57.5510, activeOffers: 4, logo: '🥦', type: 'comercio', description: 'Productos frescos de estación' },
  { id: 's12', name: 'Supermercado Mayorista Feliz', address: 'Av. Alió 3232, Mar del Plata', distance: 1.5, lat: -38.0435, lng: -57.5390, activeOffers: 8, logo: '🛒', type: 'mayorista', description: 'Mayorista con autoservicio' },
  { id: 's13', name: 'Almacén Aurelia Centro', address: 'Córdoba 4293, Mar del Plata', distance: 0.9, lat: -38.0408, lng: -57.5445, activeOffers: 2, logo: '🏪', type: 'almacen', description: 'Almacén de barrio' },
];

// Ofertas de supermercados
export const SUPERMARKET_OFFERS: Offer[] = [
  { id: 'o1', product: PRODUCTS[0], normalPrice: 1200, offerPrice: 890, store: 'Día Supermarket', storeId: 's1', storeType: 'supermercado', distance: 0.5, validUntil: '2026-08-15', category: 'Lácteos' },
  { id: 'o2', product: PRODUCTS[1], normalPrice: 2500, offerPrice: 1790, store: 'Día Supermarket', storeId: 's2', storeType: 'supermercado', distance: 1.2, validUntil: '2026-08-14', category: 'Panadería' },
  { id: 'o3', product: PRODUCTS[2], normalPrice: 3800, offerPrice: 2990, store: 'Vea Supermercados', storeId: 's4', storeType: 'supermercado', distance: 1.5, validUntil: '2026-08-12', category: 'Proteínas' },
  { id: 'o4', product: PRODUCTS[3], normalPrice: 1500, offerPrice: 990, store: 'Día Supermarket', storeId: 's1', storeType: 'supermercado', distance: 0.5, validUntil: '2026-08-16', category: 'Almacén' },
  { id: 'o5', product: PRODUCTS[4], normalPrice: 1800, offerPrice: 1290, store: 'Carrefour', storeId: 's3', storeType: 'supermercado', distance: 2.5, validUntil: '2026-08-15', category: 'Almacén' },
  { id: 'o6', product: PRODUCTS[5], normalPrice: 4200, offerPrice: 3490, store: 'Vea Supermercados', storeId: 's4', storeType: 'supermercado', distance: 1.5, validUntil: '2026-08-14', category: 'Almacén' },
  { id: 'o7', product: PRODUCTS[6], normalPrice: 2800, offerPrice: 1990, store: 'Verdulería Maxnic', storeId: 's10', storeType: 'comercio', distance: 0.6, validUntil: '2026-08-12', category: 'Frutas y Verduras' },
  { id: 'o8', product: PRODUCTS[7], normalPrice: 2200, offerPrice: 1490, store: 'Día Supermarket', storeId: 's2', storeType: 'supermercado', distance: 1.2, validUntil: '2026-08-15', category: 'Frutas y Verduras' },
  { id: 'o9', product: PRODUCTS[9], normalPrice: 5500, offerPrice: 4290, store: 'Vea Supermercados', storeId: 's4', storeType: 'supermercado', distance: 1.5, validUntil: '2026-08-14', category: 'Carnes' },
  { id: 'o10', product: PRODUCTS[14], normalPrice: 1500, offerPrice: 990, store: 'Disco', storeId: 's5', storeType: 'supermercado', distance: 2.8, validUntil: '2026-08-16', category: 'Lácteos' },
  { id: 'o11', product: PRODUCTS[15], normalPrice: 4800, offerPrice: 3490, store: 'Carrefour', storeId: 's3', storeType: 'supermercado', distance: 2.5, validUntil: '2026-08-15', category: 'Bebidas' },
  { id: 'o12', product: PRODUCTS[18], normalPrice: 3200, offerPrice: 2290, store: 'Día Supermarket', storeId: 's2', storeType: 'supermercado', distance: 1.2, validUntil: '2026-08-14', category: 'Limpieza' },
];

// Ofertas de mayoristas (precios más bajos pero con cantidad mínima)
export const WHOLESALER_OFFERS: Offer[] = [
  { id: 'w1', product: PRODUCTS[0], normalPrice: 1200, offerPrice: 650, store: 'Mayorista Wally', storeId: 's6', storeType: 'mayorista', distance: 3.5, validUntil: '2026-08-18', category: 'Lácteos', minQuantity: 12, bulkPrice: 650 },
  { id: 'w2', product: PRODUCTS[3], normalPrice: 1500, offerPrice: 720, store: 'Mayorista Wally', storeId: 's6', storeType: 'mayorista', distance: 3.5, validUntil: '2026-08-20', category: 'Almacén', minQuantity: 10, bulkPrice: 720 },
  { id: 'w3', product: PRODUCTS[5], normalPrice: 4200, offerPrice: 2450, store: 'Valor X Mayor', storeId: 's7', storeType: 'mayorista', distance: 2.0, validUntil: '2026-08-19', category: 'Almacén', minQuantity: 6, bulkPrice: 2450 },
  { id: 'w4', product: PRODUCTS[4], normalPrice: 1800, offerPrice: 890, store: 'Valor X Mayor', storeId: 's7', storeType: 'mayorista', distance: 2.0, validUntil: '2026-08-18', category: 'Almacén', minQuantity: 10, bulkPrice: 890 },
  { id: 'w5', product: PRODUCTS[1], normalPrice: 2500, offerPrice: 1100, store: 'Rimoldi Mayorista', storeId: 's8', storeType: 'mayorista', distance: 4.0, validUntil: '2026-08-17', category: 'Panadería', minQuantity: 6, bulkPrice: 1100 },
  { id: 'w6', product: PRODUCTS[9], normalPrice: 5500, offerPrice: 3200, store: 'Mayorista Wally', storeId: 's6', storeType: 'mayorista', distance: 3.5, validUntil: '2026-08-19', category: 'Carnes', minQuantity: 5, bulkPrice: 3200 },
  { id: 'w7', product: PRODUCTS[18], normalPrice: 3200, offerPrice: 1590, store: 'Valor X Mayor', storeId: 's7', storeType: 'mayorista', distance: 2.0, validUntil: '2026-08-20', category: 'Limpieza', minQuantity: 6, bulkPrice: 1590 },
  { id: 'w8', product: PRODUCTS[19], normalPrice: 3500, offerPrice: 1800, store: 'Rimoldi Mayorista', storeId: 's8', storeType: 'mayorista', distance: 4.0, validUntil: '2026-08-18', category: 'Hogar', minQuantity: 4, bulkPrice: 1800 },
  { id: 'w9', product: PRODUCTS[16], normalPrice: 1800, offerPrice: 850, store: 'Mayorista Wally', storeId: 's6', storeType: 'mayorista', distance: 3.5, validUntil: '2026-08-19', category: 'Almacén', minQuantity: 10, bulkPrice: 850 },
  { id: 'w10', product: PRODUCTS[14], normalPrice: 1500, offerPrice: 720, store: 'Valor X Mayor', storeId: 's7', storeType: 'mayorista', distance: 2.0, validUntil: '2026-08-18', category: 'Lácteos', minQuantity: 12, bulkPrice: 720 },
];

// Ofertas de comercios de barrio
export const NEIGHBORHOOD_OFFERS: Offer[] = [
  { id: 'n1', product: PRODUCTS[6], normalPrice: 2800, offerPrice: 1500, store: 'Verdulería Maxnic', storeId: 's10', storeType: 'comercio', distance: 0.6, validUntil: '2026-08-14', category: 'Frutas y Verduras' },
  { id: 'n2', product: PRODUCTS[7], normalPrice: 2200, offerPrice: 1200, store: 'Verdulería Maxnic', storeId: 's10', storeType: 'comercio', distance: 0.6, validUntil: '2026-08-14', category: 'Frutas y Verduras' },
  { id: 'n3', product: PRODUCTS[8], normalPrice: 2600, offerPrice: 1350, store: 'Verdulería La Huerta', storeId: 's11', storeType: 'comercio', distance: 0.8, validUntil: '2026-08-15', category: 'Frutas y Verduras' },
  { id: 'n4', product: PRODUCTS[10], normalPrice: 6200, offerPrice: 3900, store: 'Supermercado Mayorista Feliz', storeId: 's12', storeType: 'mayorista', distance: 1.5, validUntil: '2026-08-16', category: 'Carnes' },
  { id: 'n5', product: PRODUCTS[11], normalPrice: 4800, offerPrice: 3200, store: 'Supermercado Mayorista Feliz', storeId: 's12', storeType: 'mayorista', distance: 1.5, validUntil: '2026-08-15', category: 'Carnes' },
  { id: 'n6', product: PRODUCTS[1], normalPrice: 2500, offerPrice: 1600, store: 'Verdulería La Huerta', storeId: 's11', storeType: 'comercio', distance: 0.8, validUntil: '2026-08-14', category: 'Panadería' },
  { id: 'n7', product: PRODUCTS[16], normalPrice: 1800, offerPrice: 1100, store: 'Almacén Aurelia', storeId: 's9', storeType: 'almacen', distance: 0.3, validUntil: '2026-08-16', category: 'Almacén' },
  { id: 'n8', product: PRODUCTS[17], normalPrice: 800, offerPrice: 500, store: 'Almacén Aurelia', storeId: 's9', storeType: 'almacen', distance: 0.3, validUntil: '2026-08-17', category: 'Almacén' },
  { id: 'n9', product: PRODUCTS[12], normalPrice: 1200, offerPrice: 600, store: 'Verdulería Maxnic', storeId: 's10', storeType: 'comercio', distance: 0.6, validUntil: '2026-08-14', category: 'Frutas y Verduras' },
  { id: 'n10', product: PRODUCTS[13], normalPrice: 900, offerPrice: 450, store: 'Verdulería Maxnic', storeId: 's10', storeType: 'comercio', distance: 0.6, validUntil: '2026-08-14', category: 'Frutas y Verduras' },
];

// Todas las ofertas combinadas
export const OFFERS: Offer[] = [
  ...SUPERMARKET_OFFERS,
  ...WHOLESALER_OFFERS,
  ...NEIGHBORHOOD_OFFERS,
];

export const CATEGORIES = [
  'Todos', 'Lácteos', 'Carnes', 'Frutas y Verduras', 'Almacén', 'Panadería',
  'Bebidas', 'Limpieza', 'Hogar', 'Snacks', 'Conservas', 'Proteínas'
];

export const STORE_TYPES = [
  { value: 'todos', label: 'Todos', icon: '🏪' },
  { value: 'supermercado', label: 'Supermercados', icon: '🛒' },
  { value: 'mayorista', label: 'Mayoristas', icon: '📦' },
  { value: 'comercio', label: 'Comercios', icon: '🏪' },
  { value: 'almacen', label: 'Almacenes', icon: '🧺' },
];

export const SAVINGS_HISTORY = [
  { week: 'Sem 1', amount: 4200 },
  { week: 'Sem 2', amount: 3800 },
  { week: 'Sem 3', amount: 5100 },
  { week: 'Sem 4', amount: 4600 },
  { week: 'Sem 5', amount: 5800 },
  { week: 'Sem 6', amount: 6200 },
];

export const formatPrice = (price: number): string => {
  return `$${price.toLocaleString('es-AR')}`;
};

export const calculateSavings = (normalPrice: number, offerPrice: number): number => {
  return normalPrice - offerPrice;
};

export const calculateSavingsPercentage = (normalPrice: number, offerPrice: number): number => {
  return Math.round(((normalPrice - offerPrice) / normalPrice) * 100);
};

// Calcular distancia real usando fórmula de Haversine
export const calculateDistance = (
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Redondear a 1 decimal
};

// Ubicación por defecto (CABA - se sobrescribe con GPS real)
export const DEFAULT_LOCATION = {
  latitude: -34.6037,
  longitude: -58.3816,
};

// Actualizar distancias según la ubicación del usuario
export const updateDistancesByLocation = (
  userLat: number,
  userLng: number,
  stores: Store[],
  offers: Offer[]
): { stores: Store[]; offers: Offer[] } => {
  const updatedStores = stores.map((store) => ({
    ...store,
    distance: calculateDistance(userLat, userLng, store.lat, store.lng),
  }));

  const storeDistanceMap = new Map<string, number>();
  updatedStores.forEach((s) => storeDistanceMap.set(s.id, s.distance));

  const updatedOffers = offers.map((offer) => ({
    ...offer,
    distance: storeDistanceMap.get(offer.storeId) ?? offer.distance,
  }));

  return { stores: updatedStores, offers: updatedOffers };
};

// Filtrar comercios por radio de distancia
export const filterByDistance = (stores: Store[], maxKm: number): Store[] => {
  return stores.filter((s) => s.distance <= maxKm);
};

// Filtrar ofertas por radio de distancia
export const filterOffersByDistance = (offers: Offer[], maxKm: number): Offer[] => {
  return offers.filter((o) => o.distance <= maxKm);
};

// Generar datos mock de comercios para un radio de búsqueda dado
// Usado como fallback cuando Google Places API no funciona
export function generateFallbackStores(
  userLat: number,
  userLng: number,
  radiusKm: number,
  cityName?: string
): Store[] {
  // Determinar ciudad y calles principales
  const city = cityName || 'Tu ciudad';
  // Nombres de cadenas nacionales (funcionan en cualquier ciudad)
  const storeNames = {
    supermercados: ['Día Supermarket', 'Vea Supermercados', 'Carrefour', 'Disco'],
    mayoristas: ['Mayorista Central', 'Distribuidora Regional', 'Mayorista Popular'],
    comercios: ['Verdulería Fresca', 'Almacén de Barrio', 'Panadería Artesanal', 'Carnicería'],
  };

  const fallbackStoreTemplates: Omit<Store, 'id' | 'distance' | 'lat' | 'lng'>[] = [
    { name: storeNames.supermercados[0], address: `Av. Principal ${1000 + Math.floor(Math.random() * 5000)}, ${city}`, activeOffers: 8, logo: '🛒', type: 'supermercado', description: 'Supermercado de barrio' },
    { name: storeNames.supermercados[1], address: `Av. Libertad ${800 + Math.floor(Math.random() * 4000)}, ${city}`, activeOffers: 6, logo: '🛍️', type: 'supermercado', description: 'Supermercado con delivery' },
    { name: storeNames.supermercados[2], address: `Av. San Martín ${500 + Math.floor(Math.random() * 3000)}, ${city}`, activeOffers: 12, logo: '🏪', type: 'supermercado', description: 'Cadena de supermercados' },
    { name: storeNames.supermercados[3], address: `Calle Belgrano ${1200 + Math.floor(Math.random() * 2000)}, ${city}`, activeOffers: 7, logo: '🏪', type: 'supermercado', description: 'Supermercado de cadena' },
    { name: storeNames.mayoristas[0], address: `Av. Constitución ${2000 + Math.floor(Math.random() * 3000)}, ${city}`, activeOffers: 20, logo: '📦', type: 'mayorista', description: 'Mayorista - Precios al por mayor' },
    { name: storeNames.mayoristas[1], address: `Ruta Principal N° ${500 + Math.floor(Math.random() * 1000)}, ${city}`, activeOffers: 15, logo: '📦', type: 'mayorista', description: 'Mayorista - Compra mínima $15.000' },
    { name: storeNames.mayoristas[2], address: `Av. Colón ${3000 + Math.floor(Math.random() * 4000)}, ${city}`, activeOffers: 12, logo: '🏬', type: 'mayorista', description: 'Mayorista - Desde 6 unidades' },
    { name: storeNames.comercios[0], address: `Av. Independencia ${500 + Math.floor(Math.random() * 2000)}, ${city}`, activeOffers: 5, logo: '🥦', type: 'comercio', description: 'Frutas y verduras frescas' },
    { name: storeNames.comercios[1], address: `Calle Mitre ${1500 + Math.floor(Math.random() * 1500)}, ${city}`, activeOffers: 3, logo: '🏪', type: 'almacen', description: 'Almacén de barrio' },
    { name: storeNames.comercios[2], address: `Av. Hipólito Yrigoyen ${800 + Math.floor(Math.random() * 2000)}, ${city}`, activeOffers: 2, logo: '🍞', type: 'comercio', description: 'Panadería artesanal' },
    { name: storeNames.comercios[3], address: `Calle Rivadavia ${600 + Math.floor(Math.random() * 1800)}, ${city}`, activeOffers: 4, logo: '🥩', type: 'comercio', description: 'Carnicería y fiambrería' },
  ];

  return fallbackStoreTemplates.map((template, index) => {
    // Generar posición aleatoria dentro del radio (distribución uniforme en disco)
    const angle = Math.random() * 2 * Math.PI;
    const distMeters = Math.sqrt(Math.random()) * (radiusKm * 1000);
    // Aproximación: 1 grado lat ≈ 111km, 1 grado lng ≈ 111km * cos(lat)
    const latOffset = (distMeters * Math.cos(angle)) / 111000;
    const lngOffset = (distMeters * Math.sin(angle)) / (111000 * Math.cos(userLat * Math.PI / 180));

    return {
      ...template,
      id: `fb_${index}`,
      distance: distMeters / 1000,
      lat: userLat + latOffset,
      lng: userLng + lngOffset,
    };
  });
}

// Generar ofertas mock para los comercios de fallback
export function generateFallbackOffers(
  stores: Store[],
  products: Product[]
): Offer[] {
  interface FallbackOfferTemplate {
    product: Product;
    normalPrice: number;
    offerPrice: number;
    store: string;
    storeId: string;
    storeType: StoreType;
    validUntil: string;
    category: string;
    minQuantity?: number;
    bulkPrice?: number;
  }
  const fallbackOffers: FallbackOfferTemplate[] = [
    { product: products[0], normalPrice: 1200, offerPrice: 890, store: '', storeId: '', storeType: 'supermercado', validUntil: '2026-08-15', category: 'Lácteos' },
    { product: products[1], normalPrice: 2500, offerPrice: 1790, store: '', storeId: '', storeType: 'supermercado', validUntil: '2026-08-14', category: 'Panadería' },
    { product: products[3], normalPrice: 1500, offerPrice: 990, store: '', storeId: '', storeType: 'supermercado', validUntil: '2026-08-16', category: 'Almacén' },
    { product: products[5], normalPrice: 4200, offerPrice: 3490, store: '', storeId: '', storeType: 'supermercado', validUntil: '2026-08-14', category: 'Almacén' },
    { product: products[6], normalPrice: 2800, offerPrice: 1990, store: '', storeId: '', storeType: 'supermercado', validUntil: '2026-08-12', category: 'Frutas y Verduras' },
    { product: products[7], normalPrice: 2200, offerPrice: 1490, store: '', storeId: '', storeType: 'supermercado', validUntil: '2026-08-15', category: 'Frutas y Verduras' },
    { product: products[9], normalPrice: 5500, offerPrice: 4290, store: '', storeId: '', storeType: 'supermercado', validUntil: '2026-08-14', category: 'Carnes' },
    { product: products[18], normalPrice: 3200, offerPrice: 2290, store: '', storeId: '', storeType: 'supermercado', validUntil: '2026-08-14', category: 'Limpieza' },
    { product: products[0], normalPrice: 1200, offerPrice: 650, store: '', storeId: '', storeType: 'mayorista', validUntil: '2026-08-18', category: 'Lácteos', minQuantity: 12, bulkPrice: 650 },
    { product: products[3], normalPrice: 1500, offerPrice: 720, store: '', storeId: '', storeType: 'mayorista', validUntil: '2026-08-20', category: 'Almacén', minQuantity: 10, bulkPrice: 720 },
    { product: products[6], normalPrice: 2800, offerPrice: 1500, store: '', storeId: '', storeType: 'comercio', validUntil: '2026-08-14', category: 'Frutas y Verduras' },
    { product: products[7], normalPrice: 2200, offerPrice: 1200, store: '', storeId: '', storeType: 'comercio', validUntil: '2026-08-14', category: 'Frutas y Verduras' },
    { product: products[10], normalPrice: 6200, offerPrice: 3900, store: '', storeId: '', storeType: 'comercio', validUntil: '2026-08-16', category: 'Carnes' },
  ];

  // Asignar stores aleatoriamente a las ofertas
  const supermarkets = stores.filter(s => s.type === 'supermercado');
  const mayoristas = stores.filter(s => s.type === 'mayorista');
  const comercios = stores.filter(s => s.type === 'comercio');

  return fallbackOffers.map((template, index) => {
    let storePool: Store[];
    if (template.storeType === 'mayorista') storePool = mayoristas;
    else if (template.storeType === 'comercio') storePool = comercios;
    else storePool = supermarkets;

    const store = storePool[index % storePool.length];
    return {
      ...template,
      id: `fbo_${index}`,
      store: store?.name || 'Comercio',
      storeId: store?.id || 'fb_0',
      distance: store?.distance || 0,
    };
  });
}
