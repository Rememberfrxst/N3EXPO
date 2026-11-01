import React from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Text } from "@/components/Text";
import { LoadState } from "@/components/ShopUI";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import type { StoreOffer } from "@/hooks/useOffers";
import { useColors } from "@/hooks/useColors";
import { formatPrice } from "@/constants/data";
export default function Offers() {
  const c = useColors(),
    query = useQuery({
      queryKey: ["offers"],
      queryFn: () =>
        apiRequest<StoreOffer[]>("/storefront/offers", { auth: false }),
    });
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.muted }}
      contentContainerStyle={{ padding: 16 }}
    >
      <Text
        style={{
          fontSize: 21,
          color: c.foreground,
          fontFamily: "GoogleSans_600SemiBold",
          marginBottom: 20,
        }}
      >
        Offers and Coupons
      </Text>
      {query.isPending ? (
        <LoadState loading />
      ) : query.isError ? (
        <LoadState
          error="load"
          retry={() => {
            void query.refetch();
          }}
        />
      ) : !query.data?.length ? (
        <LoadState empty="New offers are on their way" />
      ) : (
        query.data.map((o) => (
          <View
            key={o.id}
            style={{
              backgroundColor: c.card,
              borderWidth: 1,
              borderColor: c.border,
              padding: 20,
              marginBottom: 14,
            }}
          >
            <Text
              style={{
                fontSize: 19,
                color: c.accent,
                fontFamily: "GoogleSans_700Bold",
              }}
            >
              {o.discountType === "percentage"
                ? `${Number(o.discountValue)}% OFF`
                : `${formatPrice(Number(o.discountValue))} OFF`}
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: c.foreground,
                marginTop: 12,
                fontFamily: "GoogleSans_600SemiBold",
              }}
            >
              {o.code}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: c.mutedForeground,
                lineHeight: 21,
                marginTop: 10,
              }}
            >
              {Number(o.minOrderValue) > 0
                ? `On orders from ${formatPrice(Number(o.minOrderValue))}. `
                : "No minimum order. "}
              {o.maxDiscount
                ? `Maximum discount ${formatPrice(Number(o.maxDiscount))}. `
                : ""}
              {o.validUntil
                ? "Valid until " +
                  new Date(o.validUntil).toLocaleDateString("en-IN") +
                  "."
                : ""}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/cart",
                  params: { coupon: o.code },
                })
              }
              style={{
                backgroundColor: c.primary,
                padding: 12,
                alignItems: "center",
                marginTop: 18,
              }}
            >
              <Text style={{ color: c.primaryForeground, fontSize: 12 }}>
                Use this code
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}
