import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
export function Icon({
  name,
  color,
  size = 22,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  color?: string;
  size?: number;
}) {
  const c = useColors();
  return <Ionicons name={name} size={size} color={color || c.foreground} />;
}
