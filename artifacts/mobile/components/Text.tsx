/**
 * Drop-in replacement for React Native's <Text>.
 *
 * Always prepends `includeFontPadding: false` so that Android's phantom
 * ascender/descender space is removed for every text node in the app.
 * The component's own `style` prop is applied AFTER, so it always wins.
 *
 * Usage: import { Text } from '@/components/Text';
 *        — identical API to react-native's Text.
 */
import React from "react";
import { Text as RNText, TextProps, StyleSheet } from "react-native";

const base = StyleSheet.create({
  root: {
    includeFontPadding: false,
    fontFamily: "GoogleSans_400Regular",
  },
}).root;

export const Text = React.forwardRef<RNText, TextProps>(
  ({ style, ...props }, ref) => (
    <RNText ref={ref} style={[base, style]} {...props} />
  ),
);

Text.displayName = "Text";
