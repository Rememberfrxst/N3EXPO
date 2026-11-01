import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Share,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { TextInput } from "./TextInput";
import { Text } from "./Text";
import { Icon } from "./StoreIcon";
import { useColors } from "@/hooks/useColors";
import { useCart } from "@/context/CartContext";
export function StoreHeader({
  query,
  onChangeQuery,
  onSearch,
  back = false,
  inverse = false,
  productName,
  onMore,
}: {
  query?: string;
  onChangeQuery?: (q: string) => void;
  onSearch?: (q: string) => void;
  back?: boolean;
  inverse?: boolean;
  productName?: string;
  onMore?: () => void;
}) {
  const c = useColors(),
    cart = useCart(),
    [local, setLocal] = useState(""),
    value = query ?? local,
    fg = inverse ? "#fff" : c.foreground;
  const search = () => {
    if (onSearch) onSearch(value);
    else router.push({ pathname: "/products", params: { q: value } });
  };
  return (
    <View style={s.header}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={back ? "Go back" : "Notifications"}
        hitSlop={8}
        onPress={() =>
          back
            ? router.canGoBack()
              ? router.back()
              : router.replace("/")
            : router.push("/notifications")
        }
      >
        <Icon
          name={back ? "chevron-back" : "mail-outline"}
          color={fg}
          size={25}
        />
      </TouchableOpacity>
      <View
        style={[
          s.search,
          {
            backgroundColor: inverse ? "#fff" : c.input,
            borderColor: inverse ? "#fff" : c.border,
          },
        ]}
      >
        <TextInput
          accessibilityLabel="Search products"
          placeholder="Search"
          placeholderTextColor="#777"
          value={value}
          onChangeText={onChangeQuery || setLocal}
          onSubmitEditing={search}
          returnKeyType="search"
          style={[s.input, { color: inverse ? "#111" : c.foreground }]}
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Submit search"
          onPress={search}
          style={[s.submit, { backgroundColor: back ? "transparent" : "#000" }]}
        >
          <Icon
            name="search-outline"
            size={24}
            color={back ? (inverse ? "#111" : c.foreground) : "#fff"}
          />
        </TouchableOpacity>
      </View>
      {back && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Cart, ${cart.itemCount} items`}
          hitSlop={7}
          onPress={() => router.push("/(tabs)/cart")}
          style={{ position: "relative" }}
        >
          <Icon name="cart-outline" color={fg} size={26} />
          {cart.itemCount > 0 && (
            <View style={[s.badge, { backgroundColor: c.accent }]}>
              <Text style={{ fontSize: 8, color: "#fff" }}>
                {cart.itemCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={productName ? "Share product" : "Wishlist"}
        hitSlop={8}
        onPress={() =>
          productName
            ? void Share.share({ message: productName })
            : router.push("/wishlist")
        }
      >
        <Icon
          name={productName ? "share-outline" : "heart-outline"}
          color={fg}
          size={25}
        />
      </TouchableOpacity>
      {back && onMore && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="More product options"
          onPress={onMore}
          hitSlop={8}
        >
          <Icon name="ellipsis-horizontal" color={fg} size={23} />
        </TouchableOpacity>
      )}
    </View>
  );
}
export function DepartmentTabs({
  tabs,
  active,
  onChange,
  inverse = false,
}: {
  tabs: { id: string; name: string }[];
  active: string;
  onChange: (id: string) => void;
  inverse?: boolean;
}) {
  const c = useColors();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.tabs}
    >
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab.id === active }}
          onPress={() => onChange(tab.id)}
          style={[
            s.tab,
            {
              borderBottomColor:
                tab.id === active
                  ? inverse
                    ? "#fff"
                    : c.foreground
                  : "transparent",
            },
          ]}
        >
          <Text
            style={{
              color: inverse
                ? "#fff"
                : tab.id === active
                  ? c.foreground
                  : c.mutedForeground,
              fontSize: 14,
              fontFamily:
                tab.id === active
                  ? "GoogleSans_700Bold"
                  : "GoogleSans_400Regular",
            }}
          >
            {tab.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    gap: 12,
  },
  search: {
    flex: 1,
    minWidth: 0,
    height: 37,
    borderWidth: 1,
    borderRadius: 23,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  input: {
    flex: 1,
    minWidth: 0,
    flexBasis: 0,
    paddingLeft: 14,
    paddingRight: 3,
    fontSize: 14,
    height: 36,
    outlineWidth: 0,
  } as any,
  submit: {
    width: 44,
    flexShrink: 0,
    height: 33,
    borderRadius: 22,
    marginRight: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tabs: { gap: 22, paddingHorizontal: 14, height: 42, alignItems: "center" },
  tab: { height: 37, paddingTop: 7, borderBottomWidth: 3 },
  badge: {
    position: "absolute",
    right: -3,
    top: -5,
    borderRadius: 8,
    minWidth: 13,
    height: 13,
    alignItems: "center",
    justifyContent: "center",
  },
});
