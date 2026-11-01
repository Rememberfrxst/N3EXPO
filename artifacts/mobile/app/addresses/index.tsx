import React, { useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Text } from "@/components/Text";
import { TextInput } from "@/components/TextInput";
import { Icon } from "@/components/StoreIcon";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
export default function Addresses() {
  const c = useColors(),
    { user, addAddress, setDefaultAddress } = useAuth();
  const [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [draft, setDraft] = useState({
      line1: "",
      line2: "",
      city: "",
      state: "",
      pincode: "",
    });
  const save = async () => {
    if (
      !draft.line1.trim() ||
      !draft.city.trim() ||
      !draft.state.trim() ||
      !/^\d{6}$/.test(draft.pincode)
    ) {
      setError("Add your street, city, state and a valid 6-digit PIN code.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await addAddress({
        ...draft,
        name: user!.name,
        phone: user!.phone,
        isDefault: !user!.addresses.length,
      });
      setShow(false);
    } catch (e: any) {
      setError(e.message || "Could not save address. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  if (!user)
    return (
      <View style={[s.empty, { backgroundColor: c.background }]}>
        <Icon name="location-outline" color={c.primary} size={35} />
        <Text style={{ color: c.foreground, marginVertical: 20 }}>
          Sign in to save your delivery addresses.
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/auth/login")}
          style={[s.button, { backgroundColor: c.primary }]}
        >
          <Text style={{ color: "#fff" }}>Sign in</Text>
        </TouchableOpacity>
      </View>
    );
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{ padding: 22, paddingBottom: 50 }}
    >
      <Text
        style={{
          fontSize: 28,
          color: c.foreground,
          fontFamily: "GoogleSans_600SemiBold",
        }}
      >
        A place for your good finds.
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: c.mutedForeground,
          marginTop: 8,
          marginBottom: 24,
        }}
      >
        Choose where we should deliver.
      </Text>
      {user.addresses.map((a) => (
        <View
          key={a.id}
          style={[
            s.card,
            {
              backgroundColor: c.card,
              borderColor: a.isDefault ? c.primary : c.border,
            },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Icon name="home-outline" color={c.primary} />
            <Text
              style={{
                color: c.foreground,
                fontSize: 15,
                fontFamily: "GoogleSans_600SemiBold",
              }}
            >
              {a.name || user.name}
            </Text>
            {a.isDefault && (
              <Text style={{ fontSize: 10, color: c.primary }}>DEFAULT</Text>
            )}
          </View>
          <Text
            style={{
              color: c.mutedForeground,
              fontSize: 13,
              lineHeight: 23,
              marginVertical: 12,
            }}
          >
            {[a.line1, a.line2, `${a.city}, ${a.state} ${a.pincode}`]
              .filter(Boolean)
              .join("\n")}
          </Text>
          {!a.isDefault && (
            <TouchableOpacity
              onPress={async () => {
                try {
                  await setDefaultAddress(a.id);
                } catch {
                  setError("Could not update default address");
                }
              }}
            >
              <Text style={{ color: c.primary, fontSize: 12 }}>
                Use as default
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      {error && (
        <Text
          accessibilityRole="alert"
          style={{ color: c.destructive, marginBottom: 12 }}
        >
          {error}
        </Text>
      )}
      {show ? (
        <View
          style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}
        >
          {[
            { key: "line1", label: "Street address" },
            { key: "line2", label: "Apartment, area (optional)" },
            { key: "city", label: "City" },
            { key: "state", label: "State" },
            { key: "pincode", label: "PIN code" },
          ].map((f) => (
            <View key={f.key} style={{ marginBottom: 15 }}>
              <Text
                style={{ color: c.foreground, fontSize: 12, marginBottom: 7 }}
              >
                {f.label}
              </Text>
              <TextInput
                accessibilityLabel={f.label}
                value={draft[f.key as keyof typeof draft]}
                onChangeText={(v) => setDraft({ ...draft, [f.key]: v })}
                keyboardType={f.key === "pincode" ? "number-pad" : "default"}
                style={[
                  s.input,
                  { borderColor: c.border, color: c.foreground },
                ]}
              />
            </View>
          ))}
          <TouchableOpacity
            disabled={busy}
            onPress={save}
            style={[s.button, { backgroundColor: c.primary }]}
          >
            <Text style={{ color: "#fff" }}>
              {busy ? "Saving…" : "Save delivery address"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => setShow(true)}
          style={[
            s.button,
            { backgroundColor: c.primary, flexDirection: "row", gap: 12 },
          ]}
        >
          <Icon name="add" color="#fff" size={18} />
          <Text style={{ color: "#fff" }}>Add an address</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
  },
  card: { padding: 20, borderWidth: 1, borderRadius: 14, marginBottom: 18 },
  input: { height: 44, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12 },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
