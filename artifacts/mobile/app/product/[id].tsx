import React, { useCallback, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Share,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { Icon, IconButton, LoadState, SectionTitle } from "@/components/ShopUI";
import { useColors } from "@/hooks/useColors";
import { useStorefront } from "@/hooks/useStorefront";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import {
  api,
  ApiProduct,
  ApiProductImage,
  ApiReview,
  mapApiProduct,
} from "@/services/api";
import { formatPrice } from "@/constants/data";
type Detail = ApiProduct & { images: ApiProductImage[]; reviews?: ApiReview[] };
export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    c = useColors(),
    insets = useSafeAreaInsets(),
    { width } = useWindowDimensions(),
    settings = useStorefront(),
    cart = useCart(),
    wishlist = useWishlist();
  const [raw, setRaw] = useState<Detail | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [slide, setSlide] = useState(0),
    [busy, setBusy] = useState(false),
    [added, setAdded] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setRaw(await api.products.get(id));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  if (loading || error || !raw)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.background,
          paddingTop: insets.top + 16,
        }}
      >
        <View style={{ padding: 20 }}>
          <IconButton
            name="arrow-back"
            label="Back"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/")
            }
          />
        </View>
        <LoadState
          loading={loading}
          error={error ? "load" : null}
          retry={load}
        />
      </View>
    );
  const p = mapApiProduct(raw),
    images = raw.images.length ? raw.images.map((i) => i.url) : [p.image];
  const add = async (buy = false) => {
    setBusy(true);
    try {
      await cart.addItem(p);
      setAdded(true);
      if (buy) router.push("/checkout");
    } catch (e: any) {
      Alert.alert("Could not add item", e.message || "Please try again");
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ backgroundColor: c.muted, paddingTop: insets.top + 12 }}>
          <View style={s.header}>
            <IconButton
              name="arrow-back"
              label="Back"
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/")
              }
            />
            <Text style={{ fontSize: 12, color: c.mutedForeground }}>
              THE GOOD FINDS COLLECTION
            </Text>
            <IconButton
              name="share-outline"
              label="Share product"
              onPress={() => {
                void Share.share({
                  message: `${p.name} on ${settings.storeName} — ${formatPrice(p.price)}`,
                });
              }}
            />
          </View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setSlide(Math.round(e.nativeEvent.contentOffset.x / width))
            }
          >
            {images.map((url, i) => (
              <Image
                key={i}
                source={{ uri: url }}
                contentFit="contain"
                style={{
                  width,
                  height: Math.min(width, 460),
                  marginVertical: 15,
                }}
              />
            ))}
          </ScrollView>
          <View style={s.dots}>
            {images.map((_, i) => (
              <View
                key={i}
                style={{
                  height: 5,
                  width: i === slide ? 20 : 5,
                  borderRadius: 3,
                  backgroundColor: i === slide ? c.primary : c.border,
                }}
              />
            ))}
          </View>
        </View>
        <View style={s.body}>
          <View style={s.brandRow}>
            <Text
              style={{ color: c.primary, fontSize: 11, letterSpacing: 1.5 }}
            >
              {p.seller.toUpperCase()}
            </Text>
            <TouchableOpacity
              accessibilityLabel="Toggle wishlist"
              onPress={() => wishlist.toggle(p)}
            >
              <Icon
                name={wishlist.isInWishlist(p.id) ? "heart" : "heart-outline"}
                color={
                  wishlist.isInWishlist(p.id) ? c.destructive : c.foreground
                }
              />
            </TouchableOpacity>
          </View>
          <Text style={[s.title, { color: c.foreground }]}>{p.name}</Text>
          <View
            style={{
              flexDirection: "row",
              gap: 6,
              alignItems: "center",
              marginTop: 12,
            }}
          >
            <Icon name="star" size={15} color={c.star} />
            <Text style={{ color: c.foreground, fontSize: 12 }}>
              {p.reviewCount
                ? `${p.rating.toFixed(1)} · ${p.reviewCount} rating${p.reviewCount === 1 ? "" : "s"}`
                : "No reviews yet"}
            </Text>
            <Text style={{ color: c.border }}> | </Text>
            <Text
              style={{
                color: p.stock > 0 ? c.success : c.destructive,
                fontSize: 12,
              }}
            >
              {p.stock > 0 ? "In stock" : "Out of stock"}
            </Text>
          </View>
          <View style={s.priceRow}>
            <Text style={[s.price, { color: c.foreground }]}>
              {formatPrice(p.price)}
            </Text>
            {p.discount > 0 && (
              <>
                <Text
                  style={{
                    color: c.mutedForeground,
                    textDecorationLine: "line-through",
                    fontSize: 15,
                  }}
                >
                  {formatPrice(p.originalPrice)}
                </Text>
                <Text style={s.discount}>Save {p.discount}%</Text>
              </>
            )}
          </View>
          <Text style={{ fontSize: 11, color: c.mutedForeground }}>
            Inclusive of all taxes
          </Text>
          <View style={[s.delivery, { borderColor: c.border }]}>
            <Icon name="cube-outline" size={23} color={c.primary} />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: c.foreground,
                  fontSize: 13,
                  fontFamily: "GoogleSans_600SemiBold",
                }}
              >
                {p.price >= settings.freeShippingThreshold
                  ? "Free delivery on this find"
                  : `Delivery ₹${settings.deliveryFee}`}
              </Text>
              <Text
                style={{ fontSize: 11, color: c.mutedForeground, marginTop: 4 }}
              >
                Shipping details confirmed at checkout
              </Text>
            </View>
            <Icon name="shield-checkmark-outline" size={23} color={c.primary} />
          </View>
          <SectionTitle title="A closer look" />
          <Text
            style={{ color: c.mutedForeground, fontSize: 14, lineHeight: 23 }}
          >
            {p.description || "More product details will be available soon."}
          </Text>
          {Object.keys(p.specifications).length > 0 && (
            <>
              <SectionTitle title="The details" />
              {Object.entries(p.specifications).map(([k, v]) => (
                <View key={k} style={[s.spec, { borderColor: c.border }]}>
                  <Text
                    style={{ fontSize: 12, color: c.mutedForeground, flex: 1 }}
                  >
                    {k}
                  </Text>
                  <Text style={{ fontSize: 12, color: c.foreground, flex: 1 }}>
                    {v}
                  </Text>
                </View>
              ))}
            </>
          )}
          <SectionTitle
            title="What people are saying"
            subtitle={
              p.reviewCount
                ? `${p.reviewCount} customer ratings`
                : "Be the first to share your experience"
            }
          />
          {raw.reviews?.map((r) => (
            <View key={r.id} style={[s.review, { borderColor: c.border }]}>
              <View style={{ flexDirection: "row", gap: 3 }}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Icon
                    key={i}
                    name={i < r.rating ? "star" : "star-outline"}
                    size={12}
                    color={c.star}
                  />
                ))}
              </View>
              {!!r.title && (
                <Text
                  style={{
                    color: c.foreground,
                    fontSize: 14,
                    marginTop: 8,
                    fontFamily: "GoogleSans_600SemiBold",
                  }}
                >
                  {r.title}
                </Text>
              )}
              <Text
                style={{
                  fontSize: 13,
                  color: c.mutedForeground,
                  lineHeight: 21,
                  marginTop: 5,
                }}
              >
                {r.comment}
              </Text>
              {r.isVerified && (
                <Text style={{ fontSize: 10, color: c.primary, marginTop: 8 }}>
                  Verified purchase
                </Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
      <View
        style={[
          s.bottom,
          {
            backgroundColor: c.card,
            borderColor: c.border,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <TouchableOpacity
          accessibilityLabel="Open shopping bag"
          onPress={() => router.push("/(tabs)/cart")}
          style={[s.bag, { borderColor: c.border }]}
        >
          <Icon name="bag-handle-outline" color={c.primary} />
          {cart.itemCount > 0 && (
            <Text style={{ fontSize: 9, color: c.primary }}>
              {cart.itemCount}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          disabled={busy || p.stock < 1}
          onPress={() => add()}
          style={[
            s.add,
            { borderColor: c.primary, opacity: p.stock < 1 ? 0.4 : 1 },
          ]}
        >
          <Text
            style={{
              color: c.primary,
              fontSize: 13,
              fontFamily: "GoogleSans_600SemiBold",
            }}
          >
            {busy ? "Adding…" : added ? "Added to bag ✓" : "Add to bag"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={busy || p.stock < 1}
          onPress={() => add(true)}
          style={[
            s.buy,
            { backgroundColor: c.primary, opacity: p.stock < 1 ? 0.4 : 1 },
          ]}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 13,
              fontFamily: "GoogleSans_600SemiBold",
            }}
          >
            Buy now
          </Text>
          <Icon name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dots: {
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    paddingBottom: 20,
  },
  body: { padding: 24 },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 27,
    lineHeight: 34,
    fontFamily: "GoogleSans_600SemiBold",
    letterSpacing: -0.8,
    marginTop: 8,
  },
  priceRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 5,
  },
  price: { fontSize: 27, fontFamily: "GoogleSans_700Bold" },
  discount: {
    fontSize: 11,
    color: "#936226",
    backgroundColor: "#fff3d9",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 5,
  },
  delivery: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginTop: 24,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  spec: {
    flexDirection: "row",
    gap: 20,
    borderBottomWidth: 1,
    paddingVertical: 13,
  },
  review: { borderTopWidth: 1, paddingVertical: 16 },
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
  },
  bag: {
    height: 48,
    minWidth: 42,
    borderWidth: 1,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  add: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  buy: {
    flex: 1,
    borderRadius: 11,
    flexDirection: "row",
    gap: 13,
    alignItems: "center",
    justifyContent: "center",
  },
});
