import React, { useState } from "react";
import { Image } from "expo-image";
import { Icon } from "./StoreIcon";
import { useColors } from "@/hooks/useColors";
import type { ApiCategory } from "@/services/api";
export default function CategoryThumbnail({
  category,
  size = 52,
}: {
  category: ApiCategory;
  size?: number;
}) {
  const [failed, setFailed] = useState(false),
    c = useColors(),
    slug = category.slug.toLowerCase();
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
  return category.imageUrl && !failed ? (
    <Image
      source={{ uri: category.imageUrl }}
      style={{ width: size, height: size, borderRadius: size / 3 }}
      contentFit="cover"
      onError={() => setFailed(true)}
    />
  ) : (
    <Icon name={name} size={Math.round(size * 0.55)} color={c.primary} />
  );
}
