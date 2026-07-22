import React from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/Text';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SvgIcon from '@/components/SvgIcon';
import { useColors } from '@/hooks/useColors';
import { useCart } from '@/context/CartContext';
import { formatPrice, Order } from '@/constants/data';

const TIMELINE_STEPS: { status: Order['status']; label: string }[] = [
  { status: 'pending',          label: 'Order Placed' },
  { status: 'confirmed',        label: 'Confirmed' },
  { status: 'shipped',          label: 'Shipped' },
  { status: 'out_for_delivery', label: 'Out for Delivery' },
  { status: 'delivered',        label: 'Delivered' },
];

const STATUS_ORDER = ['pending', 'confirmed', 'shipped', 'out_for_delivery', 'delivered'];

export default function OrderDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orders } = useCart();
  const isWeb = Platform.OS === 'web';

  const order = orders.find(o => o.id === id);

  if (!order) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <SvgIcon name="bag-outline" size={48} color={colors.mutedForeground} />
        <Text style={[styles.notFoundText, { color: colors.foreground }]}>Order not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.link, { color: colors.primary }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentStep = order.status === 'cancelled' ? -1 : STATUS_ORDER.indexOf(order.status);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Status Banner */}
      <View style={[styles.statusBanner, {
        backgroundColor:
          order.status === 'delivered'  ? colors.success     + '15' :
          order.status === 'cancelled'  ? colors.destructive + '15' :
                                          colors.primary     + '15',
      }]}>
        <SvgIcon
          name={
            order.status === 'delivered' ? 'checkmark-done-circle' :
            order.status === 'cancelled' ? 'close-circle' : 'time'
          }
          size={28}
          color={
            order.status === 'delivered' ? colors.success :
            order.status === 'cancelled' ? colors.destructive :
                                           colors.primary
          }
        />
        <View>
          <Text style={[styles.statusTitle, {
            color:
              order.status === 'delivered' ? colors.success :
              order.status === 'cancelled' ? colors.destructive :
                                             colors.primary,
          }]}>
            {order.status === 'pending'          ? 'Order Placed' :
             order.status === 'confirmed'        ? 'Order Confirmed' :
             order.status === 'shipped'          ? 'Shipment in Transit' :
             order.status === 'out_for_delivery' ? 'Out for Delivery' :
             order.status === 'delivered'        ? 'Delivered' : 'Cancelled'}
          </Text>
          {order.status !== 'delivered' && order.status !== 'cancelled' && (
            <Text style={[styles.statusSub, { color: colors.mutedForeground }]}>
              Est. Delivery: {order.estimatedDelivery}
            </Text>
          )}
        </View>
      </View>

      {/* Order Info */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Order ID</Text>
          <Text style={[styles.infoVal,   { color: colors.foreground }]}>#{order.id}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Date</Text>
          <Text style={[styles.infoVal,   { color: colors.foreground }]}>
            {new Date(order.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Payment</Text>
          <Text style={[styles.infoVal,   { color: colors.foreground }]}>
            {order.paymentMethod === 'cod' ? 'Cash on Delivery' :
             order.paymentMethod === 'upi' ? 'UPI' : 'Razorpay'}
          </Text>
        </View>
      </View>

      {/* Timeline */}
      {order.status !== 'cancelled' && (
        <View style={[styles.section, { backgroundColor: colors.card, marginTop: 8 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Order Tracking</Text>
          <View style={styles.timelineContainer}>
            {TIMELINE_STEPS.map((step, i) => {
              const done   = i <= currentStep;
              const active = i === currentStep;
              const isLast = i === TIMELINE_STEPS.length - 1;
              return (
                <View key={step.status} style={styles.timelineRow}>
                  {/* Left column: dot + connector */}
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, {
                      backgroundColor: done ? '#003A00' : colors.muted,
                      borderColor:     done ? '#003A00' : colors.border,
                    }]}>
                      {done
                        ? <SvgIcon name="checkmark" size={11} color="#fff" />
                        : <View style={[styles.dotEmpty, { backgroundColor: colors.border }]} />
                      }
                    </View>
                    {!isLast && (
                      <View style={[styles.timelineLine, {
                        backgroundColor: i < currentStep ? '#003A00' : colors.border,
                      }]} />
                    )}
                  </View>

                  {/* Right column: label + date */}
                  <View style={[styles.timelineContent, isLast && styles.timelineContentLast]}>
                    <Text style={[styles.timelineLabel, {
                      color:      done ? colors.foreground : colors.mutedForeground,
                      fontFamily: active ? 'GoogleSans_700Bold' : 'GoogleSans_500Medium',
                    }]}>
                      {step.label}
                    </Text>
                    {done && (
                      <Text style={[styles.timelineDate, { color: colors.mutedForeground }]}>
                        {i === 0
                          ? new Date(order.date).toLocaleDateString('en-IN')
                          : 'Completed'}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Items */}
      <View style={[styles.section, { backgroundColor: colors.card, marginTop: 8 }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Items ({order.items.length})</Text>
        {order.items.map((item, i) => (
          <View key={i} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
            <Image source={item.image} style={styles.itemImg} contentFit="cover" />
            <View style={styles.itemInfo}>
              <Text style={[styles.itemName,  { color: colors.foreground }]} numberOfLines={2}>{item.name}</Text>
              <Text style={[styles.itemQty,   { color: colors.mutedForeground }]}>Qty: {item.quantity}</Text>
              <Text style={[styles.itemPrice, { color: colors.foreground }]}>{formatPrice(item.price * item.quantity)}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Delivery Address */}
      <View style={[styles.section, { backgroundColor: colors.card, marginTop: 8 }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Delivery Address</Text>
        <Text style={[styles.addrName,  { color: colors.foreground }]}>{order.address.name}</Text>
        <Text style={[styles.addrLine,  { color: colors.mutedForeground }]}>
          {order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ''}
        </Text>
        <Text style={[styles.addrLine,  { color: colors.mutedForeground }]}>
          {order.address.city}, {order.address.state} - {order.address.pincode}
        </Text>
        <Text style={[styles.addrPhone, { color: colors.mutedForeground }]}>{order.address.phone}</Text>
      </View>

      {/* Summary */}
      <View style={[styles.section, { backgroundColor: colors.card, marginTop: 8 }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Order Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryKey, { color: colors.mutedForeground }]}>Total Amount</Text>
          <Text style={[styles.summaryVal, { color: colors.foreground }]}>{formatPrice(order.total)}</Text>
        </View>
      </View>

      <View style={{ height: isWeb ? 100 : 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1 },
  notFound:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  notFoundText:     { fontSize: 18, fontFamily: 'GoogleSans_500Medium' },
  link:             { fontSize: 15, fontFamily: 'GoogleSans_600SemiBold' },

  statusBanner:     { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20 },
  statusTitle:      { fontSize: 17, fontFamily: 'GoogleSans_700Bold' },
  statusSub:        { fontSize: 13, fontFamily: 'GoogleSans_400Regular', marginTop: 2 },

  section:          { padding: 16, gap: 10 },
  sectionTitle:     { fontSize: 16, fontFamily: 'GoogleSans_700Bold', marginBottom: 6 },

  infoRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel:        { fontSize: 13, fontFamily: 'GoogleSans_400Regular' },
  infoVal:          { fontSize: 13, fontFamily: 'GoogleSans_600SemiBold' },

  /* Timeline */
  timelineContainer:    { marginTop: 4 },
  timelineRow:          { flexDirection: 'row', gap: 12, minHeight: 62 },
  timelineLeft:         { width: 22, alignItems: 'center' },
  timelineDot:          { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dotEmpty:             { width: 7, height: 7, borderRadius: 4 },
  /* line fills the space between dots with no gaps */
  timelineLine:         { flex: 1, width: 2 },
  timelineContent:      { flex: 1, paddingBottom: 20, justifyContent: 'flex-start', paddingTop: 2 },
  timelineContentLast:  { paddingBottom: 0 },
  timelineLabel:        { fontSize: 14 },
  timelineDate:         { fontSize: 12, fontFamily: 'GoogleSans_400Regular', marginTop: 2 },

  /* Items */
  itemRow:          { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  itemImg:          { width: 60, height: 60, borderRadius: 10 },
  itemInfo:         { flex: 1, gap: 4 },
  itemName:         { fontSize: 14, fontFamily: 'GoogleSans_500Medium', lineHeight: 20 },
  itemQty:          { fontSize: 12, fontFamily: 'GoogleSans_400Regular' },
  itemPrice:        { fontSize: 14, fontFamily: 'GoogleSans_700Bold' },

  /* Address */
  addrName:         { fontSize: 15, fontFamily: 'GoogleSans_600SemiBold' },
  addrLine:         { fontSize: 13, fontFamily: 'GoogleSans_400Regular' },
  addrPhone:        { fontSize: 13, fontFamily: 'GoogleSans_500Medium', marginTop: 4 },

  /* Summary */
  summaryRow:       { flexDirection: 'row', justifyContent: 'space-between' },
  summaryKey:       { fontSize: 15, fontFamily: 'GoogleSans_400Regular' },
  summaryVal:       { fontSize: 16, fontFamily: 'GoogleSans_700Bold' },
});
