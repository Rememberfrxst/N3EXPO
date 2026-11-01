import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { Icon } from "./StoreIcon";
import { useColors } from "@/hooks/useColors";
import type { ApiCategory } from "@/services/api";
export default function CategoryThumbnail({
  category,
  size = 58,
  radius = size * 0.32,
}: {
  category: ApiCategory;
  size?: number;
  radius?: number;
}) {
  const [failed, setFailed] = useState(false),
    c = useColors(),
    slug = category.slug.toLowerCase();
  useEffect(() => setFailed(false), [category.imageUrl]);
  const name =
    slug.includes("phone") || slug.includes("mobile")
      ? "phone-portrait-outline"
      : slug.includes("laptop") || slug.includes("computer")
        ? "laptop-outline"
        : slug.includes("audio") || slug.includes("sound")
          ? "headset-outline"
          : slug.includes("watch")
            ? "watch-outline"
            : slug.includes("fashion") || slug.includes("cloth")
              ? "shirt-outline"
              : slug.includes("home")
                ? "home-outline"
                : "bag-handle-outline";
  return (
    <View
      style={{
        height: size,
        width: size,
        borderRadius: radius,
        overflow: "hidden",
        backgroundColor: c.secondary,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {category.imageUrl && !failed ? (
        <Image
          source={{ uri: category.imageUrl }}
          style={{ width: size, height: size }}
          contentFit="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Icon name={name} size={Math.round(size * 0.48)} color={c.foreground} />
      )}
    </View>
  );
}
