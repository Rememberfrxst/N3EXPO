import React, { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { TextInput } from '@/components/TextInput';
import { Text } from '@/components/Text';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SvgIcon from '@/components/SvgIcon';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const isWeb = Platform.OS === 'web';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const success = await login(email.trim().toLowerCase(), password);
      if (success) {
        router.back();
      } else {
        Alert.alert('Sign In Failed', 'Invalid email or password. Try demo@griper.in / demo123');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Close button */}
      <View style={{ paddingTop: isWeb ? 67 : insets.top + 10, paddingHorizontal: 20 }}>
        <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.muted }]} onPress={() => router.back()}>
          <SvgIcon name="close" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <View style={styles.inner}>
        {/* Brand */}
        <View style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <Text style={styles.logoText}>G</Text>
          </View>
          <Text style={[styles.brandName, { color: colors.foreground }]}>GRIPER</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>India & Global Shopping</Text>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>Welcome Back</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Sign in to your account</Text>

        {/* Demo hint */}
        <View style={[styles.hint, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
          <SvgIcon name="information-circle" size={16} color={colors.primary} />
          <Text style={[styles.hintText, { color: colors.primary }]}>Demo: demo@griper.in / demo123</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <SvgIcon name="mail-outline" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground, fontFamily: 'GoogleSans_400Regular' }]}
                placeholder="you@example.com"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <SvgIcon name="lock-closed-outline" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground, fontFamily: 'GoogleSans_400Regular' }]}
                placeholder="Your password"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
              />
              <TouchableOpacity onPress={() => setShowPw(s => !s)}>
                <SvgIcon name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.forgotBtn}>
            <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: loading ? colors.muted : colors.primary }]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={[styles.loginBtnText, { color: colors.primaryForeground }]}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.orRow}>
            <View style={[styles.orLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.orText, { color: colors.mutedForeground }]}>OR</Text>
            <View style={[styles.orLine, { backgroundColor: colors.border }]} />
          </View>

          <TouchableOpacity
            style={[styles.registerBtn, { borderColor: colors.primary }]}
            onPress={() => router.replace('/auth/register')}
          >
            <Text style={[styles.registerBtnText, { color: colors.primary }]}>Create New Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  inner: { flex: 1, paddingHorizontal: 28, paddingTop: 24, paddingBottom: 40, gap: 8 },
  brand: { alignItems: 'center', gap: 8, marginBottom: 16 },
  logo: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 28, fontFamily: 'GoogleSans_700Bold', color: '#fff' },
  brandName: { fontSize: 22, fontFamily: 'GoogleSans_700Bold', letterSpacing: 3 },
  tagline: { fontSize: 13, fontFamily: 'GoogleSans_400Regular' },
  title: { fontSize: 26, fontFamily: 'GoogleSans_700Bold', marginTop: 8 },
  subtitle: { fontSize: 15, fontFamily: 'GoogleSans_400Regular', marginBottom: 8 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  hintText: { fontSize: 13, fontFamily: 'GoogleSans_500Medium', flex: 1 },
  form: { gap: 14, marginTop: 8 },
  field: { gap: 6 },
  label: { fontSize: 14, fontFamily: 'GoogleSans_500Medium' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, paddingHorizontal: 14, height: 50, borderWidth: 1 },
  input: { flex: 1, fontSize: 15, height: '100%' },
  forgotBtn: { alignSelf: 'flex-end' },
  forgotText: { fontSize: 14, fontFamily: 'GoogleSans_600SemiBold' },
  loginBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  loginBtnText: { fontSize: 16, fontFamily: 'GoogleSans_600SemiBold' },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  orLine: { flex: 1, height: 1 },
  orText: { fontSize: 13, fontFamily: 'GoogleSans_500Medium' },
  registerBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1.5 },
  registerBtnText: { fontSize: 15, fontFamily: 'GoogleSans_600SemiBold' },
});
