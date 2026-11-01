import React, { useCallback, useEffect, useState } from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./Text";
import { StoreHeader } from "./StoreHeader";
import { ProductGrid, LoadState } from "./ShopUI";
import ProductFiltersBar, { ProductFilters } from "./ProductFilters";
import { useColors } from "@/hooks/useColors";
import { api, mapApiProduct } from "@/services/api";
import type { Product } from "@/constants/data";
export default function ProductListing({
  categoryOverride,
  title: fixedTitle,
  defaultSort = "popular",
  embedded = false,
}: {
  categoryOverride?: string;
  title?: string;
  defaultSort?: string;
  embedded?: boolean;
}) {
  const c = useColors(),
    insets = useSafeAreaInsets(),
    params = useLocalSearchParams<{
      q?: string;
      category?: string;
      title?: string;
      sort?: string;
      slug?: string;
    }>(),
    category = categoryOverride ?? params.category ?? params.slug ?? "";
  const [query, setQuery] = useState(params.q || ""),
    [filters, setFilters] = useState<ProductFilters>({
      sort: params.sort || defaultSort,
    }),
    [page, setPage] = useState(1),
    [items, setItems] = useState<Product[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [more, setMore] = useState(false),
    [retry, setRetry] = useState(0),
    [categoryTitle, setCategoryTitle] = useState("");
  useEffect(() => {
    api.categories
      .list()
      .then((cats) =>
        setCategoryTitle(
          cats.find((cat) => cat.id === category || cat.slug === category)
            ?.name || "",
        ),
      )
      .catch(() => {});
  }, [category]);
  useEffect(
    () => setPage(1),
    [
      query,
      category,
      filters.sort,
      filters.minPrice,
      filters.maxPrice,
      filters.inStock,
    ],
  );
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(false);
      const timer = setTimeout(
        () =>
          api.products
            .list({
              q: query,
              category,
              sort: filters.sort,
              page,
              limit: 20,
              ...(filters.minPrice !== undefined
                ? { minPrice: filters.minPrice }
                : {}),
              ...(filters.maxPrice !== undefined
                ? { maxPrice: filters.maxPrice }
                : {}),
              ...(filters.inStock ? { inStock: true } : {}),
            })
            .then((result) => {
              if (active) {
                setItems((prev) =>
                  page === 1
                    ? result.data.map(mapApiProduct)
                    : [...prev, ...result.data.map(mapApiProduct)],
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
    }, [
      query,
      category,
      filters.sort,
      filters.minPrice,
      filters.maxPrice,
      filters.inStock,
      page,
      retry,
    ]),
  );
  return (
    <View
      testID="product-listing"
      style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}
    >
      <StoreHeader
        back={!embedded}
        query={query}
        onChangeQuery={setQuery}
        onSearch={setQuery}
      />
      <Text
        style={{
          paddingHorizontal: 12,
          paddingTop: 8,
          paddingBottom: 12,
          fontSize: 17,
          fontFamily: "GoogleSans_600SemiBold",
          color: c.foreground,
        }}
      >
        {query
          ? `Results for “${query}”`
          : fixedTitle || params.title || categoryTitle || "All products"}
      </Text>
      <ProductFiltersBar value={filters} onChange={setFilters} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 6, paddingBottom: 25 }}
      >
        {loading && page === 1 ? (
          <LoadState loading />
        ) : error ? (
          <LoadState error="load" retry={() => setRetry((n) => n + 1)} />
        ) : items.length ? (
          <ProductGrid products={items} />
        ) : (
          <LoadState empty="No products match your search" />
        )}
        {more && !error && (
          <TouchableOpacity
            onPress={() => setPage((p) => p + 1)}
            disabled={loading}
            style={{ padding: 20, alignItems: "center" }}
          >
            <Text style={{ color: c.foreground, fontSize: 13 }}>
              {loading ? "Loading…" : "Load more products"}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}
