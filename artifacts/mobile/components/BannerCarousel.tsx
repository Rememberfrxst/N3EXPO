import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, Image, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { useColors } from '@/hooks/useColors';

const { width } = Dimensions.get('window');
const BANNER_HEIGHT = 170;

interface Banner {
  id: string;
  image: ReturnType<typeof require>;
  title: string;
  subtitle: string;
  color: string;
}

export default function BannerCarousel({ banners }: { banners: Banner[] }) {
  const colors = useColors();
  const [current, setCurrent] = useState(0);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => {
        const next = (prev + 1) % banners.length;
        listRef.current?.scrollToOffset({ offset: next * width, animated: true });
        return next;
      });
    }, 3800);
    return () => clearInterval(timer);
  }, [banners.length]);

  return (
    <View>
      <FlatList
        ref={listRef}
        data={banners}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrent(idx);
        }}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Image source={item.image} style={styles.img} resizeMode="cover" />
            <View style={[styles.overlay, { backgroundColor: item.color + 'CC' }]}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.sub}>{item.subtitle}</Text>
            </View>
          </View>
        )}
      />
      <View style={styles.dots}>
        {banners.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                width: i === current ? 22 : 6,
                backgroundColor: i === current ? colors.primary : colors.border,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: { width, height: BANNER_HEIGHT, overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 18,
  },
  title: { fontSize: 22, fontFamily: 'GoogleSans_700Bold', color: '#fff', marginBottom: 3, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  sub: { fontSize: 13, fontFamily: 'GoogleSans_500Medium', color: 'rgba(255,255,255,0.9)' },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, paddingVertical: 10 },
  dot: { height: 5, borderRadius: 3 },
});
