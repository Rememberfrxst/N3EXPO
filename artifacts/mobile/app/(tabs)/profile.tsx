import React from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Text } from "@/components/Text";
import { Icon, IconButton } from "@/components/ShopUI";
import { useColors } from "@/hooks/useColors";
import { useStorefront } from "@/hooks/useStorefront";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
export default function Me() {
  const c = useColors(),
    insets = useSafeAreaInsets(),
    { user, logout } = useAuth(),
    wish = useWishlist(),
    cart = useCart(),
    store = useStorefront();
  const row = (
    icon: React.ComponentProps<typeof Icon>["name"],
    title: string,
    sub: string,
    press: () => void,
  ) => (
    <TouchableOpacity
      key={title}
      onPress={press}
      style={[s.row, { borderColor: c.border }]}
    >
      <View style={[s.rowIcon, { backgroundColor: c.secondary }]}>
        <Icon name={icon} color={c.primary} size={20} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: c.foreground,
            fontSize: 14,
            fontFamily: "GoogleSans_500Medium",
          }}
        >
          {title}
        </Text>
        <Text style={{ color: c.mutedForeground, fontSize: 11, marginTop: 4 }}>
          {sub}
        </Text>
      </View>
      <Icon name="chevron-forward" size={17} color={c.mutedForeground} />
    </TouchableOpacity>
  );
  const signout = () => {
    if (Platform.OS === "web") {
      if (confirm("Sign out of Griper?")) void logout();
    } else
      Alert.alert("Sign out?", "You can sign back in any time.", [
        { text: "Stay here", style: "cancel" },
        { text: "Sign out", onPress: logout },
      ]);
  };
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 18,
        paddingHorizontal: 20,
        paddingBottom: 115,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.header}>
        <View>
          <Text style={{ color: c.primary, fontSize: 9, letterSpacing: 1.6 }}>
            YOUR LITTLE CORNER
          </Text>
          <Text style={[s.heading, { color: c.foreground }]}>Me</Text>
        </View>
        <IconButton
          name="settings-outline"
          label="Open settings"
          onPress={() => router.push("/settings")}
        />
      </View>
      <View style={[s.profile, { backgroundColor: c.primary }]}>
        <View style={s.avatar}>
          <Text
            style={{
              fontSize: 28,
              color: "#fff",
              fontFamily: "GoogleSans_600SemiBold",
            }}
          >
            {user ? user.name[0].toUpperCase() : "G"}
          </Text>
        </View>
        <Text style={s.name}>
          {user
            ? `Hello, ${user.name.split(" ")[0]}.`
            : "Make yourself at home."}
        </Text>
        <Text style={s.email}>
          {user ? user.email : "All your favorites, in one little place."}
        </Text>
        {!user && (
          <TouchableOpacity
            onPress={() => router.push("/auth/login")}
            style={s.signin}
          >
            <Text
              style={{
                color: c.primary,
                fontSize: 12,
                fontFamily: "GoogleSans_600SemiBold",
              }}
            >
              Sign in / Create account
            </Text>
            <Icon name="arrow-forward" size={16} color={c.primary} />
          </TouchableOpacity>
        )}
      </View>
      <View style={s.quick}>
        {[
          {
            icon: "receipt-outline",
            label: "My orders",
            count: cart.orders.length,
            route: "/(tabs)/orders",
          },
          {
            icon: "heart-outline",
            label: "Wishlist",
            count: wish.items.length,
            route: "/wishlist",
          },
          {
            icon: "bag-handle-outline",
            label: "My bag",
            count: cart.itemCount,
            route: "/(tabs)/cart",
          },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            onPress={() => router.push(item.route as any)}
            style={[
              s.quickItem,
              { backgroundColor: c.card, borderColor: c.border },
            ]}
          >
            <Icon name={item.icon as any} color={c.primary} size={24} />
            <Text
              style={{
                color: c.foreground,
                fontSize: 12,
                fontFamily: "GoogleSans_600SemiBold",
              }}
            >
              {item.label}
            </Text>
            <Text style={{ color: c.mutedForeground, fontSize: 10 }}>
              {item.count} {item.label === "My orders" ? "orders" : "items"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[s.sectionLabel, { color: c.mutedForeground }]}>
        YOUR ACCOUNT
      </Text>
      <View
        style={[s.menu, { backgroundColor: c.card, borderColor: c.border }]}
      >
        {row("cube-outline", "Orders & delivery", "Track every good find", () =>
          router.push("/(tabs)/orders"),
        )}
        {row(
          "heart-outline",
          "Saved for later",
          "The things you’ve got your eye on",
          () => router.push("/wishlist"),
        )}
        {row(
          "location-outline",
          "Delivery addresses",
          "A home for your next good find",
          () => router.push("/addresses"),
        )}
        {row(
          "options-outline",
          "Preferences",
          "Appearance, language & account",
          () => router.push("/settings"),
        )}
      </View>
      <Text style={[s.sectionLabel, { color: c.mutedForeground }]}>
        HERE TO HELP
      </Text>
      <View
        style={[s.menu, { backgroundColor: c.card, borderColor: c.border }]}
      >
        {row(
          "chatbubble-ellipses-outline",
          "Talk to us",
          "We’re just an email away",
          () => {
            void Linking.openURL(`mailto:${store.supportEmail}`);
          },
        )}
        {row(
          "grid-outline",
          "Explore categories",
          "Find a little inspiration",
          () => router.push("/(tabs)/search"),
        )}
        {!!store.downloadUrl &&
          row("download-outline", "Get the app", "Take Griper with you", () => {
            void Linking.openURL(store.downloadUrl);
          })}
      </View>
      {user && (
        <TouchableOpacity
          onPress={signout}
          style={{ paddingVertical: 22, alignItems: "center" }}
        >
          <Text style={{ color: c.destructive, fontSize: 13 }}>Sign out</Text>
        </TouchableOpacity>
      )}
      <View style={{ alignItems: "center", paddingTop: 30 }}>
        <Text
          style={{
            fontSize: 26,
            color: c.primary,
            fontFamily: "GoogleSans_700Bold",
            letterSpacing: -1,
          }}
        >
          griper.
        </Text>
        <Text style={{ fontSize: 10, color: c.mutedForeground, marginTop: 7 }}>
          A little better, every day. · v1.1.0
        </Text>
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  heading: {
    fontSize: 32,
    fontFamily: "GoogleSans_700Bold",
    letterSpacing: -1,
    marginTop: 3,
  },
  profile: { padding: 28, borderRadius: 20 },
  avatar: {
    height: 60,
    width: 60,
    borderRadius: 21,
    backgroundColor: "#ffffff20",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ffffff30",
    marginBottom: 18,
  },
  name: {
    fontSize: 24,
    color: "#fff",
    fontFamily: "GoogleSans_600SemiBold",
    letterSpacing: -0.5,
  },
  email: { fontSize: 12, color: "#d5e9e5", marginTop: 7 },
  signin: {
    backgroundColor: "#fff",
    borderRadius: 9,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
  },
  quick: { flexDirection: "row", gap: 10, marginTop: 16 },
  quickItem: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 18,
    alignItems: "center",
    gap: 8,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1.3,
    marginTop: 29,
    marginBottom: 12,
  },
  menu: { borderWidth: 1, borderRadius: 15, overflow: "hidden" },
  row: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderBottomWidth: 1,
  },
  rowIcon: {
    height: 39,
    width: 39,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
});
