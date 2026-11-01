import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
} from "react-native";
import { Text } from "./Text";
import { TextInput } from "./TextInput";
import { Icon } from "./StoreIcon";
import { useColors } from "@/hooks/useColors";
export interface ProductFilters {
  sort: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}
export default function ProductFiltersBar({
  value,
  onChange,
}: {
  value: ProductFilters;
  onChange: (v: ProductFilters) => void;
}) {
  const c = useColors(),
    [open, setOpen] = useState(false),
    [min, setMin] = useState(""),
    [max, setMax] = useState(""),
    [stock, setStock] = useState(false),
    [error, setError] = useState("");
  const apply = () => {
    const lo = min.trim() ? Number(min) : undefined,
      hi = max.trim() ? Number(max) : undefined;
    if (
      (lo !== undefined && (!Number.isFinite(lo) || lo < 0)) ||
      (hi !== undefined && (!Number.isFinite(hi) || hi < 0)) ||
      (lo !== undefined && hi !== undefined && lo > hi)
    ) {
      setError("Enter a valid price range.");
      return;
    }
    onChange({ ...value, minPrice: lo, maxPrice: hi, inStock: stock });
    setOpen(false);
  };
  return (
    <>
      <View style={[s.bar, { borderColor: c.border, backgroundColor: c.card }]}>
        {[
          { key: "popular", label: "Recommended" },
          { key: "newest", label: "New Arrivals" },
          { key: "price_asc", label: "Price" },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={
              item.label === "Price" ? "Sort by price" : item.label
            }
            onPress={() =>
              onChange({
                ...value,
                sort:
                  item.key === "price_asc" && value.sort === "price_asc"
                    ? "price_desc"
                    : item.key,
              })
            }
            style={s.tab}
          >
            <Text
              style={{
                fontSize: 11,
                color:
                  value.sort === item.key ||
                  (item.key === "price_asc" && value.sort === "price_desc")
                    ? c.foreground
                    : c.mutedForeground,
                fontFamily:
                  value.sort === item.key
                    ? "GoogleSans_600SemiBold"
                    : "GoogleSans_400Regular",
              }}
            >
              {item.label}
            </Text>
            {item.key === "price_asc" && (
              <Icon
                name="swap-vertical-outline"
                size={15}
                color={c.mutedForeground}
              />
            )}
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Filter products"
          style={s.tab}
          onPress={() => {
            setMin(value.minPrice?.toString() || "");
            setMax(value.maxPrice?.toString() || "");
            setStock(!!value.inStock);
            setError("");
            setOpen(true);
          }}
        >
          <Text style={{ fontSize: 11, color: c.mutedForeground }}>Filter</Text>
          <Icon name="funnel-outline" size={15} color={c.mutedForeground} />
          {(value.minPrice !== undefined ||
            value.maxPrice !== undefined ||
            value.inStock) && (
            <View
              style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: c.accent,
              }}
            />
          )}
        </TouchableOpacity>
      </View>
      <Modal
        transparent
        animationType="slide"
        visible={open}
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          accessibilityLabel="Close filters"
          onPress={() => setOpen(false)}
          style={[s.overlay, { backgroundColor: c.overlay }]}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[s.sheet, { backgroundColor: c.card }]}
          >
            <View style={s.heading}>
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: "GoogleSans_700Bold",
                  color: c.foreground,
                }}
              >
                Filter products
              </Text>
              <TouchableOpacity
                accessibilityLabel="Close filters"
                onPress={() => setOpen(false)}
              >
                <Icon name="close" />
              </TouchableOpacity>
            </View>
            <Text
              style={{ color: c.foreground, fontSize: 13, marginBottom: 10 }}
            >
              Price range (₹)
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {[
                { label: "Minimum price", value: min, set: setMin },
                { label: "Maximum price", value: max, set: setMax },
              ].map((f) => (
                <TextInput
                  key={f.label}
                  accessibilityLabel={f.label}
                  placeholder={f.label}
                  placeholderTextColor={c.mutedForeground}
                  value={f.value}
                  onChangeText={f.set}
                  keyboardType="decimal-pad"
                  style={[
                    s.input,
                    { borderColor: c.border, color: c.foreground },
                  ]}
                />
              ))}
            </View>
            <TouchableOpacity
              accessibilityRole="checkbox"
              accessibilityState={{ checked: stock }}
              onPress={() => setStock(!stock)}
              style={{
                flexDirection: "row",
                gap: 10,
                alignItems: "center",
                paddingVertical: 22,
              }}
            >
              <Icon name={stock ? "checkbox" : "square-outline"} size={22} />
              <Text style={{ fontSize: 13, color: c.foreground }}>
                In stock only
              </Text>
            </TouchableOpacity>
            {!!error && (
              <Text
                style={{ fontSize: 12, color: c.destructive, marginBottom: 12 }}
              >
                {error}
              </Text>
            )}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  onChange({ sort: "popular" });
                  setOpen(false);
                }}
                style={[s.button, { borderWidth: 1, borderColor: c.border }]}
              >
                <Text style={{ color: c.foreground }}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={apply}
                style={[s.button, { backgroundColor: c.primary }]}
              >
                <Text style={{ color: c.primaryForeground }}>Show results</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
const s = StyleSheet.create({
  bar: {
    height: 44,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    height: 40,
  },
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    padding: 22,
    paddingBottom: 38,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    height: 44,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  button: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 44,
  },
});
