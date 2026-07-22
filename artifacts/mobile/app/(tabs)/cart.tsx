import React, { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { TextInput } from '@/components/TextInput';
import { Text } from '@/components/Text';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import SvgIcon from '@/components/SvgIcon';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/constants/data';

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

export default function CartScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items, removeItem, updateQuantity, subtotal, deliveryFee, discountAmount, total, coupon, applyCoupon, removeCoupon, itemCount } = useCart();
  const isWeb = Platform.OS === 'web';
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;
  const [couponInput, setCouponInput] = useState('');
  const [couponMsg, setCouponMsg] = useState('');

  const handleApplyCoupon = () => {
    const result = applyCoupon(couponInput.trim());
    if (result === 'valid') { setCouponMsg('Coupon applied!'); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }
    else if (result === 'invalid') setCouponMsg('Invalid coupon code');
    else setCouponMsg('Coupon already applied');
  };

  if (items.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background, paddingTop: topPad + 20 }]}>
        <View style={styles.emptyHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <BackChevronIcon size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>My Cart</Text>
        </View>
        <View style={styles.emptyContent}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
            <SvgIcon name="bag-outline" size={48} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your cart is empty</Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>Add items to start shopping</Text>
          <TouchableOpacity style={[styles.shopBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/')}>
            <Text style={[styles.shopBtnText, { color: colors.primaryForeground }]}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <BackChevronIcon size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>My Cart ({itemCount})</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cart Items */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          {items.map((item, idx) => (
            <View key={item.product.id}>
              {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <View style={styles.cartItem}>
                <Image source={item.product.image} style={styles.itemImage} contentFit="cover" transition={200} />
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={2}>{item.product.name}</Text>
                  <Text style={[styles.itemSeller, { color: colors.mutedForeground }]}>by {item.product.seller}</Text>
                  <View style={styles.itemPriceRow}>
                    <Text style={[styles.itemPrice, { color: colors.foreground }]}>{formatPrice(item.product.price)}</Text>
                    <Text style={[styles.itemOriginal, { color: colors.mutedForeground }]}>{formatPrice(item.product.originalPrice)}</Text>
                  </View>
                  <View style={styles.qtyRow}>
                    <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: colors.muted }]} onPress={() => { updateQuantity(item.product.id, item.quantity - 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                      <SvgIcon name="remove" size={16} color={colors.foreground} />
                    </TouchableOpacity>
                    <Text style={[styles.qtyText, { color: colors.foreground }]}>{item.quantity}</Text>
                    <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: colors.muted }]} onPress={() => { updateQuantity(item.product.id, item.quantity + 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                      <SvgIcon name="add" size={16} color={colors.foreground} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.removeBtn} onPress={() => { removeItem(item.product.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}>
                      <SvgIcon name="trash-outline" size={18} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Coupon */}
        <View style={[styles.section, { backgroundColor: colors.card, marginTop: 8 }]}>
          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Apply Coupon</Text>
          <View style={styles.couponRow}>
            <TextInput
              style={[styles.couponInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border, fontFamily: 'GoogleSans_400Regular' }]}
              placeholder="Enter coupon code (e.g. GRIPER10)"
              placeholderTextColor={colors.mutedForeground}
              value={couponInput}
              onChangeText={setCouponInput}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={[styles.applyBtn, { backgroundColor: colors.primary }]} onPress={handleApplyCoupon}>
              <Text style={[styles.applyText, { color: colors.primaryForeground }]}>Apply</Text>
            </TouchableOpacity>
          </View>
          {couponMsg ? <Text style={{ color: couponMsg.includes('applied') ? colors.success : colors.destructive, fontSize: 12, fontFamily: 'GoogleSans_500Medium', marginTop: 6 }}>{couponMsg}</Text> : null}
          {coupon ? (
            <View style={styles.activeCoupon}>
              <Text style={[styles.activeCouponText, { color: colors.success }]}>Coupon "{coupon}" applied</Text>
              <TouchableOpacity onPress={removeCoupon}><SvgIcon name="close-circle" size={18} color={colors.mutedForeground} /></TouchableOpacity>
            </View>
          ) : null}
          <Text style={[styles.couponHint, { color: colors.mutedForeground }]}>Try: GRIPER10, FIRST20, SAVE15, NEWUSER</Text>
        </View>

        {/* Order Summary */}
        <View style={[styles.section, { backgroundColor: colors.card, marginTop: 8 }]}>
          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryKey, { color: colors.mutedForeground }]}>Subtotal ({itemCount} items)</Text>
            <Text style={[styles.summaryVal, { color: colors.foreground }]}>{formatPrice(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryKey, { color: colors.mutedForeground }]}>Delivery</Text>
            <Text style={[styles.summaryVal, { color: deliveryFee === 0 ? colors.success : colors.foreground }]}>{deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}</Text>
          </View>
          {discountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryKey, { color: colors.success }]}>Coupon Discount</Text>
              <Text style={[styles.summaryVal, { color: colors.success }]}>-{formatPrice(discountAmount)}</Text>
            </View>
          )}
          <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 10 }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.totalKey, { color: colors.foreground }]}>Total Amount</Text>
            <Text style={[styles.totalVal, { color: colors.foreground }]}>{formatPrice(total)}</Text>
          </View>
        </View>

        <View style={{ height: 120 + bottomPad }} />
      </ScrollView>

      {/* Checkout Button */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, borderTopWidth: 1, paddingBottom: bottomPad + 12 }]}>
        <View style={styles.footerInfo}>
          <Text style={[styles.footerTotal, { color: colors.foreground }]}>{formatPrice(total)}</Text>
          <Text style={[styles.footerSaved, { color: colors.success }]}>You save {formatPrice(subtotal - total + deliveryFee + discountAmount)}</Text>
        </View>
        <TouchableOpacity style={[styles.checkoutBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/checkout')}>
          <Text style={[styles.checkoutText, { color: colors.primaryForeground }]}>Proceed to Checkout</Text>
          <SvgIcon name="arrow-forward" size={18} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { flex: 1 },
  emptyHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, gap: 12 },
  emptyContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontFamily: 'GoogleSans_600SemiBold' },
  emptySubtitle: { fontSize: 14, fontFamily: 'GoogleSans_400Regular' },
  shopBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  shopBtnText: { fontSize: 16, fontFamily: 'GoogleSans_600SemiBold' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, gap: 12 },
  backBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  screenTitle: { fontSize: 22, fontFamily: 'GoogleSans_700Bold' },
  section: { padding: 16 },
  divider: { height: 1, marginHorizontal: 0 },
  cartItem: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  itemImage: { width: 80, height: 80, borderRadius: 10 },
  itemInfo: { flex: 1, gap: 4 },
  itemName: { fontSize: 14, fontFamily: 'GoogleSans_500Medium', lineHeight: 20 },
  itemSeller: { fontSize: 11, fontFamily: 'GoogleSans_400Regular' },
  itemPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemPrice: { fontSize: 15, fontFamily: 'GoogleSans_700Bold' },
  itemOriginal: { fontSize: 12, fontFamily: 'GoogleSans_400Regular', textDecorationLine: 'line-through' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  qtyBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 15, fontFamily: 'GoogleSans_600SemiBold', minWidth: 20, textAlign: 'center' },
  removeBtn: { marginLeft: 'auto' },
  sectionLabel: { fontSize: 16, fontFamily: 'GoogleSans_600SemiBold', marginBottom: 12 },
  couponRow: { flexDirection: 'row', gap: 8 },
  couponInput: { flex: 1, height: 44, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, fontSize: 14 },
  applyBtn: { paddingHorizontal: 18, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  applyText: { fontSize: 14, fontFamily: 'GoogleSans_600SemiBold' },
  activeCoupon: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  activeCouponText: { fontSize: 13, fontFamily: 'GoogleSans_500Medium' },
  couponHint: { fontSize: 11, fontFamily: 'GoogleSans_400Regular', marginTop: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryKey: { fontSize: 14, fontFamily: 'GoogleSans_400Regular' },
  summaryVal: { fontSize: 14, fontFamily: 'GoogleSans_500Medium' },
  totalKey: { fontSize: 16, fontFamily: 'GoogleSans_700Bold' },
  totalVal: { fontSize: 18, fontFamily: 'GoogleSans_700Bold' },
  footer: { padding: 16, gap: 10 },
  footerInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerTotal: { fontSize: 20, fontFamily: 'GoogleSans_700Bold' },
  footerSaved: { fontSize: 12, fontFamily: 'GoogleSans_500Medium' },
  checkoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  checkoutText: { fontSize: 16, fontFamily: 'GoogleSans_600SemiBold' },
});
