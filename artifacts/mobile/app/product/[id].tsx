import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, Dimensions, NativeScrollEvent, NativeSyntheticEvent, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { TextInput } from '@/components/TextInput';
import { Text } from '@/components/Text';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import SvgIcon from '@/components/SvgIcon';
import { CartIconNew } from '@/components/TabIcons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useTheme } from '@/context/ThemeContext';
import { Product, formatPrice } from '@/constants/data';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import RatingStars from '@/components/RatingStars';
import { api, mapApiProduct } from '@/services/api';

const { width: SCREEN_W } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_W * 0.95;
const SHEET_RADIUS = 28;
const HERO_ICON_SIZE = 24;

/* Demo image variants — same product art, different gradient angle + icon,
   so the hero behaves like a real multi-photo swipe gallery. */
const HERO_SLIDES = [
  { start: { x: 0, y: 0 }, end: { x: 1, y: 1 }, icon: 'cube-outline' as const },
  { start: { x: 1, y: 0 }, end: { x: 0, y: 1 }, icon: 'bag-outline' as const },
  { start: { x: 0, y: 1 }, end: { x: 1, y: 0 }, icon: 'sparkles-outline' as const },
  { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 }, icon: 'star-outline' as const },
];

/* FA v7 chevron-left */
function BackChevronIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 640 640">
      <Path
        fill={color}
        d="M169.4 297.4C156.9 309.9 156.9 330.2 169.4 342.7L361.4 534.7C373.9 547.2 394.2 547.2 406.7 534.7C419.2 522.2 419.2 501.9 406.7 489.4L237.3 320L406.6 150.6C419.1 138.1 419.1 117.8 406.6 105.3C394.1 92.8 373.8 92.8 361.3 105.3L169.3 297.3z"
      />
    </Svg>
  );
}

/* FA-style heart icons — filled (wishlisted) and outline (not wishlisted) */
function HeartIcon({ size, color, filled }: { size: number; color: string; filled: boolean }) {
  if (filled) {
    // FA v7 heart filled
    return (
      <Svg width={size} height={size} viewBox="0 0 640 640">
        <Path
          fill={color}
          d="M335 151.1C360 116.5 400.2 96 442.9 96C516.4 96 576 155.6 576 229.1L576 231.7C576 343.9 436.1 474.2 363.1 529.9C350.7 539.3 335.5 544 320 544C304.5 544 289.2 539.4 276.9 529.9C203.9 474.2 64 343.9 64 231.7L64 229.1C64 155.6 123.6 96 197.1 96C239.8 96 280 116.5 305 151.1L320 171.8L335 151.1z"
        />
      </Svg>
    );
  }
  // FA v7 heart outline
  return (
    <Svg width={size} height={size} viewBox="0 0 640 640">
      <Path
        fill={color}
        d="M442.9 144C415.6 144 389.9 157.1 373.9 179.2L339.5 226.8C335 233 327.8 236.7 320.1 236.7C312.4 236.7 305.2 233 300.7 226.8L266.3 179.2C250.3 157.1 224.6 144 197.3 144C150.3 144 112.2 182.1 112.2 229.1C112.2 279 144.2 327.5 180.3 371.4C221.4 421.4 271.7 465.4 306.2 491.7C309.4 494.1 314.1 495.9 320.2 495.9C326.3 495.9 331 494.1 334.2 491.7C368.7 465.4 419 421.3 460.1 371.4C496.3 327.5 528.2 279 528.2 229.1C528.2 182.1 490.1 144 443.1 144zM335 151.1C360 116.5 400.2 96 442.9 96C516.4 96 576 155.6 576 229.1L576 231.7C576 343.9 436.1 474.2 363.1 529.9C350.7 539.3 335.5 544 320 544C304.5 544 289.2 539.4 276.9 529.9C203.9 474.2 64 343.9 64 231.7L64 229.1C64 155.6 123.6 96 197.1 96C239.8 96 280 116.5 305 151.1L320 171.8L335 151.1z"
      />
    </Svg>
  );
}

const MOCK_REVIEWS = [
  { id: '1', user: 'Priya S.', rating: 5, date: '2 Jun 2025', text: 'Excellent product! Very happy with the quality and packaging.' },
  { id: '2', user: 'Rahul K.', rating: 4, date: '15 May 2025', text: 'Good value for money. Fast delivery. Would recommend.' },
  { id: '3', user: 'Ananya M.', rating: 5, date: '3 Apr 2025', text: 'Amazing! Will definitely buy again. Great seller.' },
  { id: '4', user: 'Vikram P.', rating: 3, date: '22 Mar 2025', text: 'Decent product but packaging could be improved.' },
];

/* Lighten (positive) / darken (negative) a hex color by a percent, used to
   synthesize a small "color options" swatch row from the product's own
   gradient instead of inventing unrelated fake colors. */
function shadeHex(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0x00ff) + amt;
  let b = (num & 0x0000ff) + amt;
  r = Math.max(Math.min(255, r), 0);
  g = Math.max(Math.min(255, g), 0);
  b = Math.max(Math.min(255, b), 0);
  return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1).toUpperCase();
}

const LETTER_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

/* Parses free-text size ranges already present in clothing specs
   (e.g. "XS to XXL", "28 to 38") into a concrete list of chips. */
function parseSizeRange(sizesStr?: string): string[] {
  if (!sizesStr) return [];
  const m = sizesStr.match(/^(\S+)\s+to\s+(\S+)$/i);
  if (!m) return [];
  const [, from, to] = m;
  if (/^\d+$/.test(from) && /^\d+$/.test(to)) {
    const start = parseInt(from, 10);
    const end = parseInt(to, 10);
    const out: string[] = [];
    for (let v = start; v <= end; v += 2) out.push(String(v));
    return out;
  }
  const fromIdx = LETTER_SIZES.indexOf(from.toUpperCase());
  const toIdx = LETTER_SIZES.indexOf(to.toUpperCase());
  if (fromIdx === -1 || toIdx === -1) return [];
  return LETTER_SIZES.slice(fromIdx, toIdx + 1);
}

export default function ProductDetailScreen() {
  const colors = useColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addItem, items } = useCart();
  const { toggle, isInWishlist } = useWishlist();
  const isWeb = Platform.OS === 'web';
  const [activeImage, setActiveImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [pincode, setPincode] = useState('');
  const [pincodeChecked, setPincodeChecked] = useState(false);
  const [showAllSpecs, setShowAllSpecs] = useState(false);

  // Floating hero icons sit directly on the photo with a transparent
  // background — always white so they stay visible over any gradient.
  const heroBtnIcon = '#FFFFFF';

  const [product, setProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoadingProduct(true);
    api.products.get(id)
      .then(p => setProduct(mapApiProduct(p)))
      .catch(console.error)
      .finally(() => setLoadingProduct(false));
  }, [id]);

  if (loadingProduct) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <SvgIcon name="cube-outline" size={56} color={colors.mutedForeground} />
        <Text style={[styles.notFoundText, { color: colors.foreground }]}>Product not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.primary }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isWishlisted = isInWishlist(product.id);
  const inCart = items.find(i => i.product.id === product.id);
  const isApparel = product.category === 'clothing';

  const colorSwatches = isApparel
    ? [
        (product as any).gradient?.[0] ?? '#1E3A5F',
        (product as any).gradient?.[1] ?? '#3B82F6',
        shadeHex((product as any).gradient?.[0] ?? '#1E3A5F', -28),
        shadeHex((product as any).gradient?.[1] ?? '#3B82F6', 22),
      ]
    : [];

  const sizeOptions = isApparel ? parseSizeRange(product.specifications.Sizes) : [];
  // One size is deterministically shown as sold out, purely a stock-driven
  // visual cue — not a fabricated per-size inventory system.
  const soldOutSizeIdx = sizeOptions.length > 1 && product.stock < 40
    ? product.id.charCodeAt(product.id.length - 1) % sizeOptions.length
    : -1;
  const effectiveSize = selectedSize ?? sizeOptions.find((_, i) => i !== soldOutSizeIdx) ?? null;

  const bankOfferOff = Math.min(300, Math.round((product.price * 0.1) / 10) * 10);

  const handleImageScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (idx !== activeImage) setActiveImage(idx);
  };

  const specs = [
    { key: 'Category', value: product.category.charAt(0).toUpperCase() + product.category.slice(1) },
    { key: 'Sold by', value: product.seller },
    { key: 'Rating', value: `${product.rating} / 5 (${product.reviewCount.toLocaleString()})` },
    { key: 'Discount', value: `${product.discount}% off` },
    { key: 'Express Delivery', value: product.isExpress ? 'Available' : 'Standard Only' },
    { key: 'In Stock', value: product.stock > 0 ? 'Yes' : 'Out of Stock' },
  ];
  const visibleSpecs = showAllSpecs ? specs : specs.slice(0, 4);

  const handleAddToCart = () => {
    addItem(product);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Added to Bag', `${product.name} added to your bag.`, [
      { text: 'View Cart', onPress: () => router.push('/cart') },
      { text: 'Continue Shopping', style: 'cancel' },
    ]);
  };

  const handleBuyNow = () => {
    addItem(product);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push('/checkout');
  };

  const handleCheckPincode = () => {
    if (pincode.trim().length !== 6 || !/^\d{6}$/.test(pincode.trim())) {
      Alert.alert('Invalid Pincode', 'Please enter a valid 6-digit pincode.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPincodeChecked(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} bounces>

        {/* ── Hero image — swipeable gallery ── */}
        <View style={{ height: HERO_HEIGHT }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleImageScroll}
            style={{ height: HERO_HEIGHT }}
          >
            {HERO_SLIDES.map((slide, i) => (
              <View key={i} style={{ width: SCREEN_W, height: HERO_HEIGHT }}>
                <LinearGradient
                  colors={[(product as any).gradient?.[0] ?? '#1E3A5F', (product as any).gradient?.[1] ?? '#3B82F6']}
                  style={StyleSheet.absoluteFill}
                  start={slide.start}
                  end={slide.end}
                />
                <View style={styles.heroCenter}>
                  <SvgIcon name={slide.icon} size={80} color="rgba(255,255,255,0.25)" />
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Back button — top-left, floating over image, transparent bg */}
          <View style={[styles.heroTopBar, { top: insets.top + 8 }]} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.heroBtn}
              onPress={() => router.back()}
            >
              <BackChevronIcon size={HERO_ICON_SIZE} color={heroBtnIcon} />
            </TouchableOpacity>

            {/* Floating action buttons top-right */}
            <View style={styles.heroActions} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.heroBtn}
                onPress={() => { toggle(product); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                <HeartIcon size={HERO_ICON_SIZE} color={isWishlisted ? '#FF4D6D' : heroBtnIcon} filled={isWishlisted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroBtn}>
                <SvgIcon name="share-outline" size={20} color={heroBtnIcon} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Swipe dots — sit 4px above where the bottom sheet overlaps the image */}
          <View style={[styles.dotsRow, { bottom: SHEET_RADIUS + 4 }]} pointerEvents="none">
            {HERO_SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    width: i === activeImage ? 16 : 6,
                    backgroundColor: i === activeImage ? '#fff' : 'rgba(255,255,255,0.45)',
                  },
                ]}
              />
            ))}
          </View>

          {/* Discount badge bottom-left */}
          {product.discount >= 10 && (
            <View style={[styles.heroBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.heroBadgeText, { color: '#fff' }]}>{product.discount}% OFF</Text>
            </View>
          )}

          {/* Express badge bottom-right */}
          {product.isExpress && (
            <View style={[styles.heroExpress, { backgroundColor: colors.accent }]}>
              <SvgIcon name="flash" size={12} color="#fff" />
              <Text style={styles.heroExpressText}>EXPRESS</Text>
            </View>
          )}
        </View>

        {/* ── Bottom sheet — overlaps image with rounded top ── */}
        <View style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            borderTopLeftRadius: SHEET_RADIUS,
            borderTopRightRadius: SHEET_RADIUS,
            marginTop: -SHEET_RADIUS,
          },
        ]}>
          {/* Pull handle */}
          <View style={styles.sheetHandle}>
            <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
          </View>

          {/* Category + name */}
          <View style={styles.sheetPad}>
            <Text style={[styles.category, { color: colors.primary }]}>
              {product.category.toUpperCase()}
            </Text>
            <Text style={[styles.productName, { color: colors.foreground }]}>
              {product.name}
            </Text>

            <View style={styles.sellerColorRow}>
              <Text style={[styles.sellerText, { color: colors.mutedForeground }]}>
                Sold by{' '}
                <Text style={{ color: colors.primary, fontFamily: 'GoogleSans_600SemiBold' }}>
                  {product.seller}
                </Text>
              </Text>
              {colorSwatches.length > 0 && (
                <View style={styles.colorsTag}>
                  {colorSwatches.slice(0, 2).map((c, i) => (
                    <View key={i} style={[styles.colorsTagDot, { backgroundColor: c, marginLeft: i === 0 ? 0 : -6 }]} />
                  ))}
                  <Text style={[styles.colorsTagText, { color: colors.mutedForeground }]}>
                    {colorSwatches.length} colors
                  </Text>
                </View>
              )}
            </View>

            {/* Rating row */}
            <View style={styles.ratingRow}>
              <RatingStars rating={product.rating} size={15} />
              <Text style={[styles.ratingNum, { color: colors.foreground }]}>{product.rating}</Text>
              <Text style={[styles.reviewCount, { color: colors.mutedForeground }]}>
                ({product.reviewCount.toLocaleString()})
              </Text>
            </View>
          </View>

          {/* Price section — tinted strip */}
          <View style={[styles.priceStrip, { backgroundColor: colors.primary + '0C' }]}>
            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: colors.foreground }]}>
                {formatPrice(product.price)}
              </Text>
              <Text style={[styles.originalPrice, { color: colors.mutedForeground }]}>
                {formatPrice(product.originalPrice)}
              </Text>
              <View style={[styles.discountPill, { backgroundColor: colors.success + '22' }]}>
                <Text style={[styles.discountPillText, { color: colors.success }]}>
                  {product.discount}% off
                </Text>
              </View>
            </View>
            <Text style={[styles.savingText, { color: colors.success }]}>
              You save {formatPrice(product.originalPrice - product.price)} 🎉
            </Text>
            <Text style={[styles.taxText, { color: colors.mutedForeground }]}>
              Price inclusive of all taxes
            </Text>
          </View>

          <View style={styles.sheetPad}>
            {!(product.stock > 0) && (
              <View style={[styles.infoBanner, { backgroundColor: colors.destructive + '14', borderColor: colors.destructive + '50' }]}>
                <SvgIcon name="close-circle" size={15} color={colors.destructive} />
                <Text style={[styles.infoBannerText, { color: colors.destructive }]}>Out of Stock</Text>
              </View>
            )}

            {/* Bank offer / coupon box */}
            <View style={[styles.offerBox, { borderColor: colors.border }]}>
              <View style={styles.offerHeader}>
                <SvgIcon name="pricetag-outline" size={16} color={colors.success} />
                <Text style={[styles.offerHeaderText, { color: colors.success }]}>Bank Offer</Text>
              </View>
              <Text style={[styles.offerBody, { color: colors.foreground }]}>
                Get extra {formatPrice(bankOfferOff)} instant discount with Griper Pay UPI
              </Text>
              <TouchableOpacity
                onPress={() => Alert.alert(
                  'More Offers',
                  '• Flat 10% off on your first order\n• ₹100 off when you pay with Griper Wallet\n• Extra 5% off for Griper Plus members'
                )}
              >
                <Text style={[styles.offerLink, { color: colors.primary }]}>+3 more offers</Text>
              </TouchableOpacity>
            </View>

            {/* Color selector — apparel only, synthesized from the product's own gradient */}
            {colorSwatches.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Color</Text>
                <View style={styles.swatchRow}>
                  {colorSwatches.map((c, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => { setSelectedColor(i); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                      style={[
                        styles.swatchRing,
                        { borderColor: selectedColor === i ? colors.primary : 'transparent' },
                      ]}
                    >
                      <View style={[styles.swatch, { backgroundColor: c, borderColor: colors.border }]} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Size selector — apparel only, parsed from the free-text size range */}
            {sizeOptions.length > 0 && (
              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Select Size</Text>
                  <TouchableOpacity onPress={() => Alert.alert('Size Chart', 'Standard Indian sizing. Refer to the size worn by the model for the best fit.')}>
                    <Text style={[styles.offerLink, { color: colors.primary }]}>Size chart</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.sizeRow}>
                  {sizeOptions.map((size, i) => {
                    const disabled = i === soldOutSizeIdx;
                    const selected = effectiveSize === size;
                    return (
                      <TouchableOpacity
                        key={size}
                        disabled={disabled}
                        onPress={() => { setSelectedSize(size); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        style={[
                          styles.sizeChip,
                          {
                            borderColor: selected ? colors.primary : colors.border,
                            backgroundColor: selected ? colors.primary + '14' : 'transparent',
                            opacity: disabled ? 0.4 : 1,
                          },
                        ]}
                      >
                        <Text style={[
                          styles.sizeChipText,
                          { color: selected ? colors.primary : colors.foreground, textDecorationLine: disabled ? 'line-through' : 'none' },
                        ]}>
                          {size}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Delivery & Return Details */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Delivery &amp; Return Details</Text>
              <View style={[styles.drCard, { borderColor: colors.border }]}>
                <View style={styles.pincodeRow}>
                  <SvgIcon name="location-outline" size={16} color={colors.mutedForeground} />
                  {pincodeChecked ? (
                    <>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.drTitle, { color: colors.foreground }]}>
                          {product.isExpress ? 'Delivery in 1-2 days' : 'Delivery in 3-5 days'}
                        </Text>
                        <Text style={[styles.drSub, { color: colors.mutedForeground }]}>to {pincode}</Text>
                      </View>
                      <TouchableOpacity onPress={() => setPincodeChecked(false)}>
                        <Text style={[styles.offerLink, { color: colors.primary }]}>Change Pincode</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TextInput
                        value={pincode}
                        onChangeText={t => setPincode(t.replace(/[^0-9]/g, ''))}
                        placeholder="Enter Pincode"
                        placeholderTextColor={colors.mutedForeground}
                        keyboardType="number-pad"
                        maxLength={6}
                        style={[styles.pincodeInput, { color: colors.foreground }]}
                      />
                      <TouchableOpacity onPress={handleCheckPincode}>
                        <Text style={[styles.offerLink, { color: colors.primary }]}>Check</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
                <View style={[styles.drDivider, { backgroundColor: colors.border }]} />
                <View style={styles.drRow}>
                  <View style={[styles.drIcon, { backgroundColor: colors.muted }]}>
                    <SvgIcon name="checkmark-done-circle-outline" size={16} color={colors.mutedForeground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.drTitle, { color: colors.foreground }]}>7-day Return &amp; Exchange</Text>
                    <TouchableOpacity onPress={() => Alert.alert('Return Policies', 'Items can be returned within 7 days of delivery if unused and in original packaging.')}>
                      <Text style={[styles.offerLink, { color: colors.primary }]}>Return Policies</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={[styles.drDivider, { backgroundColor: colors.border }]} />
                <View style={styles.drRow}>
                  <View style={[styles.drIcon, { backgroundColor: colors.muted }]}>
                    <SvgIcon name="cash-outline" size={16} color={colors.mutedForeground} />
                  </View>
                  <Text style={[styles.drTitle, { color: colors.foreground }]}>Cash on Delivery Available</Text>
                </View>
              </View>
            </View>

            {/* Product Details */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Product Details</Text>
              <Text style={[styles.description, { color: colors.foreground }]}>{product.description}</Text>
              <View style={styles.specGrid}>
                {visibleSpecs.map((spec, i) => (
                  <View key={i} style={styles.specGridItem}>
                    <Text style={[styles.specGridKey, { color: colors.mutedForeground }]}>{spec.key}</Text>
                    <Text style={[styles.specGridVal, { color: colors.foreground }]}>{spec.value}</Text>
                  </View>
                ))}
              </View>
              {specs.length > 4 && (
                <TouchableOpacity onPress={() => setShowAllSpecs(v => !v)} style={styles.moreDetailsBtn}>
                  <Text style={[styles.offerLink, { color: colors.primary }]}>
                    {showAllSpecs ? 'Show less' : 'More details'}
                  </Text>
                  <SvgIcon name={showAllSpecs ? 'chevron-down' : 'chevron-forward'} size={13} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Trust badges */}
            <View style={styles.trustRow}>
              <View style={styles.trustItem}>
                <SvgIcon name="shield-checkmark" size={24} color={colors.mutedForeground} />
                <Text style={[styles.trustText, { color: colors.mutedForeground }]}>Assured Quality</Text>
              </View>
              <View style={styles.trustItem}>
                <SvgIcon name="checkmark-done-circle-outline" size={24} color={colors.mutedForeground} />
                <Text style={[styles.trustText, { color: colors.mutedForeground }]}>Easy Returns</Text>
              </View>
              <View style={styles.trustItem}>
                <SvgIcon name="cube-outline" size={24} color={colors.mutedForeground} />
                <Text style={[styles.trustText, { color: colors.mutedForeground }]}>Free Shipping</Text>
              </View>
            </View>

            {/* Ratings & reviews */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ratings &amp; Reviews</Text>
              <View style={styles.reviewsList}>
                <View style={[styles.ratingSummary, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.ratingBig, { color: colors.foreground }]}>{product.rating}</Text>
                  <RatingStars rating={product.rating} size={22} />
                  <Text style={[styles.ratingTotal, { color: colors.mutedForeground }]}>
                    {product.reviewCount.toLocaleString()} ratings
                  </Text>
                </View>
                {MOCK_REVIEWS.map(review => (
                  <View key={review.id} style={[styles.reviewCard, { borderBottomColor: colors.border }]}>
                    <View style={styles.reviewHeader}>
                      <View style={[styles.reviewAvatar, { backgroundColor: colors.primary }]}>
                        <Text style={styles.reviewAvatarText}>{review.user.charAt(0)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.reviewUser, { color: colors.foreground }]}>{review.user}</Text>
                        <Text style={[styles.reviewDate, { color: colors.mutedForeground }]}>{review.date}</Text>
                      </View>
                      <RatingStars rating={review.rating} size={12} />
                    </View>
                    <Text style={[styles.reviewText, { color: colors.foreground }]}>{review.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: isWeb ? 100 : 120 }} />
      </ScrollView>

      {/* ── Fixed footer — pinned to bottom like a bottom nav bar ── */}
      {product.stock > 0 && (
        <View style={[
          styles.footer,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            paddingBottom: isWeb ? 16 : insets.bottom + 10,
          },
        ]}>
          <TouchableOpacity
            style={[
              styles.cartBtn,
              isDark
                ? { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' }
                : { backgroundColor: colors.muted, borderColor: colors.primary },
            ]}
            onPress={handleAddToCart}
          >
            <CartIconNew color={isDark ? '#000000' : colors.primary} size={20} />
            <Text style={[styles.cartBtnText, { color: isDark ? '#000000' : colors.primary }]}>
              {inCart ? 'Add More' : 'Add to Bag'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.buyBtn,
              isDark
                ? { backgroundColor: '#000000', borderColor: colors.border, borderWidth: 1.5 }
                : { backgroundColor: colors.primary },
            ]}
            onPress={handleBuyNow}
          >
            <Text style={[styles.buyBtnText, { color: '#fff' }]}>Buy Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  notFoundText: { fontSize: 18, fontFamily: 'GoogleSans_500Medium' },
  backLink: { fontSize: 15, fontFamily: 'GoogleSans_600SemiBold' },

  /* Hero */
  heroTopBar: { position: 'absolute', left: 14, right: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 },
  heroActions: { flexDirection: 'row', gap: 2 },
  heroBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  heroCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroBadge: { position: 'absolute', bottom: SHEET_RADIUS + 10, left: 14, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  heroBadgeText: { fontSize: 13, fontFamily: 'GoogleSans_700Bold' },
  heroExpress: { position: 'absolute', bottom: SHEET_RADIUS + 10, right: 14, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  heroExpressText: { fontSize: 10, fontFamily: 'GoogleSans_700Bold', color: '#fff' },
  dotsRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 },
  dot: { height: 6, borderRadius: 3 },

  /* Bottom sheet */
  sheet: {
    overflow: 'hidden',
    // shadow to lift the sheet above image
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
    elevation: 8,
  },
  sheetHandle: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handleBar: { width: 40, height: 4, borderRadius: 2 },
  sheetPad: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 12, gap: 8 },

  /* Product info */
  category: { fontSize: 11, fontFamily: 'GoogleSans_700Bold', letterSpacing: 1.4 },
  productName: { fontSize: 20, fontFamily: 'GoogleSans_700Bold', lineHeight: 28 },
  sellerColorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sellerText: { fontSize: 13, fontFamily: 'GoogleSans_400Regular', flexShrink: 1 },
  colorsTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  colorsTagDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: '#fff' },
  colorsTagText: { fontSize: 12, fontFamily: 'GoogleSans_500Medium' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  ratingNum: { fontSize: 14, fontFamily: 'GoogleSans_600SemiBold' },
  reviewCount: { fontSize: 12, fontFamily: 'GoogleSans_400Regular' },

  /* Price strip */
  priceStrip: { paddingHorizontal: 20, paddingVertical: 14, gap: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  price: { fontSize: 26, fontFamily: 'GoogleSans_700Bold' },
  originalPrice: { fontSize: 16, fontFamily: 'GoogleSans_400Regular', textDecorationLine: 'line-through' },
  discountPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  discountPillText: { fontSize: 12, fontFamily: 'GoogleSans_700Bold' },
  savingText: { fontSize: 13, fontFamily: 'GoogleSans_600SemiBold' },
  taxText: { fontSize: 11, fontFamily: 'GoogleSans_400Regular', marginTop: 2 },

  /* Banners */
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 4 },
  infoBannerText: { fontSize: 13, fontFamily: 'GoogleSans_600SemiBold' },

  /* Offer / coupon box */
  offerBox: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6, marginBottom: 4 },
  offerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  offerHeaderText: { fontSize: 13, fontFamily: 'GoogleSans_700Bold' },
  offerBody: { fontSize: 13, fontFamily: 'GoogleSans_400Regular', lineHeight: 19 },
  offerLink: { fontSize: 12.5, fontFamily: 'GoogleSans_600SemiBold' },

  /* Section blocks (color / size / delivery / details) */
  sectionBlock: { gap: 10, marginTop: 14 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 15, fontFamily: 'GoogleSans_700Bold' },

  /* Color swatches */
  swatchRow: { flexDirection: 'row', gap: 12 },
  swatchRing: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 1 },

  /* Size chips */
  sizeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sizeChip: { minWidth: 46, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1.3, alignItems: 'center' },
  sizeChipText: { fontSize: 13, fontFamily: 'GoogleSans_600SemiBold' },

  /* Delivery & Returns */
  drCard: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  pincodeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  pincodeInput: { flex: 1, fontSize: 14, fontFamily: 'GoogleSans_500Medium', paddingVertical: 0 },
  drRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  drIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  drTitle: { fontSize: 13, fontFamily: 'GoogleSans_600SemiBold' },
  drSub: { fontSize: 12, fontFamily: 'GoogleSans_400Regular', marginTop: 1 },
  drDivider: { height: 1, marginLeft: 12 },

  /* Description */
  description: { fontSize: 14, fontFamily: 'GoogleSans_400Regular', lineHeight: 22 },

  /* Product details 2-col grid */
  specGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  specGridItem: { width: '50%', paddingRight: 10, marginBottom: 14 },
  specGridKey: { fontSize: 12, fontFamily: 'GoogleSans_400Regular', marginBottom: 3 },
  specGridVal: { fontSize: 13.5, fontFamily: 'GoogleSans_600SemiBold' },
  moreDetailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },

  /* Trust badges */
  trustRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 },
  trustItem: { alignItems: 'center', gap: 6, flex: 1 },
  trustText: { fontSize: 11, fontFamily: 'GoogleSans_500Medium', textAlign: 'center' },

  /* Reviews */
  reviewsList: { gap: 16 },
  ratingSummary: { borderRadius: 14, padding: 20, alignItems: 'center', gap: 8 },
  ratingBig: { fontSize: 52, fontFamily: 'GoogleSans_700Bold' },
  ratingTotal: { fontSize: 12, fontFamily: 'GoogleSans_400Regular' },
  reviewCard: { paddingBottom: 16, borderBottomWidth: 1, gap: 10 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { fontSize: 16, fontFamily: 'GoogleSans_700Bold', color: '#fff' },
  reviewUser: { fontSize: 14, fontFamily: 'GoogleSans_600SemiBold' },
  reviewDate: { fontSize: 12, fontFamily: 'GoogleSans_400Regular', marginTop: 1 },
  reviewText: { fontSize: 14, fontFamily: 'GoogleSans_400Regular', lineHeight: 21 },

  /* Footer — fixed like a bottom nav bar */
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 8,
    elevation: 12,
  },
  cartBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 16, borderRadius: 16, borderWidth: 1.5 },
  cartBtnText: { fontSize: 14.5, fontFamily: 'GoogleSans_700Bold', letterSpacing: 0.1 },
  buyBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16 },
  buyBtnText: { fontSize: 15, fontFamily: 'GoogleSans_700Bold', letterSpacing: 0.2 },
});
