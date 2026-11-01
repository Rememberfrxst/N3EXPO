import React from "react";
import {
  ScrollView,
  Text as NativeText,
  TouchableOpacity,
  View,
  Linking,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { Text } from "@/components/Text";
import { useColors } from "@/hooks/useColors";
import { useStorefront } from "@/hooks/useStorefront";
export default function Help() {
  const { section = "support" } = useLocalSearchParams<{ section?: string }>(),
    c = useColors(),
    store = useStorefront();
  const content: Record<string, { title: string; body: string }> = {
    returns: { title: store.returnsHeadline, body: store.returnsPolicy },
    shipping: {
      title: "Delivery and Shipping Policy",
      body: `${store.shippingPolicy}\n\nStandard delivery: ₹${store.deliveryFee}. Free delivery on orders from ₹${store.freeShippingThreshold}.`,
    },
    privacy: { title: "We Respect Your Privacy", body: store.privacyPolicy },
    terms: { title: "Terms & Conditions", body: store.termsOfService },
    about: { title: "Who We Are", body: store.aboutStore },
    payments: {
      title: "Payment and Refund Modes",
      body: `Cash on delivery is available at checkout. Your order’s payment status is shown in your order details.\n\nFor refunds, contact customer care with your order number.\n\n${store.returnsPolicy}`,
    },
    coupons: {
      title: "How Do I Redeem My Coupon?",
      body: "Open Offers and Coupons to find an active code. Add eligible products to your cart, sign in, then enter the code in Apply Coupon. Minimum order value, expiry dates and redemption limits apply. Your final savings are confirmed at checkout.",
    },
    support: {
      title: "Customer Care",
      body: "Need help with a product, delivery, return or your account? Contact our team with the details and your order number, if available.",
    },
    download: {
      title: "Download the App",
      body: "Take your saved products and orders with you.",
    },
  };
  const page = content[section] || content.support;
  return (
    <>
      <Stack.Screen options={{ title: page.title }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: c.background }}
        contentContainerStyle={{ padding: 22, paddingBottom: 40 }}
      >
        <Text
          style={{
            fontSize: 22,
            color: c.foreground,
            fontFamily: "GoogleSans_600SemiBold",
            marginBottom: 22,
          }}
        >
          {page.title}
        </Text>
        <Text
          style={{ fontSize: 14, lineHeight: 24, color: c.mutedForeground }}
        >
          {page.body}
        </Text>
        {section === "coupons" && (
          <TouchableOpacity
            onPress={() => router.push("/offers")}
            style={{ paddingVertical: 20 }}
          >
            <Text style={{ color: c.link, fontSize: 14 }}>
              View available coupons ›
            </Text>
          </TouchableOpacity>
        )}
        {section === "download" && !!store.downloadUrl && (
          <TouchableOpacity
            onPress={() => {
              void Linking.openURL(store.downloadUrl);
            }}
            style={{ paddingVertical: 20 }}
          >
            <Text style={{ color: c.link }}>Open app download ›</Text>
          </TouchableOpacity>
        )}
        <View
          style={{
            borderTopWidth: 1,
            borderColor: c.border,
            paddingTop: 24,
            marginTop: 28,
          }}
        >
          <Text style={{ fontSize: 13, color: c.foreground, marginBottom: 12 }}>
            We’re here to help
          </Text>
          <TouchableOpacity
            accessibilityRole="link"
            onPress={() => {
              void Linking.openURL(
                `mailto:${store.supportEmail}?subject=${encodeURIComponent(page.title)}`,
              );
            }}
          >
            <Text style={{ fontSize: 14, color: c.link }}>
              {store.supportEmail}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}
