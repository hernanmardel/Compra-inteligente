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

function assertConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Esta función necesita Supabase configurado (ver .env.example). Sin eso no hay dónde guardar lo que cargues."
    );
  }
}

/**
 * Devuelve el user id de la sesión actual, creando una sesión anónima si hace falta.
 * Compartido por todas las funciones que escriben en Supabase (portal de comercios,
 * ofertas comunitarias, ranking) para no repetir la misma lógica de login anónimo.
 */
export async function ensureUserId(): Promise<string> {
  assertConfigured();
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user?.id) {
    return sessionData.session.user.id;
  }
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error(
      `No se pudo crear una sesión: ${error?.message ?? "sin usuario"}. ` +
      "Si el error menciona 'anonymous sign-ins', hay que habilitarlos en el panel de Supabase " +
      "(Authentication → Settings → Allow anonymous sign-ins)."
    );
  }
  return data.user.id;
}
