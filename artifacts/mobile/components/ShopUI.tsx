import React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text } from "./Text";
import { TextInput } from "./TextInput";
import { useColors } from "@/hooks/useColors";
import ProductCard from "./ProductCard";
import { Product } from "@/constants/data";
import { useWishlist } from "@/context/WishlistContext";
export { Icon } from "./StoreIcon";
import { Icon } from "./StoreIcon";
export function IconButton({
  name,
  onPress,
  label,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  label: string;
}) {
  const c = useColors();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[s.iconButton, { backgroundColor: c.card, borderColor: c.border }]}
    >
      <Icon name={name} size={21} />
    </TouchableOpacity>
  );
}
export function SearchField({
  value,
  onChangeText,
  placeholder = "Search for your next good find",
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}) {
  const c = useColors();
  return (
    <View
      style={[s.search, { backgroundColor: c.card, borderColor: c.border }]}
    >
      <Icon name="search-outline" size={20} color={c.mutedForeground} />
      <TextInput
        accessibilityLabel="Search products"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.mutedForeground}
        style={[s.input, { color: c.foreground }]}
      />
      {value ? (
        <TouchableOpacity
          accessibilityLabel="Clear search"
          onPress={() => onChangeText("")}
        >
          <Icon name="close-circle" color={c.mutedForeground} size={18} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
export function SectionTitle({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
}) {
  const c = useColors();
  return (
    <View style={s.section}>
      <View style={{ flex: 1 }}>
        <Text style={[s.title, { color: c.foreground }]}>{title}</Text>
        {subtitle && (
          <Text
            style={{ fontSize: 12, color: c.mutedForeground, marginTop: 3 }}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {onPress && (
        <TouchableOpacity
          accessibilityLabel={`View all ${title}`}
          onPress={onPress}
          style={s.more}
        >
          <Text
            style={{
              color: c.primary,
              fontSize: 12,
              fontFamily: "GoogleSans_600SemiBold",
            }}
          >
            View all
          </Text>
          <Icon name="arrow-forward" size={16} color={c.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}
export function ProductGrid({ products }: { products: Product[] }) {
  const w = useWishlist();
  return (
    <View style={s.grid}>
      {products.map((p) => (
        <View key={p.id} style={{ width: "48.5%" }}>
          <ProductCard
            product={p}
            onPress={() => router.push(`/product/${p.id}`)}
            isWishlisted={w.isInWishlist(p.id)}
            onWishlistToggle={() => w.toggle(p)}
          />
        </View>
      ))}
    </View>
  );
}
export function LoadState({
  loading,
  error,
  retry,
  empty = "Nothing here just yet",
}: {
  loading?: boolean;
  error?: string | null;
  retry?: () => void;
  empty?: string;
}) {
  const c = useColors();
  return (
    <View style={s.empty}>
      {loading ? (
        <ActivityIndicator color={c.primary} />
      ) : (
        <>
          <Icon
            name={error ? "cloud-offline-outline" : "bag-handle-outline"}
            size={38}
            color={c.mutedForeground}
          />
          <Text
            style={{
              color: c.foreground,
              fontSize: 16,
              marginTop: 12,
              textAlign: "center",
            }}
          >
            {error ? "We couldn’t load this page" : empty}
          </Text>
          {error && (
            <Text
              style={{
                color: c.mutedForeground,
                textAlign: "center",
                fontSize: 12,
                marginTop: 6,
              }}
            >
              Please check your connection and try again.
            </Text>
          )}
          {retry && (
            <TouchableOpacity
              onPress={retry}
              style={[s.retry, { backgroundColor: c.primary }]}
            >
              <Text style={{ color: "#fff" }}>Try again</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}
export function openBanner(b: { linkType?: string; linkValue?: string }) {
  if (!b.linkValue) {
    router.push("/(tabs)/search");
    return;
  }
  if (b.linkType === "product") router.push(`/product/${b.linkValue}`);
  else if (b.linkType === "category") router.push(`/category/${b.linkValue}`);
  else if (/^https?:\/\//i.test(b.linkValue)) void Linking.openURL(b.linkValue);
}
const s = StyleSheet.create({
  iconButton: {
    height: 42,
    width: 42,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
  },
  input: { flex: 1, fontSize: 13, height: 46, outlineWidth: 0 } as any,
  section: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 26,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: "GoogleSans_700Bold",
    letterSpacing: -0.6,
  },
  more: { flexDirection: "row", alignItems: "center", gap: 6 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 18,
  },
  empty: {
    padding: 36,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
  retry: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 18,
  },
});
