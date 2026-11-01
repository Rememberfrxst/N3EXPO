import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { Icon } from "@/components/StoreIcon";
import { StoreHeader, DepartmentTabs } from "@/components/StoreHeader";
import CategoryThumbnail from "@/components/CategoryThumbnail";
import { ProductGrid, LoadState } from "@/components/ShopUI";
import { useColors } from "@/hooks/useColors";
import { api, ApiCategory, mapApiProduct } from "@/services/api";
import type { Product } from "@/constants/data";
export default function Categories() {
  const c = useColors(),
    insets = useSafeAreaInsets(),
    { width } = useWindowDimensions(),
    params = useLocalSearchParams<{ q?: string }>();
  const [cats, setCats] = useState<ApiCategory[]>([]),
    [department, setDepartment] = useState(""),
    [section, setSection] = useState("new"),
    [query, setQuery] = useState(params.q || ""),
    [items, setItems] = useState<Product[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [page, setPage] = useState(1),
    [more, setMore] = useState(false),
    [retry, setRetry] = useState(0);
  const roots = cats.filter(
      (cat) =>
        !cat.parentId || !cats.some((parent) => parent.id === cat.parentId),
    ),
    children = department
      ? cats.filter((cat) => cat.parentId === department)
      : roots,
    rail = children.length ? children : roots,
    selected = cats.find((cat) => cat.id === section),
    selectedDepartment = cats.find((cat) => cat.id === department),
    category = selected?.id || department,
    railWidth = Math.min(180, Math.round(width * 0.34)),
    thumbSize = Math.min(72, Math.floor((width - railWidth - 32) / 3)),
    tiles = selected
      ? cats.filter((cat) => cat.parentId === selected.id)
      : children,
    visibleTiles = tiles.length ? tiles : rail;
  useFocusEffect(
    useCallback(() => {
      let active = true;
      api.categories
        .list()
        .then((result) => {
          if (active) setCats(result);
        })
        .catch(() => {
          if (active) setError(true);
        });
      return () => {
        active = false;
      };
    }, []),
  );
  useEffect(() => setPage(1), [query, department, section]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    const timer = setTimeout(
      () =>
        api.products
          .list({
            q: query,
            category,
            sort: section === "new" ? "newest" : "popular",
            page,
            limit: 20,
          })
          .then((result) => {
            if (active) {
              setItems((previous) =>
                page === 1
                  ? result.data.map(mapApiProduct)
                  : [...previous, ...result.data.map(mapApiProduct)],
              );
              setMore(result.data.length === 20);
            }
          })
          .catch(() => {
            if (active) setError(true);
          })
          .finally(() => {
            if (active) setLoading(false);
          }),
      220,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, category, section, page, retry]);
  const browse = (slug: string, title: string) =>
    router.push({ pathname: "/products", params: { category: slug, title } });
  return (
    <View
      testID="category-screen"
      style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}
    >
      <StoreHeader query={query} onChangeQuery={setQuery} onSearch={setQuery} />
      <View style={{ borderBottomWidth: 1, borderColor: c.border }}>
        <DepartmentTabs
          tabs={[
            { id: "", name: "All" },
            ...roots.map((cat) => ({ id: cat.id, name: cat.name })),
          ]}
          active={department}
          onChange={(id) => {
            setDepartment(id);
            setSection("new");
          }}
        />
      </View>
      <View style={{ flex: 1, flexDirection: "row" }}>
        <ScrollView
          style={{
            width: railWidth,
            maxWidth: railWidth,
            backgroundColor: c.muted,
          }}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {[
            { id: "new", name: "New In" },
            { id: "best", name: "Best Sellers" },
            ...rail,
          ].map((item) => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ selected: section === item.id }}
              key={item.id}
              onPress={() => setSection(item.id)}
              style={[
                s.nav,
                {
                  backgroundColor: section === item.id ? c.card : c.muted,
                  borderLeftColor:
                    section === item.id ? c.foreground : "transparent",
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: section === item.id ? c.foreground : c.mutedForeground,
                  fontFamily:
                    section === item.id
                      ? "GoogleSans_700Bold"
                      : "GoogleSans_400Regular",
                  lineHeight: 20,
                }}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[s.heading, { color: c.foreground }]}>
            {query
              ? `Results for “${query}”`
              : selected?.name ||
                `${section === "new" ? "New In" : "Best Sellers"}${selectedDepartment ? " " + selectedDepartment.name : ""}`}
          </Text>
          {!query && (
            <View style={s.tiles}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="View all products in this category"
                onPress={() =>
                  browse(
                    selected?.slug || selectedDepartment?.slug || "",
                    selected?.name ||
                      selectedDepartment?.name ||
                      "All products",
                  )
                }
                style={s.tile}
              >
                <View
                  style={{
                    height: thumbSize,
                    width: thumbSize,
                    borderRadius: thumbSize * 0.3,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: c.secondary,
                  }}
                >
                  <Icon name="grid-outline" size={28} />
                </View>
                <Text style={[s.tileLabel, { color: c.mutedForeground }]}>
                  View all
                </Text>
              </TouchableOpacity>
              {visibleTiles.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => browse(cat.slug, cat.name)}
                  style={s.tile}
                >
                  <CategoryThumbnail category={cat} size={thumbSize} />
                  <Text
                    numberOfLines={2}
                    style={[s.tileLabel, { color: c.mutedForeground }]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Text
            style={[
              s.heading,
              { color: c.foreground, marginTop: 8, marginBottom: 12 },
            ]}
          >
            {query ? "Products" : "Recommended"}
          </Text>
          {loading && page === 1 ? (
            <LoadState loading />
          ) : error ? (
            <LoadState error="load" retry={() => setRetry((n) => n + 1)} />
          ) : items.length ? (
            <ProductGrid products={items} compact />
          ) : (
            <LoadState empty="No products found" />
          )}
          {more && !error && (
            <TouchableOpacity
              disabled={loading}
              onPress={() => setPage((p) => p + 1)}
              style={{ padding: 16, alignItems: "center" }}
            >
              <Text style={{ fontSize: 12, color: c.foreground }}>
                {loading ? "Loading…" : "View more"}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  nav: {
    paddingHorizontal: 12,
    paddingVertical: 17,
    borderLeftWidth: 4,
    minHeight: 53,
  },
  heading: {
    fontSize: 14,
    fontFamily: "GoogleSans_600SemiBold",
    paddingTop: 16,
    marginBottom: 12,
    lineHeight: 20,
  },
  tiles: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 12,
    marginBottom: 13,
  },
  tile: { width: "33.333%", alignItems: "center", paddingHorizontal: 2 },
  tileLabel: {
    fontSize: 10,
    textAlign: "center",
    lineHeight: 14,
    marginTop: 6,
    minHeight: 28,
  },
});
