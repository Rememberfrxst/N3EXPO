import React, { useCallback, useState } from "react";
import { ScrollView, View, TouchableOpacity } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Text } from "@/components/Text";
import { LoadState } from "@/components/ShopUI";
import { Icon } from "@/components/StoreIcon";
import { api, ApiNotification } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
export default function Notifications() {
  const c = useColors(),
    { user } = useAuth(),
    [items, setItems] = useState<ApiNotification[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setLoading(false);
        return;
      }
      let active = true;
      setLoading(true);
      setError(false);
      api.notifications
        .list()
        .then((result) => {
          if (active) setItems(result);
        })
        .catch(() => {
          if (active) setError(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [user, retry]),
  );
  const read = async (item: ApiNotification) => {
    try {
      await api.notifications.markRead(item.id);
      setItems((list) =>
        list.map((i) => (i.id === item.id ? { ...i, isRead: true } : i)),
      );
    } catch {
      setError(true);
    }
  };
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{ padding: 18 }}
    >
      {!user ? (
        <View style={{ padding: 25, alignItems: "center", gap: 18 }}>
          <Icon name="mail-outline" size={37} />
          <Text style={{ color: c.foreground }}>
            Sign in to see your notifications.
          </Text>
          <TouchableOpacity onPress={() => router.push("/auth/login")}>
            <Text style={{ color: c.link }}>Sign In</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <LoadState loading />
      ) : error ? (
        <LoadState error="load" retry={() => setRetry((n) => n + 1)} />
      ) : !items.length ? (
        <LoadState empty="You’re all caught up" />
      ) : (
        items.map((item) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => read(item)}
            style={{
              padding: 17,
              borderWidth: 1,
              borderColor: c.border,
              marginBottom: 12,
              backgroundColor: item.isRead ? c.card : c.muted,
            }}
          >
            <Text
              style={{
                color: c.foreground,
                fontSize: 14,
                fontFamily: "GoogleSans_600SemiBold",
              }}
            >
              {item.title}
            </Text>
            <Text
              style={{
                color: c.mutedForeground,
                fontSize: 12,
                lineHeight: 20,
                marginTop: 7,
              }}
            >
              {item.body}
            </Text>
            <Text
              style={{ color: c.mutedForeground, fontSize: 10, marginTop: 9 }}
            >
              {new Date(item.createdAt).toLocaleString("en-IN")}
            </Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}
