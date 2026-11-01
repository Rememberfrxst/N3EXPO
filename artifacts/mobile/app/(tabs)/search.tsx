import CategoryThumbnail from "@/components/CategoryThumbnail";
import React, { useCallback, useEffect, useState } from "react";
import { View, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { Icon, SearchField, ProductGrid, LoadState } from "@/components/ShopUI";
import { useColors } from "@/hooks/useColors";
import { api, ApiCategory, mapApiProduct } from "@/services/api";
import { Product } from "@/constants/data";
export default function Categories() {
  const c = useColors(),
    insets = useSafeAreaInsets(),
    params = useLocalSearchParams<{ q?: string; sort?: string }>();
  const [cats, setCats] = useState<ApiCategory[]>([]),
    [active, setActive] = useState(""),
    [query, setQuery] = useState(params.q || ""),
    [sort, setSort] = useState(params.sort || "newest"),
    [items, setItems] = useState<Product[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [page, setPage] = useState(1),
    [hasMore, setHasMore] = useState(false),
    [retry, setRetry] = useState(0);
  useFocusEffect(
    useCallback(() => {
      api.categories
        .list()
        .then(setCats)
        .catch(() => setError(true));
    }, []),
  );
  useEffect(() => {
    setPage(1);
  }, [query, active, sort]);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    const t = setTimeout(() => {
      api.products
        .list({ q: query, category: active, sort, page, limit: 20 })
        .then((p) => {
          if (alive) {
            setItems((prev) =>
              page === 1
                ? p.data.map(mapApiProduct)
                : [...prev, ...p.data.map(mapApiProduct)],
            );
            setHasMore(p.data.length === 20);
          }
        })
        .catch(() => {
          if (alive) setError(true);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, active, sort, page, retry]);
  const selected = cats.find((cat) => cat.id === active);
  return (
    <View
      testID="category-screen"
      style={{
        flex: 1,
        backgroundColor: c.background,
        paddingTop: insets.top + 18,
      }}
    >
      <View style={{ paddingHorizontal: 20, paddingBottom: 18 }}>
        <Text style={[s.eyebrow, { color: c.primary }]}>
          FIND YOUR EVERYDAY
        </Text>
        <Text style={[s.heading, { color: c.foreground }]}>Category</Text>
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder="Search products, brands and more"
        />
      </View>
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          borderTopWidth: 1,
          borderColor: c.border,
        }}
      >
        <ScrollView
          style={{ width: 86, maxWidth: 86, backgroundColor: c.card }}
          contentContainerStyle={{ paddingBottom: 105 }}
          showsVerticalScrollIndicator={false}
        >
          {[{ id: "", name: "All finds" }, ...cats].map((cat, i) => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ selected: active === cat.id }}
              key={cat.id}
              onPress={() => setActive(cat.id)}
              style={[
                s.cat,
                {
                  backgroundColor: active === cat.id ? c.secondary : c.card,
                  borderLeftColor:
                    active === cat.id ? c.primary : "transparent",
                },
              ]}
            >
              {cat.id ? (
                <CategoryThumbnail category={cat as ApiCategory} size={39} />
              ) : (
                <Icon
                  name="grid-outline"
                  size={26}
                  color={active === cat.id ? c.primary : c.mutedForeground}
                />
              )}

              <Text
                numberOfLines={2}
                style={{
                  color: active === cat.id ? c.primary : c.mutedForeground,
                  fontSize: 10,
                  textAlign: "center",
                  fontFamily: "GoogleSans_500Medium",
                }}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 14, paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.listHead}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: c.foreground,
                  fontSize: 18,
                  fontFamily: "GoogleSans_700Bold",
                }}
              >
                {selected?.name || "All finds"}
              </Text>
              <Text
                style={{ color: c.mutedForeground, fontSize: 10, marginTop: 3 }}
              >
                {query
                  ? `Results for “${query}”`
                  : "Explore something you’ll love"}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityLabel="Change product sort order"
              onPress={() =>
                setSort(
                  sort === "newest"
                    ? "price_asc"
                    : sort === "price_asc"
                      ? "price_desc"
                      : "newest",
                )
              }
              style={{ padding: 7 }}
            >
              <Icon name="swap-vertical-outline" color={c.primary} size={20} />
            </TouchableOpacity>
          </View>
          <Text
            style={{ fontSize: 10, color: c.mutedForeground, marginBottom: 12 }}
          >
            {sort === "price_asc"
              ? "Price: low to high"
              : sort === "price_desc"
                ? "Price: high to low"
                : "Newest arrivals"}
          </Text>
          {error ? (
            <LoadState error="load" retry={() => setRetry((n) => n + 1)} />
          ) : loading && page === 1 ? (
            <LoadState loading />
          ) : items.length ? (
            <>
              <ProductGrid products={items} />
              {hasMore && (
                <TouchableOpacity
                  disabled={loading}
                  onPress={() => setPage((p) => p + 1)}
                  style={{ padding: 18, alignItems: "center" }}
                >
                  <Text style={{ color: c.primary }}>
                    {loading ? "Loading…" : "Load more finds"}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <LoadState empty="No products found. Try another search." />
          )}
        </ScrollView>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  eyebrow: { fontSize: 9, letterSpacing: 1.5, marginBottom: 4 },
  heading: {
    fontSize: 31,
    fontFamily: "GoogleSans_700Bold",
    letterSpacing: -1,
    marginBottom: 18,
  },
  cat: {
    paddingVertical: 18,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 9,
    borderLeftWidth: 3,
  },
  listHead: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
});
