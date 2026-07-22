import React, { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { TextInput } from '@/components/TextInput';
import { Text } from '@/components/Text';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SvgIcon from '@/components/SvgIcon';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const isWeb = Platform.OS === 'web';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const success = await register(name.trim(), email.trim().toLowerCase(), phone.trim(), password);
      if (success) {
        Alert.alert('Account Created!', 'Welcome to Griper!', [{ text: 'Get Started', onPress: () => router.back() }]);
      } else {
        Alert.alert('Registration Failed', 'An account with this email already exists.');
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
      <View style={{ paddingTop: isWeb ? 67 : insets.top + 10, paddingHorizontal: 20 }}>
        <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.muted }]} onPress={() => router.back()}>
          <SvgIcon name="close" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <View style={styles.inner}>
        <View style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <Text style={styles.logoText}>G</Text>
          </View>
          <Text style={[styles.brandName, { color: colors.foreground }]}>GRIPER</Text>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>Create Account</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Join millions of shoppers on Griper</Text>

        <View style={styles.form}>
          {[
            { label: 'Full Name', value: name, setter: setName, placeholder: 'Your full name', icon: 'person-outline', type: 'default', cap: 'words' as const },
            { label: 'Email', value: email, setter: setEmail, placeholder: 'you@example.com', icon: 'mail-outline', type: 'email-address', cap: 'none' as const },
            { label: 'Phone', value: phone, setter: setPhone, placeholder: '+91 99999 99999', icon: 'call-outline', type: 'phone-pad', cap: 'none' as const },
          ].map(field => (
            <View key={field.label} style={styles.field}>
              <Text style={[styles.label, { color: colors.foreground }]}>{field.label}</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.input, borderColor: colors.border }]}>
                <SvgIcon name={field.icon as any} size={18} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground, fontFamily: 'GoogleSans_400Regular' }]}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={field.value}
                  onChangeText={field.setter}
                  keyboardType={field.type as any}
                  autoCapitalize={field.cap}
                  autoCorrect={false}
                />
              </View>
            </View>
          ))}

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <SvgIcon name="lock-closed-outline" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground, fontFamily: 'GoogleSans_400Regular' }]}
                placeholder="Min. 6 characters"
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

          <TouchableOpacity
            style={[styles.registerBtn, { backgroundColor: loading ? colors.muted : colors.primary }]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={[styles.registerBtnText, { color: colors.primaryForeground }]}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <View style={styles.orRow}>
            <View style={[styles.orLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.orText, { color: colors.mutedForeground }]}>Already have an account?</Text>
            <View style={[styles.orLine, { backgroundColor: colors.border }]} />
          </View>

          <TouchableOpacity style={[styles.loginBtn, { borderColor: colors.primary }]} onPress={() => router.replace('/auth/login')}>
            <Text style={[styles.loginBtnText, { color: colors.primary }]}>Sign In Instead</Text>
          </TouchableOpacity>

          <Text style={[styles.terms, { color: colors.mutedForeground }]}>
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  inner: { flex: 1, paddingHorizontal: 28, paddingTop: 20, paddingBottom: 40, gap: 8 },
  brand: { alignItems: 'center', gap: 8, marginBottom: 8 },
  logo: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 26, fontFamily: 'GoogleSans_700Bold', color: '#fff' },
  brandName: { fontSize: 18, fontFamily: 'GoogleSans_700Bold', letterSpacing: 3 },
  title: { fontSize: 26, fontFamily: 'GoogleSans_700Bold' },
  subtitle: { fontSize: 15, fontFamily: 'GoogleSans_400Regular', marginBottom: 4 },
  form: { gap: 14, marginTop: 8 },
  field: { gap: 6 },
  label: { fontSize: 14, fontFamily: 'GoogleSans_500Medium' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, paddingHorizontal: 14, height: 50, borderWidth: 1 },
  input: { flex: 1, fontSize: 15, height: '100%' },
  registerBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  registerBtnText: { fontSize: 16, fontFamily: 'GoogleSans_600SemiBold' },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 },
  orLine: { flex: 1, height: 1 },
  orText: { fontSize: 12, fontFamily: 'GoogleSans_400Regular' },
  loginBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1.5 },
  loginBtnText: { fontSize: 15, fontFamily: 'GoogleSans_600SemiBold' },
  terms: { fontSize: 11, fontFamily: 'GoogleSans_400Regular', textAlign: 'center', lineHeight: 16 },
});
