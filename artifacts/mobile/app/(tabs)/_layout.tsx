import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/Text';
import { useColors } from '@/hooks/useColors';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/context/ThemeContext';
import SvgIcon from '@/components/SvgIcon';
import {
  HomeIconFilled,
  HomeIconOutline,
  ProfileIconFilled,
  CartIconNew,
  OrdersIconNew,
} from '@/components/TabIcons';

/* ── Animated Me icon — always shows filled, springs on focus ── */
function AnimatedMeIcon({ focused, color, size }: { focused: boolean; color: string; size: number }) {
  const scale = useRef(new Animated.Value(focused ? 1.12 : 1)).current;
  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.15 : 1,
      useNativeDriver: true,
      friction: 5,
      tension: 120,
    }).start();
  }, [focused, scale]);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <ProfileIconFilled color={color} size={size} />
    </Animated.View>
  );
}

/* ── Diamond cart button ── */
function DiamondCartButton(props: any) {
  const colors = useColors();
  const { itemCount } = useCart();
  return (
    <TouchableOpacity
      onPress={props.onPress}
      onLongPress={props.onLongPress}
      activeOpacity={0.82}
      style={[props.style, styles.diamondTap]}
    >
      {/* Raise the whole widget above the bar */}
      <View style={styles.diamondLift}>
        {/* Outer halo ring */}
        <View style={[styles.diamondHalo, { backgroundColor: colors.primary + '30' }]} />

        {/* Diamond box */}
        <View
          style={[
            styles.diamond,
            {
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
            },
          ]}
        >
          {/* Counter-rotate icon so it stays upright */}
          <View style={styles.diamondIcon}>
            <CartIconNew color="#fff" size={26} />
          </View>
        </View>

        {/* Item count badge */}
        {itemCount > 0 && (
          <View style={styles.diamondBadge}>
            <Text style={styles.diamondBadgeText}>
              {itemCount > 99 ? '99+' : itemCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// NativeTabs + SF Symbols — iOS only
function NativeTabLayout() {
  const { itemCount } = useCart();
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search" role="search">
        <Icon sf={{ default: 'magnifyingglass', selected: 'magnifyingglass' }} />
        <Label>Search</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cart">
        <Icon sf={{ default: 'bag', selected: 'bag.fill' }} />
        <Label>{`Cart${itemCount > 0 ? ` (${itemCount})` : ''}`}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="orders">
        <Icon sf={{ default: 'list.clipboard', selected: 'list.clipboard.fill' }} />
        <Label>Orders</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: 'person.circle', selected: 'person.circle.fill' }} />
        <Label>Me</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: isDark ? '#FFFFFF' : colors.primary,
        tabBarInactiveTintColor: isDark ? '#F4F4F4' : colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.card,
          
          borderTopColor: colors.border,
          elevation: 0,
          overflow: 'visible',      // lets the diamond float above the bar
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ),
        // @ts-ignore - includeFontPadding is Android-specific
        tabBarLabelStyle: { fontFamily: 'GoogleSans_500Medium', fontSize: 11, includeFontPadding: false },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) =>
            focused
              ? <HomeIconFilled color={color} size={24} />
              : <HomeIconOutline color={color} size={24} />,
        }}
      />

      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused, size }) => (
            <SvgIcon name={focused ? 'search' : 'search-outline'} size={size ?? 23} color={color} />
          ),
        }}
      />

      {/* Cart — fully custom diamond button, no label */}
      <Tabs.Screen
        name="cart"
        options={{
          title: '',
          tabBarStyle: { display: 'none' },
          tabBarLabel: () => null,
          tabBarButton: (props) => <DiamondCartButton {...props} />,
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) =>
            <OrdersIconNew color={color} size={size ?? 23} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Me',
          tabBarIcon: ({ color, focused, size }) => (
            <AnimatedMeIcon focused={focused} color={color} size={size ?? 23} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (Platform.OS === 'ios' && isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  /* Diamond cart button */
  diamondTap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  diamondLift: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -14,
    overflow: 'visible',
  },
  /* Halo ring — slightly larger, semi-transparent brand colour */
  diamondHalo: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderRadius: 15,
    transform: [{ rotate: '45deg' }],
  },
  /* Main rotated box */
  diamond: {
    width: 52,
    height: 52,
    borderRadius: 12,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  /* Counter-rotate so the icon inside stays upright */
  diamondIcon: {
    transform: [{ rotate: '-45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Item count badge */
  diamondBadge: {
    position: 'absolute',
    top: -6,
    right: -2,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#FF4D6D',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  diamondBadgeText: {
    fontSize: 9,
    fontFamily: 'GoogleSans_700Bold',
    color: '#fff',
    lineHeight: 12,
  },
});
