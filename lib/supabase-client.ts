import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** true una vez que se completó .env con las claves reales de Supabase (ver .env.example). */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // No tirar una excepción acá: la app tiene que poder seguir funcionando (SEPA vía JSON
  // estático, Google Places, etc.) aunque todavía no se haya configurado Supabase.
  console.warn(
    "[supabase] Faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY en .env - " +
    "las funciones que dependen de Supabase (portal de comercios compartido, ofertas " +
    "comunitarias, ranking) van a estar deshabilitadas hasta completarlas."
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
