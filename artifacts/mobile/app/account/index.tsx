import React, { useState } from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Text } from "@/components/Text";
import { TextInput } from "@/components/TextInput";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
export default function Account() {
  const c = useColors(),
    { user, updateProfile } = useAuth(),
    [name, setName] = useState(user?.name || ""),
    [phone, setPhone] = useState(user?.phone || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await updateProfile(name, phone);
      router.back();
    } catch (e: any) {
      setError(e.message || "Could not save your profile");
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{ padding: 20 }}
    >
      {user ? (
        <>
          <Text
            style={{
              fontSize: 20,
              color: c.foreground,
              fontFamily: "GoogleSans_600SemiBold",
              marginBottom: 24,
            }}
          >
            Edit Profile
          </Text>
          {[
            { label: "Name", value: name, set: setName },
            { label: "Phone number", value: phone, set: setPhone },
          ].map((f) => (
            <View key={f.label} style={{ marginBottom: 20 }}>
              <Text
                style={{ color: c.foreground, fontSize: 13, marginBottom: 8 }}
              >
                {f.label}
              </Text>
              <TextInput
                accessibilityLabel={f.label}
                value={f.value}
                onChangeText={f.set}
                keyboardType={
                  f.label === "Phone number" ? "phone-pad" : "default"
                }
                style={{
                  borderWidth: 1,
                  borderColor: c.border,
                  padding: 12,
                  color: c.foreground,
                  fontSize: 14,
                }}
              />
            </View>
          ))}
          <Text
            style={{ fontSize: 12, color: c.mutedForeground, marginBottom: 22 }}
          >
            {user.email}
          </Text>
          {!!error && (
            <Text
              accessibilityRole="alert"
              style={{ color: c.destructive, marginBottom: 14 }}
            >
              {error}
            </Text>
          )}
          <TouchableOpacity
            accessibilityRole="button"
            disabled={busy}
            onPress={save}
            style={{
              height: 46,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: c.primary,
            }}
          >
            <Text style={{ color: c.primaryForeground, fontSize: 14 }}>
              {busy ? "Saving…" : "Save changes"}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity onPress={() => router.replace("/auth/login")}>
          <Text style={{ color: c.foreground }}>
            Sign in to edit your profile
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
