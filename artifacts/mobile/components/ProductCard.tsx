import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Text } from "@/components/Text";
import { Icon } from "@/components/StoreIcon";
import { useColors } from "@/hooks/useColors";
import { Product, formatPrice } from "@/constants/data";
interface Props {
  product: Product;
  onPress: () => void;
  isWishlisted?: boolean;
  onWishlistToggle?: () => void;
  style?: object;
}
export default function ProductCard({
  product: p,
  onPress,
  isWishlisted,
  onWishlistToggle,
  style,
}: Props) {
  const c = useColors();
  return (
    <View
      style={[
        s.card,
        { backgroundColor: c.card, borderColor: c.border },
        style,
      ]}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`View ${p.name}`}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <View style={[s.photo, { backgroundColor: c.muted }]}>
          <Image
            source={p.image}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            transition={150}
          />
          {p.discount > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{p.discount}% OFF</Text>
            </View>
          )}
        </View>
        <View style={s.info}>
          <Text
            style={{
              fontSize: 9,
              letterSpacing: 0.8,
              color: c.mutedForeground,
            }}
            numberOfLines={1}
          >
            {p.seller.toUpperCase()}
          </Text>
          <Text numberOfLines={2} style={[s.name, { color: c.foreground }]}>
            {p.name}
          </Text>
          <View
            style={{
              flexDirection: "row",
              gap: 4,
              alignItems: "center",
              minHeight: 15,
            }}
          >
            {p.reviewCount > 0 ? (
              <>
                <Icon name="star" size={11} color={c.star} />
                <Text style={{ fontSize: 10, color: c.foreground }}>
                  {p.rating.toFixed(1)}
                </Text>
                <Text style={{ fontSize: 9, color: c.mutedForeground }}>
                  ({p.reviewCount})
                </Text>
              </>
            ) : (
              <Text style={{ fontSize: 10, color: c.mutedForeground }}>
                New arrival
              </Text>
            )}
          </View>
          <View style={s.prices}>
            <Text style={[s.price, { color: c.foreground }]}>
              {formatPrice(p.price)}
            </Text>
            {p.originalPrice > p.price && (
              <Text
                style={{
                  fontSize: 10,
                  color: c.mutedForeground,
                  textDecorationLine: "line-through",
                }}
              >
                {formatPrice(p.originalPrice)}
              </Text>
            )}
          </View>
          {p.stock <= 0 && (
            <Text style={{ fontSize: 10, color: c.destructive }}>
              Out of stock
            </Text>
          )}
        </View>
      </TouchableOpacity>
      {onWishlistToggle && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={
            isWishlisted ? "Remove from wishlist" : "Save to wishlist"
          }
          accessibilityState={{ selected: !!isWishlisted }}
          onPress={onWishlistToggle}
          style={[s.heart, { backgroundColor: c.card }]}
        >
          <Icon
            name={isWishlisted ? "heart" : "heart-outline"}
            size={17}
            color={isWishlisted ? c.destructive : c.foreground}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  card: { borderRadius: 15, borderWidth: 1, overflow: "hidden" },
  photo: { aspectRatio: 0.95, width: "100%" },
  badge: {
    position: "absolute",
    top: 10,
    left: 9,
    backgroundColor: "#fff8eb",
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#92592b",
    fontSize: 8,
    fontFamily: "GoogleSans_700Bold",
  },
  heart: {
    position: "absolute",
    top: 8,
    right: 8,
    height: 29,
    width: 29,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { padding: 11, gap: 5 },
  name: {
    fontSize: 12,
    lineHeight: 18,
    minHeight: 36,
    fontFamily: "GoogleSans_500Medium",
  },
  prices: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    marginTop: 3,
  },
  price: { fontSize: 15, fontFamily: "GoogleSans_700Bold" },
});
