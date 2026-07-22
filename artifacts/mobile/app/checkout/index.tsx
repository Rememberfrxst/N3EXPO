import React, { useState, useEffect } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { TextInput } from '@/components/TextInput';
import { Text } from '@/components/Text';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SvgIcon from '@/components/SvgIcon';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { formatPrice, Address } from '@/constants/data';

const PAYMENT_METHODS = [
  { key: 'cod', label: 'Cash on Delivery', icon: 'cash-outline', sub: 'Pay when your order arrives' },
] as const;

type PaymentMethod = typeof PAYMENT_METHODS[number]['key'];

const GUEST_ADDRESS: Address = {
  id: 'guest',
  name: 'Guest User',
  phone: '+91 99999 00000',
  line1: '123, MG Road',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400001',
  isDefault: true,
};

export default function CheckoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { subtotal, deliveryFee, discountAmount, total, items, placeOrder, coupon } = useCart();
  const { user } = useAuth();
  const isWeb = Platform.OS === 'web';
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (!user && items.length > 0) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to place your order',
        [
          { text: 'Sign In', onPress: () => router.push('/auth/login') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  }, [user, items.length]);

  const address = user?.addresses.find(a => a.isDefault) || user?.addresses[0] || GUEST_ADDRESS;

  if (items.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <SvgIcon name="bag-outline" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyText, { color: colors.foreground }]}>Nothing in cart</Text>
        <TouchableOpacity style={[styles.shopBtn, { backgroundColor: colors.primary }]} onPress={() => router.replace('/')}>
          <Text style={[styles.shopBtnText, { color: colors.primaryForeground }]}>Start Shopping</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handlePlaceOrder = async () => {
    if (user && (!user.addresses || user.addresses.length === 0)) {
      Alert.alert('No Address', 'Please add a delivery address in your profile before placing an order.');
      return;
    }
    setPlacing(true);
    try {
      const order = await placeOrder(paymentMethod, address);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({ pathname: '/checkout/success', params: { orderId: order.id } });
    } catch {
      Alert.alert('Error', 'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Delivery Address</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.addressHeader}>
          <Text style={[styles.addressName, { color: colors.foreground }]}>{address.name || user?.name || 'Home'}</Text>
          {address.isDefault && <Text style={[styles.defaultBadge, { backgroundColor: colors.primary + '15', color: colors.primary }]}>Default</Text>}
        </View>
        <Text style={[styles.addressText, { color: colors.mutedForeground }]}>{address.line1}</Text>
        <Text style={[styles.addressText, { color: colors.mutedForeground }]}>{address.city}, {address.state} - {address.pincode}</Text>
        <Text style={[styles.addressPhone, { color: colors.mutedForeground }]}>Phone: {address.phone || user?.phone || 'N/A'}</Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Payment Method</Text>
      <View style={styles.paymentList}>
        {PAYMENT_METHODS.map(pm => (
          <TouchableOpacity
            key={pm.key}
            style={[styles.paymentRow, { borderColor: paymentMethod === pm.key ? colors.primary : colors.border, backgroundColor: paymentMethod === pm.key ? colors.primary + '10' : colors.card }]}
            onPress={() => setPaymentMethod(pm.key)}
          >
            <View style={[styles.paymentIcon, { backgroundColor: paymentMethod === pm.key ? colors.primary + '20' : colors.muted }]}>
              <SvgIcon name={pm.icon as any} size={22} color={paymentMethod === pm.key ? colors.primary : colors.mutedForeground} />
            </View>
            <View style={styles.paymentInfo}>
              <Text style={[styles.paymentLabel, { color: colors.foreground }]}>{pm.label}</Text>
              <Text style={[styles.paymentSub, { color: colors.mutedForeground }]}>{pm.sub}</Text>
            </View>
            <View style={[styles.radio, { borderColor: paymentMethod === pm.key ? colors.primary : colors.border }]}>
              {paymentMethod === pm.key && <View style={[styles.radioFill, { backgroundColor: colors.primary }]} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Order Summary</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.summaryRow}>
          <Text style={{ color: colors.mutedForeground }}>Subtotal</Text>
          <Text style={{ color: colors.foreground }}>{formatPrice(subtotal)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={{ color: colors.mutedForeground }}>Delivery Fee</Text>
          <Text style={{ color: colors.foreground }}>{deliveryFee === 0 ? 'Free' : formatPrice(deliveryFee)}</Text>
        </View>
        {discountAmount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={{ color: colors.primary }}>Discount</Text>
            <Text style={{ color: colors.primary }}>-{formatPrice(discountAmount)}</Text>
          </View>
        )}
        <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
          <Text style={[styles.totalVal, { color: colors.foreground }]}>{formatPrice(total)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.payBtn, { backgroundColor: colors.primary }]}
        onPress={handlePlaceOrder}
        disabled={placing}
      >
        <Text style={[styles.payBtnText, { color: colors.primaryForeground }]}>
          {placing ? 'Placing Order...' : `Place Order (Cash on Delivery)`}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  addressHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  addressName: { fontSize: 15, fontWeight: '600', marginRight: 8 },
  defaultBadge: { fontSize: 10, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  addressText: { fontSize: 14, marginBottom: 4 },
  addressPhone: { fontSize: 14, marginTop: 4 },
  paymentList: { gap: 12 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1 },
  paymentIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  paymentInfo: { flex: 1 },
  paymentLabel: { fontSize: 15, fontWeight: '600' },
  paymentSub: { fontSize: 12, marginTop: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioFill: { width: 10, height: 10, borderRadius: 5 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, marginTop: 4 },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalVal: { fontSize: 18, fontWeight: '800' },
  payBtn: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 32 },
  payBtnText: { fontSize: 16, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 12, marginBottom: 20 },
  shopBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  shopBtnText: { fontSize: 14, fontWeight: '600' },
});
