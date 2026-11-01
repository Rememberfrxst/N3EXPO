import React, { useEffect } from "react";
import { applyGlobalTypographyFix } from "@/constants/typography";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  GoogleSans_400Regular,
  GoogleSans_500Medium,
  GoogleSans_600SemiBold,
  GoogleSans_700Bold,
} from "@expo-google-fonts/google-sans";
import { Inter_700Bold, useFonts } from "@expo-google-fonts/inter";
import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

SplashScreen.preventAutoHideAsync();

// Fix Android font padding that causes text to shift up/down in every component
applyGlobalTypographyFix();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.primary,
        // @ts-ignore - includeFontPadding is Android-specific but required for custom fonts
        headerTitleStyle: {
          fontFamily: "GoogleSans_600SemiBold",
          fontSize: 17,
          color: colors.foreground,
        },
        headerShadowVisible: false,
        headerBackTitle: "",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="category/[slug]" options={{ title: "" }} />
      <Stack.Screen
        name="checkout/index"
        options={{ title: "Checkout", headerBackTitle: "Cart" }}
      />
      <Stack.Screen name="checkout/success" options={{ headerShown: false }} />
      <Stack.Screen name="order/[id]" options={{ title: "Order Details" }} />
      <Stack.Screen name="wishlist/index" options={{ title: "My Wishlist" }} />
      <Stack.Screen name="auth/login" options={{ headerShown: false }} />
      <Stack.Screen name="auth/register" options={{ headerShown: false }} />
      <Stack.Screen name="seller/index" options={{ title: "Seller Hub" }} />
      <Stack.Screen
        name="addresses/index"
        options={{ title: "Delivery addresses" }}
      />
      <Stack.Screen name="settings/index" options={{ title: "Settings" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    // Google Sans — used everywhere in the app
    GoogleSans_400Regular,
    GoogleSans_500Medium,
    GoogleSans_600SemiBold,
    GoogleSans_700Bold,
    // Inter Bold — kept only for the GRIPER logo wordmark on the home screen
    Inter_700Bold,
    // Ionicons — preloaded so it never falls back to Japanese/Chinese glyphs on Android
    ...Ionicons.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <LanguageProvider>
              <AuthProvider>
                <CartProvider>
                  <WishlistProvider>
                    <GestureHandlerRootView style={{ flex: 1 }}>
                      <RootLayoutNav />
                    </GestureHandlerRootView>
                  </WishlistProvider>
                </CartProvider>
              </AuthProvider>
            </LanguageProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
