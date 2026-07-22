import React from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View, Image as RNImage } from 'react-native';
import { Text } from '@/components/Text';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import SvgIcon from '@/components/SvgIcon';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { formatPrice, SELLER_PRODUCTS } from '@/constants/data';

const totalRevenue = SELLER_PRODUCTS.reduce((s, p) => s + (p.sales * p.price), 0);
const totalSold = SELLER_PRODUCTS.reduce((s, p) => s + p.sales, 0);

const STATS = [
  { icon: 'trending-up', label: 'Revenue', value: formatPrice(totalRevenue), color: '#22C55E' },
  { icon: 'bag-handle', label: 'Total Sold', value: `${totalSold}`, color: '#3B82F6' },
  { icon: 'cube-outline', label: 'Products', value: `${SELLER_PRODUCTS.length}`, color: '#7C3AED' },
  { icon: 'star', label: 'Avg Rating', value: '4.5', color: '#F59E0B' },
];

export default function AdminDashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isWeb = Platform.OS === 'web';

  if (!user || user.role !== 'admin') {
    return (
      <View style={[styles.authPrompt, { backgroundColor: colors.background }]}>
        <SvgIcon name="shield-outline" size={56} color={colors.mutedForeground} />
        <Text style={[styles.authTitle, { color: colors.foreground }]}>Admin Access Only</Text>
        <TouchableOpacity style={[styles.authBtn, { backgroundColor: colors.primary }]} onPress={() => router.replace('/')}>
          <Text style={[styles.authBtnText, { color: colors.primaryForeground }]}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* Admin greeting */}
      <LinearGradient colors={['#7C3AED', '#4F46E5']} style={styles.sellerHeader}>
        <View style={styles.sellerAvatar}>
          <Text style={styles.sellerAvatarText}>{user.name.charAt(0)}</Text>
        </View>
        <View>
          <Text style={styles.sellerGreeting}>Hello, {user.name.split(' ')[0]}</Text>
          <Text style={styles.sellerBadge}>System Admin</Text>
        </View>
        <TouchableOpacity style={styles.addProductBtn} onPress={() => router.push('/seller/add-product')}>
          <SvgIcon name="add-circle" size={22} color="#fff" />
          <Text style={styles.addProductText}>Add Product</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Stats */}
      <View style={styles.statsGrid}>
        {STATS.map(stat => (
          <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
              <SvgIcon name={stat.icon as any} size={22} color={stat.color} />
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Products */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>My Products</Text>
          <TouchableOpacity>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>
        {SELLER_PRODUCTS.map(product => (
          <View key={product.id} style={[styles.productRow, { borderBottomColor: colors.border }]}>
            <RNImage source={{ uri: product.image }} style={styles.productImg} resizeMode="cover" />
            <View style={styles.productInfo}>
              <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={1}>{product.name}</Text>
              <View style={styles.productMeta}>
                <View style={[styles.stockBadge, { backgroundColor: product.stock > 10 ? colors.success + '20' : product.stock > 0 ? colors.warning + '20' : colors.destructive + '20' }]}>
                  <Text style={[styles.stockText, { color: product.stock > 10 ? colors.success : product.stock > 0 ? colors.warning : colors.destructive }]}>
                    {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                  </Text>
                </View>
                <Text style={[styles.soldText, { color: colors.mutedForeground }]}>{product.sales} sold</Text>
              </View>
            </View>
            <View style={styles.productRevenue}>
              <Text style={[styles.revenueValue, { color: colors.foreground }]}>{formatPrice(product.sales * product.price)}</Text>
              <Text style={[styles.revenueLabel, { color: colors.mutedForeground }]}>Revenue</Text>
            </View>
            <TouchableOpacity>
              <SvgIcon name="ellipsis-vertical" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <View style={{ height: isWeb ? 100 : 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  authPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  authTitle: { fontSize: 18, fontFamily: 'GoogleSans_600SemiBold', textAlign: 'center' },
  authBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  authBtnText: { fontSize: 16, fontFamily: 'GoogleSans_600SemiBold' },
  becomeHero: { padding: 32, alignItems: 'center', gap: 12 },
  becomeTitle: { fontSize: 22, fontFamily: 'GoogleSans_700Bold', color: '#fff', textAlign: 'center' },
  becomeSubtitle: { fontSize: 14, fontFamily: 'GoogleSans_400Regular', color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  features: { padding: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1 },
  featureIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontSize: 15, fontFamily: 'GoogleSans_600SemiBold' },
  featureDesc: { fontSize: 13, fontFamily: 'GoogleSans_400Regular', marginTop: 2 },
  becomeActions: { padding: 24, alignItems: 'center', gap: 10 },
  becomeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 36, paddingVertical: 16, borderRadius: 14 },
  becomeBtnText: { fontSize: 16, fontFamily: 'GoogleSans_600SemiBold' },
  becomeDisclaimer: { fontSize: 12, fontFamily: 'GoogleSans_400Regular' },
  sellerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20 },
  sellerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  sellerAvatarText: { fontSize: 22, fontFamily: 'GoogleSans_700Bold', color: '#fff' },
  sellerGreeting: { fontSize: 17, fontFamily: 'GoogleSans_700Bold', color: '#fff' },
  sellerBadge: { fontSize: 11, fontFamily: 'GoogleSans_500Medium', color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  addProductBtn: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  addProductText: { fontSize: 12, fontFamily: 'GoogleSans_600SemiBold', color: '#fff' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  statCard: { width: '47%', padding: 14, borderRadius: 16, gap: 8, alignItems: 'flex-start' },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, fontFamily: 'GoogleSans_700Bold' },
  statLabel: { fontSize: 12, fontFamily: 'GoogleSans_400Regular' },
  section: { margin: 0 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  sectionTitle: { fontSize: 16, fontFamily: 'GoogleSans_700Bold' },
  seeAll: { fontSize: 13, fontFamily: 'GoogleSans_600SemiBold' },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  productImg: { width: 52, height: 52, borderRadius: 12 },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontFamily: 'GoogleSans_500Medium' },
  productMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  stockBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  stockText: { fontSize: 11, fontFamily: 'GoogleSans_600SemiBold' },
  soldText: { fontSize: 11, fontFamily: 'GoogleSans_400Regular' },
  productRevenue: { alignItems: 'flex-end' },
  revenueValue: { fontSize: 14, fontFamily: 'GoogleSans_700Bold' },
  revenueLabel: { fontSize: 10, fontFamily: 'GoogleSans_400Regular' },
});
