import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useCart } from "@/context/CartContext";
export default function TabLayout() {
  const c = useColors(),
    cart = useCart(),
    insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.foreground,
        tabBarInactiveTintColor: c.mutedForeground,
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopColor: c.border,
          borderTopWidth: 1,
          display: "flex",
          height: Platform.OS === "web" ? 70 : 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Platform.OS === "web" ? 7 : Math.max(insets.bottom, 8),
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontFamily: "GoogleSans_500Medium",
          fontSize: 11,
          lineHeight: 16,
          marginTop: 0,
        },
        tabBarIconStyle: { height: 28 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Shop",
          tabBarAccessibilityLabel: "Shop",
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-outline" size={25} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Category",
          tabBarAccessibilityLabel: "Category",
          tabBarIcon: ({ color }) => (
            <Ionicons name="grid-outline" size={25} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="fresh-fits"
        options={{
          title: "Fresh Fits",
          tabBarAccessibilityLabel: "Fresh Fits",
          tabBarIcon: ({ color }) => (
            <Ionicons name="shirt-outline" size={25} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarAccessibilityLabel: "Cart",
          tabBarBadge: cart.itemCount || undefined,
          tabBarBadgeStyle: {
            backgroundColor: c.foreground,
            color: c.card,
            fontSize: 8,
          },
          tabBarIcon: ({ color }) => (
            <Ionicons name="cart-outline" size={27} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Me",
          tabBarAccessibilityLabel: "Me",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-outline" size={25} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="orders" options={{ href: null }} />
    </Tabs>
  );
}
