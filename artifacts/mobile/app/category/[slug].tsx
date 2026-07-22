import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/Text';
import { useLocalSearchParams, router } from 'expo-router';
import SvgIcon from '@/components/SvgIcon';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { Product, Category } from '@/constants/data';
import { api, mapApiProduct, mapApiCategory } from '@/services/api';
import { useWishlist } from '@/context/WishlistContext';
import ProductCard from '@/components/ProductCard';

const SORT_OPTIONS = [
  { key: 'default', label: 'Default' },
  { key: 'price_asc', label: 'Price ↑' },
  { key: 'price_desc', label: 'Price ↓' },
  { key: 'rating', label: 'Top Rated' },
  { key: 'discount', label: 'Discount' },
];

export default function CategoryScreen() {
  const colors = useColors();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { toggle, isInWishlist } = useWishlist();
  const [sortBy, setSortBy] = useState('default');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    Promise.all([
      api.products.list({ category: slug, limit: 50 }),
      api.categories.list(),
    ])
      .then(([prodsData, catsData]) => {
        setAllProducts(prodsData.data.map(mapApiProduct));
        const cat = catsData.find(c => c.slug === slug);
        if (cat) setCategory(mapApiCategory(cat));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  const products = useMemo(() => {
    let list = [...allProducts];
    switch (sortBy) {
      case 'price_asc': list = list.sort((a, b) => a.price - b.price); break;
      case 'price_desc': list = list.sort((a, b) => b.price - a.price); break;
      case 'rating': list = list.sort((a, b) => b.rating - a.rating); break;
      case 'discount': list = list.sort((a, b) => b.discount - a.discount); break;
    }
    return list;
  }, [allProducts, sortBy]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={products}
        keyExtractor={p => p.id}
        numColumns={2}
        contentContainerStyle={[styles.grid, { paddingBottom: isWeb ? 100 : 120 }]}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={
          <View>
            {loading ? (
              <View style={styles.loadingHeader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : category ? (
              <View style={[styles.hero, { backgroundColor: category.color + '22' }]}>
                <View style={[styles.heroIcon, { backgroundColor: category.color }]}>
                  <SvgIcon name={category.icon as any} size={32} color="#fff" />
                </View>
                <Text style={[styles.heroTitle, { color: colors.foreground }]}>{category.name}</Text>
                <Text style={[styles.heroCount, { color: colors.mutedForeground }]}>{products.length} products</Text>
              </View>
            ) : null}
            <FlatList
              data={SORT_OPTIONS}
              keyExtractor={i => i.key}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sortRow}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.chip, { backgroundColor: sortBy === item.key ? colors.primary : colors.muted, borderColor: sortBy === item.key ? colors.primary : colors.border }]}
                  onPress={() => setSortBy(item.key)}
                >
                  <Text style={[styles.chipText, { color: sortBy === item.key ? colors.primaryForeground : colors.foreground }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No products found</Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={[styles.back, { color: colors.primary }]}>Go Back</Text>
              </TouchableOpacity>
            </View>
          )
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => router.push(`/product/${item.id}`)}
            isWishlisted={isInWishlist(item.id)}
            onWishlistToggle={() => { toggle(item); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={{ flex: 1 }}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  grid: { padding: 12, gap: 10 },
  row: { gap: 10 },
  loadingHeader: { padding: 20, alignItems: 'center' },
  hero: { margin: 0, marginBottom: 12, padding: 20, alignItems: 'center', gap: 8 },
  heroIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 22, fontFamily: 'GoogleSans_700Bold' },
  heroCount: { fontSize: 13, fontFamily: 'GoogleSans_400Regular' },
  sortRow: { gap: 8, paddingHorizontal: 0, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: 'GoogleSans_500Medium' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: 'GoogleSans_600SemiBold' },
  back: { fontSize: 15, fontFamily: 'GoogleSans_600SemiBold' },
});
