import React, { useCallback, useRef, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Text } from "@/components/Text";
import { Icon } from "@/components/StoreIcon";
import { ProductGrid, LoadState } from "@/components/ShopUI";
import { StoreHeader, DepartmentTabs } from "@/components/StoreHeader";
import CampaignCarousel from "@/components/CampaignCarousel";
import CategoryThumbnail from "@/components/CategoryThumbnail";
import ProductFiltersBar, { ProductFilters } from "@/components/ProductFilters";
import { useColors } from "@/hooks/useColors";
import { useStorefront } from "@/hooks/useStorefront";
import { useOffers } from "@/hooks/useOffers";
import {
  api,
  ApiProduct,
  ApiCategory,
  ApiBanner,
  mapApiProduct,
} from "@/services/api";
import { formatPrice } from "@/constants/data";
export default function Home() {
  const c = useColors(),
    insets = useSafeAreaInsets(),
    { width } = useWindowDimensions(),
    store = useStorefront(),
    offers = useOffers();
  const requestSequence = useRef(0);
  const [cats, setCats] = useState<ApiCategory[]>([]),
    [banners, setBanners] = useState<ApiBanner[]>([]),
    [products, setProducts] = useState<ApiProduct[]>([]),
    [newest, setNewest] = useState<ApiProduct[]>([]),
    [best, setBest] = useState<ApiProduct[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [active, setActive] = useState(""),
    [filters, setFilters] = useState<ProductFilters>({ sort: "popular" }),
    [page, setPage] = useState(1),
    [more, setMore] = useState(false),
    [fetchingMore, setFetchingMore] = useState(false),
    [query, setQuery] = useState("");
  const params = {
    category: active,
    sort: filters.sort,
    ...(filters.minPrice !== undefined ? { minPrice: filters.minPrice } : {}),
    ...(filters.maxPrice !== undefined ? { maxPrice: filters.maxPrice } : {}),
    ...(filters.inStock ? { inStock: true } : {}),
  };
  const load = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setLoading(true);
    setError(false);
    try {
      const [p, cat, b, n, top] = await Promise.all([
        api.products.list({ ...params, limit: 20 }),
        api.categories.list(),
        api.banners.list(),
        api.products.list({ category: active, sort: "newest", limit: 4 }),
        api.products.list({ category: active, sort: "popular", limit: 4 }),
      ]);
      if (sequence !== requestSequence.current) return;
      setProducts(p.data);
      setCats(cat);
      setBanners(b);
      setNewest(n.data);
      setBest(top.data);
      setPage(1);
      setMore(p.data.length === 20);
    } catch {
      if (sequence === requestSequence.current) setError(true);
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [
    active,
    filters.sort,
    filters.minPrice,
    filters.maxPrice,
    filters.inStock,
  ]);
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        requestSequence.current++;
      };
    }, [load]),
  );
  const loadMore = async () => {
    const sequence = requestSequence.current;
    setFetchingMore(true);
    try {
      const result = await api.products.list({
        ...params,
        page: page + 1,
        limit: 20,
      });
      if (sequence !== requestSequence.current) return;
      setProducts((p) => [...p, ...result.data]);
      setPage((p) => p + 1);
      setMore(result.data.length === 20);
    } catch {
      setError(true);
    } finally {
      setFetchingMore(false);
    }
  };
  const roots = cats.filter(
      (cat) =>
        !cat.parentId || !cats.some((parent) => parent.id === cat.parentId),
    ),
    tiles = active ? cats.filter((cat) => cat.parentId === active) : roots,
    displayTiles = tiles.length ? tiles : roots;
  const browse = (sort: string, title: string, category = "") =>
      router.push({ pathname: "/products", params: { sort, title, category } }),
    featured = [
      ...new Map(
        [...newest, ...best, ...products].map((p) => [p.id, p]),
      ).values(),
    ].filter((p) => p.isFeatured),
    heroHeight = width * 0.79 + insets.top;
  const collection = (
    title: string,
    list: ApiProduct[],
    sort: string,
    tint: string,
  ) => (
    <TouchableOpacity
      key={title}
      accessibilityRole="button"
      accessibilityLabel={`View ${title}`}
      onPress={() => browse(sort, title, active)}
      style={[s.collection, { backgroundColor: tint }]}
    >
      <View style={s.collectionHead}>
        <Text
          style={{
            fontSize: 15,
            color: c.foreground,
            fontFamily: "GoogleSans_700Bold",
            fontStyle: "italic",
          }}
        >
          {title}
        </Text>
        <Icon name="chevron-forward" size={20} />
      </View>
      <View style={{ flexDirection: "row", gap: 3 }}>
        {list.slice(0, 2).map((p) => (
          <View key={p.id} style={{ flex: 1 }}>
            <Image
              source={{
                uri:
                  p.images?.[0]?.url ||
                  (p as ApiProduct & { imageUrl?: string }).imageUrl,
              }}
              style={{
                width: "100%",
                aspectRatio: 0.7,
                backgroundColor: c.secondary,
              }}
              contentFit="cover"
            />
            <Text
              style={{
                color: c.accent,
                fontFamily: "GoogleSans_700Bold",
                fontSize: 14,
                marginTop: 8,
                marginBottom: 4,
              }}
            >
              {formatPrice(Number(p.price))}
            </Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
  return (
    <ScrollView
      testID="home-screen"
      style={{ flex: 1, backgroundColor: c.background }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 25 }}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={load}
          tintColor={c.foreground}
        />
      }
    >
      <View
        style={{
          height: banners.length ? heroHeight : insets.top + 103,
          backgroundColor: c.card,
        }}
      >
        {banners.length > 0 && (
          <CampaignCarousel
            banners={banners}
            height={heroHeight}
            headerSpace={insets.top + 99}
          />
        )}
        <View style={[s.heroHeader, { paddingTop: insets.top }]}>
          <StoreHeader
            inverse={banners.length > 0}
            query={query}
            onChangeQuery={setQuery}
            onSearch={(q) =>
              router.push({ pathname: "/products", params: { q } })
            }
          />
          <DepartmentTabs
            inverse={banners.length > 0}
            tabs={[
              { id: "", name: "All" },
              ...roots.map((cat) => ({ id: cat.id, name: cat.name })),
              { id: "__fresh", name: "Fresh Fits" },
              { id: "__offers", name: "Offers" },
            ]}
            active={active}
            onChange={(id) =>
              id === "__offers"
                ? router.push("/offers")
                : id === "__fresh"
                  ? router.push("/(tabs)/fresh-fits")
                  : setActive(id)
            }
          />
        </View>
      </View>
      <View
        style={[
          s.benefits,
          { backgroundColor: "#FFF2D9", borderColor: "#F3DEC0" },
        ]}
      >
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() =>
            router.push({ pathname: "/help", params: { section: "shipping" } })
          }
          style={s.benefit}
        >
          <Icon name="car" size={17} color="#773E17" />
          <View>
            <Text style={s.benefitTitle}>Free Shipping</Text>
            <Text style={s.benefitSub}>
              Orders from ₹{store.freeShippingThreshold}*
            </Text>
          </View>
        </TouchableOpacity>
        <View style={{ height: 32, width: 1, backgroundColor: "#C6A47D" }} />
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() =>
            router.push({ pathname: "/help", params: { section: "returns" } })
          }
          style={s.benefit}
        >
          <Icon name="return-down-back" size={17} color="#773E17" />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={s.benefitTitle}>
              {store.returnsHeadline}
            </Text>
            <Text style={s.benefitSub}>Customer care is here to help</Text>
          </View>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() =>
          offers.length
            ? router.push("/offers")
            : browse("popular", "Exclusive Picks")
        }
        style={s.exclusive}
      >
        <View style={{ flex: 1 }}>
          <Text style={s.exclusiveTitle}>
            {store.storeName.toUpperCase()} Exclusive Picks
          </Text>
          <Text numberOfLines={2} style={s.exclusiveSub}>
            {store.announcement}
          </Text>
        </View>
        <View style={s.exclusiveCta}>
          <Text
            style={{
              color: "#C84267",
              fontSize: 9,
              fontFamily: "GoogleSans_700Bold",
              textAlign: "center",
            }}
          >
            {offers.length ? "SHOP\nSTORE OFFERS" : "EXPLORE\nTHE PICKS"}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={[s.categoryGrid, { backgroundColor: c.card }]}>
        {displayTiles.slice(0, 14).map((cat) => (
          <TouchableOpacity
            key={cat.id}
            onPress={() => browse("popular", cat.name, cat.slug)}
            style={s.categoryTile}
          >
            <CategoryThumbnail
              category={cat}
              size={Math.max(51, (width - 50) / 5)}
              radius={23}
            />
            <Text
              numberOfLines={2}
              style={{
                fontSize: 11,
                color: c.mutedForeground,
                textAlign: "center",
                marginTop: 7,
                minHeight: 28,
              }}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          accessibilityLabel="View all offers"
          onPress={() => router.push("/offers")}
          style={s.categoryTile}
        >
          <View
            style={[
              s.offerBubble,
              {
                width: Math.max(51, (width - 50) / 5),
                height: Math.max(51, (width - 50) / 5),
              },
            ]}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 11,
                textAlign: "center",
                fontFamily: "GoogleSans_700Bold",
              }}
            >
              Store{"\n"}Offers
            </Text>
          </View>
          <Text
            style={{ fontSize: 11, color: c.mutedForeground, marginTop: 7 }}
          >
            Offers
          </Text>
        </TouchableOpacity>
      </View>
      {roots.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.edits}
        >
          {roots.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              accessibilityLabel={`Shop ${cat.name}`}
              onPress={() => browse("popular", cat.name, cat.slug)}
              style={{ width: width * 0.225 }}
            >
              <CategoryThumbnail
                category={cat}
                size={width * 0.225}
                radius={2}
              />
              <View style={s.editCaption}>
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 11,
                    textAlign: "center",
                    fontFamily: "GoogleSans_600SemiBold",
                  }}
                  numberOfLines={1}
                >
                  {cat.name}
                </Text>
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 11,
                    textAlign: "center",
                    fontFamily: "GoogleSans_700Bold",
                    marginTop: 4,
                  }}
                >
                  Shop now
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      {(newest.length > 0 || best.length > 0) && (
        <View style={[s.collections, { backgroundColor: c.muted }]}>
          {collection("New Arrivals", newest, "newest", c.secondary)}
          {collection(
            "Best Sellers",
            best,
            "popular",
            c.background === "#FFFFFF" ? "#FFF0F0" : c.secondary,
          )}
        </View>
      )}
      {featured.length > 0 && (
        <View style={s.featured}>
          <Text
            style={{
              color: "#fff",
              fontSize: 16,
              fontFamily: "GoogleSans_700Bold",
              marginBottom: 12,
            }}
          >
            Featured offers
          </Text>
          <ProductGrid products={featured.slice(0, 2).map(mapApiProduct)} />
          {offers.length > 0 && (
            <Text style={{ fontSize: 9, color: "#FADFD5", paddingTop: 4 }}>
              * Coupon minimum spend and offer terms apply.
            </Text>
          )}
        </View>
      )}
      {banners.length > 1 && (
        <View style={{ paddingVertical: 8, backgroundColor: c.muted }}>
          <CampaignCarousel banners={banners.slice(1)} height={width * 0.38} />
        </View>
      )}
      <View style={{ paddingTop: 13, backgroundColor: c.card }}>
        <Text
          style={{
            fontSize: 19,
            color: c.foreground,
            textAlign: "center",
            fontFamily: "GoogleSans_600SemiBold",
            paddingVertical: 12,
          }}
        >
          Recommend
        </Text>
        <ProductFiltersBar value={filters} onChange={setFilters} />
      </View>
      <View style={{ paddingHorizontal: 6, paddingTop: 7 }}>
        {loading || error ? (
          <LoadState
            loading={loading}
            error={error ? "load" : null}
            retry={error ? load : undefined}
          />
        ) : products.length ? (
          <ProductGrid products={products.map(mapApiProduct)} />
        ) : (
          <LoadState empty="No products match these filters" />
        )}
        {more && !error && (
          <TouchableOpacity
            onPress={loadMore}
            disabled={fetchingMore}
            style={{ padding: 18, alignItems: "center" }}
          >
            <Text style={{ fontSize: 13, color: c.foreground }}>
              {fetchingMore ? "Loading…" : "Load more products"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  heroHeader: { position: "absolute", top: 0, left: 0, right: 0 },
  benefits: {
    margin: 6,
    paddingVertical: 9,
    borderWidth: 1,
    borderRadius: 3,
    flexDirection: "row",
    gap: 12,
  },
  benefit: {
    flex: 1,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 9,
    alignItems: "flex-start",
  },
  benefitTitle: {
    fontSize: 12,
    color: "#864718",
    fontFamily: "GoogleSans_700Bold",
  },
  benefitSub: { fontSize: 10, color: "#864718", marginTop: 2 },
  exclusive: {
    backgroundColor: "#FFF0F5",
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginTop: 3,
  },
  exclusiveTitle: {
    fontSize: 14,
    fontFamily: "GoogleSans_700Bold",
    color: "#D84570",
  },
  exclusiveSub: { fontSize: 9, color: "#D66787", marginTop: 3 },
  exclusiveCta: {
    borderWidth: 1,
    borderColor: "#D84570",
    borderRadius: 4,
    padding: 7,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 7,
    paddingVertical: 12,
  },
  categoryTile: {
    width: "20%",
    alignItems: "center",
    paddingHorizontal: 3,
    paddingBottom: 5,
  },
  offerBubble: {
    borderRadius: 25,
    backgroundColor: "#EF251F",
    alignItems: "center",
    justifyContent: "center",
  },
  edits: { padding: 6, gap: 7 },
  editCaption: {
    backgroundColor: "#080808",
    paddingVertical: 8,
    paddingHorizontal: 3,
  },
  collections: {
    flexDirection: "row",
    gap: 7,
    padding: 6,
    paddingVertical: 12,
  },
  collection: { flex: 1, padding: 6, borderRadius: 7 },
  collectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 11,
    marginTop: 6,
  },
  featured: {
    backgroundColor: "#8C2212",
    margin: 6,
    padding: 11,
    borderRadius: 4,
    marginVertical: 12,
  },
});
