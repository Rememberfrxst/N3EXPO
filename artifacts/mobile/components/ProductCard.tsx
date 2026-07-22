import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Text } from '@/components/Text';
import Svg, { Path } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';
import { Product, formatPrice } from '@/constants/data';
import RatingStars from './RatingStars';

interface Props {
  product: Product;
  onPress: () => void;
  isWishlisted?: boolean;
  onWishlistToggle?: () => void;
  style?: object;
}

/* FA plus icon — add to wishlist / quick-add */
function PlusBtn({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.wishBtn}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Svg width={14} height={14} viewBox="0 0 640 640">
        <Path
          fill="#fff"
          d="M352 128C352 110.3 337.7 96 320 96C302.3 96 288 110.3 288 128L288 288L128 288C110.3 288 96 302.3 96 320C96 337.7 110.3 352 128 352L288 352L288 512C288 529.7 302.3 544 320 544C337.7 544 352 529.7 352 512L352 352L512 352C529.7 352 544 337.7 544 320C544 302.3 529.7 288 512 288L352 288L352 128z"
        />
      </Svg>
    </TouchableOpacity>
  );
}

export default function ProductCard({ product, onPress, isWishlisted = false, onWishlistToggle, style }: Props) {
  const colors = useColors();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card }, style]}
      onPress={onPress}
      activeOpacity={0.92}
    >
      {/* Image area */}
      <Image source={product.image} style={styles.image} contentFit="cover" transition={200} />

      {/* Info section */}
      <View style={styles.info}>

        {/* Discount badge — Amazon-style, top of info */}
        {product.discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{product.discount}% off</Text>
          </View>
        )}

        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
          {product.name}
        </Text>

        <View style={styles.ratingRow}>
          <RatingStars rating={product.rating} size={10} />
          <Text style={[styles.reviewCount, { color: colors.mutedForeground }]}>
            ({product.reviewCount.toLocaleString()})
          </Text>
        </View>

        {/* Price row — price left, + button right */}
        <View style={styles.bottomRow}>
          <View style={styles.priceCol}>
            <Text style={[styles.price, { color: colors.foreground }]}>
              {formatPrice(product.price)}
            </Text>
            <Text style={[styles.originalPrice, { color: colors.mutedForeground }]}>
              {formatPrice(product.originalPrice)}
            </Text>
          </View>

          {onWishlistToggle && (
            <View style={[styles.wishBtnWrap, { backgroundColor: colors.primary }]}>
              <PlusBtn onPress={onWishlistToggle} />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: 16,
  },
  image: {
    width: '100%',
    aspectRatio: 0.9,
    alignItems: 'flex-end',
    padding: 10,
  },
  info: { paddingHorizontal: 11, paddingTop: 9, paddingBottom: 11, gap: 5 },

  /* Discount badge — Amazon pill style */
  discountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgb(204, 12, 57)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: { fontSize: 10, fontFamily: 'GoogleSans_700Bold', color: '#fff', letterSpacing: 0.2 },

  /* Fixed 2-line height so rating always starts at the same vertical position */
  name: { fontSize: 13, fontFamily: 'GoogleSans_500Medium', lineHeight: 18, minHeight: 36 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reviewCount: { fontSize: 10, fontFamily: 'GoogleSans_400Regular' },

  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  priceCol: { flex: 1, gap: 1 },
  price: { fontSize: 15, fontFamily: 'GoogleSans_700Bold' },
  originalPrice: {
    fontSize: 11,
    fontFamily: 'GoogleSans_400Regular',
    textDecorationLine: 'line-through',
  },

  wishBtnWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wishBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
