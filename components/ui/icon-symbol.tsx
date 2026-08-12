// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "cart.fill": "shopping-cart",
  "tag.fill": "local-offer",
  "map.fill": "map",
  "chart.bar.fill": "bar-chart",
  "plus": "add",
  "checkmark": "check",
  "checkmark.circle.fill": "check-circle",
  "circle": "radio-button-unchecked",
  "trash": "delete",
  "location.fill": "my-location",
  "mappin": "place",
  "clock.fill": "schedule",
  "arrow.right": "arrow-forward",
  "xmark": "close",
  "magnifyingglass": "search",
  "sparkles": "auto-awesome",
} as unknown as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
