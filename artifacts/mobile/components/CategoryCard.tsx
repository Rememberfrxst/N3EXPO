import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/Text';
import { LinearGradient } from 'expo-linear-gradient';
import SvgIcon from '@/components/SvgIcon';
import { useColors } from '@/hooks/useColors';
import { Category } from '@/constants/data';

export default function CategoryCard({ category, onPress }: { category: Category; onPress: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity style={styles.wrap} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={[category.color, category.color2] as readonly [string, string]}
        style={styles.icon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SvgIcon name={category.icon as any} size={26} color="#fff" />
      </LinearGradient>
      <Text style={[styles.label, { color: colors.foreground }]} numberOfLines={1}>
        {category.name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: 72, gap: 6 },
  icon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, fontFamily: 'GoogleSans_500Medium', textAlign: 'center' },
});
