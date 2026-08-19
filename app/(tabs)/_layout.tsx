import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useShoppingListCount } from "@/hooks/use-shopping-list-count";

/** Ícono del carrito con el círculo rojo de cantidad. Cada vez que el número
 * sube (se agregó un producto desde cualquier pantalla), el círculo pega un
 * salto corto para que se note el cambio sin tener que abrir la pestaña. */
function CartIconWithBadge({ color, size }: { color: string; size: number }) {
  const count = useShoppingListCount();
  const prevCount = useRef(count);
  const bump = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (count > prevCount.current) {
      bump.setValue(1.5);
      Animated.spring(bump, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }).start();
    }
    prevCount.current = count;
  }, [count, bump]);

  return (
    <View style={{ width: size, height: size }}>
      <IconSymbol size={size} name="cart.fill" color={color} />
      {count > 0 && (
        <Animated.View
          style={{
            position: "absolute",
            top: -4,
            right: -8,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            paddingHorizontal: 3,
            backgroundColor: "#E11D48",
            alignItems: "center",
            justifyContent: "center",
            transform: [{ scale: bump }],
          }}
        >
          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>{count > 99 ? "99+" : count}</Text>
        </Animated.View>
      )}
    </View>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      initialRouteName="ofertas"
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="ofertas"
        options={{
          title: "Ofertas",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="tag.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="lista"
        options={{
          title: "Lista",
          tabBarIcon: ({ color }) => <CartIconWithBadge size={28} color={color} />,
        }}
      />

      <Tabs.Screen
        name="ahorros"
        options={{
          title: "Ahorros",
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
