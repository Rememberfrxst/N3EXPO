import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { TextInput } from '@/components/TextInput';
import SvgIcon from '@/components/SvgIcon';
import { useColors } from '@/hooks/useColors';

interface Props {
  value: string;
  onChangeText: (t: string) => void;
  onSubmit?: () => void;
  onClear?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  editable?: boolean;
}

export default function SearchBarInput({ value, onChangeText, onSubmit, onClear, placeholder = 'Search...', autoFocus, editable = true }: Props) {
  const colors = useColors();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.input, borderColor: colors.border }]}>
      <SvgIcon name="search" size={18} color={colors.mutedForeground} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, { color: colors.foreground, fontFamily: 'GoogleSans_400Regular' }]}
        returnKeyType="search"
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        editable={editable}
      />
      {value.length > 0 && onClear && (
        <TouchableOpacity onPress={onClear}>
          <SvgIcon name="close-circle" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, height: 44, gap: 8, borderWidth: 1 },
  input: { flex: 1, fontSize: 15, height: '100%' },
});
