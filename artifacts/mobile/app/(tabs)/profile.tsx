import React from 'react';
import { Alert, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/Text';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SvgIcon from '@/components/SvgIcon';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

interface MenuItem {
  icon: string;
  label: string;
  sub?: string;
  onPress: () => void;
  color?: string;
}

function MenuRow({ label, sub, onPress, color }: Omit<MenuItem, 'icon'>) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.menuRow, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuLabel}>
        <Text style={[styles.menuText, { color: color || colors.foreground }]}>{label}</Text>
        {sub && <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>{sub}</Text>}
      </View>
      <SvgIcon name="chevron-forward" size={16} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground, backgroundColor: colors.background }]}>
      {title.toUpperCase()}
    </Text>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const isWeb = Platform.OS === 'web';
  const topPad = isWeb ? 67 : insets.top;

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Me</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* User Card */}
        {user ? (
          <View style={[styles.userCard, { backgroundColor: colors.primary }]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              {user.phone && <Text style={styles.userPhone}>{user.phone}</Text>}
            </View>
            {user.role === 'admin' && (
              <View style={styles.sellerBadge}>
                <SvgIcon name="shield-checkmark" size={14} color="#fff" />
                <Text style={styles.sellerBadgeText}>Admin</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.guestCard}>
            <View style={[styles.guestAvatar, { backgroundColor: colors.muted }]}>
              <SvgIcon name="person-outline" size={40} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.guestTitle, { color: colors.foreground }]}>Welcome to Griper</Text>
            <Text style={[styles.guestSubtitle, { color: colors.mutedForeground }]}>Sign in to view orders, wishlist & more</Text>
            <View style={styles.authBtns}>
              <TouchableOpacity style={[styles.loginBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/auth/login')}>
                <Text style={[styles.loginBtnText, { color: colors.primaryForeground }]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.registerBtn, { borderColor: colors.primary }]} onPress={() => router.push('/auth/register')}>
                <Text style={[styles.registerBtnText, { color: colors.primary }]}>Register</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Shopping Section */}
        <SectionHeader title="Shopping" />
        <View style={styles.section}>
          <MenuRow label="Wishlist"         sub="Saved items"             onPress={() => router.push('/wishlist')} />
          <MenuRow label="My Orders"        sub="Track & manage orders"   onPress={() => router.push('/orders')} />
          <MenuRow label="My Addresses"     sub={user?.addresses.length ? `${user.addresses.length} saved` : 'No addresses'} onPress={() => { if (!user) router.push('/auth/login'); }} />
          <MenuRow label="Payment Methods"  sub="UPI, Cards & more"       onPress={() => { if (!user) router.push('/auth/login'); }} />
        </View>

        {/* Admin Section */}
        {user?.role === 'admin' && (
          <>
            <SectionHeader title="Admin" />
            <View style={styles.section}>
              <MenuRow
                label="Admin Dashboard"
                sub="Manage products and store"
                onPress={() => router.push('/seller')} // Temporary route to seller dashboard
                color="#7C3AED"
              />
            </View>
          </>
        )}

        {/* Preferences Section */}
        <SectionHeader title="Preferences" />
        <View style={styles.section}>
          {/* Language picker inline */}
          <View style={[styles.langSection, { borderBottomColor: colors.border }]}>
            <View style={styles.menuLabel}>
              <Text style={[styles.menuText, { color: colors.foreground }]}>Language</Text>
              <Text style={[styles.menuSub, { color: colors.mutedForeground }]}>
                {language === 'en' ? 'English' : 'हिन्दी'}
              </Text>
            </View>
            <View style={styles.langPills}>
              {(['en', 'hi'] as const).map(lang => (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.langPill,
                    {
                      backgroundColor: language === lang ? colors.primary : colors.muted,
                      borderColor:     language === lang ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setLanguage(lang)}
                >
                  <Text style={[styles.langPillText, { color: language === lang ? '#fff' : colors.mutedForeground }]}>
                    {lang === 'en' ? 'EN' : 'HI'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <MenuRow label="Settings"        sub="Theme, notifications & more" onPress={() => router.push('/settings')} />
          <MenuRow label="Help & Support"   sub="FAQ, Contact us"             onPress={() => {}} />
          <MenuRow label="Privacy Policy"   onPress={() => {}} />
          <MenuRow label="Terms of Service" onPress={() => {}} />
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appName,    { color: colors.foreground }]}>GRIPER</Text>
          <Text style={[styles.appVersion, { color: colors.mutedForeground }]}>Version 1.0.0 • India & Global</Text>
        </View>

        {/* Sign Out */}
        {user && (
          <TouchableOpacity
            style={[styles.signOutBtn, { borderColor: colors.destructive }]}
            onPress={handleLogout}
          >
            <SvgIcon name="log-out-outline" size={20} color={colors.destructive} />
            <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: isWeb ? 100 : 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1 },
  header:           { paddingHorizontal: 20, paddingBottom: 14 },
  title:            { fontSize: 22, fontFamily: 'GoogleSans_700Bold' },

  /* User card */
  userCard:         { padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar:           { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  avatarText:       { fontSize: 26, fontFamily: 'GoogleSans_700Bold', color: '#fff' },
  userInfo:         { flex: 1 },
  userName:         { fontSize: 18, fontFamily: 'GoogleSans_700Bold', color: '#fff' },
  userEmail:        { fontSize: 13, fontFamily: 'GoogleSans_400Regular', color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  userPhone:        { fontSize: 13, fontFamily: 'GoogleSans_400Regular', color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  sellerBadge:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  sellerBadgeText:  { fontSize: 11, fontFamily: 'GoogleSans_600SemiBold', color: '#fff' },

  /* Guest card */
  guestCard:        { margin: 16, paddingVertical: 8, alignItems: 'center', gap: 10 },
  guestAvatar:      { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  guestTitle:       { fontSize: 18, fontFamily: 'GoogleSans_600SemiBold' },
  guestSubtitle:    { fontSize: 13, fontFamily: 'GoogleSans_400Regular', textAlign: 'center' },
  authBtns:         { flexDirection: 'row', gap: 12, marginTop: 6 },
  loginBtn:         { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  loginBtnText:     { fontSize: 15, fontFamily: 'GoogleSans_600SemiBold' },
  registerBtn:      { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5 },
  registerBtnText:  { fontSize: 15, fontFamily: 'GoogleSans_600SemiBold' },

  /* Section */
  sectionHeader:    { fontSize: 11, fontFamily: 'GoogleSans_600SemiBold', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6, letterSpacing: 1 },
  section:          { overflow: 'hidden' },

  /* Menu rows — no icon bg box */
  menuRow:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14, borderBottomWidth: 1 },
  menuLabel:        { flex: 1 },
  menuText:         { fontSize: 15, fontFamily: 'GoogleSans_500Medium' },
  menuSub:          { fontSize: 12, fontFamily: 'GoogleSans_400Regular', marginTop: 2 },

  /* Language row */
  langSection:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 14, borderBottomWidth: 1 },
  langPills:        { flexDirection: 'row', gap: 6 },
  langPill:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  langPillText:     { fontSize: 12, fontFamily: 'GoogleSans_700Bold' },

  /* App info */
  appInfo:          { marginTop: 8, padding: 20, alignItems: 'center', gap: 4 },
  appName:          { fontSize: 16, fontFamily: 'GoogleSans_700Bold', letterSpacing: 2 },
  appVersion:       { fontSize: 12, fontFamily: 'GoogleSans_400Regular' },

  /* Sign out */
  signOutBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 16, padding: 14, borderRadius: 12, borderWidth: 1.5 },
  signOutText:      { fontSize: 15, fontFamily: 'GoogleSans_600SemiBold' },
});
