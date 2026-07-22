import React, { useState, useMemo, useEffect } from 'react';
import { FlatList, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/Text';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { Product } from '@/constants/data';
import { useWishlist } from '@/context/WishlistContext';
import SearchBarInput from '@/components/SearchBarInput';
import ProductCard from '@/components/ProductCard';
import { api, mapApiProduct, mapApiCategory } from '@/services/api';

const SORT_OPTIONS = [
  { key: 'relevance', label: 'Relevance' },
  { key: 'price_asc', label: 'Price: Low to High' },
  { key: 'price_desc', label: 'Price: High to Low' },
  { key: 'rating', label: 'Top Rated' },
  { key: 'discount', label: 'Biggest Discount' },
];

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { toggle, isInWishlist } = useWishlist();
  const isWeb = Platform.OS === 'web';
  const topPad = isWeb ? 67 : insets.top;

  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  const [selectedCat, setSelectedCat] = useState('');
  
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    api.products.list({ limit: 100 }).then(r => setAllProducts(r.data.map(mapApiProduct))).catch(console.error);
    api.categories.list().then(cats => setCategories(cats.map(mapApiCategory))).catch(console.error);
  }, []);

  const filtered = useMemo(() => {
    let results = [...allProducts];
    if (query.trim()) {
      const q = query.toLowerCase();
      results = results.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.seller.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.tags.some(t => t.includes(q))
      );
    }
    if (selectedCat) {
      results = results.filter(p => p.category === selectedCat);
    }
    switch (sortBy) {
      case 'price_asc': results.sort((a, b) => a.price - b.price); break;
      case 'price_desc': results.sort((a, b) => b.price - a.price); break;
      case 'rating': results.sort((a, b) => b.rating - a.rating); break;
      case 'discount': results.sort((a, b) => b.discount - a.discount); break;
    }
    return results;
  }, [query, sortBy, selectedCat, allProducts]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
        <SearchBarInput
          value={query}
          onChangeText={setQuery}
          onClear={() => setQuery('')}
          placeholder="Search products, brands & more"
          autoFocus={false}
        />
        {/* Sort chips */}
        <FlatList
          data={SORT_OPTIONS}
          keyExtractor={i => i.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortList}
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
        {/* Category filter */}
        <FlatList
          data={[{ id: '', name: 'All', slug: '', icon: '', color: '', color2: '' }, ...categories]}
          keyExtractor={i => i.id || 'all'}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.catChip, { backgroundColor: selectedCat === item.slug ? colors.accent : colors.secondary, borderColor: selectedCat === item.slug ? colors.accent : colors.border }]}
              onPress={() => setSelectedCat(selectedCat === item.slug ? '' : item.slug)}
            >
              <Text style={[styles.chipText, { color: selectedCat === item.slug ? '#fff' : colors.foreground }]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Results */}
      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        numColumns={2}
        contentContainerStyle={[styles.grid, { paddingBottom: isWeb ? 100 : 120 }]}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={
          <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
            {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No products found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>Try different keywords or filters</Text>
          </View>
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
  header: { paddingHorizontal: 16, paddingBottom: 10, gap: 10 },
  sortList: { gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: 'GoogleSans_500Medium' },
  grid: { padding: 12, gap: 10 },
  row: { gap: 10 },
  resultCount: { fontSize: 13, fontFamily: 'GoogleSans_400Regular', marginBottom: 10 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 18, fontFamily: 'GoogleSans_600SemiBold' },
  emptySubtitle: { fontSize: 14, fontFamily: 'GoogleSans_400Regular' },
});
