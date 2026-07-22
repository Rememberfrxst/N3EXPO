import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/Text';
import SvgIcon from '@/components/SvgIcon';
import { useColors } from '@/hooks/useColors';
import { useTheme, ThemeMode } from '@/context/ThemeContext';

const THEME_OPTIONS: { mode: ThemeMode; icon: string; label: string; sub: string }[] = [
  { mode: 'light', icon: 'sunny', label: 'Light', sub: 'Always light mode' },
  { mode: 'dark', icon: 'moon', label: 'Dark', sub: 'Always dark mode' },
  { mode: 'system', icon: 'phone-portrait-outline', label: 'System', sub: 'Follow device setting' },
];

export default function SettingsScreen() {
  const colors = useColors();
  const { theme, setTheme } = useTheme();
  const isWeb = Platform.OS === 'web';
  const [notifications, setNotifications] = useState(true);
  const [deals, setDeals] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Theme */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>APPEARANCE</Text>
        <View style={styles.themeGrid}>
          {THEME_OPTIONS.map(opt => {
            const active = theme === opt.mode;
            return (
              <TouchableOpacity
                key={opt.mode}
                style={[
                  styles.themeCard,
                  {
                    backgroundColor:
                      opt.mode === 'light'
                        ? '#F8F8F4'
                        : opt.mode === 'dark'
                          ? '#111111'
                          : colors.muted,
                    borderColor: active ? colors.primary : colors.border,
                    borderWidth: active ? 2 : 1,
                    shadowColor: active ? colors.primary : 'transparent',
                    shadowOpacity: active ? 0.18 : 0,
                    shadowRadius: active ? 8 : 0,
                    shadowOffset: { width: 0, height: 2 },
                  },
                ]}
                onPress={() => setTheme(opt.mode)}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.themeIconWrap,
                  {
                    backgroundColor:
                      opt.mode === 'light'
                        ? '#FFE8B5'
                        : opt.mode === 'dark'
                          ? '#2A2A2A'
                          : colors.background,
                  },
                ]}>
                  <SvgIcon name={opt.icon as any} size={22} color={active ? '#fff' : colors.mutedForeground} />
                </View>
                <Text style={[styles.themeLabel, { color: active ? colors.primary : colors.foreground }]}>
                  {opt.label}
                </Text>
                <Text style={[styles.themeSub, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {opt.sub}
                </Text>
                {active && (
                  <View style={[styles.activeCheck, { backgroundColor: colors.primary }]}>
                    <SvgIcon name="checkmark" size={11} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Notifications */}
      <View style={[styles.section, { marginTop: 8 }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>NOTIFICATIONS</Text>
        {[
          { label: 'All Notifications', value: notifications, setter: setNotifications, sub: 'Receive all app notifications', icon: 'notifications-outline' },
          { label: 'Deals & Offers', value: deals, setter: setDeals, sub: 'Flash sales, coupons & discounts', icon: 'pricetag-outline' },
          { label: 'Order Updates', value: orderUpdates, setter: setOrderUpdates, sub: 'Shipping & delivery status', icon: 'cube-outline' },
        ].map(item => (
          <View key={item.label} style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.menuIcon, { backgroundColor: colors.primary + '15' }]}>
              <SvgIcon name={item.icon as any} size={18} color={colors.primary} />
            </View>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleLabel, { color: colors.foreground }]}>{item.label}</Text>
              <Text style={[styles.toggleSub, { color: colors.mutedForeground }]}>{item.sub}</Text>
            </View>
            <Switch
              value={item.value}
              onValueChange={item.setter}
              trackColor={{ true: colors.primary, false: colors.muted }}
              thumbColor="#fff"
            />
          </View>
        ))}
      </View>

      {/* Legal */}
      <View style={[styles.section, { marginTop: 8 }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>LEGAL</Text>
        {[
          { label: 'Privacy Policy', icon: 'shield-outline' },
          { label: 'Terms of Service', icon: 'document-text-outline' },
          { label: 'Cookie Policy', icon: 'information-circle-outline' },
          { label: 'Return Policy', icon: 'return-up-back-outline' },
        ].map(item => (
          <TouchableOpacity key={item.label} style={[styles.menuRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.menuIcon, { backgroundColor: colors.muted }]}>
              <SvgIcon name={item.icon as any} size={18} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
            <SvgIcon name="chevron-forward" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        ))}
      </View>

      {/* About */}
      <View style={[styles.section, { marginTop: 8 }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ABOUT</Text>
        {[
          { label: 'Help & Support', icon: 'headset-outline' },
          { label: 'Rate Us', icon: 'star-outline' },
          { label: 'Share App', icon: 'share-outline' },
        ].map(item => (
          <TouchableOpacity key={item.label} style={[styles.menuRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.menuIcon, { backgroundColor: colors.muted }]}>
              <SvgIcon name={item.icon as any} size={18} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
            <SvgIcon name="chevron-forward" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        ))}
      </View>

      {/* App Info */}
      <View style={[styles.appInfo, { marginTop: 8 }]}>
        <View style={[styles.appLogo, { backgroundColor: colors.primary }]}>
          <Text style={styles.appLogoText}>G</Text>
        </View>
        <Text style={[styles.appName, { color: colors.foreground }]}>GRIPER</Text>
        <Text style={[styles.appTagline, { color: colors.mutedForeground }]}>India & Global Shopping</Text>
        <Text style={[styles.appVersion, { color: colors.mutedForeground }]}>Version 1.0.0 (Build 100)</Text>
        <Text style={[styles.appCopy, { color: colors.mutedForeground }]}>© 2025 Griper Technologies Pvt. Ltd.</Text>
      </View>

      <View style={{ height: isWeb ? 100 : 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 11, fontFamily: 'GoogleSans_600SemiBold', letterSpacing: 1, marginBottom: 14 },
  themeGrid: { flexDirection: 'row', gap: 10 },
  themeCard: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 16, paddingHorizontal: 8, borderRadius: 16 },
  themeIconWrap: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  themeLabel: { fontSize: 13, fontFamily: 'GoogleSans_700Bold' },
  themeSub: { fontSize: 10, fontFamily: 'GoogleSans_400Regular', textAlign: 'center' },
  activeCheck: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontSize: 15, fontFamily: 'GoogleSans_500Medium' },
  toggleSub: { fontSize: 12, fontFamily: 'GoogleSans_400Regular', marginTop: 2 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1 },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: 'GoogleSans_500Medium' },
  appInfo: { alignItems: 'center', padding: 28, gap: 8 },
  appLogo: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  appLogoText: { fontSize: 28, fontFamily: 'GoogleSans_700Bold', color: '#fff' },
  appName: { fontSize: 18, fontFamily: 'GoogleSans_700Bold', letterSpacing: 3 },
  appTagline: { fontSize: 13, fontFamily: 'GoogleSans_400Regular' },
  appVersion: { fontSize: 12, fontFamily: 'GoogleSans_400Regular' },
  appCopy: { fontSize: 11, fontFamily: 'GoogleSans_400Regular' },
});
