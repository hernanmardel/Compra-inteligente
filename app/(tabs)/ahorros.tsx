import { useState } from "react";
import {
  Text,
  View,
  Pressable,
  FlatList,
  StyleSheet,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  SAVINGS_HISTORY,
  OFFERS,
  formatPrice,
  calculateSavings,
} from "@/constants/mock-data";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

type Period = 'semana' | 'mes' | 'total';

export default function AhorrosScreen() {
  const colors = useColors();
  const [period, setPeriod] = useState<Period>('semana');

  const periodAmount = {
    semana: 5800,
    mes: 23400,
    total: 89200,
  };

  const maxAmount = Math.max(...SAVINGS_HISTORY.map(s => s.amount));

  const purchaseHistory = [
    { id: 'h1', date: '2 ago', store: 'Supermercado Día', items: 8, saved: 3200, total: 18500 },
    { id: 'h2', date: '30 jul', store: 'Carrefour Express', items: 12, saved: 4100, total: 32000 },
    { id: 'h3', date: '28 jul', store: 'Chango Mas', items: 15, saved: 5800, total: 45000 },
    { id: 'h4', date: '25 jul', store: 'Coto Digital', items: 6, saved: 2400, total: 15800 },
    { id: 'h5', date: '22 jul', store: 'Supermercado Día', items: 10, saved: 3900, total: 22000 },
  ];

  const renderHistoryItem = ({ item }: { item: typeof purchaseHistory[0] }) => (
    <View
      className="rounded-2xl p-4 mb-3"
      style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: colors.primary + '10' }}>
            <Text style={{ fontSize: 18 }}>🛒</Text>
          </View>
          <View>
            <Text className="text-sm font-semibold text-foreground">{item.store}</Text>
            <Text className="text-xs text-muted">{item.date} • {item.items} productos</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-xs text-muted">Ahorraste</Text>
          <Text className="text-base font-bold" style={{ color: colors.success }}>
            {formatPrice(item.saved)}
          </Text>
        </View>
      </View>
      <View className="mt-3 pt-3 border-t" style={{ borderTopColor: colors.border }}>
        <View className="flex-row items-center justify-between">
          <Text className="text-xs text-muted">Total comprado</Text>
          <Text className="text-xs font-semibold text-foreground">{formatPrice(item.total)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScreenContainer className="px-5">
      <FlatList
        data={purchaseHistory}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View className="pt-4 pb-2">
              <Text className="text-2xl font-bold text-foreground">Mis Ahorros</Text>
              <Text className="text-sm text-muted mt-1">Tu historial de ahorro inteligente</Text>
            </View>

            {/* Period selector */}
            <View className="flex-row mt-4 rounded-2xl p-1" style={{ backgroundColor: colors.surface }}>
              {(['semana', 'mes', 'total'] as Period[]).map((p) => {
                const active = period === p;
                return (
                  <Pressable
                    key={p}
                    onPress={() => {
                      setPeriod(p);
                      if (Platform.OS !== "web") {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                    style={({ pressed }: { pressed: boolean }) => [
                      styles.periodBtn,
                      {
                        backgroundColor: active ? colors.primary : 'transparent',
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text
                      className="text-xs font-semibold capitalize"
                      style={{ color: active ? 'white' : colors.muted }}
                    >
                      {p === 'semana' ? 'Semana' : p === 'mes' ? 'Mes' : 'Total'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Big savings number */}
            <View className="mt-4 rounded-3xl p-6 items-center" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <Text className="text-sm text-muted">Ahorrado {period === 'semana' ? 'esta semana' : period === 'mes' ? 'este mes' : 'en total'}</Text>
              <Text className="text-4xl font-bold mt-2" style={{ color: colors.success }}>
                {formatPrice(periodAmount[period])}
              </Text>
              <View className="flex-row items-center gap-2 mt-3">
                <Text style={{ fontSize: 16 }}>📈</Text>
                <Text className="text-xs font-semibold" style={{ color: colors.success }}>
                  +18% vs período anterior
                </Text>
              </View>
            </View>

            {/* Chart */}
            <View className="mt-4 rounded-2xl p-4" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <Text className="text-sm font-semibold text-foreground mb-3">Tendencia de ahorro (6 semanas)</Text>
              <View className="flex-row items-end justify-between" style={{ height: 120 }}>
                {SAVINGS_HISTORY.map((s, i) => {
                  const height = (s.amount / maxAmount) * 100;
                  return (
                    <View key={i} className="flex-1 items-center mx-1">
                      <View
                        className="w-full rounded-t-lg"
                        style={{
                          height: `${height}%`,
                          backgroundColor: colors.primary,
                          minHeight: 8,
                        }}
                      />
                      <Text className="text-xs text-muted mt-2">{s.week}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Stats */}
            <View className="flex-row gap-3 mt-4">
              <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 20 }}>🛒</Text>
                <Text className="text-xs text-muted mt-1">Compras</Text>
                <Text className="text-lg font-bold text-foreground">24</Text>
              </View>
              <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 20 }}>🏷️</Text>
                <Text className="text-xs text-muted mt-1">Ofertas usadas</Text>
                <Text className="text-lg font-bold text-foreground">47</Text>
              </View>
              <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 20 }}>💰</Text>
                <Text className="text-xs text-muted mt-1">Prom. ahorro</Text>
                <Text className="text-lg font-bold text-foreground">22%</Text>
              </View>
            </View>

            {/* History */}
            <Text className="text-lg font-bold text-foreground mt-6 mb-3">Historial de compras</Text>
          </>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
});
