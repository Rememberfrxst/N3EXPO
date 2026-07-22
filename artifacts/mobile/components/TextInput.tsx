import React from 'react';
import { TextInput as RNTextInput, TextInputProps, StyleSheet } from 'react-native';

const base = StyleSheet.create({
  root: {
    includeFontPadding: false,
  },
}).root;

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(
  ({ style, ...props }, ref) => (
    <RNTextInput ref={ref} style={[base, style]} {...props} />
  )
);

TextInput.displayName = 'TextInput';
