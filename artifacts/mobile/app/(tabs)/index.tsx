import CategoryThumbnail from "@/components/CategoryThumbnail";
import React, { useCallback, useState } from "react";
import {
  ScrollView,
  View,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Text } from "@/components/Text";
import {
  Icon,
  IconButton,
  SectionTitle,
  ProductGrid,
  LoadState,
  openBanner,
} from "@/components/ShopUI";
import { useColors } from "@/hooks/useColors";
import { useStorefront } from "@/hooks/useStorefront";
import {
  api,
  mapApiProduct,
  ApiCategory,
  ApiBanner,
  ApiProduct,
} from "@/services/api";
export default function Home() {
  const c = useColors(),
    insets = useSafeAreaInsets(),
    settings = useStorefront();
  const [products, setProducts] = useState<ApiProduct[]>([]),
    [categories, setCategories] = useState<ApiCategory[]>([]),
    [banners, setBanners] = useState<ApiBanner[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false);
  const load = useCallback(async () => {
    setError(false);
    try {
      const [p, cat, b] = await Promise.all([
        api.products.list({ limit: 40 }),
        api.categories.list(),
        api.banners.list(),
      ]);
      setProducts(p.data);
      setCategories(cat);
      setBanners(b);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  const featured = products.filter((p) => p.isFeatured),
    deals = products.filter((p) => Number(p.compareAtPrice) > Number(p.price));
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: 110,
      }}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={load}
          tintColor={c.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={s.pad}>
        <View style={s.header}>
          <View>
            <Text style={[s.eyebrow, { color: c.mutedForeground }]}>
              A LITTLE SOMETHING FOR EVERY DAY
            </Text>
            <Text style={[s.logo, { color: c.primary }]}>
              {settings.storeName.toLowerCase()}
              <Text style={{ color: c.accent }}>.</Text>
            </Text>
          </View>
          <IconButton
            name="heart-outline"
            label="Open wishlist"
            onPress={() => router.push("/wishlist")}
          />
        </View>
        <TouchableOpacity
          accessibilityLabel="Search products"
          onPress={() => router.push("/(tabs)/search")}
          style={[s.search, { backgroundColor: c.card, borderColor: c.border }]}
        >
          <Icon name="search-outline" color={c.mutedForeground} size={21} />
          <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
            What are you looking for today?
          </Text>
          <View style={{ flex: 1 }} />
          <Icon name="options-outline" size={19} color={c.primary} />
        </TouchableOpacity>
        <View style={s.delivery}>
          <Icon name="cube-outline" size={15} color={c.primary} />
          <Text style={{ fontSize: 11, color: c.mutedForeground }}>
            Free delivery on orders over ₹{settings.freeShippingThreshold}
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={{ fontSize: 11, color: c.primary }}>
            Made for your everyday
          </Text>
        </View>
      </View>
      {banners.length > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
        >
          {banners.map((b, i) => (
            <TouchableOpacity
              key={b.id}
              accessibilityLabel={b.title || "Shop collection"}
              onPress={() => openBanner(b)}
              style={[s.hero, { width: Platform.OS === "web" ? 340 : 330 }]}
            >
              <Image
                source={{ uri: b.imageUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
              />
              <LinearGradient
                colors={["rgba(5,34,30,.15)", "rgba(5,34,30,.85)"]}
                style={StyleSheet.absoluteFill}
              />
              <View style={s.heroInner}>
                <View style={s.heroTag}>
                  <Text style={s.heroTagText}>
                    {i === 0 ? "THE GRIPER EDIT" : "IN THE SPOTLIGHT"}
                  </Text>
                </View>
                <View style={{ flex: 1 }} />
                <Text style={s.heroTitle}>
                  {b.title || "Find your new favorite."}
                </Text>
                {!!b.subtitle && <Text style={s.heroSub}>{b.subtitle}</Text>}
                <View style={s.heroCta}>
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 12,
                      fontFamily: "GoogleSans_600SemiBold",
                    }}
                  >
                    Explore collection
                  </Text>
                  <Icon name="arrow-forward" color="#fff" size={18} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      <View style={s.pad}>
        <SectionTitle
          title="Shop by category"
          onPress={() => router.push("/(tabs)/search")}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 18 }}
        >
          {categories.map((cat, i) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => router.push(`/category/${cat.slug}`)}
              style={{ width: 70, alignItems: "center", gap: 8 }}
            >
              <View
                style={[
                  s.category,
                  {
                    backgroundColor: cat.color ? cat.color + "18" : c.secondary,
                  },
                ]}
              >
                <CategoryThumbnail category={cat} size={55} />
              </View>
              <Text
                numberOfLines={2}
                style={{
                  color: c.foreground,
                  textAlign: "center",
                  fontSize: 11,
                  fontFamily: "GoogleSans_500Medium",
                }}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <SectionTitle
          title={featured.length ? "The everyday edit" : "New & noteworthy"}
          subtitle="A few good finds, picked for you."
          onPress={() => router.push("/(tabs)/search")}
        />
        {loading || error ? (
          <LoadState
            loading={loading}
            error={error ? "load" : null}
            retry={error ? load : undefined}
          />
        ) : products.length ? (
          <ProductGrid
            products={(featured.length ? featured : products)
              .slice(0, 6)
              .map(mapApiProduct)}
          />
        ) : (
          <LoadState empty="New finds are on their way" />
        )}
        <View style={[s.note, { backgroundColor: c.secondary }]}>
          <Icon name="leaf-outline" color={c.primary} size={28} />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 16,
                color: c.primary,
                fontFamily: "GoogleSans_600SemiBold",
              }}
            >
              {settings.announcement}
            </Text>
            <Text
              style={{ fontSize: 12, color: c.mutedForeground, marginTop: 4 }}
            >
              Thoughtful choices for the way you live.
            </Text>
          </View>
        </View>
        {deals.length > 0 && (
          <>
            <SectionTitle
              title="Little prices. Big finds."
              subtitle="Offers worth a second look."
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/search",
                  params: { sort: "price_asc" },
                })
              }
            />
            <ProductGrid products={deals.slice(0, 4).map(mapApiProduct)} />
          </>
        )}
        <View style={s.footer}>
          <Text style={[s.logo, { color: c.border, fontSize: 42 }]}>
            griper.
          </Text>
          <Text
            style={{ fontSize: 11, color: c.mutedForeground, marginTop: 4 }}
          >
            YOUR EVERYDAY, A LITTLE BETTER.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  pad: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 1.2,
    fontFamily: "GoogleSans_600SemiBold",
  },
  logo: { fontSize: 34, letterSpacing: -1.8, fontFamily: "GoogleSans_700Bold" },
  search: {
    height: 49,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
  },
  delivery: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginVertical: 14,
  },
  hero: { height: 230, borderRadius: 20, overflow: "hidden" },
  heroInner: { flex: 1, padding: 24 },
  heroTag: {
    alignSelf: "flex-start",
    borderColor: "#ffffff70",
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 5,
  },
  heroTagText: { color: "#fff", fontSize: 9, letterSpacing: 1.5 },
  heroTitle: {
    fontSize: 32,
    lineHeight: 35,
    color: "#fff",
    fontFamily: "GoogleSans_600SemiBold",
    maxWidth: 260,
    letterSpacing: -1,
  },
  heroSub: { color: "#e2eee9", fontSize: 12, lineHeight: 18, marginTop: 7 },
  heroCta: {
    flexDirection: "row",
    gap: 20,
    alignItems: "center",
    marginTop: 17,
  },
  category: {
    height: 68,
    width: 68,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  note: {
    flexDirection: "row",
    gap: 14,
    padding: 22,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 30,
  },
  footer: { paddingTop: 40, paddingBottom: 10 },
});
