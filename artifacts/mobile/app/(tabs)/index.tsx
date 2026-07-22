import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { Text } from '@/components/Text';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SvgIcon from '@/components/SvgIcon';
import { SvgXml } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useColors } from '@/hooks/useColors';
import { Product, BANNERS, CATEGORIES, PRODUCTS } from '@/constants/data';
import { api, mapApiProduct, mapApiCategory, checkApiConnection, getApiBaseUrl } from '@/services/api';
import { useWishlist } from '@/context/WishlistContext';
import BannerCarousel from '@/components/BannerCarousel';
import CategoryCard from '@/components/CategoryCard';
import ProductCard from '@/components/ProductCard';

const GRIPER_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 18.950000762939453 88.75 35" data-asc="1.079" width="88.75" height="35"><defs/><g fill="#ffffff"><g transform="translate(0, 0)"><path d="M16.80 53.95L15.75 48.40L7.85 48.40L6.80 53.95L0 53.95L6.75 18.95L17.10 18.95L23.50 53.95L16.80 53.95M11.70 25.45L9.75 37.10L8.65 43.05L14.90 43.05L13.75 37.10L11.80 25.45L11.70 25.45ZM31.90 18.95L35.45 33.20L35.65 33.20L39.20 18.95L46.10 18.95L41.30 35.65L46.45 53.95L39.35 53.95L35.65 38.95L35.45 38.95L31.75 53.95L24.65 53.95L29.80 35.65L25 18.95L31.90 18.95ZM49.50 53.95L49.50 18.95L67.45 18.95L67.45 24.95L56.35 24.95L56.35 33.30L66.25 33.30L66.25 39.10L56.35 39.10L56.35 48.15L67.65 48.15L67.65 53.95L49.50 53.95ZM71.50 53.95L71.50 18.95L78.35 18.95L78.35 48.15L88.75 48.15L88.75 53.95L71.50 53.95Z"/></g></g></svg>`;

function renderGrid(products: Product[], toggle: (p: Product) => void, isInWishlist: (id: string) => boolean) {
  const pairs: Product[][] = [];
  for (let i = 0; i < products.length; i += 2) {
    pairs.push(products.slice(i, i + 2));
  }
  return pairs.map((pair, idx) => (
    <View key={idx} style={styles.row}>
      {pair.map(p => (
        <ProductCard
          key={p.id}
          product={p}
          onPress={() => router.push(`/product/${p.id}`)}
          isWishlisted={isInWishlist(p.id)}
          onWishlistToggle={() => { toggle(p); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={{ flex: 1 }}
        />
      ))}
      {pair.length === 1 && <View style={{ flex: 1 }} />}
    </View>
  ));
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { toggle, isInWishlist } = useWishlist();
  const isWeb = Platform.OS === 'web';
  const topPad = isWeb ? 67 : insets.top;

  const [locationStr, setLocationStr] = useState('Detecting location...');
  const [locationIcon, setLocationIcon] = useState<'location' | 'location-outline'>('location-outline');

  const [banners, setBanners] = useState<any[]>(BANNERS);
  const [categories, setCategories] = useState<any[]>(CATEGORIES);
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());

  const deals = products.slice(0, 8);
  const trendingFiltered = products.filter(p => p.category === 'mobiles' || p.category === 'electronics' || p.category === 'smartphones' || p.category === 'laptops');
  const trending = (trendingFiltered.length > 0 ? trendingFiltered : products).slice(0, 8);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) setLocationStr('India');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const results = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (!cancelled && results.length > 0) {
          const r = results[0];
          const pincode = r.postalCode ?? '';
          const city = r.city ?? r.district ?? r.subregion ?? '';
          const country = r.country === 'India' ? 'India' : (r.isoCountryCode ?? r.country ?? '');
          if (pincode && city) {
            setLocationStr(`${pincode} ${city}/${country}`);
          } else if (pincode) {
            setLocationStr(`${pincode} ${country}`);
          } else if (city) {
            setLocationStr(`${city}, ${country}`);
          } else {
            setLocationStr(country || 'India');
          }
          setLocationIcon('location');
        }
      } catch {
        if (!cancelled) setLocationStr('India');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const loadCatalog = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setApiUrl(getApiBaseUrl());

    const connection = await checkApiConnection();
    if (!connection.ok) {
      setLoadError(
        `Cannot reach API at ${connection.url}. ${connection.error ?? ''} ` +
        'Make sure the API server is running and your phone is on the same Wi-Fi network.'
      );
      setBanners([]);
      setCategories([]);
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      const [bannersData, catsData, prodsData] = await Promise.all([
        api.banners.list(),
        api.categories.list(),
        api.products.list({ limit: 20 }),
      ]);

      setBanners(
        bannersData.map((b: any) => ({
          id: b.id,
          image: { uri: b.imageUrl },
          title: b.title ?? '',
          subtitle: b.subtitle ?? '',
          color: '#1a1a2e',
        }))
      );
      setCategories(catsData.map(mapApiCategory));
      setProducts(prodsData.data.map(mapApiProduct));
    } catch (err: any) {
      console.warn('[Home] Failed to load catalog from API:', err?.message ?? err);
      setLoadError(err?.message ?? 'Failed to load catalog from API');
      setBanners([]);
      setCategories([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* Brand Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.primary }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.logoWrap}>
              <SvgXml xml={GRIPER_LOGO_SVG} width={76} height={28} />
            </View>
            <TouchableOpacity style={styles.locationRow} activeOpacity={0.75} onPress={async () => {
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status !== 'granted') return;
              const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
              const results = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
              if (results.length > 0) {
                const r = results[0];
                const pincode = r.postalCode ?? '';
                const city = r.city ?? r.district ?? '';
                const country = r.country === 'India' ? 'India' : (r.isoCountryCode ?? '');
                setLocationStr(pincode && city ? `${pincode} ${city}/${country}` : city ? `${city}, ${country}` : country || 'India');
                setLocationIcon('location');
              }
            }}>
              <SvgIcon name={locationIcon} size={12} color="rgba(255,255,255,0.9)" />
              <Text style={styles.location} numberOfLines={1}>{locationStr}</Text>
              <SvgIcon name="chevron-down" size={10} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/wishlist')}>
              <SvgIcon name="heart-outline" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <SvgIcon name="notifications-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.searchTouch, { backgroundColor: '#fff' }]}
          onPress={() => router.push('/search')}
          activeOpacity={0.88}
        >
          <SvgIcon name="search" size={18} color={colors.mutedForeground} />
          <Text style={[styles.searchHint, { color: colors.mutedForeground }]}>Search products, brands & more</Text>
          <SvgIcon name="mic-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Offers stripe */}
      <View style={[styles.stripe, { backgroundColor: colors.accent }]}>
        <Text style={styles.stripeText}>FREE delivery on orders above ₹499  •  Use code GRIPER10 for 10% off</Text>
      </View>

      {loading && (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={colors.primary} />
      )}

      {!loading && loadError && (
        <View style={[styles.errorBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.errorTitle, { color: colors.foreground }]}>Could not load store data</Text>
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>{loadError}</Text>
          <Text style={[styles.errorHint, { color: colors.mutedForeground }]}>
            API: {apiUrl}
          </Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={loadCatalog}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !loadError && products.length === 0 && (
        <View style={[styles.errorBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.errorTitle, { color: colors.foreground }]}>No products yet</Text>
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            Add products from the admin dashboard — they will appear here once published as Active.
          </Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={loadCatalog}>
            <Text style={styles.retryBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Banner */}
      {!loadError && products.length > 0 && <BannerCarousel banners={banners} />}

      {/* Categories */}
      {!loadError && categories.length > 0 && (
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Shop by Category</Text>
          <TouchableOpacity>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {categories.map(cat => (
            <CategoryCard
              key={cat.id}
              category={cat}
              onPress={() => router.push(`/category/${cat.slug}`)}
            />
          ))}
        </ScrollView>
      </View>
      )}

      {/* Today's Deals */}
      {!loadError && products.length > 0 && (
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today's Deals</Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>Limited time offers</Text>
          </View>
          <View style={[styles.dealBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.dealBadgeText}>LIVE</Text>
          </View>
        </View>
        <View style={styles.gridGap}>
          {renderGrid(deals, toggle, isInWishlist)}
        </View>
      </View>
      )}

      {/* Trending Electronics */}
      {!loadError && products.length > 0 && (
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Trending Electronics</Text>
          <TouchableOpacity onPress={() => router.push('/category/electronics')}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
          {trending.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              onPress={() => router.push(`/product/${p.id}`)}
              isWishlisted={isInWishlist(p.id)}
              onWishlistToggle={() => { toggle(p); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={{ width: 170 }}
            />
          ))}
        </ScrollView>
      </View>
      )}

      {/* For You */}
      {!loadError && products.length > 8 && (
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>For You</Text>
          <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>Based on your interests</Text>
        </View>
        <View style={styles.gridGap}>
          {renderGrid(products.slice(8, 16), toggle, isInWishlist)}
        </View>
      </View>
      )}

      <View style={{ height: isWeb ? 100 : 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  logoWrap: { paddingBottom: 6, marginTop: 2 },
  brandName: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#fff', letterSpacing: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  location: { fontSize: 12, fontFamily: 'GoogleSans_500Medium', color: 'rgba(255,255,255,0.9)', maxWidth: 180 },
  headerActions: { flexDirection: 'row', gap: 4, marginTop: -2 },
  iconBtn: { width: 38, height: 62, alignItems: 'center', justifyContent: 'center', borderRadius: 19, marginTop: 0 },
  searchTouch: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  searchHint: { flex: 1, fontSize: 14, fontFamily: 'GoogleSans_400Regular' },
  stripe: { paddingVertical: 8, paddingHorizontal: 16 },
  stripeText: { color: '#fff', fontSize: 12, fontFamily: 'GoogleSans_500Medium', textAlign: 'center' },
  section: { padding: 16, gap: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, fontFamily: 'GoogleSans_700Bold' },
  sectionSub: { fontSize: 12, fontFamily: 'GoogleSans_400Regular', marginTop: 2 },
  seeAll: { fontSize: 13, fontFamily: 'GoogleSans_600SemiBold' },
  dealBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  dealBadgeText: { color: '#fff', fontSize: 10, fontFamily: 'GoogleSans_700Bold', letterSpacing: 1 },
  catScroll: { gap: 12, paddingRight: 4 },
  hScroll: { gap: 12, paddingRight: 16 },
  gridGap: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  errorBox: { margin: 16, padding: 16, borderRadius: 12, borderWidth: 1, gap: 8 },
  errorTitle: { fontSize: 16, fontFamily: 'GoogleSans_700Bold' },
  errorText: { fontSize: 13, fontFamily: 'GoogleSans_400Regular', lineHeight: 20 },
  errorHint: { fontSize: 11, fontFamily: 'GoogleSans_400Regular' },
  retryBtn: { marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: '#fff', fontSize: 14, fontFamily: 'GoogleSans_600SemiBold' },
});
