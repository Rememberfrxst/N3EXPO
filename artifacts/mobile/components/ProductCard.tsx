import React, { useEffect, useState } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Text } from "./Text";
import { Icon } from "./StoreIcon";
import { useColors } from "@/hooks/useColors";
import { useCart } from "@/context/CartContext";
import { useOffers, bestOffer, offerPrice } from "@/hooks/useOffers";
import { Product, formatPrice } from "@/constants/data";
interface Props {
  product: Product;
  onPress: () => void;
  isWishlisted?: boolean;
  onWishlistToggle?: () => void;
  style?: object;
  compact?: boolean;
}
export default function ProductCard({
  product: p,
  onPress,
  isWishlisted,
  onWishlistToggle,
  style,
  compact = false,
}: Props) {
  const c = useColors(),
    cart = useCart(),
    offers = useOffers(),
    offer = bestOffer(p.price, offers);
  const [busy, setBusy] = useState(false),
    [added, setAdded] = useState(false),
    [failed, setFailed] = useState(false),
    [error, setError] = useState("");
  useEffect(() => setFailed(false), [p.image]);
  const quickAdd = async () => {
    if (p.variantCount) {
      onPress();
      return;
    }
    setBusy(true);
    setError("");
    try {
      await cart.addItem(p);
      setAdded(true);
    } catch (e: any) {
      setError(e.message || "Could not add item");
    } finally {
      setBusy(false);
    }
  };
  const button = (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={
        p.variantCount
          ? `Choose options for ${p.name}`
          : `Add ${p.name} to cart`
      }
      disabled={busy || (!p.variantCount && p.stock < 1)}
      onPress={quickAdd}
      style={[
        s.cart,
        {
          borderColor: compact ? "transparent" : c.foreground,
          backgroundColor: compact ? "rgba(255,255,255,.88)" : c.card,
          opacity: !p.variantCount && p.stock < 1 ? 0.4 : 1,
        },
      ]}
    >
      <Icon
        name={added ? "checkmark" : "cart-outline"}
        size={19}
        color={compact ? "#111" : c.foreground}
      />
    </TouchableOpacity>
  );
  return (
    <View style={[s.card, { backgroundColor: c.card }, style]}>
      <View style={[s.photo, { backgroundColor: c.muted }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`View ${p.name}`}
          onPress={onPress}
          activeOpacity={0.94}
          style={StyleSheet.absoluteFill}
        >
          {p.image && !failed ? (
            <Image
              source={p.image}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={120}
              onError={() => setFailed(true)}
            />
          ) : (
            <View style={s.placeholder}>
              <Icon name="image-outline" size={35} color={c.mutedForeground} />
            </View>
          )}
        </TouchableOpacity>
        {onWishlistToggle && !compact && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`${isWishlisted ? "Remove" : "Save"} ${p.name} ${isWishlisted ? "from" : "to"} wishlist`}
            accessibilityState={{ selected: !!isWishlisted }}
            onPress={onWishlistToggle}
            style={s.heart}
          >
            <Icon
              name={isWishlisted ? "heart" : "heart-outline"}
              size={19}
              color="#111"
            />
          </TouchableOpacity>
        )}
        {compact && <View style={s.compactButton}>{button}</View>}
      </View>
      <View
        style={[
          s.info,
          compact && { paddingHorizontal: 2, paddingVertical: 8 },
        ]}
      >
        {!compact && (
          <TouchableOpacity onPress={onPress}>
            <Text numberOfLines={2} style={[s.name, { color: c.foreground }]}>
              {p.discount > 0 && (
                <Text style={{ color: c.accent, fontSize: 10 }}>
                  -{p.discount}%{" "}
                </Text>
              )}
              {p.name}
            </Text>
          </TouchableOpacity>
        )}
        <View style={s.priceRow}>
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              gap: 5,
              alignItems: "baseline",
              flexWrap: "wrap",
            }}
          >
            <Text
              style={[
                s.price,
                { color: c.accent, fontSize: compact ? 16 : 17 },
              ]}
            >
              {formatPrice(p.price)}
            </Text>
            {!compact && p.originalPrice > p.price && (
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
          {!compact && button}
        </View>
        {!compact && offer && offerPrice(p.price, offer) < p.price && (
          <Text style={{ fontSize: 10, color: "#B8753F", marginTop: 7 }}>
            Offer Price{" "}
            <Text style={{ fontFamily: "GoogleSans_600SemiBold" }}>
              {formatPrice(offerPrice(p.price, offer))}*
            </Text>
          </Text>
        )}
        {!compact && p.stock < 1 && !p.variantCount && (
          <Text
            style={{ fontSize: 10, color: c.mutedForeground, marginTop: 5 }}
          >
            Out of stock
          </Text>
        )}
        {!!error && (
          <Text
            accessibilityRole="alert"
            style={{ fontSize: 10, color: c.destructive, marginTop: 5 }}
          >
            {error}
          </Text>
        )}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  card: { overflow: "hidden", borderRadius: 2 },
  photo: { aspectRatio: 0.76, width: "100%" },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  info: { paddingHorizontal: 5, paddingTop: 7, paddingBottom: 13 },
  name: { fontSize: 11, lineHeight: 18, minHeight: 36 },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  price: { fontFamily: "GoogleSans_700Bold" },
  heart: {
    position: "absolute",
    bottom: 8,
    right: 8,
    height: 28,
    width: 28,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  cart: {
    height: 27,
    minWidth: 35,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  compactButton: { position: "absolute", bottom: 10, right: 9 },
});
