import { Text, View, Pressable } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface DataSourceBannerProps {
  /** true cuando el servidor no pudo conectar con Google Places ni OpenStreetMap y muestra datos de referencia. */
  isFallback?: boolean;
  /** true cuando la búsqueda de comercios directamente falló (red, servidor caído, etc). */
  isError?: boolean;
  onRetry?: () => void;
}

/** Aviso honesto sobre el origen de los datos de comercios/ofertas. Sin esto, un usuario
 * no puede distinguir "no hay comercios reales cerca" de "estás viendo datos de ejemplo"
 * o de "falló la conexión" — los tres casos hoy se ven idénticos. */
export function DataSourceBanner({ isFallback, isError, onRetry }: DataSourceBannerProps) {
  const colors = useColors();

  if (isError) {
    return (
      <View
        className="flex-row items-center justify-between rounded-2xl px-4 py-3 mt-3"
        style={{ backgroundColor: colors.error + "14", borderWidth: 1, borderColor: colors.error + "30" }}
      >
        <View className="flex-1 pr-2">
          <Text className="text-xs font-semibold" style={{ color: colors.error }}>No pudimos cargar los comercios</Text>
          <Text className="text-[11px] text-muted mt-0.5">Revisá tu conexión e intentá de nuevo</Text>
        </View>
        {onRetry && (
          <Pressable onPress={onRetry} style={{ backgroundColor: colors.error, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text className="text-white text-xs font-bold">Reintentar</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (isFallback) {
    return (
      <View
        className="flex-row items-center gap-2 rounded-2xl px-4 py-3 mt-3"
        style={{ backgroundColor: colors.warning + "14", borderWidth: 1, borderColor: colors.warning + "30" }}
      >
        <Text style={{ fontSize: 14 }}>ℹ️</Text>
        <Text className="text-[11px] flex-1" style={{ color: colors.warning }}>
          Mostrando comercios de referencia — no pudimos conectar con Google Maps ahora. Los precios y ubicaciones pueden no ser exactos.
        </Text>
      </View>
    );
  }

  return null;
}
