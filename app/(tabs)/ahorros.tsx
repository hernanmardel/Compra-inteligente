import { useMemo, useState, useCallback } from "react";
import {
  Text,
  View,
  Pressable,
  FlatList,
  StyleSheet,
  Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { formatPrice } from "@/constants/mock-data";
import { getPurchaseHistory, type Purchase } from "@/constants/purchases-store";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

type Period = 'semana' | 'mes' | 'total';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // lunes como inicio
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function AhorrosScreen() {
  const colors = useColors();
  const [period, setPeriod] = useState<Period>('semana');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      void getPurchaseHistory().then((history) => {
        if (active) {
          setPurchases(history);
          setLoading(false);
        }
      });
      return () => { active = false; };
    }, []),
  );

  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const periodAmount = useMemo(() => {
    const inWeek = purchases.filter((p) => new Date(p.date) >= weekStart);
    const inMonth = purchases.filter((p) => new Date(p.date) >= monthStart);
    return {
      semana: inWeek.reduce((sum, p) => sum + p.totalSaved, 0),
      mes: inMonth.reduce((sum, p) => sum + p.totalSaved, 0),
      total: purchases.reduce((sum, p) => sum + p.totalSaved, 0),
    };
  }, [purchases]);

  // Últimas 6 semanas, incluida la actual
  const weeklyChart = useMemo(() => {
    const weeks: { label: string; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(weekStart.getTime() - i * 7 * DAY_MS);
      const end = new Date(start.getTime() + 7 * DAY_MS);
      const amount = purchases
        .filter((p) => {
          const d = new Date(p.date);
          return d >= start && d < end;
        })
        .reduce((sum, p) => sum + p.totalSaved, 0);
      weeks.push({ label: `${start.getDate()}/${start.getMonth() + 1}`, amount });
    }
    return weeks;
  }, [purchases, weekStart]);

  const maxAmount = Math.max(1, ...weeklyChart.map((w) => w.amount));

  const stats = useMemo(() => {
    const totalPurchases = purchases.length;
    const itemsWithOffer = purchases.flatMap((p) => p.items).filter((i) => i.normalUnitPrice && i.normalUnitPrice > i.unitPrice);
    const totalPaid = purchases.reduce((sum, p) => sum + p.totalPaid, 0);
    const totalSaved = purchases.reduce((sum, p) => sum + p.totalSaved, 0);
    const avgSavingsPercent = totalPaid + totalSaved > 0 ? Math.round((totalSaved / (totalPaid + totalSaved)) * 100) : 0;
    return { totalPurchases, offersUsed: itemsWithOffer.length, avgSavingsPercent };
  }, [purchases]);

  const renderHistoryItem = ({ item }: { item: Purchase }) => {
    const date = new Date(item.date);
    const dateLabel = date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    return (
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
              <Text className="text-sm font-semibold text-foreground">{item.store ?? "Compra"}</Text>
              <Text className="text-xs text-muted">{dateLabel} • {item.items.length} producto{item.items.length !== 1 ? 's' : ''}</Text>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-xs text-muted">{item.totalSaved > 0 ? "Ahorraste" : "Total"}</Text>
            <Text className="text-base font-bold" style={{ color: item.totalSaved > 0 ? colors.success : colors.foreground }}>
              {item.totalSaved > 0 ? formatPrice(item.totalSaved) : formatPrice(item.totalPaid)}
            </Text>
          </View>
        </View>
        <View className="mt-3 pt-3 border-t" style={{ borderTopColor: colors.border }}>
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-muted">Total comprado</Text>
            <Text className="text-xs font-semibold text-foreground">{formatPrice(item.totalPaid)}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (!loading && purchases.length === 0) {
    return (
      <ScreenContainer className="px-5">
        <View className="pt-4 pb-2">
          <Text className="text-2xl font-bold text-foreground">Mis Ahorros</Text>
          <Text className="text-sm text-muted mt-1">Tu historial de ahorro real</Text>
        </View>
        <View className="flex-1 items-center justify-center" style={{ paddingBottom: 80 }}>
          <Text style={{ fontSize: 48 }}>💰</Text>
          <Text className="text-base font-semibold text-foreground mt-4 text-center">Todavía no registraste ninguna compra</Text>
          <Text className="text-sm text-muted mt-2 text-center px-6">
            Armá tu lista, agregá ofertas y cuando termines de comprar tocá "Finalizar compra" para ver acá cuánto ahorraste.
          </Text>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/lista" as never);
            }}
            style={({ pressed }) => [styles.emptyCta, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
          >
            <Text className="text-white font-bold text-sm">Ir a mi lista</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="px-5">
      <FlatList
        data={purchases}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View className="pt-4 pb-2">
              <Text className="text-2xl font-bold text-foreground">Mis Ahorros</Text>
              <Text className="text-sm text-muted mt-1">Tu historial de ahorro real</Text>
            </View>

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

            <View className="mt-4 rounded-3xl p-6 items-center" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <Text className="text-sm text-muted">Ahorrado {period === 'semana' ? 'esta semana' : period === 'mes' ? 'este mes' : 'en total'}</Text>
              <Text className="text-4xl font-bold mt-2" style={{ color: colors.success }}>
                {formatPrice(periodAmount[period])}
              </Text>
            </View>

            <View className="mt-4 rounded-2xl p-4" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <Text className="text-sm font-semibold text-foreground mb-3">Tendencia de ahorro (6 semanas)</Text>
              <View className="flex-row items-end justify-between" style={{ height: 120 }}>
                {weeklyChart.map((w, i) => {
                  const height = (w.amount / maxAmount) * 100;
                  return (
                    <View key={i} className="flex-1 items-center mx-1">
                      <View
                        className="w-full rounded-t-lg"
                        style={{
                          height: `${height}%`,
                          backgroundColor: colors.primary,
                          minHeight: 4,
                        }}
                      />
                      <Text className="text-[10px] text-muted mt-2">{w.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View className="flex-row gap-3 mt-4">
              <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 20 }}>🛒</Text>
                <Text className="text-xs text-muted mt-1">Compras</Text>
                <Text className="text-lg font-bold text-foreground">{stats.totalPurchases}</Text>
              </View>
              <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 20 }}>🏷️</Text>
                <Text className="text-xs text-muted mt-1">Ofertas usadas</Text>
                <Text className="text-lg font-bold text-foreground">{stats.offersUsed}</Text>
              </View>
              <View className="flex-1 rounded-2xl p-4" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 20 }}>💰</Text>
                <Text className="text-xs text-muted mt-1">Prom. ahorro</Text>
                <Text className="text-lg font-bold text-foreground">{stats.avgSavingsPercent}%</Text>
              </View>
            </View>

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
  emptyCta: {
    marginTop: 20,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
});
