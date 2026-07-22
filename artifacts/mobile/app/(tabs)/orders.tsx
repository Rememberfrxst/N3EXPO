import React, { useState, useEffect, useCallback } from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View, Image, ActivityIndicator } from 'react-native';
import { Text } from '@/components/Text';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import SvgIcon from '@/components/SvgIcon';
import { useColors } from '@/hooks/useColors';
import { formatPrice, Order } from '@/constants/data';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const STATUS_COLORS: Record<Order['status'], string> = {
  pending: '#F59E0B',
  confirmed: '#3B82F6',
  shipped: '#8B5CF6',
  out_for_delivery: '#F97316',
  delivered: '#22C55E',
  cancelled: '#EF4444',
};

const STATUS_LABELS: Record<Order['status'], string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_ICONS: Record<Order['status'], string> = {
  pending: 'time-outline',
  confirmed: 'checkmark-circle-outline',
  shipped: 'cube-outline',
  out_for_delivery: 'bicycle-outline',
  delivered: 'checkmark-done-circle-outline',
  cancelled: 'close-circle-outline',
};

function OrderCard({ order }: { order: Order }) {
  const colors = useColors();
  const statusColor = STATUS_COLORS[order.status];
  return (
    <TouchableOpacity
      style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/order/${order.id}`)}
      activeOpacity={0.9}
    >
      <View style={styles.orderTop}>
        <View>
          <Text style={[styles.orderId, { color: colors.foreground }]}>Order #{order.id}</Text>
          <Text style={[styles.orderDate, { color: colors.mutedForeground }]}>
            {new Date(order.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
          <SvgIcon name={STATUS_ICONS[order.status] as any} size={12} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABELS[order.status]}</Text>
        </View>
      </View>
      <View style={styles.itemsRow}>
        {order.items.slice(0, 3).map((item, i) => (
          <Image key={i} source={{ uri: item.image }} style={styles.miniImage} resizeMode="cover" />
        ))}
        {order.items.length > 3 && (
          <View style={[styles.moreItems, { backgroundColor: colors.muted }]}>
            <Text style={[styles.moreText, { color: colors.mutedForeground }]}>+{order.items.length - 3}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.orderItemNames, { color: colors.mutedForeground }]} numberOfLines={1}>
        {order.items.map(i => i.name).join(', ')}
      </Text>
      <View style={styles.orderBottom}>
        <Text style={[styles.orderTotal, { color: colors.foreground }]}>{formatPrice(order.total)}</Text>
        <View style={styles.trackBtn}>
          <Text style={[styles.trackText, { color: colors.primary }]}>
            {order.status === 'delivered' ? 'View Details' : 'Track Order'}
          </Text>
          <SvgIcon name="chevron-forward" size={14} color={colors.primary} />
        </View>
      </View>
      {order.status !== 'delivered' && order.status !== 'cancelled' && (
        <Text style={[styles.estDelivery, { color: colors.mutedForeground }]}>
          Est. Delivery: {order.estimatedDelivery}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const topPad = isWeb ? 67 : insets.top;
  const [tab, setTab] = useState<'active' | 'past'>('active');

  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!user) { setOrders([]); return; }
    setLoading(true);
    try {
      const data = await api.orders.list();
      setOrders(data.map((o: any) => ({
        id: o.id,
        items: (o.items ?? []).map((i: any) => ({
          productId: i.productId,
          name: i.product?.name ?? 'Product',
          price: parseFloat(i.unitPrice) || 0,
          quantity: i.quantity,
          image: i.product?.images?.[0]?.url ?? '',
        })),
        total: parseFloat(o.total) || 0,
        status: o.status,
        date: o.createdAt,
        estimatedDelivery: o.estimatedDelivery ?? '',
        paymentMethod: o.paymentMethod,
        address: { id: '', name: '', line1: '', city: '', state: '', pincode: '', phone: '', isDefault: false },
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>My Orders</Text>
        </View>
        <View style={[styles.empty, { flex: 1, justifyContent: 'center', paddingTop: 0 }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
            <SvgIcon name="person-outline" size={48} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sign in to view your orders</Text>
          <TouchableOpacity style={[styles.shopBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/auth/login')}>
            <Text style={[styles.shopBtnText, { color: colors.primaryForeground }]}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const active = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const past = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));
  const shown = tab === 'active' ? active : past;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>My Orders</Text>
        <View style={[styles.tabs, { backgroundColor: colors.muted }]}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'active' && { backgroundColor: colors.card }]}
            onPress={() => setTab('active')}
          >
            <Text style={[styles.tabText, { color: tab === 'active' ? colors.foreground : colors.mutedForeground }]}>
              Active {active.length > 0 ? `(${active.length})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'past' && { backgroundColor: colors.card }]}
            onPress={() => setTab('past')}
          >
            <Text style={[styles.tabText, { color: tab === 'past' ? colors.foreground : colors.mutedForeground }]}>
              Past {past.length > 0 ? `(${past.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && orders.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {shown.length === 0 ? (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
                <SvgIcon name="bag-outline" size={48} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No orders yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>Your {tab} orders will appear here</Text>
              <TouchableOpacity style={[styles.shopBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/')}>
                <Text style={[styles.shopBtnText, { color: colors.primaryForeground }]}>Start Shopping</Text>
              </TouchableOpacity>
            </View>
          ) : (
            shown.map(order => <OrderCard key={order.id} order={order} />)
          )}
          <View style={{ height: isWeb ? 100 : 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, gap: 12 },
  title: { fontSize: 22, fontFamily: 'GoogleSans_700Bold' },
  tabs: { flexDirection: 'row', borderRadius: 12, padding: 3 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabText: { fontSize: 14, fontFamily: 'GoogleSans_600SemiBold' },
  list: { padding: 16, gap: 12 },
  orderCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 10 },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderId: { fontSize: 15, fontFamily: 'GoogleSans_600SemiBold' },
  orderDate: { fontSize: 12, fontFamily: 'GoogleSans_400Regular', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  statusText: { fontSize: 11, fontFamily: 'GoogleSans_600SemiBold' },
  itemsRow: { flexDirection: 'row', gap: 6 },
  miniImage: { width: 44, height: 44, borderRadius: 10 },
  moreItems: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  moreText: { fontSize: 13, fontFamily: 'GoogleSans_600SemiBold' },
  orderItemNames: { fontSize: 12, fontFamily: 'GoogleSans_400Regular' },
  orderBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderTotal: { fontSize: 17, fontFamily: 'GoogleSans_700Bold' },
  trackBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  trackText: { fontSize: 13, fontFamily: 'GoogleSans_600SemiBold' },
  estDelivery: { fontSize: 12, fontFamily: 'GoogleSans_500Medium' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontFamily: 'GoogleSans_600SemiBold' },
  emptySubtitle: { fontSize: 14, fontFamily: 'GoogleSans_400Regular' },
  shopBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  shopBtnText: { fontSize: 16, fontFamily: 'GoogleSans_600SemiBold' },
});
