import React from 'react';
import { FlatList, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/Text';
import { router } from 'expo-router';
import SvgIcon from '@/components/SvgIcon';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import ProductCard from '@/components/ProductCard';

export default function WishlistScreen() {
  const colors = useColors();
  const { items, toggle } = useWishlist();
  const { addItem } = useCart();
  const isWeb = Platform.OS === 'web';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={items}
        keyExtractor={p => p.id}
        numColumns={2}
        contentContainerStyle={[styles.grid, { paddingBottom: isWeb ? 100 : 120 }]}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={
          <Text style={[styles.count, { color: colors.mutedForeground }]}>
            {items.length} saved {items.length === 1 ? 'item' : 'items'}
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
              <SvgIcon name="heart-outline" size={48} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your wishlist is empty</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>Save items you love by tapping the heart icon</Text>
            <TouchableOpacity style={[styles.shopBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/')}>
              <Text style={[styles.shopBtnText, { color: colors.primaryForeground }]}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => router.push(`/product/${item.id}`)}
            isWishlisted={true}
            onWishlistToggle={() => { toggle(item); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            style={{ flex: 1 }}
          />
        )}
      />
      {items.length > 0 && (
        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, borderTopWidth: 1 }]}>
          <TouchableOpacity
            style={[styles.addAllBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              items.forEach(p => addItem(p));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.push('/cart');
            }}
          >
            <SvgIcon name="bag-add" size={18} color={colors.primaryForeground} />
            <Text style={[styles.addAllText, { color: colors.primaryForeground }]}>Add All to Cart</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  grid: { padding: 12, gap: 10 },
  row: { gap: 10 },
  count: { fontSize: 13, fontFamily: 'GoogleSans_400Regular', marginBottom: 10 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 32 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontFamily: 'GoogleSans_600SemiBold' },
  emptySubtitle: { fontSize: 14, fontFamily: 'GoogleSans_400Regular', textAlign: 'center' },
  shopBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  shopBtnText: { fontSize: 16, fontFamily: 'GoogleSans_600SemiBold' },
  footer: { padding: 16, paddingBottom: 32 },
  addAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  addAllText: { fontSize: 16, fontFamily: 'GoogleSans_600SemiBold' },
});
